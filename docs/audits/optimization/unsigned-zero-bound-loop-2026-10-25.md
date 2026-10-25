# Unsigned zero-bound descending loop audit (2026-10-25)

## Verdict

Amy now omits the initial lower-bound comparison for descending `u8` and `u16` `FOR` loops when
the compiler resolves the inclusive lower bound to zero. An unsigned counter cannot be below zero,
and the existing subtraction at `NEXT` already exits on borrow. Signed counters, dynamic bounds,
and every nonzero lower bound retain the previous comparison path.

Both equivalent source forms are covered:

```amy
for I = 7 downto 0
for I = 7 to 0 step -1
```

This is local range-based instruction selection in the language emitter. It does not add a search
pass or a broad ASM peephole.

## Measured effect

Five Dacman 2 variants contain the relevant construction. Under `Experimental`, the current
descending-loop work saves 60 bytes against the preceding full-audit ROMs. A differential build
with constant-step lowering disabled attributes 12 bytes to that earlier optimization and the
remaining **48 bytes** to removal of the impossible zero-bound checks.

The six comparison sources do not use this construction. Their current Balanced total remains
7,438 bytes in the experimental tree; this rule causes no direct change to those six ROMs.

## Correctness evidence

- `tools/test-for-constant-down-step-codegen.mjs` passes all five profiles.
- Runtime assertions cover literal and named zero bounds, constant and dynamic steps, `u8` and
  `u16` counters, plus signed and nonzero-bound negative controls.
- Numeric comparison matrix: 84 comparisons x 5 profiles pass.
- Numeric comparison self-test: 48 assertions x 5 profiles pass.
- Semantic optimizer equivalence passes all five profiles.
- Full Balanced corpus: 299/299 examples compile; 298 ROMs assemble.
- Full Aggressive audit: 299/299 compile, 297/297 post-optimizer oracles pass, and all three
  GearColeco runtime scenarios pass.

## Rejected shortcut

The external MDL report lists 142 `CP 0` to `OR A` opportunities, but this is not a safe global
rule. Many sites consume Carry, return a compare flag contract, or sit in cycle-sensitive sound
code. Amy already performs this substitution when the immediately consumed flags prove it safe.
The descending-loop change removes a semantically impossible comparison at its source instead.
