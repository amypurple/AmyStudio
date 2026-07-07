import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const levels = ["safe", "balanced", "aggressive", "experimental"];

const exxFixtureAsm = `
    org $8000
Start:
    ld hl,Data
    ld a,(hl)
    inc hl
    exx
    ld hl,$1234
    exx
    ld a,(hl)
    ret
Data:
    db $12,$34
`;

for (const level of levels) {
  const profile = getOptimizationProfile(level, exxFixtureAsm);
  const result = await assembleAmysCVAssembly({ "main.asm": exxFixtureAsm }, "main.asm", {
    outputFilename: `optimizer-exx-${level}.col`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });

  assert.equal(result.ok, true, result.log || `${level} optimizer fixture should assemble`);

  const bytes = Array.from(result.binary || []);
  const hasCriticalSequence = bytes.some((byte, index) =>
    byte === 0x7e && bytes[index + 1] === 0x23 && bytes[index + 2] === 0xd9
  );

  assert.equal(
    hasCriticalSequence,
    true,
    `${level} optimizer must preserve LD A,(HL) / INC HL / EXX; listing:\n${result.listing}`
  );
}

const pletterSource = await fs.readFile("src/compression/pletter_vram.asm", "utf8");
const pletterAsm = `
    org $8000
${pletterSource}
`;

for (const level of levels) {
  const profile = getOptimizationProfile(level, pletterAsm);
  const result = await assembleAmysCVAssembly({ "main.asm": pletterAsm }, "main.asm", {
    outputFilename: `optimizer-pletter-${level}.col`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });

  assert.equal(result.ok, true, result.log || `${level} Pletter optimizer fixture should assemble`);

  const bytes = Array.from(result.binary || []);
  const hasPletterHeaderAdvance = bytes.some((byte, index) =>
    byte === 0xdd && bytes[index + 1] === 0xe5 &&
    bytes[index + 2] === 0x7e && bytes[index + 3] === 0x23 && bytes[index + 4] === 0xd9
  );

  assert.equal(
    hasPletterHeaderAdvance,
    true,
    `${level} optimizer must preserve Pletter header INC HL; listing:\n${result.listing}`
  );
}

console.log("Optimizer EXX barrier regression passed.");