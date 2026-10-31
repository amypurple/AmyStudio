#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-random-quality-"));
const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
const source = `
u16 I = 0
u8 Value = 0
u8 RawMax = 0
u8 BoundedMax = 0
u8 Counts[10]
u8 Covered = 0
u8 OffSequence[32]
u8 OnSequence[32]
u8 Finished = 0

asm {
  ld hl,$0033
  ld (legacy_random_seed),hl
}
nmi off
for I = 0 to 31
  OffSequence[I] = random(256)
next
asm {
  ld hl,$0033
  ld (legacy_random_seed),hl
}
nmi on
for I = 0 to 31
  wait
  OnSequence[I] = random(256)
next
nmi off
for I = 0 to 1023
  Value = random(10)
  if Value > BoundedMax then BoundedMax = Value
  Counts[Value] += 1
next
for Value = 0 to 9
  if Counts[Value] > 0 then Covered += 1
next
for I = 0 to 1023
  Value = random(256)
  if Value > RawMax then RawMax = Value
next
Finished = 1
loop forever
`;

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const sourcePath = join(temp, "random-quality.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const result = spawnSync(process.execPath, [
      resolve(root, "tools/amyc.mjs"), sourcePath,
      "--asm", asmPath,
      "--rom", romPath,
      "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const rom = readFileSync(romPath);
    const core = await GearcolecoTestCore.create({ seed: 0x524E4438 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 120; frame += 1) core.runFrame();
      const byte = (name) => core.readRam(addressOf(asm, name), 1)[0];
      assert.equal(byte("Finished"), 1, `${profile}: random quality loop did not finish`);
      assert.ok(byte("RawMax") >= 192, `${profile}: raw random byte never reached the upper quarter`);
      assert.equal(byte("BoundedMax"), 9, `${profile}: random(10) did not reach its upper bound`);
      assert.equal(byte("Covered"), 10, `${profile}: random(10) did not cover all ten values`);
      const offSequence = core.readRam(addressOf(asm, "OffSequence"), 32);
      const onSequence = core.readRam(addressOf(asm, "OnSequence"), 32);
      assert.deepEqual([...offSequence], [...onSequence], `${profile}: random sequence depends on NMI timing`);
      assert.deepEqual([...offSequence.subarray(0, 2)], [0x66, 0xCC], `${profile}: BIOS LFSR byte sequence changed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Random byte quality: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
