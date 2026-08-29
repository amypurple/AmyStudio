# Amy Language Reference

This is the user-facing Amy language reference.

Amy is a compact BASIC-like language for ColecoVision that compiles to Z80 assembly. It is designed for fast game-programming work: clear screen setup, direct sprite control, tile and bitmap helpers, sound playback, typed variables, arrays, records, and inline ASM when precision matters.

Amy is not meant to hide the machine. It makes common ColecoVision work concise while allowing inline ASM anywhere precision matters.

Important status note:
- this file is the **live implemented reference**
- current examples prefer the modern Amy surface syntax
- older spellings are documented only when they explain current cleanup work
- archived historical notes live under `docs/archive/`

This document is the main reference for the Amy source language:
- what is implemented today
- what syntax is canonical today
- what extensions are planned but not implemented yet

---

## Design Goals

- Generate predictable Z80 ASM.
- Use the active ColecoVision memory profile, with `memory "..."` only as an optional override.
- Allow direct calls to library routines.
- Allow inline ASM blocks without fighting the compiler.
- Keep declarations explicit enough for ROM/RAM/VRAM planning.
- Read like BASIC; compile close to hand-written Z80.

## Status

Amy is pre-release and still being simplified. The current docs teach the modern Amy spelling first.

Current policy:
- the strict canonical teaching style lives in the manual-oriented reference
- this file teaches the canonical surface first and marks non-canonical forms explicitly
- new demos and new code must use the canonical forms
- planned extensions are listed explicitly near the end of this document and should not be treated as implemented

Removed spellings produce compile errors with fix-it hints pointing to the canonical replacement; the complete list is in [amy-removed-forms.md](amy-removed-forms.md).

Status tags used below:
- **Canonical** — preferred spelling for new code and examples.
- **Removed** — compile error with a fix-it hint.
- **Planned** — design direction only; do not rely on it.
- **Experimental** — compiles, but the behavior or quality bar is not release-grade yet.

Amy style rule: prefer the short form that exposes the machine contract. If a
convenience command hides important VDP, RAM, stack, or NMI side effects, this
reference states those side effects near the command.

---

## Canonical Minimal Program

```basic
cartridge "HELLO AMY/AMY/1986"

' Tiny cartridge starter
text screen
print at 10,11, "HELLO WORLD" ' HUD text
screen on
```

---

## File Shape

```basic
cartridge "NAME/AMY/1986"

asset WarriorPattern from "assets/warrior/pattern.zx0" codec zx0

const TileBase = $00
u16 Score = 0, Lives = 3

text screen
print at 12,10, "DEMO"
screen on
```

### Cartridge metadata

```basic
cartridge "GAME TITLE/PUBLISHER/1986"
cartridge "MAPPY {tm}/NAMCO/1984"
```

Implemented today:
- `cartridge` switches the ROM header to `AA 55`
- the BIOS title string is emitted at `$8024`
- code starts after the zero-terminated title string
- the Studio can preview both the ColecoVision BIOS title screen and the DINA 2-in-1 title screen from the compiled ROM
- the Studio can also preview directly from valid source metadata before compilation
- executable top-level code becomes the implicit `Start`
- falling off the end of `Start` loops forever implicitly for cartridge-style programs; add an explicit `goto MainLoop` when you want that behavior to be obvious

Supported title escapes:
- `{c}`
- `{tm}`

Lowercase letters are accepted in source, but the ColecoVision BIOS title screen is uppercase-only.
The compiler and Studio preview normalize lowercase to uppercase for cartridge title rendering.

### Comments

```basic
' Full-line comment
print at 3,12, "SPECIAL-04" ' Inline note
print at 3,13, "COMPACT PLAYER" rem Another inline comment
```

Implemented today:
- apostrophe comments work on full lines and after code
- `REM` comments are accepted for older BASIC-style notes, but new code should prefer apostrophe comments
- comment markers inside string literals are preserved as text
- Amy Studio supports `Ctrl+/` (`Cmd+/` on macOS keyboards) to comment or uncomment all selected source lines

Amy does not currently have a block-comment syntax. Use the editor shortcut for temporary multi-line commenting.

### Compile-Time Conditionals

Amy supports a small conditional-compilation pre-pass. Disabled blocks are removed before variables, DATA, assets, includes, and runtime helpers are scanned, so they do not increase ROM size and do not create missing-symbol errors.

Canonical modern form:

```basic
define DEBUG
define TITLE_ONLY

if defined DEBUG and TITLE_ONLY
  asset DebugTitle from "@project/debug-title.pattern.zx0" codec zx0
  print centered at 10, "DEBUG TITLE"
else defined DEBUG
  print centered at 10, "DEBUG GAME"
else defined
  print centered at 10, "NORMAL"
end defined
```

Useful forms:

```basic
if defined DEBUG or TITLE_ONLY
  ' compile this block when either flag exists
end defined

if defined DEBUG and not TITLE_ONLY
  ' compile this block only for debug non-title builds
end defined

if not defined FULL_GAME
  include asm "@project/test-engine.inc"
end defined
```

Rules:
- `define NAME` and `#define NAME` create compile-time flags only; they are not runtime variables and emit no code.
- `if defined NAME` starts a compile-time block. After the first `defined`, bare symbols in the expression mean "is defined", so `if defined DEBUG and TITLE_ONLY` means `DEBUG` and `TITLE_ONLY` are both defined.
- Supported expression words are `and`, `or`, and `not`; parentheses and `defined(NAME)` are also accepted for clarity.
- `else defined CONDITION` starts another compile-time branch in the same block.
- `else defined` is the compile-time fallback branch. Amy intentionally does not use plain `else` for this, so normal runtime `if ... else ... end if` code remains safe inside compile-time blocks.
- `end defined` closes the modern compile-time block.
- Flags are evaluated in source order. A `define NAME` only affects conditionals that appear after it, and only when the `define` itself is in an active compile-time branch.

Legacy-compatible forms remain accepted:

```basic
ifdef DEBUG_HOLES
  print centered at 10, "DEBUG HOLES"
else ifdef
  print centered at 10, "NORMAL"
end ifdef
```

### Source Debug Breakpoints

Amy code can ask the development emulator to stop automatically at a named source location:

```basic
define DEBUG

if defined DEBUG
  debug breakpoint "game_loop"
end defined
```

`debug breakpoint` accepts a quoted identifier beginning with a letter and containing only letters, digits, and underscores. In the current implementation it emits `AMY_ULBL_BREAK_game_loop` plus one unique `NOP`. Those symbol and marker spellings are non-normative codegen details. After compilation, the local development emulator discovers every such symbol and arms it automatically on Run and Reset. The Breakpoints panel shows it as `source: game_loop`.

In Amy Studio, the preferred workflow is to click an executable line's gutter. A red marker creates a normal breakpoint; Shift-click or right-click opens a condition editor for forms such as `Score >= 10`, `Lives = 0`, or `$712F <> 3`. Conditions support `u8`, `i8`, `u16`, and `i16` values. They are stored as project metadata, injected only into the source copy sent to the compiler, and never alter the visible Amy listing.

When a condition is false, the recorder continues automatically. When it is true, execution pauses and Amy Studio selects and highlights the corresponding source line. Gutter breakpoints are intended for development and remain absent from a project that does not define them.

Keep source breakpoints inside a compile-time debug block. Removing `define DEBUG` removes both the symbol and marker byte from the release ROM. Use `test checkpoint` instead when the location identifies a repeatable automated-test assertion rather than an interactive debugging stop.
### Symbolic ROM-Test Checkpoints

A debug-only build can expose stable execution points to the GearColeco test runner:

```basic
define ROM_TEST_CHECKPOINTS

if defined ROM_TEST_CHECKPOINTS
  test checkpoint "player_over_cat"
end defined
```

`test checkpoint` accepts a quoted identifier containing letters, digits, and underscores, beginning with a letter. The current implementation emits the symbol `AMY_ULBL_TEST_player_over_cat` plus one `NOP`, giving the emulator a unique executable breakpoint address. Those exact symbol and marker spellings are non-normative codegen details. Keep checkpoints inside a compile-time block so release builds contain neither the symbol nor the marker byte.

The checkpoint does not perform an assertion itself. The ROM test suite resolves it through the generated `.sym` file, stops before the marker executes, then may inspect RAM, VRAM, VDP state, sprites, or a screenshot. A finite frame budget remains mandatory and becomes the timeout if the checkpoint is never reached.
C-style forms remain accepted for familiarity:

```basic
#define DEBUG_HOLES
#ifdef DEBUG_HOLES
  print centered at 10, "DEBUG HOLES"
#else
  print centered at 10, "NORMAL"
#endif
```
Statement conventions used throughout this document:

- `Name` — source identifier
- identifiers are case-insensitive and cannot collide with Amy keywords or builtins; for example, use `UpdateGame` rather than `Update`
- `X,Y` — name-table column, row (`u8`)
- `W,H` — width, height (`u8`)
- `N`, `Count`, `Digits` — numeric literal or `u8` variable
- `vram.pattern`, `vram.color`, `vram.name` — VRAM target families
- `into Var` — write result into destination
- `to Dst` — copy or assign to destination
- `from Src` — read or subtract from source
- `at X,Y` — name-table coordinates, not pixel coordinates

---

## Variables and Declarations

### Global variables

Global declarations live at top level (outside any `sub` or `function`).

```basic
u8  Pad1 = 0, Pad2 = 0
u16 Score = 0, HighScore = 0
i8  Delta = -1, Step = 1
i16 Velocity = 0, Gravity = 1
bool Ready = false, Paused = false
bcd digits 4 Coins, Gems
bcd digits 4 Timer = StartTimer
bcd digits 8 Score8, Best8
u8 Pattern[32]
u16 HighScores[10]
u8 Board[8,8]
```

Compile-time constants may also be grouped as enums:

```basic
enum PlayerFrame:
  Standing = 0
  Jumping = 4
  Falling = 8
end enum
```

Enums emit the same kind of constants as `const`. Omitted enum values
auto-increment from the previous value, starting at `0`. Enums are not strict
runtime types yet, and bitwise flag operators are deferred to a later phase.

Records are now available for grouped global data:

```basic
record Piece:
  u8 X
  u8 Y
  u8 Tile
  u8 Flags
  u8 HistoryX[8]
  u16 Bonuses[3]
end record

Piece Pieces[4]
const MaxClouds = 4
Piece MorePieces[MaxClouds]
```

`record` is the canonical Amy spelling. `struct` was removed; use `record`.

Current implemented record scope:
- top-level record definitions
- top-level record variables
- top-level arrays of record, including compile-time constant lengths
- field access such as `PieceVar.X` and `Pieces[I].Tile`
- nested record fields such as `PieceVar.Pos.X` and `Pieces[I].Pos.Y`
- fixed scalar array fields such as `PieceVar.HistoryX[I]` and `Pieces[P].Bonuses[2]`
- packed scalar BCD fields such as `bcd digits 6 Score`

Scalar array fields are byte-packed with no pointer, descriptor, or alignment padding.
`u8 Values[8]` occupies exactly 8 bytes, `u16 Values[3]` exactly 6 bytes, and
`u32 Values[3]` exactly 12 bytes. Literal
indexes are folded into direct addresses; runtime indexes use compact address arithmetic
and are not unrolled. Field lengths must be literal values from 1 through 255 in this
first implementation.

Typed ROM templates can initialize a complete record array with one checked block copy:

```basic
data LevelTwoFlies records Actor
  40,48,6,5,FlyFlying
  200,88,-6,4,FlyFlying
  120,144,5,-6,FlyFlying
end data

Actor Flies[3]
copy LevelTwoFlies to Flies
```

`data Name records Type` follows the record field order. Each row must provide exactly one value per field. `copy Template to Array` requires the same record type and exactly the same number of rows/elements, then emits a direct ROM-to-RAM `LDIR`; it has no runtime helper.

A larger typed table can also hold several fixed-size templates. Select a byte offset at runtime and provide a constant `count` that exactly fills the destination:

```basic
data LevelOffsets bytes = 0,20,40,60
data LevelFlies records Actor
  ' Four consecutive 20-byte level templates.
end data

Actor Flies[4]
u8 LevelOffset = 0
LevelOffset = LevelOffsets[Level - 1]
copy LevelFlies + LevelOffset count 20 to Flies
```

This checked slice form still requires matching record types. Its `count` must be a compile-time constant exactly equal to the destination array size; partial initialization is rejected. Offsets are byte offsets, so an explicit offset table is often clearer and cheaper than runtime multiplication on Z80.

Records support scalar and fixed-array fields using `u8`, `i8`, `u16`, `i16`, `u32`,
`i32`, `fixed`, `ufixed`, and `bool`, packed scalar `bcd digits N` fields, plus nested-record fields
and one-level arrays of fixed-size records:

```basic
record Actor:
  u8 X
  u8 Y
  i8 DX
  i8 DY
end record

record GameMemory:
  Actor Enemies[4]
  bcd digits 6 Score
end record

GameMemory GameRam
GameRam.Enemies[I].X += 1
```

Two statically addressed records of the same declared type can be copied directly:

```basic
Actor Source
Actor Destination
Destination = Source
SceneRam.Game.Player = Source
```

Whole-record assignment emits one inline Z80 `LDIR`; it allocates no pointer or helper
RAM. It accepts global records, nested scalar record fields, overlay parts, top-level
record-array elements, and qualified overlay record-array elements. Runtime indexes are
evaluated once per operand using the normal checked record-array address lowering. A copy
between two aliases of the same static overlay address is removed as a no-op. Different
record types, invalid or wider indexes, and pointer-backed `with` aliases are rejected
rather than guessed.

Whole records of the same declared type can also be compared for byte-for-byte equality:

```basic
if Current = Saved then Match = 1
if Actors[I] <> Template then Changed += 1
```

`=` and `<>` emit an inline counted byte comparison with no helper RAM. The same static,
nested, overlay, and indexed operands accepted by whole-record assignment are supported,
and each runtime index is evaluated once. Ordering comparisons such as `<` or `>` and
different record types are rejected because records have no implicit ordering semantics.

Indexed paths may combine a record-array index with a scalar array-field index, as in
`Container.Items[I].Flags[J]`. Each index contributes its own checked byte stride to the
address calculation. Constant indices are range-checked; runtime indices must be byte
expressions and have no implicit bounds check. Recursive or multidimensional arrays remain
deferred.

Repeated accesses to one record-array element should use a lexical alias:

```basic
with Ghosts[G] as Ghost
  Ghost.X += 1
  Ghost.HiddenTile = Tile
  Ghost.MoveTimer -= 1
end with
```

`Ghosts[G]` is evaluated once when entering the block. `Ghost` is a reference to the original element, never a copy, so writes immediately affect `Ghosts[G]`. Amy stores one hidden two-byte pointer and addresses fields with constant offsets. Nested aliases are allowed when their names differ, and an alias can be passed to a compatible `ref RecordType` parameter. The current safe implementation accepts `with` in `Start` and in routines proven non-reentrant; recursive and NMI-reachable routines are rejected until activation-local alias pointers are implemented.

Labels and jumps inside the same record-array alias block are valid, and code may jump out of
the block. A jump from outside into the block is rejected because it would bypass initialization
of the hidden alias pointer.

An overlay part can use the same readable block form as a pointer-free lexical alias:

```basic
with ArcadeRam.Reversi as R
  R.CursorX = 4
  R.Board[R.Cell] = R.CurrentPiece
end with
```

Unlike a record-array alias, an overlay alias stores no pointer and reserves no RAM. The
compiler expands `R.` to `ArcadeRam.Reversi.` before semantic analysis, while preserving
source line numbers, strings, and comments. Fully qualified and aliased versions therefore
produce byte-identical ROMs. Alias names must be distinct while nested, and an unknown
overlay or part is rejected by the normal qualified-operand resolver.

A global record can use the same zero-cost form:

```basic
PlayerState Player
with Player as P
  P.X = 12
  P.Score += 100
end with
```

This is also lexical expansion: it reserves no alias pointer and produces the same ROM as
writing `Player.X` and `Player.Score`. A scalar or unknown root cannot become a record through
an alias; its qualified fields are rejected normally.

Current record limits:
- no local record variables yet
- no recursive or multidimensional record-array fields yet
- no whole-record assignment through pointer-backed aliases
- no whole-record comparison through pointer-backed aliases
- no arrays of BCD fields yet; BCD fields are scalar
- record array-field lengths are literal `1..255`; runtime indexes have no implicit bounds check

### RAM overlays and scenes (experimental)

An overlay reuses one physical RAM region for two or more mutually exclusive record
layouts:

```basic
record MenuMemory:
  u8 Selection
  u8 Blink
end record

record GameMemory:
  u8 PlayerX
  u8 PlayerY
  u8 EnemyX[8]
end record

overlay SceneRam
  Menu as MenuMemory
  Game as GameMemory
end overlay

SceneRam.Menu.Selection = 1
SceneRam.Game.PlayerX = 96
```

