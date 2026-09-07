#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const source = `org $8000
Start:
  ld b,2
  djnz Taken
  ld a,1
  jp Done
Taken:
  ld a,2
  djnz Nested
  ld a,3
Nested:
  inc a
Done:
  ret
`;

for (const level of ["balanced", "aggressive", "experimental"]) {
  const profile = getOptimizationProfile(level, source);
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: `djnz-reachability-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} should assemble`);
  assert.match(result.optimizedAsm, /djnz Taken/i, `${level} must preserve the outer DJNZ target`);
  assert.match(result.optimizedAsm, /ld A,1/i, `${level} must preserve outer fall-through`);
  assert.match(result.optimizedAsm, /ld A,2/i, `${level} must preserve the outer target body`);
  assert.match(result.optimizedAsm, /djnz Nested/i, `${level} must preserve the nested DJNZ target`);
  assert.match(result.optimizedAsm, /ld A,3/i, `${level} must preserve nested fall-through`);
  assert.match(result.optimizedAsm, /inc A/i, `${level} must preserve the nested target body`);
}

console.log("Optimizer DJNZ reachability: PASS");
