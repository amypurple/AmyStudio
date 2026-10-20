# Six-sample size investigation (2026-10-20)

The apparent increase from 7,483 to 7,642 bytes was an optimization-profile
mismatch, not a compiler regression. The published comparison used
Experimental while the general audit used the default Balanced profile.

The record-array `for each` IX iterator has now passed the complete language
matrix and is promoted to Balanced and Aggressive. It keeps a proven eligible
record address in `IX`; calls, parameters, recursion, nested aliases, local
records and inline ASM retain the conservative RAM/HL path.

| Sample | Old Balanced | Promoted Balanced | Experimental |
|---|---:|---:|---:|
| Hello World | 227 | 227 | 227 |
| Warrior bitmap | 3,215 | 3,215 | 3,214 |
| Controller Visual | 596 | 596 | 594 |
| Sprite Metasprite | 984 | 984 | 976 |
| Gameplay State Update | 1,299 | 1,159 | 1,156 |
| Tile Animation | 1,321 | 1,321 | 1,316 |
| **Total** | **7,642** | **7,502** | **7,483** |

Gameplay State Update also falls from 5,093 average measured cycles on the
conservative Safe path to 3,189 cycles in Balanced, while preserving
`worldMode=1`, `collisions=13`, `score=425`, and `checksum=1478`.

Validation includes five-profile record iteration and state-update runtime
oracles, the complete language matrix, Amy Chess runtime oracles, and all 258
browser examples (257 assembled ROMs plus one delegated MegaCart project).
