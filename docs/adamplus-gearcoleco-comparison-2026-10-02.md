# ADAM+ and GearColeco comparison

Date: 2026-10-02

## Scope

This study uses ADAM+ as an independent behavioral reference for Amy Studio's
GearColeco integration. ADAM+ code is not a source to copy. The comparison is
intended to identify observable device behavior, missing emulator capabilities,
and tests that Amy Studio can reproduce independently.

## Reproducible reference

- ADAM+ source: <https://github.com/dvdh1961/ADAMP>
- Source commit inspected: `e041740880fa4547e725d38c0342bb66c0e124cd`
- Windows release: `2.0.09.26`
- Archive: `build/adamplus-study/WINDOWS_ADAMP_2.0.09.26.zip`
- Archive SHA-256: `C092F6C071486F0EAFD02267E63E4922011CB4EDD313BC361249C4041EADE7B4`
- Extracted executable: `build/adamplus-study/windows-2.0.09.26/ADAMP_EMU.exe`
- Source checkout: `build/adamplus-study/source`

The Windows executable started successfully from an isolated directory and
remained responsive during a five-second smoke test. Its BIOS paths are empty by
default and its release does not redistribute the required Coleco firmware.

## Licensing boundary

ADAM+'s top-level license permits personal, educational, and non-profit use and
mentions incorporated third-party components. It is not a permissive license for
copying its complete implementation into GearColeco.

The embedded `pico9918-core` is separately MIT licensed by Troy Schrapel. That
component may be evaluated independently, with its copyright and license retained,
but adopting it remains a separate architectural decision.

## Device comparison

| Capability | ADAM+ 2.0.09.26 | Amy Studio GearColeco | Result |
| --- | --- | --- | --- |
| ADAM keyboard | Software and physical bridge paths | Software device `$01` | Present; compare key codes and timing |
| Printer | Software ADAMnet path | Software device `$02` with spool | Present; compare status and completion codes |
| AY-3-8910 | Implemented but artificially limited to ColecoVision SGM mode | Implemented for ColecoVision SGM plus explicit ADAM Sound Enhancer and Opcode SGM profiles | Real ADAM systems can attach Opcode's compatible SGM or an ADAM Sound Enhancer AY board. GearColeco routes `$50-$52` for either selected ADAM profile while keeping SGM RAM control out of ADAM's MIOC memory map. Native Amy DSK/DDP and OS7+EOS hybrid DSK programs are runtime-tested with register and nonzero-PCM evidence. |
| Disk drives | Software images plus physical MCU2 path | Software devices `$04` and `$05` | Present for two images |
| Data drives | Software images plus physical MCU2 path | Software devices `$08` and `$18` | Present for two images |
| Extra disk/data addresses | Routes `$04-$07`, `$08/$18/$09/$19` | Only `$04/$05`, `$08/$18` | Missing secondary units |
| FujiNet | Physical MCU2 bridge at ADAMnet `$0F` | No `$0F` device | Missing |
| Original controllers | Physical bridge support advertised | Existing software input mapping | Needs behavioral comparison |
| TMS9918A | Yes | Yes | Present |
| F18A | Separate software VDP backend | Software F18A backend | Present; compare feature coverage |
| Pico9918 | Third VDP backend through `vdp_bridge` | No Pico9918 backend | Missing, optional expansion |

## Important FujiNet finding

ADAM+'s new FujiNet support is principally a bridge to physical hardware through
its MCU2 interface. The emulator routes ADAMnet address `$0F` to that bridge and
keeps software DSK/DDP images as a separate mode. This is useful protocol evidence,
but it is not an in-process FujiNet emulator that can simply be transplanted.

An independent Amy Studio implementation should therefore have a clean device
boundary:

1. Add a generic ADAMnet external-device interface.
2. Reserve and report device `$0F` only when a FujiNet backend is enabled.
3. Implement deterministic test backends before network access: status, command
   framing, scripted responses, and save-state behavior.
4. Add a real network backend only after the ADAM FujiNet protocol is documented
   from public specifications and verified traces.
5. Keep disk and Data Pack image devices independent from FujiNet.

## Pico9918 finding

ADAM+ integrates Pico9918 as a true third VDP choice rather than treating it as an
F18A option. Its bridge forwards data, control, status, scanline timing, VRAM debug
reads, persistent configuration, and GPU instruction budgets to `pico9918-core`.
The scanline-level dispatch is important because it preserves mid-frame register
changes.

GearColeco currently exposes TMS9918A and F18A backends. Pico9918 support should be
considered only after an explicit compatibility matrix identifies features not
already covered by F18A and after browser/WASM cost is measured. It must not delay
core ADAM/EOS and ADAMnet correctness.

## Black-box comparison plan

Use identical locally supplied BIOS files and media in both emulators. Never add
firmware images to source control.

1. Boot SmartWriter with no media and record time to first visible frame.
2. Boot the same DSK and DDP images and record the first 32 PCB/DCB state changes.
3. Exercise keyboard letters, modifiers, Smart Keys, arrows, Home, and key repeat.
4. Read valid, final, missing, write-protected, and out-of-range blocks.
5. Compare printer STATUS, character output, block output, and completion codes.
6. Relocate the PCB and repeat disk, keyboard, and printer operations.
7. Save and restore state during an active block transfer.
8. Repeat under NTSC and PAL timing.
9. When physical MCU2/FujiNet hardware is available, capture only public bus-level
   transactions and compare them with the documented protocol.

For every discrepancy, prefer a small EOS test program that reports raw status
bytes over visual judgment. Keep expected traces in tests so later emulator changes
cannot silently regress them.

## Implementation priorities

1. Add GearColeco metadata and routing for disk `$06/$07` and data `$09/$19`, with
   absent-media behavior covered by tests.
2. Add a pluggable ADAMnet device interface and a deterministic mock device.
3. Implement FujiNet `$0F` protocol tests from public documentation.
4. Expand debugger visibility to show device address, command, block, length,
   completion code, and backend.
5. Evaluate Pico9918 separately, including WASM size, frame cost, save states, and
   debugger integration.

## Current conclusion

ADAM+ is valuable as a second implementation and a hardware interoperability
reference. It confirms that Amy Studio's current software disk, Data Pack, keyboard,
and printer model follows the central ADAMnet device layout. It also exposes two
real gaps: additional drive addresses and an extensible external-device path. The
FujiNet claim must remain precise: without MCU2/FujiNet hardware, ADAM+ does not give
us a complete software FujiNet implementation to test or reuse.
