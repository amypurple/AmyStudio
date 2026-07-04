import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { compressBytes, decompressBytes, getCompressionCatalog } from '../studio/core/compression.js';

const sourceFiles = [
  { name: 'warrior.pattern', path: 'assets/compressed/warrior/pattern.zx0' },
  { name: 'warrior.color', path: 'assets/compressed/warrior/color.zx0' },
];

const codecs = getCompressionCatalog().filter((entry) => entry.codecId !== 'raw');
const rows = [];

for (const file of sourceFiles) {
  const zx0Bytes = new Uint8Array(await readFile(file.path));
  const raw = new Uint8Array(await decompressBytes('zx0', zx0Bytes));
  assert.equal(raw.length, 6144, `${file.name}: expected 6144 raw bytes after ZX0 decode`);

  for (const codec of codecs) {
    const started = Date.now();
    const compressed = new Uint8Array(await compressBytes(codec.codecId, raw));
    assert.ok(compressed.length <= 0xffff, `${file.name}/${codec.codecId}: compressed stream exceeds 64KB`);
    const roundtrip = new Uint8Array(await decompressBytes(codec.codecId, compressed));
    assert.equal(roundtrip.length, raw.length, `${file.name}/${codec.codecId}: decompressed length mismatch`);
    for (let i = 0; i < raw.length; i++) {
      if (roundtrip[i] !== raw[i]) {
        throw new Error(`${file.name}/${codec.codecId}: byte mismatch at ${i}, got ${roundtrip[i]}, expected ${raw[i]}`);
      }
    }
    rows.push({
      table: file.name,
      codec: codec.codecId,
      raw: raw.length,
      compressed: compressed.length,
      saved: raw.length - compressed.length,
      ms: Date.now() - started,
    });
  }
}

const totals = Object.values(rows.reduce((acc, row) => {
  const item = acc[row.codec] ||= {
    codec: row.codec,
    raw: 0,
    compressed: 0,
    saved: 0,
    ms: 0,
  };
  item.raw += row.raw;
  item.compressed += row.compressed;
  item.saved += row.saved;
  item.ms += row.ms;
  return acc;
}, {})).sort((a, b) => a.ms - b.ms || a.compressed - b.compressed);

console.log('Warrior codec roundtrip tests PASS');
console.table(rows);
console.log('Aggregated by codec, sorted by compression time:');
console.table(totals);
