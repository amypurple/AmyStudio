#!/usr/bin/env node
import assert from "node:assert/strict";
import { bitmapAddress, bitmapPixel, bitmapViewportPoint, copyBitmapSelection, ellipsePixels, expandPixels,
  floodBitmap, linePixels, paintBitmapPixel, pasteBitmapSelection, pasteBitmapSelectionSmart,
  rectanglePixels } from "../studio/core/graphicsBitmapTools.js";

assert.equal(bitmapAddress(0, 0), 0);
assert.equal(bitmapAddress(8, 0), 8);
assert.equal(bitmapAddress(0, 8), 256);
assert.equal(bitmapAddress(255, 191), 6143);
assert.equal(bitmapAddress(256, 0), -1);
assert.deepEqual(bitmapViewportPoint(64, 48, 1, 0, 0), { x: 64, y: 48 });
assert.deepEqual(bitmapViewportPoint(64, 48, 2, 4, 3), { x: 64, y: 48 });
assert.deepEqual(bitmapViewportPoint(255, 191, 2, 16, 12), { x: 255, y: 191 });
assert.deepEqual(bitmapViewportPoint(128, 96, 4, 8, 6), { x: 96, y: 72 });
assert.deepEqual(bitmapViewportPoint(248, 184, 8, 28, 21), { x: 255, y: 191 });
const pattern = new Uint8Array(6144);
const color = new Uint8Array(6144).fill(0xF1);
assert.equal(paintBitmapPixel(pattern, color, 0, 0, 6), true);
assert.equal(pattern[0], 0x80);
assert.equal(color[0], 0x61);
assert.equal(bitmapPixel(pattern, color, 0, 0), 6);
assert.equal(bitmapPixel(pattern, color, 1, 0), 1);
assert.deepEqual(linePixels(0, 0, 2, 2), [[0, 0], [1, 1], [2, 2]]);
assert.equal(rectanglePixels(0, 0, 2, 2, false).length, 8);
assert.equal(rectanglePixels(0, 0, 2, 2, true).length, 9);
assert.ok(ellipsePixels(8, 8, 12, 10, false).length > 0);
assert.equal(expandPixels([[8, 8]], 3).length, 9);
assert.ok(rectanglePixels(0, 0, 8, 8, false, 2).length > rectanglePixels(0, 0, 8, 8, false, 1).length);
assert.ok(ellipsePixels(16, 16, 8, 6, false, 3).length > ellipsePixels(16, 16, 8, 6, false, 1).length);
const fillPattern = new Uint8Array(6144);
const fillColor = new Uint8Array(6144).fill(0xF1);
paintBitmapPixel(fillPattern, fillColor, 2, 0, 6);
assert.equal(floodBitmap(fillPattern, fillColor, 0, 0, 3) > 0, true);
assert.equal(bitmapPixel(fillPattern, fillColor, 0, 0), 3);
assert.equal(bitmapPixel(fillPattern, fillColor, 2, 0), 6);
const clip = copyBitmapSelection(pattern, color, { x: 0, y: 0, width: 2, height: 1 });
const targetPattern = new Uint8Array(6144);
const targetColor = new Uint8Array(6144).fill(0xF1);
pasteBitmapSelection(targetPattern, targetColor, 10, 10, clip);
assert.equal(bitmapPixel(targetPattern, targetColor, 10, 10), 6);
assert.equal(bitmapPixel(targetPattern, targetColor, 11, 10), 1);
const smartPattern = new Uint8Array(6144);
const smartColor = new Uint8Array(6144).fill(0x45);
const smartClip = { width: 8, height: 1, pixels: Uint8Array.from([2, 3, 2, 3, 2, 3, 2, 3]) };
const testPalette = Array.from({ length: 16 }, (_, value) => `#${(value * 0x111111).toString(16).padStart(6, "0")}`);
pasteBitmapSelectionSmart(smartPattern, smartColor, 0, 0, smartClip, testPalette);
assert.deepEqual(Array.from({ length: 8 }, (_, x) => bitmapPixel(smartPattern, smartColor, x, 0)), Array.from(smartClip.pixels));
console.log("graphics bitmap tools tests passed");
