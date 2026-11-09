#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

async function assemble(body) {
  return assembleAmysCVAssembly({ "main.asm": `org $8000\n${body}\n` }, "main.asm", {
    outputFilename: "byte-range.rom",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: false
  });
}

for (const value of [-128, -1, 0, 255]) {
  const result = await assemble(`ld a,${value}`);
  assert.equal(result.ok, true, `${value}: ${result.log || "expected valid byte immediate"}`);
}

for (const body of ["ld a,256", "ld a,456", "TooWide equ 456\nld a,TooWide", "ld a,-129"]) {
  const result = await assemble(body);
  assert.equal(result.ok, false, `${body}: out-of-range byte immediate must fail`);
  assert.match(result.log || "", /8-bit immediate out of range/i, `${body}: clear range diagnostic`);
}

console.log("Assembler byte-immediate range: PASS");
