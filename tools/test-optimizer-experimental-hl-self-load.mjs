#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const experimentalConfig = {
  peephole: true,
  deadCode: false,
  branchShortening: false,
  localValueReuse: true,
  blockCopyBcZeroReuse: true,
  deadCp0Removal: true,
  deadOrARemoval: true,
  aZeroToXor: true,
  flagLivenessPeepholes: true,
  rstVectors: false,
  speculativeValueReuse: true,
  hazardousValueReuse: true,
  inlineRoutines: false,
  stripIxFrames: false
};

async function optimize(body) {
  const result = await assembleAmysCVAssembly({
    "main.asm": `org $9000\n${body}\nret\n`
  }, "main.asm", {
    outputFilename: "experimental-hl-self-load.bin",
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: true,
    optimizerConfig: experimentalConfig
  });
  assert.equal(result.ok, true, result.log || "fixture should assemble");
  return result.optimizedAsm;
}

const indirect = await optimize(`
  ld a,(hl)
  dec a
  ld (hl),a
  ld a,$55
`);
assert.doesNotMatch(indirect, /ld\s+hl\s*,\s*hl/i, "indirect HL must not become an invalid self-load");
assert.match(indirect, /dec\s+\(hl\)/i, "indirect decrement should fold directly onto (HL)");

const symbolic = await optimize(`
Value: db 3
Start:
  ld a,(Value)
  inc a
  ld (Value),a
  ld a,$55
  ld hl,$1234
`);
assert.match(symbolic, /ld\s+hl\s*,\s*Value/i, "symbolic memory still needs its address loaded");
assert.match(symbolic, /inc\s+\(hl\)/i, "symbolic increment should retain the compact fold");

const defensive = await optimize(`
  ld hl,hl
`);
assert.doesNotMatch(defensive, /ld\s+hl\s*,\s*hl/i, "16-bit identity loads must be removed before encoding");

const liveIntoCall = await optimize(`
  ld hl,$FF9B
  ld a,(Sign)
  inc a
  ld (Sign),a
  call ConsumeHL
  ret
Sign: db 0
ConsumeHL:
  ld (Result),hl
  ret
Result: dw 0
`);
assert.doesNotMatch(liveIntoCall, /ld\s+hl\s*,\s*Sign\s*[\r\n]+\s*inc\s+\(hl\)/i,
  "direct-memory folding must not clobber HL when the following call consumes it");
assert.match(liveIntoCall, /ld\s+a\s*,\s*\(Sign\)\s*[\r\n]+\s*inc\s+a\s*[\r\n]+\s*ld\s+\(Sign\)\s*,\s*a/i,
  "live-HL call barrier must retain the original direct-memory update");

const toggleLiveIntoCall = await optimize(`
  ld hl,$FF9B
  ld a,(Sign)
  xor 1
  ld (Sign),a
  call ConsumeHL
  ret
Sign: db 0
ConsumeHL:
  ld (Result),hl
  ret
Result: dw 0
`);
assert.doesNotMatch(toggleLiveIntoCall, /ld\s+hl\s*,\s*Sign\s*[\r\n]+\s*ld\s+a\s*,\s*\(hl\)/i,
  "XOR self-update folding must not clobber HL when the following call consumes it");
assert.match(toggleLiveIntoCall, /ld\s+a\s*,\s*\(Sign\)\s*[\r\n]+\s*xor\s+1\s*[\r\n]+\s*ld\s+\(Sign\)\s*,\s*a/i,
  "live-HL call barrier must retain the original XOR self-update");

const deadBeforeOverwrite = await optimize(`
  ld hl,$FF9B
  ld a,(Sign)
  inc a
  ld (Sign),a
  ld a,$55
  ld hl,$1234
  ld (Result),hl
  ret
Sign: db 0
Result: dw 0
`);
assert.match(deadBeforeOverwrite, /ld\s+hl\s*,\s*Sign\s*[\r\n]+\s*inc\s+\(hl\)/i,
  "direct-memory folding should remain available when HL is overwritten before use");

console.log("Experimental HL self-load guard: PASS (indirect, symbolic, call liveness, overwrite proof, defensive)");
