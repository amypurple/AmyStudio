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
`);
assert.doesNotMatch(indirect, /ld\s+hl\s*,\s*hl/i, "indirect HL must not become an invalid self-load");
assert.match(indirect, /dec\s+\(hl\)/i, "indirect decrement should fold directly onto (HL)");

const symbolic = await optimize(`
Value: db 3
Start:
  ld a,(Value)
  inc a
  ld (Value),a
`);
assert.match(symbolic, /ld\s+hl\s*,\s*Value/i, "symbolic memory still needs its address loaded");
assert.match(symbolic, /inc\s+\(hl\)/i, "symbolic increment should retain the compact fold");

const defensive = await optimize(`
  ld hl,hl
`);
assert.doesNotMatch(defensive, /ld\s+hl\s*,\s*hl/i, "16-bit identity loads must be removed before encoding");

console.log("Experimental HL self-load guard: PASS (indirect, symbolic, defensive)");
