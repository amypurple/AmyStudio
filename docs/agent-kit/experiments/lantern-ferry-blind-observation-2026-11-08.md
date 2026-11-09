# Lantern Ferry blind toolbox observation

Started: 2026-11-08
Authoring agent: Franklin (`01a1bd42-8e41-7a70-80b3-2eb58da29bb7`)
Observer: primary Codex agent

## Purpose

Verify that the revised toolbox naturally leads a fresh agent to a publishable
ColecoVision game without restating recently discovered requirements in its task.

## Blinding

The authoring prompt names only the game concept and asks for a publishable result.
It does not mention:

- START / HOW TO / CREDITS;
- title music or `play song ... once`;
- OS7 sound-area lifecycle checks;
- dominant-color visual checks;
- menu-state reset behavior.

The agent may read only the generated cheatsheet and focused skills. It may not
inspect Goodbye Charlie, conversation history, Claude's toolbox, or the full corpus.

## Pass criteria

1. START, HOW TO, and CREDITS are all reachable and return correctly.
2. Credits identify the author and Amy Studio.
3. A title cue, if used, plays once and all triggered sound areas terminate.
4. A real-OS7 bot proves a reachable win and at least one failure path.
5. Metrics expectations make missing paths fail.
6. Screenshots are human-reviewed and automated visual warnings remain visible.
7. The ROM is rebuilt reproducibly from complete source.
8. The friction log distinguishes necessary game work from toolbox discovery.

## Observer rule

Do not modify the agent's project or toolbox until the agent reaches a final state.

## Results

The agent produced a working 3,230-byte Balanced ROM and independently implemented
START, HOW TO, CREDITS, a reachable win, and a failure path. It also produced source,
editable-asset metadata, bot metrics, visual evidence, and a friction log.

The test deliberately failed publication readiness in three useful ways:

- no title music was implemented;
- the bot did not prove OS7 sound-area termination;
- the win screen had no replay/title choice and the final broad validation was too slow.

Observed toolbox friction also included stale CLI examples, an undocumented exact
`sprite-patterns` schema, guessed menu-clause order, controller pulses that were too
short, a hard-coded GearColeco memory-area number, and an early OS7-logo frame being
mistaken for the cartridge title.

Verdict: the toolbox transmitted the general game structure, but audio publication
requirements were too deeply nested. They must be machine-readable publication gates,
not only prose in the Tiny Sound skill. The follow-up changes add that contract to the
project scaffold and author checker, correct the CLI/schema examples, and reserve full
corpus work for compiler/runtime/toolbox promotion rather than isolated games.