Every access must use the complete `Overlay.Part.Field` name. All parts begin at the
same address, so `SceneRam.Menu.Selection` and `SceneRam.Game.PlayerX` deliberately
refer to the same byte. The physical reservation is the size of the largest part;
the Studio RAM report also shows the sum of logical part sizes and the bytes saved.
Nested scalar records, fixed scalar arrays, and one-level record-array fields use their
normal packed record layout. A record-array element address is `field base + index *
record size`; its members retain their constant record offsets. The compiler emits
distinct `AMY_SCENE_*` aliases even where addresses match. ROM TEST & DEBUG receives
structured metadata for those aliases and displays the qualified Amy name, type, width,
and shared-overlay status. Without an active-part binding, the debugger reports the
active part as unknown instead of guessing which alias owns the live byte. A complete typed record data
table can initialize a qualified record-array field with `copy ... to Overlay.Part.Items`.
Fixed scalar arrays can be copied in either direction between local/global storage and
qualified overlay fields, for example `copy SceneRam.Game.Lookup to SavedLookup count 8`.
Packed BCD fields retain their declared digit count inside an overlay and occupy
`ceil(digits / 2)` bytes without alignment padding. Assignment, `inc`, `dec`, `+=`,
`-=`, comparisons, `clear`, same-digit-count copies, formatting, and canonical typed
printing accept complete names such as `SceneRam.Game.Score`.
Wide `u32` and `i32` scalar and array fields likewise support assignment, same-type
binary `+`/`-`, fitting integer literals, and `inc`/`dec` through complete record or
overlay-qualified names.
Qualified byte fields are also valid where the regular typed operand pipeline is used,
including canonical `Field = get char at X,Y`, `play sound Field`, `stop sound Field`,
and canonical typed printing such as `print Field at X,Y`. Legacy `get ... into Field`
is accepted for migration but still reports the canonical assignment form.

Amy currently supports one overlay group per program. Raw overlays provide allocation,
qualified access, aliases, and accurate RAM accounting. The program must use only the
part owned by its current state and initialize that part before reading it. Overlay
addresses must not be passed by `ref`, stored in address tables, or accessed from opaque
ASM in portable code.

An optional debugger binding connects overlay parts to a typed state machine without
changing program execution:

```amy
u8 ActiveScene = Scenes.Menu
bind overlay SceneRam to ActiveScene using Scenes
```

Every overlay part name must match a state name in `Scenes`, and the selector must be a
global `u8`. The compiler adds an `activeWhen` predicate to every qualified field. ROM
TEST & DEBUG then suppresses watches for inactive aliases sharing the same physical byte.
The program remains responsible for assigning `ActiveScene`; zero means no part is active.

For compiler-managed lifecycle and dispatch, declare scenes whose names match the overlay
parts:

```amy
scene Menu uses SceneRam.Menu
  on enter MenuEnter
  on frame MenuFrame
end scene

scene Game uses SceneRam.Game
  on enter GameEnter
  on frame GameFrame
end scene

text screen
enter Menu
screen on
MainLoop:
  if RequestedScene = Scenes.Game then
    RequestedScene = 0
    enter Game
  end if
goto MainLoop
```

`Scenes.Menu` and `Scenes.Game` are compiler-generated one-based `u8` constants; zero
means that no scene owns the overlay. `enter SceneName` is mainline-only. It preserves
the previous VDP R1/display state, disables NMI, marks every overlay part inactive,
calls the parameterless `on enter` subroutine, activates the new part, and restores the
previous VDP state. This guarantees that the NMI never observes a half-initialized part.

The compiler also owns the program's single `on frame` hook and dispatches it to the
active scene's parameterless frame subroutine. A project using scenes therefore cannot
declare a separate top-level `on frame`/`on vblank` hook. Frame handlers run in NMI:
keep them short and nonblocking. Their reachable call paths reject `wait`, `pause`, NMI,
screen/display changes, scene transitions, and inline ASM. Enter paths reject blocking
waits and attempts to enable NMI/display before initialization finishes. Request a scene
change through a permanent global such as `RequestedScene`; mainline performs `enter`.

Scene ownership follows the static call graph. A routine that accesses
`SceneRam.Menu.*` must be reachable from Menu only; it cannot be shared with another
scene or access `SceneRam.Game.*`. Helpers shared by several scenes remain valid when
they use only parameters, locals, constants, or permanent RAM. This fail-closed rule
prevents one scene from silently interpreting another part's bytes at the shared address.

During development, opt in to deterministic missing-initialization diagnostics:

```amy
define AMY_DEBUG_SCENE_POISON
```

Before every `enter`, the compiler marks the physical overlay bytes with `$CD` while the
active-scene selector is zero and NMI is disabled. The target initializer must overwrite
every field it needs; ROM TEST & DEBUG marks an active field still filled with `$CD` as
`POISON` when the Memory Map is opened or refreshed, and the same value can drive a
conditional breakpoint. Compiler metadata identifies `$CD` as the active debug poison.
Remove the define for release builds: no poison helper, call, or runtime cost is emitted
when the mode is absent.

See `Amy Scenes and Overlays Lab` for an executable three-scene example. See `Amy Scene
Poison Self-Test` for a ROM-tested field intentionally left uninitialized.

Same-type declarations can share one line:

```basic
u8 PlayerX = 12, PlayerY = 16, PlayerDX = 1, PlayerDY = 0
bool Ready = false, GameOver = false
bcd digits 4 Coins, Bonus
bcd digits 8 Score8, Best8
```

### Debugging With Raw Bytes

For low-level debugging, you can copy the raw bytes of a scalar numeric value into a `u8` buffer:

```basic
copy bytes of Value to Buffer
print hex Value at X,Y
format hex Value into Buffer
```

Supported scalar sources:
- `u8`, `i8`
- `u16`, `i16`
- `fixed`, `ufixed`
- `u32`, `i32`
- `fixed32`
- `fp5`

Example:

```basic
fixed32 Number32 = 1.5
u8 Bytes[4] = 0
u8 HexText[14] = 0

copy bytes of Number32 to Bytes
print hex Number32 at 0,3
format hex Number32 into HexText

print Bytes[3] at 20,3 digits 3
print Bytes[2] at 24,3 digits 3
print Bytes[1] at 28,3 digits 3
print Bytes[0] at 32,3 digits 3
```

Notes:
- numeric storage is little-endian
- `Bytes[0]` is the lowest byte
- for readable 32-bit debug output, print `Bytes[3] Bytes[2] Bytes[1] Bytes[0]`
- `print hex` and `format hex` show raw memory bytes in little-endian order, as two-digit hex pairs separated by spaces
- required hex buffer width is `bytes * 3 - 1`, so `u8` needs 2 chars, `u16/fixed` needs 5, `u32/fixed32` needs 11, and `fp5` needs 14

For `fixed32 Number32 = 1.5`, the expected raw bytes are:

```basic
000 001 128 000
```

For `ufixed Tiny = raw $0001`, `print hex Tiny at X,Y` shows:

```basic
01 00
```

That means the raw 8.8 fixed-point value is one least-significant fractional unit, not the integer value `1`.

Without `raw`, fixed-point literals are value literals, even when written in hex:

```basic
ufixed One = 1.0       ' value syntax, raw storage $0100, print hex shows 00 01
ufixed AlsoOne = $0001 ' hex value syntax, same value intent as integer 1
ufixed Lsb = raw $0001 ' exact storage bits, value is 1/256
```

Use normal decimal or hex value syntax for game logic. Use `raw $xxxx` only for
special cases where the exact memory representation matters.

This is useful for separating:
- arithmetic bugs
- formatting bugs
- sign or endianness mistakes
- copy/store bugs

Older removed forms are kept in the development archive, not in the release-facing teaching path.

### Local variables

A typed declaration **inside** a `sub` or `function` becomes a procedure-local variable.

```basic
sub update_player:
  u8 TempX = 0, TempY = 0
  i16 Delta = -1, Accel = 0
  bool Dirty = false, Clamped = false
  u8 Scores[8] = 0
  return
```

Current implementation status:
- names are case-insensitive across visible scopes; a local such as `dx` cannot reuse a visible global/data name such as `DX`
- locals are initialized at procedure entry and released logically on return
- routines with parameters, functions, recursion-sensitive bodies, arrays, BCD, `bool` packs, and `fp5` locals use an `IX`-based stack frame
- simple scalar locals in parameterless leaf `sub` routines may be placed in private static RAM (the exact internal symbol name is non-normative) to avoid the IX prologue/epilogue
- this static-local optimization is a codegen detail; the Amy source still sees procedure-local variables, not globals
- recursive and re-entrant code keeps stack-backed locals where distinct active invocations are required
- proven non-reentrant routines whose parameters and locals are scalar `u8`/`i8`/`u16`/`i16` may use the frameless static ABI: callers and callees use private static cells whose exact internal symbols are non-normative
- direct or mutual recursion, NMI reachability, `ref`, aggregate/unsupported locals, unresolved ASM transfers, and non-data project includes conservatively retain the IX stack ABI
- readable ASM project includes preserve frameless optimization only when every substantive line is provably a label, constant, or data directive; unknown syntax fails closed
- handwritten ASM transfers to parameterized Amy routines force those targets to retain the
  stack ABI; conditional byte and direct word calls are covered by five-profile ROM tests

Accepted local scalar declarations: `u8`, `i8`, `u16`, `i16`, `u32`, `i32`, `bool`, `fixed`, `ufixed`.
Local `u8` and `u16` arrays are supported.
Local `bcd` variables are supported.
Local `u32`/`i32` arrays are supported.

Important current nuance:
- stack-friendly routine parameters are implemented
- recursion is now a valid design target
- local `u32` / `i32` scalars and arrays support arithmetic, bitwise operations, shifts,
  assignments, arguments, and returns using stack-backed storage when required
- `ref u32` / `ref i32` parameters remain unsupported

Global and local `fixed`/`ufixed` arrays support indexed assignment and compound arithmetic.
The same indexed operations work for fixed-array fields in records and RAM overlays.
Natural `fixed`/`ufixed` multiplication and division expressions are also valid, for
example `Result = Left * Right` and `Result = Left / Right`. Unsigned 8.8 expressions
retain the full `0.0 .. 255.99609375` domain instead of using signed arithmetic.

Local-frame contract for inline ASM:
- inside a routine with locals or parameters, treat `IX` as the frame pointer
- inline ASM may use `AF`, `BC`, `DE`, and `HL` as scratch unless the surrounding
  Amy code needs a value you produced intentionally
- preserve `IX`, `SP`, and any RAM runtime state you do not explicitly own
- if inline ASM calls a BIOS or runtime routine, document the registers and RAM
  bytes it clobbers in a comment above the block

### Compile-time constants

```basic
const TileBase = $00
```

`const` is the only compile-time constant keyword. `let` and `var` were removed.

---

## Type Model

| Type | Meaning | Storage |
|---|---|---|
| `u8` | 8-bit unsigned value | 1 byte |
| `i8` | 8-bit signed value | 1 byte |
| `bool` | logical flag | packed bit (global) / 1 byte (local) |
| `u16` | 16-bit unsigned value | 2 bytes |
| `i16` | 16-bit signed value | 2 bytes |
| `fixed` | signed 8.8 fixed-point | 2 bytes |
| `ufixed` | unsigned 8.8 fixed-point | 2 bytes |
| `u32` | 32-bit unsigned integer | 4 bytes, little-endian |
| `i32` | 32-bit signed integer | 4 bytes, little-endian |
| `fp5` | historical 5-byte floating-point real | 5 bytes |
| `bcd digits N` | packed BCD with N decimal digits | `ceil(N/2)` bytes |
| `Type[N]` | fixed-size array | N × element size |

`fixed` ranges from `-128.0` through `127.99609375`; `ufixed` ranges from
`0.0` through `255.99609375`. Arithmetic wraps in the underlying 16-bit 8.8
representation, just like integer arithmetic on the Z80.

Array lengths may be numeric literals or compile-time constant integer expressions,
for example `const MaxClouds = 4` followed by `u8 CloudX[MaxClouds]`.

Global `bool` variables are bit-packed: up to 8 globals share one byte. Source code uses them as normal named flags.

Legacy scalar aliases such as `byte`, `word`, `integer`, `char`, `int`, `long`, and `boolean` are removed. Use canonical typed names only.

FP5 note:
- `fp5` is the canonical source spelling for the historical 5-byte real type
- `float` was removed; use `fp5`
- direct assignments between scalar `fp5` and `fixed32` values perform a numeric
  conversion; they do not copy the incompatible raw representations
- mixed `fp5`/`fixed32` arithmetic expressions remain invalid; convert through an
  assignment before doing arithmetic in the chosen type
- direct `fixed` or `ufixed` to `fixed32` assignment widens 8.8 to 16.16 without
  losing precision; `fixed32` to signed `fixed` drops the lowest 8 fractional bits
- `fixed32` to `ufixed` remains invalid because negative-value handling requires an
  explicit saturation or rejection policy

Current implemented comparison rule:

```basic
if signed Delta < 0 then ...
if unsigned Score > Limit then ...
while signed VelocityY <= 0
```

Planned canonical rule:
- typed comparisons should infer signedness automatically from the operand types
- explicit `signed` / `unsigned` should remain available only as an override or ambiguity breaker
- until that ships, use explicit `signed` / `unsigned` for `<`, `<=`, `>`, `>=`
  whenever signedness matters. Treat plain relational compares as machine-level
  compares, not as a promise of high-level signed inference.

### Expression Precedence

Use parentheses when in doubt. Amy is meant to be quick to write, not clever to
decode.

| Priority | Form | Notes |
|---:|---|---|
| 1 | `Name(...)`, `Arr[I]`, `Rec.Field` | Calls, indexing, record fields |
| 2 | unary `+`, `-`, `not`, `~` | Negation, boolean not, bit complement |
| 3 | `*`, `/`, `%`, `mod` | Implemented where the target type supports it |
| 4 | `+`, `-` | Integer/fixed/fp5 support depends on type |
| 5 | `<<`, `>>` | Fixed shift counts in current codegen |
| 6 | `=`, `==`, `<>`, `<`, `<=`, `>`, `>=` | Add `signed` / `unsigned` when needed |
| 7 | boolean conditions | Prefer simple `if Flag then` style |

Expression codegen is intentionally partial. If a form fails to compile, split
it into two assignment lines rather than hiding the machine cost in a complex
expression.

### Fixed 8.8 to Byte Casts

Amy accepts the common sprite-position cast directly:

```basic
ufixed X8 = 96.5
fixed  V8 = -2.25
u8 ScreenX = X8   ' integer byte, same as highbyte X8
i8 SpeedY  = V8   ' signed integer byte, same as highbyte V8
```

This is compiled as a high-byte load from the 8.8 value. It has no runtime helper.
Amy keeps the rule narrow on purpose: unsigned 8.8 casts to `u8`, signed 8.8 casts to `i8`. Use `highbyte`, `whole`, or an explicit temporary when the signedness is intentionally different.

Fixed 8.8 assignments use fixed-point meaning, not raw `u16` meaning:

```basic
ufixed X = 8      ' stores $0800
ufixed Half = 1.5 ' stores $0180
u8 ScreenX = X    ' reads the integer byte, 8
```

Comparisons keep full fixed-point precision. `if X > 8 then` compares `X` against `$0800`, so `8.5 > 8` is true. Use `if whole X > 8 then` only when you intentionally want to ignore the fractional byte.

### 8/16-bit Extraction Helpers

```basic
highbyte Value      ' high byte of a u16/i16/fixed
lowbyte  Value      ' low byte of a u16/i16/fixed
whole    FxPos      ' integer part of a fixed / future fixed
fraction FxPos      ' fractional byte of a fixed / future fixed
highword Value32    ' upper 16 bits of a u32/i32
lowword  Value32    ' lower 16 bits of a u32/i32
```

---

## Subroutines and Functions

### Sub (no return value)

```basic
sub DrawBorder:
  fill row 0 from 0 count 32 with $01
  return

sub DrawSprite(u8 X, u8 Y, u8 Pattern):
  set sprite 0 to Y,X,Pattern,15
  update sprites
  return
```

```basic
DrawBorder
DrawSprite(10, 20, 1)
```

Forms:

```basic
sub Name:
sub Name(Type param, Type param, ...):
end sub
exit sub
```

Parameters are passed by value unless prefixed with `ref`. Value parameters support
`u8`, `i8`, `u16`, `i16`, `fixed`, and `ufixed`; literal and computed arguments are copied into
the routine's ABI storage before the call. Both frameless static and IX-stack calls are
five-profile ROM-tested.

Behavior:
- `end sub` closes the current subroutine explicitly
- if a `sub` reaches another `sub` before `end sub`, execution falls through into the next subroutine body
- if the file ends with an open `sub`, Amy adds the closing return implicitly at end of file
- `function` blocks close after a terminal `return Value`; `end function` was removed

Subroutine termination style:
- every ordinary `sub` should end with `return`, `exit sub`, `goto Label`, or
  `loop forever` before the next `sub` / `function`
- do not write `end sub` immediately after `return`; it is redundant and hidden
  by Studio examples
- do not rely on accidental fall-through; on Z80, code keeps executing until a
  `ret`, `jp`, branch, or loop stops it
- intentional fall-through is allowed only for low-level ASM-style tricks and
  should be marked with a comment immediately before the next `sub`

