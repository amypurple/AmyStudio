# Moonseed Keeper v2 blind toolbox observation

Started: 2026-11-08
Authoring agent: Dirac (`01a1bd77-5693-7c53-a2f1-37b2f2132704`)
Observer: primary Codex agent

## Purpose

Repeat the exact Moonseed Keeper concept from zero after adding the production
polish skill and executable quality gate. Preserve v1 as the negative control.

## Blinding

The agent cannot inspect the first Moonseed Keeper, previous pilots, conversation
history, external AI toolboxes, or the broad game corpus. It may use only the compact
toolbox, focused skills, their named canonical examples, and targeted language docs.

## Comparative criteria

1. A coherent moonlit-garden identity replaces scaffold-like text presentation.
2. Blooming and misses have visible animated feedback.
3. Gameplay presents meaningful variation rather than a fixed lane sequence.
4. HOW TO includes game artwork and explains goal, controls, ending, and a tip.
5. Original one-shot title music and event effects pass real-OS7 lifecycle checks.
6. A delayed, screen-informed bot succeeds while at least three cheap strategies fail.
7. Multiple deterministic scenarios, both endings, and title returns are proven.
8. Busy gameplay remains within its declared frame budget.
9. Visual review names strengths and defects considered rather than asserting PASS.
10. Project proof and production-quality checks pass without capability omissions.

## Observer rule

Do not edit the project or provide corrective hints before the final report. Compare
v2 against v1 and Flynn's Gold only after the agent stops.

## Results

The agent produced a 5,082-byte ROM with title music, event effects, authored
tiles/sprites, animated bloom feedback, varied deterministic sequences, illustrated
HOW TO, and real-OS7 evidence. This is materially better than v1. The bot completed
three delayed-player wins and defeated four cheap strategies while recording a
59,747-master-clock ceiling.

The experiment nevertheless exposed important toolbox defects:

- `play song ... once` was documented but absent from the scaffold, so the agent
  first built looping music and had to rediscover the finite form;
- scaffold expectations used `equals`, which the metrics evaluator silently ignored;
- the purported screen-only human policy read `PlayerLane` from user RAM to steer;
- gameplay decremented or incremented `PlayerLane` every frame while a direction
  remained held, making the center lane last only 1/60 second during an ordinary
  press; the bot's exact pulses hid this humanly impractical control;
- the title random sequence needed a vblank-driven clock to avoid identical starts;
- the frame ceiling included NTSC fractional alternation, but that common allowance
  was not supplied by the toolbox;
- the visual checker accepted a scene whose dominant backdrop covers 94.6% of the
  frame and whose presentation remains substantially below Flynn's Gold.

Verdict: successful evidence that the stronger toolbox changes agent behavior, but
not ready for clean-repository promotion. The metric evaluator now implements exact
`equals` checks; the scaffold names `play song ... once` directly; and production QA
now requires separate pure human-policy and independent rules-model modules. Under
the corrected gate, v2 fails because its human policy is embedded in the bot and
uses hidden RAM state.

After human play exposed the lane-skipping defect, the production contract was
extended again: projects declare an edge-triggered, delayed-repeat, or continuous
control model, and bots must test 2-, 6-, 14-, and 30-frame holds plus a minimum
decision window. A delayed bot with frame-perfect taps is no longer accepted as
human-playability evidence.
