# Amy Studio Game Authoring Kit

This kit gives coding agents the smallest useful context for producing reliable
ColecoVision and ADAM projects with Amy Studio. It does not expose the complete
example corpus. The corpus is evidence used to select and validate the compact
recipes referenced here.

Machine-readable routing and QA profiles are in [manifest.json](manifest.json).
Run the bounded author check with:

```powershell
node tools/amy-author-check.mjs --project studio/examples-src/my-game.alexis
```

Small models and quick lookups should use the generated
[agent cheatsheet](CHEATSHEET.md), which cannot quietly preserve obsolete rules.

It selects QA from detected capabilities and lists required runtime evidence. Add
`--execute` to run adapters. Runtime/ABI uses bounded `amy-qa quick`; only explicit
`--profile promotion` selects corpus compilation. Missing dependencies are `SKIP`,
never successful runtime proof.

The source is enough for a simple project. Add `amy-author.json` (or a neighboring
`<source>.amy-author.json`) when targets or tests must be explicit:

```json
{
  "source": "main.alexis",
  "target": "colecovision-cartridge",
  "optimization": "balanced",
  "output": "main.rom",
  "qa": {
    "bot": {
      "script": "bot.mjs",
      "args": ["--quick"],
      "report": "bot-metrics.json",
      "expectations": "bot-expectations.json"
    }
  }
}
```

`report` contains numeric JSON metrics. `expectations` maps each metric to `min`,
`max`, and optional `severity` (`WARN` or `FAIL`), so missed targets cannot pass.
Visual `wipePolicy`/`flickerPolicy` can `allow`, `measure`, or `clear` events.

The project-proof adapter rebuilds into a temporary directory, reports RAM and
target-appropriate size constraints, and compares the fresh output byte for byte
with the declared shipped output. MegaCart and ADAM targets are not incorrectly
subjected to the ordinary 32K cartridge limit.

## How an agent should use this kit

1. Read this file.
2. Load only the skill matching the requested subsystem.
3. Load only the recipe and canonical example named by that skill.
4. Preserve the hardware and compiler contracts linked by the recipe.
5. Compile, then run the targeted validation. A successful build is not runtime
   proof.

Do not preload the full manuals, logs, catalog, or game corpus. Search them only
when the selected recipe cannot answer a concrete question.

## Non-negotiable game contracts

- Keep important text, sprites, controls, and playfield decisions inside the CRT
  safe area. Decoration may enter overscan only deliberately.
- Use Amy commands and OS7 services before adding inline assembly. Assembly must
  document its inputs, outputs, clobbers, timing assumptions, and reason for
  existing.
- Select compression from measured total cost: payload plus decoder and runtime
  requirements. ZX0 is a strong default for substantial assets, not an automatic
  answer for every block.
- Install sound tables before playback. Background music uses the lowest sound
  areas beginning at `$702B`; effects use higher-priority areas when they must cut
  through music.
- Preserve NMI, VDP, controller, sound, RAM, stack, and source-map contracts.
- Credit original authors and publication sources. State whether work is a faithful
  port, expanded port, reimagining, inspired work, or original game.
- Prefer modern Amy forms and remove obsolete workarounds only after the natural
  form has runtime evidence.

## Initial skills
- [Tiny Sound composition and integration](skills/tiny-sound.md)
- [Graphics II, CRT safe area, and ZX0](skills/graphics-crt-zx0.md)
- [Main loop, input](skills/main-loop-input.md) and [GearColeco runtime proof](skills/gearcoleco-bot-harness.md)
- [Sprites, metasprites, animation, and flicker](skills/sprites-animation.md)
- [Menus, screensaver, and controller-friendly flow](skills/menu-crt-flow.md)
- [Graphics editors and editable assets](skills/editors-assets.md)
- [BCD scores, high scores, and initials](skills/bcd-high-scores.md)
- [Multi-file projects and publication](skills/multifile-projects.md)

## External harness comparison
- [Claude toolbox comparison and adoption plan](claude-toolbox-comparison-2026-11-08.md)
- [Deeper toolbox lessons and risk-selected QA](claude-toolbox-lessons-2026-11-08.md)
- [Z.AI small-model toolbox audit](zai-small-model-audit-2026-11-08.md)
- [Toolbox readiness report](readiness-report-2026-11-08.md)
