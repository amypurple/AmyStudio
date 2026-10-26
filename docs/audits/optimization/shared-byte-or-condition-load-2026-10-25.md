# Shared byte load across OR equality conditions (2026-10-25)

## Verdict

An OR of two byte equality comparisons with the exact same left operand now loads that operand once
and compares the preserved value in `A` against both compile-time byte constants. The rule is local
to one boolean AST and accepts no calls, writes, aliases across statements, mixed operands or wider
types.

The complementary unsigned-range experiment was correct but removed: Amy Chess's final assembly
already preserves `ScanPiece` across adjacent range comparisons, so the extra emitter rule produced
no ROM change and did not justify its proof surface.

## Measurements

Seven Balanced ROMs shrink and none grow, saving **46 bytes** total:

| Example | Before | After | Saving |
|---|---:|---:|---:|
| Quatro Puzzles | 30,517 | 30,509 | 8 |
| Reversi | 4,780 | 4,772 | 8 |
| Reversi v3 | 7,917 | 7,909 | 8 |
| Reversi v4 | 7,958 | 7,950 | 8 |
| Reversi v5 | 12,473 | 12,465 | 8 |
| 421 | 19,477 | 19,474 | 3 |
| 421 graphics-lossy | 19,475 | 19,472 | 3 |

Amy Chess remains 32,672 bytes. Its repeated production board tests are already specialized or
lower to one scalar load followed by multiple comparisons; loads separated by calls cannot safely
survive in `A`. The six comparison benchmarks are unchanged.

## Correctness evidence

- `tools/test-shared-condition-load-codegen.mjs` verifies first-constant match, second-constant
  match and no-match behavior in all five optimization profiles through GearColeco RAM oracles.
- Full Balanced corpus: 299/299 examples compile and 298 ROMs assemble, with no growth.
- Full Aggressive audit: 299/299 examples compile, 297/297 post-optimizer oracles pass,
  GearColeco runtime checks pass 3/3, and the MDL runtime check passes 1/1.
- The rejected range form was separately executed across all five profiles before removal.

## Boundary

Do not extend this to cross-statement caching. Calls, writes, labels and arbitrary inline assembly
remain barriers. Further boolean reuse should be accepted only when it changes final ROMs and has
an equally narrow control-flow proof.
