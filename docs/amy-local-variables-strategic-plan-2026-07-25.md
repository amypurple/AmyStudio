# Amy Language Local Variables Strategic Plan

Date: 2026-07-25
Context: Reversi exposed several real bugs caused by global scratch variables (`Tmp`, `CellIndex`, `ScanX`, `Dir`) being shared across subroutine calls. DacMan and future ports with AI/search logic will hit the same wall harder, especially minimax-style recursion.

## Goal

Make variables declared inside a `sub` or future `function` local by default, while preserving Amy's core rule: generated Z80 must stay simple, predictable, and inspectable.

This is not just syntax polish. It is a correctness feature for ports from SDCC C and old devkit code where small helper variables are naturally scoped to one routine.

## Language Direction

### Phase 1: Static Locals In `sub`

Amy source:

```basic
sub CountDirection:
  u8 ProbeIndex = 0
  i8 Tx = 0
  i8 Ty = 0
  ...
  return
```

Meaning:

- Declarations inside a `sub` are local to that sub.
- They are statically allocated in RAM, not stack allocated.
- They are not recursion-safe.
- Internal symbol can be something like `AMY_LVAR_CountDirection_ProbeIndex`.
- Existing top-level declarations remain globals: `AMY_UVAR_ProbeIndex`.

Why static first:

- Smallest Z80 cost.
- Solves most accidental scratch-variable collisions.
- Easy to inspect in ASM/symbol maps.
- Keeps ordinary game code compact.

### Phase 2: Functions With Return Values

Example syntax to investigate:

```basic
function CountDirection(u8 X, u8 Y, u8 Dir) as u8:
  u8 Count = 0
  ...
  return Count
end function
```

or Amy-style alternative:

```basic
func CountDirection(u8 X, u8 Y, u8 Dir) -> u8:
```

Open design point: choose the form that feels most Amy/BASIC-like and does not add ambiguity with existing `sub`.

Initial implementation can be non-recursive/static locals just like Phase 1.

### Phase 3: Explicit Recursive Routines

Do not make recursion implicit by default. Recursion should be opt-in because stack locals cost bytes, cycles, and stack space.

Possible syntax:

```basic
recursive function MiniMax(u8 Depth, u8 Player) as i16:
  i16 Best = -32768
  i16 Score = 0
  u8 Move = 0
  ...
  return Best
end function
```

or:

```basic
function MiniMax(u8 Depth, u8 Player) as i16 recursive:
```

Expected implementation:

- Parameters and locals live in an IX-relative stack frame.
- Existing ref-param frame work is likely the closest starting point.
- Must define max practical recursion depth guidance in docs.
- Must make frame size visible in compiler output/debug info.

## Compatibility Strategy

Changing declarations inside `sub` from global to local may break old listings if they accidentally relied on sub-internal declarations being global.

Proposed strategy:

1. Modern behavior: declarations inside `sub` are local.
2. Top-level declarations are the only normal way to create globals.
3. Add compiler warning/fix-it when a symbol declared inside a sub is referenced outside that sub.
4. Optional transition flag if needed:

```basic
language locals modern
```

or, if we choose not to support old behavior:

- release note clearly says: move shared variables to top-level.

The project is still evolving fast, so a clean modern rule may be better than preserving a dangerous ambiguity.

## Transpiler Impact Areas

The transpiler currently resolves variables in many helper paths. Local variables must be visible to all of them.

Audit and update at least these areas:

- Symbol table creation and declaration scan.
- `getRuntimeInfo` / type lookup.
- `resolveAddressSymbol`.
- `symbolOrValue`.
- `emitLoadInt8ValueInto` and preserving variants.
- `emitLoadInt16IntoHL`.
- Assignment/store helpers.
- Array and record field parsing.
- Procedure parameter binding.
- `ref` parameter handling.
- `data` and asset label resolution must stay global/ROM-oriented.
- Inline ASM symbol visibility rules.
- Debug/symbol map output.
- Error messages and fix-its.

Important implementation principle:

> The compiler should not ask “is there a variable named X globally?” first. It should resolve through the current lexical scope first, then globals, then constants/data/assets/routines.

