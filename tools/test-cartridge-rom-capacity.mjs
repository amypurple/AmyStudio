#!/usr/bin/env node
import assert from "node:assert/strict";
import { compileGeneratedAsm } from "../studio/core/internalCompiler.js";

async function assemble(byteCount, amyTarget = "colecovision-cartridge") {
  return compileGeneratedAsm(`.org 32768\n.ds ${byteCount},0`, "capacity.asm", {
    optimizerEnabled: false,
    amyTarget
  });
}

const exact = await assemble(32768);
assert.equal(exact.ok, true, exact.log);
assert.equal(exact.binary.length, 32768);

const overflow = await assemble(32769);
assert.equal(overflow.ok, false, "a 32 KiB cartridge overflow must fail closed");
assert.match(overflow.log, /exceeds its 32 KiB mapped ROM window/i);
assert.match(overflow.log, /32769 \/ 32768 bytes/);

const raw = await assemble(32769, "");
assert.equal(raw.ok, true, "raw assembly must not inherit cartridge packaging limits");

console.log("ColecoVision cartridge capacity: PASS (exact fit accepted, overflow rejected, raw assembly unchanged)");
