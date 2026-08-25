#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const fixtures = {
  removable: `ld l,0\nld a,b\nld l,0\nret`,
  changedL: `ld l,0\ninc l\nld l,0\nret`,
  changedHL: `ld l,0\ninc hl\nld l,0\nret`,
  addHL: `ld l,0\nadd hl,de\nld l,0\nret`,
  adcHL: `ld l,0\nadc hl,de\nld l,0\nret`,
  sbcHL: `ld l,0\nsbc hl,de\nld l,0\nret`,
  popHL: `ld l,0\npop hl\nld l,0\nret`,
  rotateL: `ld l,0\nrl l\nld l,0\nret`,
  exchange: `ld l,0\nex de,hl\nld l,0\nret`,
  exchangeShadow: `ld l,0\nexx\nld l,0\nret`,
  blockTransfer: `ld l,0\nldi\nld l,0\nret`,
  blockInput: `ld l,0\nini\nld l,0\nret`,
  blockOutput: `ld l,0\nouti\nld l,0\nret`,
  pushPreserves: `ld l,0\npush de\nld l,0\nret`,
  flagsOnlyPreserves: `ld l,0\nscf\nccf\nld l,0\nret`,
  callBarrier: `ld l,0\ncall Helper\nld l,0\nret\nHelper:\nret`,
  labelBarrier: `ld l,0\nMiddle:\nld l,0\nret`,
  pairProof: `ld hl,$1200\nld a,b\nld l,0\nret`
};

async function assemble(body, level) {
  const asm = `org $8000\nStart:\n${body}\n`;
  const profile = getOptimizationProfile(level, asm);
  const result = await assembleAmysCVAssembly({ "main.asm": asm }, "main.asm", {
    outputFilename: `duplicate-l-zero-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} should assemble`);
  return Array.from(result.binary || []).filter((byte) => byte === 0x2e).length;
}

assert.equal(await assemble(fixtures.removable, "balanced"), 2, "Balanced must not use the new rule");
assert.equal(await assemble(fixtures.removable, "aggressive"), 1, "Aggressive should remove the proven duplicate");
assert.equal(await assemble(fixtures.removable, "experimental"), 1, "Experimental inherits Aggressive");
assert.equal(await assemble(fixtures.changedL, "aggressive"), 2, "INC L invalidates L=0");
assert.equal(await assemble(fixtures.changedHL, "aggressive"), 2, "INC HL invalidates L=0");
assert.equal(await assemble(fixtures.addHL, "aggressive"), 2, "ADD HL invalidates L=0");
assert.equal(await assemble(fixtures.adcHL, "aggressive"), 2, "ADC HL invalidates L=0");
assert.equal(await assemble(fixtures.sbcHL, "aggressive"), 2, "SBC HL invalidates L=0");
assert.equal(await assemble(fixtures.popHL, "aggressive"), 2, "POP HL invalidates L=0");
assert.equal(await assemble(fixtures.rotateL, "aggressive"), 2, "rotating L invalidates L=0");
assert.equal(await assemble(fixtures.exchange, "aggressive"), 2, "EX DE,HL blocks L=0 proof");
assert.equal(await assemble(fixtures.exchangeShadow, "aggressive"), 2, "EXX blocks L=0 proof");
assert.equal(await assemble(fixtures.blockTransfer, "aggressive"), 2, "LDI implicitly changes HL");
assert.equal(await assemble(fixtures.blockInput, "aggressive"), 2, "INI implicitly changes HL");
assert.equal(await assemble(fixtures.blockOutput, "aggressive"), 2, "OUTI implicitly changes HL");
assert.equal(await assemble(fixtures.pushPreserves, "aggressive"), 1, "PUSH DE preserves L=0");
assert.equal(await assemble(fixtures.flagsOnlyPreserves, "aggressive"), 1, "flag-only operations preserve L=0");
assert.equal(await assemble(fixtures.callBarrier, "aggressive"), 2, "CALL blocks local value proof");
assert.equal(await assemble(fixtures.labelBarrier, "aggressive"), 2, "labels block local value proof");
assert.equal(await assemble(fixtures.pairProof, "aggressive"), 0, "LD HL,$xx00 proves L=0");

console.log("Aggressive duplicate LD L,0 optimizer test: PASS");
