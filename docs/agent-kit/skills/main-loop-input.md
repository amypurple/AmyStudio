# Main Loop, NMI, and Controller Input

Use this skill for frame loops, joystick input, pauses, and NMI-sensitive work.

## Canonical progression

1. `studio/examples-src/input-loop-minimal.alexis`: smallest readable movement loop.
2. `studio/examples-src/pause-until-press-demo.alexis`: debounced action and CRT sleep.
3. `docs/nmi-runtime-contract-2026-06-22.md`: interrupt and VDP invariants.

## Recipe

- Draw static screen state before enabling the display.
- Use `wait` or `wait N frames` to pace visible updates.
- Read both controllers with expressions when either player may act, for example
  `Pressed = joypad(1).fire | joypad(2).fire`.
- Prefer `elseif` for mutually exclusive directions and edge/latch state when one
  physical press must produce one move.
- Use `pause until press and release` for confirmation; add `sleep after N seconds`
  when a held screen needs CRT protection.
- NMI-off work must be bounded. Re-enable NMI before commands whose OS7 backend
  expects controller, sound, or frame service unless that command documents a
  cooperative NMI-off path.

## Proof

Run `tools/test-combined-joypad-boolean-codegen.mjs` and
`tools/test-nmi-vdp-guard-runtime.mjs`. For a game, record loop passes per video
frame on the busiest screen; compilation alone cannot prove frame pacing.

## Human hold and release contract

Never require a player to release a direction within one video frame. A physical
joystick press normally lasts several frames, and a lane selector that increments
every frame will skip its middle position.

- Discrete lanes, grid cells, menu entries, and puzzle cursors use edge-triggered
  input: move once when the direction changes from released to pressed, then latch
  until release.
- Text editors and deliberately repeating cursors may repeat only after a 12-18
  frame initial delay, then every 5-9 frames. Document the chosen timing.
- Continuous actors may respond every frame, but acceleration and collision must
  leave at least 12 frames for an ordinary player to perceive and correct danger.
- Never tune controls with one-frame emulator taps. Test holds lasting 2, 6, 14,
  and 30 frames. An edge-triggered action must advance exactly once at every length.
- Test left-to-center, center-to-right, rapid reversal, held direction across a
  spawn/scene boundary, and both controllers when both are supported.
- A human-paced bot must use the same press/release durations. Delayed perfect taps
  are still superhuman when the game requires frame-exact release.
