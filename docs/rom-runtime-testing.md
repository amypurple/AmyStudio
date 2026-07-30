# Automated ColecoVision ROM testing

Amy Studio uses GearColeco's headless MCP interface as its primary runtime test runner. The compiler audit and emulator test are separate gates:

1. `node tools/check-examples.mjs --assemble` transpiles and assembles every example.
2. `node tools/run-rom-tests.mjs` builds selected self-tests, executes them in GearColeco, and checks named RAM symbols.

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
