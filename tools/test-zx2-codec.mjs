import assert from "node:assert/strict";

import { ZX2Codec } from "../studio/vendor/retrocompress-lite/js/codecs/zx2.js";

const codec = new ZX2Codec();
const fixtures = [
  new Uint8Array(),
  Uint8Array.of(42),
  Uint8Array.from({ length: 1024 }, (_, index) => index & 0xff),
  Uint8Array.from({ length: 4096 }, (_, index) => (index >> 3) & 7),
];

for (const fixture of fixtures) {
  const packed = await codec.compress(fixture);
  assert.deepEqual(await codec.decompress(packed), fixture);
  if (packed.length > 1) {
    await assert.rejects(codec.decompress(packed.subarray(0, packed.length - 1)), /Truncated ZX2 stream/);
    await assert.rejects(codec.decompress(Uint8Array.from([...packed, 0])), /Data follows ZX2 end marker/);
  }
}

await assert.rejects(codec.decompress(Uint8Array.of(0x40, 0x11, 0xfd)), /Invalid ZX2 offset/);

console.log("ZX2 codec round-trip and malformed-stream tests PASS");
