# ugBASIC upstream refresh - 2026-11-06

Official ugBASIC `main` commit `2db87ebd3c0c34c5add2e4bfe6f11f939e796044` was built from
the locally available upstream source without downloading binaries or installing system packages.
Modern Autotools required removing the obsolete duplicate `ACLOCAL_AMFLAGS = -I m4` declaration
from the bundled libxml2 build. The ColecoVision compiler then built successfully with the bundled
libxml2 source and the already trusted local z88dk tools.

| Sample | Previous `afd97a3` | Current `2db87ebd` | Change |
|---|---:|---:|---:|
| Hello World | 1,419 | 1,340 | -79 |
| Warrior bitmap | 7,649 | 7,580 | -69 |
| Controller Visual | 1,996 | 1,917 | -79 |
| Sprite Metasprite | 3,711 | 3,295 | -416 |
| Gameplay State Update | 4,012 | 3,931 | -81 |
| Tile Animation | 2,090 | 1,959 | -131 |
| **Total** | **20,877** | **20,022** | **-855** |

Runtime evidence passes for all six complete 16 KB ROMs: pixel-exact Warrior output, injected
controller states, sprite attributes and layers, deterministic state checksum, and both complete
tile-animation frames. The tile test allows only position-correct old/new bytes while BIOS VRAM
writes cross a video-frame boundary; both the previously accepted and current ROM exhibit these
valid transient updates.

The public evidence ZIP contains each source, complete loadable ROM, occupied-size measurement and
SHA-256 hash. The comparison page, Markdown report, chart and PDF are generated from the same
48-row occupied-size table.
