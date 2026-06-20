# AmysCVAssembly Extraction Notes

Source:

`C:/Users/Amy/Documents/git/AmysCVAssembly/AmysCVAssemblerPro-v2.html`

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
