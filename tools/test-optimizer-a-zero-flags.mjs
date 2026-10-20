#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

async function optimize(body) {
  const source = `org $8000\nStart:\n${body}\n`;
  const profile = getOptimizationProfile("balanced", source);
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: "a-zero-flags.bin",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || "assembly should succeed");
  return result.optimizedAsm;
}

for (const [name, body] of [
  ["conditional branch", "    ld a,0\n    jr z,Done\nDone:\n    ret"],
  ["carry consumer", "    ld a,0\n    adc a,1\n    ret"],
  ["AF save", "    ld a,0\n    push af\n    pop af\n    ret"],
  ["conditional return", "    ld a,0\n    ret nz\n    ret"],
  ["routine return", "    ld a,0\n    ret"],
  ["tail jump", "    ld a,0\n    jp Done\nDone:\n    ret"],
  ["labeled load", "Entry: ld a,0\n    ret"]
]) {
  const asm = await optimize(body);
  assert.match(asm, /\bld\s+a,(?:0|\$00)\b/i, `${name}: observable flags must preserve LD A,0`);
}

for (const [name, body] of [
  ["OR overwrites flags", "    ld a,0\n    ld b,a\n    or a\n    ret"],
  ["label on overwrite", "    ld a,0\nEntry:\n    or a\n    ret"],
  ["CP overwrites flags", "    ld a,0\n    ld b,a\n    cp 1\n    ret"],
  ["XOR overwrites flags", "    ld a,0\n    ld b,a\n    xor b\n    ret"]
]) {
  const asm = await optimize(body);
  assert.doesNotMatch(asm, /\bld\s+a,(?:0|\$00)\b/i, `${name}: proven-dead flags should use XOR A`);
  assert.match(asm, /\bxor\s+a\b/i, `${name}: expected XOR A replacement`);
}

console.log("Optimizer LD A,0 flag-liveness: PASS");
