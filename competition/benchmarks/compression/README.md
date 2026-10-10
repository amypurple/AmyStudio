# ColecoVision compression benchmark

This benchmark compares compression only when the complete runtime path is known. A host-side
compressor alone is not a ColecoVision feature.

## Method

- Input: two real TMS9918 Graphics II pictures, each composed of a 6144-byte pattern table and a
  6144-byte color table.
- Integrity: every Amy codec must decompress to the exact original 12,288 bytes.
- Payload: compressed pattern bytes plus compressed color bytes.
- First-use ROM cost: payload plus one linked decompressor. The decompressor is counted once even
  when both tables use it.
- Host compression time is reported only as Studio responsiveness. It is not Z80 execution time.
- Z80 cycles, temporary RAM, and direct-to-VRAM behavior remain separate measurements.

Run the existing reproducible checks from the repository root:

```text
node tools/benchmark-picture-compression.mjs
node tools/benchmark-codec-vram-cycles.mjs
node tools/test-warrior-codecs.mjs
node tools/benchmark-z88dk-picture-compression.mjs
node tools/benchmark-ugbasic-msc1.mjs
```

## Measured Amy results

All sizes are bytes. `Total` is payload plus the current estimated linked Z80 routine size.

### Cake picture

| Codec | Payload | Routine | Total | Saved vs raw |
|---|---:|---:|---:|---:|
| ZX0 | 2,958 | 136 | **3,094** | 9,194 |
| ZX1 | 3,112 | 127 | 3,239 | 9,049 |
| DAN3 | 3,005 | 205 | 3,210 | 9,078 |
| DAN1 | 3,006 | 205 | 3,211 | 9,077 |
| DAN2 | 2,999 | 212 | 3,211 | 9,077 |
| ZX7 | 3,104 | 136 | 3,240 | 9,048 |
| BitBuster 1.2 | 3,126 | 166 | 3,292 | 8,996 |
| Pletter | 3,108 | 212 | 3,320 | 8,968 |
| Nibble | 3,554 | 115 | 3,669 | 8,619 |
| LZF | 3,623 | 117 | 3,740 | 8,548 |
| MDK-RLE | 4,069 | 46 | 4,115 | 8,173 |

### Warrior picture

| Codec | Payload | Routine | Total | Saved vs raw |
|---|---:|---:|---:|---:|
| ZX0 | 2,849 | 136 | **2,985** | 9,303 |
| ZX1 | 2,964 | 127 | 3,091 | 9,197 |
| DAN3 | 2,891 | 205 | 3,096 | 9,192 |
| DAN1 | 2,903 | 205 | 3,108 | 9,180 |
| DAN2 | 2,897 | 212 | 3,109 | 9,179 |
| ZX7 | 2,984 | 136 | 3,120 | 9,168 |
| BitBuster 1.2 | 3,002 | 166 | 3,168 | 9,120 |
| Pletter | 2,988 | 212 | 3,200 | 9,088 |
| LZF | 3,195 | 117 | 3,312 | 8,976 |
| Nibble | 3,345 | 115 | 3,460 | 8,828 |
| MDK-RLE | 3,687 | 46 | 3,733 | 8,555 |

ZX0 wins ROM size on both pictures. This does not make it the automatic gameplay winner: the
GearColeco cycle benchmark confirms that simpler streams can decode much faster. Amy Studio should
keep offering size and speed choices rather than silently forcing one codec.

## Direct-to-VRAM cycle benchmark

`benchmark-codec-vram-cycles.mjs` compiles one Balanced ROM per codec and picture, measures two
complete 6,144-byte decompression commands with GearColeco's exact master-clock counter, and
compares all 12,288 output bytes in VRAM. Its default pictures represent the most-compressible,
median, and least-compressible members of the current corpus. Use `--all` for every corpus image.

Generated evidence:

- `bitmap-codec-vram-cycles.json`: method, constants, ranking, and every sample.
- `bitmap-codec-vram-cycles.csv`: per-picture cycles and NTSC/PAL frame equivalents.
- `bitmap-codec-vram-cycle-ranking.csv`: ranking by average measured cycles.

The current default ranking starts with MDK-RLE (445,166 average cycles), LZF (2,228,378), Nibble
(2,500,641), and BitBuster (2,534,837). Nibble ranges from 1,109,539 to 4,605,294 cycles, proving
that speed depends on the input stream. Frame values are time equivalents, not VBlank waits.

### ZX1 full picture corpus

All four pictures decode to the exact original 6,144-byte PATTERN and COLOR tables in GearColeco.
Warrior passes all five optimizer profiles; the other pictures pass Balanced.

| Picture | Raw | ZX0 payload | ZX1 payload | ZX1 + 127-byte decoder |
|---|---:|---:|---:|---:|
| Cake | 12,288 | 2,958 | 3,112 | 3,239 |
| Commando | 12,288 | 5,310 | 5,601 | 5,728 |
| Warrior | 12,288 | 2,849 | 2,964 | 3,091 |
| Barbarian | 12,288 | 4,229 | 4,437 | 4,564 |

The browser codec is byte-identical to the official ZX1 compressor on the differential fixtures.
`tools/test-zx1-picture-corpus.mjs` is the executable corpus and VRAM proof.

