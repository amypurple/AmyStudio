# Bounded dynamic 16-bit multiplication

Date: 2026-10-27

## Defect

Dynamic `u16` and `i16` multiplication used repeated addition with the right operand as a
16-bit countdown. A negative multiplier such as `-3` therefore executed 65,533 additions.
The modulo-16-bit result was correct, but execution time was data-dependent and could appear
to hang. The same loop existed in direct expressions and compound `*=` assignments.

Compile-time constant multiplication was already separate. In particular, `Value * 2048`
uses eleven fixed shifts and did not use the dynamic countdown loop.

## Correction

Both dynamic paths now use a fixed 16-iteration shift/add multiplication. Signed and unsigned
operands share the routine because the low 16 bits of a two's-complement product are identical;
only the discarded upper half differs. Dynamic signed `i16 *= i16` is also accepted instead of
being rejected by the old unsigned-only operand loader.

The related ROM word-table investigation found that the previous 128-entry restriction was
avoidable. Tables with 129 through 256 entries now retain the carry produced while doubling the
byte index. Tables through 128 entries keep their former minimal code, and 257 entries are rejected
because the runtime selector is one byte.

## Evidence

- `tools/test-mul-div-assign-codegen.mjs` proves the bounded sequence in global, local, and
  `call asm` expression paths.
- `tools/test-compound-constant-multiply-codegen.mjs` runs all five optimization profiles in
  GearColeco and checks negative operands, two negatives, zero, maximum unsigned values,
  `-32768 * -1`, compound multiplication and constant factor 2048.
- `tools/test-word-table-codegen.mjs` proves the 129-entry carry path, the 256-entry ceiling,
  existing compact dereferences, assembly, and Balanced optimization.
- `tools/test-integer-muldiv-matrix.mjs` generates ROM-sized batches from one manifest and executes
  3,192 assertions over 798 operand pairs. It covers `i8`, `u8`, `i16`, `u16`, `i32`, and `u32`;
  the signed edge values minimum, `-3`, `-2`, `-1`, `0`, `1`, `2`, `3`, and maximum; unsigned
  zero through three plus maximum; every `*`, `*=`, `/`, and `/=` form; runtime zero divisors;
  and all mixed-type pairs after explicit promotion to a safe result width. All 115 generated ROMs
  pass under Off, Safe, Balanced, Aggressive, and Experimental.
- The full Balanced catalog passes 326/326 examples, with 325 assembled ROMs and one delegated
  target-specific project.
- The full Aggressive audit passes 326/326 compilations, 324/324 post-optimizer execution oracles,
  3/3 GearColeco runtime checks and the MDL runtime self-test.
- The six published comparison ROMs remain 227, 3,214, 604, 939, 1,134 and 1,255 bytes: 7,373
  bytes total.
