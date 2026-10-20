#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const waitRuntime = readFileSync(resolve(root, "src/alexis_lib/coleco_wait.asm"), "utf8");
const source = `
cpu Z80
READ_REGISTER equ $1FDC
WRITE_REGISTER equ $1FD9
NMI_FLAG equ $7082
OFF_DONE equ $7100
ALL_DONE equ $7101
NMI_COUNT equ $7102

org $8000
db $55,$AA
dw 0,0,$7000,0
dw Start
db $C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0
jp Nmi

Nmi:
  push af
  ld a,1
  ld (NMI_FLAG),a
  ld a,(NMI_COUNT)
  inc a
  ld (NMI_COUNT),a
  in a,($BF)
  pop af
  retn

${waitRuntime}

Start:
  di
  xor a
  ld (OFF_DONE),a
  ld (ALL_DONE),a
  ld (NMI_COUNT),a
  ld (NMI_FLAG),a

  ld bc,$0182
  call WRITE_REGISTER
  ld hl,2
  call AMY_WAIT_FRAMES_SAFE
  ld a,$3C
  ld (OFF_DONE),a

  ld bc,$01A2
  call WRITE_REGISTER
  call READ_REGISTER
  ei
  ld hl,3
  call AMY_WAIT_FRAMES_SAFE
  ld a,$5A
  ld (ALL_DONE),a
Forever:
  jr Forever
`;

const assembled = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "os7-wait-frames-runtime.rom",
  outputMode: "binary",
  targetPlatform: "coleco",
  optimizerEnabled: false
});
assert.equal(assembled.ok, true, assembled.log);
const rom = assembled.binary || assembled.bytes;
const core = await GearcolecoTestCore.create({ seed: 0x57414954 });
try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 10 && core.readRam(0x7101, 1)[0] !== 0x5A; frame += 1) {
    core.runFrame();
  }
  assert.equal(core.readRam(0x7100, 1)[0], 0x3C, "NMI-off frame wait did not complete");
  assert.equal(core.readRam(0x7101, 1)[0], 0x5A, "NMI-on frame wait did not complete");
  assert.ok(core.readRam(0x7102, 1)[0] >= 3, "NMI-on wait observed fewer than three NMIs");
  console.log(`OS7 frame wait runtime: PASS (${rom.length} occupied bytes)`);
} finally {
  core.destroy();
}
