#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

async function optimize(body, level) {
  const source = `org $8000\nStart:\n${body}\n`;
  const profile = getOptimizationProfile(level, source);
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: `returned-flags-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} should assemble`);
  return result.optimizedAsm;
}

for (const level of ["balanced", "aggressive", "experimental"]) {
  const returned = await optimize("    cp c\n    or a\n    ret", level);
  assert.match(returned, /\bor\s+a\b/i, `${level}: RET must preserve returned flags`);

  const forwarded = await optimize("    cp c\n    or a\n    jp Target\nTarget:\n    ret", level);
  assert.match(forwarded, /\bor\s+a\b/i, `${level}: terminal JP must preserve forwarded flags`);

  const dead = await optimize("    or a\n    ld a,(Value)\n    add a,1\n    ret\nValue:\n    db 0", level);
  if (level !== "balanced") {
    assert.doesNotMatch(dead, /^\s*or\s+a\s*$/im, `${level}: provably dead OR A should still be removed`);
  }
}

console.log("Optimizer returned-flags regression: PASS");
