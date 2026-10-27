#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-symbolic-zero-"));
const source = join(temp, "symbolic-zero.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `
project "Symbolic zero compare"
memory "colecovision_legacy_sdcc"
const Empty = 0
const One = 1
const Full = 255
u8 ZeroValue = 0
u8 NonzeroValue = 7
u8 OneValue = 1
u8 FullValue = 255
u8 EqualResult = 0
u8 DifferentResult = 0
u8 OneResult = 0
u8 FullResult = 0
if ZeroValue == Empty then EqualResult = 1
if NonzeroValue != Empty then DifferentResult = 1
if OneValue == One then OneResult = 1
if FullValue == Full then FullResult = 1
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
  const build = spawnSync(process.execPath, [
    join(root, "tools", "amyc.mjs"), source,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", profile
  ], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, `${profile}: ${build.stdout}${build.stderr}${build.error ? `\n${build.error.stack || build.error}` : ""}`);

  const asm = readFileSync(asmPath, "utf8");
  assert.doesNotMatch(asm, /cp AMY_UCONST_Empty/i, `${profile}: symbolic zero compare should be resolved`);
  assert.match(asm, /ld a,\(AMY_UVAR_ZeroValue\)\s*\r?\n\s*or a/i, `${profile}: equality uses OR A`);
  assert.match(asm, /ld a,\(AMY_UVAR_NonzeroValue\)\s*\r?\n\s*or a/i, `${profile}: inequality uses OR A`);
  assert.match(asm, /ld a,\(AMY_UVAR_OneValue\)\s*\r?\n\s*dec a/i, `${profile}: named one uses DEC A`);
  assert.match(asm, /ld a,\(AMY_UVAR_FullValue\)\s*\r?\n\s*inc a/i, `${profile}: named 255 uses INC A`);

  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (!existsSync(biosPath)) continue;
  const core = await GearcolecoTestCore.create({ seed: 0xC000 });
  try {
    core.loadBios(readFileSync(biosPath));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    assert.equal(core.readRam(addressOf(asm, "EqualResult"), 1)[0], 1, `${profile}: zero equality branch`);
    assert.equal(core.readRam(addressOf(asm, "DifferentResult"), 1)[0], 1, `${profile}: nonzero inequality branch`);
    assert.equal(core.readRam(addressOf(asm, "OneResult"), 1)[0], 1, `${profile}: named one equality branch`);
    assert.equal(core.readRam(addressOf(asm, "FullResult"), 1)[0], 1, `${profile}: named 255 equality branch`);
  } finally {
    core.destroy();
  }
}

console.log(`Symbolic zero compare: PASS (${profiles.length} real ROM builds)`);
