#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const source = `
VALUE equ $c000
org $8000
db VALUE>>8,VALUE&$ff,(VALUE<<1)&$ff,>VALUE,<VALUE
times (($+$000f)&$fff0)-$ db $ff
org $c000
bytes: rb 3
words: rw 2
endif
`;

const assemble = gasm80Compatibility => assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "gasm80-syntax.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: false,
  gasm80Compatibility,
});

const savedConsoleError = console.error;
console.error = () => {};
const strict = await assemble(false);
console.error = savedConsoleError;
assert.equal(strict.ok, false, "strict mode must reject the unmatched ENDIF");

const compatible = await assemble(true);
assert.equal(compatible.ok, true, compatible.log);
assert.equal(compatible.binary.length, 0x4000, "RAM reservations must not extend the binary");
assert.deepEqual([...compatible.binary.slice(0, 5)], [0xc0, 0x00, 0x00, 0xc0, 0x00]);
assert.equal(compatible.symbols.bytes, 0xc000);
assert.equal(compatible.symbols.words, 0xc003);
console.log("gasm80 syntax compatibility regression passed.");
