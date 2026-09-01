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

## Measure before and after

Use the same project, source metadata, and optimization profile for both measurements. A useful optimization report states:

- linked ROM bytes before and after;
- RAM used before and after;
- optimization level;
- whether cartridge metadata was enabled;
- whether assets or only code changed;
- focused test results;
- runtime or visual verification when behavior can change.

Use the ASM panel to compare generated, expanded, and optimized forms. Use **Open ROM / Debugger** to profile a routine when execution time matters. Source line count, generated ASM line count, compressed asset bytes, and final ROM bytes are different measurements.

For repository-wide maintenance:

```powershell
node tools/check-examples.mjs
powershell -ExecutionPolicy Bypass -File tools/audit-full-amy-optimizer.ps1
node tools/run-rom-tests.mjs
```

These are CLI workflows, not buttons in Amy Studio.

## Prefer data only when the operation is data

A lookup table is a good replacement when branches merely map a bounded index to constants. It is not a good replacement when branches perform different side effects, require expensive index construction, or make invalid indexes possible.

Likewise, a complete typed record template is ideal for a fixed RAM snapshot. A DATA cursor is better for variable-length command streams. Explicit assignments remain clearer for calculated or exceptional initialization.

Measure all three forms in the real routine when the difference matters.

## Use `swap` for real exchanges

Do not keep two temporary bytes merely to exchange two byte or word values:

```basic
swap Values[Left] with Values[Right]
```

This is safer than a handwritten exchange when either index is dynamic, because Amy
preserves the first value across both address calculations. In the five sorting examples,
replacing manual exchanges saved 64 Balanced ROM bytes in total. Four standalone examples
also removed one permanent RAM byte each. The original five ROMs and all 25 optimized
replacements were executed in GearColeco and produced the same sorted values.

Do not replace a temporary that represents an insertion key, pivot, pending write, or
other value that must survive beyond the exchange. `swap` is for exchanging storage,
not for every assignment that happens to mention a variable named `Temp`.

## Preserve positional tables

Some tables are APIs, not merely collections of independent values. The Coleco BIOS sound table is positional: `play sound 14` means entry 14. Removing entry 11 silently changes what 12 and every later number mean.

When an unused positional entry must disappear logically but later numbers must remain stable, keep a small compatible alias or update every reference and test the result. The same care applies to indexed routine tables, level-reference tables, animation frame order, and any data where source code stores numeric indexes.

## Batch transfers around VDP ownership

Grouping consecutive RAM or VRAM work can save setup and address calculations, but VDP access also depends on screen mode, table addresses, NMI state, and frame timing.

- Use one verified block copy for fixed consecutive data.
- Avoid repeatedly toggling NMI or display state when the compiler already proves the requested state.
- Do not remove apparently redundant `nmi off`, `nmi on`, `display off`, or `screen on` across calls or inline ASM unless state tracking remains valid.
- Perform long VRAM updates with an explicit safe ownership plan.
- Test both NTSC and PAL when work approaches a frame budget.

The transpiler can remove some redundant state commands when control flow and inline ASM are understood. Do not rely on an optimization that has not been proven for the relevant control-flow path.

## Compression is a size and time tradeoff

For a compressed asset, compare:

- compressed payload;
- decompressor code linked on first use;
- total ROM cost;
- decompression cycles and whether they occur during visible gameplay;
- temporary RAM/VRAM workspace;
- visual fidelity for controlled lossy bitmap candidates.

The smallest file is not always the smallest ROM, and the smallest ROM is not always the smoothest game. Amy Studio's picture importer can compare codecs in the browser. Deeper bitmap optimization and whole-catalog audits are CLI tools.

## Optimize hot paths differently from setup

Code that runs once at level load should favor correctness and compactness. Code that runs for every actor every frame may justify tables, byte-sized arithmetic, cheaper indexing, a bulk operation, or a specialized routine.

Use the routine cycle profiler to identify the hot path before rewriting it. Its result is inclusive of nested calls; separate main execution from NMI/IRQ time and compare the total against both NTSC and PAL frame budgets.

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
