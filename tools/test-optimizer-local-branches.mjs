#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const source = `
org $8000
start:
    call routine
    ret
routine:
    jr .done
    nop
.done:
    jr $+4
    nop
    nop
    ret
`;

const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "local-branches.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: true,
});

assert.equal(result.ok, true, result.log);
assert.match(result.optimizedAsm, /jr \.done/i);
assert.match(result.optimizedAsm, /jr \$\+4/i);
assert.equal(result.stats.optimizer.jrExpanded, 0);
console.log("Optimizer local branch regression passed.");
