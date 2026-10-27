# Named byte constant comparison code generation

Date: 2026-10-26

## Verdict

Named compile-time byte constants now receive the same specialized comparison lowering as literal
values. Equality and inequality against constants resolving to 0, 1, or 255 use `or a`, `dec a`, or
`inc a` respectively instead of a general `cp` instruction. The change is made in semantic code
generation, not by a broad assembly peephole.

## Evidence

- Dedicated five-profile ROM test: PASS for Off, Safe, Balanced, Aggressive, and Experimental.
- Amy Chess kernel: identical decisions and state in all five profiles.
- Amy Chess Aggressive ROM: 32,645 to 32,607 bytes, saving 38 bytes.
- Amy Chess Aggressive kernel startup and tests: 3,285 to 3,276 frames.
- Full Aggressive corpus: 314/314 compile, 312/312 execution oracles, 3/3 GearColeco runtime tests,
  and the MDL ROM self-test pass.
- Full Aggressive corpus size: 1,990,630 to 1,990,424 bytes, saving 206 bytes with no measured growth.
- Gameplay State Update: 1,138 to 1,134 bytes; six-sample Amy total: 7,377 to 7,373 bytes.

## Scope

Only byte comparisons whose right operand is already proven to be a direct compile-time immediate
are affected. Calls, flags across intervening instructions, control-flow barriers, and dynamic
values retain the existing conservative paths.
