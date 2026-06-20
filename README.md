# Amy Studio

**Amy Studio** is a complete, production-grade ColecoVision homebrew development
environment that runs entirely in the browser. Write source code, compile to a
ColecoVision ROM, and run it in the built-in emulator — no installation required.

Because this project is the sum of everything its creator has learned and built
over thirty years, it carries her name: **Amy**.

---

## The Language

**Amy** is a structured, typed language designed from the ground up for the Z80
and the ColecoVision hardware contract. It reads like BASIC and compiles close
to hand-written Z80. It does not hide the machine — inline ASM is available
anywhere precision demands it.

**Numeric types:** `bool`, `u8`, `i8`, `u16`, `i16`, `u32`, `i32`,
`fixed` (8.8), `ufixed`, `fixed32` (16.16), `fp5` (5-byte float), `bcd`

**Aggregate types:** arrays, records, nested records

**VDP graphics modes:** `text screen`, `tile screen`, `bitmap screen`,
`picture screen`, `multicolor screen`

**Sprites:** 8×8 and 16×16, shadow table, named hitboxes, software and VDP
coincidence collision

**Input:** inline joypad, spinner, dual-controller, keypad

**Sound:** BIOS sound tables as defined in the original 1982 ColecoVision
Programming Guide, tiny music streams, DSound for sampled voice effects

**Assets:** compressed bitmaps, tile/charset data, sprite patterns, `.dsound`
voice clips — with codec selection at the project level

**Flow control:** `if/elseif/else`, `select case`, `for/next`, `while`,
`do/loop`, `exit`, `continue`, subs, functions with return values, recursion,
inline labels, `goto`/`gosub`

**Inline ASM:** drop to Z80 assembly anywhere in an Amy program

**Cartridge header:** `cartridge "TITLE/AUTHOR/YEAR"` generates a legal
ColecoVision ROM header automatically

---

## The Studio Pipeline

The Studio web app provides a complete in-browser development pipeline.

- **Compiler and runtime** — full, production-grade implementations
- **Z80 assembler** — with an advanced peephole optimizer producing tight,
  predictable output
- **Nine compression codecs** — RLE (MDK-style), BitBuster, Pletter, LZF,
  ZX0, ZX7, DAN1, DAN2, DAN3, each with its own decompressor size, speed,
  and compressed-size profile. DAN1, DAN2, and DAN3 are Amy's own LZSS-family
  codecs, developed from 2016 onward.
- **Bitmap graphics pipeline** — import, convert, preview, and compress
  ColecoVision pattern/color/name table data, with live preview
- **DSound pipeline** — convert WAV to 4-bit PCM voice clips, preview, and
  embed in projects
- **Cartridge title preview** — see the BIOS title screen before building
- **Project files** — cartridge title, assets, compression choices, and source
  kept together

---

## Run

Serve the repository root with any static HTTP server, then open `/studio/`.

```sh
python -m http.server 8080
```

Then open:

```
http://localhost:8080/studio/
```

Or on Windows with PowerShell:

```powershell
pwsh -File tools/serve-studio.ps1
```

### Emulator

Amy Studio does not bundle a ColecoVision BIOS ROM. To use the built-in
emulator, place your own `colecovision.rom` or `os7.rom` file in `studio/bios/`.
Without a BIOS, emulator launch is blocked by design.

---

## Examples

Twenty-nine curated examples are included, covering:

- Minimal starters (hello world, sprite, joypad, collision, DSound)
- Demos (tile collision maze, sprite platformer, bitmap slideshow)
- Music — including *Africa* by Toto, Commando, and Brinquitos
- CVBasic compatibility ports — a full collection from `happy_face` through
  `viboritas`, demonstrating Amy's compatibility with the CVBasic programming
  style
- Sorting algorithms (bubble, insertion, heap, quicksort, three-way comparison)
- Complete games: Checkers, Diamond Dash, Meteor Dodge, Brinquitos,
  Chateau du Dragon

---

## Benchmark

Amy's fp5 floating-point implementation was tested against the classic
**Creative Computing / Ahl Benchmark** (March 1984), which compared speed,
arithmetic accuracy, and random-number quality across 140 different computers.

| Machine | Time | Accuracy | Random |
|---|---:|---:|---:|
| Acorn BBC Computer | 0:21 | .0000120746033 | 5.2 |
| IBM PC | 0:24 | .01159668 | 6.3 |
| Memotech MK-512 | 0:46 | .000252952112 | 6.9 |
| Coleco ADAM | 0:47 | .000426292419 | 6.2 |
| **Amy Studio (fp5)** | **0:48** | **.000012397** | **9.5** |
| TRS-80 Model 4 | 0:53 | .0470776 | 6.5 |
| Commodore 64 | 1:53 | .0010414235 | 8.9 |
| Apple II+ / IIe | 1:53 | .0010414235 | 12.0 |
| Atari 400/800 | 6:48 | .012959 | 22.0 |

Amy Studio runs on the same Z80 hardware as the Coleco ADAM and achieves
the same speed — while delivering approximately **35× better arithmetic
accuracy**, matching the Acorn BBC Computer's floating-point precision on
hardware that was never designed for floating-point computation.

---

## Heritage

Amy Studio descends from a lineage that begins in **1996** with
QuickBASIC DOS tools for ROM inspection and graphics conversion (VOIROM,
CVPHOTO, ICVGM), and continues through the SDCC devkit era (`lib4ksa`,
`getput11`), graphics tools (CV Paint), sound and music work, and the
compression research that produced DAN1, DAN2, and DAN3.

The devkit was shaped by finished, released games — Breakout (1999), DacMan,
BUSTin-Out, Spektank, GhostBlaster, Flora and the Ghost Mirror, and others —
each one exposing missing helpers and pushing the system forward. The tools,
documentation, music, and games were shared freely with the ColecoVision
homebrew community for over a decade.

The cartridge memory model, NMI contract, and BIOS sound-table approach
trace back to **Marcel de Kogel**'s 1997 Hi-Tech C ColecoVision kit, which
is an acknowledged root of this lineage.

The full technical heritage is documented in
[docs/amy-studio-heritage.md](docs/amy-studio-heritage.md).

---

## Documentation

| Document | Purpose |
|---|---|
| [docs/amy-language.md](docs/amy-language.md) | Full Amy language reference |
| [docs/amy-current-version.md](docs/amy-current-version.md) | Current version status and numeric surface |
| [docs/colecovision-essentials.md](docs/colecovision-essentials.md) | Hardware and BIOS quick reference |
| [docs/amy-studio-heritage.md](docs/amy-studio-heritage.md) | Technical lineage and project history |
| [docs/amy-removed-forms.md](docs/amy-removed-forms.md) | Removed spellings with fix-it guidance |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Change history |

---

## Status

Amy is **pre-release**. The language, compiler, and runtime are production-grade
and actively used. The public API surface is being finalized before a versioned
release is declared.

---

## Clean Distribution

A stripped-down, self-contained release with no development tooling is available
at `dist/amy-studio-clean/`. It includes the Studio web app, the compiler and
runtime, the Z80 runtime ASM sources, documentation, and the curated example
catalog. See `dist/amy-studio-clean/README.md`.
