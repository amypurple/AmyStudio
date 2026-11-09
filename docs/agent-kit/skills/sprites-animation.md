# Sprites, Metasprites, Animation, and Flicker

Use this skill for TMS9918 sprite setup, layered actors, animation, or overload.

## Canonical progression

1. `studio/examples-src/sprite-minimal.alexis`: one explicit sprite.
2. `studio/examples-src/toolchain-benchmark-sprite-metasprite.alexis`: layered actor.
3. `studio/examples-src/amy-sprite-flicker-selftest.alexis`: protected stable range.

## Contracts

- `set sprite` edits shadow state; `update sprites` uploads it.
- `clear sprites` also resets the active count. Follow it with
  `set sprite count N` before expecting sprites to appear.
- Y=`208` terminates the hardware list. Hide inactive entries at `192..207`; never
  place an active entry after an accidental terminator.
- Only four sprites are visible on a scanline. Keep layered player sprites in a
  `sprites stable First to Last` range before enabling `sprites flicker on`.
- A 16x16 sprite pattern uses TMS9918 quadrant ordering. Prefer metasprite data and
  the graphics editor over hand-maintained offsets.
- Update animation once per intended logic/frame step, normally after `wait`.

## Proof

Run `tools/test-sprite-count-init-runtime.mjs` and
`tools/test-sprite-flicker-codegen.mjs`. Runtime visual proof must inspect the SAT,
four-per-line pressure, Y=208 termination, and one-frame disappearance.
