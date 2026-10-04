#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const source = `
org $8000
start:
    jp c,after_call
    call target
after_call:
    ret
target:
    ret
`;

const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "tail-call-label.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: true,
});

assert.equal(result.ok, true, result.log);
assert.ok(result.symbols.after_call !== undefined, "referenced label after tail call must survive optimization");
assert.match(result.optimizedAsm, /after_call:\s*\n\s*ret/i);
console.log("Optimizer labeled tail-call regression passed.");
