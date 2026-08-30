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
  { file: "test-qualified-math-bit-rom.mjs", area: "qualified-math-bit", evidence: "rom" },
  { file: "test-vpeek-qualified-rom.mjs", area: "qualified-vram-read", evidence: "rom" },
  { file: "test-pget-qualified-rom.mjs", area: "qualified-pixel-read", evidence: "rom" },
  { file: "test-replace-frame-qualified-rom.mjs", area: "qualified-replacement-count", evidence: "rom" },
  { file: "test-get-char-qualified-rom.mjs", area: "qualified-tile-read", evidence: "rom" },
  { file: "test-put-frame-qualified-rom.mjs", area: "qualified-frame-write", evidence: "rom" },
  { file: "test-put-count-qualified-rom.mjs", area: "qualified-row-write", evidence: "rom" },
  { file: "test-choose-qualified-rom.mjs", area: "qualified-menu-choice", evidence: "rom" },
  { file: "test-controller-ram-safety.mjs", area: "controller-ram-layout", evidence: "compile+assemble" },
  { file: "test-overlay-layout-rom.mjs", area: "overlay-qualified-runtime", evidence: "rom" },
  { file: "test-amy-timer-rom.mjs", area: "named-timers", evidence: "rom" },
  { file: "test-amy-timer-safety-rom.mjs", area: "timer-safety", evidence: "rom" },
  { file: "test-pause-until-press-rom.mjs", area: "crt-safe-pause", evidence: "rom" },
  { file: "test-scene-lifecycle-rom.mjs", area: "scene-lifecycle", evidence: "rom" },
  { file: "test-scene-poison-rom.mjs", area: "scene-poison", evidence: "rom" },
  { file: "test-record-array-rom.mjs", area: "record-arrays", evidence: "rom" },
  { file: "test-local-record-rom.mjs", area: "local-records", evidence: "rom" },
  { file: "test-sprite-field-index-rom.mjs", area: "sprite-field-indexes", evidence: "rom" },
  { file: "test-bcd-inc-dec-rom.mjs", area: "bcd", evidence: "rom" },
  { file: "test-bcd-array-rom.mjs", area: "bcd-arrays", evidence: "rom" },
  { file: "test-chars-in-box-rom.mjs", area: "tile-collision", evidence: "rom" },
  { file: "test-legacy-u32-rom.mjs", area: "legacy-wide-integers", evidence: "rom" },
  { file: "test-fp5-function-return-rom.mjs", area: "fp5-function-return", evidence: "rom" },
  { file: "test-fp5-array-rom.mjs", area: "fp5-arrays", evidence: "rom" },
  { file: "test-fp5-fixed32-conversion-rom.mjs", area: "fp5-fixed32-conversion", evidence: "rom" },
  { file: "test-fixed-fixed32-conversion-rom.mjs", area: "fixed-fixed32-conversion", evidence: "rom" },
  { file: "test-wide-binary-expression-rom.mjs", area: "wide-binary-expressions", evidence: "rom" },
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
