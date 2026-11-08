# Minefield

ColecoVision adaptation of **Minefield** by Sean Igo, published in
*COMPUTE!* Issue 37, June 1983, pages 260–269. The preserved C64 type-in
and magazine scans are the behavioral reference.

## Fidelity

The port retains the original rules:

- the truck moves continuously after the first direction and wraps on all edges;
- every field has 25 mines;
- bomb counts follow the listing's `NB += 1.5`: 5, 7, 8, 10, 11, 13, 14,
  16, 17, 19, 20, then 20;
- danger 0 retains the original wave timer bases of 1680, 1500, 1320, 1140,
  then 960 frames;
- each bomb receives 40–100% of that base, warns at 1x, flashes at 1.5x,
  and explodes at 1.75x;
- bombs score 10/20/30 by phase;
- the completed-field penalty is 10 points for every exploded bomb;
- explosions clear the original seven-row 3/5/7/7/7/5/3 shape, destroy the
  truck, mines, and other bombs, and leave a crater;
- skill 0–3 supplies four through one trucks.

The original C64 sound routine uses the same approximately 546 Hz SID
oscillator setting for a sawtooth pickup effect and noise explosion/death
effect. The SN76489 equivalents preserve that distinction. The two-channel
title tune **Bomb Squad March** and the field-clear fanfare are identified
ColecoVision additions.

The smaller 26x17 playfield, joystick menus, illustrated help, title menu,
credits, colored tiles, directional truck sprite, and animated blast are
console adaptations. Either controller steers during play. Because the compact
field makes routes much shorter than on the C64, danger 1–3 use 75%, 60%, and
50% of the original deadlines respectively. Danger 0 remains the unscaled
reference mode. Every setting preserves the complete 1x warning, 1.5x flashing,
and 1.75x explosion progression.

## Evidence and tests

- `tools/minefield-model.mjs` is an independent transcription of the listing's
  bomb counts, timer thresholds, phases, blast geometry, and penalty.
- `tools/test-minefield-rom.mjs` compiles all five optimizer profiles and
  verifies visibility, pickup scoring, chain reactions, penalties, wrapping,
  safe text width, and the model's known values.
- `tools/test-minefield-playthrough.mjs` is a screen/RAM-driven autonomous
  player. It clears three complete fields and reaches wave four while retaining
  trucks.
- `tools/test-minefield-audio.mjs` captures real emulator PCM for the title,
  pickup, and explosion; it checks audible output and distinct effects.
- `tools/capture-minefield.mjs` captures title, both help pages, credits,
  gameplay, and the live explosion for visual review.

The preserved D64 can be catalogued and detokenized without proprietary C64
ROMs. Exact original-machine frame traces remain optional follow-up evidence;
the formulas above come directly from the published and preserved listing.

## Build

```powershell
node tools/amyc.mjs examples/ports/compute/minefield.alexis --output build/minefield.rom --asm build/minefield.asm --opt balanced
node tools/test-minefield-rom.mjs
node tools/test-minefield-playthrough.mjs
node tools/test-minefield-audio.mjs
node tools/capture-minefield.mjs
```
