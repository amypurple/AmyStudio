#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

async function optimize(body) {
  const asm = `org $8000\n${body}\n`;
  const profile = getOptimizationProfile("balanced", asm);
  const result = await assembleAmysCVAssembly({ "main.asm": asm }, "main.asm", {
    outputFilename: "indexed-inc-dec-liveness.bin",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || "assembly should succeed");
  return result.optimizedAsm;
}

const deadValues = await optimize(`
Routine:
    ld a,(ix+3)
    add a,1
    ld (ix+3),a
    ld a,(iy-2)
    sub 1
    ld (iy-2),a
    ret
`);
assert.match(deadValues, /inc \(ix\+3\)/i, "dead increment should use indexed INC");
assert.match(deadValues, /dec \(iy-2\)/i, "dead decrement should use indexed DEC");

const liveA = await optimize(`
Routine:
    ld a,(ix+3)
    add a,1
    ld (ix+3),a
    ld (iy-2),a
    ret
`);
assert.match(liveA, /ld a,\(ix\+3\)\s+inc a\s+ld \(ix\+3\),a\s+ld \(iy-2\),a/i,
  "indexed increment must preserve A when a later instruction reads it");

const liveCarry = await optimize(`
Routine:
    ld a,(ix+3)
    add a,1
    ld (ix+3),a
    jr c,Overflow
    ret
Overflow:
    ret
`);
assert.match(liveCarry, /ld a,\(ix\+3\)\s+add a,1\s+ld \(ix\+3\),a\s+jr c,Overflow/i,
  "indexed increment must preserve Carry when a later branch reads it");

console.log("Optimizer indexed INC/DEC liveness: PASS");
