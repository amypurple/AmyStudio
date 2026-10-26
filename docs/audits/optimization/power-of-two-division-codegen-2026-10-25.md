# Power-of-two integer division code generation (2026-10-25)

## Verdict

Unsigned 8-bit compound and expression division by a constant power of two now uses logical shifts.
Unsigned 16-bit division uses the same lowering only for division by two, where the four encoded
shift bytes are strictly smaller than the eight bytes surrounding the existing runtime call.

Signed 8-bit division remains unchanged pending a separate semantic audit. Signed 16-bit shift and
bias sequences were implemented and verified for truncation toward zero, but rejected from the
size profile: repeated `/= 256` sites made Time Warp 104 bytes larger while its non-power division
still required `AMY_I16_DIV`. Equal-size or larger 16-bit sequences retain the exact runtime helper.

## Measurements

Across the full Balanced corpus, eight ROMs shrink and none grow, saving **162 bytes**:

| Example | Before | After | Saving |
|---|---:|---:|---:|
| Paratrooper | 5,996 | 5,934 | 62 |
| Language Barrier | 9,271 | 9,254 | 17 |
| Quatro Puzzles | 30,533 | 30,517 | 16 |
| Amy Arcade Trio | 15,754 | 15,738 | 16 |
| Explosion | 4,049 | 4,033 | 16 |
| Fixed/unsigned playground | 1,421 | 1,408 | 13 |
| Demons of Osiris | 6,856 | 6,843 | 13 |
| Amy surface coverage | 2,759 | 2,750 | 9 |

The six comparison benchmarks are unchanged, so publication artifacts require no update.

## Correctness evidence

- `tools/test-compound-power-division-codegen.mjs` executes compound and expression cases through
  all five optimization profiles, including boundary values and retained signed fallbacks.
- Dynamic multiply/divide regression tests pass.
- State Update retains checksum 1478, size 1,138 and 3,146 average Balanced cycles.
- Paratrooper completes its GearColeco editorial/menu/gameplay path and displays the parachutist.
- Full Balanced corpus: 299/299 examples compile and 298 ROMs assemble.
- Full Aggressive audit: 299/299 compile, 297/297 post-optimizer oracles, 3/3 GearColeco runtime
  scenarios and the MDL ROM self-test pass.

## Boundary

Do not equate division by a signed power of two with an arithmetic shift: arithmetic shifts round
negative values downward, while Amy integer division truncates toward zero. Any future signed
specialization must include the bias correction and still beat the runtime-call encoding.
