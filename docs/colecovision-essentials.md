# ColecoVision Essentials

This page is the compact Studio version of the hardware and BIOS knowledge Amy
uses every day. It is intentionally short: use search in the Docs tab, then open
the deeper references only when needed.

## Machine Surface

| Part | Practical Meaning |
|---|---|
| CPU | Z80A at about 3.58 MHz |
| VDP | TMS9918A/TMS9928A family: pattern, color, name, sprite pattern, and sprite attribute tables live in VRAM |
| Sound | SN76489-style PSG driven directly or through the Coleco BIOS sound manager |
| RAM | Very small. Amy keeps user variables in the safe user window and avoids OS-reserved RAM |
| ROM | Cartridge code starts at `$8000`; the BIOS title/header area is load-bearing |

## VDP Rules

- VRAM is not normal RAM. Reads and writes go through VDP ports and cost time.
- Prefer bulk operations such as `decompress ... to vram.*`, `copy ... to vram.*`, `put frame`, and `get frame` instead of many tiny VRAM operations.
- Screen modes define which tables matter. `text screen`, `tile screen`, `bitmap screen`, `picture screen`, and `multicolor screen` should set the right VDP register/table model for the programmer.
- NMI timing matters. If a routine waits for frames, NMI must be on and the NMI code must preserve registers before using them.
- BIOS status reads acknowledge the VDP interrupt/status state. They are not harmless reads.

## Graphics Tables

| Table | What It Holds |
|---|---|
| `vram.name` | Which tile/pattern index appears at each screen cell |
| `vram.pattern` | Pixel bits for character, tile, bitmap, and sprite patterns |
| `vram.color` | Foreground/background nibbles or bitmap color bytes, depending on mode |
| Sprite pattern | 8x8 or 16x16 sprite shape data |
| Sprite attribute | Sprite Y, X, pattern, and color entries |

For bitmap pictures, Amy Studio groups compatible files by base name:

- `Title.pattern.zx0`
- `Title.color.zx0`
- `Title.name.raw` when a custom name table is required

## Sound Today

Amy Studio currently supports several sound paths, but composition is not yet as
simple as graphics import:

- BIOS sound tables: best for music and most game sound effects.
- Tiny music: compact note-based music where the converter can help.
- `dsound`: direct sample-like effects with conversion and preview.
- Pure PSG sound effects: useful for jumps, lasers, crashes, and explosions,
  but still need better Studio editing.

Until Amy Studio has its own integrated music/effect editor, use Amy's external
sound tool:

- [Amy's CV Sound Studio repo](https://github.com/amypurple/AmysCVSoundStudio)
- [Amy's CV Sound Studio online](https://amypurple.github.io/AmysCVSoundStudio)

## Heritage Links

These are not required reading while coding, but they explain why Studio exposes
the machine the way it does.

- [ColecoVision Coding Guide PDF](https://ia600105.us.archive.org/13/items/manualzilla-id-5667325/5667325.pdf): Daniel Bienvenu's 2005 OS-7/BIOS, VDP, sound, sprite, timer, and controller reference.
- [MO5 article](https://mag.mo5.com/29629/daniel-bienvenu-de-retour-sur-colecovision/): 2012 article identifying Daniel Bienvenu / NewColeco with the ColecoVision devkit and `Flora and the Ghost Mirror`.
- [Amy Studio Heritage](amy-studio-heritage.md): project lineage and source notes.

## Rule Of Thumb

Amy should make the common path short, but not hide the hardware contract. If a
command touches VRAM, sound areas, NMI, or BIOS state, assume timing and table
layout matter.
