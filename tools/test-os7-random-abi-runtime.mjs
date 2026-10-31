#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const source = `
cpu Z80
GET_RANDOM equ $1FFD
RANDOM_SEED equ $73C8
RESULTS equ $7100
DONE equ $7170
org $8000
db $55,$AA
dw 0,0,$7000,0
dw Start
db $C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0
jp Nmi
Nmi:
  in a,($BF)
  retn
Start:
  di
  ld hl,$0033
  ld (RANDOM_SEED),hl
  ld bc,$6A9B
  ld de,$2468
  ld ix,$369A
  ld iy,$47BC
  call GET_RANDOM
  ld (RESULTS),a
  ld (RESULTS+1),bc
  ld (RESULTS+3),de
  ld (RESULTS+5),hl
  ld (RESULTS+7),ix
  ld (RESULTS+9),iy
  call GET_RANDOM
  ld (RESULTS+11),a
  ld (RESULTS+12),hl
  ld a,$5A
  ld (DONE),a
Forever:
  jr Forever
`;

const assembled = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "os7-random-abi-runtime.rom", outputMode: "binary",
  targetPlatform: "coleco", optimizerEnabled: false
});
assert.equal(assembled.ok, true, assembled.log);
const rom = assembled.binary || assembled.bytes;
const core = await GearcolecoTestCore.create({ seed: 0x52414E44 });
try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 2; frame += 1) core.runFrame();
  assert.equal(core.readRam(0x7170, 1)[0], 0x5A, "GET_RANDOM ABI diagnostic did not complete");
  assert.deepEqual([...core.readRam(0x7100, 11)], [
    0x66, 0x9B, 0x6A, 0x68, 0x24, 0x66, 0x00, 0x9A, 0x36, 0xBC, 0x47
  ], "first GET_RANDOM call returned unexpected state");
  assert.deepEqual([...core.readRam(0x710B, 3)], [0xCC, 0xCC, 0x00], "second GET_RANDOM value is incorrect");
  assert.deepEqual([...core.readRam(0x73C8, 2)], [0xCC, 0x00], "BIOS random seed was not updated");
  console.log(`OS7 GET_RANDOM ABI runtime: PASS (${rom.length} occupied bytes)`);
} finally {
  core.destroy();
}
