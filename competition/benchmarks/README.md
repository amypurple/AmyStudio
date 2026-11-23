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
| Hello World | 234 | 816 | 1,980 | 781 | 1,397 | 1,106 | 795 | 1,001 |
| Warrior bitmap | 3,213 | 4,313 | 4,976 | 7,040 | 4,676 | 4,525 | 3,643 | 4,682 |
| Controller Visual | 604 | 1,086 | 2,272 | 1,905 | 1,399 | 1,194 | 932 | 812 |
| Sprite Metasprite | 797 | 1,261 | 2,492 | 2,883 | 1,652 | 1,201 | 1,166 | 1,413 |
| State Update | 1,141 | 1,890 | 2,667 | 3,683 | 2,039 | 1,229 | 1,253 | 1,225 |
| Tile Animation | 1,255 | 2,332 | 2,729 | 1,763 | 1,834 | 1,516 | 1,376 | 1,627 |

These figures include each program's cartridge header, runtime, code, and ROM data, but exclude
cartridge padding. Each entry is the smallest retained build that passes the sample's dedicated
runtime oracle. SDCC allocator budgets and equivalent source formulations may therefore differ by
sample. ugBASIC likewise uses its best validated per-sample result: upstream `04ce31b21` for Hello
and Warrior, the corrected portable 1.18.2 controller, the compact `2db87ebd` metasprite, and the
corrected 1.18.2 BIOS build for State Update and the paced, coherent Tile Animation fixture. The authoritative revisions,
measurements, and evidence notes are in `occupied-sizes.csv` and the downloadable evidence archive.

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
