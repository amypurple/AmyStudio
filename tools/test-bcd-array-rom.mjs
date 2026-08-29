#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-bcd-array-"));
const source = join(temp, "bcd-array.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "BCD ARRAY ROM TEST"
memory "colecovision_legacy_sdcc"
u8 GuardBefore = $A5
bcd digits 4 Scores[3] = 12
u8 GuardAfter = $5A
u8 I = 0
u8 Passed = 0
u8 Formatted[4]

sub start:
  text screen
  if Scores[0] = 12 then Passed += 1
  if Scores[1] = 12 then Passed += 1
  if Scores[2] = 12 then Passed += 1
  Scores[1] = 1200
  I = 1
  Scores[I] += 34
  if Scores[I] = 1234 then Passed += 1
  inc Scores[I]
  if Scores[1] = 1235 then Passed += 1
  dec Scores[I]
  if Scores[1] = 1234 then Passed += 1
  Scores[I + 1] = Scores[I]
  if Scores[2] = 1234 then Passed += 1
  format Scores[2] into Formatted
  print Scores[2] at 4,3
  clear Scores[I]
  if Scores[1] = 0 then Passed += 1
  VerifyLocal()
  loop forever
end sub

sub VerifyLocal:
  bcd digits 5 LocalScores[2] = 7
  u8 J = 1
  if LocalScores[0] = 7 then Passed += 1
  if LocalScores[J] = 7 then Passed += 1
  LocalScores[J] = 54321
  LocalScores[J] -= 21
  if LocalScores[J] = 54300 then Passed += 1
  clear LocalScores[J - 1]
  if LocalScores[0] = 0 then Passed += 1
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
    const asmPath = join(temp, `bcd-array-${profile}.asm`);
    const romPath = join(temp, `bcd-array-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x42434441 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 12, `${profile}: BCD array assertions failed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_GuardBefore"), 1)[0], 0xA5, `${profile}: leading guard changed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_GuardAfter"), 1)[0], 0x5A, `${profile}: trailing guard changed`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Formatted"), 4)], [0x31, 0x32, 0x33, 0x34], `${profile}: BCD array formatting failed`);
      assert.deepEqual([...core.readVram(0x1800 + 3 * 32 + 4, 4)], [0x31, 0x32, 0x33, 0x34], `${profile}: direct BCD array print failed`);
    } finally {
      core.destroy();
    }
  }
  for (const [name, declaration, expected] of [
    ["zero-length", "bcd digits 4 Bad[0]", /BCD array length must be a compile-time constant from 1 to 255/i],
    ["wide-length", "bcd digits 4 Bad[256]", /BCD array length must be a compile-time constant from 1 to 255/i],
    ["constant-oob", "bcd digits 4 Bad[2]\nBad[2] = 1", /invalid runtime assignment/i]
  ]) {
    const invalidSource = join(temp, `${name}.alexis`);
    writeFileSync(invalidSource, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${declaration}\n`);
    const invalid = spawnSync(process.execPath, [amyc, invalidSource, "--asm", join(temp, `${name}.asm`)], { cwd: root, encoding: "utf8" });
    assert.notEqual(invalid.status, 0, `${name}: invalid BCD array program should fail`);
    assert.match(`${invalid.stdout}${invalid.stderr}`, expected, `${name}: wrong diagnostic`);
  }
  console.log(`BCD array ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
