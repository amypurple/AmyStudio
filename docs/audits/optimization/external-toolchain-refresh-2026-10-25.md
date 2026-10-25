# External toolchain refresh audit (2026-10-25)

## Verdict

The ranked comparison remains on its previously validated toolchain revisions. Current CVBasic
master is byte-identical to the published CVBasic 0.9.2 six-ROM set, devkitSMS has no newer commit,
and current ugBASIC main fails the dedicated 16x16 metasprite oracle.

| Toolchain | Previously measured | Current upstream checked | Result |
|---|---|---|---|
| CVBasic | `e99aede0` (0.9.2) | `fd70d3d33f24951605de9405fc0630855e79c819` (2026-10-19) | All six ROMs byte-identical |
| ugBASIC | `e35e6df71f311174b3a3fcffdbf6849eecea5ec4` | `5bbd96372ca2272e1359047da2f3687918a3c79f` (2026-10-25) | Rejected: 16x16 sprite patterns are mislaid |
| devkitSMS | `533ae572c897cf44f1da865013ebf690134301a3` | same revision | No update to measure |

| ugBASIC revision | Hello | Bitmap | Controller | Sprite | State | Tile | Total | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `e35e6df` | 1,420 | 9,733 | 2,025 | 5,797 | 4,013 | 2,091 | 25,079 | PASS |
| `79612f9` | 1,420 | 7,650 | 2,025 | 3,703 | 4,013 | 2,091 | 20,902 | FAIL sprites |
| `5bbd963` | 1,419 | 7,649 | 2,024 | 3,300 | 4,012 | 2,090 | 20,494 | FAIL sprites |

The Warrior bitmap remains pixel-exact in both newer builds despite 450 Pattern-byte and 1,322
Color-byte differences from equivalent foreground/background encodings. Commit `1068bfe` changes
the TMS9918 sprite row stride from `width >> 4` to `width >> 3`; the resulting ROMs contain
zero-byte interleaving and misplaced rows in both benchmark animation frames.

The bitmap differences are accepted as a native ugBASIC optimization: rendered color indexes, not
one particular PATTERN/COLOR representation, define correctness. Amy Studio applies the same rule
with its lossless Mode 2 Repacker. On Warrior, the current Amy assets are already the best tested
ZX0 representation at 2,849 compressed payload bytes; the ten alternate lossless strategies range
from 2,890 to 3,633 bytes and are therefore correctly rejected. The upstream-ready sprite report is
`docs/reports/ugbasic-tms9918-16x16-sprite-regression-2026-10-25.md`.

SDCC allocator budgets and compiler versions remain recorded in
`docs/audits/optimization/sdcc-node-budget-audit-2026-10-24.md`.
