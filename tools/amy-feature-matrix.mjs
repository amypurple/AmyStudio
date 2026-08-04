#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const full = process.argv.includes("--full");
const biosPath = process.env.AMY_COLECO_BIOS || resolve(root, "studio", "bios", "colecovision.rom");
const hasBios = existsSync(biosPath);
const tests = [
  "test-expression-fail-closed.mjs",
  "test-start-runtime-init-codegen.mjs",
  "test-runtime-catalog-dependencies.mjs",
  "test-set-sprite-codegen.mjs",
  "test-word-table-codegen.mjs",
  "test-int16-byte-widening-codegen.mjs",
  "test-bcd-inc-dec-rom.mjs",
  "test-chars-in-box-rom.mjs",
  "test-legacy-u32-rom.mjs",
  "test-spinner-rom.mjs"
];

const results = [];
const biosTests = new Set(["test-bcd-inc-dec-rom.mjs", "test-chars-in-box-rom.mjs", "test-legacy-u32-rom.mjs", "test-spinner-rom.mjs"]);

for (const file of tests) {
  if (biosTests.has(file) && !hasBios) {
    results.push({ test: file, passed: true, skipped: true, reason: "Set AMY_COLECO_BIOS to run BIOS-backed ROM assertions." });
    console.log(`SKIP ${file}: ColecoVision BIOS not configured (set AMY_COLECO_BIOS).`);
    continue;
  }
  const started = Date.now();
  const result = spawnSync(process.execPath, [resolve(root, "tools", file)], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  results.push({ test: file, passed: result.status === 0, elapsedMs: Date.now() - started });
  if (output) process.stdout.write(`${output}\n`);
  if (result.status !== 0) {
    process.stderr.write(`Amy feature matrix stopped at ${file}.\n`);
    process.exit(result.status ?? 1);
  }
}

if (full) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [resolve(root, "tools", "check-examples.mjs"), "--assemble"], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  results.push({ test: "check-examples.mjs --assemble", passed: result.status === 0, elapsedMs: Date.now() - started });
  if (output) process.stdout.write(`${output}\n`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const elapsedMs = results.reduce((sum, item) => sum + item.elapsedMs, 0);
console.log(JSON.stringify({ passed: true, full, elapsedMs, results }, null, 2));