```basic
sub DrawHead:
  put char HeadTile at X,Y
  ' intentional fall-through into DrawTail
sub DrawTail:
  put char TailTile at OldX,OldY
  return
```

Removed procedure aliases and parser-level cleanup leftovers are summarized near the end of this document.

### Ref parameters (by reference)

`ref` passes the *address* of a variable instead of a copy, so the sub can
mutate the caller's data — the Amy equivalent of a C pointer parameter
(`void move(Actor *a)`). Records are always passed `ref`; scalars may be.

```basic
record Actor:
  u8 X
  u8 Y
  u16 Score
end record

Actor Hero
Actor Foes[3]
u8 Lives = 3

sub MoveActor(ref Actor A, u8 Dx):
  A.X += Dx
  A.Score += 10
  return

sub LoseLife(ref u8 V):
  dec V
  return
```

```basic
MoveActor(Hero, 3)      ' pushes @Hero (a constant address)
MoveActor(Foes[1], 2)   ' constant index folds to a constant address
LoseLife(Lives)
LoseLife(Hero.Y)        ' any addressable byte works
```

Rules:
- allowed target types: `ref u8`, `ref i8`, `ref u16`, `ref i16`, and `ref RecordType`
- a record parameter **must** be `ref` (records are never copied)
- the argument must be an addressable variable of the exact same type:
  a global, a record field, an array element, a local, or another `ref` parameter
  (forwarding). Literals and expressions are compile errors.
- overlay-qualified fields cannot be passed by `ref`; their address has part-scoped
  lifetime and must not cross a routine boundary. Pass a copied value instead.
- `ref` is not supported for `u32`, `i32`, `fixed`, `fp5`, `bool`, `bcd`, or
  whole arrays (yet) — declaring one is a compile error, never wrong code

Representative generated code (non-normative) — no runtime helper, no copy; the slot holds a 2-byte address
and every access dereferences through HL with constant offsets:

```asm
; caller: MoveActor(Hero, 3)
    ld hl,$0003
    push hl            ; Dx
    ld hl,$7020        ; @Hero — folded to a constant
    push hl
    call AMY_UPROC_MoveActor

; callee: A.Y += 1   (Y is at offset 1 in Actor)
    ld l,(ix+4)        ; load the pointer from the stack slot
    ld h,(ix+5)
    inc hl             ; + field offset (inc hl for offsets 1-3, ld de,N above)
    ld a,(hl)
    add a,1
    ...
    ld (hl),a
```

### Function (returns a value)

```basic
function AddTwo(u16 A, u16 B) as u16
  return A + B

function IsReady as u8
  return 1
```

```basic
Score = AddTwo(3, 4)
if IsReady == 1 then
  print at 10,8, "GO"
end if
```

No-argument functions can be used by name when no variable has the same identifier.

Forms:

```basic
function Name as Type
function Name(Type param, ...) as Type
  return Value
```

Current style rule:
- call procedures directly as `Name(...)` or `Name`
- use `Name(...)` directly where an expression value is wanted
- `call Name(...)` is removed from the language surface
- do not use a procedure-style call when you actually need the return value
- the preferred function terminator is `return Value`; do not write
  `end function` immediately after a terminal return
- a top-level terminal `return Value` closes the function immediately; declarations
  and executable mainline code may follow it
- a function that reaches the next routine or the end of file without a terminal
  `return Value` is a compile error

`return` accepts an expression, not only a plain variable or literal. Matching `u32` and `i32`
binary expressions are supported in function returns and function arguments, including recursive
calls; their intermediate values are preserved across nested calls.

`fixed` and `ufixed` functions preserve their declared 8.8 domain in both normal and inline
returns. Multiplication and division expressions may be returned directly, for example
`return Value / 2.0`; callers may immediately use that result in another fixed expression.
Computed fixed-point arguments use the declared parameter domain as well, including recursive
calls. Literal arguments are scaled as 8.8 values, so `Move(1.5)` passes raw `$0180`, not
the unscaled integer `$0001`.

Recursion uses the ColecoVision RAM stack and has no runtime overflow guard. Wide parameters and
locals consume more stack per call, so keep recursion shallow or use an iterative loop when the
maximum depth is not tightly bounded.

`fp5` functions use a dedicated five-byte return cell that is allocated only when
the project declares an `fp5` return. The caller copies the result immediately, so
later floating-point operations cannot overwrite it through the shared fp5
accumulators. A return may use an fp5 variable, a compatible numeric value, or
another fp5 function call. For a compound fp5 calculation, assign the expression
to an fp5 variable first and return that variable.

```basic
function MakeScale(fp5 Base) as fp5
  fp5 Result = 0
  Result = Base
  Result *= 1.5
  return Result

function RelayScale(fp5 Base) as fp5
  return MakeScale(Base)
```

```basic
function board_index(u8 X, u8 Y) as u8
  return (Y << 3) + X

function get_cell(u8 X, u8 Y) as u8
  return Board[board_index(X, Y)]
```

---

## Control Flow

### If / Then

```basic
if Score > 10 then
  print at 11,11, "PASS"
elseif Score > 5 then
  print at 11,11, "OK"
else
  print at 11,11, "FAIL"
end if
```

One-line guard form:

```basic
if N == 0 then return 0
if Done == 1 then exit sub
if Skip == 1 then continue for
if Ready == 1 then Score = 42
if Ready == 1 then StartRound
```

One-line `elseif` / `else` chains are supported when each branch contains one inline statement:

```basic
if Cell = CpuPiece then Score += 5 elseif Cell = HumanPiece then Score -= 5
if A = 1 then return 10 elseif A = 2 then return 20 else return 30
if Key = 1 then goto Menu elseif Key = 2 then goto Game else goto Done
```
Legacy machine-style branch (still valid):

```basic
if Score > 10 goto ShowPass
```

Signed / unsigned variants:

```basic
if signed Delta < 0 then ...
if unsigned Counter > Limit then ...
if not Ready then ...
```

Boolean conditions:

```basic
if Ready then ...
if not Ready then ...
```

### Select Case

```basic
select case Key
case 1
  DoOne
case 2 to 4
  DoRange
case ExitOpenTile
  DoExit
case blastClears
  ClearTile
case else
  DoDefault
end select
```

Function calls are valid as the case expression: `select case AddTwo(1,2)`.
`case` values may be numeric literals, constants, ranges, or a declared
`tile type`; a tile type expands to all tile values in that group.

The block closes with `end select`. `endselect`, `default`, and `case default`
were removed; use `end select` and `case else`.

### For / Next

The loop variable must already be declared as a scalar integer variable. It is not
created implicitly by the `for` statement.

```basic
u8 I = 0
for I = 0 to 31
  put char Tiles[I] at I,10
next
```

```basic
u8 I = 0
for I = 0 to MaxClouds - 1
  set sprite I + 1 to Clouds[I].Y - 1, Clouds[I].X - 8, CloudPattern, 15
next I
```

```basic
u8 I = 0
for I = 7 downto 0
  hide sprite I
next
```

```basic
i8 File = 0
for File = 8 to 0 step -2
  print File at 0,4 digits 2
next
```

```basic
u8 Depth = 0
for Depth = 0 to MaxDepth()
  continue for        ' skip to next iteration
  exit for            ' break out
next
```

`next I` is preferred when the loop variable is useful documentation. The opening `for` line may end with `:` if desired.

Fixed global arrays and qualified overlay record-array fields support element iteration
with an explicit byte index:

```basic
Actor Flies[3]
u8 I = 0

for each Fly, I in Flies
  Fly.X += Fly.DX
next
```

`Fly` is an alias for `Flies[I]`, not a copied record, so field assignments mutate the original array element. For global record arrays, Amy lowers this form to a counted loop containing the same pointer-backed alias as `with Flies[I] as Fly`: the element address is computed once per iteration and one hidden two-byte pointer is reused by every field access. Qualified overlay record arrays use pointer-free qualified lowering. Primitive arrays retain direct indexed lowering. The index must currently be declared explicitly as `u8`, and the source must be a fixed array with a literal nonzero length. Local/ref arrays and an omitted index are rejected clearly.

The canonical Amy syntax always includes the comma and explicit index:

```basic
for each Element, Index in GlobalArray              ' valid
for each Element, Index in Overlay.Part.RecordArray ' valid
```

The shorter form used by some other languages is not currently Amy syntax:

```basic
for each Element in GlobalArray          ' rejected: explicit u8 index required
```

Overlay record-array fields support the same canonical form:

```basic
for each Actor, I in SceneRam.Game.Actors
  Actor.X += 1
next Actor
```

The overlay form lowers to a counted loop whose element references remain fully
qualified. It therefore allocates no hidden alias pointer, but repeated field accesses
may recompute the indexed address. Use `for each` for clarity and measure very hot loops.

Qualified primitive `u8` array fields can also act as buffers for VRAM reads, including
`Buffer = get count N at X,Y`, `get frame ... into Buffer`, and `read vram ... into Buffer`.
For constant frame dimensions, the compiler verifies that the buffer contains at least
`width * height` bytes and rejects undersized destinations before assembly.

Qualified fields can also be loop counters and mutation targets:

```basic
inc SceneRam.Game.Enemies[I].X
add SceneRam.Game.Enemies[I].X by 2
for SceneRam.Game.Counter = 0 to 3
  SceneRam.Game.Sum += SceneRam.Game.Counter
next SceneRam.Game.Counter
```

This capability does not mean every temporary should move into an overlay. A frequently
accessed qualified counter may require repeated address calculations. Measure ROM size
and cycles: keeping one hot counter permanent can be preferable when saving one RAM byte
would add code and execution time.

`end for` and `for I from ...` were removed; use `next` and `for I = ...`.

Current behavior notes:
- `step 0` is invalid
- `downto ... step N` is supported
- `to ... step -N` is supported
- the loop exits cleanly when the next step crosses the bound; it does not require landing exactly on the final value

Forms:

```basic
for Var = start to end
for Var = start to end step N
for Var = start downto end
for Var = start downto end step N
next Var
continue for
exit for
```

### While / End While

```basic
while Counter <> 0
  dec Counter
end while
```

```basic
while signed DeltaX <= 0
  inc DeltaX
end while
```

Forms:

```basic
while condition
end while
continue while
exit while
```

`wend` was removed; use `end while`.

### Do / Loop

```basic
do
  wait
  read joypad 1 into Pad1
loop

do while Ready
  Update
loop

do
  Step
loop while Running

do
  Step
loop until Done
```

Forms:

```basic
do
do while condition
do until condition
loop
loop while condition
loop until condition
end do
continue do
exit do
```

### Goto / Labels

```basic
MainLoop:
  wait
  goto MainLoop
```

`label Name:` was removed; use `Name:` directly.

### On … Goto / Gosub (indexed dispatch)

```basic
on Choice goto Title, Game, Credits
on Action gosub Init, Update, Draw
```

Selector is 1-based. Out-of-range or `0` falls through.

Amy compiles the target list into a fixed ROM address table and performs one bounded indexed dispatch. `goto` ends in `jp (hl)`; `gosub` uses a small indirect-call trampoline so the selected routine returns normally. There is no writable function pointer, target lookup runtime, or bounds-check helper.

For a state machine shared with `on vblank`, prefer a `u8` selector. An 8-bit state change is atomic on Z80, unlike replacing a writable 16-bit routine address while NMI may read it:

```basic
u8 VBlankState = 1
on vblank DispatchVBlank

sub DispatchVBlank:
  on VBlankState goto TitleVBlank, GameVBlank, GameOverVBlank
  return

TitleVBlank:
  ' Keep every NMI state short and non-blocking.
  return
GameVBlank:
  return
GameOverVBlank:
  return
end sub
```

These remain intentional low-level dispatch tools for predictable 8-bit game-state code. Unlike plain `gosub`, indexed `on Expr gosub` is part of the supported language surface.

### Typed State Machines

A typed state machine gives names to state constants and binds each state to
an existing subroutine:

```basic
state machine BossBehavior:
  Sleeping calls BossSleep
  Walking calls BossWalk
  Charging calls BossCharge
  Attacking calls BossAttack
end state machine

u8 BossState = BossBehavior.Sleeping

dispatch BossState using BossBehavior
```

`BossBehavior.Sleeping` through `BossBehavior.Attacking` are compile-time constants
numbered `1` through `4`. This matches Amy's established one-based indexed dispatch;
value `0` means no active state. The machine consumes no RAM. `dispatch` compiles through the
same bounded ROM-table mechanism as `on ... gosub`: an out-of-range selector performs
no call and execution continues after the dispatch.

Every `calls` target must name an existing subroutine. Handlers change the state by
assigning another qualified constant, for example:

```basic
sub BossSleep:
  BossState = BossBehavior.Walking
  return
end sub
```

State-machine declarations are global, must contain at least one uniquely named state,
and do not create timers, NMI hooks, mutable function pointers, or hidden state RAM.
Use ordinary Amy variables and named timers when those are required. This deliberately
small surface keeps state dispatch predictable on Z80.

For one through eight states, Amy emits a linear `DEC A` / `JP Z` dispatch and pushes
one synthetic return address so the selected handler returns normally. Larger machines
use a word-address table and the same pushed-return technique with `JP (HL)`. The older
general-purpose `on ... goto/gosub` codegen remains unchanged for compatibility.

### Loop Forever

```basic
loop forever
```

---

## Arithmetic and Assignment

### Set / Inc / Dec / Clear

```basic
Score = 0
PlayerX = StartX
Flag = true
Flag = false
Stars[I] = 1
dec Lives
clear Score
clear Counter32
toggle Ready
```

`toggle` flips a boolean or `u8` flag: `0 → 1`, non-zero → `0`.

### Add / Sub

```basic
Lives -= 1
Score += 10
Score -= 5
inc Score
dec Score
Coins += Bonus
Coins -= Delta
```

Works on `u8`, `u16`, `i8`, `i16`, `bcd`, `u32`, `i32`, `fixed`, `ufixed`,
`fixed32`, and `fp5` where the operator is listed in the coverage table below.
Dispatch is by destination type.

BCD notes:
- `bcd digits 4 Timer = StartTimer` accepts non-negative decimal literals or named `const` values that fit the digit count
- `Score = 0` clears a BCD value canonically
- `Score += 25` and `Score -= 5` accept decimal literals or named `const` values
- `Score = StartScore` accepts a named `const` value (encoded as BCD at compile time)
- `if Score > StartScore goto Label` accepts a named `const` on the right side
- `Score += Bonus` and `Score -= Delta` accept `u8` or `i8` sources
- `Score += OtherScore` and `Score -= OtherScore` accept same-size BCD sources
- `bcd digits 5 Credits` stores 5 displayed decimal digits in packed BCD
- `bcd digits 8 Score8` gives an 8-digit BCD value
- current implementation range is `bcd digits 1` .. `bcd digits 12`
- BCD is a packed decimal score/timer type, not a general integer expression type
- BCD subtraction underflow clamps to zero
- BCD addition overflow is currently stored modulo the declared packed byte count; treat this as wrap/truncate behavior and choose enough digits for the maximum score
- storage and ASCII formatting are ROM-tested for odd and even widths from 1 through 12 digits, including zero, maximum values, underflow, and overflow, in all five optimization profiles

BCD canonical surface:

```basic
bcd digits 4 Score = 0
bcd digits 4 Timer = StartTimer

Score = 0
Score = StartScore
Score = OtherScore
Score += 100
Score -= 5

if Score > 0 goto HasScore
if Score >= StartScore goto Bonus
if Score > BestScore goto NewBest

print Score at 0,0
print at 0,0, "SCORE:", Score
format Score into ScoreText
```

BCD current limits:
- `inc` and `dec` adjust BCD values by decimal one and preserve packed-decimal normalization
- no `bcd *=`, `bcd /=`, or `bcd %=`
- scalar BCD fields are supported in records and overlays; arrays of BCD remain unsupported
- BCD-to-BCD assignment and copy require identical declared digit counts
- no local BCD non-zero initializer
- no implicit assignment from `u16`, `u32`, fixed, or fp5 runtime values
- no general BCD expressions such as `Score = Score + 10`
- indexed byte reads such as `Score[0]` are for debugging/inspection only


Legacy `u32 zero/copy/add/inc/sub` prefix commands remain accepted for source migration.
New code should use `clear`, assignment, `+=`, `-=`, `inc`, and `dec` instead.

### Shift

```basic
Value <<= 3
Score >>= 2
```

`u8`/`i8` shifts accept fixed counts from 1 to 7. `u16`/`i16` expressions
and compound assignments accept fixed or unsigned byte counts; counts of 16 or
more produce zero for left/logical-right shifts or all sign bits for arithmetic
right shift.
`u32`/`i32` expressions and compound assignments accept fixed or unsigned byte
shift counts. Counts of 32 or more produce zero for left/logical-right shifts;
arithmetic `i32 >>` produces all sign bits. Right shift is logical for unsigned
types and arithmetic for signed types.

Wide integer bitwise forms are supported consistently:

```basic
u16 WordFlags = $FF0F
WordFlags &= $0F0F
u32 Flags = 4278255360
u32 Mask = 252645135
u32 Result = Flags & Mask
Result |= $00FF0000
Result ^= $0000FFFF
Result = ~Flags
Result <<= 4
Result = Flags >> ShiftCount
```

