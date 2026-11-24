#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { scanAsmLine } from "../studio/vendor/amyscvassembly/parserCore.js";

assert.equal(scanAsmLine("ld a,';' ; real comment").trim(), "ld a,';'", "semicolon literal must survive comment stripping");
assert.equal(scanAsmLine("ex af,af' ; alternate register").trim(), "ex af,af'", "AF' must not open a quoted literal");
assert.equal(scanAsmLine("; l'outil ZX0").trim(), "", "apostrophes in comments must not affect stripping");
assert.equal(scanAsmLine('db "a;b",0 ; comment').trim(), 'db "a;b",0', "semicolon in a string must survive");

const result = await assembleAmysCVAssembly({
  "main.asm": `org $8000
ld a,';'
ex af,af'
db "a;b",0 ; trailing comment
`
}, "main.asm", {
  outputFilename: "semicolon-literal.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: false
});

assert.equal(result.ok, true, result.log);
assert.deepEqual([...result.binary], [0x3e, 0x3b, 0x08, 0x61, 0x3b, 0x62, 0x00]);

console.log("ASM semicolon literal regression passed.");
