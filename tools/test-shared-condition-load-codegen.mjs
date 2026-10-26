#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-shared-condition-"));
const source = join(temp, "shared-condition.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `
project "Shared condition load"
memory "colecovision_legacy_sdcc"
u8 Values[3] = 0
u8 Index = 0
u8 First = 0
u8 Second = 0
u8 Miss = 0
Values[0] = 3
Values[1] = 7
Values[2] = 5
if Values[Index] = 3 or Values[Index] = 7 then First = 1
Index = 1
if Values[Index] = 3 or Values[Index] = 7 then Second = 1
Index = 2
if Values[Index] = 3 or Values[Index] = 7 then Miss = 1
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `Missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

for (const profile of profiles) {
  const asmPath = join(temp, `${profile}.asm`);
  const romPath = join(temp, `${profile}.rom`);
  const result = spawnSync(process.execPath, [
    join(root, "tools", "amyc.mjs"), source,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", profile
  ], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}${result.error ? `\n${result.error.stack || result.error}` : ""}`);
  const asm = readFileSync(asmPath, "utf8");
  const sharedComparisons = asm.match(/cp 3\s*\r?\n\s*jp z,[^\r\n]+\s*\r?\n\s*cp 7/gi) || [];
  assert.equal(sharedComparisons.length, 3, `${profile}: each OR condition should reuse one loaded value`);

  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (!existsSync(biosPath)) continue;
  const core = await GearcolecoTestCore.create({ seed: 0xC5E1 });
  try {
    core.loadBios(readFileSync(biosPath));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    assert.equal(core.readRam(addressOf(asm, "First"), 1)[0], 1, `${profile}: first operand match`);
    assert.equal(core.readRam(addressOf(asm, "Second"), 1)[0], 1, `${profile}: second operand match`);
    assert.equal(core.readRam(addressOf(asm, "Miss"), 1)[0], 0, `${profile}: no-match branch`);
  } finally {
    core.destroy();
  }
}

console.log(`Shared condition load: PASS (${profiles.length} real ROM builds)`);
