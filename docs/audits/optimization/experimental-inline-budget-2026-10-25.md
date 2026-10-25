# Experimental inline budget audit (2026-10-25)

## Change

The guarded single-call routine inliner now accepts a configurable encoded-body budget. The default
remains 8 bytes; only the Experimental profile raises it to 16 bytes. Existing exclusions for calls,
branches, labels, stack operations, I/O, external symbol references, and unsafe instructions remain
unchanged.

## Differential result

Two otherwise identical 299-example Experimental corpus builds were compared at budgets 8 and 16.
The 16-byte budget saved 332 occupied bytes across 36 ROMs: 83 newly eligible routines, each saving
the exact four bytes contributed by one `CALL` and the removed `RET`. No ROM grew. The six published
toolchain comparison samples were unchanged.

## Verification

- Encoded-size fixtures cover 8-, 16-, and 17-byte bodies plus state/flag equivalence.
- Negative fixtures preserve routines containing stack, branch, label, data-reference, and I/O
  barriers.
- All optimizer regression tests and the source-debug-map test pass.
- Experimental corpus: 299/299 examples compile; 298 ROMs assemble.
- Post-optimizer oracle audit: 297/297 pass; MDL residual is 1,239 bytes.
- GearColeco runtime tests: 3/3 pass.
- MDL ROM runtime self-test: 1/1 passes.

## Verdict

Accepted for Experimental only. The measured saving does not justify changing the contracts of Safe,
Balanced, or Aggressive, and timing-sensitive code remains excluded by the existing instruction and
control-flow barriers.

## Clean-repository promotion

The clean corpus compiles 146/146 examples and assembles 145 ROMs. Its original promotion run passed
143/143 exportable post-optimizer oracles, all three GearColeco runtime checks, and the MDL ROM
self-test. The audit exporter was then synchronized with the normal compiler's ADAM statement and
build-context wiring; a complete follow-up export passes 146/146 examples, including both EOS
`create ... status ...` cases.
