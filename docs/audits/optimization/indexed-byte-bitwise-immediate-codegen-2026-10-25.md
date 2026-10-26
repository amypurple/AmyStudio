# Indexed byte bitwise immediate code generation (2026-10-25)

## Verdict

Amy now lowers `u8` and `i8` primitive-array updates with an immediate mask through one address
calculation:

```amy
Values[Index] |= 64
Values[Index] &= 253
Values[Index] ^= 1
```

The emitter calculates `&Values[Index]` once in `HL`, reads `(HL)`, applies the immediate Z80
operation, and writes `(HL)`. The previous generic path calculated the indexed address once for the
load and again for the store while preserving the value on the stack.

The specialization is deliberately narrow. It requires a primitive byte array and a resolved
constant from 0 through 255. Dynamic operands, record fields, wider elements, packed booleans and
other targets retain their existing paths. Flags do not escape the Amy assignment boundary.

## Measurements

Balanced builds save 41 occupied bytes across the currently affected examples:

| Example | Before | After | Saving |
|---|---:|---:|---:|
| Bunny Hop | 7,512 | 7,491 | 21 |
| Laser Strike | 28,463 | 28,443 | 20 |

No affected program grows. The six comparison sources contain no indexed immediate bitwise
assignment, so this rule leaves all six unchanged. A fresh build of the current compiler reports
7,377 occupied bytes across those six sources; that total includes other already-landed compiler
changes and is not a saving from this rule.

## Correctness evidence

- `tools/test-byte-compound-bitwise-codegen.mjs` passes all five optimization profiles and checks
  both emitted shape and GearColeco RAM results.
- `tools/test-compound-array-arithmetic-runtime.mjs` passes all five profiles.
- `tools/test-semantic-optimization-equivalence.mjs` passes all five profiles.
- Full Balanced corpus: 299/299 examples compile and 298 ROMs assemble.
- Full Aggressive audit: 299/299 compile, 297/297 post-optimizer ROM oracles pass, 3/3 GearColeco
  runtime scenarios pass, and the MDL ROM self-test passes.

## SDCC lesson

This is the useful part of SDCC-style optimization for Amy: select a cheaper, semantically exact
instruction sequence while type and addressing information are still available. It adds no global
allocation search and therefore has negligible compiler-time cost. A text peephole applied after
assembly generation could not safely recover the same proof.
