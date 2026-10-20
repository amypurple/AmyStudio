# AmysCVAssembly Extraction Notes

Source: [Amy's CV Assembly](https://github.com/amypurple/AmysCVAssembly)

## Candidate Core Blocks

| Block | Approx lines | Notes |
| --- | --- | --- |
| Parser model classes | 3264+ | `Instruction`, `Directive`, `Operand` |
| Number parser | 3293+ | Extracted in `parserCore.js`, exposed by `studio/core/amyscvassembly.js` |
| Lexer | 3392+ | Extracted in `parserCore.js`, exposed by `studio/core/amyscvassembly.js` |
| Assembler | 4484+ | Must remove DOM reads, global `log`, optimizer UI toggles, platform select reads |
| Optimizer | 7888+ | Candidate after assembler options are explicit |

## Rules

- Extract only data-in/data-out behavior.
- Replace browser UI dependencies with options/callbacks.
- Keep HTML event handlers in AmysCVAssembly, not in ALEXIS core.

## Extracted Files

- `parserCore.js`: copied from lines 3264-3667 of `AmysCVAssemblerPro-v2.html`; no DOM dependencies found by `tools/audit-html-js-core.ps1`.
- `studio/core/amyscvassembly.js`: ALEXIS adapter around the extracted parser/lexer.

## Command-Line Dialects

`tools/amyz80.mjs` exposes mutually exclusive compatibility modes:

```powershell
node tools/amyz80.mjs game.asm game.rom --gasm80
node tools/amyz80.mjs game.z80 game.rom --tasm
```

TASM coverage is pinned by Matthew Eggleston's `TTST2` fixture. The test covers
dot-prefixed `ORG`, `DB`, `DW`, `EQU`, and `END`, `%binary` and `binaryb`
literals, labels, expressions, direct port I/O, and OS7 calls, and requires the
supplied 846-byte ROM to match exactly. Compatibility mode identifies source
intent and permits future dialect-specific diagnostics; it does not weaken Z80
opcode validation.