The same operations accept `u32`/`i32` globals, array elements, record fields,
and qualified overlay fields. Bitwise operations preserve raw two's-complement
bits; only signed right shift treats the high bit specially.
Targets may be plain variables, record fields, indexed record fields, or
overlay-qualified fields.

Byte targets also accept compound masks:

```basic
Actor.Flags &= $0F
SceneRam.Game.Flags |= $80
```

Legacy shift aliases are removed from the active language surface. Use `<<=` and `>>=`.

### Bounce / Rebound

```basic
bounce PlayerX by DeltaX between 0 and MaxX
```

Moves an 8-bit position using a signed byte delta and reverses the delta at bounds.
If the next step would skip past a bound, `bounce` clamps the position to that
bound and reverses the delta; an exact hit on the bound is kept as-is until the
next `bounce`.
Common deltas are `1`/`$FF`, `2`/`$FE`, `3`/`$FD`, etc.
`PlayerX` and `DeltaX` may be byte variables or indexed byte-array elements such
as `CloudX[C]` and `CloudDX[C]`.

### Min / Max / Clamp

```basic
Counter = min(Counter, 0)
Counter = max(Counter, 255)
clamp PlayerX between 0 and 31
```

`min(A, B)` returns the smaller value. `max(A, B)` returns the larger value.
The older `min Var with Value` / `max Var with Value` statements still compile
during cleanup, but code should use expression assignment.

### Fill / Copy arrays

```basic
fill array Board with 0
fill record array Ghosts field Vulnerable with 0
fill array Tiles repeating Pattern
fill array Tiles repeating Pattern count 32
copy Board to Backup
copy Board count 8 to Backup
shift array SnakeX down 1
shift array SnakeX up 1
reverse array Board
reverse array Board from 2 count 6
```

Current limits: `u8` arrays. `count` and slice values must be compile-time constants. A fixed `fill array` count from 1 to 255 uses a compact Z80 `DJNZ` loop. `fill record array ... field ...` fills one byte-sized `u8`, `i8`, or `bool` field across a fixed record array with a constant or byte value, advancing directly by the record size.
The old `copy array Dst from Src` spelling was removed; use `copy Src to Dst`.

### Multiply / Divide / Sqrt

```basic
Counter *= 3
Counter /= 3
Remainder = Counter % 3
Counter %= 3
Root = sqrt(625)
Root32 = sqrt(Position32)
```

`Counter *= N`: supported by the destination type table below.
`Counter /= N`: integer division truncates toward zero for signed targets. A divisor that is
provably zero is rejected at compile time. A runtime divisor whose value becomes zero stores
`0`, without adding a trap or diagnostic code to the ROM.
`A % B` / `A mod B`: integer remainder for `u8`, `i8`, `u16`, and `i16`.
`Var %= B` is the in-place form. A provably-zero divisor is rejected; a runtime zero divisor
stores `0`. Signed modulo uses
truncation-toward-zero division and keeps the sign of the dividend:
`-7 % 3 = -1`, `7 % -3 = 1`, `-7 % -3 = -1`.
`sqrt`: either unsigned `u16`-sized input with `u16` result, or `fixed32` / `fp5`-capable source into a matching target. `A = sqrt(B)` is the canonical form.
Prefer `<<=` / `>>=` for powers of two.

`multiply`/`mul`/`divide`/`div` statement forms were removed; use `*=` and `/=`.

### Random

```basic
Pick = random(49) + 1
Die = random(1, 6)
Tile = random(2) + 16
Noise = random()
FloatNoise = random(10, 20)
```

Preferred current direction:
- use expression-style `random(N)` when you want a bounded integer in an assignment or formula
- `random(N)` returns `0..N-1`
- `random(A, B)` returns an inclusive integer value in `A..B` for byte-style integer targets
- zero-argument `random()` is valid only for `fp5` and `fixed32` targets; integer code must supply one or two arguments
- integer random values use the Coleco BIOS random service, with an Amy zero-seed guard before calling it; the exact BIOS RAM address is a non-normative implementation detail
- `Fp5Var = random(A, B)` returns an `fp5` value in `A..B` using `A + random() * (B-A)`
- `random between A and B into Var` was removed; write `Var = random(A, B)`
- use `Fp5Var = random()` for an `fp5` fractional sample in `0.0 .. <1.0`
- use `Fixed32Var = random()` for a `fixed32` fractional sample

### U32 helpers

```basic
u32 copy Seed32 to Counter32
u32 add Addend32 to Counter32
u32 inc Counter32
u32 sub Addend32 from Counter32
if unsigned Left32 > Right32 goto Win
```

The canonical Amy shorthand also works:

```basic
clear Counter32
Counter32 = Seed32
Counter32 += Addend32
inc Counter32
Counter32 -= Addend32
Total32 = Counter32 + Addend32
Difference32 = Counter32 - Addend32
Product32 = Counter32 * Addend32
Quotient32 = Counter32 / Addend32
Remainder32 = Counter32 % Addend32
Next32 = Counter32 + 5
```

Simple `+`, `-`, and `*` binary expressions are supported for operands and destinations
of the same `u32` or `i32` type. A fitting integer literal is also accepted as
either operand. The compiler stages both operands, so destination
aliasing such as `Counter32 = Counter32 + Addend32` is safe. Operands may be
`u32`/`i32` variables or elements of matching wide arrays. Legacy operations also
accept compatible 4-byte little-endian `u8` arrays. Scalar `u16` values are not
implicitly widened into this arithmetic. Multiplication keeps the low 32 bits;
overflow wraps modulo 2^32 for both signed and unsigned values.
Binary `/` and in-place `/=` are available for both `u32` and `i32`. A constant zero divisor
is rejected at compile time; a runtime divisor whose value is zero stores `0`. Signed division
truncates toward zero. The overflow case
`-2147483648 / -1` wraps to `-2147483648`, matching 32-bit two's-complement arithmetic.
Both `u32` and `i32` also support the equivalent in-place multiplication `*=`.
Binary `%` and in-place `%=` are available for both types with the same constant/runtime-zero
policy. Signed remainder follows the dividend sign, consistent with
division that truncates toward zero (`-100 % 7` is `-2`).

Fixed-size `u32` and `i32` arrays use four little-endian bytes per element and accept
constant, `u8` variable, and supported `u8` expression indexes:

```basic
u32 Scores[4] = 0
u8 Player = 1
Scores[Player] = Scores[0] + 50000
Scores[Player + 1] = Scores[Player] - 10
```

Constant indexes are bounds-checked while transpiling. Runtime indexes remain the
programmer's responsibility and must stay within the declared array.

`fixed`/`ufixed` arrays support declaration, whole-array initialization, element reads,
indexed assignment, and compound arithmetic. This includes global and local arrays plus
fixed-array fields in records and RAM overlays.

`Amy Math Demo` is ROM-tested under all five optimization profiles. Its `u32` chain,
integer square roots, and packed-BCD result are verified directly in emulated RAM.

---

## Screen / Graphics / VDP

```basic
screen off
screen on
screen on no nmi
display off
display on
nmi off
nmi on
```

`screen off/on` is the normal combined path (display + interrupt).  
`display off/on` changes only the visible display bit.  
`nmi off/on` changes only the VDP interrupt-enable bit.
In normal Amy code, prefer `screen on/off`.

Per-VBlank Amy hook:

```basic
on vblank GameTick

sub GameTick:
  ' Keep this short: controller state, counters, music-safe game ticks.
  return
```

`on vblank SubName` is a top-level declaration. The target must be a parameterless
`sub`, not a function and not a hardware `sub Nmi`. Amy keeps the real `Nmi:`
label generated by the runtime, preserves the main Z80 register sets around the
hook, and uses `NO_NMI` as a reentrancy guard while the hook runs. Keep hook code
short; large VRAM updates still belong in the main loop after `wait` unless you
know the VDP timing contract you are using. `on frame SubName` is accepted as a
compatibility alias, but `on vblank` is the canonical spelling because it cannot
be confused with indexed `on Expr goto/gosub` dispatch.

Named Amy timers:

```basic
timer EnemyTimer every 5 ticks
timer DoorTimer after 120 ticks stopped

main_loop:
  wait
  if timer EnemyTimer then MoveEnemies
  if timer DoorTimer then CloseDoor
  goto main_loop

start_game:
  start timer DoorTimer
  goto main_loop
```

Amy timers are static and named. Each timer reserves fixed RAM and is updated by
the generated NMI only when the program declares at least one timer. `every N`
repeats after each timeout; `after N` fires once and then becomes inactive.
Adding `stopped` or `inactive` keeps the timer reserved but disabled until
`start timer Name`. `stop timer Name` disables it and clears any pending signal.
`if timer Name then ...` tests and consumes the signal explicitly, so timers do
not call game code from NMI and do not create a hidden scheduler. This keeps game
state decisions in the main loop and avoids the dangerous dynamic allocation and
`FREE_SIGNAL` timing issues of the ColecoVision BIOS timer routines.

A `tick` is one processed VBlank update: normally 60 per second on NTSC and 50
per second on PAL. Timers pause while NMI is disabled or while Amy deliberately
guards a critical section, just as BIOS timers stop advancing when a cartridge
does not call `RunTimers`. `start timer Name` safely resets an active timer before
rearming it; `stop timer Name` first makes it inactive and then clears its count
and pending signal, so an NMI cannot leave a partial count or ghost expiration.

Additional forms:

```basic
screen off no nmi
screen on no nmi
```

`enable nmi` and `disable nmi` were removed; use `nmi on` and `nmi off`.

VDP side-effect contract:

| Command | Display bit | NMI bit | Mode/registers | VRAM |
|---|---|---|---|---|
| `screen on/off` | changes | changes | R1 shadow/write | no upload |
| `display on/off` | changes | unchanged | R1 shadow/write | no upload |
| `nmi on/off` | unchanged | changes | R1 shadow/write; `nmi on` acknowledges VDP status | no upload |
| `graphics mode ...` | usually blanks | mode default | mode registers/table shadows | mode-specific setup |
| `text screen` | blanks until `screen on` | mode default | standard 32x24 text setup | font, 32 color groups, cls |
| `show picture Name` | blanks, then shows | unchanged unless mode helper changes it | bitmap setup | uploads picture |
| `upload picture Name` | unchanged | protected around VRAM upload | no display policy | uploads picture |
| `upload picture Name with nmi` | unchanged | preserves NMI state | benchmark/special-case policy | uploads picture |

Use `display off` / `display on` when you only want to hide VRAM changes from
the player. Use `screen on` when you also want the normal NMI-enabled frame loop.

### Graphics modes

```basic
text screen
tile screen
mode 2 screen
bitmap screen
bitmap screen color $F0
picture screen
multicolor screen
backdrop sky blue
```

Canonical forms:
- `text screen`
- `tile screen`
- `mode 2 screen`
- `bitmap screen` / `bitmap screen color $F0`
- `picture screen`
- `multicolor screen`

Old technical forms still compile in some cases during cleanup, but examples
should not use them:
- `graphics mode 1 text`
- `graphics mode 1 color $F0`
- `graphics mode 2 text`
- `graphics mode 2 screen`
- `graphics mode 2 bitmap`
- `graphics multicolor` / `graphics mode 3 multicolor`

`bitmap screen` is the normal drawable bitmap surface for `pset`, `preset`,
`line`, and `circle`; its default color byte is `$F0`, so the color clause is
optional.

`picture screen` is the raw Graphics II picture/table surface used before
uploading or decompressing full-screen pattern/color assets.

`mode 2 screen` is the raw Graphics II / TMS9918A Mode 2 table surface for
hybrid screens driven by the NAME table while the program manages PATTERN and
COLOR thirds itself. It only sets the VDP mode/table registers. It does not load
ASCII, duplicate pattern thirds, duplicate color thirds, fill colors, or clear
the name table. Use this for Dacman-style screens where tiles are placed through
the NAME table, but different screen thirds may need independent color tables
(for example bronze/silver/gold medal colors sharing the same patterns).

### Temporal 120-color pictures

```basic
picture screen
' Upload the two prepared 6 KB banks before enabling the effect.
120 colors on
screen on

' Later, before displaying an ordinary Graphics II picture:
120 colors off
```

`120 colors on` enables the historical 120C temporal display technique. Once per
VBlank, Amy alternates the TMS9918A table registers between these two phases:

| Phase | R3 COLOR table | R4 PATTERN table |
|---|---:|---:|
| A | `$7F` (`$0000`) | `$04` (`$2000`) |
| B | `$FF` (`$2000`) | `$00` (`$0000`) |

The two 6 KB VRAM banks are therefore dual-purpose: each bank is interpreted as
pattern bytes in one frame and color bytes in the other. This is frame-temporal
alternation, not a scanline raster effect. On NTSC each phase is visible at 30
Hz; on PAL each phase is visible at 25 Hz.

`120 colors off` stops the alternation and restores standard Graphics II tables
(R3=`$FF`, R4=`$03`). The generated NMI preserves registers and remains compatible
with `on frame`, controllers, music, and sound. Projects that never use either
command include no 120C runtime and reserve no 120C RAM.

The commands do not convert an ordinary picture into 120C data. The uploaded
banks must have been authored or converted specifically for the dual pattern/color
interpretation; enabling the effect over unrelated VRAM data produces an invalid
image.
`text 40 screen` is intentionally not enabled yet. The VDP has a real 40-column
text mode, but Amy's current text I/O helpers calculate `y * 32 + x`; enabling
the screen setup before 40-column `print at` / `put` address math exists would
compile misleading programs.

`graphics bitmap` and `graphics mode1` were removed; use `picture screen` for
raw picture-table setup and `bitmap screen` for drawable bitmap graphics.

`backdrop Color` writes VDP register 7, the TMS9918A backdrop/border color.
This is separate from Mode 2 text color-table commands such as
`fill mode 2 text color with $F0`, and from character backgrounds in
`set text colors ... on ...`.

`set text colors Foreground [on Background] [at N] [count M]` writes the
standard text color table. If `on Background` is omitted, the background nibble
is `transparent` (`0`), so `set text colors cyan at 6 count 2` writes `$70`.

`text screen` expands to the standard 32x24 ColecoVision text bootstrap:
- `graphics mode 1 text`
- `load default ascii`
- fill the 32-byte text color table with `$F0`
- `cls`

The expanded form is a compiler/library contract, not the style to write in
new Amy code. Use `text screen` unless you are deliberately testing the low
level VDP surface. Mode setup routines blank the display by default,
so `screen off` is normally redundant immediately before `text screen`,
`bitmap screen`, `picture screen`, `mode 2 screen`, or `multicolor screen`.

`load default ascii` also accepts legacy style flags:
- `load default ascii normal`
- `load default ascii bold`
- `load default ascii italic`
- `load default ascii bold italic`

When using a styled default ASCII font in Mode 2, follow it with
`duplicate mode 2 patterns` if you want the styled glyphs copied to all three
pattern thirds.

`tile screen` expands to the Mode 2 text-style tile surface:
- `graphics mode 2 text`
- `load default ascii`
- `duplicate mode 2 patterns`
- fill the first 2KB color third with `$F0` (8 color bytes per tile/char)
- `cls`

Use `tile screen` when you want Graphics II pattern thirds with tile-style
8-byte-per-character colors and ordinary text/tile setup. PATTERN data is
duplicated across the three screen thirds; COLOR is initialized for the first
256-tile third ($0800 bytes). Use `mode 2 screen` when the program must control
which PATTERN and COLOR thirds are duplicated or left independent.

Explicit Mode 2 table helpers:

```basic
duplicate mode 2 patterns
duplicate mode 2 colors
```

`duplicate mode 2 patterns` copies the first PATTERN third into the second and
third thirds. `duplicate mode 2 colors` does the same for COLOR data. Do not use
`duplicate mode 2 colors` when each third intentionally has distinct colors.

`graphics mode 2 text` remains available as the explicit low-level setup alias
for `mode 2 screen`, but new code should use `mode 2 screen` because it states
the actual VDP surface instead of implying that text setup has already happened.
### Name table / screen pages

```basic
cls
set default name table vram $1C00
set screen pages vram.name and vram $1C00
swap screens
```

`set screen pages Display and Write` is the Amy form of the old devkit
`screen(display, write)` helper. `Display` is the name table currently shown by
the VDP; `Write` is the name table used by normal tile/text drawing commands.
`swap screens` exchanges those two pages, which is the classic two-buffer name-table trick used by old getput/lib4ksa projects such as Santa's Gift Run.

When screen pages are split, prefer current-page drawing commands (`print`,
`put char`, `put frame`, `cls`, `fill row`) for the hidden/write page. Direct
VRAM commands such as `fill V count N to vram.name + Offset` always target the physical
address named in the command; they do not automatically follow the current write
page.

Legacy porting signal: old C code that alternates calls like
`screen(name_table1, name_table2)` and `screen(name_table2, name_table1)` should
be ported with `set screen pages ...` plus `swap screens`, not with direct redraw
to `vram.name`.

### VRAM direct access

