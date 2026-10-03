# Automated ColecoVision ROM testing

Amy Studio has two related but distinct runtime surfaces:

- **Open ROM / Debugger in the browser** is the interactive programmer workspace for compiled or external ROMs. It provides rewind, frame and instruction stepping, source breakpoints, conditional watches, CPU/VDP state, RAM/VRAM, symbols, controller setup, recorded tests, and routine cycle profiles.
- **GearColeco automation from the CLI** is the repository regression runner for repeatable checkpoints, expected symbols/bytes, screenshots, VRAM/VDP baselines, and optimizer audits.

The browser debugger does not expose every repository-maintainer command, and the CLI runner is not an Amy Studio button. Compilation and emulator execution remain separate gates:

1. `node tools/check-examples.mjs --assemble` transpiles and assembles every example.
2. `node tools/run-rom-tests.mjs` builds selected self-tests, executes them in GearColeco, and checks named RAM symbols.

## Interactive browser debugger

Compile a project, then choose **Open ROM / Debugger** or the run control. The
debugger can also load an external `.rom`, `.col`, `.dsk`, or `.ddp` without
compiling an Amy project first. Drop the file anywhere on the debugger or use
its upload button. DSK selects ADAM disk drive 1; DDP selects data-pack drive 1,
and the machine changes to ADAM automatically. Standard 160 KiB DSK and 256 KiB
DDP images are also recognized by geometry when their extension is absent or
incorrect. Because a 256 KiB MegaCart has the same size as a DDP, a Coleco
`AA 55` or `55 AA` header takes precedence and loads it as a cartridge. ZIP
(`PK`) and GZip signatures are rejected even when the extension is misleading.

The user must provide an 8192-byte ColecoVision BIOS for cartridges. ADAM media
requires OS7.ROM, EOS.ROM, and WP.ROM. Amy Studio stores firmware locally in
browser storage and does not download or distribute it.

For ADAM communication software, the debugger can emulate AdamLink,
Eve/Orphanware, or MicroInnovations serial hardware in deterministic offline or
loopback mode. The selected profile owns its documented I/O ports before shared
ColecoVision peripherals, preventing AdamLink `$44/$45` from being mistaken for
the Lundy voice module. Serial profile, carrier, registers, and RX/TX queues are
preserved by save states.

Changing breakpoints does not patch the ROM. Source-line locations come from zero-byte source metadata. Changing Amy source or project files invalidates the build and its source map, so recompilation is then required.

Recorded `.amy-rom-test.json` scenarios can replay controller input and checkpoints in the browser. Repository `tools/rom-tests.json` and GearColeco baselines remain the stronger automated maintainer suite described below.

## Install GearColeco

The installer downloads the official Windows x64 release into `%LOCALAPPDATA%\AmyStudio\emulators`. It does not download or commit a copyrighted BIOS.

```powershell
powershell -ExecutionPolicy Bypass -File tools/install-gearcoleco.ps1 -BiosPath C:\path\to\colecovision.rom
```

The BIOS must be exactly 8192 bytes. GearColeco 1.6.8 is pinned because its MCP command set is part of the test contract. Override the executable with `GEARCOLECO_EXE` or `--gearcoleco` when required.

