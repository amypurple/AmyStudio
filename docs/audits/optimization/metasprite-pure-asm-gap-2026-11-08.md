# Metasprite benchmark equivalence audit (2026-11-08)

## Verdict

The former size ranking was not behaviorally fair. The fixtures and the oracle
allowed several incompatible implementations to pass:

- Pure ASM had no controller movement and wrote animation state into ROM.
- Amy alone drew extra text and a backdrop and issued six adjacent pattern copies.
- z88dk rendered the actor one pixel higher.
- ugBASIC could execute its update loop several times during one VBlank, producing
  torn three-layer frames and non-equivalent animation timing.
- PVColLib alternated the whole actor with a blank SAT through its shadow/NMI path.
- the oracle checked only a static sprite snapshot.

The repaired contract is one animated, controller-driven, three-color metasprite,
with exact X/Y bounds and coherent layers. The oracle now checks patterns, colors,
animation, RIGHT movement, all four bounds, and the active SAT over time.

## Locally rebuilt and proven results

| Tool | Occupied bytes | Runtime verdict | Provenance |
| --- | ---: | --- | --- |
| Pure ASM | 482 | PASS | Amy assembler, optimizer off; diagnostic baseline |
| Amy Studio | 797 | PASS | Experimental |
| NewColeco | 1,166 | PASS | bundled SDCC build |
| PVColLib | 1,201 | PASS | bundled SDCC build |
| devkitSMS | 1,652 | PASS | bundled SDCC build |
| CVBasic | 1,845 | PASS | bundled 0.9.2; not the ranked `e84bf978` revision |
| z88dk | 2,492 | PASS | zsdcc size profile |
| ugBASIC | 6,166 | PASS | bundled legacy compiler; not the ranked modern revision |

The ranked CVBasic `e84bf978` ROM (1,261 occupied bytes) also passes the stronger
oracle with the repaired source contract. It remains the valid published CVBasic
measurement.

The previously ranked modern ugBASIC ROM does **not** pass the stronger oracle: a
captured SAT contains only two coherent active layers because its old `WAIT VBL`
loop can update the sprite slots more than once per field. The corrected ugBASIC
source passes when built with the bundled compiler, but the archived modern
compiler currently crashes while compiling the image assets. A modern ugBASIC size
must therefore remain unranked until that exact revision can rebuild the corrected
source.

## Amy/Pure ASM gap

The equivalent-behavior gap is 315 bytes, not the former 596-byte claim. Amy's
sample fell from 939 to 797 bytes by removing unique presentation work and merging
the six contiguous pattern uploads into one 192-byte transfer. Pure ASM grew from
343 to 482 bytes after adding real RAM state, controller polling, movement, bounds,
frame synchronization, and working animation.

The remaining gap is primarily Amy's reusable NMI, controller, frame, sprite-shadow,
screen and safe-upload runtime versus a one-purpose assembly implementation. It is
not evidence that Amy's metasprite data representation alone costs 315 bytes.

## Evidence

- Builder: `tools/build-sprite-metasprite-benchmarks.ps1`
- Runtime oracle: `tools/test-sprite-metasprite-benchmark.mjs`
- Pure ASM builder: `tools/test-pure-asm-metasprite.mjs`
- Measured local table: `competition/benchmarks/sprite-metasprite/results.csv`

Do not refresh the public aggregate table from the local CVBasic or ugBASIC rows.
The builder labels those cached revisions explicitly so their runtime proof cannot
be mistaken for the currently ranked upstream revisions.
