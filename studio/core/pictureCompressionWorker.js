import { compressBytes, decompressBytes } from "./compression.js";
import {
  evaluatePictureCompressionCandidates,
  getPictureZ80RuntimeInfo,
  PICTURE_DECOMPRESSOR_ROUTINE_BYTES
} from "./pictureCompressionReport.js";

const DEFAULT_ROUTINE_BYTES = {
  raw: 0,
  mdkrle: 46,
  nibble: 115,
  zx0: 133,
  zx7: 136,
  dan1: 205,
  dan2: 212,
  dan3: 205,
  pletter: 212,
  bitbuster: 166,
  lzf: 117
};

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
  return Date.now();
}

function sameBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function evaluateGenericComponents({ codec, option = {}, components = [] }) {
  const routineBytes = option.routineBytes ?? PICTURE_DECOMPRESSOR_ROUTINE_BYTES[codec] ?? DEFAULT_ROUTINE_BYTES[codec] ?? 0;
  const rawBytes = components.reduce((sum, component) => sum + (component.bytes?.byteLength || 0), 0);
  const z80Runtime = getPictureZ80RuntimeInfo(codec);
  const encoded = {};
  let dataBytes = 0;
  let compressionMs = 0;
  let decompressionMs = 0;
  for (const component of components) {
    const input = new Uint8Array(component.bytes || []);
    if (codec === "raw") {
      encoded[component.name] = input;
      dataBytes += input.length;
      continue;
    }
    const compressionStarted = nowMs();
    const compressed = new Uint8Array(await compressBytes(codec, input));
    compressionMs += nowMs() - compressionStarted;
    const decompressionStarted = nowMs();
    const roundtrip = new Uint8Array(await decompressBytes(codec, compressed));
    decompressionMs += nowMs() - decompressionStarted;
    if (!sameBytes(roundtrip, input)) throw new Error(`${component.name} roundtrip decompression did not match source bytes.`);
    encoded[component.name] = compressed;
    dataBytes += compressed.length;
  }
  const candidate = {
    codec,
    label: option.label || codec,
    description: option.description || "",
    extension: option.extension ?? (codec === "raw" ? "" : codec),
    routineBytes,
    dataBytes,
    totalFirstUseBytes: dataBytes + routineBytes,
    dataSavingsBytes: rawBytes - dataBytes,
    totalSavingsBytes: rawBytes - dataBytes - routineBytes,
    compressionMs,
    decompressionMs,
    z80RuntimeRank: z80Runtime.rank,
    z80RuntimeLabel: z80Runtime.label,
    z80RuntimeNote: z80Runtime.note,
    verified: true,
    components: encoded
  };
  for (const [name, bytes] of Object.entries(encoded)) candidate[`${name}Bytes`] = bytes.length;
  return candidate;
}

self.onmessage = async (event) => {
  const { id, codec, pattern, color, components, option } = event.data || {};
  try {
    if (Array.isArray(components) && components.length) {
      const candidate = await evaluateGenericComponents({ codec, option, components });
      self.postMessage({ id, candidate });
      return;
    }
    const candidates = await evaluatePictureCompressionCandidates({
      pattern: new Uint8Array(pattern),
      color: new Uint8Array(color)
    }, {
      codecs: [codec],
      compressBytes,
      decompressBytes
    });
    self.postMessage({ id, candidate: candidates[0] || null });
  } catch (error) {
    self.postMessage({
      id,
      candidate: {
        codec,
        label: codec,
        error: error?.message || String(error)
      }
    });
  }
};
