#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

async function optimizedAsm(body, level) {
  const asm = `org $8000\nStart:\n${body}\n`;
  const profile = getOptimizationProfile(level, asm);
  const result = await assembleAmysCVAssembly({ "main.asm": asm }, "main.asm", {
    outputFilename: `half-register-${level}.bin`, outputMode: "binary", targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled, optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} should assemble`);
  return result.optimizedAsm.toLowerCase();
}

const invalidatedHigh = `ld hl,$7027\ninc h\nld hl,$704f\nret`;
const preservedHigh = `ld hl,$7027\ninc l\nld hl,$704f\nret`;
const provenHigh = `ld hl,$7027\nld a,b\nld hl,$704f\nret`;

for (const level of ["safe", "balanced", "aggressive", "experimental"]) {
  assert.match(await optimizedAsm(invalidatedHigh, level), /ld hl,28751/, `${level}: INC H requires the full HL reload`);
  assert.match(await optimizedAsm(preservedHigh, level), /ld l,79/, `${level}: INC L preserves the known H value`);
}
assert.match(await optimizedAsm(provenHigh, "balanced"), /ld l,79/, "Balanced keeps the valid known-H shortening");

console.log("Optimizer half-register proof regression: PASS");
