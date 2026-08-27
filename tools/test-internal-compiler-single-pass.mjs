#!/usr/bin/env node
import assert from "node:assert/strict";
import { compileGeneratedAsm } from "../studio/core/internalCompiler.js";

const asm = ".org 32768\n.db 85,170\n";

const normal = await compileGeneratedAsm(asm, "main.asm", { optimizerEnabled: true });
assert.equal(normal.ok, true, normal.log);
assert.equal(normal.binary.length, 2);
assert.equal(Object.hasOwn(normal, "netOptimizerDelta"), false, "normal compilation must not assemble a baseline");

const audited = await compileGeneratedAsm(asm, "main.asm", {
  optimizerEnabled: true,
  measureOptimizerDelta: true
});
assert.equal(audited.ok, true, audited.log);
assert.deepEqual(audited.binary, normal.binary);
assert.equal(Number.isFinite(audited.netOptimizerDelta), true, "explicit audits retain the optimizer delta");

console.log("internal compiler single-pass default: PASS");
