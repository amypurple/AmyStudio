#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  compareTms9918Mode2Tables,
  repackTms9918Mode2,
  swapTms9918ColorNibbles,
  TMS9918_MODE2_REPACK_STRATEGIES,
  tms9918UniformRowColor
} from "../studio/core/tms9918Mode2Repacker.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

assert.equal(swapTms9918ColorNibbles(0x3e), 0xe3);
assert.equal(tms9918UniformRowColor(0, 0xa3), 3);
assert.equal(tms9918UniformRowColor(0xff, 0xa3), 10);
assert.equal(tms9918UniformRowColor(0x55, 0x77), 7);
assert.equal(tms9918UniformRowColor(0x55, 0xa3), -1);

const pattern = new Uint8Array(64);
const color = new Uint8Array(64);
for (let index = 0; index < pattern.length; index += 1) {
  pattern[index] = (index * 37 + 11) & 0xff;
  color[index] = index % 5 === 0 ? 0x66 : (((index + 2) & 15) << 4) | ((index + 9) & 15);
}

for (const strategy of TMS9918_MODE2_REPACK_STRATEGIES) {
  const first = repackTms9918Mode2(pattern, color, strategy.id);
  const second = repackTms9918Mode2(pattern, color, strategy.id);
  assert.equal(first.visual.identical, true, `${strategy.id} must preserve every displayed pixel`);
  assert.deepEqual(first.pattern, second.pattern, `${strategy.id} must be deterministic`);
  assert.deepEqual(first.color, second.color, `${strategy.id} must be deterministic`);
  assert.equal(compareTms9918Mode2Tables(pattern, color, first.pattern, first.color).changedPixels, 0);
}

const inverted = repackTms9918Mode2(
  new Uint8Array([0xf0]),
  new Uint8Array([0x2d]),
  "bit7"
);
assert.equal(inverted.pattern[0], 0x0f);
assert.equal(inverted.color[0], 0xd2);

const partialTilePattern = new Uint8Array([0x00, 0xff, 0x81, 0x42, 0x24, 0x18, 0x55, 0xaa, 0x7e, 0x18]);
const partialTileColor = new Uint8Array(10).fill(0xf1);
const horizontal = repackTms9918Mode2(partialTilePattern, partialTileColor, "dp-h");
assert.equal(horizontal.pattern.length, 10, "partial final tiles must be supported");
assert.equal(horizontal.visual.identical, true);

console.log(`TMS9918 Mode 2 repacker: PASS (${TMS9918_MODE2_REPACK_STRATEGIES.length} lossless strategies)`);

const uiSource = readFileSync(resolve(import.meta.dirname, "../studio/core/mode2RepackerUi.js"), "utf8");
const indexSource = readFileSync(resolve(import.meta.dirname, "../studio/index.html"), "utf8");
assert.match(uiSource, /changed pixels/);
assert.match(uiSource, /compressBytes\(decoded\.patternCodec/);
assert.match(indexSource, /id="btnMode2Repacker"/);
