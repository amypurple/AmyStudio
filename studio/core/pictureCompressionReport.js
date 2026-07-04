const PICTURE_CODEC_OPTIONS = [
  { codec: "raw", label: "Raw", description: "No decompressor, largest data, simplest runtime." },
  { codec: "mdkrle", label: "RLE", description: "Tiny 46-byte routine; often best total cost for simple pictures." },
  { codec: "nibble", label: "Nibble", description: "DAN0nibble-derived fast RLE/data-stream codec; excellent quick-evaluation candidate." },
  { codec: "zx0", label: "ZX0", description: "Strong compression with a compact 133-byte routine." },
  { codec: "zx7", label: "ZX7", description: "Older LZ compressor, useful as a comparison point." },
  { codec: "dan2", label: "DAN2", description: "Daniel's LZ codec; good candidate for Coleco bitmap data." },
  { codec: "dan1", label: "DAN1", description: "Legacy DAN family baseline." },
  { codec: "dan3", label: "DAN3", description: "DAN family variant, sometimes wins on structured data." },
  { codec: "pletter", label: "Pletter", description: "Classic MSX/Coleco-friendly LZ compressor." },
  { codec: "bitbuster", label: "BitBuster 1.2", description: "Classic BitBuster stream; Amy source uses codec bitbuster." },
  { codec: "lzf", label: "LZF", description: "Fast LZ family candidate." }
];

export const PICTURE_QUICK_COMPRESSION_CODECS = ["raw", "mdkrle", "nibble", "bitbuster", "zx7", "dan1"];

export const PICTURE_DECOMPRESSOR_ROUTINE_BYTES = {
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

const PICTURE_Z80_RUNTIME_INFO = {
  raw: {
    rank: 0,
    label: "direct VRAM upload",
    note: "No decompressor; fastest runtime path but largest data."
  },
  mdkrle: {
    rank: 1,
    label: "fast RAM/ROM->VRAM stream",
    note: "RLE writes literal/fill runs directly to VRAM."
  },
  nibble: {
    rank: 1,
    label: "fast RAM/ROM->VRAM stream",
    note: "DAN0nibble-style stream writes values directly to VRAM."
  },
  lzf: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Browser timing is not representative; matches copy through VRAM."
  },
  zx0: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Strong compression, but runtime has VDP copy/read cost."
  },
  zx7: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Runtime can be slower than JavaScript timings imply."
  },
  dan1: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Runtime can be slower than JavaScript timings imply."
  },
  dan2: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Runtime can be slower than JavaScript timings imply."
  },
  dan3: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Runtime can be slower than JavaScript timings imply."
  },
  pletter: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Runtime can be slower than JavaScript timings imply."
  },
  bitbuster: {
    rank: 3,
    label: "LZ VRAM back-copy",
    note: "Runtime can be slower than JavaScript timings imply."
  }
};

const RAW_PICTURE_BYTES = 6144 * 2;

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
  return Date.now();
}

function toBytes(bytes) {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
}

function sameBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function codecExtension(codec) {
  if (codec === "mdkrle") return "rle";
  return codec === "raw" ? "" : codec;
}

