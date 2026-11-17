#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const referencedLabelSource = `
org $8000
start:
    jp c,after_call
    call target
after_call:
    ret
target:
    ret
`;

async function optimize(source, filename) {
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: filename,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: true,
  });
  assert.equal(result.ok, true, result.log);
  return result;
}

const result = await optimize(referencedLabelSource, "tail-call-label.bin");

assert.ok(result.symbols.after_call !== undefined, "referenced label after tail call must survive optimization");
assert.match(result.optimizedAsm, /after_call:\s*\n\s*ret/i);

const unlabeledResult = await optimize(`
org $8000
    jp start
target:
    ret
start:
    call target
    ret
`, "tail-call-unlabeled.bin");

assert.doesNotMatch(unlabeledResult.optimizedAsm, /call\s+target/i,
  "unlabeled CALL/RET must be eliminated");

const deadLabelResult = await optimize(`
org $8000
    jp start
target:
    ret
start:
    call target
dead_return:
    ret
`, "tail-call-dead-label.bin");

assert.doesNotMatch(deadLabelResult.optimizedAsm, /call\s+target/i,
  "labeled CALL/RET must still be tail-call optimized");
assert.doesNotMatch(deadLabelResult.optimizedAsm, /dead_return:/i,
  "unreferenced label and RET must be consumed together");

console.log("Optimizer labeled tail-call regression passed.");
