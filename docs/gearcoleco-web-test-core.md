# GearColeco Web Test Core

Amy Studio's ROM test recorder uses a self-hosted GearColeco WebAssembly core.
It does not use undocumented EmulatorJS runtime objects.

## Toolchain

The reproducible build uses Emscripten 4.0.10. Install that SDK under
`%TEMP%\amy-studio-emsdk` or pass another root:

```powershell
pwsh tools/build-gearcoleco-wasm.ps1 -EmsdkRoot C:\path\to\emsdk
```

Generated files are written to:

```text
studio/vendor/gearcoleco-test-core/
```

## Required properties

- GearColeco debugger enabled.
- `PERFORMANCE` batching disabled so execute breakpoints are checked after
  every Z80 instruction.
- Deterministic save-state header selected so states contain no timestamp.
- Single-threaded WebAssembly.
- BIOS supplied by the user.
- RNG seed applied before initialization and every reset.
- Deterministic builds serialize the complete SN76489 oscillator and stereo
  resampler state; audio after a rewind is sample-identical.

## Controller mask

The browser API follows GearColeco's libretro input order:

| Bit | Input |
| ---: | --- |
| 0-3 | up, down, left, right |
| 4-5 | right fire, left fire |
| 6-17 | keypad 2, 1, `*`, `#`, 3, 4, 5, 6, 7, 8, 0, 9 |
| 18-19 | blue, purple |

## Recorder model

`studio/core/romTestRecorder.js` stores the input used to advance every frame
and a save-state keyframe every 12 frames by default. Seeking restores the
nearest retained keyframe and replays inputs. Its history is bounded; recording
after a seek discards the old future and starts a new branch.

Permanent tests will resolve an Amy checkpoint symbol and occurrence number,
not an absolute frame. Exact first-occurrence execute breakpoints work now.
Continuing through repeated occurrences without missing a same-frame hit is
still pending.

## Controller profiles

The development emulator has a persistent Controller Setup for Port 1 and Port
2. Each visible control can capture a keyboard key, a Gamepad API button, or a
Gamepad API axis. Profiles are saved automatically in browser local storage and
are reused the next time Amy Studio loads.

Supported layouts are the standard ColecoVision controller, Super Action
Controller, Steering Wheel with gas pedal, and Roller Controller. The Roller
Controller occupies both ports: Port 1 carries horizontal movement and Port 2
carries vertical movement, while its two attached standard controllers retain
their normal buttons. Wheel and roller axes are converted to signed per-frame
spinner deltas and are recorded in the deterministic input timeline.

`tools/test-spinner-rom.mjs` compiles the Amy spinner example and proves both
spinner channels in both directions through the complete path: GearColeco input,
Z80 IRQ, Amy `SPINNER_1`/`SPINNER_2` RAM, `spinner(1/2)` expressions, game
coordinates, and final sprite attributes in VRAM.


The selected Player 1/Player 2 field controls only the compact on-screen
controller and which port Controller Setup opens. Physical keyboard and
gamepads drive both configured ports concurrently.
## Verification

```powershell
node tools/check-examples.mjs --assemble --only warrior-dan2-fire-visual-test --rom-dir build/rom-tests
node tools/test-gearcoleco-web-desktop-parity.mjs
node tools/test-gearcoleco-web-rewind.mjs --rom build/rom-tests/warrior-dan2-fire-visual-test.rom
node tools/test-gearcoleco-web-audio.mjs
node tools/test-rom-test-audio-sink.mjs
node tools/test-rom-debugger-model.mjs
node tools/test-rom-test-recorder.mjs
node tools/test-controller-profiles.mjs
node tools/test-spinner-rom.mjs
node tools/test-routine-cycle-profiler.mjs
node tools/test-reversi-routine-profiler.mjs
node tools/test-rom-recorder-breakpoint.mjs
node tools/test-rom-test-case.mjs
node tools/test-rom-test-case-replay.mjs
```

