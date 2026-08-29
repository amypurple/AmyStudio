# Current Amy Version

Amy is currently an active **pre-release** language. The implementation in Amy Studio,
the examples, and [the Amy Language Reference](amy-language.md) define the current
surface. Historical `v2.1`, proposed `v2.2`, and `v3` documents are not compatibility
promises.

## Normative sources

- [Amy Language Reference](amy-language.md): user-facing syntax and semantics
- [Removed forms](amy-removed-forms.md): obsolete spellings and migrations
- [Changelog](CHANGELOG.md): implementation history and verification notes

Generated symbol names, exact register choices, helper labels, RAM addresses, and sample
instruction sequences are non-normative unless the language reference explicitly says
otherwise.

## Current language surface

### Procedures and data

- `sub` and typed `function` declarations with scalar parameters and return values
- lexical local variables and local arrays, including primitive 2D arrays and recursion-safe stack frames
- compiler-selected frameless static ABI for proven non-reentrant scalar routines
- `ref` parameters for addressable scalar values and records
- records, nested records, fixed scalar array fields including `u32`/`i32`, and arrays of records within the documented limits
- experimental Phase-A record-backed RAM overlays with qualified arithmetic, loops, selected I/O operands, and physical/logical RAM accounting
- byte data, visual `bitmap8`/`sprite16` data, assets, and indexable ROM word tables
- compile-time `define` plus `if defined`, `else defined`, and `end defined`

The static ABI is an optimization, not a source-level contract. Recursive, NMI-reachable,
ASM-opaque, `ref`, and unsupported aggregate routines conservatively retain stack frames.

### Numeric families

The canonical types are `bool`, `u8`, `i8`, `u16`, `i16`, `u32`, `i32`, `fixed`,
`ufixed`, `fixed32`, `fp5`, and packed `bcd`.

- `fixed` and `ufixed` use 8.8 values written naturally, such as `1.5`.
- Byte-only destinations consume the whole-number part of fixed values where documented,
  including screen and sprite coordinates.
- Byte values widen predictably in 16-bit contexts: `u8` zero-extends and `i8` sign-extends.
- `u32` and `i32` support fixed global and local arrays, same-type binary `+`/`-`,
  fitting integer literals, and constant or byte-sized runtime indexes.
- `fp5` supports fixed global and local arrays with indexed assignment, arithmetic,
  comparison, clear, format, print, math builtins, random values, and `fixed32`
  conversions.
- `inc` and `dec` support packed BCD values, including indexed global and local BCD arrays.
- Legacy `u32 zero/copy/add/inc/sub` forms remain migration-only compatibility syntax;
  modern code uses assignment and compound operators.
- `random(Max)` and `random(Min, Max)` produce integer values; zero-argument `random()` is
  reserved for `fp5` and `fixed32` targets.

### Control flow and expressions

- block and one-line `if`/`elseif`/`else`
- `select case`, `for`/`next`, `while`, `do`/`loop`, and `loop forever`
- `on Expr goto` and `on Expr gosub` indexed dispatch
- typed `state machine` declarations and bounded `dispatch State using Machine`
- calculated byte-array and ROM-table indexes using byte-sized expressions
- gameplay verbs such as `bounce`, `clamp`, collision tests, timed waits, and input waits

A `for` loop variable must be declared before the loop. Constant indexes are checked when
possible; calculated indexes intentionally have no implicit runtime bounds check.

### ColecoVision input and display

- runtime `joypad(Expr)`, `keypad(Expr)`, and consuming `spinner(Expr)` selectors
- complete action-button semantics for press/release waits
- keypad choice helpers, CRT-safe pauses, and PAL/NTSC-aware blanking
- text, tile, bitmap, sprites, VRAM transfer, decompression, and picture commands
- `120 colors on` / `120 colors off` for the historical per-frame VDP R3/R4 technique
- sound, music, DSound, and NMI-aware playback commands

### Development and testing

Amy Studio supports colorized Amy source with native textarea editing semantics, source
breakpoints, symbolic ROM-test checkpoints, generated source maps, GearColeco-backed ROM
assertions, and full example assembly. Syntax coloring is presentation-only: compilation,
selection, autocomplete, breakpoints, and source text continue to use the underlying editor.
The highlighting convention is semantic and deliberately uses the TMS9918A palette:

- control-flow and general Amy grammar use cyan
- VDP/display vocabulary uses TMS blue
- numeric types use yellow/orange; built-ins use green; compile-time directives use magenta
- frame units use light green; literals, strings, comments, and operators have stable supporting colors
- user identifiers remain neutral; contextual words such as project, pattern, color, name, and frames are colored only where Amy grammar gives them that role
- parentheses, brackets, and expression punctuation share the operator color rather than pretending to be commands
- `project`, `cartridge`, and `memory` share the metadata/directive color only in valid quoted declarations
- the compact black switch in the SOURCE bar enables syntax colors when desired; its tooltip uses `color` for US browsers and `colour` elsewhere, new browsers start with legacy monochrome source, and the disabled state performs no tokenization


Run the targeted language gate with:

```text
node tools/amy-feature-matrix.mjs
```

Run the gate plus every catalog example with:

```text
node tools/amy-feature-matrix.mjs --full
```

BIOS-backed tests use a private BIOS path from `AMY_COLECO_BIOS`. Without one, those tests
report an explicit skip; Amy Studio does not distribute the copyrighted ColecoVision BIOS.

## Deliberately deferred

The following are not current language promises:

- heap-allocated or dynamically-lived strings
- `chr$()`, `left$()`, `right$()`, `mid$()`, string slicing, and general runtime string concatenation
- typed general-purpose pointers and function pointers
- recursively nested arrays inside records and unrestricted aggregate record layouts
- scene lifecycle syntax, overlay lifetime enforcement, active-part debugger watches,
  and optional `$CD` poison-fill diagnostics for missing scene initialization
- unrestricted `ref` support for every numeric and aggregate type
- automatic runtime bounds checks for calculated indexes
- register-parameter ABI as a stable calling convention
- release-grade `fp5 exp` accuracy across its full intended range

Amy does support lightweight numeric text expressions such as `str$(Value)`, fixed `u8`
text buffers, and literal-plus-numeric formatting without introducing a dynamic string
runtime.

## Version policy

A numbered Amy release should be declared only when its syntax and compatibility boundary
are intentionally frozen. Until then, new code should follow [amy-language.md](amy-language.md),
compiler diagnostics, autocomplete, and the examples shipped by the same Amy Studio build.
