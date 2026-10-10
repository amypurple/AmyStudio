import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compressBytes, decompressBytes } from "../studio/core/compression.js";
import { PICTURE_DECOMPRESSOR_ROUTINE_BYTES } from "../studio/core/pictureCompressionReport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "examples/vendor/old-devkit/10years/cake-picture.inc");
const CODECS = ["raw", "mdkrle", "nibble", "zx0", "msc1", "zx7", "dan2", "dan1", "dan3", "pletter", "bitbuster", "lzf"];
const RAW_BYTES = 6144 * 2;

function parseDbHexBytes(text) {
  return Uint8Array.from([...text.matchAll(/\$([0-9a-fA-F]{2})/g)].map((match) => parseInt(match[1], 16)));
}

function decodeLegacyMdkRleStream(data, startOffset) {
  const out = [];
  let offset = startOffset;
  while (offset < data.length) {
    const control = data[offset++];
    if (control === 0xff) {
      return { bytes: Uint8Array.from(out), nextOffset: offset };
    }
    if (control & 0x80) {
      const count = (control & 0x7f) + 1;
      const value = data[offset++];
      for (let i = 0; i < count; i += 1) out.push(value);
    } else {
      const count = control + 1;
      for (let i = 0; i < count; i += 1) out.push(data[offset++]);
    }
  }
  throw new Error("Legacy RLE stream is missing its $FF terminator.");
}

const sourceBytes = parseDbHexBytes(fs.readFileSync(sourcePath, "utf8"));
const color = decodeLegacyMdkRleStream(sourceBytes, 0);
const pattern = decodeLegacyMdkRleStream(sourceBytes, color.nextOffset);
if (color.bytes.length !== 6144 || pattern.bytes.length !== 6144) {
  throw new Error(`Expected 6144-byte color/pattern tables, got ${color.bytes.length}/${pattern.bytes.length}.`);
}

function nowMs() {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function timeAsync(fn) {
  const start = nowMs();
  const value = await fn();
  return { value, ms: nowMs() - start };
}

async function benchmarkCodec(codec) {
  if (codec === "raw") {
    return {
      codec,
      patternBytes: pattern.bytes.length,
      colorBytes: color.bytes.length,
      dataBytes: RAW_BYTES,
      routineBytes: 0,
      totalFirstUseBytes: RAW_BYTES,
      totalSavingsBytes: 0,
      compressionMs: 0,
      decompressionMs: 0,
      decompressRepeats: 0
    };
  }

  const patternCompressed = await timeAsync(() => compressBytes(codec, pattern.bytes));
  const colorCompressed = await timeAsync(() => compressBytes(codec, color.bytes));
  const compressedPattern = new Uint8Array(patternCompressed.value);
  const compressedColor = new Uint8Array(colorCompressed.value);

  const repeats = 20;
  const decompStart = nowMs();
  for (let i = 0; i < repeats; i += 1) {
    const decodedPattern = new Uint8Array(await decompressBytes(codec, compressedPattern));
    const decodedColor = new Uint8Array(await decompressBytes(codec, compressedColor));
    if (!sameBytes(decodedPattern, pattern.bytes) || !sameBytes(decodedColor, color.bytes)) {
      throw new Error(`${codec} round-trip mismatch.`);
    }
  }
  const decompressionMs = (nowMs() - decompStart) / repeats;
  const dataBytes = compressedPattern.length + compressedColor.length;
  const routineBytes = PICTURE_DECOMPRESSOR_ROUTINE_BYTES[codec] ?? 0;
  return {
    codec,
    patternBytes: compressedPattern.length,
    colorBytes: compressedColor.length,
    dataBytes,
    routineBytes,
    totalFirstUseBytes: dataBytes + routineBytes,
    totalSavingsBytes: RAW_BYTES - dataBytes - routineBytes,
    compressionMs: patternCompressed.ms + colorCompressed.ms,
    decompressionMs,
    decompressRepeats: repeats
  };
}

const candidates = [];
for (const codec of CODECS) {
  try {
    candidates.push(await benchmarkCodec(codec));
  } catch (error) {
    candidates.push({ codec, error: error?.message || String(error) });
  }
}

function usableCompressed() {
  return candidates.filter((candidate) => !candidate.error && candidate.codec !== "raw");
}

function qualityPriceScore(candidate) {
  const compressionGain = RAW_BYTES / Math.max(1, candidate.totalFirstUseBytes);
  return compressionGain / Math.max(0.1, Math.sqrt(candidate.decompressionMs || 0.1));
}

const quickEvaluation = usableCompressed()
  .sort((a, b) => a.compressionMs - b.compressionMs || a.totalFirstUseBytes - b.totalFirstUseBytes)
  .slice(0, 4);
const decompressionOrder = usableCompressed()
  .sort((a, b) => a.decompressionMs - b.decompressionMs || a.totalFirstUseBytes - b.totalFirstUseBytes);
const qualityPriceOrder = usableCompressed()
  .map((candidate) => ({ ...candidate, qualityPriceScore: qualityPriceScore(candidate) }))
  .sort((a, b) => b.qualityPriceScore - a.qualityPriceScore || a.totalFirstUseBytes - b.totalFirstUseBytes);

console.log("Cake picture compression benchmark");
console.log("codec,pattern,color,data,routine,total,savings,compress_ms,decompress_ms,quality_price,error");
for (const candidate of candidates) {
  if (candidate.error) {
    console.log(`${candidate.codec},,,,,,,,,,${JSON.stringify(candidate.error)}`);
    continue;
  }
  console.log([
    candidate.codec,
    candidate.patternBytes,
    candidate.colorBytes,
    candidate.dataBytes,
    candidate.routineBytes,
    candidate.totalFirstUseBytes,
    candidate.totalSavingsBytes,
    candidate.compressionMs.toFixed(3),
    candidate.decompressionMs.toFixed(3),
    qualityPriceScore(candidate).toFixed(4),
    ""
  ].join(","));
}

console.log("");
console.log(`Quick evaluation codecs, max 4 by compression time: ${quickEvaluation.map((candidate) => candidate.codec).join(", ")}`);
console.log("Browser codec timings below are Studio responsiveness measurements, not Z80 runtime measurements.");
console.log(`Browser decompression timing order: ${decompressionOrder.map((candidate) => `${candidate.codec}(${candidate.decompressionMs.toFixed(3)}ms)`).join(" > ")}`);
console.log(`Browser size/time heuristic: ${qualityPriceOrder.map((candidate) => `${candidate.codec}(${candidate.qualityPriceScore.toFixed(4)})`).join(" > ")}`);

process.exit(0);
