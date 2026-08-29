#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-qualified-math-bit-"));
const source = join(temp, "qualified-math-bit.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED MATH BIT ROM TEST"
memory "colecovision_legacy_sdcc"

record MathMemory:
  u8 ByteValue
  u16 WordValue
  u8 Flags[3]
end record

overlay WorkRam
  Game as MathMemory
  Menu as MathMemory
end overlay

u8 Passed = 0
u8 I = 1
u8 ClampLowResult = 0
u8 ClampHighResult = 0
u8 LocalBitResult = 0

sub start:
  WorkRam.Game.ByteValue = 1
  clamp WorkRam.Game.ByteValue between 3 and 8
  ClampLowResult = WorkRam.Game.ByteValue
  if WorkRam.Game.ByteValue = 3 then Passed |= $01
  WorkRam.Game.ByteValue = 12
  clamp WorkRam.Game.ByteValue between 3 and 8
  ClampHighResult = WorkRam.Game.ByteValue
  if WorkRam.Game.ByteValue = 8 then Passed |= $02
  WorkRam.Game.WordValue = 100
  clamp WorkRam.Game.WordValue between 200 and 900
  if WorkRam.Game.WordValue = 200 then Passed |= $04
  WorkRam.Game.WordValue = 1200
  clamp WorkRam.Game.WordValue between 200 and 900
  if WorkRam.Game.WordValue = 900 then Passed |= $08
  WorkRam.Game.Flags[I] = 1
  set bit 3 of WorkRam.Game.Flags[I]
  if WorkRam.Game.Flags[I] = 9 then Passed |= $10
  clear bit 0 of WorkRam.Game.Flags[I]
  if WorkRam.Game.Flags[I] = 8 then Passed |= $20
  CheckLocal()
  loop forever
end sub

sub CheckLocal:
  MathMemory LocalState
  LocalState.ByteValue = 20
  clamp LocalState.ByteValue between 4 and 10
  if LocalState.ByteValue = 10 then Passed |= $40
  LocalState.Flags[I] = 0
  set bit 6 of LocalState.Flags[I]
  LocalBitResult = LocalState.Flags[I]
  if LocalState.Flags[I] = 64 then Passed |= $80
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
    const asmPath = join(temp, `qualified-math-bit-${profile}.asm`);
    const romPath = join(temp, `qualified-math-bit-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x4D415448 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      const actual = {
        passed: core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0],
        clampLow: core.readRam(addressOf(asm, "AMY_UVAR_ClampLowResult"), 1)[0],
        clampHigh: core.readRam(addressOf(asm, "AMY_UVAR_ClampHighResult"), 1)[0],
        localBit: core.readRam(addressOf(asm, "AMY_UVAR_LocalBitResult"), 1)[0]
      };
      assert.deepEqual(actual, { passed: 0xFF, clampLow: 3, clampHigh: 8, localBit: 64 }, `${profile}: qualified math/bit assertions failed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified math/bit ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
