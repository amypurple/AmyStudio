# Amy Z80 Optimizer Profile and MDL Audit - 2026-08-05

## Purpose

This audit documents the current optimizer profiles without promoting any rule into `Balanced`. Its goal is to preserve a stable default while keeping `Aggressive` and `Experimental` useful under names that accurately communicate their risk.

A successful assembly proves structural validity only. It does not prove gameplay, timing, flag, stack, NMI, indirect-call, inline-ASM, or VDP equivalence.

## Inputs

Profile corpus command:

```text
node tools/check-examples.mjs --assemble --optimization <profile> --audit-json build/audits/<profile>-alexis.json
```

Artifacts:

- `build/audits/balanced-alexis.json`
- `build/audits/aggressive-alexis.json`
- `build/audits/experimental-alexis.json`
- `build/mdl-audit-balanced-retry/mdl-audit-report.json`
- `build/mdl-audit-balanced-retry/mdl-audit-report.md`

The MDL run covers a 41-example target set, with 40 successful MDL assemblies and one MDL failure (`space-trainer`). The profile comparison covers all 177 current examples. These are separate snapshots and should not be mixed row-for-row without checking source revisions.

## Whole-corpus profile comparison

| Profile | Passed | Failed | Total ROM bytes | Delta from Balanced | Examples changed from previous profile |
| --- | ---: | ---: | ---: | ---: | ---: |
| Balanced | 177 | 0 | 736,062 | 0 | n/a |
| Aggressive | 177 | 0 | 735,346 | -716 | 116 |
| Experimental | 177 | 0 | 719,401 | -16,661 | 131 vs Aggressive |

## Balanced

`Balanced` remains the recommended default. It enables guarded local peepholes, branch shortening, local value reuse, dead flag-producer removal, proven `LDIR`/`LDDR` `BC=0` reuse, and carry-proven arithmetic folds. It deliberately excludes whole-program dead-code removal, routine inlining, IX-frame stripping, RST header reuse, and speculative/hazardous value tracking.

The present audit gives no reason to destabilize this profile merely to absorb gains observed in riskier profiles.

## Balanced versus MDL

Aggregate results for the 40 successful MDL targets:

| Output | Total bytes | Saved from raw |
| --- | ---: | ---: |
| Raw built-in assembly | 408,778 | 0 |
| Amy Balanced | 404,466 | 4,312 |
| MDL optimized | 406,636 | 2,142 |

Amy `Balanced` is 2,170 bytes smaller than MDL in aggregate. Amy is smaller on 36 targets; MDL is smaller on 4; none are equal.

This does not establish Amy as semantically safer than MDL, and MDL remains valuable as an optimization oracle. It does establish that an MDL size win is not an instruction to copy a rule into `Balanced`. Every candidate still requires local register, flag, memory, control-flow, NMI, and I/O proof.

The MDL failure on `space-trainer` is an oracle/tooling failure, not an Amy compilation failure.

## Aggressive

Additional mechanisms over `Balanced`:

- speculative register/value reuse;
- guarded `LD A,0` to `XOR A`;
- BIOS `CALL` to cartridge-header `RST` reuse.

Observed activation:

- 116 of 177 ROMs changed;
- 716 bytes saved in aggregate;
- `LD A,0` to `XOR A` activated in one example;
- RST-vector reuse activated in zero examples;
- nearly all current gains therefore originate from speculative value reuse and its branch-layout cascades.

Largest changes include `reversi-v5` (-55), `reversi-v4` (-50), `chateau-du-dragon` (-44), `dragon-castle` (-44), `dacman` (-40), `dacman-startup-diag` (-40), `reversi-v3` (-40), `reversi-v2` (-38), `amy-fixed32-selftest` (-24), and `explosion` (-18).

### Safety interpretation

The gains are modest, but the affected surface is broad. The most concerning rules infer register values by scanning nearby text rather than using a complete control-flow graph. In particular, the `LD H,0` to `LD H,D` fold must reject labels, joins, calls, branches, `EXX`, and opaque ASM boundaries. Until adversarial tests prove all such barriers, `Aggressive` must remain opt-in and runtime-tested.

RST reuse is dormant in this corpus but remains structurally sensitive because it rewrites cartridge-header vectors. It requires dedicated header, BIOS-call, debugger-map, and inline-ASM tests before broader use.

## Experimental

Additional mechanisms over `Aggressive`:

- hazardous memory/register rewrites;
- whole-program dead-code elimination;
- single-call routine inlining;
- unused IX-frame stripping;
- stack-pointer rewrites explicitly unsuitable when NMI stack activity can reach an unreserved local-frame window.

Observed activation:

- 131 of 177 ROMs changed relative to `Aggressive`;
- 15,945 additional bytes removed;
- 95 examples had global dead-code removal;
- 7,298 tokens/instructions were reported removed as dead;
- 19 routines were inlined across 19 examples;
- 49 examples received additional peephole activity;
- IX-frame stripping did not activate in the current corpus.

Largest changes versus `Aggressive`:

| Example | Aggressive | Experimental | Delta |
| --- | ---: | ---: | ---: |
| dacman-startup-diag | 18,839 | 11,254 | -7,585 |
| dacman | 18,258 | 11,809 | -6,449 |
| easter-bunny-v2 | 5,499 | 5,204 | -295 |
| easter-bunny | 5,384 | 5,162 | -222 |
| amy-surface-coverage | 2,860 | 2,699 | -161 |
| cvbasic-test3-port | 1,676 | 1,584 | -92 |
| reversi-v5 | 9,953 | 9,879 | -74 |
| insertion-sort-bars | 1,153 | 1,095 | -58 |
| amy-i16-divide-lab | 2,195 | 2,138 | -57 |
| amy-modulo-lab | 2,118 | 2,071 | -47 |

The DacMan reductions are a warning, not a success metric. Those projects contain ASM, data, indirect reachability, and alternate entry patterns that textual/global reachability analysis may not understand. Removing roughly one third of the ROM without behavioral proof is grounds to presume false dead-code classification until demonstrated otherwise.

`Experimental` is therefore a research and diagnosis profile only. A ROM assembled under it must not be treated as release-ready without runtime equivalence tests, controller scripts, visual checkpoints, sound checks, NMI/IRQ tests, and relevant real-hardware validation.

## Policy decision

- `Safe`: conservative inspection and compatibility profile.
- `Balanced`: stable default and public release recommendation.
- `Aggressive`: opt-in size experiment requiring targeted runtime tests.
- `Experimental`: optimizer research only; semantic equivalence is not assumed.

No rule is promoted to `Balanced` as a consequence of this audit.

Future optimization work should prefer improving Amy code generation directly or adding narrowly proven local folds. MDL findings and higher-profile size reductions are evidence for investigation, not evidence of safety.