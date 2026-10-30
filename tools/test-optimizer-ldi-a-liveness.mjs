#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

async function optimize(body, level = "balanced") {
  const asm = `org $8000\nStart:\n${body}\n`;
  const profile = getOptimizationProfile(level, asm);
  const result = await assembleAmysCVAssembly({ "main.asm": asm }, "main.asm", {
    outputFilename: `ldi-a-liveness-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} should assemble`);
  return result.optimizedAsm.toLowerCase();
}

const copyStep = `
    ld a,(hl)
    ld (de),a
    inc hl
    inc de`;

for (const level of ["balanced", "aggressive", "experimental"]) {
  const accumulatorLive = await optimize(`${copyStep}
    or a
    jr nz,Start
    ret`, level);
  assert.doesNotMatch(accumulatorLive, /\bldi\b/, `${level}: LDI must not replace a copy whose byte remains live in A`);
  assert.match(accumulatorLive, /ld a,\(hl\)[\s\S]*ld \(de\),a[\s\S]*inc hl[\s\S]*inc de[\s\S]*or a/,
    `${level}: the A-dependent copy sequence must remain intact`);

  const flagsLive = await optimize(`${copyStep}
    jr z,Done
Done:
    ld a,0
    ret`, level);
  assert.doesNotMatch(flagsLive, /\bldi\b/, `${level}: LDI must not replace a copy when original flags remain live`);

  const safe = await optimize(`${copyStep}
    xor a
    ret`, level);
  assert.match(safe, /\bldi\s+inc bc\b/, `${level}: LDI remains available when both A and flags are dead`);
}

console.log("Optimizer LDI accumulator/flag liveness: PASS");
