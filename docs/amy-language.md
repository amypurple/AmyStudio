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

use lib "coleco.bios"
use lib "coleco.vdp"

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

Amy supports a small C-inspired conditional-compilation pre-pass. Disabled blocks are removed before variables, DATA, assets, includes, and runtime helpers are scanned, so they do not increase ROM size and do not create missing-symbol errors.

```basic
define DEBUG_HOLES

ifdef DEBUG_HOLES
  print centered at 10, "DEBUG HOLES"
end ifdef

ifndef FULL_GAME
  include "@project/test-levels.inc"
else ifdef
  include "@project/full-levels.inc"
end ifdef
```

Also accepted for C-style familiarity:

```basic
#define DEBUG_HOLES
#ifdef DEBUG_HOLES
  print centered at 10, "DEBUG HOLES"
#else
  print centered at 10, "NORMAL"
#endif
```

Rules:
- `define NAME` and `#define NAME` create compile-time flags only; they are not runtime variables and emit no code.
- `ifdef NAME` / `#ifdef NAME` keeps the block only when the flag is already defined.
- `ifndef NAME` / `#ifndef NAME` keeps the block only when the flag is not defined.
- `if defined NAME`, `if not defined NAME`, and `if not define NAME` are accepted aliases.
- Prefer `else ifdef` plus `end ifdef` in Amy-style code because plain `else` is normal Amy control flow. `#else` and `#endif` are accepted for C-style conditional blocks.

Statement conventions used throughout this document:

- `Name` — source identifier
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

Current record limits:
- no local record variables yet
- no arrays inside a record yet
- no record fields wider than the current byte/word/bool subset

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
- locals use an `IX`-based stack frame
- locals are initialized at procedure entry and released on return
- parameters and locals are stack-backed, so recursive calls get distinct
  storage for each active invocation

Design direction under discussion:
- preserve stack-backed locals where recursion or re-entrancy is required
- investigate whether the default local-storage model should become a faster static/overlay model for ordinary ColecoVision code
- if that change ever ships, it should be explicit in the docs and should not silently change recursion behavior

Accepted local scalar declarations: `u8`, `i8`, `u16`, `i16`, `u32`, `i32`, `bool`, `fixed`, `ufixed`.
Local `u8` and `u16` arrays are supported.
Local `bcd` variables are supported.
Local `u32`/`i32` arrays are supported.

Important current nuance:
- stack-friendly routine parameters are implemented
- recursion is now a valid design target
- local `u32` / `i32` scalar operations are not yet as broad as local byte/word/fixed-point operations
- local `u32` / `i32` arrays are the current practical stack-based path for temporary 32-bit storage

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

Array lengths may be numeric literals or compile-time constant integer expressions,
for example `const MaxClouds = 4` followed by `u8 CloudX[MaxClouds]`.

Global `bool` variables are bit-packed: up to 8 globals share one byte. Source code uses them as normal named flags.

Legacy scalar aliases such as `byte`, `word`, `integer`, `char`, `int`, `long`, and `boolean` are removed. Use canonical typed names only.

FP5 note:
- `fp5` is the canonical source spelling for the historical 5-byte real type
- `float` was removed; use `fp5`

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
  print "GO" at 10,8
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
- a function that reaches the next routine or the end of file without a terminal
  `return Value` is a compile error

`return` accepts a full expression, not only a plain variable or literal. This includes nested function calls and array indexing when the expression type matches the function return type.

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
  print "PASS" at 11,11
elseif Score > 5 then
  print "OK" at 11,11
else
  print "FAIL" at 11,11
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

```basic
for I = 0 to 31
  put char Tiles[I] at I,10
next
```

```basic
for I = 0 to MaxClouds - 1
  set sprite I + 1 to Clouds[I].Y - 1, Clouds[I].X - 8, CloudPattern, 15
next I
```

```basic
for I = 7 downto 0
  hide sprite I
next
```

```basic
for File = 8 to 0 step -2
  print File at 0,4 digits 2
next
```

```basic
for Depth = 0 to MaxDepth()
  continue for        ' skip to next iteration
  exit for            ' break out
next
```

