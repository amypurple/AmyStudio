#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const routine = readFileSync(resolve(root, "src/alexis_lib/coleco_math_format_u8.asm"), "utf8");
const values = [0, 1, 9, 10, 11, 99, 100, 101, 199, 200, 254, 255];
const resultAddress = 0x7100;
const doneAddress = 0x7180;
const calls = values.map((value, index) => `
  ld a,${value}
  ld de,$${(resultAddress + index * 3).toString(16).toUpperCase()}
  call AMY_U8_TO_ASCII3`).join("");
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
${routine}
Start:${calls}
  ld a,$5A
  ld ($${doneAddress.toString(16).toUpperCase()}),a
Forever:
  jr Forever
`;

const assembled = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "os7-u8-format-runtime.rom",
  outputMode: "binary",
  targetPlatform: "coleco",
  optimizerEnabled: false
});
assert.equal(assembled.ok, true, assembled.log);

const core = await GearcolecoTestCore.create({ seed: 0x5538464D });
try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(assembled.binary || assembled.bytes, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 2; frame += 1) core.runFrame();
  assert.equal(core.readRam(doneAddress, 1)[0], 0x5A, "u8 formatting diagnostic did not complete");
  for (let index = 0; index < values.length; index += 1) {
    const actual = String.fromCharCode(...core.readRam(resultAddress + index * 3, 3));
    assert.equal(actual, String(values[index]).padStart(3, "0"), `format ${values[index]}`);
  }
  console.log(`OS7 u8 formatting runtime: PASS (${values.length} boundary values)`);
} finally {
  core.destroy();
}
