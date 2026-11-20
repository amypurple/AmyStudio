# Amy Studio r12.9 handoff for Claude

r12.9 supersedes r12.8. r12.8 could expand an in-range hand-written `jr` while iterative
optimization still used stale forward-label addresses. This changed instruction timing and made
Strata 140 bytes larger than the corrected build.

## Correctness fix

- Iterative optimizer passes never expand `jr` instructions.
- After optimization and final symbol reconstruction, the existing one-way legalizer expands only
  a genuinely out-of-range `jr` to `jp`.
- A regression creates both a near and a far hand-written branch after substantial surrounding code
  movement. The near branch must remain `jr`; the far branch must become `jp` at all five profiles.
- Strata falls from 30,278 bytes with r12.8 to 30,138 bytes, while preserving its nearby manual
  `jr z` instructions.

## Explicit ASM relaxation

- Ordinary `asm {}` remains opaque and timing-preserving by default.
- `asm relax {}` opts into proven direct `jp` to `jr` shortening only.
- `.timed` / `.endtimed` protects a precise region inside a relaxed block.
- `--report-jr-candidates` lists possible savings and whether each candidate was applied or protected.

## Verification

- User ASM opacity, relaxation/reporting, and final JR legalization tests pass.
- The clean `amy-qa quick` gate passes.
- State Update remains 1,138 bytes, about 3,205 measured Z80 cycles, checksum 1478.

