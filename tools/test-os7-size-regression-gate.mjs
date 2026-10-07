#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const directory = mkdtempSync(join(tmpdir(), "amy-os7-size-gate-"));
const baseline = join(directory, "baseline.json");
const audit = join(directory, "audit.json");
writeFileSync(baseline, JSON.stringify({ version: 1, examples: { canary: { maxRomBytes: 100, role: "test" } } }));

function run(bytes) {
  writeFileSync(audit, JSON.stringify({ optimization: "balanced", examples: [{ id: "canary", ok: true, romBytes: bytes }] }));
  return spawnSync(process.execPath, [
    resolve(root, "tools", "check-os7-size-regressions.mjs"),
    "--audit", audit,
    "--baseline", baseline
  ], { cwd: root, encoding: "utf8" });
}

const smaller = run(99);
assert.equal(smaller.status, 0, smaller.stderr || smaller.stdout);
assert.match(smaller.stdout, /SMALLER/);

const larger = run(101);
assert.notEqual(larger.status, 0);
assert.match(larger.stdout, /GROWTH/);
assert.match(larger.stdout, /FAIL: 1 OS7 size regression/);

console.log("PASS OS7 size gate accepts savings and rejects unexplained growth");
