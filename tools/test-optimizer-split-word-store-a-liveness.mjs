#!/usr/bin/env node
import assert from "node:assert/strict";

import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const profile = getOptimizationProfile("experimental", "");

async function optimize(body) {
  const result = await assembleAmysCVAssembly({ "main.asm": body }, "main.asm", {
    outputFilename: "split-word-store.bin",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: true,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || "fixture should assemble");
  return result.optimizedAsm;
}

const liveA = await optimize(`
    org $9000
Start:
    ld hl,(Source)
    ld a,l
    ld (Scratch+0),a
    ld a,h
    ld (Scratch+1),a
    add a,a
    ld (Result),a
    halt
Source: dw $1234
Scratch: dw 0
Result: db 0
`);
assert.match(liveA, /ld \(Scratch\),hl\s+ld a,h\s+add a,a/i, `live A must retain the original high byte:\n${liveA}`);

const deadA = await optimize(`
    org $9000
Start:
    ld hl,(Source)
    ld a,l
    ld (Scratch+0),a
    ld a,h
    ld (Scratch+1),a
    ld a,$55
    ld (Result),a
    halt
Source: dw $1234
Scratch: dw 0
Result: db 0
`);
assert.match(deadA, /ld \(Scratch\),hl\s+ld a,(?:\$55|85)/i, `dead A should keep the compact form:\n${deadA}`);
assert.doesNotMatch(deadA, /ld \(Scratch\),hl\s+ld a,h/i, `dead A must not be needlessly restored:\n${deadA}`);

console.log("Experimental split-word store A-liveness: PASS");
