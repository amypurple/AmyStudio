# Amy Studio r12.10 handoff for Claude

r12.10 is the clean r12.9 compiler plus the suffix-H assembler ambiguity fix from clean-repository
commit `974c48c86`.

## Fixed

- A declared label, constant, or variable named like `CaH` now takes precedence over the
  Intel-style hexadecimal interpretation `$CA`.
- Direct operands, forward references, mixed letter casing, and expressions such as `CaH+1`
  resolve the declared symbol.
- Backward compatibility is preserved: when no matching symbol exists, `CAH` remains `$CA`.
  `0CAH` is the recommended unambiguous suffix-H hexadecimal spelling.

## Verification

```text
node tools/test-assembler-suffix-h-symbols.mjs
node tools/test-assembler-byte-immediate-range.mjs
```

Both packaged tests pass. In the clean repository, `test-inline-asm-symbols.mjs` and the focused
feature-matrix entry also pass, and the representative QA build compiled 35/35 selected projects.

The new regression is registered in `amy-qa quick` and the feature matrix.
