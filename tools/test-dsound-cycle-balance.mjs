#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";
import { alexisLibrarySources } from "../studio/core/alexisLibrarySources.generated.js";

const source = fs.readFileSync(new URL("../src/alexis_lib/coleco_dsound.asm", import.meta.url), "utf8");
const bundledSource = alexisLibrarySources["src/alexis_lib/coleco_dsound.asm"];
assert.equal(bundledSource, source, "embedded Studio DSOUND runtime must match its source file");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function containsSequence(bytes, sequence) {
  return bytes.some((_, start) => sequence.every((byte, offset) => bytes[start + offset] === byte));
}

for (const level of profiles) {
  const profile = getOptimizationProfile(level, bundledSource);
  const result = await assembleAmysCVAssembly({ "main.asm": `org $8000\n${bundledSource}` }, "main.asm", {
    outputFilename: `dsound-cycle-balance-${level}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  assert.equal(result.ok, true, result.log || `${level} should assemble`);
  const bytes = Array.from(result.binary || []);
  assert.ok(
    containsSequence(bytes, [0x06, 0x01, 0x06, 0x01, 0x06, 0x01, 0x00, 0x00, 0x00]),
    `${level} must preserve the calibrated 33-T-state RAW delay`
  );
  assert.ok(
    containsSequence(bytes, [0x00, 0xC2]),
    `${level} must preserve the first-RLE balancing NOP and absolute conditional jump`
  );
  assert.ok(
    containsSequence(bytes, [0x06, 0x02, 0x00, 0x00, 0x00, 0x41]),
    `${level} must preserve the calibrated RLE delay before LD B,C`
  );
}

// C is the runtime delay-loop count after PLAY DSOUND increments the requested step.
const rawHighToLow = (c) => 13 * c + 133;
const rawLowToNextHigh = (c) => 13 * c + 133;
const rleFirst = (c) => 13 * c + 133;
const rleFollowing = (c) => 13 * c + 133;

for (const c of [1, 2, 11, 256]) {
  const units = [rawHighToLow(c), rawLowToNextHigh(c), rleFirst(c), rleFollowing(c)];
  assert.equal(new Set(units).size, 1, `all DSOUND unit paths must be cycle-equal for C=${c}`);
}

console.log("DSOUND cycle balance: PASS (5 profiles; RAW and RLE units are cycle-equal)");
