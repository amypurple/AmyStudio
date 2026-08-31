#!/usr/bin/env node
import assert from "node:assert/strict";
import { compareTms9918BitmapVisuals, isTms9918CompressionCandidateEligible,
  optimizeTms9918BitmapControlled, optimizeTms9918BitmapLossless,
  renderTms9918ColorIndexes } from "../studio/core/tms9918BitmapOptimization.js";

assert.equal(isTms9918CompressionCandidateEligible({ beforeBytes: 100, afterBytes: 101, roundTripOk: true, visualOk: true }), false);
assert.equal(isTms9918CompressionCandidateEligible({ beforeBytes: 100, afterBytes: 100, roundTripOk: true, visualOk: true }), false);
assert.equal(isTms9918CompressionCandidateEligible({ beforeBytes: 100, afterBytes: 99, roundTripOk: false, visualOk: true }), false);
assert.equal(isTms9918CompressionCandidateEligible({ beforeBytes: 100, afterBytes: 99, roundTripOk: true, visualOk: false }), false);
assert.equal(isTms9918CompressionCandidateEligible({ beforeBytes: 100, afterBytes: 99, roundTripOk: true, visualOk: true }), true);
const pattern = new Uint8Array([0xaa, 0x80, 0x00]);
const color = new Uint8Array([0x11, 0x32, 0x22]);
const lossless = optimizeTms9918BitmapLossless(pattern, color);
assert.equal(lossless.pattern[0], 0);
assert.equal(lossless.pattern[1], 0x80);
assert.equal(lossless.canonicalizedRows, 1);
assert.equal(lossless.visual.identical, true);
assert.deepEqual(renderTms9918ColorIndexes(pattern, color), renderTms9918ColorIndexes(lossless.pattern, lossless.color));
const controlledPattern = new Uint8Array([0x00, 0x80]);
const controlledColor = new Uint8Array([0x22, 0x32]);
const controlled = optimizeTms9918BitmapControlled(controlledPattern, controlledColor, {
  referenceOffsets: [1], maxChangedPixelsPerRow: 1, maxColorDistance: 100, maxChangedPixels: 1
});
assert.equal(controlled.acceptedRows, 1);
assert.equal(controlled.visual.changedPixels, 1);
assert.ok(controlled.visual.maxColorDistance <= 100);
const strict = optimizeTms9918BitmapControlled(controlledPattern, controlledColor, {
  referenceOffsets: [1], maxChangedPixelsPerRow: 1, maxColorDistance: 10, maxChangedPixels: 1
});
assert.equal(strict.acceptedRows, 0);
assert.equal(strict.visual.identical, true);
const mismatch = compareTms9918BitmapVisuals(new Uint8Array([0]), new Uint8Array([0x22]), new Uint8Array([0]), new Uint8Array([0x33]));
assert.equal(mismatch.changedPixels, 8);
assert.equal(mismatch.identical, false);
console.log("TMS9918 bitmap optimization: PASS");
