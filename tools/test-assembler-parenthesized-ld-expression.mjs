#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

async function assemble(body) {
  const result = await assembleAmysCVAssembly({ "main.asm": `org $8000\n${body}\n` }, "main.asm", {
    outputFilename: "parenthesized-ld-expression.bin",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: false,
  });
  assert.equal(result.ok, true, result.log || "assembly should succeed");
  return [...(result.binary || result.bytes || [])];
}

assert.deepEqual(await assemble(`
vX equ $7118
KK equ 3
  ld hl,(vX+2*KK)
  ld (vX+2*KK),hl
  ld a,(vX+2*KK)
  dw (2*3)
`), [
  0x2a, 0x1e, 0x71,
  0x22, 0x1e, 0x71,
  0x3a, 0x1e, 0x71,
  0x06, 0x00,
]);

console.log("Assembler parenthesized LD expression: PASS");
