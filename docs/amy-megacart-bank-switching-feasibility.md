# Amy MegaCart Bank-Switching Feasibility

## Status

MegaCart support now has a target descriptor, memory policy, deterministic
image builder, public `bank rom` / `bank select` syntax, and GearColeco runtime
tests for compact 64 KB and standard 128 KB images. Bank-qualified link maps and
execution breakpoints are implemented. Switchable outputs may now compile
bank-local Amy procedure/data modules as well as ASM and binary assets;
arbitrary cross-bank Amy linking remains architectural work.

The first linker foundation is now implemented as a bank-qualified link map.
It records logical bank, physical ROM bank, CPU address, file offset, capacity,
usage, and qualified symbols without changing the emitted cartridge image.

## Verified ColecoVision Model

- The final physical 16 KB bank is fixed at `$8000-$BFFF` and contains shared
  code, startup, and the cartridge header.
- A selected 16 KB bank is visible at `$C000-$FFFF`.
- `$FFC0-$FFFF` is reserved for MegaCart bank selection, leaving `$C000-$FFBF`,
  or 16,320 bytes, for each switchable bank.
- A read in the mapper range selects a bank; the selected address depends on
  the cartridge capacity.
- Amy supports 64, 128, 256, 512, and 1,024 KB images. The 64 KB form is
  emulator-compatible and now has a real-world example, but 128 KB remains the
  recommended minimum for broad physical-hardware compatibility.
- CVBasic's established sizes are 128, 256, 512, and 1,024 KB, corresponding
  to 8, 16, 32, and 64 banks.
- CVBasic keeps shared procedures in bank 0. `BANK n` places following code and
  data, while `BANK SELECT n` changes the visible bank from bank 0.

## Implemented Foundation

- `studio/core/projectTargets.js` defines the MegaCart target, memory windows,
  supported sizes, optimization policy, and bank-aware-symbol requirement.
- `studio/core/megaCartImage.js` lays out exact power-of-two images, places the
  fixed bank last, reserves the mapper footer, and rejects duplicate banks,
  invalid headers, unsupported sizes, and bank overflow.
- `tools/test-megacart-image.mjs` verifies placement, fill bytes, selection
  addresses, limits, and fail-closed diagnostics.
- `tools/test-megacart-bank-demo.mjs` executes 64 KB and 128 KB images in
  GearColeco and verifies two independently selected banks.
- `studio/core/megaCartLinkMap.js` separates logical addresses from physical
  ROM offsets and permits the same symbol address in independent bank
  namespaces. It rejects duplicate local symbols, mapper-area symbols, invalid
  bank numbers, and capacity overflow.
- Switchable outputs declare public `exports` in `project.amy.json`. Plain Amy
  names resolve to generated procedure, function, or data symbols and become
  qualified `bank:n:Name` entries. Missing, ambiguous, and duplicate public
  exports fail the build before a trampoline can reference them.
- `call bank n, Procedure` resolves an explicitly exported no-argument Amy
  `sub`, emits its trampoline into the fixed bank, tracks the active logical
  bank in one RAM byte, and restores the caller's bank after return. Mapper
  reads remain live under every optimizer profile. Parameter and function ABIs
  are deliberately not claimed yet.
- `tools/test-megacart-link-map.mjs` verifies exact-capacity banks, repeated
  `$C000` addresses, qualified symbol resolution, ambiguity diagnostics, and
  physical offsets.
- `studio/core/romDebuggerModel.js` now preserves `bank:address` symbol input,
  resolves `bank:2:Symbol` and `2:$C000`, rejects ambiguous unqualified names,
  and keeps source breakpoints at the same address separated by bank.
- The bundled GearColeco WASM bridge exports the currently selected physical
  MegaCart bank and cartridge type. ROM Test & Debug converts it to Amy's
  logical-bank convention only for an actual MegaCart, shows bank-qualified
  execution addresses and symbols, and filters coincident 16-bit execute
  breakpoints by the active bank.
- Saved ROM tests and development routes preserve a checkpoint bank, while
  legacy unbanked files remain valid. Routine profiling accepts qualified
  targets such as `bank:2:Draw` and keeps same-named bank-local measurements
  separate.
- Amy normalizes GearColeco's current text trace lines and future structured
  CPU entries to logical `{bank, address}` locations. A backward-compatible MCP
  source patch adds structured address/physical-bank entries, but the desktop
  executable still requires a native rebuild before that richer form ships.
- Rewind keyframes and gameplay-recording initial states capture PC, logical
  bank, and physical bank. Restoring a MegaCart keyframe validates that the
  mapper state returned to the exact saved execution location; ordinary ROMs
  remain explicitly unbanked.
- `docs/research/mario-brothers-2009-mapper-analysis-2026-10-02.md` records a
  64 KB production ROM with a fixed-bank `55 AA` header and MegaCart mapper
  reads. It contains no identified SGM I/O.

## Remaining Amy Limitation

AmySCVAssembly now implements independent `FORG` and `ORG` counters with
forward `$FF` fill and backward-physical-origin rejection. The project builder
can safely assemble one fixed output plus bank-local Amy, ASM, and binary
outputs. A bank-local Amy file deliberately permits only procedures and ROM
data: top-level execution, global runtime initialization, and external Amy
assets fail closed. Calls and data references across banks still require an
explicit bank-aware linker/trampoline design.

## Required Foundation

1. Preserve real assembler symbols and source maps for every bank-local output.
2. Add explicit imports/exports between fixed and switchable outputs.
3. Generate safe cross-bank trampolines while preserving the caller's bank.
4. Keep fixed code, NMI handlers, mapper helpers, and shared runtime data in
   bank 0 unless a proven trampoline makes access safe.
5. Generate bank-selection operations from cartridge size and bank number.
6. Support banked data access and cross-bank calls through explicit, safe
   compiler-generated sequences.
7. Teach optimizer symbol analysis not to merge or reorder across bank
   boundaries.
8. Extend exact-resume metadata only when a persisted save-state workflow is
   introduced; current in-session rewind and recording state is bank-aware.
9. Continue packaging exact 64/128/256/512/1,024 KB images with deterministic fill bytes.

## Mandatory Capacity Diagnostics

Compilation must fail closed when any bank exceeds its capacity. This belongs
in the assembler/linker so command-line and Studio builds behave identically.

- Reject more than 16,320 bytes in a switchable bank.
- Reserve `$FFC0-$FFFF`; never place code or data there.
- Reject a resource or routine that crosses a bank boundary.
- Reject bank numbers unavailable in the selected cartridge size.
- Independently report fixed-bank use after its header and runtime reserves.
- List the largest symbols so the programmer can reorganize the project.
- Warn near 90% use, but only an actual overflow is fatal.

Example diagnostic:

```text
Bank 3 overflow: 16412 / 16320 bytes (+92)
Largest: LevelMap 4096, BossGraphics 3274, BossMusic 1840
```

## Prototype Gate

Before designing final Amy syntax, build a development-only 128 KB fixture:

1. fixed startup, NMI, controller input, and bank selector in the final bank;
2. two different data assets at logical address `$C000` in separate banks;
3. controller-driven selection and direct-to-VRAM display;
4. one safe call into banked code and return to bank 0;
5. deliberate exact-limit and one-byte-overflow builds;
6. GearColeco verification in every optimizer profile;
7. bank-aware breakpoint and source-map verification.

Only after this passes should concise syntax such as `megacart 128K`, `bank 1`,
`use bank 1`, or `call Routine in bank 2` be evaluated. Automatic bank
selection is appropriate for simple asset operations; hidden switching around
arbitrary code is not.
