# JavaScript Integration Plan

## What Is Integrated Now

| Area | Source | ALEXIS location | Status |
| --- | --- | --- | --- |
| Compression engines | `C:/Users/Amy/Documents/git/RetroCompress-Lite/js/codecs/` | `studio/vendor/retrocompress-lite/js/codecs/` | Copied and callable |
| Compression registry | `C:/Users/Amy/Documents/git/RetroCompress-Lite/js/codecConfig.js` | `studio/vendor/retrocompress-lite/js/codecConfig.js` | Copied and callable |
| Sound ASM codec | `C:/Users/Amy/Documents/git/AmysCVSoundStudio/asmCodec.js` | `studio/vendor/amyscvsoundstudio/asmCodec.js` | Copied, ES module export added |
| AmysCVAssembly parser/lexer | `C:/Users/Amy/Documents/git/AmysCVAssembly/AmysCVAssemblerPro-v2.html` | `studio/vendor/amyscvassembly/parserCore.js` | Extracted from HTML, no DOM dependencies |
| Studio adapters | New ALEXIS code | `studio/core/compression.js`, `studio/core/soundAsm.js` | Stable API over vendored code |

## What Stays External For Now

`AmysCVAssembly` remains the compiler UI. ALEXIS generates `.asm`, then the user compiles in:

`C:/Users/Amy/Documents/git/AmysCVAssembly/AmysCVAssemblerPro-v2.html`

The assembler core is embedded in that HTML file. The right next step is to extract the deterministic classes (`NumberParser`, `Lexer`, instruction/directive encoders, linker pieces) into a reusable `assemblerCore.js` module, then make both AmysCVAssembly and ALEXIS call the same core.

Extraction rules are documented in `docs/html-javascript-extraction.md`. The first extracted AmysCVAssembly block is `studio/vendor/amyscvassembly/parserCore.js`, exposed through `studio/core/amyscvassembly.js`.

## Adapter API

`studio/core/compression.js`:
- `getCompressionCatalog()`
- `compressBytes(codecId, bytes, options)`
- `decompressBytes(codecId, bytes, options)`
- `detectCodecFromName(fileName)`

`studio/core/soundAsm.js`:
- `parseSoundAsm(asmText)`
- `soundTablesToAsm(tables, options)`
- `parseSoundBytes(byteText)`
- `hzFromPeriod(period, system)`

`studio/core/amyscvassembly.js`:
- `lexZ80Source(sourceText)`
- `parseAssemblyNumber(value)`
- `summarizeTokens(tokens)`

## Next Extraction Step

Create `studio/vendor/amyscvassembly/assemblerCore.js` from the deterministic sections of `AmysCVAssemblerPro-v2.html`. Keep UI/browser storage/file handling out of that module.
