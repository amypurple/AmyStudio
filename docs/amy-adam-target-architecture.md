# Amy Coleco ADAM EOS Target Architecture

## Status

Architecture study started. This document defines the constraints that must be
runtime-tested before `memory "coleco_adam_eos"` becomes a public Amy target.
The existing debugger ADAM profile is emulator support only; it does not make a
ColecoVision cartridge build into an ADAM EOS program.

## First Supported Program Form

The first target will be an EOS executable file stored in a 160 KiB disk image
or a compatible data-pack image. It is not a cartridge and must not emit the
ColecoVision header at `$8000`.

Canonical source declaration, reserved until the runtime is complete:

```amy
project "ADAM Hello"
memory "coleco_adam_eos"
```

The compiler must reject `cartridge` when this profile is selected. ADAM
cartridge execution remains the existing ColecoVision cartridge target running
under the debugger's ADAM Cartridge machine profile.

## Verified Memory Contract

The ADAM Technical Reference Manual defines an executable EOS file as loading
and running at `$0100`. With the full EOS file manager retained, applications
must not overwrite `$D390-$FFFF`.

| Range | Owner |
|---|---|
| `$0000-$00FF` | Restart vectors and low system workspace; target startup must preserve the required EOS state |
| `$0100-$D38F` | Maximum application region before stack and Amy reservations are applied |
| `$D390-$D3FF` | EOS file-control-block headers |
| `$D400-$DFFF` | Three 1 KiB EOS file buffers |
| `$E000-$F3FF` | EOS code |
| `$F400-$FBFE` | AdamNet device drivers |
| `$FBFF-$FC2F` | EOS data tables |
| `$FC30-$FD4F` | EOS jump tables |
| `$FD50-$FEBF` | EOS global RAM |
| `$FEC0-$FEC3` | Processor control block |
| `$FEC4-$FFFE` | Device control blocks |
| `$FFFF` | DMA-reserved byte |

Amy must call documented EOS jump-table entry points rather than private EOS
implementation addresses. The full-file-manager profile deliberately keeps the
conservative `$D390` boundary. Later expert profiles may reclaim `$D390-$DFFF`
or `$E000-$F3FF` only when their reduced EOS contract is explicit.

## Runtime Differences From ColecoVision

The current `colecovision_legacy_sdcc` runtime cannot be reused unchanged:

- it emits a cartridge header and starts at `$8000`;
- it allocates variables in the ColecoVision `$7000-$73FF` RAM window;
- it calls OS-7 routines and relies on OS-7 work areas;
- it installs cartridge vectors and an NMI path intended for OS-7 startup;
- it produces a raw ROM rather than an EOS directory entry and bootable medium.

Reusable components must be limited to hardware-level routines whose RAM,
interrupt, and firmware assumptions have been audited. Pure Z80 math and codec
cores are likely reusable. OS-7 graphics, controller, sound, and startup paths
are not assumed compatible.

## Required Build Pipeline

1. Transpile Amy using an ADAM-specific runtime capability set.
2. Assemble a flat executable whose first byte maps to `$0100`.
3. Verify no emitted byte or reserved RAM crosses `$D390`.
4. Create an EOS executable directory record with attribute `$C8`.
5. Store the executable in contiguous 1 KiB media blocks.
6. Emit a bootable 160 KiB `.dsk` first; add `.ddp` after disk validation.
7. Boot the image in GearColeco with OS7, EOS, and SmartWriter firmware.

The raw executable should remain downloadable beside the packaged medium for
debugging, but it is not by itself the user-facing ADAM deliverable.

## Acceptance Gates

The target is not public until all gates pass:

- assembler output begins at `$0100` and stays below `$D390`;
- startup initializes a private stack without overwriting EOS;
- a minimal program boots from a generated disk and reaches an Amy source
  checkpoint in GearColeco;
- text/VDP output, keyboard input, controllers, PSG sound, and frame timing each
  have a runtime oracle;
- EOS block and file I/O have explicit Amy commands and error reporting;
- disk generation round-trips through an independent directory/image parser;
- ColecoVision examples and cartridge output remain byte-stable unless a
  separately reviewed optimization changes them.

## Implementation Order

1. Add an internal ADAM target descriptor and memory-layout tests without
   exposing the profile in the Studio UI.
2. Add `$0100` startup and a minimal EOS-safe runtime.
3. Add deterministic EOS disk-image packaging and parser tests.
4. Add GearColeco boot/checkpoint validation.
5. Add console, keyboard, controller, VDP, PSG, and file APIs incrementally.
6. Expose the target in Amy Studio only after the boot and memory gates pass.

## Primary References

- Coleco ADAM Technical Reference Manual, Chapter 3, sections 4.1-4.1.7.
- Amy Studio's bundled GearColeco 1.7.0 ADAM firmware and media interfaces.