`next I` is preferred when the loop variable is useful documentation. The opening `for` line may end with `:` if desired.

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

These remain intentional low-level dispatch tools for 8-bit game state code.
Unlike plain `gosub`, indexed `on Expr gosub` is still part of the supported language surface.

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
inc Score
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

BCD canonical surface:

```basic
bcd digits 4 Score = 0
bcd digits 4 Timer = StartTimer

Score = 0
Score = StartScore
Score = OtherScore
Score += 100
Score -= 5
inc Score
dec Score

if Score > 0 goto HasScore
if Score >= StartScore goto Bonus
if Score > BestScore goto NewBest

print Score at 0,0
print at 0,0, "SCORE:", Score
format Score into ScoreText
```

BCD current limits:
- no `bcd *=`, `bcd /=`, or `bcd %=`
- no BCD arrays or record fields yet
- no local BCD non-zero initializer
- no implicit assignment from `u16`, `u32`, fixed, or fp5 runtime values
- no general BCD expressions such as `Score = Score + 10`
- indexed byte reads such as `Score[0]` are for debugging/inspection only

Temporary cleanup note: old u32 prefix forms still compile (`u32 zero Counter32`,
`u32 add Addend32 to Counter32`, etc.), but new code should use `clear`,
assignment, `+=`, `-=`, `inc`, and `dec`.

### Shift

```basic
Value <<= 3
Score >>= 2
```

