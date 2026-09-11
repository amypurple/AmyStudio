# Amy display-cost isolation

These fixtures separate the ROM and execution costs of text output, coordinate setup, decimal conversion, and a small HUD update. Each measured operation runs after text-mode initialization with NMI disabled, between unique entry and exit markers.

The numeric cases cover `u8`, `u16`, `i16`, BCD, and signed 8.8 fixed-point output. The test also verifies that each case links only the formatting helpers it needs.

`node tools/test-display-cost-benchmark.mjs` compiles every fixture under all five optimization profiles, checks the expected Name Table bytes in GearColeco, measures master-clock cycles between the markers, and writes `display-cost-results.csv` and `display-cost-results.json`.

The baseline contains both markers but no display operation. Reported deltas subtract its occupied ROM bytes and measured marker overhead for the same profile.

## Experimental profile results

| Operation | ROM delta | Master-clock cycles |
|---|---:|---:|
| Literal `SCORE` | 23 | 457 |
| Literal `"A"` | 19 | 301 |
| `put char` constant | 42 | 412 |
| `put char` variable coordinates | 66 | 439 |
| `put char` variable value | 61 | 418 |
| `put char` value expression | 63 | 426 |
| `put char` qualified value | 61 | 418 |
| `put char` expressions | 80 | 463 |
| `put char` qualified operands | 76 | 445 |
| Literal with variable coordinates | 50 | 680 |
| `u8` value | 109 | 884 |
| `u8 digits 1` (`255` -> `5`) | 89 | 906 |
| `u8 digits 2` (`255` -> `55`) | 101 | 926 |
| `u8 expression`, digits 2 | 107 | 950 |
| Qualified `u8`, digits 1 | 89 | 579 |
| `fixed` value | 191 | 1,539 |
| `u16` value | 110 | 1,476 |
| `i16` value | 134 | 1,441 |
| `u16` widths 1 through 5 | 190 | 8,557 |
| `i16` widths 2 through 6 | 246 | 9,346 |
| Qualified/expression `i16`, digits 3 | 188 | 2,803 |
| Four-digit BCD | 113 | 1,776 |
| Two-value HUD update | 225 | 2,192 |

Splitting `AMY_U8_TO_ASCII2` from the three-digit formatter saves 22 ROM bytes in every build that prints `u8` values without also printing fixed-point values. The measured `u8` execution time is unchanged.

Removing the stale `AMY_GET_VRAM` dependency from `AMY_PUT_CHAR_AT` saves 9 ROM bytes wherever `put char` is used, without changing execution time. Constants, variables, expressions, and overlay/record-qualified operands all use the same verified path. A one-character literal string is 23 bytes smaller than `put char`, but takes 111 fewer master-clock cycles only because the BIOS string writer has a specialized one-character path; repeated character updates still favor `put char` over rebuilding strings.

One- and two-digit `u8` output now selects modulo-10 and modulo-100 formatters when they are the only widths needed. If a program mixes both widths or also prints three digits, finalization reuses the single three-digit formatter instead of linking duplicate helpers. Decimal boundary tests cover 0, 9, 10, 99, 100, and 255. Across the 222-example corpus, 22 programs shrink, none grow: 193 bytes total in Off/Safe and 212 bytes in Balanced/Aggressive/Experimental. Train Track Puzzle, Meteor Dodge, and Amy Bounce Edge Lab each save 20 bytes.

Signed 16-bit output with `digits 2` or `digits 3` now copies its one- or two-byte magnitude suffix directly instead of setting up `LDIR`. This saves 5 bytes per print site with unchanged formatting work. Tests cover `-32768`, all supported widths, expressions, and qualified record fields. The five-profile corpus remains 222/222; the one existing affected example saves 10 bytes in every profile and no ROM grows. Unsigned 16-bit short widths retain the full exact formatter: replacing it with repeated modulo subtraction would trade a small ROM gain for unacceptable worst-case latency at `65535`.
