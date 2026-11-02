import assert from "node:assert/strict";

import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const levels = ["safe", "balanced", "aggressive", "experimental"];
const fixture = `
    org $8000
Start:
    ld a,$25
    add a,$80
    daa
    push af
    ld hl,$7029
    ld de,1
    add hl,de
    pop af
    ld (hl),a
    adc a,0
    ret
`;

for (const level of levels) {
  const profile = getOptimizationProfile(level, fixture);
  const result = await assembleAmysCVAssembly({ "main.asm": fixture }, "main.asm", {
    outputFilename: `optimizer-af-flags-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });

  assert.equal(result.ok, true, result.log || `${level} fixture should assemble`);
  const bytes = Array.from(result.binary || []);
  const addressSetup = bytes.findIndex((byte, index) =>
    byte === 0xf5 && bytes[index + 1] === 0x21 && bytes[index + 4] === 0x11
  );
  assert.notEqual(
    addressSetup,
    -1,
    `${level} must preserve AF around ADD HL,DE; listing:\n${result.listing}`
  );
  assert.equal(
    bytes[addressSetup + 7],
    0x19,
    `${level} fixture should retain ADD HL,DE inside the AF save`
  );
  assert.equal(
    bytes[addressSetup + 8],
    0xf1,
    `${level} must restore AF after ADD HL,DE`
  );
}

console.log("Optimizer AF flag-preservation regression passed.");