```basic
vpoke vram.name + $0000, $41
vpeek vram.name + $0000 into Value
fill Value count N to vram.name + Offset
fill $20 count 8 to vram.name + $00EC
fill Value count N to vram.pattern
fill Value count N to vram.color
fill Value count N to vram.name
merge PatternBytes count 8 to vram.pattern mask $F0 xor $0F
fill row 10 from 0 count 32 with $20
fill vram.name with sequence $00..$FF repeat 3
fill mode 2 text color with $F0
fill full mode 2 text color with $F0
load mode 2 text colors LegacyColorTable
ByteVar = vdp.status
```

`fill mode 2 text color with X` fills the first 2KB Mode 2 color third, then duplicates it into the second and third thirds.  
`fill full mode 2 text color with X` fills the full 6144-byte color table directly as one contiguous reset.  
`load mode 2 text colors Source` uploads a legacy compact 32-byte color table by repeating each byte 64 times into the active 2KB Mode 2 text color table, matching old-devkit `load_color`. Use this for ports that have a 32-byte `COLOR` table instead of an already-expanded VRAM color table.  
Both fill commands produce the same final bytes on the standard Amy Mode 2 layout; the non-full form matches the historical duplicated-thirds text setup path, while `full` is the direct total-reset form.

### Copy / Decompress / Show

```basic
copy Charset to vram.pattern
copy PixelBitmaps + StarOffset count 8 to vram.pattern + 128
copy Source count 32 to vram $0800
copy vram.name count 64 to Buffer
copy vram.name to Buffer count 64
merge PatternBytes count 8 to vram.pattern mask $F0 xor $0F
decompress Asset to vram.pattern        ' asset codec inferred when declared with codec metadata
decompress zx0   Table   to vram.pattern ' explicit codec for raw/data labels
decompress rle   Table   to vram.color
decompress mdkrle Table  to vram.name
decompress pletter Asset  to vram.name
decompress dan1  Asset   to vram.pattern
decompress dan2  Asset   to vram.pattern
decompress dan3  Asset   to vram.pattern
decompress zx7   Asset   to vram.pattern
decompress lzf   Asset   to vram.pattern
decompress bitbuster Asset to vram.pattern
decompress Level to vram.spr_attr + 128  ' unpack at $1B80
copy vram.spr_attr + SourceOffset count 19 to vram.name + TargetOffset
```

`decompress` accepts an offset VRAM destination when a codec must unpack into a hidden workspace. `copy VRAM count N to VRAM` accepts a constant count from 1 to 32 and uses Amy's internal 32-byte scratch buffer. This supports row-sized transfers such as placing a compact level rectangle in a larger NAME table without overwriting its HUD.

For declared project assets, prefer `decompress AssetName to vram.*`; Amy uses the codec from the `asset ... codec ...` declaration. Use the explicit `decompress codec TableName to vram.*` form for old ROM data labels, generated tables, or cases where there is no asset metadata.

`merge Source count N to Target mask M xor X` is the safe Amy form of the old
lib4ksa masked VRAM upload helper. Each byte written is `(source_byte & M) xor X`.
Use it for legacy mask/xor graphics effects. Use ordinary `copy ... to vram.*`
when no mask is needed.

Coleco picture assets are grouped with codec metadata per VDP component, not a
legacy RLE-only table:

```basic
picture TitleScreen:
  pattern from "title.pattern.zx0" codec zx0
  color from "title.color.zx0" codec zx0
  name from "title.name.zx0" codec zx0
end picture

show picture TitleScreen
```

`show picture Name` is the simple all-in-one form: it blanks the display,
selects bitmap graphics mode, uploads/decompresses the picture components,
prepares the name table, then turns the screen on.

`upload picture Name` is the controlled form for programs that want to manage
the video mode, display timing, sprites, fades, or other VRAM work manually. It
only copies/decompresses the picture data. It still prepares the name table: if
a `name` component is declared, that data is loaded into `vram.name`; otherwise
Amy loads the standard `$00..$ff` sequence repeated three times for a full
bitmap screen.

A raw combined `.pc` file can be declared with `pattern_color`; compressed
combined `.pc` files can be previewed in Studio, but source-level `show picture`
should use separate compressed `pattern` and `color` components until a
split-buffer runtime exists.

Studio's Files tab previews ready-to-display picture components (`.pc`,
`.pattern`, `.color`, optional `.name`, including compressed component files
such as `title.pattern.zx0`) using the same codec metadata.

### Pattern definition helpers

```basic
define chars Name at Pos
define chars Digits at 48 count 10
define chars Charset + 128 at 128 count 16
define colors NameColors at Pos
define colors NameColors at 48 count 10
fill mode 2 color thirds at 175 count 1 with $41
set sprite pattern table vram.pattern
set sprite pattern table vram.spr_pat
reflect pattern 0 to 16 count 1 vertical
reflect pattern 16 to 17 count 1 horizontal
rotate pattern 17 to 18 count 1 90
```

`define chars ... at N` copies 8-byte character patterns into all three Mode 2 pattern thirds automatically. A source may use a constant byte offset (`Source + Offset`) when an explicit `count` is supplied.
`define colors ... at N` copies 8-byte color rows into all three Mode 2 color thirds automatically. `fill mode 2 color thirds` fills the same tile range in all three COLOR thirds without repeating three VRAM commands.

`reflect pattern` and `rotate pattern` use Coleco BIOS pattern transforms.
Source and destination are pattern indexes, not byte addresses. `vertical`
reflects left to right; `horizontal` reflects top to bottom. Amy intentionally
does not expose the old BIOS numeric table-code parameter here.

### Bitmap mode drawing (Graphics Mode 1)

```basic
pset 10,10
pset 10,10 color 15
preset 10,10
line 20,20 to 220,170
line 20,20 to 220,170 color 15
circle 80,100 radius 20
circle 80,100 radius 20 color 15
pset multicolor 2,2 color 5
PixelColor = pget multicolor 2,2
wipe screen up
wipe screen down
wipe bitmap up
wipe bitmap down
```

`wipe screen up/down` blanks name table rows one per frame (text mode).  
`wipe bitmap up/down` clears bitmap color rows one pixel-row per frame (mode 1/2 bitmap).

`pset multicolor` / `pget multicolor` access the two-pixels-per-byte pattern
bytes used by Graphics Mode 3. The color is a 4-bit nibble. `mode3` is accepted
as a technical alias, but `multicolor` is the clearer Amy spelling.

To clear a multicolor screen, clear the visible pattern bytes:

```basic
multicolor screen
cls
```

In multicolor mode, `cls` compiles to a pattern-table clear. In text modes, it
keeps the usual name-table clear behavior.

`plot` was removed; use `pset`.

---

## Text Output

```basic
print at X,Y, "TEXT"
print at X,Y "TEXT"        ' BASIC shorthand: comma before the first string is optional
print Counter at X,Y digits 3      ' type inferred
print Counter at X,Y width 3       ' right-aligned with pad tiles instead of leading zeroes
print Score at X,Y digits 5
print Delta at X,Y digits 11
print Coins at X,Y
print Speed at X,Y
print centered at Y, "READY"
print at X,Y, "SCORE:", Coins
```

Canonical defaults:

```basic
print Counter at X,Y digits 3          ' u8 defaults to 3 digits
print Score   at X,Y digits 5          ' u16 defaults to 5 digits
print i8    Delta   at X,Y digits 4
print i16   Delta   at X,Y digits 6
print u32   Counter32 at X,Y
print i32   Counter32 at X,Y digits 11
print fixed  Speed  at X,Y
print ufixed ScreenX at X,Y
```

Legacy prefixed forms like `print byte ...` and `print word ...` are retired from the active AMY surface.

`print centered at Y, "TEXT"` is a compile-time convenience for string literals.
It centers on the 32-column ColecoVision text line and rejects literals longer
than 32 characters. When the padding is odd, the extra column stays on the left
so 31-character titles start at column 1 instead of the CRT-riskier column 0.
Explicit-position `print` uses `X,Y`; centered `print` takes only `Y` because
Amy computes `X`.

`put Source + Offset count N at X,Y` writes a runtime-selected slice of a ROM DATA block or byte array. Use fixed-width `data ... chars` rows plus an offset table for compact menus, status messages, and tilemap rows without one print routine per choice.

Dense `print at X,Y, ...` note:
- When the first printed item is a string, Amy also accepts the natural BASIC form `print at X,Y "TEXT"`; following items still use commas.
- Amy treats mixed-item `print at` as a source-level convenience and lowering feature
- it is not meant to imply a heavy runtime `printf` interpreter
- the intended implementation model is compile-time expansion into the ordinary underlying text and numeric print helpers

### Format into buffer

```basic
format Score into Buffer digits 5       ' type inferred
format Score into Buffer width 5        ' right-aligned with pad tiles instead of leading zeroes
format Counter32 into Buffer
format Delta32 into Buffer digits 11
format Coins into Buffer

format Score   into Buffer digits 5
format i8      Delta   into Buffer digits 4
format i16     Delta   into Buffer digits 6
format u32     Counter32 into Buffer
format i32     Counter32 into Buffer digits 11
format fixed   Speed   into Buffer
format ufixed  ScreenX into Buffer
format Score   into Buffer              ' BCD: buffer length must match digit count
```

`format u32` destination buffer: 10 bytes.  
`format fixed` destination buffer: 7 bytes.  
`format ufixed` destination buffer: 6 bytes.  
BCD destination buffer: matches BCD digit count.
`format ... into Buffer` can target a local `u8` buffer on the stack.

Numeric text expressions are the lightweight runtime string surface for current Amy:

```basic
print at 0,0, "SCORE " + str$(Score)
print at 0,0, "X:" + str$(PlayerX)
print at 0,1, "SCORE " + str$(Score, digits 5)
print at 0,2, "SCORE " + str$(Score, width 5)
print at 0,3, "SCORE " + digits$(Score, 5)
print at 0,4, "SCORE " + width$(Score, 5)
Line = "SCORE:" + str$(Score)    ' only when you need a reusable u8 buffer
```

`str$(Value)` accepts the current numeric families: `bool`, `u8`, `i8`, `u16`,
`i16`, `u32`, `i32`, `fixed`, `ufixed`, `fixed32`, `fp5`, and `bcd`.
The result is compiled directly into a fixed `u8` buffer or immediate screen
output. It does not allocate a dynamic string and does not introduce a general
runtime string type.

For scoreboard-style fields, use explicit padding:

- `str$(Value, digits N)` or `digits$(Value, N)` writes a zero-padded field
- `str$(Value, width N)` or `width$(Value, N)` writes a right-aligned field using the configured pad tile
- this is Amy's readable equivalent of CVBasic's compact `<N>` / `<.N>` print prefixes

Numeric glyph output can be customized globally:

```basic
set number digits to $30
set number pad to $20
```

- `set number digits to TileValue` selects the tile base used for digits `0..9`
- `set number pad to TileValue` selects the tile used for left padding in `width` formatting
- `digits N` keeps the existing zero-padded behavior
- `width N` right-aligns using the configured pad tile instead of leading zeroes

Current note:
- this configurable digit/pad remap applies to the core `print` / `format` numeric paths
- BCD output still has its own explicit tile-offset behavior

### Char / tile output

```basic
put char $41 at X,Y
put TitleLine count 9 at 8,8
put TitleLine at 8,8
put TitleLine centered at 20
Var = get char at X,Y
fill Char count N at X,Y
```

For `put Name at X,Y` and `put Name centered at Y`, `Name` must be a known-length
`u8[]` buffer or ROM `data` block. The compiler infers the count; centered uses
`ceil((32 - length) / 2)`.

Removed forms: `put tile`, `put chars Name at X,Y count N`, `put at X,Y Name count N`, `get char at X,Y into Var`, `read tile at X,Y into Var`. See [amy-removed-forms.md](amy-removed-forms.md).

---

## Sprites

```basic
sprites 8x8
sprites 16x16
sprites simple
sprites double
sprites stable 0 to 2
sprites flicker on
sprites flicker off
set sprite count N
set sprite I to Y,X,Pattern,Color
set sprite I + 1 to SpriteY - 1,SpriteX - 8,Pattern,Color
set sprite I tile TileX,TileY pattern Pattern color Color
set sprite I tile TileX,TileY pattern Pattern color Color offset DX,DY
set sprite I y to Y
set sprite I x to X
set sprites 0,1,2,3 x to X
set sprite I pattern to Pattern
set sprite I color to Color
Var = sprite I y
Var = sprite I x
Var = sprite I pattern
Var = sprite I color
hide sprite I
clear sprites
clear sprites from 4 count 4
update sprites
update sprites from 4 count 4
```

Literal sprite indexes must be in `0..31`; an out-of-range literal is a compile error. The full setter, single-field setters/getters, `hide sprite`, and named-hitbox collision operands accept byte-sized runtime index expressions. Constant forms still fold to direct shadow-table addresses. Multi-sprite field lists and partial clear/update ranges remain constant-only compile-time operations.

After changing shadow entries, call `update sprites`.  
Sprite shadow writes are not visible until `update sprites`.
This is an intentional machine contract:
- `set sprite ...`, `set sprite I y/x/pattern/color to ...`, `hide sprite`, and `clear sprites` modify shadow state only
- `clear sprites from First count Count` hides a constant range without changing sprite count
- `update sprites` uploads the active shadow entries to the VDP
- `update sprites from First count Count` uploads only a constant range and writes the sprite terminator after that range
- AMY keeps that boundary explicit to protect predictable ColecoVision rendering behavior

The optional `sprites flicker on` mode prevents the same fifth sprite from
remaining invisible whenever more than four sprites occupy one scanline. Amy
uses the VDP overflow flag captured by the NMI and changes only the physical SAT
upload order for the following frame. When no overflow is reported, the current
order stays unchanged. Logical sprite numbers used by setters, collision tests,
symbols, and the debugger never change.

Declare one constant stable range when a player or another object is composed of
layered sprites:

```basic
sprites stable 0 to 2
sprites flicker on
```

The stable range is uploaded first in its original relative order. Other active
sprites rotate fairly after overflow. Version 1 accepts one stable range in
`0..31`; omit it when every active sprite may rotate. `sprites flicker off`
returns the next full update to ordinary logical-index order. A project using
flicker cannot use `update sprites from ... count ...`, because a partial upload
cannot preserve the complete priority order and terminator safely.

Flicker is the visible compromise, not the objective: alternating priority lets
all conflicting objects appear over successive frames. Stable layered sprites
remain intact while less important enemies or objects share the remaining four-
sprites-per-scanline capacity.

The TMS9918 resolves overlapping opaque sprite pixels by sprite-table order:
the lower sprite index appears in front of every higher index. For example,
smoke in sprites 0-2 is drawn in front of a train in sprite 3. This priority
does not bypass the hardware limit of four visible sprites on one scanline;
the fifth and later sprites on that line are not rendered.

In Graphics I/II, sprite Y value `$D0` is not merely off-screen: it terminates
the sprite attribute list, so every following sprite is ignored. When an
inactive lower-index sprite must precede active higher-index sprites, use a
transparent pattern at an off-screen non-terminator Y such as `$CF` (207).

`set sprite I to Y,X,Pattern,Color` is the native pixel-coordinate form and
keeps the ColecoVision sprite Y convention visible. `set sprite I tile X,Y
pattern P color C` is the tile-map convenience form: it lowers to pixel
coordinates `X * 8` and `Y * 8 - 1`, so a sprite whose top-left visual pixel is
on tile `(X,Y)` lands where a game programmer expects.

Add `offset DX,DY` when the gameplay point is not the sprite's top-left corner.
Offsets are signed pixel adjustments after tile-to-pixel conversion. For
example, `offset -4,-8` places an 8x8 sprite around a center/feet-style anchor
instead of directly at the tile's top-left visual pixel.

`sprite I y`, `sprite I x`, `sprite I pattern`, and `sprite I color` read from
the Amy sprite shadow table, not directly from VRAM. In these partial setters and getters, `I` is currently a constant
sprite index from 0 to 31; variable sprite indexes are not accepted yet. These getters are useful for animation routines that
move or inspect shadow entries before the next `update sprites`. Sprite fields can also be used in byte expressions with ROM byte tables, for example `set sprite 4 x to sprite 0 x + StarDX[I]`.

---

## Input

Inline input expressions are the canonical default style for common controller/status reads:

```basic
if joypad(1).up then
  dec PlayerY
end if

if joypad(1).fire then goto Fire
if joypad(1).fire.pressed then goto FireOnce
if joypad(1).fire.released then goto FireReleased
RawPad = joypad(1)
AnyStandardFire = joypad(1).fire
AnyActionButton = joypad(1).action
Key = keypad(1)
Spin = spinner(1)
FrameCount = frame
print vdp.status at 0,0
```

Preferred modern forms:

```basic
Pad1 = joypad(1)
Key1 = keypad(1)
X += spinner(1)
Y += spinner(2)
FrameVar = frame
print vdp.status at 0,0
```

Append `.pressed` or `.released` to a joypad direction or button property to
detect one edge. The result stays stable for repeated reads during the same
program frame and does not repeat while the input remains unchanged:

