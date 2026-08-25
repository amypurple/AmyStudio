# Amy Optimization Cookbook

Amy encourages readable game code, but the same result can often be expressed with different ROM-size, RAM, and execution-time tradeoffs. This guide shows practical progressions: begin with the clearest form, measure, then select a more data-driven form when it benefits the game.

The generated Z80 and exact byte count can change with context and optimizer level. Compile the real project and use ROM TEST & DEBUG when timing matters.

## Optimization profiles

- **Off:** no optimization; best for exact ASM debugging.
- **Safe:** conservative local peepholes only.
- **Balanced:** recommended; local folds and branch shortening without speculative reuse.
- **Aggressive:** adds speculative register reuse and header RST reuse; verify the ROM.
- **Experimental:** adds hazardous reuse, dead-code removal, inlining, and eligible IX-frame stripping; test carefully.

A higher profile does not guarantee a smaller ROM. Global initializers are preserved because ASM, indirect access, symbols, and debugger watches may observe them even without a direct Amy read.

New optimizer rules are introduced in Aggressive and promoted only after ROM,
output, and debugger-map validation. Balanced remains the recommended default.

Register-pair shortening is conservative: writing either half of a pair invalidates
knowledge about the full pair. For example, changing `H` prevents reuse of an older
known `HL` address when compiling an indexed array access.

Aggressive also removes locally proven redundant low-byte zero reloads. Calls,
labels, control transfers, ASM barriers, and writes to the register cancel the
optimization.

Aggressive can remove a short register-pair save/restore when enclosed
instructions only read that pair. Writes, stack access, calls, branches, labels,
exchanges, and block instructions preserve the original `PUSH`/`POP`.

## Initializing an array of records

Assume this actor layout:

```basic
record Actor:
  u8 X
  u8 Y
  i8 DX
  i8 DY
  u8 State
end record

Actor Flies[3]
```

### Form 1: explicit assignments

```basic
Flies[0].X = 40
Flies[0].Y = 48
Flies[0].DX = 6
Flies[0].DY = 5
Flies[0].State = FlyFlying

Flies[1].X = 200
Flies[1].Y = 88
Flies[1].DX = -6
Flies[1].DY = 4
Flies[1].State = FlyFlying

Flies[2].X = 120
Flies[2].Y = 144
Flies[2].DX = 5
Flies[2].DY = -6
Flies[2].State = FlyFlying
```

**Advantages**

- Immediately readable while prototyping.
- Each field can be calculated or initialized conditionally.
- Easy to stop on an individual source line while debugging.

**Costs**

- Repeats field names, indexes, address calculations, and stores.
- Usually consumes the most source code and ROM.
- Easy to omit one field when adding another actor or level.

Use this for a unique object, calculated setup, or early prototype. It is not wrong merely because it is verbose.

### Form 2: sequential DATA with `restore` and `read`

```basic
data LevelTwoStream bytes
  3
  40,48,6,5,FlyFlying
  200,88,-6,4,FlyFlying
  120,144,5,-6,FlyFlying
end data

restore LevelTwoStream
read FlyCount
for I = 0 to FlyCount - 1
  read Flies[I].X, Flies[I].Y, Flies[I].DX, Flies[I].DY, Flies[I].State
next
```

**Advantages**

- Stores the number of actors with the data, so levels may have different lengths.
- One decoder can consume several kinds of sequential level information.
- More compact and less repetitive than explicit assignments.

**Costs**

- Uses the two-byte DATA cursor in RAM.
- Performs a loop, cursor updates, field-address calculations, and several stores at runtime.
- The byte stream is not structurally typed: the programmer must keep its order synchronized with the `read` list.

Use this for variable-length streams, mixed level commands, or data that must be consumed progressively rather than copied all at once.

### Form 3: typed record template with one `LDIR`

```basic
data LevelTwoFlies records Actor
  40,48,6,5,FlyFlying
  200,88,-6,4,FlyFlying
  120,144,5,-6,FlyFlying
end data

copy LevelTwoFlies to Flies
```

The compiler verifies:

- every row has exactly one value per record field;
- source and destination use the same record type;
- the number of template rows equals the RAM array length;
- v1 fields are byte-sized `u8`, `i8`, or `bool` values.

A valid copy becomes one ROM-to-RAM block transfer:

```asm
    ld hl,AMY_UDATA_LevelTwoFlies
    ld de,AMY_UVAR_Flies
    ld bc,15
    ldir
```

The exact setup sequence may differ when registers must be preserved, but there is no runtime helper and no per-field loop in Amy.

**Advantages**

- Shortest and usually fastest fixed-layout initialization.
- Compile-time type and size checks prevent silent layout mistakes.
- No DATA cursor RAM and no hidden record copy.

**Costs**

- Requires a fixed number of records matching the destination exactly.
- v1 does not yet support wider or nested record fields in typed ROM templates.
- Not suitable when every field must be calculated independently at runtime.

Use this for fixed enemy waves, initial board positions, object templates, and other complete snapshots copied from ROM to RAM.

## Choosing the form

| Need | Preferred form |
|---|---|
| Fast prototype or one unusual object | Explicit assignments |
| Variable actor count or command stream | `restore` + `read` |
| Fixed typed snapshot copied as a whole | `data ... records` + `copy` |
| Values calculated from gameplay state | Explicit assignments or a loop |
| Maximum initialization speed | Typed template + `LDIR` |

The best optimization is the one matching the data. Do not replace a flexible stream with a fixed block merely to save a few bytes, and do not pay for a decoder when the game only needs a fixed snapshot.

## Measured Fly Swatter example

Fly Swatter originally initialized every field of every fly separately. Its later refactor combined:

- typed record templates for all five waves;
- one `copy Wave to Flies` per level;
- removal of two decorative playfield borders;
- `joypad(1).fire` instead of two separate button tests;
- slightly faster late-wave data.

The Balanced ROM changed from **6125 bytes to 5852 bytes**, a reduction of **273 bytes**. This is a measured whole-project delta, not a claim that every project saves exactly 273 bytes or that every byte came from `LDIR` alone.

## Other useful Amy patterns

- Use `for each Actor, I in Actors` when every array element receives the same logic.
- Use runtime sprite indexes such as `set sprite I + 1 x to Actor.X` when actors map to a sprite pool.
- Use `joypad(N).fire` for either standard fire button and `.action` for any of four Super Action buttons.
- Use byte or word ROM lookup tables for fixed state-to-value mappings instead of long comparison ladders.
- Group consecutive VRAM transfers when the display update can safely be performed as one operation.

Always inspect generated ASM and measure the complete game. Amy Studio's goal is not to force one style, but to make the tradeoff visible and offer a concise form when the hardware has a better idiom.
## Replacing repeated decisions with lookup tables

A chain that selects constants from a small, fixed mapping often costs more ROM than its data:

```basic
if Direction = 0 then Mask = 1
if Direction = 1 then Mask = 2
if Direction = 2 then Mask = 4
if Direction = 3 then Mask = 8
```

Prefer a table when every branch only maps an index to data:

```basic
data DirectionMasks bytes = 1,2,4,8
Mask = DirectionMasks[Direction]
```

DacMan 2 also flattened five 16-byte direction tables into one 80-byte table plus a nine-byte offset table. This removed five repeated `if` tests while preserving the same data. Measure the result: a lookup is not automatically smaller when branches perform different actions or when calculating the index costs more than the tests.

For repeated clearing, use `fill array Values with 0 count N`. For one byte field across records, use `fill record array Actors field State with 0`; the compiler advances by the record stride instead of recalculating every indexed field address.
