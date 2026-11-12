#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-function-goto-boundary-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

const invalidSources = [
  `u8 A = 0
u8 R = 0
R = Pick(3)
function Pick(u8 N) as u8
  u8 Res = 0
  if N > 2 then goto big
  Res = 1
  return Res
big:
  A = 2`,
  `u8 R = 0
R = Pick(3)
function Pick(u8 N) as u8
  u8 Res = 0
  if N > 2 then goto big
  Res = 1
  return Res
big:
  Res = 2
  return Res`
];

const validSources = [
  `u8 R = 0
R = Pick(3)
function Pick(u8 N) as u8
  u8 Res = 0
  if N > 2 then goto big
  Res = 1
big:
  return Res`,
  `u8 R = 0
R = Pick(3)
function Pick(u8 N) as u8
again:
  if N > 3 then goto again
  return N`
];

function compile(source, name, profile) {
  const input = join(temp, `${name}-${profile}.alexis`);
  const output = join(temp, `${name}-${profile}.rom`);
  writeFileSync(input, `cartridge "FUNCTION GOTO/CODEX/2026"\n${source}\n`, "utf8");
  return spawnSync(process.execPath, [
    "tools/amyc.mjs", input, "--rom", output, "--opt", profile
  ], { cwd: root, encoding: "utf8" });
}

try {
  for (const profile of profiles) {
    for (let index = 0; index < invalidSources.length; index += 1) {
      const result = compile(invalidSources[index], `invalid-${index}`, profile);
      assert.equal(result.error, undefined, `${profile} invalid ${index}: ${result.error?.stack || result.error}`);
      assert.notEqual(result.status, 0, `${profile} invalid ${index} unexpectedly compiled`);
      assert.match(`${result.stdout}${result.stderr}`, /Function 'Pick'.*jumps to label 'big' after its closing return/i);
    }
    for (let index = 0; index < validSources.length; index += 1) {
      const result = compile(validSources[index], `valid-${index}`, profile);
      assert.equal(result.error, undefined, `${profile} valid ${index}: ${result.error?.stack || result.error}`);
      assert.equal(result.status, 0, `${profile} valid ${index}: ${result.stdout}${result.stderr}`);
    }
  }
  console.log(`Function goto/return boundary: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
