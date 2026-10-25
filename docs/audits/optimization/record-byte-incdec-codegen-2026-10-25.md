# Record byte INC/DEC code generation audit (2026-10-25)

## Verdict

Compound `+= 1` and `-= 1` assignments on byte record fields now calculate the field address once
and immediately emit `INC` or `DEC` on that memory operand. IX aliases use `(IX+d)`, static fields
load their direct address into HL, and dynamic/nested fields compute HL once. No address or value is
kept across Amy statements.

Other constants, runtime right-hand sides, word/fixed fields, calls, and general stores retain their
existing lowering.

## Measured effect

Against the Balanced baseline immediately before this change:

- 14 programs shrink and none grow.
- Aggregate corpus saving: **481 bytes**.
- Quatro Puzzles: -186 bytes.
- Amy Arcade Trio: -96 bytes.
- Three Dacman record variants: -27 bytes each.
- Gameplay State Update benchmark: -14 bytes, from 1,152 to 1,138 bytes.
- Six-sample Balanced total: 7,438 to **7,424 bytes**.

## Correctness evidence

- `tools/test-record-array-field-codegen.mjs` passes all five profiles.
- Runtime coverage includes static, indexed/nested, signed-byte and IX-aliased fields; increment and
  decrement; wraparound; and neighboring-field integrity.
- Record-array runtime self-test passes all 28 assertions.
- Experimental indirect-HL guard, semantic equivalence, and fixed byte-context suites pass.
- Full Balanced corpus: 299/299 examples compile; 298 ROMs assemble.
- Full Aggressive audit: 299/299 compile, 297/297 post-optimizer oracles pass, and all GearColeco
  runtime scenarios pass.

## Rejected broader reuse

A scan found 2,045 nearby repeated `LD HL,symbol` pairs, but 2,039 cross a call, control-flow,
stack, write, label, or HL-clobber barrier; the remaining six are false positives. There is no safe
general cross-statement HL reuse in the current corpus. This optimization is profitable because it
stays inside one compound assignment and removes the duplicate address calculation at its source.
