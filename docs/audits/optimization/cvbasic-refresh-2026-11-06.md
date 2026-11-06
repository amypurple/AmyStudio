# CVBasic upstream refresh - 2026-11-06

CVBasic `main` commit `e84bf978539c0cd73d575146302e490a15b70f48` was rebuilt from the
locally available upstream source. All six complete ColecoVision ROMs pass their relevant boot,
framebuffer, controller, sprite, deterministic-state and tile-animation checks.

| Sample | Previous `e99aede0` | Current `e84bf978` | Change |
|---|---:|---:|---:|
| Hello World | 1,466 | 816 | -650 |
| Warrior bitmap | 4,948 | 4,313 | -635 |
| Controller Visual | 1,695 | 1,086 | -609 |
| Sprite Metasprite | 1,845 | 1,261 | -584 |
| Gameplay State Update | 2,453 | 1,890 | -563 |
| Tile Animation | 2,982 | 2,332 | -650 |
| **Total** | **15,389** | **11,698** | **-3,691** |

The new total moves CVBasic ahead of devkitSMS in the size-ordered comparison. The public evidence
ZIP contains the six source files, complete 8 KB ROMs, occupied-size measurements and SHA-256
hashes. CVBasic uses its native Pletter path for the pixel-exact Warrior bitmap.
