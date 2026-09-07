import assert from "node:assert/strict";
import { MegaLZCodec } from "../studio/vendor/retrocompress-lite/js/codecs/megalz.js";

const codec = new MegaLZCodec();

async function roundTrip(name, input) {
  const source = Uint8Array.from(input);
  const packed = await codec.compress(source);
  const restored = await codec.decompress(packed);
  assert.deepEqual(restored, source, `${name}: round trip`);
  return packed;
}

// Streams produced by MegaLZ.exe v4.89. These independently verify decoding.
assert.deepEqual(
  await codec.decompress(Uint8Array.of(0x41, 0x46, 0xff, 0x01)),
  Uint8Array.of(0x41, 0x41, 0x41, 0x41),
  "official repeated-byte fixture"
);
assert.deepEqual(
  await codec.decompress(Uint8Array.of(0x41, 0xb0, 0x42, 0x4c, 0x30, 0xfe, 0x08)),
  Uint8Array.from({ length: 80 }, (_, index) => 0x41 + (index & 1)),
  "official overlapping-match fixture"
);

for (const length of [1, 2, 3, 4, 5, 6, 9, 10, 17, 18, 33, 34, 65, 66, 129, 130, 255, 256, 300]) {
  await roundTrip(`run-${length}`, new Uint8Array(length).fill(0x5a));
}

await roundTrip("near-offset-256", [
  ...Uint8Array.from({ length: 256 }, (_, index) => index),
  ...Uint8Array.from({ length: 64 }, (_, index) => index)
]);
await roundTrip("far-offset-4352", [
  ...Uint8Array.from({ length: 4352 }, (_, index) => (index * 73 + (index >> 4)) & 0xff),
  ...Uint8Array.from({ length: 96 }, (_, index) => (index * 73 + (index >> 4)) & 0xff)
]);

let seed = 0x4d4c5a34;
const randomByte = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed >>> 24;
};
for (let sample = 0; sample < 64; sample += 1) {
  const length = 1 + (randomByte() << 2) + (sample * 7);
  await roundTrip(`random-${sample}`, Uint8Array.from({ length }, randomByte));
}

await assert.rejects(
  codec.decompress(Uint8Array.of(0x41, 0x80)),
  /Truncated MegaLZ stream/,
  "truncated streams fail closed"
);

console.log("MegaLZ codec tests passed");
