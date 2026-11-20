#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

async function assemble(body) {
  const result = await assembleAmysCVAssembly({ "main.asm": `org $8000\n${body}\n` }, "main.asm", {
    outputFilename: "suffix-h-symbols.bin",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: false
  });
  assert.equal(result.ok, true, result.log || "assembly should succeed");
  return [...(result.binary || result.bytes || [])];
}

assert.deepEqual(await assemble(`
CaH:
  nop
  ld hl,CaH
  ld de,0CAH
  ld bc,FFh
`), [0x00, 0x21, 0x00, 0x80, 0x11, 0xca, 0x00, 0x01, 0xff, 0x00]);

assert.deepEqual(await assemble(`
  ld hl,CaH+1
  ld de,FACEH-1
CaH:
  nop
FACEH:
  ret
`), [0x21, 0x07, 0x80, 0x11, 0x06, 0x80, 0x00, 0xc9]);

assert.deepEqual(await assemble(`
CaH equ $8123
  ld hl,cAh
  ld de,CaH+2
`), [0x21, 0x23, 0x81, 0x11, 0x25, 0x81]);

console.log("Assembler suffix-H symbol precedence: PASS");
