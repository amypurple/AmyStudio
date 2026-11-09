# Goodbye Charlie Toolbox Pilot Observation

Started: 2026-11-08T16:23:49-05:00
Authoring agent: Russell (`01a1bd0b-8a60-7db2-bee9-d7543afdb74d`)
Observer: primary Codex agent

## Hypothesis

A fresh agent should be able to locate the original November 1983 COMPUTE!
article/listing, create a faithful ColecoVision adaptation, and produce runtime,
gameplay, visual, and provenance evidence by entering through the generated
cheatsheet and loading only focused skills. Repeated source archaeology is expected;
repeated Amy/compiler/toolbox discovery is a toolbox defect.

## Controlled protocol

- The authoring agent writes only under
  `experiments/toolbox-pilot-goodbye-charlie/`.
- It starts from `docs/agent-kit/CHEATSHEET.md` and loads skills on demand.
- It records obstacles and successful shortcuts in its own `friction-log.md`.
- It may not modify the toolbox, compiler, skills, or cheatsheet.
- The observer does not solve the game or historical-source task in parallel.

## Measures

| Measure | Interpretation |
|---|---|
| Time to source identification | Historical research cost, not necessarily toolbox cost |
| Time to first compiling ROM | Discoverability of scaffold, syntax, and build path |
| Failed commands or stale advice | Toolbox correctness and platform fit |
| Extra full-manual/corpus reads | Progressive-context routing failure |
| Repeated compiler attempts | Missing diagnostics, recipes, or validation |
| Manual checks duplicated by tools | Automation opportunity |
| Bot/metric quality | Whether gameplay claims are machine-enforced |
| Visual/human-review separation | Evidence integrity |
| Final author-check state | Aggregate workflow correctness |

## Friction classification

- **Source friction:** article/listing availability or ambiguity.
- **Game-design friction:** interpreting original rules or adapting controls.
- **Language friction:** Amy syntax, semantics, diagnostics, or missing feature.
- **Tool friction:** command discovery, path handling, schema, build, emulator, QA.
- **Evidence friction:** bot design, metrics, visual checkpoints, provenance.
- **Necessary work:** game-specific art, tuning, and faithful adaptation that a
  generic toolbox should not automate away.

## Acceptance criteria

The pilot is successful only if the project includes complete source, reproducible
ROM, original credits, documented liberties, playable controls, reachable ending,
bot metrics with enforced expectations, CRT/runtime visual evidence, and an author
report whose warnings/skips remain visible. A compile-only result is insufficient.

## Observations

Completed: 2026-11-08T16:36:20-05:00 (about 12.5 minutes).

The pilot succeeded. It produced a faithful 3,806-byte Balanced ROM, complete
source and provenance, a real-OS7 gameplay bot, enforced metrics, screenshots,
human visual approval, and runtime passes at Off, Safe, Balanced, Aggressive, and
Experimental. The bot checked instructions, five difficulties, lightning and
darkness, the paid-look penalty, scoring, collision/loss, replay, a legal route,
victory, and the published final-score formula.

## Measured friction

| Class | Finding | Severity | Toolbox verdict |
|---|---|---:|---|
| Source | Scanned issue OCR mixed columns, advertisements, and three listings. | medium | Necessary research, but a provenance worksheet reduces repetition. |
| Tool | The output option was silently ignored; the scaffold was created at repository root. | medium | Defect: reject unknown options and accept a clear destination alias. |
| Tool | Nested child processes are blocked in the agent sandbox. | medium | Environment constraint: wrappers must expose direct fallback commands. |
| Tool | Editor documentation used conceptual field names rather than the validator's exact schema. | medium | Defect: ship a validator-compatible JSON example. |
| Evidence | No bot/metrics/expectations skeleton was generated. | high | Largest avoidable detour; scaffold the required files. |
| Evidence | PNG capture required reading implementation details. | medium | A public bot harness remains a useful next improvement. |
| Language/docs | Amy routine calls and the cartridge year contract required diagnostic-led discovery. | low | Add exact examples to the compact authoring path. |
| Menu/docs | Menu selection retained its previous destination value on return. | low | Document persistence and explicit reset. |
| Visual | An all-white lightning frame passed nonblank/color-count checks. | high | Add dominant-color/uniform-frame detection; retain human review. |
| Audio | Gameplay continued after malformed hand-written sound bytes, but playback crashed for a human tester. | critical | Require real-OS7 sound-area start, bounds, and termination assertions. |
| Product flow | The first adaptation lacked the expected START, HOW TO, CREDITS structure and title cue. | medium | Make the three-path title flow the publishable-game default and test every return path. |

## Corrections applied after the controlled run

- The project generator now rejects unknown options, accepts either destination
  spelling, and scaffolds research notes, an explicit failing bot placeholder,
  metrics, and enforced expectations.
- The editors skill now contains an exact validator-compatible charset object.
- The menu skill documents persistent selection state.
- Visual proof now reports excessive dominant-color coverage with configurable
  thresholds and policy.
- The audio skill now forbids invented OS7 command streams and requires bots to
  prove that triggered sound areas return to the inactive state.
- Targeted tests cover the new CLI and visual behavior.

## Scientific conclusion

The compact routing model was sufficient: the agent did not need the 500-game
corpus and completed a validated historical adaptation quickly. Most game-specific
time was legitimate source interpretation and bot design. The experiment exposed
four reusable toolbox defects rather than an Amy compiler failure. The remaining
high-value improvement is a public gameplay-bot harness plus a single command that
builds and runs that bot across selected optimization profiles.
