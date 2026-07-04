const CODEC_CATALOG = {
  nibble: { name: "Nibble", extension: ".nibble", category: "rle" },
  mdkrle: { name: "MDK-RLE", extension: ".rle", category: "rle" },
  lzf: { name: "LZF-ZX-Spectrum", extension: ".lzf", category: "lz77" },
  dan3: { name: "DAN3", extension: ".dan3", category: "lz77" },
  dan2: { name: "DAN2", extension: ".dan2", category: "lz77" },
  dan1: { name: "DAN1", extension: ".dan1", category: "lz77" },
  pletter: { name: "Pletter v0.5", extension: ".plet5", category: "lz77" },
  bitbuster12: { name: "BitBuster 1.2", extension: ".pck", category: "lz77" },
  zx7: { name: "ZX7", extension: ".zx7", category: "lz77" },
  zx0: { name: "ZX0", extension: ".zx0", category: "lz77" },
  raw: { name: "RAW", extension: ".raw", category: "raw" }
};

const CODEC_ORDER = ["zx0", "dan3", "dan2", "dan1", "zx7", "pletter", "bitbuster12", "nibble", "lzf", "mdkrle", "raw"];
const CODEC_EXTENSIONS = {
  ".nibble": "nibble",
  ".mdk": "mdkrle",
  ".rle": "mdkrle",
  ".lzf": "lzf",
  ".dan3": "dan3",
  ".dan2": "dan2",
  ".dan1": "dan1",
  ".plet5": "pletter",
  ".pck": "bitbuster12",
  ".zx7": "zx7",
  ".zx0": "zx0",
  ".raw": "raw"
};

let codecCache = null;
let codecConfigModulePromise = null;

function loadCodecConfigModule() {
  if (!codecConfigModulePromise) {
    codecConfigModulePromise = import("../vendor/retrocompress-lite/js/codecConfig.js");
  }
  return codecConfigModulePromise;
}

function normalizeRuntimeCodecId(codecId) {
  const normalized = String(codecId || "").trim().toLowerCase();
  return normalized === "bitbuster" ? "bitbuster12" : normalized;
}

export function getCompressionCatalog() {
  return CODEC_ORDER
    .filter((codecId) => CODEC_CATALOG[codecId])
    .map((codecId) => ({ codecId, ...CODEC_CATALOG[codecId] }));
}

export async function getCodecs() {
  if (!codecCache) {
    codecCache = loadCodecConfigModule().then((module) => module.loadCodecs());
  }
  return codecCache;
}

export async function compressBytes(codecId, bytes, options = {}) {
  const runtimeCodecId = normalizeRuntimeCodecId(codecId);
  if (runtimeCodecId === "raw") return bytes;
  const codecs = await getCodecs();
  const codec = codecs[runtimeCodecId];
  if (!codec) throw new Error(`Codec not available: ${codecId}`);
  return codec.compress(bytes, options);
}

export async function decompressBytes(codecId, bytes, options = {}) {
  const runtimeCodecId = normalizeRuntimeCodecId(codecId);
  if (runtimeCodecId === "raw") return bytes;
  const codecs = await getCodecs();
  const codec = codecs[runtimeCodecId];
  if (!codec) throw new Error(`Codec not available: ${codecId}`);
  return codec.decompress(bytes, options);
}

export function detectCodecFromName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return null;
  return CODEC_EXTENSIONS[lower.slice(dot)] || null;
}

export const CODEC_CONFIG = { formats: CODEC_CATALOG, settings: { defaultCompressionOrder: CODEC_ORDER } };
