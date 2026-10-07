#!/usr/bin/env node
import assert from "node:assert/strict";

import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const encoder = new TextEncoder();

async function assemble(source) {
  return assembleAmysCVAssembly({ "main.asm": encoder.encode(source) }, "main.asm", {
    optimizerEnabled: false,
    outputMode: "binary",
    targetPlatform: "colecovision"
  });
}

const banked = await assemble(`
forg $0000
org $8000
FixedStart:
db $AA,$BB
forg $4000
org $C000
BankStart:
db $CC
`);

assert.equal(banked.ok, true, banked.log);
assert.equal(banked.binary.length, 0x4001);
assert.deepEqual([...banked.binary.slice(0, 2)], [0xAA, 0xBB]);
assert.ok(banked.binary.slice(2, 0x4000).every((value) => value === 0xFF));
assert.equal(banked.binary[0x4000], 0xCC);
assert.equal(banked.symbols.FixedStart, 0x8000);
assert.equal(banked.symbols.BankStart, 0xC000);

const backwards = await assemble(`
forg $0010
org $8000
db 1
forg $0008
db 2
`);
assert.equal(backwards.ok, false);
assert.match(backwards.log, /FORG cannot move backward/);

console.log("Assembler physical origin: PASS");
