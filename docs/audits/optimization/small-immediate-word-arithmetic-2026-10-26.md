# Small immediate word arithmetic (2026-10-26)

## Verdict

Amy now lowers non-fixed 16-bit addition and subtraction by small compile-time constants directly
to bounded `INC HL` / `DEC HL` sequences when those sequences are smaller than the generic
register-pair operation. Named Amy constants are resolved through the existing recursive
compile-time evaluator. Fixed-point expressions remain on their scaled arithmetic path.

The change is an emitter decision rather than an ASM text peephole. It therefore has the operand
types and expression boundary needed to prove that intermediate flags are not observable.

## Bounds

- Addition: absolute delta through 3.
- Subtraction: absolute delta through 5.
- Zero and larger deltas retain the existing generic lowering.
- Fixed, ufixed, fixed32 and floating-point expressions are excluded.

## Measured result

- Amy Chess Aggressive ROM: 32,666 to 32,645 bytes, saving 21 bytes.
- Six published comparison samples: unchanged at 227, 3,214, 604, 939, 1,138 and 1,255 bytes.
- Six-sample total: unchanged at 7,377 bytes.

## Evidence

- `tools/test-small-immediate-word-arithmetic-codegen.mjs`: all five profiles pass real ROM
  execution, including unsigned and signed wrapping, named constants, constant-left addition,
  subtraction of a negative constant and a fixed-point exclusion.
- `tools/test-chess-kernel-runtime.mjs`: all five profiles preserve the complete nonvisual chess
  kernel assertions, selected moves and 71-ply self-play result.
- Full Aggressive audit: 314/314 examples compile, 312/312 post-optimizer execution oracles pass,
  3/3 GearColeco runtime checks pass and the MDL ROM self-test passes.
- The refreshed external audit reports no normalized executable changes from the selected SDCC or
  z88dk copt rule sets. Further SDCC-inspired work should continue as typed emitter improvements or
  locally proven liveness transformations, not imported text substitutions.
