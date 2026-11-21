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

// Exact silent/error reproductions supplied with AMY-MUSIC-DRIVER-v1.
assert.deepEqual(await assemble(`
vX equ $7100
KK equ 15
Main:
  ld hl,(vX+2*KK)
  ret
`), [0x2a, 0x1e, 0x71, 0xc9]);

assert.deepEqual(await assemble(`
vX equ $7100
KK equ 15
Main:
  ld (vX+2*KK+1),a
  ld hl,1
  ld (vX+4),hl
  ret
`), [0x32, 0x1f, 0x71, 0x21, 0x01, 0x00, 0x22, 0x04, 0x71, 0xc9]);

console.log("Assembler parenthesized LD expression: PASS");
