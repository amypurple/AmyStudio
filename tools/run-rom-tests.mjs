#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const suitePath = resolve(repoRoot, "tools", "rom-tests.json");
const outputDir = resolve(repoRoot, "build", "rom-tests");
const suite = JSON.parse(readFileSync(suitePath, "utf8"));
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
const selected = suite.tests.filter((test) => !only || test.id === only || test.name === only);
if (!selected.length) throw new Error(only ? `Unknown ROM test: ${only}` : "No ROM tests configured.");
mkdirSync(outputDir, { recursive: true });

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: repoRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const test of selected) {
  run(["tools/check-examples.mjs", "--assemble", "--only", test.id, "--rom-dir", outputDir]);
  const rom = resolve(outputDir, `${test.id}.rom`);
  const symbols = resolve(outputDir, `${test.id}.sym`);
  if (!existsSync(rom) || !existsSync(symbols)) throw new Error(`Missing ROM artifacts for ${test.id}`);
  const args = ["tools/test-rom-gearcoleco.mjs", "--rom", rom, "--symbols", symbols, "--frames", String(test.frames ?? 120)];
  for (const [symbol, value] of Object.entries(test.expectBytes || {})) args.push("--expect-byte", `${symbol}=${value}`);
  for (const input of test.inputs || []) args.push("--input", `${input.frame}:${input.player || 1}:${input.button}:${input.action || "press_and_release"}`);
  if (test.checkpoint) args.push("--checkpoint", test.checkpoint);
  if (test.screenshot) args.push("--screenshot", resolve(outputDir, test.screenshot));
  if (test.visualBaseline) args.push("--visual-baseline", resolve(repoRoot, test.visualBaseline));
  run(args);
}

console.log(`ROM runtime tests: ${selected.length}/${selected.length} passed.`);
