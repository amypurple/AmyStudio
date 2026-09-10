import assert from "node:assert/strict";
import {
  Exomizer2Codec,
  __exomizer2DiagnosticEncode,
  __exomizer2FindMatchCandidates
} from "../studio/vendor/retrocompress-lite/js/codecs/exomizer2.js";

const codec = new Exomizer2Codec();

// Fixtures produced by the real `exomizer raw -P0` v3.1.0 tool. These
// independently verify decoding without depending on the gitignored .tmp
// vendored binary being present.
const SINGLE_FIXTURE = Uint8Array.of(0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x20, 0x99, 0x00, 0x80);

assert.deepEqual(
  await codec.decompress(SINGLE_FIXTURE),
  Uint8Array.of(0x99),
  "official single-byte fixture"
);

assert.deepEqual(
  await codec.decompress(Uint8Array.of(
    0x01, 0x08, 0x48, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09,
    0xaa, 0x03, 0x11, 0x22, 0x2a, 0x00, 0x80
  )),
  Uint8Array.from(Array.from({ length: 40 }, (_, i) => [0xaa, 0xaa, 0xaa, 0xaa, 0x11, 0x22][i % 6])),
  "official repeating-run fixture (exercises match/copy path)"
);

// This fixture is a genuinely incompressible 64-byte span. Real Exomizer 2
// falls back to a "literal data block" (gamma code 17: 16-bit length + raw
// bytes) for spans like this, even though the "-c" raw variant never emits
// the single-literal-byte signal bit. An earlier draft of this decoder
// (transliterated from the Z80 asm's `iyl`/flag tricks instead of the
// portable C reference) mistook gamma===17 for the end-of-data marker
// (gamma===16) and truncated output early on real corpus pictures that hit
// this path (2 of 36 sampled Pattern tables did).
const incompressibleRaw = Uint8Array.from(Array.from({ length: 64 }, (_, i) => (i * 173 + 7) & 0xff));
assert.deepEqual(
  await codec.decompress(Uint8Array.of(
    0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x20, 0x80, 0x00, 0x07, 0xb4, 0x61, 0x0e, 0xbb, 0x68, 0x15, 0xc2, 0x6f, 0x1c, 0xc9,
    0x76, 0x23, 0xd0, 0x7d, 0x2a, 0xd7, 0x84, 0x31, 0xde, 0x8b, 0x38, 0xe5, 0x92, 0x3f,
    0xec, 0x99, 0x46, 0xf3, 0xa0, 0x4d, 0xfa, 0xa7, 0x54, 0x01, 0xae, 0x5b, 0x08, 0xb5,
    0x62, 0x0f, 0xbc, 0x69, 0x16, 0xc3, 0x70, 0x1d, 0xca, 0x77, 0x24, 0xd1, 0x7e, 0x2b,
    0xd8, 0x85, 0x32, 0xdf, 0x8c, 0x39, 0xe6, 0x93, 0x40, 0xed, 0x9a, 0x00, 0x80
  )),
  incompressibleRaw,
  "official literal-data-block fixture (gamma===17 path)"
);

// Malformed-input safety: truncated/corrupt streams must fail with a plain
// Error, never hang or throw something unexpected.
for (const cutAt of [0, 1, 5, 10, 20, 29]) {
  await assert.rejects(
    codec.decompress(SINGLE_FIXTURE.subarray(0, cutAt)),
    /Truncated Exomizer 2 stream/,
    `truncated at ${cutAt} must fail cleanly`
  );
}

for (const [label, input] of [
  ["empty", Uint8Array.of()],
  ["short literals", Uint8Array.of(1, 2, 3)],
  ["long run", new Uint8Array(6144).fill(0xaa)],
  ["incrementing", Uint8Array.from(Array.from({ length: 1024 }, (_, index) => index & 0xff))],
  ["mixed", Uint8Array.from(Array.from({ length: 4096 }, (_, index) => index % 97 < 80 ? index & 7 : (index * 73) & 0xff))]
]) {
  const packed = await codec.compress(input);
  assert.deepEqual(await codec.decompress(packed), input, `${label} encoder round trip`);
}

// The optimal parse must be able to choose literal blocks directly rather
// than letting accidental one-byte matches fragment incompressible input.
let randomState = 0x6d2b79f5;
const incompressibleTable = Uint8Array.from({ length: 6144 }, () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return randomState & 0xff;
});
const literalBlockDiagnostic = __exomizer2DiagnosticEncode(incompressibleTable);
assert.equal(literalBlockDiagnostic.usedLiteralBlocks, true, "optimal parse uses literal blocks");
assert.ok(literalBlockDiagnostic.literalBlockCount > 0, "literal block count is reported");
assert.ok(literalBlockDiagnostic.emittedBytes <= 6200, "incompressible fallback stays near raw size");

// Length-1/2 matches have dedicated tables and must be found across the
// complete 16-bit offset range, not only in the nearest 32 bytes.
const distantPair = new Uint8Array(300);
for (let index = 0; index < distantPair.length; index += 1) distantPair[index] = (index * 73 + index * index * 19) & 0xff;
distantPair[255] = distantPair[0];
distantPair[256] = distantPair[1];
const distantCandidates = __exomizer2FindMatchCandidates(distantPair)[255];
assert.ok(
  distantCandidates.some((candidate) => candidate.length === 2 && candidate.offset === 255),
  "indexed short-match search covers offsets beyond 32 bytes"
);

console.log("exomizer2 codec: all checks passed");
