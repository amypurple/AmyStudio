#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const postDirIndex = process.argv.indexOf("--post-dir");
const postDir = resolve(repoRoot, postDirIndex >= 0 ? process.argv[postDirIndex + 1] : "build/optimizer-full-audit/post-builtin");
const runtimeDir = resolve(repoRoot, "build/rom-tests");
const suite = JSON.parse(readFileSync(resolve(repoRoot, "tools/rom-tests.json"), "utf8"));
const selected = suite.tests.filter((test) => Object.keys(test.expectBytes || {}).length && !test.checkpoint);
if (!selected.length) throw new Error("No RAM-result ROM self-tests are configured for MDL validation.");

for (const test of selected) {
  const rom = resolve(postDir, "mdl", `${test.id}.po.bin`);
  const symbols = resolve(runtimeDir, `${test.id}.sym`);
  if (!existsSync(rom)) throw new Error(`Missing MDL ROM for ${test.id}: ${rom}`);
  if (!existsSync(symbols)) throw new Error(`Missing Amy symbol map for ${test.id}: ${symbols}`);
  const args = ["tools/test-rom-gearcoleco.mjs", "--rom", rom, "--symbols", symbols, "--frames", String(test.frames ?? 120)];
  for (const [symbol, value] of Object.entries(test.expectBytes)) args.push("--expect-byte", `${symbol}=${value}`);
  for (const input of test.inputs || []) args.push("--input", `${input.frame}:${input.player || 1}:${input.button}:${input.action || "press_and_release"}`);
  const result = spawnSync(process.execPath, args, { cwd: repoRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`MDL ROM runtime self-tests: ${selected.length}/${selected.length} passed.`);