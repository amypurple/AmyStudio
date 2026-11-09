#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { identifyProject } from "./amy-author-project-proof.mjs";

export function runAuthorBuild(input, options = {}) {
  const project = identifyProject(input);
  const optimization = options.optimization || project.metadata.optimization || "balanced";
  const output = project.shippedOutput;
  const asm = output.slice(0, -extname(output).length) + ".asm";
  const report = output.slice(0, -extname(output).length) + ".build.json";
  mkdirSync(dirname(output), { recursive: true });
  for (const path of [output, asm, report]) rmSync(path, { force: true });
  const args = ["tools/amyc.mjs", project.source, "--project-dir", project.projectDir, "--output", output, "--asm", asm, "--report-json", report, "--opt", optimization, "--target", project.target];
  if (project.metadata.medium) args.push("--medium", project.metadata.medium);
  for (const hardware of project.metadata.hardware || []) args.push("--hardware", hardware);
  for (const define of project.metadata.defines || []) args.push("--define", define);
  const runner = options.runner || ((command, commandArgs) => spawnSync(command, commandArgs, { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  const run = runner(process.execPath, args, { project, output, asm, report });
  if (run.error || run.status !== 0 || !existsSync(output)) {
    for (const path of [output, asm, report]) rmSync(path, { force: true });
    console.error(`${run.error?.message || ""}${run.stdout || ""}${run.stderr || ""}`.trim());
    return { ok: false, project, output, asm, report };
  }
  return { ok: true, project, output, asm, report, log: run.stdout || "" };
}

function main() {
  const projectAt = process.argv.indexOf("--project");
  const input = projectAt >= 0 ? process.argv[projectAt + 1] : process.argv[2];
  if (!input) { console.log("Usage: node tools/amy-author-build.mjs <source-or-project> [--opt balanced]"); return 2; }
  const optAt = process.argv.indexOf("--opt");
  const result = runAuthorBuild(input, { optimization: optAt >= 0 ? process.argv[optAt + 1] : undefined });
  if (!result.ok) return 1;
  console.log(`${result.log.trim()}\nAmy author build: PASS (${result.output})`);
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exit(main());
