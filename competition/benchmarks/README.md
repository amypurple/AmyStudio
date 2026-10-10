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
`competition/benchmarks/occupied-sizes.csv`.

## Optimized occupied sizes

| Sample | Amy | CVBasic | z88dk | ugBASIC | devkitSMS | PVColLib | NewColeco | libcv |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hello World | 233 | 1,466 | 3,687 | 1,420 | 1,507 | 1,106 | 795 | 1,001 |
| Warrior bitmap | 3,214 | 4,948 | 4,976 | 9,733 | 4,713 | 4,525 | 3,643 | 4,691 |
| Controller Visual | 590 | 1,695 | 4,016 | 2,025 | 1,430 | 1,194 | 932 | 812 |
| Sprite Metasprite | 978 | 1,845 | 2,607 | 5,797 | 1,681 | 1,304 | 1,142 | 1,413 |
| State Update | 1,422 | 2,453 | 2,878 | 4,013 | 2,126 | 1,308 | 1,253 | 1,291 |
| Tile Animation | 1,312 | 2,982 | 2,893 | 2,091 | 1,888 | 1,530 | 1,376 | 1,627 |

These figures include each program's cartridge header, runtime, code, and ROM
data, but exclude cartridge padding. Amy uses Experimental optimization, z88dk
uses `-O3`, and devkitSMS/SDCC uses `--opt-code-size` with
`--max-allocs-per-node 100000`. CVBasic uses its normal compiler and official
TMSColor/Pletter bitmap pipeline. devkitSMS uses its native aPLib VRAM decoder
with frame IRQ disabled around decompression; PVColLib uses native RLE. The bitmap
is the complete 256x192 Warrior picture in every ROM. All toolchains match it pixel for pixel.
The ugBASIC results use official `main` commit `e35e6df71f311174b3a3fcffdbf6849eecea5ec4`,
built from source on 2026-10-10. Each sample is compiled in a clean directory.
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
