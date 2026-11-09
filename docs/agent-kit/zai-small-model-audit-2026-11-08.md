# Z.AI Small-Model Toolbox Audit

The Z.AI experiment is useful evidence because a smaller model followed the external toolbox and produced a coherent original ColecoVision game, Pond Hopper. The result includes a complete Amy source, menu and instructions, CRT-safe gameplay, music, a model-based bot, cheap-strategy checks, screenshots, and a reproducible ROM.

## What worked

- The short "I want to..." cheatsheet made commands discoverable without loading a large manual.
- Concrete verified examples transferred ColecoVision practices better than broad prose.
- The bot checks delayed human reactions, HUD consistency, sprite limits, overscan, endings, and cheap strategies.
- The source documents deliberate gameplay liberties and hardware constraints.

## What must not be copied unchanged

- The Z.AI cheatsheet and `TOOLBOX.json` describe an older compiler and retain obsolete bug workarounds.
- The report used an open OS7 rebuild, so real-OS7-only behavior remains unproved.
- Dynamic safe-area cases were unchecked but the category still received `PASS`.
- Screenshots were regenerated, but generation is not human visual approval.
- Most importantly, the bot measured a 94-second average against its stated 120-480 second target and still passed because `game.json` had `expectations: null`.

## Adopted response

Amy Studio now generates its compact cheatsheet from the current agent manifest instead of maintaining a second rulebook. Gameplay bots may emit JSON metrics and declare machine-enforced thresholds. Missing metrics and out-of-range values become explicit `WARN` or `FAIL` results. Visual evidence remains pending until a human approves it, and final BIOS-sensitive proof requires the real OS7.