The real-browser smoke page is
`http://localhost:8080/tools/gearcoleco-web-smoke/`.

Verified: debug WASM loading in Node and browser, deterministic runs, desktop
VRAM/VDP parity, exact first checkpoint, byte-identical bounded seek/replay,
sample-identical PCM after save-state restoration, partial-frame breakpoint
accounting, and rebuild-stable symbolic checkpoint resolution.

## Studio UI

Compile a ROM, ensure a ColecoVision BIOS is loaded, then click the toolbar Run
button. The local deterministic core is Amy Studio's primary development
emulator. The previous CDN emulator remains available under:

```text
Main menu > Build > Compatibility Emulator (CDN)
```

The development emulator provides:

- live RGB565 output, selectable scale, and fullscreen;
- 44.1 kHz stereo WebAudio with mute and speed-aware playback;
- arrows, both fire buttons, the complete numeric keypad, on-screen controls, and
  selectable Player 1/Player 2 input;
- play/pause, `-10`, `-1`, `+1`, and `+10` frame navigation;
- `0.25x` through `4x` playback, reset, and bounded rewind;
- CPU program counter with nearest-symbol lookup;
- decoded TMS9918A mode, screen/NMI flags, table addresses, sprite mode, backdrop,
  and raw registers R0-R7;
- addressable RAM and VRAM hex viewers;
- searchable linker symbols and the raw linker memory map; clicking a symbol opens
  CPU memory at that address, while its `BP` action sets an execute breakpoint;
- multiple execute breakpoints entered as a hexadecimal address or symbol; Amy
  `debug breakpoint "name"` markers are armed automatically after compilation;
- source-editor gutter breakpoints stored in project metadata and compiled as
  hidden debug markers without modifying the visible listing;
- conditional source breakpoints over symbols or absolute addresses, with signed
  and unsigned 8/16-bit comparisons, false-condition auto-continue, and source-line reveal;
- Auto, NTSC 60 Hz, and PAL 50 Hz execution. Auto reads the official BIOS
  `AMERICA` byte at offset `$0069` (`$3C` NTSC, `$32` PAL), while the
  explicit choices handle custom or ambiguous BIOS images;
- exact routine profiling from the GearColeco 64-bit master clock: inclusive,
  symbol-range, NMI, IRQ, interrupt-excluded, instruction count, min/max/average,
  top-level measurement count, and percentage of the active 59,736-cycle NTSC or
  71,364-cycle PAL frame budget; profiling uses native
  execute breakpoints, accepts both normal returns and Amy same-stack transfers,
  runs instruction batches inside WASM, and does not alter the ROM;
- symbolic checkpoint selection, `.amy-rom-test.json` export, and fail-closed
  test replay.

Debugger symbol parsing accepts both CLI `00:8000 Label` files and the web
compiler's `Label: equ $8000` format. Clicking a memory-map symbol prepares it
as an execute breakpoint.

Audio never paces emulation, and pending audio is flushed on pause, reset, and
rewind. A test captured at a symbolic checkpoint is rebuild-stable. A test
captured at an arbitrary frame is frame-based because instruction layout or
timing can change after rebuilding.

The bridge exposes PC, SP, single-instruction stepping, and an atomically read
64-bit master-cycle counter. The Cycles tab can arm the next entry into an Amy
sub, linker symbol, or absolute address. It recognizes a call's exact return
from both SP and the return PC, so a temporary `POP` cannot end a sample early.
It also recognizes a same-stack transfer to another `AMY_UPROC_`, which is how
Amy state-machine code such as Reversi enters and leaves CPU turns with `goto`.
GearColeco reports NMI and IRQ dispatch steps explicitly, including the
dispatch cycles. Rewind, reset, replay, and timeline seeking are disabled while
a sample is active; a clock discontinuity rejects the sample instead of being
clamped to zero.

`In-range` timing for Amy subs uses the next `AMY_UPROC_` address as its
boundary. It is an address-range diagnostic, not true exclusive/self time.
