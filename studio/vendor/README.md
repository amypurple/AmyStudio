# Vendored Deterministic JavaScript

These files are copied from Amy's existing web tools so Amy Studio can run offline.

## Sources

| Local path | Source project | Purpose |
| --- | --- | --- |
| `retrocompress-lite/js/codecs/*.js` | [RetroCompress-Lite](https://github.com/amypurple/RetroCompress-Lite) | Deterministic compressors/decompressors for ZX0, ZX7, DAN1, DAN3, Pletter, BitBuster, LZF, and MDK-RLE |
| `retrocompress-lite/js/codecConfig.js` | [RetroCompress-Lite](https://github.com/amypurple/RetroCompress-Lite) | Codec registry and dynamic loader |
| `retrocompress-lite/js/utils.js` | [RetroCompress-Lite](https://github.com/amypurple/RetroCompress-Lite) | CRC, byte formatting, validation helpers |
| `amyscvsoundstudio/asmCodec.js` | [Amy's CV Sound Studio](https://github.com/amypurple/AmysCVSoundStudio) | Sound table ASM parser/dumper |

## Local Adjustments

- `amyscvsoundstudio/asmCodec.js` exports `ASM` as an ES module so `studio/core/soundAsm.js` can import it.
- Compression codecs remain otherwise copied as-is and are loaded by `studio/core/compression.js`.

## Assembler

`AmysCVAssembly` is still treated as the compiler. Its deterministic core currently lives inside `AmysCVAssemblerPro-v2.html`; extracting that engine cleanly should be a separate step so the compiler logic is not mixed with UI code.
