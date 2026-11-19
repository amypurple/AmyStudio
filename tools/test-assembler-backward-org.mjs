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

const forward = await assemble(`
org $8000
db 1,2,3
org $8010
db 9
`);
assert.equal(forward.ok, true, forward.log);
assert.equal(forward.binary[0x10], 9);

const bss = await assemble(`
org $8000
db 1
org $7000
Buffer: ds 16
`);
assert.equal(bss.ok, true, bss.log);
assert.equal(bss.symbols.Buffer, 0x7000);
assert.equal(bss.binary.length, 1);

for (const statement of ["db 9", "dw $1234", "nop", "ds 2,$AA"]) {
  const result = await assemble(`
org $8000
db 1,2,3
org $7F00
Bad: ${statement}
`);
  assert.equal(result.ok, false, `${statement}: backward ORG emission was accepted`);
  assert.match(result.log, /Cannot emit code or initialized data.*backward ORG/i, `${statement}: ${result.log}`);
  assert.match(result.log, /Line\s+5/i, `${statement}: missing source line in diagnostic`);
}

console.log("Assembler backward ORG safety: PASS");
