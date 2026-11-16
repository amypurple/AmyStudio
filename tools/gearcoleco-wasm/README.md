# Amy Studio GearColeco WebAssembly core

The clean repository ships the browser-ready JavaScript and WebAssembly core,
but not GearColeco's complete upstream source tree.

To reproduce the core with realistic TMS9918A timing:

1. Place GearColeco 1.7.0 at `studio/vendor/Gearcoleco-main`, or pass its path
   through `-GearRoot`.
2. From the Amy Studio repository root, apply
   `tools/gearcoleco-wasm/gearcoleco-1.7.0-realistic-vdp.patch`.
3. Run `tools/build-gearcoleco-wasm.ps1` with Emscripten 4.0.10.

The patch adds an opt-in single-request TMS9918A VRAM slot model and raises the
Blip_Buffer resampling ratio from 16 to 20 fractional bits. The latter reduces
the effective 44.1 kHz error from 22.05 to 1.56 samples per second without
changing the ColecoVision master clock or PSG divider.

Compatible VDP mode remains the default. The realistic model is an interactive
detector, not the final hardware oracle: validate release candidates with the
access-trace checker or openMSX until the instruction-phase calibration matches
the 48-case fixture. Run `node tools/test-gearcoleco-audio-clock.mjs` to verify
held-tone pitch, master cycles and audio duration against the rebuilt core.