function sanitizePictureStem(name) {
  const stem = String(name || "picture")
    .replace(/\.[^.\\/]+$/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return stem || "picture";
}

async function evaluateComponent({ codec, bytes, compressBytes, decompressBytes }) {
  const input = toBytes(bytes);
  if (codec === "raw") {
    return {
      bytes: input,
      size: input.length,
      verified: true,
      compressionMs: 0,
      decompressionMs: 0
    };
  }
  if (typeof compressBytes !== "function") throw new Error("No compressor available.");
  const compressStart = nowMs();
  const compressed = toBytes(await compressBytes(codec, input));
  const compressionMs = nowMs() - compressStart;
  let verified = true;
  let decompressionMs = 0;
  if (typeof decompressBytes === "function") {
    const decompressStart = nowMs();
    const roundtrip = toBytes(await decompressBytes(codec, compressed));
    decompressionMs = nowMs() - decompressStart;
    verified = sameBytes(roundtrip, input);
    if (!verified) throw new Error("Roundtrip decompression did not match source bytes.");
  }
  return {
    bytes: compressed,
    size: compressed.length,
    verified,
    compressionMs,
    decompressionMs
  };
}

export function getPictureCompressionCodecOptions() {
  return PICTURE_CODEC_OPTIONS.map((option) => ({
    ...option,
    routineBytes: PICTURE_DECOMPRESSOR_ROUTINE_BYTES[option.codec] ?? 0,
    ...pictureZ80RuntimeFields(option.codec)
  }));
}

function pictureZ80RuntimeFields(codec) {
  const info = getPictureZ80RuntimeInfo(codec);
  return {
    z80RuntimeRank: info.rank,
    z80RuntimeLabel: info.label,
    z80RuntimeNote: info.note
  };
}

export function getPictureZ80RuntimeInfo(codec) {
  return PICTURE_Z80_RUNTIME_INFO[String(codec || "").toLowerCase()] || {
    rank: 9,
    label: "unknown runtime",
    note: "No Z80/VDP runtime class has been assigned for this codec."
  };
}

export async function evaluatePictureCompressionCandidates(tables, options = {}) {
  const candidates = [];
  const requestedCodecs = options.codecs || PICTURE_CODEC_OPTIONS.map((option) => option.codec);
  const optionByCodec = new Map(PICTURE_CODEC_OPTIONS.map((option) => [option.codec, option]));
  for (const codec of requestedCodecs) {
    const option = optionByCodec.get(codec);
    if (!option) continue;
    try {
      const pattern = await evaluateComponent({
        codec,
        bytes: tables.pattern,
        compressBytes: options.compressBytes,
        decompressBytes: options.decompressBytes
      });
      const color = await evaluateComponent({
        codec,
        bytes: tables.color,
        compressBytes: options.compressBytes,
        decompressBytes: options.decompressBytes
      });
      const dataBytes = pattern.size + color.size;
      const routineBytes = PICTURE_DECOMPRESSOR_ROUTINE_BYTES[codec] ?? 0;
      const compressionMs = pattern.compressionMs + color.compressionMs;
      const decompressionMs = pattern.decompressionMs + color.decompressionMs;
      candidates.push({
        ...option,
        extension: codecExtension(codec),
        routineBytes,
        patternBytes: pattern.size,
        colorBytes: color.size,
        dataBytes,
        totalFirstUseBytes: dataBytes + routineBytes,
        dataSavingsBytes: RAW_PICTURE_BYTES - dataBytes,
        totalSavingsBytes: RAW_PICTURE_BYTES - dataBytes - routineBytes,
        compressionMs,
        decompressionMs,
        ...pictureZ80RuntimeFields(codec),
        verified: pattern.verified && color.verified,
        components: {
          pattern: pattern.bytes,
          color: color.bytes
        }
      });
    } catch (error) {
      candidates.push({
        ...option,
        extension: codecExtension(codec),
        routineBytes: PICTURE_DECOMPRESSOR_ROUTINE_BYTES[codec] ?? 0,
        ...pictureZ80RuntimeFields(codec),
        error: error?.message || String(error)
      });
    }
  }
  return candidates;
}

export function selectPictureCompressionCandidate(candidates, criterion = "smallest-total") {
  const usable = (candidates || []).filter((candidate) => !candidate.error);
  if (!usable.length) return null;
  if (criterion === "raw") return usable.find((candidate) => candidate.codec === "raw") || usable[0];
  if (criterion === "smallest-data") {
    return [...usable].sort((a, b) => a.dataBytes - b.dataBytes || a.totalFirstUseBytes - b.totalFirstUseBytes)[0];
  }
  return [...usable].sort((a, b) => a.totalFirstUseBytes - b.totalFirstUseBytes || a.dataBytes - b.dataBytes)[0];
}

export function buildPictureProjectFileEntriesFromCandidate(name, candidate, options = {}) {
  if (!candidate || candidate.error) throw new Error("A valid picture compression candidate is required.");
  const stem = sanitizePictureStem(name);
  const extension = candidate.extension || "";
  const entries = [
    { component: "pattern", bytes: candidate.components.pattern },
    { component: "color", bytes: candidate.components.color }
  ].map((entry) => ({
    path: extension ? `${stem}.${entry.component}.${extension}` : `${stem}.${entry.component}`,
    bytes: new Uint8Array(entry.bytes),
    kind: "picture",
    source: options.source || "imageToPicture",
    codec: candidate.codec === "raw" ? "raw" : candidate.codec
  }));
  if (options.includeNameTable && options.nameTable) {
    entries.push({
      path: `${stem}.name`,
      bytes: new Uint8Array(options.nameTable),
      kind: "picture",
      source: options.source || "imageToPicture",
      codec: "raw"
    });
  }
  return entries;
}
