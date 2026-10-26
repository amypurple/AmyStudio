# Indexed byte dynamic compound code generation (2026-10-26)

## Verdict

Amy now calculates an indexed byte destination once for dynamic `+=` and `-=` assignments:

```amy
Actors[ActorIndex].X += Delta
State.EnemyX[Index] -= Delta
Values[Index] += Delta
```

The right-hand byte is evaluated first and preserved in `B`. The emitter then calculates the
record-field or primitive-array address once in `HL`, reads `(HL)`, performs the byte operation,
and writes the result back through the same address. The previous generic path calculated the
indexed address once for the load and again for the store.

The specialization requires an `u8`/`i8` target and an `u8`/`i8` runtime operand. Wider values,
non-array scalar targets, unsupported expressions, calls, and other compound operators retain the
existing conservative paths. No address or value is cached across Amy statements.

## Measurements

The Balanced corpus falls from 1,762,788 to 1,762,456 occupied bytes: 332 bytes saved across 14
ROMs, with no growth. The affected programs are Quatro Puzzles, the overlay self-test, Amy Arcade
Trio, 421 and its lossy variant, six Dacman variants, Fly Swatter Timer Quest, and Treasure Diver
Ocean Expedition.

Amy Chess and all six toolchain comparison ROMs are byte-size unchanged because their active paths
do not contain this assignment shape. The comparison publication CSV is independently incomplete
at this checkout state, so it was not regenerated as part of this compiler change.

## Correctness evidence

- `tools/test-record-array-field-codegen.mjs` checks the one-address assembly shape and exact RAM
  results under Off, Safe, Balanced, Aggressive, and Experimental profiles.
- Full Aggressive corpus: 299/299 examples compile and 298 ROMs assemble.
- Post-optimizer execution oracles: 297/297 pass, including every affected program and Amy Chess.
- GearColeco runtime checks pass after rerunning outside the restricted process sandbox.
- The MDL ROM runtime self-test passes 1/1.

## Design lesson

This is another profitable emitter-level optimization: Amy still knows the target type, addressing
form, and expression boundary, so it can select a smaller exact sequence without global search.
The proof does not justify cross-statement address reuse or a broad assembly peephole.
