#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compiler = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-json-report-"));

function run(source, stem) {
  const sourcePath = join(temp, `${stem}.alexis`);
  const reportPath = join(temp, `${stem}.json`);
  writeFileSync(sourcePath, source, "utf8");
  const result = spawnSync(process.execPath, [compiler, sourcePath,
    "--rom", join(temp, `${stem}.rom`),
    "--asm", join(temp, `${stem}.asm`),
    "--symbols", join(temp, `${stem}.sym`),
    "--report-json", reportPath
  ], { cwd: root, encoding: "utf8" });
  assert.ok(existsSync(reportPath), `Compiler did not write ${reportPath}.\n${result.error?.stack || ""}\n${result.stdout || ""}\n${result.stderr || ""}`);
  return { result, report: JSON.parse(readFileSync(reportPath, "utf8")) };
}

try {
  const valid = run(`u8 Counter = 0\nsub start:\n  inc Counter\n  loop forever\nend sub\n`, "valid");
  assert.equal(valid.result.status, 0, valid.result.stderr);
  assert.equal(valid.report.format, "amy-compiler-report-v1");
  assert.equal(valid.report.ok, true);
  assert.equal(valid.report.optimization, "balanced");
  assert.ok(valid.report.romBytes > 0);
  assert.ok(valid.report.ramUsage?.usedBytes > 0);
  assert.match(valid.report.artifacts.rom, /valid\.rom$/i);

  const invalid = run(`u8 Counter = 0\nsub start:\n  Counter = Missing + 1\nend sub\n`, "invalid");
  assert.notEqual(invalid.result.status, 0);
  assert.equal(invalid.report.ok, false);
  assert.equal(invalid.report.stage, "transpile");
  assert.equal(invalid.report.diagnostics[0].file, join(temp, "invalid.alexis"));
  assert.equal(invalid.report.diagnostics[0].line, 3, JSON.stringify(invalid.report.diagnostics[0]));
  assert.match(invalid.report.diagnostics[0].message, /Missing|runtime assignment/i);

  console.log("Amy compiler JSON report: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
