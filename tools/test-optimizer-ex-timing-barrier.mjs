import assert from "node:assert/strict";

import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const source = `
    org $8000
Start:
    ex (sp),hl
    ex (sp),hl
    ex de,hl
    inc a
    ex de,hl
    ret
`;

for (const level of ["safe", "balanced", "aggressive", "experimental"]) {
  const profile = getOptimizationProfile(level, source);
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: `optimizer-ex-timing-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });

  assert.equal(result.ok, true, result.log || `${level} timing fixture should assemble`);
  assert.deepEqual(
    Array.from(result.binary),
    [0xE3, 0xE3, 0xEB, 0x3C, 0xEB, 0xC9],
    `${level} must preserve deliberate EX timing barriers`
  );
}

console.log("Optimizer EX timing-barrier tests passed.");