```basic
if joypad(1).button1.pressed then Jump
if joypad(1).fire.pressed then Confirm
if joypad(Port).action.pressed then AnyAction
if joypad(1).button1.released then Land
if joypad(Port).action.released then ActionsReleased
```

Edge state is allocated only when this syntax is used. One edge kind on a
constant port costs two runtime RAM bytes; using both kinds costs three because
they share the previous-input byte. A variable port reserves the corresponding
state for both ports. A frame loop using either suffix must contain `wait`; Amy
rejects unsynchronized busy polling instead of emitting an unreliable edge test.

`spinner(N)` is a signed, consumable movement delta. Each read atomically returns
and clears the ticks accumulated since the previous read. No movement therefore returns
zero and cannot create residual acceleration. Positive `spinner(1)` moves right; positive
`spinner(2)` moves down. Use `reset spinner N` only to discard queued movement without
using it.

The controller selector may be an `int8` expression for `joypad`, `keypad`, and
`spinner`, for example `Port = 1`, `Spin = spinner(Port)`, or
`OtherSpin = spinner(3 - Port)`. At runtime selector `1` chooses port 1; every
other value chooses port 2. A dynamic spinner read remains atomic and consumable.

Old staged reads still compile during cleanup, but code should use expressions
when an expression exists. Keep these only for older source migration or
low-level debugging of the decoded controller bytes:

```basic
read joypad 1 into Pad1
read joypad 2 into Pad2
read keypad 1 into Key1
read keypad 2 into Key2
read vdp status into VdpByte
```

### Joypad conditions

```basic
if button 1 on Pad1 goto Label
if button 2 on Pad1 then ...
if left  on Pad1 goto Label
if right on Pad1 goto Label
if up    on Pad1 goto Label
if down  on Pad1 goto Label
```

### Wait helpers

```basic
pause until press
pause until press on joypad 1
pause until press and release
sleep after 5 seconds
sleep after 5 seconds on joypad 1
pause until press and release sleep after 5 seconds
pause until press and release on joypad 1 sleep after 5 seconds
wait fire
wait no fire
wait fire on joypad 2
wait no fire on joypad 2
wait
wait 1 frame
wait 5 frames
wait 180 frames or press
wait 180 frames or press on joypad 1
wait vblank
wait 5 frames
wait key1
wait key7 on keypad 2
wait key release on keypad 2
halt
```

`pause until press` waits until all action buttons are released, then waits for a new
action-button press. Both side buttons of a standard controller are accepted; all four
Super Action Controller buttons are accepted. Without `on joypad N`, either controller
can resume.
Use it for menu pauses and "press to continue" screens. `pause until press and release`
adds a final release wait, preventing the accepted button from becoming an immediate
gameplay action. `wait fire` and `wait no fire` are lower-level action waits;
unqualified forms watch both controllers, while `on joypad N` limits them to one port.
`sleep after N seconds` is a nonblocking menu inactivity service. Call it once per
frame: it returns immediately while the screen is awake. Directions, keypad keys,
and action buttons reset its timer. After the timeout it blanks the screen, waits
for any selected control, restores the display, consumes that control's release,
resets its timer, and returns without selecting a menu item. It reserves two bytes
of runtime RAM. Combine the timeout with `pause until press and release` when a
blocking confirmation screen must require a second, fresh press after waking:

```basic
pause until press and release sleep after 10 seconds
```

`N` must be a literal from 1 to 1092. Amy precomputes `N*60` and `N*50` and
selects the count at runtime from the official BIOS `AMERICA` byte (`60` NTSC,
`50` PAL; unknown values fall back to NTSC). For the nonblocking service, the timeout
counts calls made with no selected input. The current screen and backdrop remain visible
until the timeout expires. On expiry, Amy sets VDP R7 to black and clears only VDP R1
display bit 6: NMI, controller scanning, sound, music, timers, and `on vblank` continue.
After blanking, the first fresh action immediately restores the tracked backdrop and the
original display-enable bit without overwriting current NMI or sprite-size bits.
For `sleep after`, any wake control restores the display, its release is consumed,
and execution returns so menu control resumes. In the combined pause
form, the wake action is consumed and a second fresh press and release is required
to complete the pause. An action pressed before blanking still completes the combined
pause normally after its release. Every
`backdrop COLOR` command updates that tracked R7 value. This form requires NMI enabled;
compilation fails when Amy can prove NMI is off at that point.
`wait` is the canonical one-frame wait. It uses the safe frame-delay runtime:
when NMI is enabled it waits through `NMI_FLAG`, and when NMI is disabled it
polls the VDP status register directly instead of hanging on `halt`.
`wait N frame(s)` is the same safe wait for explicit 16-bit frame counts;
constant `0` waits are ignored.
`wait N frame(s) or press` waits up to a 16-bit frame count but exits early
when any action button is pressed. Without `on joypad N`, either controller can interrupt.
`wait vblank [N]` remains accepted as the lower-level spelling.

### Choose (menu selection)

```basic
choose keypad 1 to 3 into Speed
choose keypad KeyReplay to KeyMenu into Choice sleep after 5 seconds
choose menu 1 to 4 into Choice cursor $3E at 6,9 step 2 sleep after 10 seconds
choose menu 1 to 4 into Choice cursor sprite 0 at 48,71 step 16
```

Waits for a keypad digit in the given range and stores it.

Computed bounds are also accepted. An optional `on keypad N` restricts input to one controller. `sleep after N seconds` uses the same PAL/NTSC-aware, NMI-preserving CRT protection, consumes the selected key release, and requires NMI enabled:

```basic
const KeyReplay = 10  ' *
const KeyMenu = 11    ' #
u8 Choice = 0
choose keypad KeyReplay to KeyMenu into Choice sleep after 5 seconds
```

Computed bounds are also accepted:

```basic
choose keypad MinChoice() to MaxChoice() into Speed
```

`choose menu` handles a complete vertical menu: it draws the cursor, wraps UP/DOWN,
accepts FIRE or a keypad value in range, consumes the release, and returns the
selection in the target. `at X,Y` is the first cursor position and `step` is the
vertical distance between entries. The default erased tile is `$20` and the
default controller is 1; use `clear Tile` or `on joypad 2` to override them.
The optional `sleep after` timeout provides the same PAL/NTSC-aware CRT protection.

The sprite form moves an already configured sprite in pixel coordinates. Set its
pattern, color, active sprite count, and initial position before `choose menu`.
The menu changes only X/Y and uploads the sprite table when the selection moves;
it does not animate the sprite or allocate background animation state.

```basic
choose menu 1 to 4 into Choice cursor $3E at 6,9 step 2
on Choice goto GameOne, GameTwo, GameThree, GameFour
```

### Collision

```basic
if any collision goto Hit
if not any collision goto Safe

hitbox PlayerHitbox = 3,5 size 10,9
hitbox EnemyHitbox = 2,2 size 12,12
if sprite 0 hitbox PlayerHitbox collides with sprite I + 1 hitbox EnemyHitbox goto Hit
if box PlayerX,PlayerY size 16,16 collides with box BossX,BossY size 56,24 goto Hit

tile type solid = $20,$21,$22
tile type coin = $30
tile type hazard = $40,$41

if tile under PlayerX + 4,PlayerY + 15 is solid goto OnGround
if tiles under box PlayerX,PlayerY size 16,16 contain hazard goto Hurt
find tile coin under box PlayerX,PlayerY size 16,16 into HitTileX,HitTileY
if chars in box TileX - 1,TileY - 1 size 3,3 contain solid goto Blocked
if chars in box TileX - 1,TileY - 1 size 3,3 contain $20 goto Blocked

```

`if any collision` checks the VDP coincidence bit.  
`hitbox Name = X,Y size W,H` declares a local rectangle inside a sprite.  
`if sprite A hitbox HitA collides with sprite B hitbox HitB` is the preferred
gameplay collision form because each object can have its own logical hitbox.  
The older `if sprite A collides with sprite B box W,H` and
`box X,Y size W,H` forms still work as shortcuts when both sprites intentionally
share the same local box. All sprite collision forms operate on shadow sprite
state, not VDP-filtered visible sprites.
`if box X1,Y1 size W1,H1 collides with box X2,Y2 size W2,H2` tests two logical pixel-space rectangles directly from Amy values. It performs a short-circuited AABB test without reading VRAM or consuming a sprite slot, making it appropriate for tile-rendered bosses, doors, platforms, and other logical objects.

Tile gameplay collision uses pixel coordinates, not name-table coordinates:
- `get char at TileX,TileY` reads the visible name table at tile coordinates
  `0..31,0..23`.
- `tile under PixelX,PixelY` converts visible pixel coordinates to tile
  coordinates with `>> 3`, reads the tile there, and tests it against a
  declared `tile type`.
- `tiles under box PixelX,PixelY size W,H contain Type` tests every visible
  tile touched by the pixel-space box and branches on the first match.
- `find tile Type under box PixelX,PixelY size W,H into TileX,TileY` searches
  the touched tiles and stores the first matching tile coordinates, or
  `255,255` when no match is found.
- `chars in box TileX,TileY size W,H contain TypeOrValue` scans directly in
  name-table tile coordinates. Constant rectangles up to 32 cells are fetched once
  with `GET_BKGRND` and scanned in RAM; larger or dynamic rectangles use tile reads.

`tile type` is compile-time only. It creates named property groups for existing
tile values and may reuse earlier groups:

```basic
tile type solid = $20,$21,$22
tile type lava = $30,$31
tile type hazard = lava,$32
```

Frame buffers can be edited in RAM before writing them back to VRAM:

```basic
Area = get frame size 5,5 at TileX,TileY
replace solid with EmptyTile in Area frame size 5,5 into Replaced
put Area frame size 5,5 at TileX,TileY
```

The left side of `replace` may be a single tile value or a declared `tile type`.
This is useful for explosions, destructible terrain, and temporary map edits:
read one rectangle, rewrite the buffer in RAM, then put the frame back once.
The optional `into Count` stores how many bytes were changed, useful for scoring
collected tiles, detecting whether anything changed, or triggering effects only
when replacements happened.

---

## Sound and Music

```basic
set sound table SoundTable
play sound 1
play sounds 5, 6, 7
play song SongTable
stop song
mute all
sound runtime on
sound runtime off
enable spinner
disable spinner
```

DSOUND (4-bit PCM via AY-3-8910):

```basic
play dsound SoundData
play dsound SoundData step 2
```

---

## Timing

```basic
wait
wait 1 frame
wait 5 frames
wait 180 frames or press
wait vblank
wait 5 frames
halt
```

---

## Data and ROM Assets

### Inline data

```basic
data TextLine1 bytes 1,2,3,4,5
data TextLine2 bytes = 1,2,3,4,5

data MazeMap chars
  "################################"
  "#                              #"
  "#     ##############           #"
  "#                     {CoinTile}        #"
  "#                 {$16}{200}           #"
  "################################"
end data

data DemoCharset bytes
  $00,$00,$00,$00,$00,$00,$00,$00
  $18,$24,$42,$7E,$42,$42,$42,$00
end data

data SmileChar bitmap8
  "..XXXX.."
  ".X....X."
  "X.X..X.X"
  "X......X"
  "X.X..X.X"
  "X..XX..X"
  ".X....X."
  "..XXXX.."
end data

data HappyFace sprite16
  ".....XXXXXX....."
  "...XX......XX..."
  "..X..........X.."
  ".X...XX..XX...X."
  ".X...XX..XX...X."
  "X..............X"
  "X..X........X..X"
  "X...XXXXXXXX...X"
  "X..............X"
  "X.X..........X.X"
  "X..X........X..X"
  ".X..XXXXXXXX..X."
  "..XX........XX.."
  "...XXXXXXXXXX..."
  ".....XXXXXX....."
  "................"
end data
```

`data Name bytes ...` and `data Name bytes = ...` are equivalent. Do not use
`data Name bytes: ...`; `:` is reserved for labels.

Byte data supports repeated literals with `Value count N`, either inline or inside a block:

```basic
data BlankNameTable bytes $20 count 768

data BlankRows bytes
  $20 count 32
  `data Name bytes ...` and `data Name bytes = ...` are equivalent. Do not use
`data Name bytes: ...`; `:` is reserved for labels. count 16
end data
```

`chars` converts each quoted text row to byte character/tile codes in ROM.

`data ... bytes` can also be used as a ROM lookup table:

```basic
data MinimumDiamonds bytes
  85,75,60,45,35
end data

DiamondsNeeded = MinimumDiamonds[Mountain]
```

The indexed form reads one byte from ROM. The table name must be a known
`data ... bytes` block, the index is evaluated as an 8-bit expression, and the
result is `u8`.
Constant indexes are checked; calculated indexes deliberately have no runtime bounds check.
Use `{Name}`, `{$16}`, `{200}`, or `{byte:$16}` inside a row to insert a
single non-printable/custom tile byte. Use `{{` or `}}` for literal braces.
This is useful with `put MazeMap frame size W,H at X,Y` for visible tile maps.
`bitmap8` converts each 8-pixel row to one byte (ROM order).  
`sprite16` converts 16-row groups to 32 sprite bytes: 16 left-column bytes then 16 right-column bytes.
Each visual row may be written either as `"...."` or `bitmap "...."`. The `bitmap` keyword is optional.
Graphics Editors preserve inline `bitmap8` and `sprite16` blocks when saving edited graphics; plain `bytes` blocks are saved as hex byte rows.

### Word tables (indexable ROM address tables)

`data Name words` builds a ROM table of 16-bit entries — typically addresses of
other blocks via `@Label` — and `Name[Index]` picks one at runtime. This is the
Amy equivalent of C's `const byte* levels[]`.

```basic
data Level1 bytes $01,$02,$03
data Level2 bytes $04,$05

data Levels words
  @Level1, @Level2
end data

data Extras words = @Level2, $8000   ' inline form; raw word values allowed

decompress mdkrle Levels[LevelNum] to vram.name
put Frames[Type] frame size 4,4 at X,Y
```

Rules:
- the instruction sequences shown here are representative codegen details, not stable language contracts
- entries are `@Label` (a data block, asset, or label), `$xxxx`, or a decimal word
- a **constant index folds to the entry label directly** (`Levels[1]` → `ld hl,Level2_label`, no table walk)
- a variable index reads the `dw` entry at runtime with the minimal sequence
  (`add a,a` / `add hl,de` / fetch low+high / `ex de,hl`) — no runtime helper
- at most 128 entries (the byte-index doubling limit); out-of-range constant
  indexes and non-`@` bare identifiers are compile errors, including assignments
  such as `P = Levels[9]`; variable indexes deliberately have no runtime bounds check
- consumers taking a ROM source address accept `Table[Index]`: `decompress`,
  `put ... frame`, and everything routed through the shared source-address path

### Pointer reads: `P = Table[Index]` + `peek(P)`

A word-table entry can also be stored into a `u16` variable and walked byte by
byte — the Amy equivalent of C's `code = *p++` decoder loop:

```basic
u16 P = 0
u8 Code = 0

P = Levels[LevelNum]     ' dereferenced ROM address into a u16 "pointer"
Code = peek(P)           ' ld hl,(P) / ld a,(hl)
P += 1
```

`peek(Addr)` is a `u8` expression reading one byte from the address held in any
`u16` expression (`peek(P + 1)` works). It composes in larger expressions and
conditions (`if peek(P) == $FF then`). No runtime helper is emitted, and there
is no bounds checking — it is the deliberate low-level escape hatch for ROM
decoders and memory-mapped reads.

### Asset (compressed ROM)

```basic
asset WarriorPattern from "assets/warrior/pattern.zx0" codec zx0
asset BgColor from "assets/bg/color.pletter" codec pletter
```

### Include ASM/data files

```basic
include "@project/chateau_sounds.inc"
include "assets/sounds.inc"
```

`include` copies an external ASM/data file into the generated assembly at that
point. It is useful for hand-authored ColecoVision sound tables, lookup tables,
or other low-level data that is already written in assembler syntax.

Use `asset` when the file should be managed by Amy Studio as a named ROM asset
or previewable picture/sound file. Use `include` when the file itself already
contains labels and `.db`/`.dw`/`include`-style assembler content. The included
file is not parsed as Amy source and does not declare Amy variables.

### DATA cursor reads

```basic
restore Lookup
read Value
read X, Y, Tile, Flags
```

`restore` resets the internal DATA cursor to a named block.  
`read` consumes the next item(s) and advances the cursor.  
Multiple comma-separated targets on one `read` line are supported.

---

## Inline ASM

```basic
sub wait_vblank:
  asm {
WaitVblank:
    ld a,(_nmi_flag)
    or a
    jr z,WaitVblank
    xor a
    ld (_nmi_flag),a
  }
end sub
```

Rules:
- Inline ASM is copied into generated output after labels are namespaced.
- May reference generated labels, ColecoVision BIOS symbols, and Amy runtime symbols visible in the expanded ASM view.
- Must not reference reserved `AMY_SCENE_*` or `AMY_OVERLAY_*` aliases. Inline ASM and
  resolvable ASM includes containing those names are rejected because they could retain
  an address after another overlay part takes ownership of the same RAM.
