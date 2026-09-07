import assert from "node:assert/strict";

import { DAN1Codec } from "../studio/vendor/retrocompress-lite/js/codecs/dan1.js";

const codec = new DAN1Codec();
const cases = [
  Uint8Array.of(0),
  Uint8Array.from({ length: 6144 }, (_, index) => (index * 73 + (index >> 3)) & 0xff),
  Uint8Array.from({ length: 6144 }, (_, index) => index % 97 < 48 ? 0xff : index & 0xff)
];

for (const input of cases) {
  const packed = await codec.compress(input);
  const unpacked = await codec.decompress(packed);
  assert.deepEqual(unpacked, input, `DAN1 round-trip failed for ${input.length} bytes`);
}

// Six literal flags align the 18-bit special/end marker exactly to a control-byte
// boundary. Bytes after the marker must never be interpreted as another token.
const boundaryEnd = Uint8Array.of(
  0x10, 0xFC, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x00, 0x00,
  0xFF, 0xAA, 0x55
);
assert.deepEqual(await codec.decompress(boundaryEnd), Uint8Array.of(0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16));

console.log("DAN1 codec tests passed");
