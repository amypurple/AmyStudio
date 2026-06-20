import {
  CODEC_CONFIG,
  detectCompressionFormat,
  getCodecInfo,
  getEnabledCodecsInOrder,
  getFileExtension,
  loadCodecs
} from "../vendor/retrocompress-lite/js/codecConfig.js";

let codecCache = null;

function normalizeRuntimeCodecId(codecId) {
  const normalized = String(codecId || "").trim().toLowerCase();
  return normalized === "bitbuster" ? "bitbuster12" : normalized;
}

export function getCompressionCatalog() {
  return getEnabledCodecsInOrder().map((codecId) => ({
    codecId,
    extension: getFileExtension(codecId),
    ...getCodecInfo(codecId)
  }));
}

export async function getCodecs() {
  if (!codecCache) codecCache = loadCodecs();
  return codecCache;
}

export async function compressBytes(codecId, bytes, options = {}) {
  const codecs = await getCodecs();
  const runtimeCodecId = normalizeRuntimeCodecId(codecId);
  const codec = codecs[runtimeCodecId];
  if (!codec) throw new Error(`Codec not available: ${codecId}`);
  return codec.compress(bytes, options);
}

export async function decompressBytes(codecId, bytes, options = {}) {
  const codecs = await getCodecs();
  const runtimeCodecId = normalizeRuntimeCodecId(codecId);
  const codec = codecs[runtimeCodecId];
  if (!codec) throw new Error(`Codec not available: ${codecId}`);
  return codec.decompress(bytes, options);
}

export function detectCodecFromName(fileName) {
  return detectCompressionFormat(fileName);
}

export { CODEC_CONFIG };
