#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { parseArgs } from "./amyz80.mjs";

const fixture = resolve(import.meta.dirname, "fixtures/tasm-matthew-ttst");
const source = readFileSync(resolve(fixture, "ttst2.z80"), "utf8");
const expected = readFileSync(resolve(fixture, "TTST2.ROM"));
const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "ttst2.rom",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: false,
  tasmCompatibility: true,
});

assert.equal(result.ok, true, result.log);
assert.deepEqual(Buffer.from(result.binary), expected, "TASM fixture must remain byte-identical");
assert.equal(parseArgs(["game.z80", "--tasm"]).dialect, "tasm");
assert.equal(parseArgs(["game.asm", "--gasm80"]).dialect, "gasm80");
assert.throws(() => parseArgs(["game.asm", "--tasm", "--gasm80"]), /mutually exclusive/);

const hash = createHash("sha256").update(expected).digest("hex");
console.log(`TASM compatibility regression passed: ${expected.length} bytes, SHA-256 ${hash}.`);
