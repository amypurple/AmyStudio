#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const routines = ["coleco_math_u32_copy.asm", "coleco_math_u32_sub.asm", "coleco_math_compare_u32.asm"]
  .map((name) => readFileSync(resolve(root, "src/alexis_lib", name), "utf8")).join("\n");
const source = `
cpu Z80
org $8000
db $55,$AA
dw 0,0,$7000,0
dw Start
db $C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0
jp Nmi
Nmi:
  in a,($BF)
  retn
${routines}
Start:
  ld hl,$1122
  ld ($7040),hl
  ld hl,$3344
  ld ($7042),hl
  ld hl,$7050
  ld de,$7040
  ld bc,$A55A
  call AMY_U32_COPY
  ld ($7060),hl
  ld ($7062),de
  ld ($7064),bc

  ld hl,$0010
  ld ($7050),hl
  ld hl,$0001
  ld ($7052),hl
  ld hl,$0003
  ld ($7040),hl
  xor a
  ld ($7042),a
  ld ($7043),a
  ld hl,$7050
  ld de,$7040
  call AMY_U32_SUB
  ld ($7066),hl
  ld ($7068),de

  ld hl,$7050
  ld de,$7040
  call AMY_CMP_U32_MEM
  ld a,0
  jr c,CompareDone
  inc a
CompareDone:
  ld ($706A),a
  ld ($706B),hl
  ld ($706D),de
  ld a,$5A
  ld ($706F),a
Forever:
  jr Forever
`;

const assembled = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "u32-helper-abi-runtime.rom",
  outputMode: "binary",
  targetPlatform: "coleco",
  optimizerEnabled: false
});
assert.equal(assembled.ok, true, assembled.log);

const core = await GearcolecoTestCore.create({ seed: 0x55333241 });
const word = (address) => {
  const bytes = core.readRam(address, 2);
  return bytes[0] | (bytes[1] << 8);
};
try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(assembled.binary || assembled.bytes, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 2; frame += 1) core.runFrame();
  assert.equal(core.readRam(0x706F, 1)[0], 0x5A, "u32 ABI diagnostic did not complete");
  assert.deepEqual([...core.readRam(0x7050, 4)], [0x0D, 0x00, 0x01, 0x00], "u32 subtraction result");
  assert.equal(word(0x7060), 0x7053, "copy HL advances to destination + 3");
  assert.equal(word(0x7062), 0x7043, "copy DE advances to source + 3");
  assert.equal(word(0x7064), 0xA55A, "copy preserves BC");
  assert.equal(word(0x7066), 0x7050, "subtract preserves HL");
  assert.equal(word(0x7068), 0x7040, "subtract preserves DE");
  assert.equal(core.readRam(0x706A, 1)[0], 1, "compare reports left greater than right");
  assert.equal(word(0x706B), 0x7050, "compare preserves HL");
  assert.equal(word(0x706D), 0x7040, "compare preserves DE");
  console.log("u32 helper ABI runtime: PASS");
} finally {
  core.destroy();
}