- User variable names are rewritten through `rewriteUserSymbolsInExpression`.
- Document register and RAM side effects when used inside reusable procedures.
- Preserve `IX` inside routines that use locals or parameters.
- Preserve `SP` unless the whole block is a carefully documented stack routine.
- Treat `AF`, `BC`, `DE`, and `HL` as scratch registers only within the ASM
  block; do not assume Amy preserves values across arbitrary statements.
- Prefer putting inline ASM in a small `sub` with an explicit `return`, mirroring
  the Z80 rule that every callable block must end in `ret` or an intentional jump.

Use inline ASM only after checking:
1. Does a direct Amy statement already exist for this?
2. Does a `print`, `format`, `u32`, `bcd`, sprite, text, VRAM, decompression, or input helper cover it?
3. Is this genuinely hardware-timing-sensitive or a missing language feature?

### External ASM Bridge

Use `include asm` when an external project file contains Z80 labels, routines, or data that must be assembled with the program:

```basic
include asm "@project/my_engine.inc"
```

Use `call asm` to call a raw Z80 label without wrapping it in `asm { ... }`:

```basic
call asm Bunny_StartNearOriginal
```

For routines that expect register parameters, specify the register loads explicitly:

```basic
call asm AMY_PLAY_SOUND with b = 6
call asm AMY_COPY_BYTES_TO_VRAM with hl = PictureData, de = vram.pattern, bc = 768
call asm AMY_PUT_CHAR_AT with a = Tile, d = Y, e = X
```

Rules:
- `call asm` targets a raw assembler label; it does not apply Amy `sub` name mangling.
- Supported argument registers are `a`, `b`, `c`, `d`, `e`, `h`, `l`, `hl`, `de`, and `bc`.
- Arguments are Z80 ABI registers, not typed Amy parameters; document what the routine destroys.
- Do not set both a word register and one of its byte halves in the same call, for example `hl` and `h`.
- `include asm` emits code at that source position. If the include contains executable routines, place it after a terminating jump/loop or call it through a forward `call asm` so normal program flow cannot fall into the included code accidentally.

---

## Memory and Project Metadata

```basic
project "Name"
memory "colecovision_legacy_sdcc"
```

Available memory profiles live in `tools/memory/*.json`.

---

## Quick Reference: All Statement Forms

### Declarations

| Statement | Meaning |
|---|---|
| `project "Name"` | Project header |
| `memory "profile"` | Select memory profile |
| `const Name = value` | Compile-time constant |
| `enum Name:` ... `end enum` | Group compile-time constants |
| `u8 Name = value` | Global 8-bit unsigned RAM variable |
| `i8 Name = value` | Global 8-bit signed RAM variable |
| `u8 Name[N]` | Global 8-bit RAM array |
| `u8 Name[Rows,Columns]` | Row-major global primitive 2D array (1..255 total elements) |
| `u16 Name = value` | Global 16-bit unsigned RAM variable |
| `i16 Name = value` | Global 16-bit signed RAM variable |
| `bool Name = false` | Global boolean (bit-packed) |
| `bcd digits N Name = value` | Global packed BCD variable with N displayed digits |
| `fixed Name = 0.0` | Global signed 8.8 fixed-point variable |
| `ufixed Name = 0.0` | Global unsigned 8.8 fixed-point variable |
| `u32 Name` | Global 32-bit unsigned variable |
| `i32 Name` | Global 32-bit signed variable |
| `data Name bytes ...` | ROM u8 block |
| `Var = DataName[Index]` | Read one byte from a ROM `data ... bytes` table |
| `data Name chars` | ROM character/tile map from quoted rows |
| `data Name bitmap8` | ROM 8-bit bitmap block |
| `data Name sprite16` | ROM 16×16 sprite block |
| `asset Name from "path"` | Raw ROM asset (`codec raw` implied) |
| `asset Name from "path" codec zx0` | Compressed ROM asset |
| `include "@project/file.inc"` | Include an ASM/data file verbatim |
| `define byte as u8` | Source-level type alias for the current file |

### Assignment and arithmetic

| Statement | Meaning |
|---|---|
| `Var = expr` | Assign |
| `inc Var` / `dec Var` | Increment / decrement |
| `clear Var` | Zero any type |
| `Var += expr` | Add in place |
| `Var -= expr` | Subtract in place |
| `toggle Flag` | Flip `bool` or `u8` |
| `Var = min(A, B)` | Store the smaller value |
| `Var = max(A, B)` | Store the larger value |
| `Var = absdiff(A, B)` | Absolute scalar difference; compact for `u8`, safe for signed/word inputs |
| `Var = A % B` / `Var = A mod B` | Integer remainder for `u8`/`i8`/`u16`/`i16` |
| `clamp Var between min and max` | Clamp both bounds |
| `Var <<= N` | Shift left N bits |
| `Var >>= N` | Shift right N bits |
| `bounce Var by delta between min and max` | Bounce movement |
| `Var *= N` | Multiply in place (`u8`, unsigned `u16`) |
| `Var /= N` | Divide in place (`u8` only, truncating) |
| `Var = abs(Value)` | Absolute value (`fp5`, `fixed32`, and integer expressions) |
| `Var = sqrt(Value)` | Square-root assignment |
| `Var = random(min, max)` | Preferred bounded random form. Integer targets use inclusive integer range; `fp5` targets use an fp5 interval. |
| `Var = random()` | Fractional `fp5` or `fixed32` sample in `0.0 .. <1.0`, based on target type |
| `Var = random(N) + K` | `int8` expression with random range `0..N-1` |

Current expression engine notes:

- `int8` expressions now go through a shared parsed expression path instead of ad hoc string splitting
- supported `int8` expression forms currently include literals, variables, array `u8` reads, function-like `random(N)` and `random(A, B)`, parentheses, unary `+`/`-`, and binary `+`/`-`/`*`/`/`/`%`/`mod`; runtime `var * var` and `var / var` emit real Z80 helper code, not assembler-time address arithmetic
- `vpoke vram.name + I, random(2) + 16` and `Tile = random(2) + 16` are both intended modern forms
- `int16` expressions now share the same parser core, with current codegen focused on literals, variables, parentheses, and `+` / `-`
- this is the intended foundation for future expression growth; new arithmetic forms should extend the shared parser/codegen path, not add one-off statement parsers

### Control flow

| Statement | Meaning |
|---|---|
| `if cond then` ... `end if` | Structured branch |
| `elseif cond then` | Additional branch |
| `else` | Default branch |
| `if cond then stmt` | One-line guard |
| `select case Expr` ... `end select` | Multi-way branch |
| `case N` / `case N to M` / `case else` | Case arms |
| `for I = start to end` ... `next` | Counted loop |
| `for I = start downto end` | Descending counted loop |
| `for each Item, I in Array` ... `next` | Alias each global fixed-array element through an explicit u8 index |
| `for ... step N` / `for ... step -N` | Stepped loop |
| `continue for` / `exit for` | Loop control |
| `while cond` ... `end while` | Conditional loop |
| `continue while` / `exit while` | Loop control |
| `do` ... `loop` | Infinite or conditional loop |
| `do while cond` / `do until cond` | Pre-test variant |
| `loop while cond` / `loop until cond` | Post-test variant |
| `continue do` / `exit do` | Loop control |
| `loop forever` | Infinite loop |
| `goto Label` | Unconditional jump |
| `Name:` | Label definition |
| `on Var goto L1,L2,...` | 1-based indexed dispatch |
| `on Var gosub L1,L2,...` | 1-based indexed call |
| `state machine Name:` ... `State calls Sub` ... `end state machine` | Declare one-based typed state constants and their handlers; zero means inactive |
| `dispatch StateVar using Name` | Bounded call through the named machine's shared ROM table |

### Sub / function

| Statement | Meaning |
|---|---|
| `sub Name:` ... `return` / `end sub` | Void subroutine; terminate explicitly unless intentional fall-through is documented |
| `sub Name(Type p, ...):` | Parameterized subroutine |
| `return` / `exit sub` | Early return from sub |
| `function Name as Type` ... `return Value` | Value-returning function |
| `function Name(Type p, ...) as Type` | Parameterized function |
| `return Value` | Return from function |
| `Name(...)` / `Name` | Preferred subroutine call |

### Screen / graphics

| Statement | Meaning |
|---|---|
| `screen off` / `screen on` | VDP display + interrupt |
| `display off` / `display on` | Display bit only |
| `nmi off` / `nmi on` | Interrupt bit only |
| `on vblank SubName` | Register one parameterless Amy sub called by the generated VBlank NMI wrapper |
| `timer Name every N ticks` | Declare a repeating named timer |
| `timer Name after N ticks [stopped]` | Declare a one-shot named timer |
| `start timer Name` / `stop timer Name` | Enable/reset or disable a named timer |
| `if timer Name then Statement` | Test and consume a timer signal in normal code |
| `text screen` | Standard 32x24 text/tile bootstrap |
| `tile screen` | Mode 2 tile bootstrap with duplicated patterns and 8 color bytes per tile |
| `bitmap screen` / `bitmap screen color $F0` | Drawable bitmap surface for `pset`, `line`, `circle`; default color is `$F0` |
| `picture screen` | Raw full-screen picture/table surface |
| `multicolor screen` | Multicolor mode surface |
| `backdrop Color` | Set VDP register 7 backdrop/border color |
| `set text colors F [on B] [at N] [count M]` | Fill standard text color groups; omitted background is transparent |
| `cls` | Clear the current screen surface |
| `load default ascii` | Load BIOS font |
| `load default ascii bold` / `italic` / `bold italic` | Load BIOS font with legacy styling |
| `wipe screen up` / `wipe screen down` | Scroll wipe (text mode, name table rows) |
| `wipe bitmap up` / `wipe bitmap down` | Scroll wipe (bitmap mode, pixel rows) |
| `fill mode 2 text color with X` | Set all three Mode 2 color thirds |
| `fill full mode 2 text color with X` | Fill full Mode 2 color table (6144 bytes) |
| `load mode 2 text colors Source` | Expand/load old-devkit 32-byte Mode 2 text color table |
| `set default name table Addr` | Change name table base |
| `set screen pages A and B` | Double-buffer pages |
| `swap screens` | Swap double-buffer pages |
| `vpoke vram_addr, Value` | Write one VRAM `u8` |
| `vpeek vram_addr into Var` | Read one VRAM `u8` |
| `fill V count N to vram.* [+ Offset]` | Fill a VRAM region with one byte using the BIOS FILL_VRAM path |
| `fill vram.pattern with V count N` | Older compatible VRAM fill form; prefer `fill V count N to vram.pattern` |
| `fill row R from Col count N with V` | Fill name table row |
| `fill vram.name with sequence $00..$FF repeat N` | Fill sequential tiles |
| `copy Src [count N] to Dst` | Bulk copy (VRAM, arrays, buffers) |
| `merge Src count N to vram.* mask M xor X` | Copy bytes to VRAM as `(byte & M) xor X` |
| `decompress AssetName to vram.*` | Decompress a declared asset using its codec metadata |
| `decompress CODEC Name to vram.*` | Explicit codec form for raw/data labels |
| `show picture Name` | Display a grouped picture asset as an all-in-one bitmap screen |
| `upload picture Name` | Upload/decompress a grouped picture asset without changing screen state |
| `define chars Name at Pos [count N]` | Load chars to pattern thirds |
| `define colors NameColors at Pos [count N]` | Load colors to color thirds |
| `set sprite pattern table vram.*` | Set sprite pattern base |
| `reflect pattern Src to Dst count N vertical/horizontal` | Reflect pattern-table entries |
| `rotate pattern Src to Dst count N 90` | Rotate pattern-table entries clockwise |
| `pset X,Y [color C]` | Set pixel (mode 1) |
| `pset multicolor X,Y color C` | Set a Mode 3 multicolor pixel |
| `Var = pget multicolor X,Y` | Read a Mode 3 multicolor pixel |
| `preset X,Y [color C]` | Clear pixel (mode 1) |
| `line X1,Y1 to X2,Y2 [color C]` | Draw line (mode 1) |
| `circle X,Y radius R [color C]` | Draw circle (mode 1) |

### Text output

| Statement | Meaning |
|---|---|
| `print at X,Y, "TEXT"` | Print literal string at a position |
| `print centered at Y, "TEXT"` | Print literal centered on a 32-column text line |
| `print Value at X,Y [digits N]` | Print variable (type inferred) |
| `print Score at X,Y` | Print BCD score using its declared digit count |
| `print at X,Y, "SCORE:", Score` | Dense print with text and typed values |
| `format Value into Buffer [digits N]` | Format variable into buffer |
| `format Score into Buffer` | Format BCD into a same-length byte buffer |
| `put char V at X,Y` | Write one tile |
| `put Source [ + Offset] count N at X,Y` | Write a tile row or a runtime-selected source slice |
| `put Name at X,Y` | Write a known-length tile row |
| `put Name centered at Y` | Write a known-length tile row centered |
| `put Buffer frame size W,H at X,Y` | Write a tile frame |
| `Var = get char at X,Y` | Read one tile |
| `Buffer = get count N at X,Y` | Read a tile row |
| `Buffer = get frame size W,H at X,Y` | Read a tile frame |
| `replace TypeOrValue with Char in Buffer frame size W,H` | Replace tiles in a RAM frame buffer |
| `replace TypeOrValue with Char in Buffer frame size W,H into Count` | Same, storing replacement count |
| `fill Char count N at X,Y` | Fill repeated tile |

### Sprites

| Statement | Meaning |
|---|---|
| `sprites 8x8` / `sprites 16x16` | Sprite size |
| `sprites simple` / `sprites double` | Sprite zoom |
| `set sprite count N` | Number of active sprites |
| `set sprite I to Y,X,Pattern,Color` | Write shadow entry |
| `set sprite I tile X,Y pattern P color C` | Write shadow entry from tile-map coordinates |
| `set sprite I tile X,Y pattern P color C offset DX,DY` | Same, with signed pixel offset |
| `set sprite I pattern to P` | Change only the pattern byte in one shadow entry |
| `set sprites 0,1,2,3 x to X` | Change one field on several constant shadow entries |
| `set sprite I pattern bit B on/off` | Set or clear one pattern bit |
| `toggle sprite I pattern bit B` | Toggle one pattern bit |
| `move sprite I toward tile X,Y step S wait F frames` | Smoothly move a shadow entry toward tile coordinates |
| `move sprite I toward tile X,Y step S wait F frames animate pattern xor M` | Same, toggling pattern bits after each step |
| `hide sprite I` | Hide one shadow entry |
| `clear sprites` | Zero all shadow entries |
| `clear sprites from First count Count` | Hide a constant shadow-entry range |
| `update sprites` | Upload shadow to VRAM |
| `update sprites from First count Count` | Upload a constant shadow-entry range to VRAM |

`move sprite ... toward tile` targets the Coleco sprite position for tile
coordinates: X becomes `X * 8`, Y becomes `Y * 8 - 1`. The sprite index, step,
wait count, and optional xor mask are compile-time constants. `step` must divide
8, so tile-aligned movement reaches the target exactly instead of overshooting.

### Input

| Statement | Meaning |
|---|---|
| `joypad(N)` | Inline decoded joypad byte |
| `joypad(N).up/.right/.down/.left` | Canonical inline direction tests |
| `joypad(N).button1/.button2/.button3/.button4` | Canonical inline button tests |
| `joypad(N).fire` | Either standard fire button (`button1` or `button2`), emitted as one `$C0` mask test |
| `joypad(N).action` | Any of the four Super Action buttons, emitted as one `$F0` mask test; keypad keys are excluded |
| `joypad(N).property.pressed` | One-frame edge test for a direction, button, `fire`, or `action`; repeated reads are stable and held input does not repeat |
| `joypad(N).property.released` | One-frame release test for a direction, button, `fire`, or `action`; repeated reads are stable |
| `keypad(N)` | Inline decoded keypad byte |
| `spinner(N)` | Signed movement delta since the previous read; reading consumes it (`1`: right positive, `2`: down positive) |
| `frame` | Inline 16-bit frame counter; byte targets receive the low byte |
| `vdp.status` | Inline VDP status byte |
| `read joypad N into Var` | Old staged joypad read |
| `read keypad N into Var` | Old staged keypad read |
| `read spinner N into Var` | Old staged signed-delta read; it also consumes the movement; prefer `Var = spinner(N)` |
| `read frame into Var` | Old staged frame read; prefer `Var = frame` |
| `if button N on Pad goto Label` | Supported staged joypad button branch |
| `if left/right/up/down on Pad goto Label` | Supported staged direction branch |
| `if any collision goto Label` | VDP coincidence branch |
| `hitbox Name = X,Y size W,H` | Named local sprite hitbox |
| `if sprite A hitbox HitA collides with sprite B hitbox HitB goto Label` | Preferred sprite gameplay collision |
| `if box X1,Y1 size W1,H1 collides with box X2,Y2 size W2,H2 goto Label` | Logical pixel-box collision without VRAM reads |
| `if sprite A collides with sprite B box W,H goto Label` | Shortcut for same box on both sprites |
| `if sprite A collides with sprite B box X,Y size W,H goto Label` | Shortcut for same offset box on both sprites |
| `tile type solid = $20,$21` | Named tile property group |
| `if tile under X,Y is solid goto Label` | Pixel-to-tile point collision |
| `if tiles under box X,Y size W,H contain solid goto Label` | Pixel box-to-tile collision |
| `find tile coin under box X,Y size W,H into TX,TY` | Find first matching tile |
| `if chars in box X,Y size W,H contain solid goto Label` | Tile-coordinate box scan |
| `sleep after N seconds [on joypad N]` | Nonblocking menu idle service; call once per frame; any selected control wakes |
| `pause until press and release [on joypad N] [sleep after N seconds]` | Debounced confirmation pause with optional CRT sleep |
| `wait fire [on joypad N]` | Low-level wait for any action button |
| `wait no fire [on joypad N]` | Wait until all action buttons are released |
| `wait` | Safe one-frame wait; works with NMI on or off |
| `wait N frame(s)` | Safe 16-bit frame wait; constant 0 is ignored |
| `wait N frame(s) or press [on joypad N]` | Wait up to N frames, but exit early on any action button |
| `wait vblank [N]` | Low-level alias for frame waits |
| `wait key N [on keypad N]` | Wait for keypad digit |
| `wait key release [on keypad N]` | Wait for keypad release |
| `choose keypad min to max into Var [on keypad N] [sleep after N seconds]` | Debounced menu selection with optional CRT-safe sleep |
| `choose menu min to max into Var cursor Tile at X,Y step N [clear Tile] [on joypad N] [sleep after N seconds]` | Complete vertical cursor menu |
| `choose menu min to max into Var cursor sprite I at X,Y step Pixels [on joypad N] [sleep after N seconds]` | Vertical menu using a configured sprite cursor |
| `halt` | Halt until NMI |

