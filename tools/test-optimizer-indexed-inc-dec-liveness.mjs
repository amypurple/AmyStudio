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

const returnedCarry = await optimize(`
Routine:
    ld a,(ix+3)
    add a,1
    ld (ix+3),a
    ld a,(iy-2)
    sub 1
    ld (iy-2),a
    ret
`);
assert.match(returnedCarry, /inc \(ix\+3\)/i, "the later SUB makes the increment flags dead");
assert.match(returnedCarry, /ld a,\(iy-2\)\s+sub 1\s+ld \(iy-2\),a\s+ret/i,
  "the decrement must preserve Carry when RET exposes it to the caller");

const deadValues = await optimize(`
Routine:
    ld a,(iy-2)
    sub 1
    ld (iy-2),a
    xor a
    ret
`);
assert.match(deadValues, /dec \(iy-2\)\s+xor a\s+ret/i,
  "indexed DEC remains valid when a later instruction fully replaces the flags");

const liveA = await optimize(`
Routine:
    ld a,(ix+3)
    add a,1
    ld (ix+3),a
    ld (iy-2),a
    ret
`);
assert.match(liveA, /ld a,\(ix\+3\)\s+add a,1\s+ld \(ix\+3\),a\s+ld \(iy-2\),a/i,
  "indexed increment must preserve both A and returned Carry");

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
