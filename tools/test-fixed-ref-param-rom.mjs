#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-fixed-ref-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "fixed-ref.alexis");

writeFileSync(source, `project "FIXED REF PARAM ROM"
memory "colecovision_legacy_sdcc"

record Motion:
  fixed Position
  ufixed Rate
end record

fixed Position = 1.5
ufixed Speed = 200.0
fixed32 Distance = 1000.25
fixed32 Negative = -1.5
fixed32 Minimum = -32768.0
fixed32 Maximum = 32767.5
fixed FixedValues[1] = 3.5
Motion State
u8 Passed = 0

sub start:
  State.Rate = 8.0
  AdjustPair(Position, Speed)
  AdjustPair(FixedValues[0], State.Rate)
  AdjustDistance(Distance)
  if Position = 2.0 then Passed += 1
  if Speed = 100.0 then Passed += 1
  if FixedValues[0] = 4.0 then Passed += 1
  if State.Rate = 4.0 then Passed += 1
  if Distance = 1001.0 then Passed += 1
  if Distance <> 1000.0 then Passed += 1
  if Distance < 1001.5 then Passed += 1
  if Distance <= 1001.0 then Passed += 1
  if Distance > 1000.5 then Passed += 1
  if Distance >= 1001.0 then Passed += 1
  if Negative = -1.5 then Passed += 1
  if Negative < 0.0 then Passed += 1
  if -2.0 < Negative then Passed += 1
  if Negative > -2.0 then Passed += 1
  if Minimum = -32768.0 then Passed += 1
  if Maximum > 32767.0 then Passed += 1
  if Distance = raw $03E90000 then Passed += 1
  if Distance = 1000.0 + 1.0 then Passed += 1
  loop forever
end sub

sub AdjustPair(ref fixed Value, ref ufixed Rate):
  Value += 0.5
  Rate /= 2.0
  return
end sub

sub AdjustDistance(ref fixed32 Value):
  Value += 0.75
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
    const asmPath = join(temp, `fixed-ref-${profile}.asm`);
    const romPath = join(temp, `fixed-ref-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x46585246 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Position"), 2)], [0x00, 0x02], `${profile}: ref fixed update failed`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Speed"), 2)], [0x00, 0x64], `${profile}: ref ufixed update failed`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Distance"), 4)], [0x00, 0x00, 0xE9, 0x03], `${profile}: ref fixed32 update failed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 18, `${profile}: fixed ref/comparison checks failed`);
    } finally {
      core.destroy();
    }
  }
  const invalidSource = join(temp, "fixed-compare-out-of-range.alexis");
  writeFileSync(invalidSource, `project "FIXED COMPARE OUT OF RANGE"
memory "colecovision_legacy_sdcc"
fixed32 Value = 0.0
sub start:
  if Value = 32768.0 then Value = 1.0
  loop forever
end sub
`);
  const invalidResult = spawnSync(process.execPath, [amyc, invalidSource, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  assert.notEqual(invalidResult.status, 0, "out-of-range fixed32 comparison must fail closed");
  console.log(`Fixed reference parameter ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
