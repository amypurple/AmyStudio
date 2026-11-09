# Amy Studio Agent Toolbox Readiness Report

Date: 2026-11-08

## Verdict

The experimental Alexis-Z80 toolbox, skills, and generated cheatsheet are ready for
continued agent-assisted game-production pilots, but not clean-repository promotion.
After two blind pilots exposed human-control and production-quality gaps, the expanded
equivalence audit reports **26 READY, 3 PARTIAL, 0 MISSING**. Art generation with
preview, one-command music/effect generation, and unified original-system tracing
remain partial.

## Author-facing workflow

```powershell
node tools/amy-author-doctor.mjs
node tools/amy-author-new.mjs my-game --title "My Game"
node tools/amy-author-build.mjs my-game
node tools/amy-author-check.mjs --project my-game --execute
```

`docs/agent-kit/CHEATSHEET.md` is generated from the current manifest and is the
compact front door for smaller models. It is tested against the manifest so stale
commands or retired compiler workarounds cannot silently remain there.

## Skills ready

1. Tiny Sound and OS7 sound integration.
2. Graphics II, CRT safe area, bitmap equivalence, and ZX0.
3. Main loop, NMI timing, controller expressions, and pauses.
4. Sprites, metasprites, animation, active counts, and flicker.
5. Menus, controller-friendly navigation, release handling, and CRT sleep.
6. Editable graphics assets and `editors.json` ownership.
7. BCD scores, formatting, high-score policy, and initials.
8. Multi-file projects, `@project/...`, ADAM targets, and publication.
9. Production polish, human hold timing, independent models, screen-only delayed
   policies, strategy resistance, variation, frame budgets, and audio lifecycle.

Each skill names a small canonical progression and executable focused tests rather
than loading the 500-plus example corpus.

## Executed evidence

- Generated-project test: 1,289-byte Balanced cartridge, 1 byte RAM, no compiler
  diagnostics, byte-identical rebuild.
- Complete author check: doctor, manifest, project proof, static CRT safe area,
  author metadata, editor schema, and GearColeco visual checkpoint.
- Five-profile runtime/codegen tests passed for combined joypads, NMI/VDP guards,
  sprite-count initialization, sprite flicker, arbitrary-position menus, and BCD
  boundaries/printing.
- Visual proof detects edge activity, transient pixels, visible page writes, and
  one-frame sprite disappearance, while keeping human approval separate.
- Bot metrics enforce numeric bounds; missing or out-of-range values cannot pass.

The scaffold intentionally reports `WARN` until `REPLACE WITH AUTHOR` is replaced.
This proves warnings propagate through the aggregate report instead of becoming a
false pass.

## Deliberate boundaries

- The scaffold remains small, but publishable games now require explicit production
  evidence. Non-game projects retain capability-selected lighter checks.
- A serious game still needs its own rule model, reachable-ending bot, gameplay
  metrics, and human visual/audio review.
- Real OS7 remains required for final BIOS, controller, sound, VDP, and ABI proof.
- Clean-repository promotion still requires the repository's promotion gates and a
  separate commit decision.
