#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-fp5-array-"));
const source = join(temp, "fp5-array.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "FP5 ARRAY ROM TEST"
memory "colecovision_legacy_sdcc"
u8 GuardBefore = $A5
fp5 Values[3] = 1.5
u8 GuardAfter = $5A
u8 I = 1
u8 Passed = 0
u8 OutputText[16]

sub start:
  text screen
  if Values[0] = 1.5 then Passed += 1
  if Values[1] = 1.5 then Passed += 1
  if Values[2] = 1.5 then Passed += 1
  Values[I] = 2.25
  Values[I] += 0.75
  if Values[I] = 3.0 then Passed += 1
  Values[I + 1] = Values[I]
  Values[I + 1] *= 2.0
  if Values[2] = 6.0 then Passed += 1
  format Values[2] into OutputText
  print Values[2] at 3,4
  clear Values[0]
  if Values[0] = 0.0 then Passed += 1
  VerifyLocal()
  screen on
  loop forever
end sub

sub VerifyLocal:
  fp5 LocalValues[2] = -1.25
  u8 J = 1
  if LocalValues[0] = -1.25 then Passed += 1
  LocalValues[J] = 4.5
  LocalValues[J] -= 0.5
  if LocalValues[J] = 4.0 then Passed += 1
  return
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `fp5-array-${profile}.asm`);
    const romPath = join(temp, `fp5-array-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x46503541 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 8, `${profile}: FP5 array assertions failed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_GuardBefore"), 1)[0], 0xA5, `${profile}: leading guard changed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_GuardAfter"), 1)[0], 0x5A, `${profile}: trailing guard changed`);
      const text = String.fromCharCode(...core.readRam(addressOf(asm, "AMY_UVAR_OutputText"), 16));
      assert.equal(text, " 00006.000000000", `${profile}: indexed FP5 format failed`);
      assert.deepEqual([...core.readVram(0x1800 + 4 * 32 + 3, 16)], [...Buffer.from(" 00006.000000000")], `${profile}: direct indexed FP5 print failed`);
    } finally {
      core.destroy();
    }
  }
  for (const [name, declaration] of [
    ["zero-length", "fp5 Bad[0]"],
    ["wide-length", "fp5 Bad[256]"],
    ["constant-oob", "fp5 Bad[2]\nBad[2] = 1.0"]
  ]) {
    const invalidSource = join(temp, `${name}.alexis`);
    writeFileSync(invalidSource, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${declaration}\n`);
    const invalid = spawnSync(process.execPath, [amyc, invalidSource, "--asm", join(temp, `${name}.asm`)], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.notEqual(invalid.status, 0, `${name}: invalid FP5 array program should fail`);
  }
  console.log(`FP5 array ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
