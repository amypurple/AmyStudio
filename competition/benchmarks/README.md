# ColecoVision eight-tool samples

Run `tools/build-five-tool-bluemsx-suite.ps1` to build three runnable ROMs for
Amy, CVBasic, z88dk, ugBASIC, devkitSMS/SGlib_CV, PVColLib, Amy's legacy SDCC devkit, and libcv. Run
`tools/build-pvcollib-benchmarks.ps1` and
`node tools/build-legacy-devkit-benchmarks.mjs` after the main suite:

1. Hello World
2. Graphics II bitmap picture
3. Visual controller input demo

Run `tools/build-sprite-metasprite-benchmarks.ps1` for the fourth benchmark:

4. Animated three-color 16x16 metasprite with controller movement

The complete comparison also includes deterministic actor-array state updates and Graphics II
tile animation. Every libcv port now has a dedicated GearColeco runtime oracle.

The resulting 21 ROMs are under `build/competition`, with the main suite also
grouped under `build/competition/bluemsx-sample-suite`. Physical ROM length can
include toolchain cartridge padding and must not be mistaken for occupied code
size. `occupied-sizes.csv` is generated from linker facts rather than by
trimming trailing `$00` or `$FF` bytes.

The latest generated measurements are also kept in the repository as
`competition/benchmarks/occupied-sizes.csv`. Exact toolchain revisions,
release or commit dates, and compiler backends are recorded in
`competition/benchmarks/toolchain-versions.csv`.

## Optimized occupied sizes

| Sample | Amy | CVBasic | z88dk | ugBASIC | devkitSMS | PVColLib | NewColeco | libcv |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hello World | 227 | 1,466 | 1,980 | 1,420 | 1,401 | 1,106 | 795 | 1,001 |
| Warrior bitmap | 3,214 | 4,948 | 4,976 | 9,733 | 4,680 | 4,525 | 3,643 | 4,691 |
| Controller Visual | 604 | 1,695 | 2,272 | 2,025 | 1,403 | 1,194 | 932 | 812 |
| Sprite Metasprite | 939 | 1,845 | 2,492 | 5,797 | 1,654 | 1,304 | 1,142 | 1,413 |
| State Update | 1,138 | 2,453 | 2,712 | 4,013 | 2,099 | 1,308 | 1,253 | 1,291 |
| Tile Animation | 1,255 | 2,982 | 2,729 | 2,091 | 1,838 | 1,530 | 1,376 | 1,627 |

These figures include each program's cartridge header, runtime, code, and ROM
data, but exclude cartridge padding. Amy uses Balanced optimization. z88dk uses its
size-optimized zsdcc backend where the runtime oracle passes and direct `cputs` for fixed text;
the ZX0 bitmap retains the classic backend because its hand-written depacker depends on that ABI.
devkitSMS/SDCC uses `--opt-code-size`, `--max-allocs-per-node 200000`,
`NO_FRAME_INT_HOOK`, and `MAXSPRITES=3`. Small fixed VRAM transfers use
`SG_VRAMmemcpy_brief`; repeated Name/Color bytes use `SG_VRAMmemset`.
An additional runtime-validated audit found that SDCC allocator budgets are non-monotonic:
`100000` is smaller for three simple devkitSMS fixtures, `500000` is smaller for the State
fixture, and `3000` miscompiles State through stale `IY` reuse. These exploratory results do not
replace the ranked six-ROM set until every selected build and dependency is archived. See
`docs/audits/optimization/sdcc-node-budget-audit-2026-10-24.md`.
CVBasic uses its normal compiler and official
TMSColor/Pletter bitmap pipeline. devkitSMS uses its native aPLib VRAM decoder
with frame IRQ disabled around decompression; PVColLib uses native RLE. The bitmap
is the complete 256x192 Warrior picture in every ROM. All toolchains match it pixel for pixel.
The measured z88dk package is nightly `26587-33d4c333ea-20261020` (2026-10-20), using
zsdcc 4.6. The measured devkitSMS revision is `533ae572` (2026-09-29), including its
ColecoVision VDP interrupt acknowledgement, IRQ/NMI vector protection, and bounded static-RAM clear.
The ugBASIC results use official `main` commit `e35e6df71f311174b3a3fcffdbf6849eecea5ec4`,
built from source on 2026-10-10. Each sample is compiled in a clean directory.
An upstream refresh on 2026-10-25 also rebuilt CVBasic `fd70d3d`, ugBASIC `79612f9` and
`5bbd963`, and checked devkitSMS head. CVBasic's six ColecoVision ROMs remain byte-identical and
devkitSMS is unchanged. The newer ugBASIC builds are smaller, but both fail the 16x16 metasprite
oracle after TMS9918 sprite-stride commit `1068bfe`; the ranked suite therefore retains the last
fully validated ugBASIC revision. See
`docs/audits/optimization/external-toolchain-refresh-2026-10-25.md`.
Every sample is built in a freshly cleaned, isolated directory. Literal display text uses
`PRINT RAW`, reducing Hello to 1,420 occupied ROM bytes and Controller to 2,025. The corrected Coleco
controller masks pass the input oracle. MSC1 reduces Warrior to 9,733 ROM bytes and restores the
reference framebuffer pixel for pixel.

The ugBASIC linker defines `__code_user_tail` as the first address after the ROM section, so the
occupied byte count is `tail - head`. All six generated sections end with a required `$C9` `RET`.
The author's figures are exactly one byte smaller because they report the highest occupied offset
(`tail - head - 1`), not because the linked ROM contains removable padding. This benchmark keeps
the complete linker section: 1,420 bytes for Hello and 2,025 bytes for Controller.

The measurements come respectively from Amy's assembled ROM, CVBasic's
`ROM_END`, z88dk's unpadded linked binary, ugBASIC's `code_user` ROM section,
devkitSMS's Intel HEX span, PVColLib's Intel HEX span, and the legacy devkit's
unpadded linked binary. This avoids treating legitimate final
zero bytes as padding.

The controller display uses dark blue for neutral, green shades for vertical
movement, yellow/cyan for horizontal movement, red for either fire button, and
purple for keypad input.

The sprite benchmark uses the same 192 pattern bytes in every ROM. GearColeco
verifies both animation frames, three aligned color layers, sprite priority,
and a safe SAT terminator or offscreen sentinel. Exactly three sprites are
visible on a scanline, within the TMS9918 limit.
