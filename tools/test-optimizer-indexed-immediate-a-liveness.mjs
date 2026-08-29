#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

async function optimize(body) {
  const asm = `org $8000\n${body}\n`;
  const profile = getOptimizationProfile("safe", asm);
  const result = await assembleAmysCVAssembly({ "main.asm": asm }, "main.asm", {
    outputFilename: "indexed-a-liveness.bin",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || "assembly should succeed");
  return result.optimizedAsm;
}

const liveA = await optimize(`
Routine:
    ld a,$99
    ld (ix-3),a
    ld (ix-2),a
    ret
`);

assert.match(liveA, /ld a,(?:\$99|153)\s+ld \(ix-3\),a\s+ld \(ix-2\),a/i,
  "indexed immediate folding must preserve A while a later store still reads it");

const deadA = await optimize(`
Routine:
    ld a,$99
    ld (ix-3),a
    ld a,$12
    ret
`);

assert.match(deadA, /ld \(ix-3\),(?:\$99|153)/i,
  "indexed immediate folding should remain available when A is proven dead");

console.log("Optimizer indexed immediate A-liveness: PASS");
