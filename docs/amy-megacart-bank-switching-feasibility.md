# Amy MegaCart Bank-Switching Feasibility

## Status

MegaCart support now has a target descriptor, memory policy, deterministic
image builder, public `bank rom` / `bank select` syntax, and GearColeco runtime
tests for compact 64 KB and standard 128 KB images. Full bank-aware Amy linking
and debugging remain the architectural work; bank-local project outputs are
currently ASM or binary assets.

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
- `docs/research/mario-brothers-2009-mapper-analysis-2026-10-02.md` records a
  64 KB production ROM with a fixed-bank `55 AA` header and MegaCart mapper
  reads. It contains no identified SGM I/O.

## Remaining Amy Limitation

Amy's assembler understands a logical `ORG`, but it has no independent file
origin such as CVBasic's emitted `FORG`. Reusing `ORG $C000` is interpreted as
a backward/BSS transition instead of a new 16 KB ROM page. Symbols, source
maps, breakpoints, and profiler ranges currently identify code by a 16-bit
address only. The project builder can safely assemble a MegaCart image from one
fixed output and bank-local ASM/binary outputs. It cannot yet link arbitrary
Amy procedures across banks or represent bank-qualified source-map and
breakpoint addresses.

## Required Foundation

1. Track logical Z80 address and physical ROM offset independently.
2. Add bank-aware sections to the assembler/linker and emitted source map.
3. Permit repeated logical addresses in distinct bank namespaces.
4. Keep fixed code, NMI handlers, mapper helpers, and shared runtime data in
   bank 0 unless a proven trampoline makes access safe.
5. Generate bank-selection operations from cartridge size and bank number.
6. Support banked data access and cross-bank calls through explicit, safe
   compiler-generated sequences.
7. Teach optimizer symbol analysis not to merge or reorder across bank
   boundaries.
8. Teach ROM Test & Debug to identify execution as `(bank, address)` and read
   the active MegaCart bank.
9. Package exact 128/256/512/1,024 KB images with deterministic fill bytes.

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
