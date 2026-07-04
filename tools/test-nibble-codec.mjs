import assert from 'node:assert/strict';

import { NibbleCodec } from '../studio/vendor/retrocompress-lite/js/codecs/nibble.js';
import { MdkRLECodec } from '../studio/vendor/retrocompress-lite/js/codecs/mdkrle.js';
import { detectCompressionFormat, loadCodecs } from '../studio/vendor/retrocompress-lite/js/codecConfig.js';

const nibble = new NibbleCodec();
const mdkrle = new MdkRLECodec();

const cases = [
  ['empty', bytes([])],
  ['single byte', bytes([0x42])],
  ['raw 128 boundary', range(128, (i) => i)],
  ['raw 200 boundary', range(200, (i) => i)],
  ['raw 255 boundary', range(255, (i) => i)],
  ['raw 256 ascending', range(256, (i) => i)],
  ['raw 513 sawtooth', range(513, (i) => (i * 37 + 11) & 0xff)],
  ['run 128 boundary', range(128, () => 0x77)],
  ['run 200 boundary', range(200, () => 0x77)],
  ['run 255 boundary', range(255, () => 0x77)],
  ['zero fill 6144', range(6144, () => 0)],
  ['alternating f0/0f', range(6144, (i) => (i & 1) ? 0x0f : 0xf0)],
  ['tile row repeat', range(2048, (i) => [0x00, 0x18, 0x3c, 0x7e, 0xff, 0x7e, 0x3c, 0x18][i & 7])],
  ['short local palette refs', range(1024, (i) => [0x11, 0x22, 0x33, 0x44, 0x11, 0x22, 0x55, 0x66][i & 7])],
  ['deterministic random 4096', pseudoRandom(4096, 0x4210)],
];

const rows = [];

// Hand-authored stream:
//   header offset = 5
//   command 03 = raw 3 values
//   bitstream 00100010b = literal, literal, backref distance 2
//   end 81
//   data AA BB
assert.deepEqual(
  [...nibble.decompress(bytes([0x05, 0x00, 0x03, 0x22, 0x81, 0xaa, 0xbb]))],
  [0xaa, 0xbb, 0xaa],
  'hand-authored nibble stream should decode literal/literal/backref'
);

for (const [name, input] of cases) {
  const compressed = nibble.compress(input);
  const dataOffset = compressed[0] | (compressed[1] << 8);
  assert.ok(dataOffset >= 3, `${name}: data offset should point after header/control stream`);
  assert.ok(dataOffset <= compressed.length, `${name}: data offset should stay inside stream`);
  assert.ok(compressed.length <= 0xffff, `${name}: compressed stream exceeds 64KB`);

  const decompressed = nibble.decompress(compressed);
  assert.deepEqual([...decompressed], [...input], `${name}: nibble roundtrip mismatch`);

  const mdkrleCompressed = mdkrle.compress(input);
  assert.deepEqual([...mdkrle.decompress(mdkrleCompressed)], [...input], `${name}: mdkrle reference roundtrip mismatch`);

  rows.push({
    name,
    raw: input.length,
    nibble: compressed.length,
    mdkrle: mdkrleCompressed.length,
    dataOffset
  });
}

assert.equal(detectCompressionFormat('example.nibble'), 'nibble', 'codecConfig should detect .nibble');

const loaded = await loadCodecs();
assert.ok(loaded.nibble, 'loadCodecs should instantiate nibble codec');
assert.deepEqual([...loaded.nibble.decompress(loaded.nibble.compress(cases[4][1]))], [...cases[4][1]], 'loaded nibble codec roundtrip mismatch');

console.log('Nibble codec tests PASS');
console.table(rows);

function bytes(values) {
  return new Uint8Array(values);
}

function range(length, fn) {
  const output = new Uint8Array(length);
  for (let i = 0; i < length; i++) output[i] = fn(i) & 0xff;
  return output;
}

function pseudoRandom(length, seed) {
  let state = seed & 0xffff;
  return range(length, () => {
    state ^= (state << 7) & 0xffff;
    state ^= state >> 9;
    state ^= (state << 8) & 0xffff;
    return (state >> 8) ^ state;
  });
}
