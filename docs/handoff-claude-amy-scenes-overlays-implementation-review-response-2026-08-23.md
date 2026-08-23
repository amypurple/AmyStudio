# Response: Amy Scenes & RAM Overlays — implementation review

Date: 2026-08-23
Author: Claude (adversarial review, read-only — no source modified; probe-backed)
Re: `docs/handoff-claude-amy-scenes-overlays-implementation-review-2026-08-23.md`
Reviews: `docs/spec-amy-scenes-ram-overlays-2026-08-23.md`,
`studio/examples-src/amy-scenes-overlays-design.alexis`, and the two prior specs.

## Method / probes

The spec is well-built and adopts the prior recommendations (overlay-before-scene,
single dispatcher, escape analysis, scoped debug sidecar, `max(sizeof)` formula). I
stress-tested its load-bearing premises with `amyc`:

- **Record array fields are REJECTED today.** `u8 EnemyX[8]` inside a record →
  *"Invalid record field declaration"*. The field grammar is scalar-only:
  `simpleRecordFieldRe = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)$/` (`transpileAmyCore.js:1346`).
- **Nested record fields WORK:** `Point Player` inside `GameMemory` compiled (ROM 62).
- **Top-level record arrays WORK:** `Actor Flies[3]` compiled; layout is **byte-packed,
  no alignment padding** — `AMY_UVAR_Flies EQU $7020`, next global
  `AMY_UVAR_After EQU $7026` (3×2 = 6 bytes, stride 2).
- **Multiple `EQU` at one address assemble cleanly** (prior probe) and live in a
  name-keyed `constantTable` separate from `symbolTable` (`compilerCore.js:279`), so
  aliases coexist by construction.

The packing result confirms the RAM formula needs no alignment term. But the array-field
result is a blocker, below.

---

## Findings by severity

### H1 (blocking) — The spec's own overlay examples cannot be expressed: records have no array fields

**Evidence.** The flagship `GameMemory` in both the spec (§Phase A) and the design
example (`amy-scenes-overlays-design.alexis:19-25`) declare `u8 EnemyX[8]` /
`u8 EnemyY[8]`. The compiler rejects array fields in records (`transpileAmyCore.js:1346`,
probe). Nested-record and scalar fields work; **arrays do not**.

