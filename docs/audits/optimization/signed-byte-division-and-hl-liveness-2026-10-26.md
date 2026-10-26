# Signed byte division and HL liveness audit

Date: 2026-10-26

## Verdict

Amy's documented signed-integer division contract is truncation toward zero. Scalar and expression
`i8` division had instead reused the unsigned byte divider, so negative dynamic operands produced
incorrect results. Dynamic signed byte division now sign-extends both operands and calls the proven
`AMY_I16_DIV` helper. Constant `/2`, `/4`, and `/8` use a smaller exact sequence: add `divisor - 1`
only for a negative dividend, then arithmetic-shift. Larger powers retain the signed helper.

The runtime fixture covers positive and negative operands, `-128 / 4`, `-3 / 4`, negative divisors,
expression division, and the helper fallback under Off, Safe, Balanced, Aggressive, and Experimental.
All five real ROMs produce the expected signed bytes.

## Optimizer defect found

Experimental's direct-memory self-update rules could introduce `HL` while the prior `HL` value was
still an argument to the following call. In `AMY_I16_DIV`, optimizing the sign toggle replaced the
live dividend with the address of the sign byte. Generic register-death analysis now treats calls,
returns, jumps, loop branches, and halts as barriers without an explicit liveness proof. The XOR
self-toggle rule also requires `HL` to be dead. Focused tests retain the compact rewrite when a real
overwrite proves death and reject it when a following call consumes `HL`.

## Evidence

- `tools/test-signed-byte-division-codegen.mjs`: five-profile GearColeco runtime PASS.
- `tools/test-optimizer-experimental-hl-self-load.mjs`: indirect, symbolic, call-liveness, XOR,
  overwrite-proof, and defensive cases PASS.
- Compound division, wide binary expression, numeric comparison, optimizer, and user-routine ABI
  focused suites PASS.
- Full Aggressive audit: 304/304 compiled examples, 302/302 post-optimizer oracles, 3/3 GearColeco
  runtime checks, and 1/1 MDL runtime check PASS.

## Comparison note

A fresh Experimental build totals 7,424 bytes for the six benchmark sources. Five values match the
published CSV; Sprite Metasprite builds as 986 bytes rather than the recorded 939. Controlled builds
with the old register-death behavior also produce 986 bytes, so this pre-existing 47-byte discrepancy
is not caused by the signed-division or liveness fixes. Do not update the published comparison until
that baseline divergence is independently resolved.