Suggested internal API:

```js
resolveSymbol(name, { currentProc, kindHint })
```

Resolution order:

1. current proc locals/params
2. globals
3. constants
4. data/assets/labels/routines depending on context

## RAM Address Implications

Local static variables still have RAM addresses. They are just private symbols.

Example:

```asm
AMY_LVAR_ReversiCountDirection_Tx: rb 1
AMY_LVAR_ReversiCountDirection_Ty: rb 1
```

For symbol maps and debugging:

- Show both logical name and physical symbol.
- Example display: `ReversiCountDirection.Tx = $70F2`.
- If a global and local have same source name, symbol map must disambiguate.

For recursive locals:

- They do not have a fixed RAM address.
- Debug info should report frame offset instead: `MiniMax.Score = ix-4` or similar.
- This is why recursive locals should be a separate phase.

## Required Test Cases

Create auto-testable cases, preferably under `tools/test-local-variable-codegen.mjs`.

### Phase 1 Static Local Tests

1. Local shadows global:

```basic
u8 X = 7
sub Foo:
  u8 X = 1
  X += 1
  return
```

Assert:

- global symbol still exists as `AMY_UVAR_X`
- local symbol emitted separately
- `Foo` modifies local, not global

2. Local used in expressions:

```basic
sub Foo:
  u8 A = 2
  u8 B = 3
  A = A + B
  return
```

3. Local arrays:

```basic
sub Foo:
  u8 Temp[8]
  Temp[3] = 9
  return
```

May be Phase 1b if arrays complicate the first implementation.

4. Local record variable:

```basic
record Actor:
  u8 X
  u8 Y
end record

sub Foo:
  Actor A
  A.X = 5
  return
```

May be Phase 1b.

5. Sub call does not clobber caller loop variable:

```basic
sub DrawThing:
  u8 I = 0
  I = 4
  return

sub Main:
  u8 I = 0
  for I = 0 to 7
    DrawThing
  next
  return
```

Assert caller loop `I` and callee `I` are different storage.

6. Address-taking/ref param with local:

```basic
sub Inc(ref u8 V):
  V += 1
  return

sub Foo:
  u8 Local = 1
  Inc(Local)
  return
```

Assert caller passes address of local static symbol.

7. Global fallback still works:

```basic
u8 Shared = 0
sub Foo:
  Shared += 1
  return
```

8. Error when local referenced outside scope:

```basic
sub Foo:
  u8 Hidden = 1
  return

Hidden = 2
```

Expect clear compiler error.

### Function Tests

1. `function AddOne(u8 X) as u8` returns `X + 1`.
2. Function call in assignment: `A = AddOne(4)`.
3. Function call in condition: `if CountMoves() > 0 then`.
4. Function with local scratch and no global pollution.

### Recursive Tests

1. Simple countdown recursion:

```basic
recursive function SumTo(u8 N) as u16:
  if N = 0 then return 0
  return N + SumTo(N - 1)
end function
```

2. MiniMax-shaped skeleton:

```basic
recursive function Search(u8 Depth, u8 Player) as i16:
  i16 Best = -32768
  i16 Score = 0
  u8 Move = 0
  ...
  return Best
end function
```

3. Verify two recursive calls do not share locals.

## Reversi Validation Target

After Phase 1, rewrite Reversi scratch variables:

- `ProbeIndex`, `CellValue`, `StepX`, `StepY`, `Tx`, `Ty` local to `ReversiCountDirection`.
- `MoveX`, `MoveY`, `FlipStep` local to `ReversiApplyMove`.
- `BoardParity`, `BaseTile`, `TileX`, `TileY` local to `ReversiDrawPieceOnly` if codegen supports it.
- Keep true game state global: `Board`, `CursorX/Y`, scores, current player.

This should make Reversi source much closer to BASIC intent and remove a class of bugs.

## DacMan Validation Target

After Phase 1, inspect DacMan routines that use generic globals such as `Tmp`, `C`, `I`, `X`, `Y`, etc. Move scratch into routine-local declarations where possible.

Goal:

- fewer accidental clobbers
- clearer gameplay state vs scratch state
- same ROM behavior