## Measured z88dk-family candidates

The official ZX1, ZX2, and aPLib host tools were run on the same raw tables and each result was
decoded back to the exact original bytes. ZX1 has a 127-byte Amy direct-to-VRAM decoder;
ZX2 now has a measured 115-byte Amy direct-to-VRAM decoder.

| Picture | Codec | Payload | Routine | First use |
|---|---|---:|---:|---:|
| Cake | ZX1 standard | 3,112 | 127 | 3,239 |
| Cake | ZX2 direct VRAM | 3,124 | 115 | 3,239 |
| Cake | aPLib official | 3,088 | devkitSMS routine available | payload-only measurement |
| Cake | aPLib JavaScript | **3,054** | 244 | 3,298 |
| Warrior | ZX1 standard | 2,964 | 127 | 3,091 |
| Warrior | ZX2 direct VRAM | 3,119 | 115 | 3,234 |
| Warrior | aPLib official | 2,975 | linked in devkitSMS | 4,713-byte complete ROM |
| Warrior | aPLib JavaScript | **2,973** | 244 | 3,217 |

ZX0 remains smaller for both pictures: 3,094 bytes first-use for Cake and 2,985 for Warrior.
ZX1 is close and now has a safe direct-to-VRAM implementation. Its actual Coleco cycle advantage
still needs measurement. ZX2's smaller direct-VRAM decoder does not offset its larger Warrior stream. aPLib does not beat Amy's ZX0 total, but it is highly
effective inside devkitSMS: its complete Warrior fixture falls from 13,680 bytes with raw tables
to 4,713 bytes. Exact GearColeco VRAM validation passes only when frame IRQ is disabled around the
unsafe decoder.

The official `appack` output uses a 24-byte AP32 safety wrapper. The table excludes that wrapper
because the Coleco Z80 decoder consumes only the raw payload. The official package is downloaded
locally for this benchmark but is intentionally ignored
by Git. Its license requires redistributing the complete package, so Amy Studio must not silently
vendor only the compressor executable.

The JavaScript beam-search encoder now uses exact encoded bit costs. Its streams and official raw
streams pass bidirectional decoding on real TMS9918 tables, repetitive data, incompressible data,
and boundary-sized inputs. It is smaller overall than official `appack` on the measured graphics
corpus, although `appack` still wins individual inputs. The JavaScript encoder remains hidden
from Amy's public codec list; the validated devkitSMS ROM uses official `appack` output.

## Seven-solution status

`*` means the ColecoVision direct-to-VRAM path was adapted for this benchmark;
it is not supplied natively by that toolchain.

| Solution | Confirmed Coleco formats | What can be compared now | Missing fair measurement |
|---|---|---|---|
| Amy Studio | ZX0, ZX1, ZX2, aPLib, MegaLZ, ZX7, Pletter, DAN1/2/3, LZF, BitBuster, MDK-RLE, Nibble | Exact round-trip, first-use ROM estimate, and GearColeco Z80 cycles on real TMS9918 data | Temporary RAM per decoder |
| CVBasic | Pletter | Direct source syntax and Coleco runtime exist | Same payload, linked routine bytes, cycles, and compiler build |
| z88dk `+coleco` | ZX0/1/2/7 and aPLib RAM APIs | ZX0*, ZX1*, ZX2*, and ZX7* VRAM adaptations are exact on Warrior | Measure cycles |
| ugBASIC | MSC1 and RLE compiler formats | `LOAD IMAGE ... COMPRESSED` is verified on Coleco | Find a Coleco image where MSC1 wins; RLE is not implemented by this target |
| SGlib_CV / SMSlib routine | ZX7 and aPLib | aPLib direct-to-VRAM exact on Warrior | Cycle cost and safe active-display strategy |
| PVColLib | RLE, Pletter, DAN1/2/3 | RLE direct-to-VRAM exact on Warrior | Compatible-stream proofs, linked costs, and cycles for other formats |
| Amy legacy devkit | GETPUT 1.1 MDK-RLE | Direct-to-VRAM exact on Warrior | Cycle cost and broader corpus |

## Required next measurements

1. Assemble one minimal Coleco ROM per codec and subtract a codec-free baseline to measure the
   actual linked routine and glue, replacing estimates.
2. Measure interrupt-enabled loading separately when evaluating active-display use; the current exact benchmark isolates decompression with NMI disabled.
3. Record whether the decoder writes directly to VRAM, stages in RAM, or reads previous bytes back
   from VRAM.
4. Run the same raw pattern and color tables through CVBasic Pletter, z88dk, ugBASIC, and SGlib_CV.
5. Reject any candidate that cannot round-trip exactly or cannot run safely on stock ColecoVision.

The MSC1 probe covers repeated quads, a tile map, sprite frames, sound-like commands, and
deterministic noise. Generic `LOAD(...) COMPRESSED` is gated on expansion banks. The narrower
`LOAD IMAGE(...) COMPRESSED` path does run on Coleco, but Warrior's generated ROM is byte-identical
to `NONE` because the compiler discards MSC1 when it is not smaller. The RLE image branch is
compiled only for C128 in ugBASIC 1.18, so it is not a Coleco capability yet.

Only after these steps can the comparison make a defensible size-versus-speed recommendation.
