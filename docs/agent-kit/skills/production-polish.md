# Production Polish and Human Play Quality

Compilation and scripted reachability are necessary, not sufficient. A publishable
game needs a coherent audiovisual identity and evidence that its rules remain fun
under imperfect human input. This skill distils the reusable practices demonstrated
by Flynn's Gold and Claude's reference-game toolbox without importing hundreds of
game projects or stale compiler workarounds.

## Minimum production contract

- Give title, HOW TO, gameplay, and ending a shared visual language. Replacing a
  scaffold title while leaving text brackets as the playfield is not polish.
- Use authored tiles and layered or animated sprites for important state changes.
  A goal such as blooming, breaking, collecting, or damage must visibly animate.
- Include an original one-shot title cue and event-specific effects. Music is quieter
  than effects; real OS7 evidence must show every triggered sound area terminating.
- HOW TO uses one to three concise pages covering goal, controls, scoring, ending,
  and one useful tip. At least one page illustrates mechanics with actual game art.
- Provide meaningful variation: randomized or authored situations that alter player
  decisions. A fixed three-event script is a tutorial, not replayable gameplay.
- Measure the busy loop. Sustained gameplay should complete one logical pass per
  video frame unless a documented scheduler deliberately spreads work.

## Bot contract

Write the rules model from the design or original source, not by translating the
game implementation. Then prove all of the following:

1. A human-paced bot reacts 12-25 frames late and uses only visible information.
2. At least three cheap strategies (idle, hold one direction, mash, repeat one move,
   or park safely) lose or score substantially below the human-paced bot.
3. A model-free oracle checks screen score/state, sprite bounds, and termination.
4. Gameplay variation is observed across at least three separate executions of the
   compiled ROM. Store the visible event sequence from each run in
   `runtimeVariantSequences` and require at least three unique sequences. Seeds or
   scenarios exercised only by the independent rules model do not count as ROM proof.
5. Title, every HOW TO page, credits, active play, victory, and failure/game-over
   appear in the visual contact sheet.
6. Direction holds of 2, 6, 14, and 30 frames produce the declared control behavior;
   no required lane or cursor position exists for only one frame.

Keep the human policy in a separate pure module. The emulator harness may translate
the framebuffer, NAME table, and sprite table into an observation, but the policy
must not read user RAM, compiler symbols, hidden object state, or future events.
Keep the independent rules model in another module so neither oracle is copied from
the Amy implementation.

Use `gearcoleco-bot-harness.md` for the real-OS7 startup, framebuffer conversion,
navigation, controller pulse, and screenshot timing conventions. Do not rediscover
those interfaces in every project.

## Visual review

Human review is a judgement, not a checkbox. Reject evidence when:

- most of the playfield is empty without intentional composition;
- gameplay objects are ASCII placeholders that should be graphics;
- title and gameplay appear to belong to different products;
- an important action has no visible anticipation, impact, or result;
- named art does not depict its stated object (for example, a moon tile renders as
  a semicircle) even though it is technically nonblank and centered;
- screenshots show only one deterministic arrangement;
- text is safe but cramped, unbalanced, or visually subordinate to unused space.

Document concrete observations in `visual-review.json`; `approved: true` without
strengths, defects considered, and named frames is not sufficient evidence.

## Focused references

- `docs/agent-kit/experiments/moonseed-keeper-blind-observation-2026-11-08.md`:
  negative example showing how technical checks can pass an unpolished prototype.
- `studio/examples-src/afterglow-garden.alexis`: compact original game identity.
- `studio/examples-src/great-canadian-mystery.alexis`: generated content and visual
  presentation at larger scale.
- `docs/agent-kit/skills/tiny-sound.md`: music and OS7 lifecycle proof.

## Proof

Run `tools/amy-author-quality-check.mjs <project>` before delivery. A substantial
game cannot use a documented omission to pass a capability test. Run the gameplay
bot and inspect its contact sheet yourself; the tool only proves that evidence exists
and that declared thresholds are enforced.
