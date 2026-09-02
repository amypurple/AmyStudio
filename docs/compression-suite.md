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
    zx1_vram.asm
    zx2_vram.asm
    aplib_vram.asm
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

Amy Studio currently enables 13 compressors in the picture/tiles import chooser: `mdkrle`, `nibble`, `lzf`, `dan3`, `dan1`, `dan2`, `pletter`, `bitbuster`, `zx7`, `zx0`, `zx1`, `zx2`, and `aplib`.

`zx1` is byte-compatible with Einar Saukas' official ZX1 standard stream. Amy's 127-byte decoder writes directly to ColecoVision VRAM. Four complete 12,288-byte bitmap pictures pass exact round-trip checks and GearColeco VRAM validation; Warrior and a long-literal stress case also pass every optimizer profile.

`zx2` is byte-compatible with Einar Saukas' official ZX2 v1.1 stream. Its 115-byte direct-to-VRAM decoder is smaller than ZX1, while its 255-byte match window can produce larger payloads. All 22 Pattern/Color tables from the eleven-picture corpus match `zx2.exe` byte for byte and round-trip exactly; Warrior and a synthetic long-literal case pass exact GearColeco VRAM validation under every optimizer profile.

`aplib` uses Amy Studio's browser encoder and a 348-byte public-domain SMSlib-derived decoder adapted for plain ColecoVision VRAM addresses. The raw `.aplib` stream is compatible with aPPack. The Z80 routine writes directly to VRAM and requires NMI-safe use, like the other LZ VRAM codecs. The official aPLib package and `appack.exe` are test references only and are not redistributed by Amy Studio.

`nibble` is the official Studio name for the legacy `DAN0nibble`-derived codec. It uses RLE commands plus 16-value data-stream references, with a 2026 relocatable header for browser project files.

The quick image-import pass keeps the established fastest candidates. The full "Compare all codecs" pass evaluates all 13 compressors. Browser compression/verification timings are not presented as Z80 decompression speed; the chooser uses a separate `Z80/VDP runtime` class so direct streams are not unfairly compared with LZ codecs that can do VRAM back-copy.

## Workflow
1. Export/compress assets with standalone tools (e.g., `zx0.exe`) or reuse Warrior binaries for validation.
2. Place compressed output + metadata into `assets/compressed/<project>/`.
3. Include the matching decompressor routine and `incbin` the compressed blob from assembly.
4. Document usage by adding a row to `docs/routines/<algo>.md`.

## TODO
- [ ] Port remaining Warrior decompressors (Bitbuster, DANx, Pletter, LZF, MDK-RLE) into sample ROMs or tests.
- [ ] Write wrappers for ZX0/ZX7 packers (PowerShell + Python) inside `tools/compress.py`.
- [ ] Provide benchmarks comparing ratio vs. CPU time for each codec.
