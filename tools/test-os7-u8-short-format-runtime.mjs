#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const sourceFiles = [
  "coleco_math_format_u8_2.asm",
  "coleco_math_format_u8_2_mod.asm",
  "coleco_math_format_u8_1.asm"
];
const routines = sourceFiles
  .map((name) => readFileSync(resolve(root, "src/alexis_lib", name), "utf8"))
  .join("\n");
const cases = [
  ...[0, 1, 9, 10, 11, 98, 99].map((value) => ({ routine: "AMY_U8_TO_ASCII2", value, expected: String(value).padStart(2, "0") })),
  ...[0, 9, 10, 99, 100, 109, 199, 200, 255].map((value) => ({ routine: "AMY_U8_TO_ASCII2_MOD", value, expected: String(value % 100).padStart(2, "0") })),
  ...[0, 9, 10, 99, 100, 109, 199, 200, 255].map((value) => ({ routine: "AMY_U8_TO_ASCII1_MOD", value, expected: String(value % 10) }))
];
const resultAddress = 0x7100;
const doneAddress = 0x7180;
let nextAddress = resultAddress;
const calls = cases.map((testCase) => {
  testCase.address = nextAddress;
  nextAddress += testCase.expected.length;
  return `
  ld a,${testCase.value}
  ld de,$${testCase.address.toString(16).toUpperCase()}
  call ${testCase.routine}`;
}).join("");
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
Start:${calls}
  ld a,$5A
  ld ($${doneAddress.toString(16).toUpperCase()}),a
Forever:
  jr Forever
`;

const assembled = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "os7-u8-short-format-runtime.rom",
  outputMode: "binary",
  targetPlatform: "coleco",
  optimizerEnabled: false
});
assert.equal(assembled.ok, true, assembled.log);

const core = await GearcolecoTestCore.create({ seed: 0x55385346 });
try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(assembled.binary || assembled.bytes, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 2; frame += 1) core.runFrame();
  assert.equal(core.readRam(doneAddress, 1)[0], 0x5A, "short u8 formatting diagnostic did not complete");
  for (const testCase of cases) {
    const actual = String.fromCharCode(...core.readRam(testCase.address, testCase.expected.length));
    assert.equal(actual, testCase.expected, `${testCase.routine} ${testCase.value}`);
  }
  console.log(`OS7 short u8 formatting runtime: PASS (${cases.length} boundary cases)`);
} finally {
  core.destroy();
}
