# Compound constant multiply chains (2026-10-25)

## Verdict

Integer `*= constant` no longer uses a counted addition loop for the common factors 3, 5, 6, 10,
12 and 14. The emitter selects bounded Z80 shift/add/subtract chains while type and constant
information are available. Existing special cases for 0, 1, 2, 4 and 8 remain unchanged.

The rule applies to scalar `u8`, `i8`, `u16` and `i16` values. Fixed-point, 32-bit, arrays, records,
runtime factors and unsupported constants retain their established paths. Signed and unsigned
results are identical modulo 8 or 16 bits, including overflow; flags do not escape the Amy
assignment boundary.

## Measurements

Across the 27 examples containing one of the candidate constants, 25 Balanced ROMs shrink and none
grow. Their combined occupied size falls from 336,585 to 336,300 bytes, saving **285 bytes**.

| Example | Before | After | Saving |
|---|---:|---:|---:|
| Timelost Rockfall | 10,294 | 10,254 | 40 |
| Caverns | 14,548 | 14,519 | 29 |
| Peril of the Pitdemons | 15,527 | 15,507 | 20 |
| Fixed/unsigned playground | 1,440 | 1,421 | 19 |
| Santa's Sleigh Run | 9,434 | 9,418 | 16 |

The six comparison sources contain none of these compound constant multiplications, so their
published sizes are unchanged. Runtime work also falls substantially: multiplication by 10 or 14
is now a short straight-line sequence rather than ten or fourteen loop iterations and branches.

## Correctness evidence

- `tools/test-compound-constant-multiply-codegen.mjs` checks all six factors, both widths, signed
  behavior, overflow and named constants through five real ROM builds and GearColeco RAM oracles.
- `tools/test-mul-div-assign-codegen.mjs` preserves dynamic multiply/divide behavior.
- `tools/test-semantic-optimization-equivalence.mjs` passes all five profiles.
- Full Balanced corpus: 299/299 examples compile and 298 ROMs assemble.
- Full Aggressive audit: 299/299 compile, 297/297 post-optimizer ROM oracles pass, 3/3 GearColeco
  runtime scenarios pass, and the MDL ROM self-test passes.

## SDCC lesson

The profitable lesson is deterministic instruction selection, not SDCC's expensive allocation
search. A small catalog of proven chains gives predictable compile time and remains visible to the
existing ASM optimizer without asking it to reconstruct source types or arithmetic intent.
