#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

async function assemble(body, level) {
  const asm = `org $8000\nStart:\n${body}\n`;
  const profile = getOptimizationProfile(level, asm);
  const result = await assembleAmysCVAssembly({ "main.asm": asm }, "main.asm", {
    outputFilename: `push-pop-${level}.bin`, outputMode: "binary", targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled, optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} should assemble`);
  return result.optimizedAsm.toLowerCase();
}

const removable = `push hl\nld d,h\nld e,l\nscf\npop hl\nret`;
const writesPair = `push hl\ninc l\npop hl\nret`;
const writesPairImplicitly = `push hl\nldi\npop hl\nret`;
const readsStack = `push hl\nld de,0\nadd hl,sp\npop hl\nret`;
const callBarrier = `push hl\ncall Helper\npop hl\nret\nHelper:\nret`;
const branchBarrier = `push hl\njr nz,Else\npop hl\nElse:\nret`;
const idempotentHalfWrite = `ld hl,128\nld (Value),hl\npush hl\nld l,128\nld d,h\nld e,l\npop hl\nret\nValue: dw 0`;
const changedHalfWrite = `ld hl,128\npush hl\nld l,129\nld d,h\nld e,l\npop hl\nret`;
const clobberedBeforePush = `ld hl,128\ninc h\npush hl\nld l,128\nld d,h\nld e,l\npop hl\nret`;

assert.match(await assemble(removable, "balanced"), /push hl[\s\S]*pop hl/, "Balanced remains unchanged");
assert.doesNotMatch(await assemble(removable, "aggressive"), /push hl|pop hl/, "Aggressive removes read-only preservation");
assert.doesNotMatch(await assemble(removable, "experimental"), /push hl|pop hl/, "Experimental inherits Aggressive");
assert.match(await assemble(writesPair, "aggressive"), /push hl[\s\S]*pop hl/, "writing L keeps preservation");
assert.match(await assemble(writesPairImplicitly, "aggressive"), /push hl[\s\S]*pop hl/, "LDI keeps preservation");
assert.match(await assemble(readsStack, "aggressive"), /push hl[\s\S]*pop hl/, "SP access keeps preservation");
assert.match(await assemble(callBarrier, "aggressive"), /push hl[\s\S]*pop hl/, "CALL keeps preservation");
assert.match(await assemble(branchBarrier, "aggressive"), /push hl[\s\S]*pop hl/, "branch keeps preservation");
assert.match(await assemble(idempotentHalfWrite, "balanced"), /push hl[\s\S]*pop hl/, "Balanced does not use value-reuse proof");
assert.doesNotMatch(await assemble(idempotentHalfWrite, "aggressive"), /push hl|pop hl/, "Aggressive accepts an idempotent half write");
assert.doesNotMatch(await assemble(idempotentHalfWrite, "experimental"), /push hl|pop hl/, "Experimental inherits idempotent value reuse");
assert.match(await assemble(changedHalfWrite, "aggressive"), /push hl[\s\S]*pop hl/, "a different half value keeps preservation");
assert.match(await assemble(clobberedBeforePush, "aggressive"), /push hl[\s\S]*pop hl/, "an earlier pair clobber prevents value reuse");

console.log("Aggressive redundant PUSH/POP optimizer test: PASS");