Intended for `u8`/`i8` and `u16`/`i16` variables, fixed shift counts.

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
fill array Tiles repeating Pattern
fill array Tiles repeating Pattern count 32
copy Board to Backup
copy Board count 8 to Backup
shift array SnakeX down 1
shift array SnakeX up 1
reverse array Board
reverse array Board from 2 count 6
```

Current limits: `u8` arrays. `count` and slice values are safest as compile-time constants.
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
`Counter /= N`: integer division truncates toward zero for signed targets; zero divisor stores `0`.
`A % B` / `A mod B`: integer remainder for `u8`, `i8`, `u16`, and `i16`.
`Var %= B` is the in-place form. Division by zero stores `0`. Signed modulo uses
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
- integer random values use the Coleco BIOS random seed at `$73C8`, with an Amy zero-seed guard before calling the BIOS random routine
- `Fp5Var = random(A, B)` returns an `fp5` value in `A..B` using `A + random() * (B-A)`
- `random between A and B into Var` was removed; write `Var = random(A, B)`
- use `Fp5Var = random()` for an `fp5` fractional sample in `0.0 .. <1.0`
- use `Fixed32Var = random()` for a `fixed32` fractional sample

### U32 helpers

```basic
u32 zero Counter32
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
```

Operands are `u32` variables or compatible 4-byte little-endian `u8` arrays, not scalar `u16` values.

Open caution:
- `Amy Math Demo` still has an open `u32` regression in its validation chain
- do not treat that demo as the final authority on `u32` correctness until that issue is closed

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
| `upload picture Name` | unchanged | unchanged | no display policy | uploads picture |

Use `display off` / `display on` when you only want to hide VRAM changes from
the player. Use `screen on` when you also want the normal NMI-enabled frame loop.

### Graphics modes

```basic
text screen
tile screen
bitmap screen
bitmap screen color $F0
picture screen
multicolor screen
backdrop sky blue
```

Canonical forms:
- `text screen`
- `tile screen`
- `bitmap screen` / `bitmap screen color $F0`
- `picture screen`
- `multicolor screen`

Old technical forms still compile in some cases during cleanup, but examples
should not use them:
- `graphics mode 1 text`
- `graphics mode 1 color $F0`
- `graphics mode 2 text`
- `graphics mode 2 bitmap`
- `graphics multicolor` / `graphics mode 3 multicolor`

`bitmap screen` is the normal drawable bitmap surface for `pset`, `preset`,
`line`, and `circle`; its default color byte is `$F0`, so the color clause is
optional.

`picture screen` is the raw Graphics II picture/table surface used before
uploading or decompressing full-screen pattern/color assets.

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
`bitmap screen`, `picture screen`, or `multicolor screen`.

`load default ascii` also accepts legacy style flags:
- `load default ascii normal`
- `load default ascii bold`
- `load default ascii italic`
- `load default ascii bold italic`

When using a styled default ASCII font in Mode 2 text, follow it with `duplicate mode 2 text patterns` if you want the styled glyphs copied to all three pattern thirds.

`tile screen` expands to the old Mode 2 text-style tile surface:
- `graphics mode 2 text`
- `load default ascii`
- `duplicate mode 2 text patterns`
- `fill mode 2 text color with $F0`
- `cls`

Use `tile screen` when you deliberately want Graphics II pattern/color thirds
while still writing tile/text-style code. It uses the 6144-byte Graphics II
color table, not the 32-byte text color table. For normal tile text and ASCII
color groups, use `text screen`.

`graphics mode 2 text` remains available as the explicit low-level setup for
the same surface, but it does not load ASCII, duplicate thirds, fill colors, or
clear the name table by itself.

### Name table / screen pages

```basic
cls
set default name table vram $1C00
set screen pages vram.name and vram $1C00
swap screens
```

### VRAM direct access

```basic
vpoke vram.name + $0000, $41
vpeek vram.name + $0000 into Value
fill vram.pattern with Value count N
fill vram.color with Value count N
fill vram.name with Value count N
merge PatternBytes count 8 to vram.pattern mask $F0 xor $0F
fill row 10 from 0 count 32 with $20
fill vram.name with sequence $00..$FF repeat 3
fill mode 2 text color with $F0
fill full mode 2 text color with $F0
ByteVar = vdp.status
```

`fill mode 2 text color with X` fills the first 2KB Mode 2 color third, then duplicates it into the second and third thirds.  
`fill full mode 2 text color with X` fills the full 6144-byte color table directly as one contiguous reset.  
Both produce the same final bytes on the standard Amy Mode 2 layout; the non-full form matches the historical duplicated-thirds text setup path, while `full` is the direct total-reset form.

### Copy / Decompress / Show

```basic
copy Charset to vram.pattern
copy PixelBitmaps + StarOffset count 8 to vram.pattern + 128
copy Source count 32 to vram $0800
copy vram.name count 64 to Buffer
copy vram.name to Buffer count 64
merge PatternBytes count 8 to vram.pattern mask $F0 xor $0F
decompress zx0   Asset   to vram.pattern
decompress rle   Table   to vram.color
decompress mdkrle Table  to vram.name
decompress pletter Asset  to vram.name
decompress dan1  Asset   to vram.pattern
decompress dan2  Asset   to vram.pattern
decompress dan3  Asset   to vram.pattern
decompress zx7   Asset   to vram.pattern
decompress lzf   Asset   to vram.pattern
decompress bitbuster Asset to vram.pattern
```

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
define colors NameColors at Pos
define colors NameColors at 48 count 10
set sprite pattern table vram.pattern
set sprite pattern table vram.spr_pat
reflect pattern 0 to 16 count 1 vertical
reflect pattern 16 to 17 count 1 horizontal
rotate pattern 17 to 18 count 1 90
```

`define chars ... at N` copies 8-byte character patterns into all three Mode 2 pattern thirds automatically.
`define colors ... at N` copies 8-byte color rows into all three Mode 2 color thirds automatically.

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
print "TEXT" at X,Y
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

Dense `print at X,Y, ...` note:
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
fill at X,Y Char count N
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
set sprite count N
set sprite I to Y,X,Pattern,Color
set sprite I + 1 to SpriteY - 1,SpriteX - 8,Pattern,Color
set sprite I tile TileX,TileY pattern Pattern color Color
set sprite I tile TileX,TileY pattern Pattern color Color offset DX,DY
hide sprite I
clear sprites
clear sprites from 4 count 4
update sprites
update sprites from 4 count 4
```

After changing shadow entries, call `update sprites`.  
Sprite shadow writes are not visible until `update sprites`.
This is an intentional machine contract:
- `set sprite ...`, `hide sprite`, and `clear sprites` modify shadow state only
- `clear sprites from First count Count` hides a constant range without changing sprite count
- `update sprites` uploads the active shadow entries to the VDP
- `update sprites from First count Count` uploads only a constant range and writes the sprite terminator after that range
- AMY keeps that boundary explicit to protect predictable ColecoVision rendering behavior

`set sprite I to Y,X,Pattern,Color` is the native pixel-coordinate form and
keeps the ColecoVision sprite Y convention visible. `set sprite I tile X,Y
pattern P color C` is the tile-map convenience form: it lowers to pixel
coordinates `X * 8` and `Y * 8 - 1`, so a sprite whose top-left visual pixel is
on tile `(X,Y)` lands where a game programmer expects.

Add `offset DX,DY` when the gameplay point is not the sprite's top-left corner.
Offsets are signed pixel adjustments after tile-to-pixel conversion. For
example, `offset -4,-8` places an 8x8 sprite around a center/feet-style anchor
instead of directly at the tile's top-left visual pixel.

---

## Input

Inline input expressions are the canonical default style for common controller/status reads:

```basic
if joypad(1).up then
  dec PlayerY