### Sound

| Statement | Meaning |
|---|---|
| `set sound table Name [areas N]` | Install sound table |
| `play sound N` | Trigger sound slot |
| `play sounds A, B [, ...]` | Trigger two or more sound slots together |
| `play song Name` | Start music table |
| `stop song` | Stop music |
| `mute all` | Silence output |
| `sound runtime on/off` | Toggle NMI sound update |
| `enable spinner` / `disable spinner` | Spinner runtime toggle |
| `play dsound Name [step N]` | Play 4-bit PCM DSOUND |

### Arrays

Byte-sized index expressions are accepted consistently in reads, comparisons, and
routine arguments. For example, both `if Board[(Y << 3) + X] = 0 then` and
`IsEnemy(Side, Board[(Y << 3) + X])` are valid; a temporary index is optional, not a
required workaround. Runtime indexes remain the programmer's responsibility and are not
implicitly bounds-checked.

Global primitive arrays may declare two literal dimensions and use row/column
indexing. Storage is row-major, so `Board[Y,X]` is equivalent to
`Board[(Y * Columns) + X]` without a descriptor or runtime helper:

```basic
u8 Board[8,8]
u16 Distances[4,6]
const MapWidth = 16
const MapHeight = 12
u8 Map[MapHeight,MapWidth]

Board[Row,Column] = Tile
if Board[Row,Column] = Wall then StopPlayer
```

Dimensions may be decimal or hexadecimal literals or numeric compile-time
constants; all forms generate the same flattened RAM layout and ASM. The total
element count must be 1 through 255. Constant out-of-range indexes are
rejected; variable indexes have no implicit bounds check. This first version is
limited to global primitive arrays. Record fields, record arrays, overlays, and
local 2D arrays fail closed rather than using an ambiguous layout.

| Statement | Meaning |
|---|---|
| `fill array Arr with Value [count N]` | Fill all or a constant-sized prefix |
| `fill array Arr repeating Pattern [count N]` | Fill with repeated pattern |
| `copy Src to Dst [count N]` | Bulk copy array/buffer/VRAM blocks |
| `shift array Arr down N` | Shift toward higher indices |
| `shift array Arr up N` | Shift toward lower indices |
| `reverse array Arr` | Reverse in place |
| `reverse array Arr from I count N` | Reverse slice |

### Data

| Statement | Meaning |
|---|---|
| `restore Name` | Reset DATA cursor |
| `read Var` / `read V1, V2, ...` | Read DATA item(s) |

### ASM interop

| Statement | Meaning |
|---|---|
| `asm { ... }` | Inline Z80 assembly block |
| `include asm "@project/file.inc"` | Include external ASM/data without an inline ASM block |
| `call asm Label [with reg = value, ...]` | Call a raw Z80 label, optionally loading ABI registers first |

---

## Intent-Oriented Quick Reference

| Goal | Preferred Amy form |
|---|---|
| Minimal text bootstrap | `text screen` → `print ... at X,Y` → `screen on` |
| Main entry point | top-level code (implicit `Start`) |
| Infinite main loop | `loop forever` or `do ... loop` |
| Timed game loop | `do` / `wait` / input / logic / `update sprites` / `loop` |
| Draw text | `print at X,Y, "TEXT"` |
| Draw a number | `print Value at X,Y digits N` |
| Draw a score | `print at X,Y, Score` |
| Compose a HUD string | `format Value into Buffer` then `put Buffer count N at X,Y` |
| One tile on screen | `put char V at X,Y` |
| `u8` table on screen | `put Name count N at X,Y` |
| Clear screen | `cls` |
| Show compressed picture | `show picture TitleScreen` |
| Upload raw bytes to VRAM | `copy Src count N to vram.*` |
| Use one sprite | `set sprite count 1` → `set sprite 0 to Y,X,P,C` → `update sprites` |
| Hide all sprites | `clear sprites` → `update sprites` |
| Poll controller | `if joypad(1).button1 then ...` |
| Wait for input | `pause until press` / `wait key1` / `wait key release` |
| Menu selection | `choose menu 1 to N into Var cursor Tile at X,Y step Rows` |
| Hardware collision | `if any collision goto Label` |
| Gameplay collision | `if sprite A hitbox PlayerHitbox collides with sprite B hitbox EnemyHitbox goto Label` |
| Tile feet collision | `if tile under PlayerX + 4,PlayerY + 15 is solid goto OnGround` |
| Tile box collision | `if tiles under box PlayerX,PlayerY size 16,16 contain hazard goto Hurt` |
| Collectible tile | `find tile coin under box PlayerX,PlayerY size 16,16 into HitX,HitY` |
| Structured branch | `if cond then` ... `elseif` ... `else` ... `end if` |
| Multi-way branch | `select case Var` ... `case N` ... `case else` ... `end select` |
| Indexed dispatch | `on Choice goto L1, L2, L3` |
| Counted loop | `for I = 0 to N` ... `next` |
| Descending loop | `for I = N downto 0` ... `next` |
| Conditional loop | `while cond` ... `end while` |
| Post-test loop | `do` ... `loop until Done` |
| Bounce movement | `bounce X by DX between 0 and MaxX` |
| Powers of two scale | `Value <<= N` / `Value >>= N` |
| Multiply in place | `Var *= N` |
| Boolean flag | `bool Ready = false` / `if Ready then` / `toggle Ready` |
| Arcade score (BCD) | `bcd digits 8 Score8` / `Score8 += 100` / `print at X,Y, Score8` |
| 32-bit counter | `u32 Counter32` / `inc Counter32` / `print Counter32 at X,Y` |
| Fixed-point value | `fixed Speed = 0.0` / `ufixed ScreenX = 40.75` |
| Random value | `Die = random(1, 6)` / `Noise = random()` / `Fp5Value = random(10, 20)` |
| ROM lookup table | `data Name bytes ...` / `restore Name` / `read Var` |
| Fill `u8` array | `fill array Arr with 0` |
| Shift snake body | `shift array SnakeX down 1` |
| Low-level escape | `sub Helper: asm { ... } end sub` |

---

## Removed Forms Reference

All removed forms produce a hard compiler error with a fix-it hint. The complete generated table is in [amy-removed-forms.md](amy-removed-forms.md).

### Removed declarations and prefixes

These are hard errors. Use the canonical form:

| Removed | Use instead |
|---|---|
| `ram u8 Pad1` / `dim u16 Score` / `local u8 X` | `u8 Pad1` / `u16 Score` / `u8 X` |
| `boolean Ready = false` | `bool Ready = false` |
| `bcd 2 Score` | `bcd digits 4 Score` |
| `let Speed = 3` / `var Offset = $10` | `const Speed = 3` / `const Offset = $10` |
| `struct Name:` | `record Name:` |

### Removed procedure and alias forms

These are no longer part of the active parser surface:

- `proc`
- `end proc`
- `exit proc`
- plain `gosub Name`
- plain `call Name(...)`
- built-in scalar aliases such as `byte`, `word`, `integer`, `char`, `int`, `long`, and `boolean`

Use these instead:

```basic
define byte as u8

sub DrawThing:
  Setup
  return
end sub
```

Canonical type families remain:
- `u8`, `i8`
- `u16`, `i16`
- `u32`, `i32`
- `fixed` for signed 8.8 values
- `ufixed` for unsigned 8.8 values

---

## Current Limits and Non-Goals

These features do not yet exist at source level:

- `string` runtime variables
- Automatic mixed-type arithmetic dispatch across every operation
- Routine-level dead-code elimination

### Compound-assignment operator coverage (verified 2026-08-27)

The table below is empirical — compiled and confirmed against the full example catalog.
`pass` = compiles and emits code. `—` = not implemented (compile error).

| Type | `+=` | `-=` | `*=` | `/=` | `%=` | `&=` / `\|=` | `<<=` / `>>=` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `u8` / `i8` | pass | pass | pass | pass | pass | pass | pass |
| `u16` / `i16` | pass | pass | pass | pass | pass | pass | pass |
| `bcd` | pass | pass | — | — | — | — | — |
| `u32` / `i32` | pass | pass | pass | pass | pass | pass | pass |
| `fixed32` (fix16_16) | pass | pass | pass | pass | — | — | — |
| `fp5` | pass | pass | pass | pass | — | — | — |
| `fixed` (fix8_8) | pass | pass | pass | pass | — | — | — |

Notes:
- `bcd` `*=` and `/=` are intentionally not implemented.
- `%=` is available for byte, word, `u32`, and `i32` integer types.
- signed integer division truncates toward zero; `int()` on fp5 remains floor-style.
- fixed/fixed32/fp5 operators use dedicated runtime helpers and may cost more
  ROM than byte/word arithmetic.

## Planned Extensions

These are the most plausible next language extensions. They are not implemented yet and should not be relied on in Amy source code today.

### Priority candidates

- broader local-array support for wide integer element types
- richer mixed-width conversions where signedness and overflow behavior can remain explicit
- pass-by-reference or explicit out-parameter support for routines that need to mutate caller-owned data naturally
- richer fixed-point helpers for smoother movement and gameplay math beyond `whole`, `fraction`, `highbyte`, and `lowbyte`
- stronger optimizer awareness of Amy-generated flow so language improvements do not regress into fragile branch layouts

### Likely future language growth

- true runtime string variables and safer string-buffer workflows for **AMY v3**
- BCD multiplication/division/modulo only if a game proves they are worth the extra runtime/compiler surface
- first-class `fp5` expressions with BASIC-style real math builtins
- broader local-array support across more element types and bulk operations
- local records, richer record field types, and broader array-of-record support once the current global-first record model proves itself
- more dead-code elimination and print/format helper sharing to reduce ROM overhead in small demos

### Planned BASIC-equivalent fp5 builtins

For the SmartBASIC-style `fp5` tier, the intended AMY surface is:

| BASIC surface | Planned AMY equivalent | Notes |
| --- | --- | --- |
| `+` | `A + B` | same infix operator on `fp5` values |
| `-` | `A - B` | same infix operator on `fp5` values |
| `*` | `A * B` | same infix operator on `fp5` values |
| `/` | `A / B` | same infix operator on `fp5` values |
| `^` | `A ^ B` | exponentiation on `fp5` values |
| `ABS(x)` | `abs(x)` | canonical lowercase builtin |
| `SGN(x)` | `sgn(x)` | historical BASIC equivalent retained |
| `INT(x)` | `int(x)` | floor-style integerization for fp5 values |
| `RND(x)` | `random()` with `rnd()` alias | `random()` stays the AMY-style name |
| `SQR(x)` | `sqrt(x)` with `sqr()` alias | `sqrt()` stays the AMY-style name |
| `LOG(x)` | `log(x)` | planned fp5 builtin |
| `EXP(x)` | `exp(x)` | planned fp5 builtin |
| `SIN(x)` | `sin(x)` | planned fp5 builtin |
| `COS(x)` | `cos(x)` | planned fp5 builtin |
| `TAN(x)` | `tan(x)` | planned fp5 builtin |
| `ATN(x)` | `atn(x)` | historical BASIC spelling retained |
| `VAL(text)` | `val(text)` | parse decimal text into `fp5` |
| `STR$(x)` | `str$(x)` | format numeric value to decimal text |
| `STR$(x, digits N)` | `str$(x, digits N)` / `digits$(x, N)` | zero-padded numeric text |
| `STR$(x, width N)` | `str$(x, width N)` / `width$(x, N)` | right-aligned space/pad numeric text |

This is the committed language-direction list for AMY fp5 work.

Current partial implementation note:

- `Var = random()` is the canonical fp5 fractional sample form
- `Var = random(A, B)` is supported for fp5 targets and scales one fp5 random pull into the requested interval
- `random fp5 into Var`, `random fixed32 into Var`, and `rnd fp5 into Var` were removed; write `Var = random()`
- `Var = sqrt(Value)` is the canonical form for fp5/fixed32 square root
- `Var = abs(Value)` works for `fp5`, `fixed32`, and integer expressions; for `u16`/`i16` targets, byte operands are widened before subtraction so `Distance = abs(X1 - X2)` avoids `u8` wraparound
- `Var = absdiff(A, B)` computes the absolute scalar difference directly. It is equivalent in intent to `abs(A-B)`, but can stay compact for two unsigned bytes and uses signed-aware comparison when signed operands are involved. Do not mix signed and unsigned variables; a numeric constant is accepted only when it fits the other operand's signedness/range.
- `Var = sgn(Value)` works for `fp5`, integer, `fixed`, `ufixed`, and `fixed32` sources into byte/word/`fixed`/`fixed32`/`fp5` targets
- `Var = int(Value)` works for fp5-oriented floor/integerization into byte/word/`fixed32`/`fp5` targets; floor-style for negatives (`int -0.5 = -1`, `int -1.25 = -2`)
- `Buffer = str$(Value)` writes numeric text into a fixed `u8` buffer; supported numeric families are `bool`, `u8`, `i8`, `u16`, `i16`, `u32`, `i32`, `fixed`, `ufixed`, `fixed32`, `fp5`, and `bcd`
- `Buffer = str$(Value, digits N)` / `Buffer = digits$(Value, N)` writes a zero-padded numeric field
- `Buffer = str$(Value, width N)` / `Buffer = width$(Value, N)` writes a right-aligned numeric field using the configured pad tile
- lightweight buffer text expressions are accepted in assignment form for `u8` arrays, such as `Line = "A:" + str$(A)`; the same expression style works in `print at X,Y, ...`
- direct fp5 comparisons work in control flow (`if`, `while`, `select case`) for fp5-vs-fp5 and fp5-vs-integer-literal cases
- fp5 `+=`, `-=`, `*=`, `/=` are available
- fp5 `^= 2` is available as the immediate square case
- `Var = log(Value)` is a first-pass fp5 helper (production-grade)
- `Var = exp(Value)` exists as an experimental path only — not release-grade
- exact fp5 decimal print formatting currently requires `digits 16`; other fp5 `digits` widths are invalid
- friendly `str$()` formatting of zero, positive fractions, and negative fractions is ROM-tested identically in all five optimization profiles
- full fp5 expression-call forms such as `sin(x)` or general `a ^ b` are still not implemented

All `... into Var` statement forms (`sqrt Value into Var`, `abs Value into Var`, etc.) were removed; use the expression-assignment forms above. See [amy-removed-forms.md](amy-removed-forms.md).

### Not committed yet

These ideas have come up and may still prove worthwhile, but they are not committed language direction yet:

- compact flag-group syntax beyond ordinary packed `bool` globals/locals
- richer chess / AI-oriented helpers beyond what recursion and local stack arrays already make possible
- higher-level sprite animation DSLs on top of the existing machine-friendly primitives

---

## Authoring Workflow

1. Choose the memory profile explicitly.
2. Declare all global variables, constants, ROM data, and assets first.
3. Write the main flow in Amy statements.
4. Use `sub` / `function` for repeated work.
5. Only after that, check whether any missing operation still needs inline ASM.
6. If inline ASM is needed, isolate it in a small helper `sub`.
7. Prefer replacing repeated inline ASM with an existing language helper.

Fast-code style:
- prefer `X = expr`, `+=`, `-=`, `*=`, `/=`, `for`, `if`, and direct procedure
  calls over older statement families
- split complex expressions when it makes generated Z80 easier to predict
- use convenience commands (`text screen`, `show picture`) for prototypes, then
  switch to explicit mode/upload commands when timing or visual transitions matter
- keep every callable `sub` visibly terminated; future readers should see the
  Z80 control flow without reverse-engineering it
