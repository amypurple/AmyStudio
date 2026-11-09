# Moonseed Keeper blind toolbox observation

Started: 2026-11-08
Authoring agent: Carver (`01a1bd60-a480-7463-9462-6f75478baf84`)
Observer: primary Codex agent

## Purpose

Test whether the revised toolbox transmits publication requirements that the
first blind pilot missed, without naming those requirements in the prompt.

## Blinding

The agent receives only the game concept and the compact toolbox entry points.
The prompt does not mention title structure, music playback mode, OS7 sound-area
lifecycle, menu return behavior, editors schema details, or emulator bot timing.
It may inspect only focused skills and their named canonical examples.

## Pass criteria

1. The generated project contract remains present and valid.
2. START, HOW TO, and CREDITS are reachable and return correctly.
3. Audio policy is satisfied, including one-shot title playback when applicable.
4. Every triggered OS7 sound area is proven to terminate.
5. A real-OS7 bot proves both the reachable win and three-miss failure path.
6. Bot expectations make missing navigation, gameplay, or audio evidence fail.
7. Editable assets use validator-compatible metadata without guessed fields.
8. Visual evidence is CRT-safe and remains explicitly subject to human review.
9. Focused game checks complete without an unnecessary full-corpus audit.
10. The friction log records any rule the agent still had to rediscover.

## Observer rule

Do not modify the agent's project or give corrective hints before its final
report. Judge the produced evidence as-is, then improve the toolbox rather than
finishing the game on the agent's behalf.

## Results

The agent produced a 3,025-byte ROM, complete source, editor metadata, title
navigation, a real-OS7 bot, and screenshots for gameplay, victory, and failure.
The bot independently passes and proves its deterministic paths.

The experiment does **not** establish toolbox readiness for promotion:

- the agent selected `titleMusic: documented-omission` and removed audio entirely,
  bypassing the exact title-music and OS7 lifecycle behavior under test;
- bot expectations contain no audio lifecycle metrics;
- gameplay is a fixed left-center-right seed sequence with no variation;
- plots and blooms are represented mostly by text, with no moonlit garden scene or
  bloom animation, so the claimed human visual approval is too permissive;
- the bot proves one scripted solution and one scripted failure, but not timing,
  replayability, strategy variation, or human play quality;
- the author's project-proof claim could not be reproduced in the observer sandbox
  because the child process was blocked with `EPERM`; that is a visible SKIP, not a
  machine-independent PASS.

Verdict: technically valid prototype and useful negative test, but not a successful
demonstration of the revised audio toolbox or of publishable game quality. The
publication contract needs a stricter distinction between a justified product
omission and avoiding a required capability test. Visual review also needs declared
quality criteria beyond nonblank and CRT-safe output.

## Polish comparison: Flynn's Gold

Moonseed Keeper is intentionally smaller, so ROM size is not a quality target.
Nevertheless, the gap is structural rather than merely quantitative:

- Moonseed Keeper uses two 8x8 sprite patterns, text brackets for plots, a fixed
  three-lane sequence, and no audio.
- Flynn's Gold builds a complete cave and mine from custom compressed tiles, uses
  layered animated sprites, multiple moving hazards, level-dependent pacing, HUD
  state, result pages, and a multi-stream title arrangement plus effects.
- Flynn's Gold teaches its mechanics through three illustrated HOW TO pages; the
  Moonseed instructions are text only.
- Flynn's title and gameplay share a coherent visual identity, while Moonseed still
  resembles the generic scaffold with a different name and minimal sprites.
- Flynn's evidence derives timing and collision behavior from the original machine
  code and running C64 game. Moonseed's bot validates only its own deterministic
  implementation.

The toolbox therefore transmits correctness scaffolding better than production
values. A future blind test must require an audiovisual identity, animated state
change, gameplay variation, and a human-quality rubric without prescribing one
specific game's artwork.