**Consequence.** The overlay is "record-backed" (§Phase A: "Records remain the single
layout engine"), but the structures worth overlaying — actor/enemy tables, per-level
arrays — are exactly what records can't hold. A scalar-only overlay bundles a handful of
bytes and saves almost nothing; the 19-byte `GameMemory` that motivates the whole
feature won't parse. Q9's "arrays/nested records in the RAM formula" is moot until the
fields exist.

**Correction.** Phase A has an **unstated hard prerequisite: array fields in records**
(scalar arrays at minimum; array-of-record ideally). Implement that first — it is
independently useful (the state-machine/actor and data-driven-init work want it too, per
the 2026-08-08 ergonomics response) — or explicitly narrow Phase A to scalar+nested
parts and rewrite every spec example, accepting a much smaller RAM saving. **Do not start
overlay codegen until records can express the parts.**

### H2 (silent hang / NMI) — `on enter` runs with VDP NMI disabled; a blocking wait inside it hangs

**Evidence.** Transition contract steps 1→6 disable VDP NMI (step 1), run the target's
enter routine (step 4), and re-enable NMI only at step 6. So `on enter` executes with no
VBlank interrupt. Amy already knows this class of bug: `pause … blank after N seconds`
*rejects* when NMI is provably off ("CRT-safe pause requires NMI enabled",
`vramPixelInputStatementHelpers.js:279`).

**Consequence.** An enter routine (or anything it calls) that blocks on VBlank —
`wait N frames`, `wait fire`, `pause until press`, `wait` — will **hang forever**: no NMI,
no frame counter advance, no timer tick. This is a silent deadlock, not a diagnostic.

**Correction.** Make it a compile error: no VBlank-blocking statement is reachable from a
scene `on enter` routine (reuse `nmiReachable`-style reachability from the enter root).
Alternatively the transition could enable NMI before enter, but that reopens the mid-swap
race the contract exists to prevent — so **reject blocking-in-enter** instead.

### H3 (escape) — The escape list omits ROM word/address tables and static-ABI ref paths

**Evidence.** §Required Compile Errors covers `ref`/address escape, opaque ASM, and
inline-ASM alias use. Q4 asks which forms escape. Two are missing:

- **ROM word/address tables.** A `data … word`/address-table entry that captures an
  overlay symbol (`dw AMY_SCENE_Game_PlayerX`, or `address of SceneRam.Game.PlayerX`
  via `addressHelpers.js`) bakes a scene-only address into ROM; dereferencing it while a
  different scene is active reads another scene's bytes. Overlay symbols must be barred
  from address/word tables.
- **Static-ABI `ref` parameters.** Passing a part field as a `ref` argument to a routine
  whose static cells or call path outlive the scene lets the address survive the
  transition. `ref`-to-overlay must be confined to routines proven scene-local.

**Consequence.** Both reintroduce exactly the cross-scene corruption overlays exist to
prevent, and neither is on the error list.

**Correction.** Add "overlay symbol used in a ROM word/address table" and "overlay `ref`
escaping a scene-local routine" to §Required Compile Errors; reuse the static-ABI escape
analysis for the latter.

### M1 — The debug exporter must walk `constantTable`, or aliases vanish silently

**Evidence.** Aliases are `EQU` constants in `constantTable` (`compilerCore.js:279`),
**not** in `symbolTable`. The spec (§Phase A) says "the symbol/debug exporter must retain
all of them" but the current `.sym`/sidecar path must be confirmed to emit constants, not
only labels.

**Consequence.** If the exporter emits only `symbolTable` labels, every overlay alias
disappears from the debugger and the scoped-watch contract fails **silently** — the
worst failure mode for this feature.

**Correction.** Gate 2 must assert the exporter round-trips: two distinct names, one
address, both present in the sidecar with correct `activeWhen`. Treat as must-verify
before any UI work.

### M2 — v1 should be qualified-access only (answers Q6)

**Evidence.** The design example already qualifies every access
(`SceneRam.Menu.Selection`, `amy-scenes-overlays-design.alexis:78`). Short names inside
scene routines would add name-resolution ambiguity (a short name shadowing a global, per
the prior response's scoping rules) and a second thing the debugger must disambiguate.

**Consequence.** Marginal ergonomic gain, real parser + debugger complexity.

**Correction.** v1 = **qualified access only**; revisit short names after the debugger
contract is proven. This also simplifies H3's escape checks (every overlay reference is
syntactically obvious).

### M3 — Scene IDs are stable lowering, but persisted `RequestedScene` values must map by name (Q2)

**Evidence.** `dispatch ActiveScene using Scenes` reuses the 1-based `on … goto/gosub`
table lowering (verified: `controlFlowHelpers.js:1174-1228`; selector `0` falls through
via `dec a`/`cp n`/`jp nc` = no-op — exactly the "0 = inactive" semantics the spec wants).
**No second control-flow system is needed — Q2 answer: yes, clean reuse.** But scene IDs
are positional (declaration order).

**Consequence.** `RequestedScene`/`ActiveScene` hold raw numeric IDs. If a scene is added
or reordered, a value written by NMI code (or restored from a save state / rom-test
`expectBytes`) now selects a different scene. The design file compares against
`Scenes.Menu` symbols (good), but the RAM byte is still a positional number.

**Correction.** Require symbolic comparison (`Scenes.Game`) everywhere in source (never a
raw literal), and document that `ActiveScene`/`RequestedScene` numeric values are
build-internal — rom-tests asserting them must use the `Scenes.*` symbol, not a hardcoded
integer.

### M4 — RAM report must count scene routines' static-ABI cells as Permanent (Q9)

**Evidence.** §Static ABI Interaction correctly keeps multi-scene static cells permanent.
But scene enter/frame routines are ordinary subs; if static-ABI-eligible they get
`AMY_LVAR_*`/`AMY_SPARM_*` cells (`spec-amy-static-frameless-abi`), which are **not** in
the overlay.

**Consequence.** If the RAM report tallies only declared globals + overlay, it undercounts
those static cells, and "Total physical RAM" is wrong (overflow check under-reports).

**Correction.** The RAM report's Permanent line must include static-ABI cells of all
routines, scene-bound included; only overlay part fields are the overlaid total.

### M5 — Poison-fill is fine but insufficient alone for the self-test (Q8)

**Evidence/Consequence.** A debug poison-fill (fixed pattern) is deterministic and cheap
on ≤tens of overlay bytes, and makes read-before-write **visible** in the
debugger/memory view. But poison alone does not *fail* a test automatically.

**Correction.** For the ROM self-test, pair poison-fill (visibility) with **explicit
sentinel bytes bracketing the overlay region** that the test asserts unchanged (catches
overrun) and explicit expected values after each `on enter` (catches missing init). Use
sentinels for the automated PASS/FAIL; poison for human/debugger diagnosis. This is what
Gate 6 already implies — make it explicit.

### L1 — Design-file notes (no action; file is a labeled sketch)

`amy-scenes-overlays-design.alexis` uses `memory "colecovision"` (vs the usual
`colecovision_legacy_sdcc`) and unimplemented `loop forever`/`end loop`,
`dispatch … using`, `Scenes.*`, `enter X`, `overlay`/`scene` — all expected, the file is
correctly marked non-executable and excluded from the catalog. No defect.

---

## Answers to the numbered questions

1. **Smallest safe primitive?** Yes — record-backed `overlay Group / Part as Record` is
   right, **but only once records hold arrays (H1).** As specified it can't express the
   parts it targets.
2. **Reuse typed state lowering?** Yes, cleanly (M3) — 1-based dispatch with `0`=inactive
   is the existing `on … goto` lowering; no second control-flow system.
3. **`active = 0` before init sufficient?** For the *dispatcher*, yes (and NMI is off
   anyway, so it's belt-and-suspenders). The real gap is not the flag — it's **blocking
   calls inside `on enter` while NMI is off (H2).**
4. **Escape forms?** `ref` params, address-of, inline/opaque ASM using aliases, **ROM
   word/address tables (H3)**, and **static-ABI ref paths (H3)**. The last two are missing
   from the spec.
5. **Metadata that must survive?** The `EQU` aliases already survive in `constantTable`;
   the exporter must **walk constantTable** (M1) and attach `(qualified name, address,
   activeWhen)`. Confirm before UI.
6. **Short names in v1?** No — **qualified only (M2).**
7. **Enter calling another scene's ordinary routines?** Safe **iff** those routines touch
   no other scene's part — which the required cross-scene-access error already enforces.
   A shared helper touching only permanent globals or the active part is fine.
8. **Poison-fill deterministic on 1 KB?** Yes, but **pair with sentinels for the
   self-test (M5).**
9. **RAM formula correct with alignment/nested/arrays/static cells?** Packing is
   byte-exact, **no alignment term** (probe). Nested records compose. Arrays don't exist
   yet (H1). Static-ABI cells must be counted as Permanent (M4).
10. **Missing tests:** see below.

## Missing tests (add before "safe")

- record **array field** parse + layout (the H1 prerequisite) — currently fails.
- VBlank-blocking statement reachable from `on enter` → compile error (H2).
- overlay symbol in a ROM word/address table → compile error; overlay `ref` escaping a
  scene-local routine → compile error (H3).
- debug exporter round-trip: two aliases, one address, both in sidecar with `activeWhen`
  (M1).
- `ActiveScene`/`RequestedScene` asserted via `Scenes.*` symbol, not raw integer;
  adding a scene does not silently repoint a stored value (M3).
- RAM report Permanent line includes scene routines' static-ABI cells (M4).
- transition that intentionally leaves the display off does **not** force `screen on`
  (spec §Transition point 6 — test it).
- during `ActiveScene = 0`, a scoped watch shows `inactive` and a mainline `dispatch` is a
  no-op.

## Revised implementation order

0. **Prerequisite:** array fields in records (scalar arrays; confirm array-of-record).
   Ships independent value; unblocks Phase A.
1. Overlay parser/layout + `max(sizeof)` + RAM report (incl. static-ABI cells as
   Permanent). Gate 1/3.
2. Escape/lifetime rejections incl. H3 additions; qualified-only access (M2). Gate 4.
3. Debug sidecar walking `constantTable` + active-scene watches/breakpoints (M1). Gate
   2/5 — **feature is not usable before this passes.**
4. Scene lifecycle over the single dispatcher; `on enter` blocking-guard (H2); deferred
   NMI transition. Gate 6.
5. Optimizer/label parity; full example compile. Gate 7/8.

## Go / no-go for Phase A

**Conditional NO-GO as written; GO after the array-field prerequisite (H1) and the H2/H3
error additions.** The overlay design is sound and the spec is unusually careful — but its
own examples don't compile because records can't hold arrays, and two silent-corruption
paths (blocking-in-enter, table/ref escape) are not yet errors. Land array fields in
records first, add H2/H3 to the compile-error set, keep v1 qualified-only, and make the
`constantTable`-aware debug exporter part of Phase A's definition of done. With those, Phase
A is safe to build.

---

*Read-only. No implementation or primary document modified. Probes run with `amyc` on the
current tree (2026-08-23); line numbers drift — re-verify before implementing.*
