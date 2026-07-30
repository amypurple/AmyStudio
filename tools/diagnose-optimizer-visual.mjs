#!/usr/bin/env node
import { existsSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const repoRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const options = { test: null, profile: "balanced", frames: 120, baseline: null };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--test") options.test = args[++index] || null;
  else if (arg === "--profile") options.profile = args[++index] || "balanced";
  else if (arg === "--frames") options.frames = Number.parseInt(args[++index] || "", 10);
  else if (arg === "--baseline") options.baseline = resolve(args[++index] || "");
  else throw new Error(`Unknown argument: ${arg}`);
}
if (!options.test || !options.baseline) throw new Error("Use --test <example-id> --baseline <visual.json>.");
if (!existsSync(options.baseline)) throw new Error(`Visual baseline not found: ${options.baseline}`);

const profile = getOptimizationProfile(options.profile, "");
if (!profile.optimizerEnabled || !profile.optimizerConfig) throw new Error("Diagnosis requires an enabled optimizer profile.");
const candidates = Object.entries(profile.optimizerConfig).filter(([, enabled]) => enabled).map(([name]) => name);
const diagnosisRoot = resolve(repoRoot, "build", "optimizer-diagnosis", options.test);
mkdirSync(diagnosisRoot, { recursive: true });

function execute(commandArgs) {
  return spawnSync(process.execPath, commandArgs, { cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function runVariant(disabledOption = null) {
  const name = disabledOption || "candidate";
  const outDir = resolve(diagnosisRoot, name);
  mkdirSync(outDir, { recursive: true });
  const buildArgs = ["tools/check-examples.mjs", "--assemble", "--only", options.test, "--optimization", options.profile, "--rom-dir", outDir];
  if (disabledOption) buildArgs.push("--disable-optimizer-option", disabledOption);
  const build = execute(buildArgs);
  if (build.status !== 0) return { option: disabledOption, buildOk: false, visualOk: false, detail: (build.stderr || build.stdout).trim() };
  const rom = resolve(outDir, `${options.test}.rom`);
  const symbols = resolve(outDir, `${options.test}.sym`);
  const tracePath = resolve(outDir, "vdp-trace.json");
  const runtime = execute(["tools/test-rom-gearcoleco.mjs", "--rom", rom, "--symbols", symbols, "--frames", String(options.frames), "--visual-baseline", options.baseline, "--trace-last-frames", "2", "--trace-output", tracePath]);
  return {
    option: disabledOption,
    buildOk: true,
    visualOk: runtime.status === 0,
    romBytes: statSync(rom).size,
    trace: runtime.status === 0 ? null : tracePath,
    detail: runtime.status === 0 ? "matches baseline" : (runtime.stderr || runtime.stdout).trim().split(/\r?\n/).slice(-4).join(" | ")
  };
}

const original = runVariant();
const report = { test: options.test, profile: options.profile, frames: options.frames, baseline: options.baseline, original, testedOptions: [], restoringOptions: [] };
if (!original.visualOk) {
  for (const option of candidates) {
    const result = runVariant(option);
    report.testedOptions.push(result);
    if (result.visualOk) report.restoringOptions.push(option);
  }
}
console.log(JSON.stringify(report, null, 2));
if (!original.visualOk && !report.restoringOptions.length) {
  console.error("No single optimizer option restored the visual baseline; test combinations or inspect the reported VRAM ranges.");
  process.exitCode = 2;
}
