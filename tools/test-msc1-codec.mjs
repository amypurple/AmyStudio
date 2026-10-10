import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MSC1Codec } from "../studio/vendor/retrocompress-lite/js/codecs/msc1.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codec = new MSC1Codec();
const cases = [
  new Uint8Array(),
  new Uint8Array([0]),
  new Uint8Array([1, 2, 3, 4]),
  new Uint8Array(Array.from({ length: 4096 }, (_, i) => i & 0xff)),
  new Uint8Array(Array.from({ length: 1024 }, (_, i) => [1, 2, 3, 4][i & 3])),
];

for (let length = 1; length <= 1024; length += 17) {
  cases.push(new Uint8Array(crypto.randomBytes(length)));
}

const manifestPath = path.join(root, "competition/benchmarks/compression/image-bank/manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const picture of manifest.rows) {
    cases.push(new Uint8Array(fs.readFileSync(path.join(root, picture.pattern))));
    cases.push(new Uint8Array(fs.readFileSync(path.join(root, picture.color))));
  }
}

for (const input of cases) {
  const compressed = codec.compress(input);
  assert.deepEqual(codec.decompress(compressed), input);
}

assert.throws(() => codec.decompress(new Uint8Array([4, 1, 2])), /truncated/);
assert.throws(() => codec.decompress(new Uint8Array([0x84, 0x00, 0x00])), /invalid offset/);
assert.throws(() => codec.decompress(new Uint8Array([1, 7])), /no end marker/);

console.log(`MSC1 round-trip PASS (${cases.length} inputs${fs.existsSync(manifestPath) ? ", including the complete image corpus" : ""})`);
