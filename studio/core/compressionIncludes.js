const COMPRESSION_INCLUDE_BY_CODEC = Object.freeze({
  aplib: "src/compression/aplib_vram.asm",
  bitbuster: "src/compression/bitbuster_vram.asm",
  bitbuster12: "src/compression/bitbuster_vram.asm",
  dan1: "src/compression/dan1_vram.asm",
  dan2: "src/compression/dan2_vram.asm",
  dan3: "src/compression/dan3_vram.asm",
  exomizer: "src/compression/exomizer_vram.asm",
  lzf: "src/compression/lzf_vram.asm",
  mdkrle: "src/compression/mdkrle_vram.asm",
  megalz: "src/compression/megalz_vram.asm",
  msc1: "src/compression/msc1_vram.asm",
  nibble: "src/compression/nibble_vram.asm",
  pletter: "src/compression/pletter_vram.asm",
  rle: "src/compression/mdkrle_vram.asm",
  zx0: "src/compression/zx0_vram.asm",
  zx1: "src/compression/zx1_vram.asm",
  zx2: "src/compression/zx2_vram.asm",
  zx7: "src/compression/zx7_vram.asm"
});

export function normalizeCompressionInclude(value) {
  const normalized = String(value || "").trim().replace(/\\/g, "/");
  return COMPRESSION_INCLUDE_BY_CODEC[normalized.toLowerCase()] || normalized;
}

export function normalizeCompressionIncludes(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeCompressionInclude)
    .filter(Boolean))];
}