## Claude Investigation Handoff

Please review this plan with focus on compiler architecture and risks.

Questions for Claude:

1. Where in the current Amy transpiler is symbol resolution too global-first, and what exact functions need a scoped resolver?
2. Can Phase 1 static locals be implemented without touching stack-frame code?
3. Which existing tests are likely to break if declarations inside `sub` become local?
4. What minimal migration warning/fix-it should be added?
5. Is the existing `ref` parameter implementation reusable for recursive stack locals later?
6. What is the smallest useful `function ... as Type` implementation that composes with existing expression codegen?
7. Should local arrays/records be included in Phase 1 or delayed to Phase 1b?
8. How should the symbol map show `SubName.LocalName` and recursive frame offsets?

Expected deliverable from Claude:

- Architecture critique.
- Risk list.
- Suggested implementation order.
- Any hidden parser/transpiler traps.
- Opinion on syntax: `function Foo(...) as u8` vs `func Foo(...) -> u8`, and `recursive function` syntax.

## Recommended Implementation Order

1. Add scoped symbol model and static scalar locals in `sub`.
2. Add tests for shadowing, sub calls, ref local arguments, and outside-scope errors.
3. Migrate Reversi to local scalar scratch variables.
4. Add local arrays/records if Reversi/DacMan clearly benefit.
5. Add non-recursive functions with return values.
6. Add recursive functions/stack locals only after the static model is stable.

## Non-Goals For First Pass

- No implicit recursion.
- No heap allocation.
- No closures.
- No local `data` blocks inside routines.
- No optimizing locals into registers until correctness and symbol maps are stable.

## Addendum After Claude Review

Claude's 2026-07-25 review found that much of this plan describes features that already exist in Amy Studio:

- Bare declarations inside `sub` / `function` are already local by default.
- `function Name(...) as Type` return values already exist.
- IX-frame locals already make ordinary `u8` / `i8` / `u16` / `i16` recursion safe.
- Local arrays already exist for the supported scalar types.
- `ref` parameters already reuse the same frame mechanism.

The plan should therefore be reframed. The remaining useful work is not to invent locals from scratch, but to improve the existing model:

1. Document locals, functions, recursion, and `ref` parameters accurately.
2. Add a cheaper static-RAM local allocation path for non-recursive routines where an IX frame is unnecessary.
3. Keep or explicitly decide the current no-shadowing rule.
4. Fix the first-pass declaration scan so local declarations are not first registered as global-like symbols.
5. Add local records.
6. Warn or protect recursive 32-bit / float code paths that still use shared scratch slots.
7. Add symbol/debug output for `Sub.Local` locations.
8. Add a lint that detects globals used only as transient scratch inside one sub and suggests moving them local.

## Variable And Array Clone Notes

Amy already has good scalar copy syntax:

```amy
OtherX = PlayerX
```

Amy also already has bulk byte-array copy syntax:

```amy
copy Board to Backup
copy Board count 64 to Backup
```

This is the right spelling to preserve. It matches the language's natural `copy source to destination` style and compiles to a direct Z80 `LDIR` block, with no hidden runtime routine.

For AI/search ports such as Reversi minimax, this should be documented as the canonical way to clone board state:

```amy
u8 Board[64]
u8 WorkBoard[64]

copy Board to WorkBoard
```

Follow-up improvements worth considering:

- `copy Src to Dst` should infer the byte count when both sides are arrays of the same element type and known length.
- The compiler should emit a clear error if source and destination element types or lengths are incompatible.
- Record value copy should eventually use the same idea: `GhostBackup = Ghost` or `copy Ghost to GhostBackup`, compiled as a fixed-size byte copy once local records are supported.
- Arrays of records should support whole-array clone once record byte size is stable.

For now, avoid adding a separate `clone` keyword. `copy` is already part of the Amy vocabulary, already maps to the Z80 operation programmers expect, and keeps the language smaller.
# Historical syntax note

This planning document predates the removal of `end function`. Current Amy functions end
with their terminal `return Value`; examples below that still show `end function` are
historical design material, not valid current syntax. See `docs/amy-language.md` for the
authoritative language reference.