Official sources: [GearColeco repository](https://github.com/drhelius/Gearcoleco), [GearColeco releases](https://github.com/drhelius/Gearcoleco/releases).

## Run tests

```powershell
node tools/run-rom-tests.mjs
node tools/run-rom-tests.mjs --only amy-static-frameless-abi-selftest
```

The suite is declared in `tools/rom-tests.json`. Each case names an example, a frame budget, and expected byte values by assembler symbol. `check-examples.mjs --rom-dir` emits both `.rom` and GearColeco-compatible `.sym` files.

A direct runner invocation is also available:

```powershell
node tools/test-rom-gearcoleco.mjs --rom build/rom-tests/test.rom --symbols build/rom-tests/test.sym --frames 180 --expect-byte AMY_UVAR_Failures=00 --screenshot build/rom-tests/test.png
```

## Symbolic checkpoints

Prefer a named Amy checkpoint over an arbitrary final frame when the program has a meaningful state transition:

```basic
if defined ROM_TEST_CHECKPOINTS
  test checkpoint "warrior_image"
end defined
```

Configure the scenario with `"checkpoint": "warrior_image"`, or invoke the direct runner with `--checkpoint warrior_image`. The runner loads the generated `.sym`, resolves `AMY_ULBL_TEST_warrior_image`, installs an execute breakpoint, and frame-steps until it is hit. `frames` is then a maximum timeout rather than the observation instant.

```powershell
node tools/test-rom-gearcoleco.mjs --rom test.rom --symbols test.sym --frames 240 --checkpoint warrior_image
```

A missing, duplicate, or unreachable checkpoint fails loudly. The result records the resolved symbol, address, hit status, and actual number of frames executed.
## What this catches

- ROMs that transpile but fail during final assembly.
- Boot failures, invalid cartridges, and returns to PC `$0000`.
- Runtime regressions exposed through stable test-result variables.
- Visual evidence through deterministic PNG captures.
- CPU, VDP, and emulator status for diagnostics.

## Scope and next layer

GearColeco is the authoritative automated runner because it exposes frame stepping, memory, symbols, controller input, screenshots, VDP state, and CPU state. A second independent emulator should later run a smaller compatibility smoke suite, but it must not replace GearColeco's symbol-based assertions. CoolCV and real hardware remain release checks rather than the first automation layer because they do not expose an equivalent documented headless control API.

## Visual and VRAM regression baselines

A visual checkpoint stores the exact PNG hash, all 16 KiB of VRAM, the VRAM hash, and VDP registers after a deterministic frame count. Create a reviewed reference once, then compare every later build:

```powershell
node tools/test-rom-gearcoleco.mjs --rom build/rom-tests/test.rom --frames 180 --visual-baseline tools/rom-baselines/test.json --update-baseline
node tools/test-rom-gearcoleco.mjs --rom build/rom-tests/test.rom --frames 180 --visual-baseline tools/rom-baselines/test.json
```

A mismatch reports whether the PNG, VRAM, or VDP registers changed. VRAM mismatches include the first changed address ranges. Add `--trace-last-frames 2 --trace-output build/trace.json` to retain VDP-write and I/O-port events immediately before the checkpoint. Only update a baseline after manually approving the new result. Animated or random examples need deterministic controller/random-state setup before they are suitable as exact visual tests.

## Optimizer impact and isolation

Capture optimizer audits before and after a change to identify every example whose optimized ASM or ROM size changed:

```powershell
node tools/check-examples.mjs --assemble --optimization balanced --audit-json build/audits/before.json
# modify the optimizer
node tools/check-examples.mjs --assemble --optimization balanced --audit-json build/audits/after.json
node tools/compare-rom-audits.mjs --before build/audits/before.json --after build/audits/after.json
```

If a configured visual scenario regresses, isolate optimizer options automatically:

```powershell
node tools/diagnose-optimizer-visual.mjs --test amy-static-frameless-abi-selftest --profile balanced --frames 180 --baseline tools/rom-baselines/amy-static-frameless-abi-selftest.json
```

The diagnostic rebuilds the failing example while disabling each enabled optimizer option independently and reports which option restores the approved display. Historical safe peepholes still share the broad `peephole` switch. Every new peephole must therefore receive a dedicated boolean optimizer-config key; otherwise it cannot be isolated more precisely than the whole peephole pass.

## Deterministic controller input

Runtime scenarios may schedule controller actions before a symbolic visual checkpoint. The Warrior DAN2 test validates both sides of an interaction: the prompt scenario stops on `warrior_prompt`; in a separate run GearColeco injects `fire1` at frame 120 and stops on `warrior_image` after DAN2 decompression completes.

Direct form:

```powershell
node tools/test-rom-gearcoleco.mjs --rom test.rom --frames 240 --input 120:1:fire1:press_and_release --checkpoint warrior_image --symbols test.sym --visual-baseline tools/rom-baselines/warrior-dan2-fire-image.json
```

The Warrior baseline also enforces an independent comparison against the original picture data on every run: VRAM `$0000-$17FF` must equal the 6144-byte PATTERN table, VRAM `$2000-$37FF` must equal the 6144-byte COLOR table, and the NAME table must be sequential. This ensures the baseline cannot merely approve a consistently corrupted DAN2 result.
