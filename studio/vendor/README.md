# Vendored Deterministic JavaScript

These files are copied from Amy's existing web tools so ALEXIS-Z80 can run offline as a single web studio.

## Sources

| Local path | Source project | Purpose |
| --- | --- | --- |
| `retrocompress-lite/js/codecs/*.js` | `C:/Users/Amy/Documents/git/RetroCompress-Lite/js/codecs/` | Deterministic compressors/decompressors for ZX0, ZX7, DAN1, DAN3, Pletter, BitBuster, LZF, and MDK-RLE |
| `retrocompress-lite/js/codecConfig.js` | `C:/Users/Amy/Documents/git/RetroCompress-Lite/js/codecConfig.js` | Codec registry and dynamic loader |
| `retrocompress-lite/js/utils.js` | `C:/Users/Amy/Documents/git/RetroCompress-Lite/js/utils.js` | CRC, byte formatting, validation helpers |
| `amyscvsoundstudio/asmCodec.js` | `C:/Users/Amy/Documents/git/AmysCVSoundStudio/asmCodec.js` | Sound table ASM parser/dumper |

## Local Adjustments

- `amyscvsoundstudio/asmCodec.js` exports `ASM` as an ES module so `studio/core/soundAsm.js` can import it.
- Compression codecs remain otherwise copied as-is and are loaded by `studio/core/compression.js`.

## Assembler

`AmysCVAssembly` is still treated as the compiler. Its deterministic core currently lives inside `AmysCVAssemblerPro-v2.html`; extracting that engine cleanly should be a separate step so the compiler logic is not mixed with UI code.
