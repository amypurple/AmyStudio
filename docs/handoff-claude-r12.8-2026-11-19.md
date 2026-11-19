# Amy Studio r12.8 handoff for Claude

This build promotes the verified corrections from `AMY-STUDIO-IMPROVEMENT-GUIDE.md` without
including the guide's speculative peephole optimizations.

## Correctness changes

- All inline ASM, including detached data/routine blocks, is marked as user ASM.
- The optimizer preserves the programmer's instructions, flags, and selected `jp` timing inside
  user ASM. It may only expand an out-of-range `jr` to `jp` so final assembly remains valid.
- Semicolon comments inside ASM no longer trigger Amy capabilities such as the frame counter.
- Bare assembler `ifdef` / `else` / `endif` works inside `asm {}` without consuming Amy-language
  conditionals outside the block.
- Name-first macro syntax such as `WAITB macro count` is rejected with a diagnostic recommending
  `macro WAITB count`.
- Assembler failures map back to the relevant `.alexis` line more reliably. The `amy(Name)` hint
  is shown only for unknown or invalid symbols, not unrelated assembler errors.

## Verification

- `node tools/amy-qa.mjs quick`: PASS.
- Representative corpus: 35/35 compile and assemble.
- New ASM opacity, comment capability, and CLI diagnostic regressions: PASS.
- State Update benchmark remains 1,138 bytes at balanced/aggressive/experimental, average 3,205
  measured Z80 cycles, checksum 1478.

The optimization suggestions O1-O10 from Claude's guide remain proposals. They were deliberately
not promoted without individual flag, clobber, control-flow, timing, size, and runtime evidence.