end if

if joypad(1).button1 then goto Fire
RawPad = joypad(1)
Key = keypad(1)
Spin = spinner(1)
FrameCount = frame
print vdp.status at 0,0
```

Preferred modern forms:

```basic
Pad1 = joypad(1)
Key1 = keypad(1)
Spin1 = spinner(1)
FrameVar = frame
print vdp.status at 0,0
```

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
wait vblank 5
wait key1
wait key7 on keypad 2
wait key release on keypad 2
halt
```

`pause until press` waits for fire-button release, then waits for a new
fire-button press. Without `on joypad N`, either controller can resume.
Use it for menu pauses and "press to continue" screens. `wait fire` and
`wait no fire` still compile for low-level button waits, but new examples
should prefer `pause until press`.
`wait` is the canonical one-frame wait. It uses the safe frame-delay runtime:
when NMI is enabled it waits through `NMI_FLAG`, and when NMI is disabled it
polls the VDP status register directly instead of hanging on `halt`.
`wait N frame(s)` is the same safe wait for explicit 16-bit frame counts;
constant `0` waits are ignored.
`wait N frame(s) or press` waits up to a 16-bit frame count but exits early
when fire is pressed. Without `on joypad N`, either controller can interrupt.
`wait vblank [N]` remains accepted as the lower-level spelling.

### Choose (menu selection)

```basic
choose keypad 1 to 3 into Speed
```

Waits for a keypad digit in the given range and stores it.

Computed bounds are also accepted:

```basic
choose keypad MinChoice() to MaxChoice() into Speed
```

### Collision

