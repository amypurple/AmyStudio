# Amy Studio GearColeco WebAssembly core

The clean repository ships the browser-ready JavaScript and WebAssembly core,
but not GearColeco's complete upstream source tree.

To reproduce the core with realistic TMS9918A timing:

1. Place GearColeco 1.7.0 at `studio/vendor/Gearcoleco-main`, or pass its path
   through `-GearRoot`.
2. From the Amy Studio repository root, apply
   `tools/gearcoleco-wasm/gearcoleco-1.7.0-realistic-vdp.patch`.
3. Run `tools/build-gearcoleco-wasm.ps1` with Emscripten 4.0.10.

The patch adds an opt-in single-request TMS9918A VRAM slot model. Compatible
mode remains the default. The model is an interactive detector, not the final
hardware oracle: validate release candidates with the access-trace checker or
openMSX until the instruction-phase calibration matches the 48-case fixture.
