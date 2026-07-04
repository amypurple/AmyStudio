# Compression / Decompression Suite

## External Sources
- `../z80 compiler/cvdevkit_libs_asm_refactored/compression/` – ZX0, ZX7, LZ4, Exomizer, RLE, APUltra implementations.
- `../AmysCVAssembly/docs/INCBIN_ADVANCED_FEATURES_RESEARCH.md` – Detailed comparison of assemblers supporting inline compression directives.
- `../Novembre/compression-tests/project2/warrior_src/` – Battle-tested VRAM decompressors (ZX0/ZX7/Bitbuster/DANx/LZF/MDK RLE/Pletter) plus sample assets.

## Repository Layout
```
src/
  compression/
    zx0_vram.asm
    zx7_vram.asm
    nibble_vram.asm
    bitbuster_vram.asm
    dan1_vram.asm
    dan3_vram.asm
    lzf_vram.asm
    mdkrle_vram.asm
    pletter_vram.asm
assets/
  compressed/
    warrior/
      pattern.zx0
      color.zx7
      pattern.nibble
      color.nibble
```

## Official Studio Codecs

Amy Studio currently enables 10 compressors in the picture/tiles import chooser: `mdkrle`, `nibble`, `lzf`, `dan3`, `dan1`, `dan2`, `pletter`, `bitbuster`, `zx7`, and `zx0`. `aplib` is intentionally excluded because Amy Studio does not currently ship a matching ColecoVision VRAM decompressor.

`nibble` is the official Studio name for the legacy `DAN0nibble`-derived codec. It uses RLE commands plus 16-value data-stream references, with a 2026 relocatable header for browser project files.

The quick image-import pass tests `raw` plus the 5 fastest compressors measured on the Warrior pattern/color benchmark: `mdkrle`, `nibble`, `bitbuster`, `zx7`, and `dan1`. The full “Compare all codecs” pass still evaluates all 10 compressors. Browser compression/verification timings are not presented as Z80 decompression speed; the chooser uses a separate `Z80/VDP runtime` class so direct streams like `mdkrle`/`nibble` are not unfairly compared with LZ codecs that can do VRAM back-copy.

## Workflow
1. Export/compress assets with standalone tools (e.g., `zx0.exe`) or reuse Warrior binaries for validation.
2. Place compressed output + metadata into `assets/compressed/<project>/`.
3. Include the matching decompressor routine and `incbin` the compressed blob from assembly.
4. Document usage by adding a row to `docs/routines/<algo>.md`.

## TODO
- [ ] Port remaining Warrior decompressors (Bitbuster, DANx, Pletter, LZF, MDK-RLE) into sample ROMs or tests.
- [ ] Write wrappers for ZX0/ZX7 packers (PowerShell + Python) inside `tools/compress.py`.
- [ ] Provide benchmarks comparing ratio vs. CPU time for each codec.
