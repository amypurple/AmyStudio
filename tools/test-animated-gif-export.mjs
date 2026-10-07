#!/usr/bin/env node
import assert from "node:assert/strict";
import { AnimatedGifEncoder, rgb565ToRgb332 } from "../studio/core/animatedGif.js";

const first = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
const second = Uint8Array.from([7, 6, 5, 4, 3, 2, 1, 0]);
const gif = new AnimatedGifEncoder({ width: 4, height: 2, fps: 15 });
gif.addFrame(first);
gif.addFrame(second);
const blob = gif.finish();
const bytes = new Uint8Array(await blob.arrayBuffer());

assert.equal(blob.type, "image/gif");
assert.equal(new TextDecoder().decode(bytes.subarray(0, 6)), "GIF89a");
assert.deepEqual(readFrames(bytes), [first, second]);
assert.deepEqual([...rgb565ToRgb332(Uint16Array.from([0x0000, 0xFFFF, 0xF800, 0x07E0, 0x001F]))], [0, 255, 224, 28, 3]);
const wideCodes = Uint8Array.from({ length: 64 * 64 }, (_, index) => (index * 37 + (index >>> 4)) & 0xFF);
const boundaryGif = new AnimatedGifEncoder({ width: 64, height: 64, fps: 20 });
boundaryGif.addFrame(wideCodes);
assert.deepEqual(readFrames(new Uint8Array(await boundaryGif.finish().arrayBuffer())), [wideCodes]);
console.log(`Animated GIF export PASS (${bytes.length} bytes, dictionary-width boundaries decoded)`);

function readFrames(data) {
  let offset = 13 + 256 * 3;
  const frames = [];
  while (offset < data.length) {
    const marker = data[offset++];
    if (marker === 0x3B) break;
    if (marker === 0x21) {
      offset += 1;
      const fixedSize = data[offset++];
      offset += fixedSize;
      while (data[offset]) offset += 1 + data[offset];
      offset += 1;
      continue;
    }
    assert.equal(marker, 0x2C, `unexpected GIF marker $${marker.toString(16)}`);
    offset += 8;
    const packed = data[offset++];
    if (packed & 0x80) offset += 3 * (1 << ((packed & 7) + 1));
    const minimumCodeSize = data[offset++];
    const blocks = [];
    while (data[offset]) {
      const size = data[offset++];
      blocks.push(...data.subarray(offset, offset + size));
      offset += size;
    }
    offset += 1;
    frames.push(Uint8Array.from(decodeLzw(Uint8Array.from(blocks), minimumCodeSize)));
  }
  return frames;
}

function decodeLzw(data, minimumCodeSize) {
  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  let dictionary;
  let codeSize;
  let nextCode;
  let bitOffset = 0;
  let previous = null;
  const output = [];
  const reset = () => {
    dictionary = Array.from({ length: clearCode }, (_, value) => [value]);
    dictionary[clearCode] = null;
    dictionary[endCode] = null;
    nextCode = endCode + 1;
    codeSize = minimumCodeSize + 1;
    previous = null;
  };
  const readCode = () => {
    let value = 0;
    for (let bit = 0; bit < codeSize; ++bit) {
      const position = bitOffset + bit;
      value |= ((data[position >>> 3] >>> (position & 7)) & 1) << bit;
    }
    bitOffset += codeSize;
    return value;
  };
  reset();
  while (bitOffset + codeSize <= data.length * 8) {
    const code = readCode();
    if (code === clearCode) { reset(); continue; }
    if (code === endCode) break;
    const entry = dictionary[code] || [...previous, previous[0]];
    output.push(...entry);
    if (previous && nextCode < 4096) {
      dictionary[nextCode++] = [...previous, entry[0]];
      if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
    }
    previous = entry;
  }
  return output;
}
