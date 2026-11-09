# Amy Studio Agent Cheatsheet

Generated from `docs/agent-kit/manifest.json` by `tools/generate-agent-cheatsheet.mjs`.
Do not hand-edit this file or preserve compiler workarounds here.

## I want to...

| Goal | Command or source of truth |
|---|---|
| check the authoring environment | `node tools/amy-author-doctor.mjs` |
| start a safe Amy project at an exact path | `node tools/amy-author-new.mjs my-game --title "My Game" --output <new-folder>` |
| inspect a project and select QA | `node tools/amy-author-check.mjs --project <source-or-folder>` |
| execute the selected bounded checks | add `--execute` to the author-check command |
| rebuild without trusting a stale ROM | `node tools/amy-author-build.mjs <source-or-folder>` (`--project` is also accepted) |
| prove source, ROM size, RAM and output identity | `node tools/amy-author-project-proof.mjs <source-or-folder>` |
| validate gameplay metrics | `node tools/amy-author-metrics.mjs --report metrics.json --expectations expectations.json` |
| enforce production polish evidence | `node tools/amy-author-quality-check.mjs <source-or-folder>` |
| generate runtime visual evidence | `node tools/amy-author-visual-proof.mjs --rom <game.rom> --config <visual.json> --output <folder>` |
| package a reviewed release | `node tools/amy-author-deliver.mjs --project <source-or-folder> --evidence <author-check.json> --visual-approved` |
| audit parity with the external toolbox | `node tools/audit-agent-toolbox-equivalence.mjs` |
| work on tiny sound | Read `docs/agent-kit/skills/tiny-sound.md`, then use its named checks. |
| work on graphics crt zx0 | Read `docs/agent-kit/skills/graphics-crt-zx0.md`, then use its named checks. |
| work on main loop input | Read `docs/agent-kit/skills/main-loop-input.md`, then use its named checks. |
| work on gearcoleco bot harness | Read `docs/agent-kit/skills/gearcoleco-bot-harness.md`, then use its named checks. |
| work on sprites animation | Read `docs/agent-kit/skills/sprites-animation.md`, then use its named checks. |
| work on menu crt flow | Read `docs/agent-kit/skills/menu-crt-flow.md`, then use its named checks. |
| work on editors assets | Read `docs/agent-kit/skills/editors-assets.md`, then use its named checks. |
| work on bcd high scores | Read `docs/agent-kit/skills/bcd-high-scores.md`, then use its named checks. |
| work on multifile projects | Read `docs/agent-kit/skills/multifile-projects.md`, then use its named checks. |
| work on production polish | Read `docs/agent-kit/skills/production-polish.md`, then use its named checks. |

## Evidence rules

- A successful compile is not runtime proof.
- A generated screenshot is not human visual approval.
- A metric outside a declared threshold is `WARN` or `FAIL`, never `PASS`.
- A missing dependency is `SKIP`, never successful evidence.
- Use the real OS7 BIOS for final BIOS, sound, VDP, controller, and ABI proof.
- A publishable game defaults to START / HOW TO / CREDITS. If it uses audio, require a one-shot title cue and real-OS7 proof that every triggered sound area terminates.
- Use named GearColeco memory areas and a complete screen signature; never rely on numeric area IDs or an early OS7-logo frame.
- Use project-focused checks for an isolated game. Full-corpus compilation is reserved for compiler, runtime, optimizer, or toolbox promotion.
- Use the explicit `promotion` profile before clean-repository publication.