```basic
if any collision goto Hit
if not any collision goto Safe

hitbox PlayerHitbox = 3,5 size 10,9
hitbox EnemyHitbox = 2,2 size 12,12
if sprite 0 hitbox PlayerHitbox collides with sprite 1 hitbox EnemyHitbox goto Hit

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
- `chars in box TileX,TileY size W,H contain TypeOrValue` scans a rectangle
  directly in name-table tile coordinates. Use it for map logic that is already
  tile-based, such as checking whether a 3x3 area around a candidate tile
  touches a hole. When `W` and `H` are constants and the box fits in
  `AMY_BUFFER32` (up to 32 bytes), Amy reads the whole rectangle once with the
  BIOS frame read path and scans RAM instead of doing one VDP read per tile.

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
wait vblank 5
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
Use `{Name}`, `{$16}`, `{200}`, or `{byte:$16}` inside a row to insert a
single non-printable/custom tile byte. Use `{{` or `}}` for literal braces.
This is useful with `put MazeMap frame size W,H at X,Y` for visible tile maps.
`bitmap8` converts each 8-pixel row to one byte (ROM order).  
`sprite16` converts 16-row groups to 32 sprite bytes: 16 left-column bytes then 16 right-column bytes.
Each visual row may be written either as `"...."` or `bitmap "...."`. The `bitmap` keyword is optional.

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

## Libraries

```basic
use lib "coleco.bios"
use lib "coleco.vdp"
use lib "cvdevkit.rle"
```

`use lib` is a deprecated no-op. Amy links required runtime modules
automatically from the statements used by the program.

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
| `use lib "name"` | Include library bundle |
| `const Name = value` | Compile-time constant |
| `enum Name:` ... `end enum` | Group compile-time constants |
| `u8 Name = value` | Global 8-bit unsigned RAM variable |
| `i8 Name = value` | Global 8-bit signed RAM variable |
| `u8 Name[N]` | Global 8-bit RAM array |
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
- supported `int8` expression forms currently include literals, variables, array `u8` reads, function-like `random(N)` and `random(A, B)`, parentheses, unary `+`/`-`, and binary `+`/`-`/`%`/`mod`/constant-scaled `*`
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
| `tile screen` | Advanced Graphics II tile/text bootstrap with duplicated thirds |
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
| `set default name table Addr` | Change name table base |
| `set screen pages A and B` | Double-buffer pages |
| `swap screens` | Swap double-buffer pages |
| `vpoke vram_addr, Value` | Write one VRAM `u8` |
| `vpeek vram_addr into Var` | Read one VRAM `u8` |
| `fill vram.pattern with V count N` | Fill VRAM region |
| `fill row R from Col count N with V` | Fill name table row |
| `fill vram.name with sequence $00..$FF repeat N` | Fill sequential tiles |
| `copy Src [count N] to Dst` | Bulk copy (VRAM, arrays, buffers) |
| `merge Src count N to vram.* mask M xor X` | Copy bytes to VRAM as `(byte & M) xor X` |
| `decompress CODEC Name to vram.*` | Decompress asset to VRAM |
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
| `print "TEXT" at X,Y` | Print literal string |
| `print centered at Y, "TEXT"` | Print literal centered on a 32-column text line |
| `print Value at X,Y [digits N]` | Print variable (type inferred) |
| `print Score at X,Y` | Print BCD score using its declared digit count |
| `print at X,Y, "SCORE:", Score` | Dense print with text and typed values |
| `format Value into Buffer [digits N]` | Format variable into buffer |
| `format Score into Buffer` | Format BCD into a same-length byte buffer |
| `put char V at X,Y` | Write one tile |
| `put Name count N at X,Y` | Write a tile row |
| `put Name at X,Y` | Write a known-length tile row |
| `put Name centered at Y` | Write a known-length tile row centered |
| `put Buffer frame size W,H at X,Y` | Write a tile frame |
| `Var = get char at X,Y` | Read one tile |
| `Buffer = get count N at X,Y` | Read a tile row |
| `Buffer = get frame size W,H at X,Y` | Read a tile frame |
| `replace TypeOrValue with Char in Buffer frame size W,H` | Replace tiles in a RAM frame buffer |
| `replace TypeOrValue with Char in Buffer frame size W,H into Count` | Same, storing replacement count |
| `fill at X,Y Char count N` | Fill repeated tile |

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
| `keypad(N)` | Inline decoded keypad byte |
| `spinner(N)` | Inline spinner byte |
| `frame` | Inline 16-bit frame counter; byte targets receive the low byte |
| `vdp.status` | Inline VDP status byte |
| `read joypad N into Var` | Old staged joypad read |
| `read keypad N into Var` | Old staged keypad read |
| `read spinner N into Var` | Old staged spinner read; prefer `Var = spinner(N)` |
| `read frame into Var` | Old staged frame read; prefer `Var = frame` |
| `if button N on Pad goto Label` | Supported staged joypad button branch |
| `if left/right/up/down on Pad goto Label` | Supported staged direction branch |
| `if any collision goto Label` | VDP coincidence branch |
| `hitbox Name = X,Y size W,H` | Named local sprite hitbox |
| `if sprite A hitbox HitA collides with sprite B hitbox HitB goto Label` | Preferred sprite gameplay collision |
| `if sprite A collides with sprite B box W,H goto Label` | Shortcut for same box on both sprites |
| `if sprite A collides with sprite B box X,Y size W,H goto Label` | Shortcut for same offset box on both sprites |
| `tile type solid = $20,$21` | Named tile property group |
| `if tile under X,Y is solid goto Label` | Pixel-to-tile point collision |
| `if tiles under box X,Y size W,H contain solid goto Label` | Pixel box-to-tile collision |
| `if chars in box X,Y size W,H contain solid goto Label` | Tile-coordinate box scan |
| `find tile coin under box X,Y size W,H into TX,TY` | Find first matching tile |
| `pause until press [on joypad N]` | Recommended pause/menu wait: release, then new fire press |
| `wait fire [on joypad N]` | Low-level wait for fire |
| `wait no fire [on joypad N]` | Wait for release |
| `wait` | Safe one-frame wait; works with NMI on or off |
| `wait N frame(s)` | Safe 16-bit frame wait; constant 0 is ignored |
| `wait N frame(s) or press [on joypad N]` | Wait up to N frames, but exit early if fire is pressed |
| `wait vblank [N]` | Low-level alias for frame waits |
| `wait key N [on keypad N]` | Wait for keypad digit |
| `wait key release [on keypad N]` | Wait for keypad release |
| `choose keypad min to max into Var` | Menu selection |
| `halt` | Halt until NMI |

### Sound

| Statement | Meaning |
|---|---|
| `set sound table Name [areas N]` | Install sound table |
| `play sound N` | Trigger sound slot |
| `play song Name` | Start music table |
| `stop song` | Stop music |
| `mute all` | Silence output |
| `sound runtime on/off` | Toggle NMI sound update |
| `enable spinner` / `disable spinner` | Spinner runtime toggle |
| `play dsound Name [step N]` | Play 4-bit PCM DSOUND |

### Arrays

| Statement | Meaning |
|---|---|
| `fill array Arr with Value` | Fill with constant |
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
| `include "@project/file.inc"` | Include external ASM/data without an inline ASM block |

---

## Intent-Oriented Quick Reference

| Goal | Preferred Amy form |
|---|---|
| Minimal text bootstrap | `text screen` → `print ... at X,Y` → `screen on` |
| Main entry point | top-level code (implicit `Start`) |
| Infinite main loop | `loop forever` or `do ... loop` |
| Timed game loop | `do` / `wait` / input / logic / `update sprites` / `loop` |
| Draw text | `print "TEXT" at X,Y` |
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
| Menu selection | `choose keypad 1 to N into Var` |
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

### Compound-assignment operator coverage (verified 2026-06-10)

The table below is empirical — compiled and confirmed against the full example catalog.
`pass` = compiles and emits code. `—` = not implemented (compile error).

| Type | `+=` | `-=` | `*=` | `/=` | `%=` |
| --- | --- | --- | --- | --- | --- |
| `u8` / `i8` | pass | pass | pass | pass | pass |
| `u16` / `i16` | pass | pass | pass | pass | pass |
| `bcd` | pass | pass | — | — | — |
| `u32` | pass | pass | pass | pass | — |
| `fixed32` (fix16_16) | pass | pass | pass | pass | — |
| `fp5` | pass | pass | pass | pass | — |
| `fixed` (fix8_8) | pass | pass | pass | pass | — |

Notes:
- `bcd` `*=` and `/=` are intentionally not implemented.
- `%=` is intentionally integer-only for byte/word types at this stage.
- signed integer division truncates toward zero; `int()` on fp5 remains floor-style.
- fixed/fixed32/fp5 operators use dedicated runtime helpers and may cost more
  ROM than byte/word arithmetic.

## Planned Extensions

These are the most plausible next language extensions. They are not implemented yet and should not be relied on in Amy source code today.

### Priority candidates

- first-class local `u32` / `i32` scalar variables, not only array-backed temporary storage
- broader `u32` / `i32` arithmetic and comparison coverage beyond the current helper paths
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
- full fp5 expression-call forms such as `sin(x)` or general `a ^ b` are still not implemented

All `... into Var` statement forms (`sqrt Value into Var`, `abs Value into Var`, etc.) were removed; use the expression-assignment forms above. See [amy-removed-forms.md](amy-removed-forms.md).

### Not committed yet

These ideas have come up and may still prove worthwhile, but they are not committed language direction yet:

- compact flag-group syntax beyond ordinary packed `bool` globals/locals
- bitwise operators for explicit flag work, with clear rules for byte/word width
  and flag preservation in generated ASM
- `for each` loops over arrays/record arrays, likely after `length(Array)` or
  equivalent compile-time array introspection exists
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
