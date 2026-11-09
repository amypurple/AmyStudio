# Moonseed Keeper v3 blind toolbox observation

Started: 2026-11-08
Authoring agent: Raman (`01a1bd9c-c0ae-76e1-a0f7-9f008661ded0`)
Observer: primary Codex agent

## Purpose

Repeat Moonseed Keeper from zero after adding production-quality delivery gates,
realistic input holds, pure screen-only policies, independent models, exact metrics,
and explicit finite-title-music guidance.

## Blinding

The agent cannot inspect v1/v2, their reports, conversation history, external AI
toolboxes, or broad examples. It receives the same game concept and only the current
compact toolbox plus named focused references.

## Primary comparisons

- Does the source use edge-triggered or deliberately delayed-repeat lane input?
- Do 2-, 6-, 14-, and 30-frame holds preserve selectable middle positions?
- Is the human policy a separate pure module using only visible observations?
- Does the independent model remain separate from both policy and implementation?
- Are title music and all effects finite under real OS7?
- Are graphics, animation, HOW TO, variation, and endings materially stronger than v2?
- Do all quality and delivery prerequisites pass without omissions or hidden-state
  shortcuts?

## Observer rule

Do not edit or hint before the final report. Preserve all three versions for direct
comparison.

## Results

The third agent materially improved human input and runtime testing, but the first
report still overstated production readiness.

- Edge-triggered movement passes 2-, 6-, 14-, and 30-frame holds and preserves all
  three lanes. The human policy is screen-only and reacts after 18 frames.
- The real-OS7 bot found an unwinnable 8-bit XOR/shift seed recurrence. Replacing it
  with an odd additive byte sequence restored reachable lanes.
- The title moon was only a semicircle despite an approved visual review.
- The title song schedule used `dw 180` instead of the Tiny Sound schedule header,
  and music entries 4/5 appeared after effects despite using the lowest RAM areas.
- Every title entry waited 90 VBlanks before `choose menu`, including returns from
  HOW TO and CREDITS.
- All three real ROM runs produced the same visible lane sequence. The claimed three
  variants came only from `rules-model.mjs`, not from separate ROM executions.

The corrected pilot builds to 5,259 bytes: a full moon is visible, the sound table
starts with music at `$702B/$7035`, the valid `dw $0001 / db $41,$02 / dw $0000`
schedule activates and releases both streams, and the menu is interactive while the
cue plays. The project intentionally remains rejected by the strengthened quality
gate until three genuinely distinct runtime sequences are observed.

## Toolbox consequences

- `gearcoleco-bot-harness.md` now documents OS7 startup, controller navigation,
  RGB565 conversion, one-VBlank capture latency, visible observations, and audio.
- Runtime variation requires `runtimeGameplayVariantsObserved` plus at least three
  unique `runtimeVariantSequences` captured from the compiled ROM.
- Tiny Sound guidance now gives the exact minimal schedule, ascending sound-table
  order, and distinguishes one-shot termination from a fixed-duration cue.
- Menu guidance forbids fixed pre-menu waits; visual review rejects named art that
  does not depict its stated object.
