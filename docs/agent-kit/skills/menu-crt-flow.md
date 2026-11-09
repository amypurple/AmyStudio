# Menus, Screensaver, and Controller-Friendly Flow

Use Amy's menu services instead of custom cursor loops unless the interaction is
not representable by a vertical or coordinate-list menu.

## Canonical references

- `docs/colecovision-game-flow-conventions.md`: replay/menu and release handling.
- `studio/examples-src/coleco-bios-options.alexis`: smallest menu command example.
- `docs/amy-language.md`: complete `choose menu`, `choose keypad`, and sleep forms.

## Recipe

- For a publishable game, default to a compact title flow with `START`,
  `HOW TO`, and `CREDITS`. Omit an entry only for a documented product reason.
- Credits must name the original author/publication for adaptations and identify
  Amy Studio. A gameplay bot must visit all three paths and return to the title.
- `choose menu ... cursor Tile at X,Y step Rows` handles a regular vertical menu.
- Use `at list MenuSpots` for irregular, horizontal, or artistic coordinates.
- A configured sprite cursor uses pixel coordinates and must already have pattern,
  color, active count, and initial position.
- Add `on joypad N` when only one controller may choose.
- Add `sleep after N seconds` for PAL/NTSC-aware CRT protection. Wake input restores
  the display and is consumed instead of selecting accidentally.
- Keep clauses in compiler order: `choose keypad ... on keypad 1 sleep after 10 seconds`.
- `pause until press and release` prevents a held button from leaking into the next
  scene. Do not replace it with a raw busy loop.
- `choose menu` preserves the value already stored in its destination. Reset that
  variable before reopening a menu when a specific default choice is required.
- Make the menu interactive as soon as it is visible. Do not put a fixed music or
  animation wait before `choose menu`, especially on returns from HOW TO or CREDITS.
  Start one-shot title music, enter `choose menu` immediately, then `stop song`
  after a choice when the selected scene must be silent.

## Proof

Run `tools/test-choose-menu-list-rom.mjs` and
`tools/test-choose-menu-sleep-linkage.mjs`. A gameplay bot must visit every menu
entry, return path, timeout wake path, and verify that the cursor resets as intended.
For deterministic emulator bots, begin with a 14-frame press followed by a 14-frame
release; shorter pulses must be proven reliable rather than assumed.
