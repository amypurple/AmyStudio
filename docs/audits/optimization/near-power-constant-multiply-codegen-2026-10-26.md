# Near-power constant multiplication code generation (2026-10-26)

## Change

Amy now selects compact, bounded Z80 sequences for three constant-multiplication shapes:

- byte factors one below a power of two use shifts followed by subtraction when that sequence is
  strictly shorter than the binary shift/add chain;
- 16-bit `* 256` uses `ld h,l` / `ld l,0`;
- 16-bit `* 257` preserves `L` and replaces `H` with `H + L`.

All operations retain the existing modulo-8-bit or modulo-16-bit semantics, for both signed and
unsigned integer storage. Dynamic factors and constants without a smaller proven sequence retain
their previous lowering.

## Measured result

- Five-profile ROM and exact-RAM test passes for `u8`, `i8`, `u16`, and `i16`, including factors
  15, 31, 255, 256, and 257.
- Against the previous Aggressive audit, Amy Chess falls from 32,684 to 32,666 occupied bytes and
  Spiders falls from 9,185 to 9,184. Eleven comparable affected ROMs save 19 bytes total; none grows.
- Amy Chess's five-profile nonvisual kernel passes all 69 assertions with identical legal-move,
  FEN, mate-search, node, score, move, and self-play telemetry.
- Full Aggressive audit passes 308/308 builds, 306/306 post-optimizer oracles, 3/3 GearColeco
  runtime checks, and 1/1 MDL runtime check.
- The six comparison ROMs remain 227, 3,214, 604, 939, 1,138, and 1,255 bytes: 7,377 total.

## Verdict

Accepted. This is a deterministic emitter-level strength reduction with bounded applicability,
strictly smaller output, faster execution, exact arithmetic proof, and no corpus growth.
