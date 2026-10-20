# State-update benchmark

This deterministic workload measures gameplay state rather than drawing:

- six actors stored as a record array;
- patrol, chase, and cooldown states;
- timers, movement, logical box collisions, score, and a global state-machine dispatch;
- 48 fixed update ticks followed by a visible score and checksum.

The executable markers around each dispatch preserve `AF`. The test harness uses them only to
measure update cycles; VBlank waits and text rendering are excluded. Correctness requires identical
final RAM and screen results under every optimizer profile before size or speed is compared.

The benchmark exposed and now covers a former operand-symmetry gap: compound expressions assigned
directly to fields of record-array elements, including qualified overlay fields.

## Verified results so far

All rows below produced the same independent oracle: world state 1, 13 collisions,
score 425, and checksum 1478. Sizes are occupied bytes, excluding cartridge padding.

| Toolchain | Bytes | Average cycles | Worst update |
|---|---:|---:|---:|
| Amy Experimental | 1,162 | 3,186 | 4,278 |
| Amy Aggressive | 1,302 | 5,045 | 6,256 |
| Amy Balanced | 1,305 | 5,048 | 6,259 |
| z88dk nightly 2026-10-20, zsdcc 4.6 size | 2,712 | 7,923 | 10,002 |
| NewColeco legacy SDCC | 1,253 | 7,922 | 10,563 |
| PVColLib / SDCC | 1,308 | 7,988 | 9,932 |
| CVBasic 0.9.2 | 2,453 | 8,373 | 15,680 |
| devkitSMS `533ae572` / SDCC 4.5 | 2,099 | 8,422 | 10,564 |
| libcv / SDCC | 1,291 | 8,315 | 10,412 |
| ugBASIC `main` `e35e6df` | 4,013 | 37,080 | 40,460 |

The NewColeco CRT cannot place C static initializer data in its normal cartridge image layout.
The shared SDCC fixture therefore initializes benchmark state explicitly before the measured
region. This also removes startup-policy differences from the timing comparison.

## Symmetric engine-only size

The C fixtures do not draw the benchmark title, labels, or final decimal values. Removing only
that presentation from Amy while retaining the same update code, markers, final RAM oracle, and
runtime verification produces a 689-byte Experimental ROM. The displayed Amy ROM is 473 bytes
larger because it includes text-mode setup, strings, decimal formatting, and screen output.

The current measured split is 147 bytes for text-screen/display initialization and 326 additional bytes
for the title, labels, decimal formatting, and output calls. These are optional features, not
record-array or state-update overhead.

The numeric-output audit removed 68 bytes from this fixture by omitting configurable digit
remapping when the source never uses `set number digits/pad`. The default path also reserves two
fewer RAM bytes. Custom digit tiles retain the full remapper, while default `width$` uses a smaller
zero-to-space helper. Literal text, coordinate setup, decimal conversion, and VRAM output remain
separate presentation costs to measure.

| Comparable core | Occupied bytes |
|---|---:|
| Amy Experimental, engine only | 689 |
| NewColeco legacy SDCC | 1,253 |
| libcv / SDCC | 1,291 |
| PVColLib / SDCC | 1,308 |

Experimental now keeps an eligible `for each` record iterator in IX and advances it by the known
record stride. Calls, inline ASM, local frames, nested aliases, and other unsafe contexts retain the
RAM-pointer fallback. Run `node tools/test-state-update-benchmark.mjs --core-only` to reproduce the
five-profile engine-only measurement and GearColeco oracle.

ugBASIC supports an array of user-defined `TYPE` values, but this fixture causes it to allocate
many expression temporaries and emit substantially more update code. Its final state is still
exact; the size and timing gap is a code-generation result rather than a missing language feature.
