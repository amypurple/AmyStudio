# BCD Scores, High Scores, and Initials

Use packed BCD for non-negative decimal scores and counters whose displayed width
is known. Use signed integers when negative values are meaningful.

## Canonical references

- `studio/examples-src/amy-bcd-selftest.alexis`: scalar and local arithmetic.
- `docs/amy-language.md`: canonical BCD declarations, printing, arrays, and limits.
- `docs/porting-8bit-basic-to-amy.md`: practical score conversion guidance.

## Recipe

- Declare enough digits for the true maximum: `bcd digits 8 Score = 0`.
- `Score += 100`, `Score -= 5`, `inc Score`, and `dec Score` preserve packed decimal.
- Subtraction saturates at zero; addition wraps/truncates at the declared packed
  width, so undersized declarations are a game bug.
- Print a BCD directly when its declared digit width is desired. Use `digits$` for
  zero-padded binary values and `width$` for right-aligned binary values.
- Keep initials and score as separate fields. Define tie policy and when a pending
  score becomes persistent before writing ADAM media.

## Proof

Run `tools/test-bcd-boundaries-rom.mjs` and
`tools/test-bcd-print-digits-rom.mjs`. Exercise zero, carry, maximum score,
overflow policy, underflow, tie handling, and initials entry in the emulator.
