# General constant multiply chains (2026-10-25)

## Verdict

The proven compound-multiply rule now covers any scalar integer constant whose deterministic
binary shift/add chain is strictly smaller than the counted-addition fallback. The same Horner
chain replaces the older low-bit-first implementation for 16-bit constant multiplication inside
ordinary expressions. Powers of two and the previously tuned short chains retain their cheaper
paths; fixed-point, arrays, records, runtime factors and equal-or-larger chains retain the existing
fallbacks.

The transformation is bounded and constant-time in the compiler: it scans at most 8 or 16 bits.
Arithmetic remains modulo 8 or 16 bits, so signed and unsigned overflow behavior is unchanged.

## Measurements

The 17-example compound-assignment corpus falls from 183,031 to 182,882 Balanced bytes. Fifteen
ROMs shrink, none grow, for a **149-byte** saving. This covers factors seen in real sources such as
16, 18, 20, 21, 24, 25, 26, 30, 50, 60, 100, 192, 304, 500 and 560.

On the seven-example ordinary-expression corpus, Amy Chess falls from 32,798 to 32,672 bytes
(-126) and Bunny Hop from 7,491 to 7,479 (-12); the other five ROMs are unchanged. Amy Chess also
executes fewer instructions for its repeated hash and evaluation multiplications. For example,
the new 16-bit chains remove the repeated `EX DE,HL` triplets formerly emitted while constructing
constants such as 33 and 257.

The six comparison benchmarks retain their established results after final assembly optimization,
so no comparison artifact changes are required for this rule.

## Correctness evidence

- `tools/test-compound-constant-multiply-codegen.mjs` validates compound and expression factors,
  signed/unsigned overflow, named constants and the equal-size fallback across all five profiles
  with GearColeco RAM oracles.
- `tools/test-mul-div-assign-codegen.mjs` preserves dynamic multiplication and division paths.
- `tools/test-state-update-benchmark.mjs` retains checksum 1478 and identical Balanced size/cycles.
- Full Balanced corpus: 299/299 examples compile and 298 ROMs assemble.
- Full Aggressive audit: 299/299 compile, 297/297 post-optimizer oracles pass, 3/3 GearColeco
  runtime scenarios pass, and the MDL ROM self-test passes.

## Design boundary

Do not replace this bounded emitter choice with an unbounded addition-chain search. More elaborate
chains may save an occasional instruction, but would add compile-time variability and a much larger
proof surface. Revisit only with corpus-wide evidence that a deterministic small catalog pays for
itself.
