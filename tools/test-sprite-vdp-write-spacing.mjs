import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const library = await readFile("src/alexis_lib/coleco_sprite_table.asm", "utf8");
const partialLibrary = await readFile("src/alexis_lib/coleco_sprite_partial.asm", "utf8");
const source = `
    org $8000
VDP_CTRL_PORT equ $BF
VDP_DATA_PORT equ $BE
VDP_STATUS equ $7000
AMY_SPRITE_FLICKER_ENABLED equ $7001
AMY_SPRITE_FLICKER_PHASE equ $7002
AMY_SPRITE_STABLE_FIRST equ 0
AMY_SPRITE_STABLE_LAST equ 0
${library}
${partialLibrary}
`;

for (const level of ["safe", "balanced", "aggressive", "experimental"]) {
  const profile = getOptimizationProfile(level, source);
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: `sprite-vdp-spacing-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} sprite library should assemble`);

  const bytes = Array.from(result.binary);
  const pacedEntry = [0xED, 0xA3, 0x18, 0x00, 0xED, 0xA3, 0x18, 0x00, 0xED, 0xA3, 0x18, 0x00];
  let count = 0;
  for (let index = 0; index <= bytes.length - pacedEntry.length; ++index) {
    if (pacedEntry.every((byte, offset) => bytes[index + offset] === byte)) count++;
  }
  assert.equal(count, 2, `${level} must preserve both paced sprite upload loops`);

  const pacedPartialByte = [0xD3, 0xBE, 0x00];
  let partialCount = 0;
  for (let index = 0; index <= bytes.length - pacedPartialByte.length; ++index) {
    if (pacedPartialByte.every((byte, offset) => bytes[index + offset] === byte)) partialCount++;
  }
  assert.equal(partialCount, 4, `${level} must preserve pacing after all four partial sprite writes`);
}

console.log("Sprite VDP write-spacing tests passed.");
