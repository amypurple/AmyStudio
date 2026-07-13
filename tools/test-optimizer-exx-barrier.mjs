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

const adjacentReloadAsm = `
    org $8000
Start:
    ld a,$42
    ld (ByteCell),a
    ld a,(ByteCell)
    ld hl,$1234
    ld (WordCell),hl
    ld hl,(WordCell)
    ret
ByteCell:
    db 0
WordCell:
    dw 0
`;

for (const level of levels) {
  const profile = getOptimizationProfile(level, adjacentReloadAsm);
  const result = await assembleAmysCVAssembly({ "main.asm": adjacentReloadAsm }, "main.asm", {
    outputFilename: `optimizer-adjacent-reload-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });

  assert.equal(result.ok, true, result.log || `${level} adjacent reload optimizer fixture should assemble`);

  const bytes = Array.from(result.binary || []);
  const byteStoreIndex = bytes.findIndex((byte, index) => byte === 0x32 && bytes[index + 3] === 0x21);
  assert.notEqual(byteStoreIndex, -1, `${level} fixture should contain LD (ByteCell),A followed by LD HL after reload removal`);
  assert.notEqual(bytes[byteStoreIndex + 4], 0x3a, `${level} optimizer should remove adjacent LD A,(ByteCell) reload`);

  const wordStoreIndex = bytes.findIndex((byte, index) => byte === 0x22 && bytes[index + 3] === 0xc9);
  assert.notEqual(wordStoreIndex, -1, `${level} optimizer should leave LD (WordCell),HL directly before RET after reload removal`);
}

const unchangedHlReloadAsm = `
    org $8000
Start:
    ld hl,(WordCell)
    ld a,h
    ld (ByteCell),a
    ld hl,(WordCell)
    ld a,h
    ld (ByteCell2),a
    ret
ByteCell:
    db 0
ByteCell2:
    db 0
WordCell:
    dw $1234
`;

for (const level of levels) {
  const profile = getOptimizationProfile(level, unchangedHlReloadAsm);
  const result = await assembleAmysCVAssembly({ "main.asm": unchangedHlReloadAsm }, "main.asm", {
    outputFilename: `optimizer-unchanged-hl-reload-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });

  assert.equal(result.ok, true, result.log || `${level} unchanged-HL reload fixture should assemble`);
  const bytes = Array.from(result.binary || []);
  const hlReloadCount = bytes.filter((byte) => byte === 0x2a).length;
  assert.equal(hlReloadCount, 1, `${level} optimizer should remove second LD HL,(WordCell) while HL is unchanged; listing:\n${result.listing}`);
}

const changedSourceHlReloadAsm = `
    org $8000
Start:
    ld hl,(WordCell)
    ld a,h
    ld (WordCell),a
    ld hl,(WordCell)
    ld a,h
    ld (ByteCell),a
    ret
ByteCell:
    db 0
WordCell:
    dw $1234
`;

for (const level of levels) {
  const profile = getOptimizationProfile(level, changedSourceHlReloadAsm);
  const result = await assembleAmysCVAssembly({ "main.asm": changedSourceHlReloadAsm }, "main.asm", {
    outputFilename: `optimizer-changed-source-hl-reload-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });

  assert.equal(result.ok, true, result.log || `${level} changed-source reload fixture should assemble`);
  const bytes = Array.from(result.binary || []);
  const hlReloadCount = bytes.filter((byte) => byte === 0x2a).length;
  assert.equal(hlReloadCount, 2, `${level} optimizer must keep LD HL,(WordCell) after WordCell was written; listing:\n${result.listing}`);
}
console.log("Optimizer EXX barrier regression passed.");