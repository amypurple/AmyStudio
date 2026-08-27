#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const full = process.argv.includes("--full");
const biosPath = process.env.AMY_COLECO_BIOS || resolve(root, "studio", "bios", "colecovision.rom");
const hasBios = existsSync(biosPath);
const tests = [
  { file: "test-expression-fail-closed.mjs", area: "expressions", evidence: "compile+assemble" },
  { file: "test-start-runtime-init-codegen.mjs", area: "initializers", evidence: "compile+assemble" },
  { file: "test-runtime-catalog-dependencies.mjs", area: "runtime-linking", evidence: "compile+assemble" },
  { file: "test-set-sprite-codegen.mjs", area: "sprites", evidence: "compile+assemble" },
  { file: "test-word-table-codegen.mjs", area: "word-tables", evidence: "compile+assemble" },
  { file: "test-int16-byte-widening-codegen.mjs", area: "integer-widening", evidence: "compile+assemble" },
  { file: "test-array-bulk-codegen.mjs", area: "bulk-arrays", evidence: "compile+assemble" },
  { file: "test-ref-param-codegen.mjs", area: "qualified-operands", evidence: "compile+assemble" },
  { file: "test-bcd-inc-dec-rom.mjs", area: "bcd", evidence: "rom" },
  { file: "test-chars-in-box-rom.mjs", area: "tile-collision", evidence: "rom" },
  { file: "test-legacy-u32-rom.mjs", area: "legacy-wide-integers", evidence: "rom" },
  { file: "test-global-initializers-rom.mjs", area: "layout-and-wide-integers", evidence: "rom" },
  { file: "test-array-store-layout-rom.mjs", area: "array-index-layout", evidence: "rom" },
  { file: "test-spinner-rom.mjs", area: "spinner-input", evidence: "rom" }
];

const results = [];
const biosTests = new Set(tests.filter((test) => test.evidence === "rom").map((test) => test.file));

for (const test of tests) {
  const { file, area, evidence } = test;
  if (biosTests.has(file) && !hasBios) {
    results.push({ test: file, area, evidence, passed: true, skipped: true, elapsedMs: 0, reason: "Set AMY_COLECO_BIOS to run BIOS-backed ROM assertions." });
    console.log(`SKIP ${file}: ColecoVision BIOS not configured (set AMY_COLECO_BIOS).`);
    continue;
  }
  const started = Date.now();
  const result = spawnSync(process.execPath, [resolve(root, "tools", file)], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  results.push({ test: file, area, evidence, passed: result.status === 0, elapsedMs: Date.now() - started });
  if (output) process.stdout.write(`${output}\n`);
  if (result.status !== 0) {
    process.stderr.write(`Amy feature matrix stopped at ${file}.\n`);
    process.exit(result.status ?? 1);
  }
}

if (full) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [resolve(root, "tools", "check-examples.mjs"), "--assemble", "--optimization", "balanced"], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  results.push({ test: "check-examples.mjs --assemble --optimization balanced", area: "catalogue", evidence: "compile+assemble", passed: result.status === 0, elapsedMs: Date.now() - started });
  if (output) process.stdout.write(`${output}\n`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const elapsedMs = results.reduce((sum, item) => sum + item.elapsedMs, 0);
console.log(JSON.stringify({ passed: true, full, elapsedMs, results }, null, 2));
