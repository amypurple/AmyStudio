# SDCC node-budget audit (2026-10-24)

## Verdict

SDCC's `--max-allocs-per-node` is a non-monotonic register-allocation search budget, not a
quality slider. Every selected build must be validated at runtime rather than accepted by size.

- SDCC 4.5 and 4.6 miscompile Gameplay State Update at `3000` nodes. Stale `IY` reuse changes
  the expected checksum from 1,478 to 1,742.
- The defect remains in official SDCC 4.6.4 snapshot `#17075` (2026-10-23). A focused laboratory
  correction to `src/z80/ralloc2.cc:IYinst_ok()` repairs this reproducer, but is not an upstream
  or published toolchain change.
- All tested budgets from `500` through `500000`, except `3000`, pass the State runtime oracle.
  A separate `100`-node result also fails and is outside the validated range.
- `500000` minimizes the computation-heavy State fixture. `100000` is smaller and much faster
  for the simple devkitSMS Hello, Warrior, and Controller fixtures.

## Validated measurements

| Integration or sample | Published/reproduced reference | SDCC 4.6 / 100000 | SDCC 4.6 / 500000 |
|---|---:|---:|---:|
| devkitSMS Hello World | 1,401 | 1,386 | 1,390 |
| devkitSMS Warrior bitmap | 4,680 | 4,665 | 4,669 |
| devkitSMS Controller Visual | 1,403 | 1,388 | 1,392 |
| devkitSMS Gameplay State Update | 2,099 | 2,062 | 2,023 |
| PVColLib State reconstruction | 1,278 at SDCC 4.5 / 20000 | 1,238 | 1,195 |
| PkK/libcv State Update | 1,291 at SDCC 4.5 / 25000 | 1,257 | 1,214 |

The three visual devkitSMS fixtures match the published framebuffer, complete 16 KiB VRAM, and
VDP-register state. Controller also matches neutral, keypad, fire, and four direction inputs.
Gameplay State Update runs for 180 NTSC frames and must finish with world state 1, 13 collisions,
score 425, and checksum 1,478.

## Publication rule

Search a small documented budget set per program, retain compile-effort measurements, and execute
the relevant runtime oracle for every candidate. Do not infer that a larger budget is better.

The ranked comparison remains on its fully reproducible six-ROM settings until all replacement
ROMs and required headers are archived. Exact historical PVColLib provenance also remains unresolved:
the current source with SDCC 4.5 / 20000 gives 1,278 bytes, while its bundled SDCC 3.8 gives 1,301;
neither reproduces the previously published 1,308-byte State result.
