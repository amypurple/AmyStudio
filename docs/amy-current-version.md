# Current Amy Version

Amy is currently an active **pre-release** language. The implementation in Amy Studio,
the examples, and [the Amy Language Reference](amy-language.md) define the current
surface. Historical `v2.1`, proposed `v2.2`, and `v3` documents are not compatibility
promises.

Last reconciled with the compiler and OS7/EOS support matrix: **2026-10-04**.

## Normative sources

- [Amy Language Reference](amy-language.md): user-facing syntax and semantics
- [Removed forms](amy-removed-forms.md): obsolete spellings and migrations
- [Changelog](CHANGELOG.md): implementation history and verification notes

Generated symbol names, exact register choices, helper labels, RAM addresses, and sample
instruction sequences are non-normative unless the language reference explicitly says
otherwise.

## Current language surface

### Project targets

Amy Studio currently distinguishes four relevant execution contracts:

- normal ColecoVision OS7 cartridge projects;
- banked ColecoVision MegaCart projects using `bank rom` and `bank select`;
- native Coleco ADAM EOS applications packaged on DSK or DDP;
- OS7+EOS hybrid ADAM projects that retain the cartridge-style game runtime while using selected EOS services.

MegaCart banking is not ADAM memory mapping. Project metadata selects the memory profile, firmware contract, output builder, and available hardware capabilities. Target conditionals such as `if defined AMY_HAS_EOS` and `if defined AMY_HAS_MEGACART` let shared source select valid implementations at compile time.

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
- sound, music, DSound, TriPCM, and NMI-aware playback commands
- Sound Workspace v1 for BIOS table/SFX editing and two-channel Tiny Sound creation, import,
  sequencing, multi-area BIOS arrangement, playback, source write-back, and Web MIDI capture

### Coleco ADAM and expanded hardware

Native EOS and hybrid projects have modern Amy forms for named files, directories, raw blocks, the ADAM keyboard, printer, AdamNet devices, and serial interfaces. Built-in packed records include `EosDate`, `EosFile`, `EosDirectoryEntry`, and `EosDirectory`.

Representative forms include:

```basic
u8 IoStatus = 0
u8 Found = 0
u8 EntryCount = 0
u8 KeyStatus = 0
u8 KeyCode = 0
u8 PrintStatus = 0
u8 Present = 0
u8 Byte = 0
u32 FileSize = 0
EosFile FileInfo
EosDirectory Directory

FileSize = size "SAVE" status IoStatus
Found = find "SAVE" as FileInfo status IoStatus
EntryCount = catalog Directory status IoStatus
KeyCode = await key status KeyStatus
print "READY" to printer status PrintStatus
Present = serial present
if Present then serial write Byte
```

The compiler selects OS7 or EOS implementations for shared graphics, VRAM, input, timing, sprite, sound, decompression, and VoxPCM operations according to the project target. The detailed runtime evidence and remaining hardware qualifications live in [OS7 / EOS Command Support](amy-os7-eos-command-support.md).

Expanded targets can declare SP0256 voice adapters, SGM-compatible AY sound, the ADAM Sound Enhancer, and supported serial interfaces through project hardware metadata. Direct AY access uses `ay write`, `ay read`, and `ay mute`; unsupported targets reject those commands instead of silently emitting unusable I/O.

### Development and testing

Amy Studio supports colorized Amy source with native textarea editing semantics, editable
multi-file projects, source breakpoints, symbolic ROM-test checkpoints, generated source maps,
GearColeco-backed ROM and ADAM-media assertions, and full example assembly. Syntax coloring is presentation-only: compilation,
selection, autocomplete, breakpoints, and source text continue to use the underlying editor.

The compact `AC` switch disables or enables autocomplete independently from syntax
colouring. The preference persists locally and does not alter project files.

ROM TEST & DEBUG accepts compiled output and external `.rom`, `.col`, `.dsk`, and `.ddp` media. It supports record-from-boot and record-now video capture, deterministic AVI export, rewind, source/Z80 stepping, conditional watches, cycle profiling, writable ADAM media export, recorded development routes, and fast replay after recompilation. In ADAM mode, the computer keyboard can be routed to the native keyboard, joystick port 1, or joystick port 2. Its separate **RESET ADAM** and **RESET CV** controls model the computer's physical boot selector: the former boots EOS, while the latter boots an inserted OS7 cartridge without replacing the ADAM hardware model with a plain ColecoVision.
The highlighting convention is semantic and deliberately uses the TMS9918A palette:

- control-flow and general Amy grammar use cyan
- VDP/display vocabulary uses TMS blue
- numeric types use yellow/orange; built-ins use green; compile-time directives use magenta
- frame units use light green; literals, strings, comments, and operators have stable supporting colors
- user identifiers remain neutral; contextual words such as project, pattern, color, name, and frames are colored only where Amy grammar gives them that role
- parentheses, brackets, and expression punctuation share the operator color rather than pretending to be commands
- `project`, `cartridge`, and `memory` share the metadata/directive color only in valid quoted declarations
- the compact black switch in the SOURCE bar enables syntax colors when desired; its tooltip uses `color` for US browsers and `colour` elsewhere, new browsers start with legacy monochrome source, and the disabled state performs no tokenization


Run the registered release-gate matrix with:

```text
node tools/amy-feature-matrix.mjs
```

Run the gate plus every catalog example with:

```text
node tools/amy-feature-matrix.mjs --full
```

After fixing a late failure, resume from that test with:

```text
node tools/amy-feature-matrix.mjs --from test-name.mjs
```

The runner validates its registered manifest before starting, reports `RUN`/`PASS` progress, and
stops a test that exceeds two minutes.

BIOS-backed tests use a private BIOS path from `AMY_COLECO_BIOS`. Without one, those tests
report an explicit skip; Amy Studio does not distribute the copyrighted ColecoVision BIOS.

## Deliberately deferred

The following are not current language promises:

- heap-allocated or dynamically-lived strings
- `chr$()`, `left$()`, `right$()`, `mid$()`, string slicing, and general runtime string concatenation
- typed general-purpose pointers and function pointers
- recursively nested arrays inside records and unrestricted aggregate record layouts
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
