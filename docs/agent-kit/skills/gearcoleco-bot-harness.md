# GearColeco Bot Harness

Use this skill for runtime proof with the bundled GearColeco test core and the real
OS7 BIOS. Keep game rules and human decisions outside the emulator adapter.

## Startup and navigation

- OS7 may retain its logo for roughly 785 NTSC frames. Detect the complete title or
  menu signature instead of assuming an early fixed frame is the game.
- Pulse controller inputs long enough for a human-facing menu to observe them; the
  standard authoring guidance uses 14 frames followed by release.
- Navigate title, every HOW TO page, credits, gameplay, victory, and failure through
  controller input. A fixed-frame visual probe cannot replace navigated evidence.
- After detecting a VRAM ending signature, wait one additional VBlank before taking
  the framebuffer screenshot.

## Visible observation boundary

The emulator adapter may read the framebuffer, NAME table, sprite attribute table,
and controller-visible state. Convert those into a small observation object. The
pure human policy must not read user RAM, compiler symbols, hidden object state, or
future events. RAM reads are allowed only for explicit ABI and sound-area proofs.

## Framebuffer conversion

`getFramebuffer()` returns RGB565 image data, not RGBA bytes. Convert each 16-bit
pixel before writing PNG evidence:

```js
const r = ((pixel >> 11) & 31) * 255 / 31;
const g = ((pixel >> 5) & 63) * 255 / 63;
const b = (pixel & 31) * 255 / 31;
```

Black PNGs produced by treating RGB565 as RGBA are invalid evidence even if the bot
otherwise passes.

## Runtime variation proof

Run the compiled ROM separately at least three times with distinct legitimate seed
conditions. Record the visible event sequence from each execution as
`runtimeVariantSequences` and set `runtimeGameplayVariantsObserved` to the number of
unique sequences. Do not substitute sequences generated only by `rules-model.mjs`.
The model proves rules; the ROM runs prove implementation and variation.

## Timing and audio

- Count no more than one intended game-logic pass per video frame unless the design
  documents a scheduler.
- Exercise direction holds of 2, 6, 14, and 30 frames.
- For OS7 audio, inspect only the assigned ten-byte areas in RAM. Prove activation,
  bounded progress, `$FF` release, and no adjacent-area corruption.
