# AMY Changelog

This changelog records the current release-facing state of the AMY language and Amy Studio.

For the current version decision, see [amy-current-version.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-current-version.md).

---

## 2026-06-17 — Project Tile Editor MVP

**Summary:** Added a first Amy Studio tile editor for imported ICVGM-style
tile table groups, including ICVGM `.dat` and Coleco `.pc` export.

**Changes**
- Added a `Tiles` action to complete project-file tile groups
  (`.pattern/.color/.name`, including compressed variants).
- The editor decodes the current project files, renders the 32x24 NAME table,
  shows all 256 tiles, and edits one 8x8 tile with per-row foreground/background
  color bytes.
- Saving writes the modified pattern/color/name bytes back to the project,
  preserving the original compression codec when possible.
- The editor can also insert the existing tile-screen loading snippet for the
  selected group.
- Complete tile groups can now be exported as ICVGM v3/GM2-style `.dat`
  text files with `NAME`, `PATTERN`, and `MCOLOR` sections.
- Picture table groups can now be exported as Coleco `.pc` files
  (`6144` bytes PATTERN + `6144` bytes COLOR). For short ICVGM tile groups,
  Studio flattens the `NAME` table through the 2048-byte pattern/color tiles
  before writing the `.pc`.
- The Files panel now has `New tiles` and `New bitmap` shortcuts. `New tiles`
  creates a blank 2048-byte pattern/color/name tile group and opens the Tile
  Editor immediately. `New bitmap` creates a blank 6144-byte bitmap
  pattern/color/name group and opens the picture preview.
- Improved the Tile Editor with CV Paint / ICVGM-inspired basics: draw, erase,
  toggle, screen-map tile stamping, quick foreground/background palette
  swatches, and clear/invert/flip/rotate/copy/paste operations for the selected
  tile.
- Added a second usability pass for the Tile Editor: local undo/redo, direct
  tile index navigation, fill and line tools for the selected tile, map fill /
  clear actions, "apply colors to all rows", and clearer `Use in source`
  wording for the generated Amy loading snippet.

**Verification**
- `node --check studio/core/projectFileUi.js`
- `node --check studio/app.js`
- `node tools/check-examples.mjs` -> `117 passed, 0 failed`
- Browser smoke test: Amy Studio loads at `http://localhost:8080/studio/` with
  the Files panel available.

---

## 2026-06-17 — Direct ASM/Data Include Statement

**Summary:** Amy now supports `include "..."` directly for external ASM/data
files, so sound tables no longer need to be wrapped in `asm { ... }`.

**Changes**
- Added a top-level `include "path"` statement that emits an assembler include
  at that source location.
- Updated autocomplete and the language reference to document the difference
  between previewable `asset` declarations and verbatim `include` files.
- Migrated Chateau du Dragon, Diamond Dash, Brinquitos tiny music, Commando
  music, Commando tiny music, and Africa music includes to the direct Amy form.
- Updated the standalone examples README and audio workflow documentation so
  they no longer teach `asm { include "..." }` for plain external data files.

**Verification**
- `node --check studio/core/compiler/transpileAmyCore.js`
- `node --check studio/examples-games.js`
- `node --check studio/core/editor/autocompleteCatalog.js`
- `node tools/check-examples.mjs` -> `117 passed, 0 failed`
- `node tools/export-studio-examples-asm.js --out-dir build/codex-variable-audit --manifest-out build/codex-variable-audit-manifest.json`
- `node tools/audit-symbol-value-confusion.mjs build/codex-variable-audit` -> `OK (117 ASM file(s) scanned)`
- `chateau-du-dragon` assembled through the Studio internal assembler -> `8,499 bytes`, `411 symbols`

---

## 2026-06-16 — Value/Address Guard And Chateau du Dragon

**Summary:** Added a generated-ASM safety audit for variable value/address
confusion and a first Amy remake of Chateau du Dragon.

**Changes**
- Added `amy-compound-expression-test` to cover compound assignments whose
  right-hand side contains runtime variables, preventing regressions like
  treating `AMY_UVAR_*` as an immediate address in arithmetic.
- Added `tools/audit-symbol-value-confusion.mjs`, a generated-ASM scanner for
  suspicious `AMY_UVAR_*` immediate uses in arithmetic, comparison, or 8-bit
  loads.
- Extracted Chateau du Dragon's legacy RLE title picture into modern raw
  grouped picture assets and added a first `chateau-du-dragon` Amy game sample
  inspired by the original text adventure.
- Re-tested Chateau's title picture codecs and switched the project assets to
  ZX0: `pattern 6144 -> 1351`, `color 6144 -> 285`, best verified total cost
  among reliable codecs once the decompressor routine is counted.
- Added a reusable Chateau combat HUD routine so each combat turn redraws
  player/monster names, HP, attack, and defense before printing the current
  combat message.
- Restored the original Chateau title-screen contour overlay: 192 bytes of
  sprite pattern data and six black 16x16 sprites positioned like the legacy C
  `init_contour()` routine.
- Cleared and updated the sprite shadow after leaving the Chateau title screen
  so the contour sprites do not remain visible in the text adventure screens.
- Added a nine-area Chateau sound table with attack, miss, dragon fire breath,
  hit, collect, game-over, and victory sounds, then wired those effects into
  combat, rewards, defeat, and victory.

**Verification**
- `node tools/check-examples.mjs` -> `117 passed, 0 failed`
- `node tools/export-studio-examples-asm.js --out-dir build/codex-variable-audit --manifest-out build/codex-variable-audit-manifest.json`
- `node tools/audit-symbol-value-confusion.mjs build/codex-variable-audit` -> `OK (117 ASM file(s) scanned)`
- `chateau-du-dragon` assembled through the Studio internal assembler -> `8,499 bytes`, `411 symbols`

---

## 2026-06-16 — Safe VDP Pixel Drawing With NMI

**Summary:** `pset`, `line`, `circle`, and other helpers using `VPOKE/VPEEK`
are now guarded against VDP address-latch corruption when NMI is enabled.

**Changes**
- Added a tiny VDP critical-section marker around `AMY_VPOKE` and `AMY_VPEEK`.
- Updated all generated NMI variants to skip the VDP status read while that
  marker is active, preventing an NMI from resetting the VDP control latch
  between the two address bytes of a VRAM read/write.
- Returned `cvbasic-plot-port` to visible drawing with `screen on` before the
  pixel/line/circle workload, so the demo exercises the safer path directly.
- Regenerated the browser runtime/source catalogs.

**Verification**
- `node --check studio/examples-cvbasic-ports.js`
- `node --check studio/core/project.js`
- `node tools/check-examples.mjs` -> `112 passed, 0 failed`
- `node tools/build-preview.mjs` -> preview generated with `26 curated examples`

---

## 2026-06-16 — Release Preview Demo Curation

**Summary:** Amy Studio's preview set now emphasizes complete games, birthday /
anniversary context, and approachable CVBasic conversion demos.

**Changes**
- Reframed the former `10 years anniversary` demo as a `30TH ANNIVERSARY`
  ColecoVision demo for 1996-2026, with a cartridge title and intro screen.
- Added cartridge strings and intro screens to the release-facing games:
  Snake, Diamond Dash, Brinquitos, Meteor Dodge, Checkers, Rebound, Tile
  Collision Maze, and Sprite Platformer.
- Added short intro screens to the CVBasic conversion demos included in the
  preview build so each explains what behavior it demonstrates before running.
- Expanded the preview example filter to include the main games, the
  anniversary cake/music demo, key music demos, and the CVBasic ports.
- Replaced visible `ALEXIS data block` wording in the Studio audio converter
  with `Amy data block`; internal compiler identifiers remain unchanged.
- Updated the preview build script so its curated-example count is derived from
  `examples-preview.js` instead of a stale hardcoded number.

**Verification**
- `node --check studio/examples-demos.js`
- `node --check studio/examples-games.js`
- `node --check tools/build-preview.mjs`
- `node tools/check-examples.mjs` -> `112 passed, 0 failed`

---

## 2026-06-16 — Amy Studio Heritage Documentation

**Summary:** Amy Studio now includes a compact historical map of the devkit
lineage behind the language and tooling.

**Changes**
- Added `docs/amy-studio-heritage.md`, covering Marcel de Kogel's Hi-Tech C
  ColecoVision kit, Amy/Daniel's SDCC devkit evolution, lib4ksa/getput11,
  graphics tooling, sound tooling, BIOS constraints, and current Amy language
  inheritance.
- Added `docs/colecovision-essentials.md`, a compact hardware/VDP/sound page
  intended for quick reading inside the Studio `Docs` panel.
- Added the `ColecoVision Essentials` page to the in-app `Docs` selector.
- Refined the historical timeline to include the pre-SDCC QuickBASIC tool era
  around 1996-1998, the likely later SDCC migration, and DAN compression
  milestones through DAN3 in 2018.
- Added a confirmed 1997 Wayback anchor for Daniel Bienvenu's ColecoVision page
  and `VOIROM version 1.4 beta`.
- Added confirmed 1998 Wayback anchors for the February 1996 page-origin note,
  I.C.V.G.M. v0.8/v0.81, `VOIROM version 1.5 beta`, and CVPHOTO v1.01.
- Added NewColeco Wayback evidence confirming Breakout by Daniel Bienvenu dated
  1999-02-02, DacMan version details, and the GeoCities NewColeco homepage.
- Added declared NewColeco/GeoCities history for the `newcoleco` and
  `newcoleco2` accounts starting around 2000, with mirror-control caveats.
- Added declared game-driven devkit lineage covering BUSTin-Out, Spektank,
  Bejeweled, Miss Space Fury, GamePack 1/2, Canadian Minigames, GhostBlaster,
  Jeepers Creepers, Flora, Strip Poker, music work, and DAN0-to-DAN3
  compression evolution.
- Added verified public mirror / third-party leads for NewColeco tools,
  BUSTin-Out Volume 3, Strip Poker, and search-result leads for CVPaint/ICVGM
  PDFs and PDRoms game listings.
- Added ColecoVision.dk Daniel Bienvenu profile evidence and a summarized
  AtariAge 2013 tribute-thread excerpt covering the `Godfather of ColecoVision
  Homebrew` framing, tools, documentation, games, music, sound work, and
  community impact.
- Added ColecoBoxArt Daniel Bienvenu homage evidence, confirming the French
  `parrain` framing, shared utilities, developer enablement, and music/sound
  reputation.
- Added MO5 article evidence for `Daniel Bienvenu de retour sur ColecoVision !`,
  including NewColeco, the ColecoVision development kit, and `Flora and the
  Ghost Mirror`.
- Added temporary external sound-composition links to Amy's CV Sound Studio
  repository and online version while Studio's integrated music/effect tools are
  still incomplete.
- Added a user-provided AtariAge 2005 toolchain excerpt covering Hi-Tech C,
  SDCC/z88dk migration pressure, and PkK's independent SDCC ColecoVision tools.
- Added Internet Archive evidence for Daniel Bienvenu's 2005 `ColecoVision
  Coding Guide with the Absolute Coleco BIOS Listing`, including OS-7 BIOS,
  VDP/VRAM, sound, object/sprite, timer, and controller documentation scope.
- Added the public NewColeco YouTube channel/RSS lead, including a partial
  2011-2026 video timeline for ColecoVision music, Flora, ADAMCon, and Z80
  VRAM decompression/compression comparisons.
- Added the new `Heritage` document to the Studio `Docs` tab.
- Bumped the Studio app cache key so the new docs menu entry loads cleanly.

**Verification**
- `node --check studio\core\docsUi.js`: passed.
- `node --check studio\app.js`: passed.
- HTTP smoke test: `/docs/amy-studio-heritage.md` returned `200`.

---

## 2026-06-16 — Readable Numeric Padding Functions

**Summary:** Numeric text expressions now support readable padding forms equivalent
to CVBasic's compact `<N>` and `<.N>` print prefixes.

**Changes**
- Added `str$(Value, digits N)` and `digits$(Value, N)` for zero-padded numeric fields.
- Added `str$(Value, width N)` and `width$(Value, N)` for right-aligned numeric fields using the configured pad tile.
- Extended `Amy Numeric Str$ Lab` to cover the new padding forms.
- Updated the language reference and current-version note.

**Verification**
- `node tools\check-examples.mjs`: 112 passed, 0 failed.

---

## 2026-06-16 — Numeric Str$ Surface Generalized

**Summary:** `str$(Value)` is now documented and tested as the lightweight
runtime text-expression surface for all current numeric families.

**Changes**
- Added `Amy Numeric Str$ Lab`, covering `bool`, `u8`, `i8`, `u16`, `i16`,
  `u32`, `i32`, `fixed`, `ufixed`, `fixed32`, `fp5`, and `bcd`.
- The lab uses the preferred Amy surface, `print at X,Y, "LABEL " + str$(Value)`,
  instead of defining one temporary buffer per line.
- Clarified that `str$(Value)` plus literal concatenation is a numeric text
  expression system for fixed `u8` buffers and `print at`, not a heap-backed
  dynamic string type.
- Updated the current-version note and language reference to stop describing
  `str$` as fp5-only.

**Verification**
- `node tools/export-studio-examples-asm.js --only amy-numeric-str-lab --out-dir build/scratch-numeric-str --manifest-out build/scratch-numeric-str/manifest.json`: passed.
- `node tools\export-studio-examples-asm.js --only amy-numeric-str-lab --out-dir build/scratch-numeric-str-direct --manifest-out build/scratch-numeric-str-direct/manifest.json`: passed.
- `node tools\check-examples.mjs`: 112 passed, 0 failed.
- No compiler/codegen files changed; this adds one coverage lab and documentation,
  so existing examples do not gain linked string/runtime code from this task.

---

## 2026-06-16 — Studio In-App Language Documentation

**Summary:** Amy Studio now exposes the live Amy language documentation directly
inside the left panel.

**Changes**
- Added a `Docs` tab next to `Project` and `Files` in all Studio HTML variants.
- Loaded the language reference, current version note, and removed-forms guide
  from the local `docs/` files instead of duplicating stale UI text.
- Added document selection, reload, local search, and a small Markdown renderer
  for headings, lists, tables, code blocks, inline code, and links.
- Confirmed the current internal version document says `AMY pre-release`.

**Verification**
- `node --check studio/core/docsUi.js; node --check studio/app.js`: passed.
- `node tools\check-examples.mjs`: 111 passed, 0 failed.
- HTTP smoke test: the local Studio server returned `200` for `/studio/` and
  `/docs/amy-language.md`.

---

## 2026-06-16 — Canonical Select Case And Guide Cleanup

**Summary:** Tightened the active Amy language surface around `select case` and
removed stale autocomplete/doc examples that still taught pre-release forms.

**Changes**
- Confirmed the canonical multi-way branch form is `select case ... case ...
  case else ... end select`.
- Kept `endselect`, `default`, and `case default` as removed forms with
  deprecation/fix-it handling, but removed dead accept paths from the active
  transpiler handlers.
- Cleaned autocomplete so it no longer suggests removed forms such as
  `wend`, `endif`, `end for`, `end do`, `put tile`, `initialize mode 2 text
  color`, `sqrt ... into`, or `copy array Dst from Src`.
- Updated the language reference and Studio workflow guide to use canonical
  `end select`, `end data`, `fill mode 2 text color`, and `copy Src to Dst`
  spelling.
- Modernized the remaining root/example source files found with removed
  statement forms covered by this pass.

**Verification**
- `node tools\check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-16 — Meteor Dodge Uses Centered Text

**Summary:** Meteor Dodge now uses the modern `print centered` form for title
and retry instructions.

**Changes**
- Replaced fixed-column title/instruction prints with `print centered`.
- Centered the game-over heading and retry prompt.
- Moved the game-over score row to `SCORE:` at `10,11` and the BCD score at
  `17,11` for a cleaner centered result block.

**Verification**
- `node tools/export-studio-examples-asm.js --only meteor-dodge --out-dir build/scratch-meteor-centered --manifest-out build/scratch-meteor-centered/manifest.json`: passed.
- `node tools/export-studio-examples-asm.js --only meteor-dodge --out-dir build/scratch-meteor-gameover-layout --manifest-out build/scratch-meteor-gameover-layout/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-16 — Game Scores Use BCD

**Summary:** All current game examples with visible score counters now use BCD
for their score display.

**Changes**
- Converted Meteor Dodge `Score` from `u16` to `bcd digits 5`.
- Updated Meteor Dodge score prints to rely on the BCD digit count instead of
  `digits 5`.

**Verification**
- `node tools/export-studio-examples-asm.js --only meteor-dodge --out-dir build/scratch-bcd-scores --manifest-out build/scratch-bcd-scores/manifest.json`: passed.
- `node tools/export-studio-examples-asm.js --only brinquitos-game-demo,diamond-dash,meteor-dodge --out-dir build/scratch-bcd-score-games --manifest-out build/scratch-bcd-score-games/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-16 — BCD Language Documentation Cleanup

**Summary:** The Amy language reference now documents BCD as a canonical
packed-decimal score/timer surface instead of mixing it with old prefix forms.

**Changes**
- Clarified supported BCD declaration, assignment, add/sub, comparison, print,
  format, and raw-byte inspection forms.
- Documented current BCD limits: no `*=`, `/=`, `%=`; no BCD arrays; no local
  non-zero initializer; no implicit runtime conversion from wider numeric
  types; no general BCD expressions.
- Removed misleading public examples for legacy BCD prefix forms and the
  unsupported `print at X,Y, Score tiles $00` spelling.
- Updated the BCD audit note to mark the documentation contradiction as
  resolved.

**Verification**
- Documentation-only change; no compiler behavior changed.

---

## 2026-06-15 — Leaner Control Flow Emission

**Summary:** Amy emits smaller ASM for common byte comparisons and simple
`select case` branches, while documenting where BIOS calls can safely avoid
IX/IY preservation.

**Changes**
- Byte comparisons against constants now emit `cp imm` directly instead of
  loading the constant through `B`.
- Single-value `select case` arms now fall through on match and jump to the
  next test on mismatch, avoiding one generated branch label and jump.
- `select case` reuses the byte expression already in `A` only for proven
  8-bit expressions; wider numeric cases keep the conservative path.
- Single-call procedure inlining can now keep small internal-label bodies.
- Added a ColecoVision BIOS clobber audit for future IX/IY push/pop removal.

**Verification**
- `node tools/export-studio-examples-asm.js --only amy-surface-coverage,cvbasic-test3-port,cvbasic-controller-port,diamond-dash --out-dir build/scratch-claude-controlflow --manifest-out build/scratch-claude-controlflow/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.
- `node tools/check-examples.mjs --compare`: 111 passed, 0 failed; baseline is
  stale and reports broad ASM drift plus 8 new examples.

---

## 2026-06-15 — Diamond Dash Title Flow Cleanup

**Summary:** Diamond Dash now uses one shared title-return flow instead of
duplicating the title screen, input wait, and session restart sequence.

**Changes**
- Removed the separate `wait_title_start` helper.
- Routed initial startup and game-over return through one `return_to_title`
  block that mutes audio, draws the title, enables the screen, waits for FIRE,
  then starts a new session.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-title-flow --manifest-out build/scratch-diamond-title-flow/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: script ran the full
  catalog; 111 passed, 0 failed.

---

## 2026-06-15 — BCD Constant Declaration Initializers

**Summary:** Global BCD variables can now be initialized directly from decimal
literals or named compile-time constants.

**Changes**
- `bcd digits N Name = ConstValue` now encodes the initial packed BCD bytes at
  compile time.
- Removed single-use Diamond Dash title/game-over drawing wrappers from the
  example source.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-bcd-const-init --manifest-out build/scratch-diamond-bcd-const-init/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-15 — Diamond Dash Compiler Size Wins

**Summary:** Two local codegen optimizations remove unnecessary runtime helpers
from Diamond Dash while keeping the Amy source readable.

**Changes**
- `u8 % power_of_two` now compiles to `and mask`, so `DynamiteCountdown mod 2`
  no longer links the 16-bit divide helper.
- BCD comparisons against zero now use direct byte zero checks instead of the
  generic BCD comparator path.
- `i8` equality/inequality comparisons against unsigned constants no longer
  promote to scratch 32-bit comparisons; equality is byte-identical regardless
  of signedness.

**Impact**
- Diamond Dash balanced ROM size: `5424 -> 4953` bytes.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-i8-eq-fold3 --manifest-out build/scratch-diamond-i8-eq-fold3/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-15 — Compact Data Bytes And Sprite Preview Size Inference

**Summary:** Amy now accepts a clearer one-line ROM byte table form and previews
imported sprites as 16x16 when their attributes indicate 16x16 pattern IDs.

**Changes**
- Added `data Name bytes = ...` as an explicit compact form equivalent to
  `data Name bytes ...`.
- `data Name bytes: ...` now reports a targeted diagnostic explaining that `:`
  is reserved for labels.
- Updated Diamond Dash ROM data tables to use compact one-line byte data.
- Picture preview now infers 16x16 sprites when visible sprite attribute pattern
  IDs are all multiples of 4; otherwise it keeps 8x8 rendering.

**Verification**
- `node tools/test-picture-converter.mjs`: passed.
- `node --check studio/core/picturePreview.js`: passed.
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-data-equals --manifest-out build/scratch-diamond-data-equals/manifest.json`: passed.

---

## 2026-06-14 — Picture Preview Sprite And Tileset Modes

**Summary:** Picture previews now help inspect imported game graphics, not only
full-screen backgrounds.

**Changes**
- Picture preview now loads same-stem `*.sprattr` and `*.sprpat` files and can
  overlay 8x8 TMS9918 sprite previews when both are present.
- Added preview modes: imported `Screen`, default sequential `Bitmap NAME`, and
  `Tileset`.
- Tileset preview lets the user hover a tile and see its decimal/hex tile index
  and pattern offset, useful for identifying wall, lava, water, and gameplay
  tile values.

**Verification**
- `node tools/test-picture-converter.mjs`: passed.
- `node --check studio/core/picturePreview.js`: passed.

---

## 2026-06-14 — Preserve SC2 And GRP Sprite Tables

**Summary:** SC2 and GRP imports now keep embedded sprite data when present.

**Changes**
- SC2/GRP conversion extracts visible sprite attributes from VRAM `$1B00`
  into `*.sprattr`.
- SC2/GRP conversion extracts optional sprite patterns from VRAM `$3800`
  into `*.sprpat` when the file contains that section.
- Imports still produce normal picture assets, then add sprite assets alongside
  them rather than merging sprite data into the picture preview.

**Verification**
- `node tools/test-picture-converter.mjs`: passed.

---

## 2026-06-14 — Worker-Based ICVGM Tile Compression

**Summary:** Charset/tile compression comparison now uses JavaScript workers,
matching the bitmap picture import path.

**Changes**
- Generalized the picture compression worker so it can evaluate arbitrary
  components, not just `pattern` and `color`.
- Moved ICVGM/tile `pattern`, `color`, and `name` compression evaluation onto
  workers for both quick and `Compare all codecs` passes.
- Added the same progress modal used by picture imports while all tile codecs
  are running.

**Verification**
- `node tools/test-picture-converter.mjs`: passed.

---

## 2026-06-14 — Prefer MDKRLE In Quick Picture Compression

**Summary:** The quick picture/tile compression pass now includes MDKRLE/RLE
instead of BitBuster.

**Changes**
- Changed the quick compression codec list to `raw`, `mdkrle`, `dan1`, `lzf`,
  and `zx7`.
- Kept BitBuster available through `Compare all codecs`; it is no longer part
  of the default quick pass.

**Verification**
- `node tools/test-picture-converter.mjs`: passed.

---

## 2026-06-14 — Preserve ICVGM Sprite Sections

**Summary:** ICVGM `.dat` import now keeps sprite-related sections instead of
dropping them.

**Changes**
- Extended ICVGM `.dat` parsing to preserve `SPATT`, `SCOLOR`, and optional
  `SATTR` sections.
- Files import now creates `*.sprpat`, `*.sprcolor`, and `*.sprattr` project
  files when those sections exist.
- Classified those files as `sprite` and gave them distinct generated asset
  names to avoid collisions with same-stem picture tables.
- Documented the current ICVGM Studio contract: tile tables are ready for
  preview/insert; sprite color metadata is preserved but not guessed into
  runtime sprite attributes yet.

**Verification**
- `node tools/test-picture-converter.mjs`: passed.
- Verified `AmysCVPaintStudio-improved/icvgm-v3/mosaic3.dat` imports as
  `pattern=2048`, `color=2048`, `name=768`, `spritePattern=2048`,
  `spriteColor=64`.

---

## 2026-06-13 — Image-To-Picture Project Import Core

**Summary:** Added the first Studio-side conversion path from browser image
files to Amy picture project assets.

**Changes**
- Added a shared picture converter that maps `256x192` RGBA pixels into
  Coleco/TMS9918 bitmap `pattern`, `color`, and default `name` tables.
- Fixed the converter's table layout to use the Coleco/AmyCVPaintStudio linear
  bitmap offset `floor(y/8)*256 + tileX*8 + row`, not a premature 2KB-bank
  offset. This preserves all 192 pixel rows instead of spreading only the top
  24 rows across the three screen thirds.
- Reused the Amy CV Paint Studio foreground/background convention: per 8-pixel
  row, the most common palette color becomes foreground and the second most
  common becomes background.
- Extended Files import so PNG/JPEG/GIF/BMP/WebP files become grouped
  picture project files.
- Added `.pc` import splitting: 12288-byte Coleco picture files are imported as
  grouped `.pattern` and `.color` components instead of one opaque binary file.
- Replaced typed codec entry with a visual compression chooser for picture
  imports. Studio now evaluates `raw`, `rle`/`mdkrle`, `zx0`, `zx7`, `dan2`,
  `dan1`, `dan3`, `pletter`, `bitbuster`, and `lzf`, then shows pattern bytes,
  color bytes, decompressor routine bytes, first-use total, and raw savings per
  candidate.
- The chooser has quick picks for "best total" and "smallest data", because the
  smallest compressed files are not always the smallest ROM cost once the
  decompressor routine is counted.
- Added an image-import options step for browser image files with fit/crop/
  stretch mode, brightness, saturation, and resize smoothing before Coleco
  picture conversion.
- Added `bitbuster` as a Studio compression alias for RetroCompress Lite's
  JavaScript `bitbuster12` implementation, while keeping Amy source syntax as
  `codec bitbuster`.
- Added `tools/benchmark-picture-compression.mjs`; on the old-devkit CAKE
  picture, the first-use total was `zx0=3091`, `dan3=3210`, `dan1=3211`,
  `dan2=3211`, `zx7=3240`, `bitbuster=3292`, `pletter=3320`, `lzf=3740`,
  `mdkrle=4115`, `raw=12288`.
- Extended the benchmark to include compression time, repeated JavaScript
  decompression time, quick-evaluation recommendations, and a quality/price
  score balancing compression ratio against decompression speed.
- Picture import now starts with a quick compression pass using at most four
  non-raw codecs (`bitbuster`, `dan1`, `dan2`, `lzf`) plus raw; the chooser has
  a `Compare all codecs` button for slower exhaustive evaluation.
- Browser image import now shows a live ColecoVision-rendered preview before
  compression. The preview uses the generated `pattern`/`color` tables, so it
  reflects the actual bitmap result after fit/crop/stretch, brightness,
  contrast, saturation, smoothing, and ordered dithering.
- Compression evaluation now uses module workers when available: each non-raw
  codec can compress/decompress in parallel, while `raw` is evaluated directly.
  If workers are unavailable, Studio falls back to the existing sequential path.
- The quick picture-compression pass now follows the CAKE benchmark's fastest
  four non-raw compressors: `bitbuster`, `dan1`, `lzf`, and `zx7`.
- Picture compression result cards can now be sorted by total ROM cost, data
  size without decompressor routine, compression speed, or decompression speed.
  The chooser styles are shared in the current `styles.css` shell.
- The existing Files-tab `Preview` and `Picture` actions then work on the
  generated group; if compression fails, import falls back to raw picture files.
- Added a deterministic converter regression test.

**Verification**
- `node tools/test-picture-converter.mjs`: passed.
- `node tools/check-examples.mjs`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Named Sprite Hitboxes

**Summary:** Added named sprite hitboxes and migrated active examples to the
more explicit collision form.

**Changes**
- Added `hitbox Name = X,Y size W,H` declarations.
- Added `if sprite A hitbox HitA collides with sprite B hitbox HitB` conditions,
  allowing each sprite/object to define its own collision rectangle.
- Migrated Meteor Dodge and Collision Box Test to named hitboxes.
- Updated autocomplete, language reference, and the Meteor hitbox tuner to use
  the new named-hitbox surface.
- Kept the older shared-box forms as shortcuts for cases where both sprites
  intentionally use the same local box.

**Verification**
- `node tools/export-studio-examples-asm.js --only meteor-dodge,collision-box-test --out-dir build/scratch-hitbox-named --manifest-out build/scratch-hitbox-named/manifest.json`: passed.
- `node tools/validate-sound-table.mjs --file build/scratch-hitbox-named/meteor-dodge.asm --table MeteorSoundTable --areas 6 --music MeteorHumSong --sfx 5-6`: passed.
- `node tools/check-examples.mjs`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Meteor Dodge Hitbox Tuning

**Summary:** Tuned Meteor Dodge collision and added a visual hitbox helper.

**Changes**
- Changed Meteor Dodge collision checks from near-full `box 14,14` to
  `box 3,3 size 10,10`, reducing false hits from transparent sprite corners.
- Added `examples/meteor-hitbox-tuner.html`, a small local visual tool for
  adjusting the shared Amy sprite collision box over the ship and meteor
  sprites.

**Verification**
- `node tools/export-studio-examples-asm.js --only meteor-dodge --out-dir build/scratch-meteor-hitbox --manifest-out build/scratch-meteor-hitbox/manifest.json`: passed.
- `node tools/validate-sound-table.mjs --file build/scratch-meteor-hitbox/meteor-dodge.asm --table MeteorSoundTable --areas 6 --music MeteorHumSong --sfx 5-6`: passed.
- `node tools/check-examples.mjs --only meteor-dodge`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Meteor Dodge Cleanup and Sound Pass

**Summary:** Made the Meteor Dodge demo more Amy-like and added Coleco BIOS
sound data.

**Changes**
- Replaced sprite-position temporary variables with inline expressions in
  `set sprite ... to` calls.
- Added a 6-area sound table with looping ship hum as music plus alert and
  crash SFX in higher-priority sound areas.
- The hum starts with the game, stops on collision, restarts after a non-fatal
  hit, and remains stopped on game over.

**Verification**
- `node tools/export-studio-examples-asm.js --only meteor-dodge --out-dir build/scratch-meteor-sound --manifest-out build/scratch-meteor-sound/manifest.json`: passed.
- `node tools/validate-sound-table.mjs --file build/scratch-meteor-sound/meteor-dodge.asm --table MeteorSoundTable --areas 6 --music MeteorHumSong --sfx 5-6`: passed.
- `node tools/check-examples.mjs --only meteor-dodge`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — NMI Prologue HL Preservation Fix

**Summary:** Fixed generated NMI prologues so the interrupted `HL` register is
not clobbered before it is saved.

**Changes**
- Changed generated `NMI_FLAG` and `VDP_STATUS` writes from `ld hl,label` /
  `ld (hl),a` to direct `ld (label),a` stores, matching the `lib4ksa/crtcv.s`
  style.
- This keeps the generated `push hl` meaningful in ack-only, compact-controller,
  and full NMI variants.
- Added a regression test that prevents the unsafe `ld hl,NMI_FLAG` /
  `ld hl,VDP_STATUS` prologue shape from returning.

**Verification**
- `node tools/test-nmi-prologue-codegen.mjs`: passed.
- `node tools/test-wait-codegen.mjs`: passed.
- `node tools/test-wait-or-press-codegen.mjs`: passed.
- `node tools/export-studio-examples-asm.js --only snake-demo,rebound-demo,brinquitos-game-demo --out-dir build/scratch-nmi-prologue-fix --manifest-out build/scratch-nmi-prologue-fix/manifest.json`: passed.
- `node tools/check-examples.mjs`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Safe Wait NMI Register Fix

**Summary:** Fixed a runtime regression where `wait` could stall Snake while
NMI was enabled.

**Changes**
- Changed `AMY_WAIT_FRAMES_SAFE` to copy the 16-bit frame counter from `HL` to
  `DE` before waiting.
- The Coleco NMI handler writes `NMI_FLAG` and `VDP_STATUS` through `HL` before
  preserving `HL`, so keeping the wait counter in `HL` was unsafe.
- Updated runtime clobber metadata and regenerated the Studio runtime catalogs.

**Verification**
- `node tools/test-wait-codegen.mjs`: passed.
- `node tools/test-wait-or-press-codegen.mjs`: passed.
- `node tools/export-studio-examples-asm.js --only snake-demo --out-dir build/scratch-snake-wait-fix --manifest-out build/scratch-snake-wait-fix/manifest.json`: passed.
- `node tools/check-examples.mjs`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Safe Wait Runtime

**Summary:** Unified `wait` and `wait N frames` on a safe frame-delay routine.

**Changes**
- Added `AMY_WAIT_FRAMES_SAFE`, inspired by legacy `lib4ksa/delay.s`.
- `wait` and `wait N frame(s)` now call the same routine with a 16-bit count.
- When NMI is enabled, the routine waits on `NMI_FLAG`; when NMI is disabled,
  it polls VDP status directly instead of using `halt`.
- Kept `wait 0 frame(s)` as a no-op.
- Updated the language reference to describe the NMI ON/OFF behavior.

**Verification**
- `node tools/test-wait-codegen.mjs`: passed.
- `node tools/test-wait-or-press-codegen.mjs`: passed.
- `node tools/export-studio-examples-asm.js --only rebound-demo --out-dir build/scratch-wait-safe-rebound --manifest-out build/scratch-wait-safe-rebound/manifest.json`: passed.
- `node tools/export-studio-examples-asm.js --only snake-demo --out-dir build/scratch-wait-safe-snake --manifest-out build/scratch-wait-safe-snake/manifest.json`: passed.
- `node tools/check-examples.mjs`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Snake Demo Game Over Audio Fix

**Summary:** Tightened Snake demo game-over audio behavior.

**Changes**
- Stopped the music before triggering the `wrong` game-over SFX.
- Removed the attempted `wait` before `reset_game`; `wait` compiles to `halt`
  and is unsafe before NMI is enabled.

**Verification**
- `node tools/export-studio-examples-asm.js --only snake-demo --out-dir build/scratch-snake-nowait --manifest-out build/scratch-snake-nowait/manifest.json`: passed.
- `node tools/validate-sound-table.mjs --file build/scratch-snake-nowait/snake-demo.asm --table SnakeSoundTable --areas 6 --music SnakeMusic --sfx 3-4`: passed.
- `node tools/check-examples.mjs --only snake-demo`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Snake Demo Music and SFX

**Summary:** Added Coleco BIOS sound data to the Studio Snake demo.

**Changes**
- Added one physical `SnakeSoundTable` with separate logical roles: music uses
  sound areas 1-2, while `gobble` and `wrong` SFX use areas 5-6.
- Started the looping Snake music from `reset_game`.
- Triggered `gobble` on apple collection and `wrong` on game over.
- Kept the inserted sound data comment-free so the embedded demo source stays
  compact.

**Verification**
- `node tools/export-studio-examples-asm.js --only snake-demo --out-dir build/scratch-snake-sound --manifest-out build/scratch-snake-sound/manifest.json`: passed.
- `node tools/validate-sound-table.mjs --file build/scratch-snake-sound/snake-demo.asm --table SnakeSoundTable --areas 6 --music SnakeMusic --sfx 3-4`: passed.
- `node tools/check-examples.mjs --only snake-demo`: passed, reporting `111 passed, 0 failed out of 111 examples`.

---

## 2026-06-13 — Brinquitos Sound Effect Area Separation

**Summary:** Moved the Brinquitos jump SFX to the first sound area above the
music-owned areas.

**Changes**
- Changed Brinquitos sound setup from `areas 4` to `areas 5`.
- Moved `brinquitos_jump_sfx` from `$703F` to `$7053`, sound area 5.
- Updated the standalone Brinquitos tiny-music demo, Studio embedded examples,
  generated sound data, and critique appendix.
- The jump SFX remains sound table entry 6, but no longer lives in the
  music-owned first four sound areas.

**Verification**
- `node tools/validate-sound-table.mjs --file examples/generated/brinquitos-tiny-music.asm --table brinquitos_snd_table --areas 5 --music brinquitos_music_gladiators_song,brinquitos_music_end_song --sfx 6`: passed.
- `node tools/export-studio-examples-asm.js --only brinquitos-game-demo,brinquitos-tiny-music-demo --out-dir build/scratch-brinquitos-sound-area5 --manifest-out build/scratch-brinquitos-sound-area5/manifest.json`: passed.

---

## 2026-06-13 — Coleco Sound Table Validator

**Summary:** Added a deterministic validator for Coleco BIOS/lib4ksa sound
table area layout.

**Changes**
- Added `tools/validate-sound-table.mjs`.
- The validator checks that sound table entry 1 targets the lowest sound area
  `$702B`.
- It verifies sound-area alignment and declared area bounds.
- It verifies that music-triggered sound indexes stay in areas 1-4 under the
  current Amy music runtime.
- It verifies that declared SFX indexes stay above music areas when spare
  sound areas exist.
- Added `tools/test-sound-table-validator.mjs`.
- Updated audio workflow and Commando findings documentation.

**Verification**
- `node tools/validate-sound-table.mjs --file examples/vendor/music-bank/commando-music-data.asm --table _snd_table --areas 8 --music intro_music,ingame_music,end_level_music,high_score_music --sfx 43-55`: passed.
- `node tools/validate-sound-table.mjs --file examples/generated/brinquitos-tiny-music.asm --table brinquitos_snd_table --areas 5 --music brinquitos_music_gladiators_song,brinquitos_music_end_song --sfx 6`: passed.
- `node tools/test-sound-table-validator.mjs`: passed.

---

## 2026-06-13 — Sprite Shadow Movement And Pattern Bits

**Summary:** Added Amy syntax for smooth tile-based sprite movement and sprite
pattern bit edits, then removed Diamond Dash's custom player-movement ASM.

**Changes**
- Added `set sprite I pattern to P`.
- Added `set sprite I pattern bit B on/off` and `toggle sprite I pattern bit B`.
- Added `move sprite I toward tile X,Y step S wait F frames [animate pattern xor M]`.
- Diamond Dash now uses these forms for miner movement and idle/moving sprite
  pattern changes.
- The remaining Diamond Dash ASM block is only the external Coleco sound data
  include.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash,amy-surface-coverage --out-dir build/scratch-diamond-sprite-language --manifest-out build/scratch-diamond-sprite-language/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Frame Buffer Replace Count

**Summary:** `replace ... frame` can now report how many bytes it changed.

**Changes**
- Added `replace TypeOrValue with Tile in Buffer frame size W,H into Count`.
- The existing no-count form remains valid.
- `Count` is a byte variable, intended for small gameplay frames such as 3x3,
  5x5, and 7x7 collision or explosion regions.
- `amy-surface-coverage`, autocomplete, and the language reference now cover
  the optional count result.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash,amy-surface-coverage --out-dir build/scratch-replace-frame-count --manifest-out build/scratch-replace-frame-count/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Frame Buffer Replace Utility

**Summary:** Added a RAM frame-buffer replace utility for tile-map edits.

**Changes**
- Added `replace TypeOrValue with Tile in Buffer frame size W,H`.
- The match side accepts either a byte tile value or a declared `tile type`.
- Diamond Dash now uses `replace blastClears with WalkableTile in BlastFrame
  frame size TmpCount,TmpCount` before scanning only for powder barrels.
- `amy-surface-coverage`, autocomplete, and the language reference now cover
  the new command.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash,amy-surface-coverage --out-dir build/scratch-replace-frame --manifest-out build/scratch-replace-frame/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash End-Round Visual Updates

**Summary:** Restored visible end-of-level movement and bonus score animation
in Diamond Dash.

**Changes**
- When the player enters the open exit, Diamond Dash now animates/updates the
  sprite to the exit tile before ending the round.
- The timer bonus and remaining-dynamite bonus loops now call `show_score`
  after each value change, so the countdown/count-up is visible.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-endround-visuals --manifest-out build/scratch-diamond-endround-visuals/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash Frame-Based Explosion Carving

**Summary:** Diamond Dash now edits explosion regions through a RAM frame
buffer instead of many individual VRAM tile writes.

**Changes**
- Added a 49-byte `BlastFrame` buffer for 3x3 through 7x7 explosion regions.
- `Diamond_CarveSquare` now uses `get frame`, modifies `BlastFrame` in RAM,
  then writes the region back with one `put frame`.
- The powder-barrel chain reaction still records the barrel position and
  recurses with the larger blast size.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-frame-carve --manifest-out build/scratch-diamond-frame-carve/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash VRAM Burst Guard

**Summary:** Protected Diamond Dash explosion carving from NMI/VDP latch
interference.

**Changes**
- Wrapped the long `Diamond_CarveSquare` VRAM burst with `nmi off` / `nmi on`.
- Left normal gameplay, music, and short per-frame VRAM updates unchanged.
- Added a source comment explaining that the guard prevents NMI status reads
  during a multi-operation VRAM burst.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-vram-nmi-guard --manifest-out build/scratch-diamond-vram-nmi-guard/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Sprite Tile Placement Offsets

**Summary:** `set sprite ... tile` now accepts signed pixel offsets for custom
gameplay anchors.

**Changes**
- Added `set sprite I tile X,Y pattern P color C offset DX,DY`.
- Offsets are applied after tile-to-pixel conversion, so the final native sprite
  coordinates are `X * 8 + DX`, `Y * 8 - 1 + DY`.
- The surface coverage example now exercises a negative signed offset.

**Verification**
- `node tools/export-studio-examples-asm.js --only amy-surface-coverage,diamond-dash --out-dir build/scratch-sprite-tile-offset2 --manifest-out build/scratch-sprite-tile-offset2/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Sprite Tile Coordinate Placement

**Summary:** Added a sprite placement shorthand for tile-map games.

**Changes**
- Added `set sprite I tile X,Y pattern P color C`.
- The shorthand lowers to native sprite pixels as `Y * 8 - 1`, `X * 8`,
  preserving the ColecoVision sprite Y convention while hiding it from normal
  tile-map gameplay code.
- Diamond Dash now uses the shorthand and simpler expression assignments for
  movement targets.
- `amy-surface-coverage` and autocomplete now include the new form.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-tile-sprite --manifest-out build/scratch-diamond-tile-sprite/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash Enum Tiles And Frame Pacing

**Summary:** Diamond Dash now groups tile and sprite constants with `enum` and
paces gameplay VRAM updates once per frame.

**Changes**
- Replaced the Diamond Dash tile and sprite-pattern `const` lists with grouped
  `enum` declarations.
- Added a `wait` at the top of the gameplay loop so VRAM reads/writes occur
  after the frame interrupt instead of spinning as fast as possible.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-vdp-enum --manifest-out build/scratch-diamond-vdp-enum/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Select Case Tile Type Values

**Summary:** `select case` now accepts declared `tile type` names in `case`
arms, expanding them to all member tile values.

**Changes**
- `case ConstantName` remains supported for constants.
- `case TileTypeName` now works for declared tile groups such as
  `tile type blastClears = RockTile,DynamiteLitTile1,DynamiteLitTile2,DynamitePackTile`.
- Diamond Dash now uses `case blastClears` for explosion tile replacement.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-select-tiletype --manifest-out build/scratch-diamond-select-tiletype/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash Tile Names And Intro Page

**Summary:** Made Diamond Dash source more Amy-like by replacing raw tile
numbers with named constants and adding a short text introduction before the
tile-screen game starts.

**Changes**
- Added cartridge metadata and a standard text-screen instruction page.
- Replaced raw gameplay tile numbers with names such as `RockTile`,
  `WalkableTile`, `ExitOpenTile`, `DynamitePackTile`, and gem tile names.
- Moved Diamond Dash title/game-over tile strings from inline ASM `db` labels
  into `data ... bytes` blocks.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-tile-names --manifest-out build/scratch-diamond-tile-names/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111 examples.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash Source Surface Cleanup

**Summary:** Simplified Diamond Dash source where Amy already had cleaner
control-flow forms.

**Changes**
- Replaced multi-line `if ... then goto ... end if` patterns with direct
  `if condition goto Label`.
- Replaced remaining tile-value `if/elseif` dispatches with `select case`.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-surface-cleanup --manifest-out build/scratch-diamond-surface-cleanup/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Tile-Space Character Box Conditions

**Summary:** Added `if chars in box X,Y size W,H contain ValueOrType` for
tile-coordinate map scans, then used it to simplify Diamond Dash's diamond
placement checks.

**Changes**
- Added a control-flow condition for scanning visible name-table characters in
  tile coordinates.
- The condition accepts either a byte tile value or a declared `tile type`.
- Constant-size boxes up to 32 bytes are lowered through one BIOS frame read
  into `AMY_BUFFER32`, then scanned in RAM to avoid repeated VDP reads.
- Allowed negative decimal literals such as `-1` in `data ... bytes` blocks,
  matching the existing byte encoder behavior.
- Rewrote Diamond Dash hole-shape data as signed `dx,dy` pairs and removed the
  manual 3x3 `get char` sequence from `Diamond_AddDiamond`.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-char-box --manifest-out build/scratch-diamond-char-box/manifest.json`: passed.
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-char-box-frame --manifest-out build/scratch-diamond-char-box-frame/manifest.json`: passed.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — ROM Data Byte Indexing

**Summary:** Added `Var = DataName[Index]` for reading one byte from a ROM
`data ... bytes` table, then used it to remove Diamond Dash's minimum-diamonds
lookup ASM.

**Changes**
- Added transpiler/type support for indexed ROM byte table reads.
- Documented the new lookup form in the Amy language reference.
- Moved Diamond Dash's `minimum_diamants` table from inline ASM to Amy
  `data ... bytes`.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-data-index --manifest-out build/scratch-diamond-data-index/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111
  examples.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash ASM Surface Gap Review

**Summary:** Audited Diamond Dash's remaining inline ASM and removed two blocks
that current Amy can already express cleanly.

**Changes**
- Replaced the immediate player sprite placement ASM with `set sprite ...` and
  `update sprites`.
- Replaced the dynamite fuse parity ASM with `DynamiteCountdown mod 2`.
- Added `docs/diamond-dash-asm-surface-gap-2026-06-13.md` to classify the real
  language gaps: ROM data indexing, tile-space sprite movement, sprite pattern
  bit mutation, and Coleco sound-effect assets.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-asm-surface --manifest-out build/scratch-diamond-asm-surface/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111
  examples.

---

## 2026-06-13 — Diamond Dash Game Over Transition Cleanup

**Summary:** Made Diamond Dash's game-over and title-return transitions quieter
and safer around VRAM updates.

**Changes**
- `game_over_screen` now mutes active sounds before writing the game-over text,
  then starts the game-over sound effect after that VRAM write.
- `return_to_title` now mutes active sounds before rebuilding the title/mountain
  screen.
- `Diamond_BuildMountain` also mutes sounds before blanking and rebuilding the
  name table, so screen reconstruction starts from a clean sound-runtime state.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-vdp-glitch-mute --manifest-out build/scratch-diamond-vdp-glitch-mute/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111
  examples.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Diamond Dash BCD Score Timer And Dynamite

**Summary:** Converted Diamond Dash's visible counters to packed BCD and made
BCD assignment accept compile-time constants.

**Changes**
- Changed Diamond Dash `Score` and `Timer` to `bcd digits 4`.
- Changed Diamond Dash `Dynamite` to `bcd digits 2`.
- Kept gameplay state and flags as binary `u8`.
- Extended BCD assignment so constants such as `StartTimer` and
  `StartDynamite` can be assigned directly to BCD variables.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-bcd-score --manifest-out build/scratch-diamond-bcd-score/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111
  examples.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.

---

## 2026-06-13 — Restore Diamond Dash Powder Barrel Chain Blast

**Summary:** Restored the original Diamond Dash behavior where a dynamite blast
that destroys a powder barrel triggers a larger secondary blast.

**Changes**
- Added `CS_BarrelX` / `CS_BarrelY` scratch variables to remember a powder
  barrel (`tile 7`) found during `Diamond_CarveSquare`.
- When a barrel is detected, the current blast clears it and then launches a
  second `Diamond_CarveSquare` with size `7` at the barrel location.
- This mirrors the original SDCC game logic, where `square_hole(x,y,3)` can
  recursively call `square_hole(barrelX,barrelY,7)`.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-barrel-blast --manifest-out build/scratch-diamond-barrel-blast/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111
  examples.

---

## 2026-06-13 — Frame-Safe Diamond Dash Dynamite And Player Animation

**Summary:** Made Diamond Dash dynamite explosions wait for a frame boundary
and aligned player movement logic with the visible sprite animation.

**Changes**
- Added a one-frame wait before `Diamond_CarveSquare` starts its burst of VRAM
  updates when dynamite explodes.
- Made the normal `Diamond_ShowPlayer` call deterministic with `xor a` before
  the ASM helper.
- Changed `Diamond_ShowPlayer` so movement animation continues until the
  sprite reaches the current logical tile before the next player input is
  processed. This avoids collecting diamonds while the sprite still appears
  visually short of the target tile.

**Verification**
- Exported Diamond Dash ASM and confirmed the dynamite explosion path now emits
  `halt` before `Diamond_CarveSquare`.
- Exported Diamond Dash ASM and confirmed `Diamond_ShowPlayer_loop` repeats
  until sprite X/Y match `PlayerX/PlayerY`.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111
  examples.

---

## 2026-06-13 — Preserve Inline Return After Conditional Jumps

**Summary:** Fixed a compiler cleanup pass that could delete real early
returns after single-line conditional statements.

**Changes**
- Restricted `removeDeadReturnsAfterJumps` to unconditional `jp Label` /
  `jr Label` forms only.
- Conditional branches such as `jp nz,Label` now keep the following `ret`.
- This fixes `if DynamiteCountdown = 0 then return` in Diamond Dash, which had
  fallen through and drawn the dynamite fuse at the default `0,0` coordinates.

**Verification**
- Exported Diamond Dash ASM and confirmed `Diamond_UpdateDynamite` now emits
  `jp nz,AMY_IF_FALSE_*`, `ret`, then the false label.
- `node tools/check-examples.mjs`: 111 passed, 0 failed.
- `node tools/check-examples.mjs --compare`: 111 passed, 0 failed. The snapshot
  baseline is older than the current 111-example catalog, so many unrelated ASM
  changes remain reported.

---

## 2026-06-13 — Prevent Diamond Dash Start-Fire Dynamite

**Summary:** Prevented the title/start fire input from immediately placing a
dynamite charge at the beginning of a Diamond Dash mountain.

**Changes**
- Added `wait no fire on joypad 1` at the end of `start_mountain`, after the
  mountain setup and score display.
- Reason: mountain construction blanks the screen and temporarily stops the
  normal gameplay flow; once `screen on` resumes NMI/controller updates, a held
  or bounced fire input could be sampled before the first gameplay frame and
  trigger `Diamond_MovePlayer_fire`.
- Kept the fix at the Amy source level instead of hiding it in the low-level
  dynamite routine.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-dynamite-release-fix --manifest-out build/scratch-diamond-dynamite-release-fix/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111 examples.

---

## 2026-06-13 — Use Signed Deltas In Diamond Dash

**Summary:** Modernized Diamond Dash movement scratch variables to use signed
Amy types instead of unsigned `$FF` legacy encoding.

**Changes**
- Changed `PlayerDX` and `PlayerDY` to `i8` in the Studio Diamond Dash source.
- Changed `TmpDX` and `TmpDY` to `i8` because they are relative tile offsets in
  hole/shape scans.
- Replaced source-level `$FF` movement assignments with `-1` for left/up
  movement.
- Mirrored the signed declarations in the legacy source copy under
  `examples/ports/devkit/`.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-i8-delta --manifest-out build/scratch-diamond-i8-delta/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: passed as 111/111 examples.

---

## 2026-06-13 — Fix Sound Stop And Record Bounce

**Summary:** Fixed two Brinquitos-visible runtime/codegen issues without
changing the Amy game listing.

**Changes**
- Changed `AMY_STOP_SOUND` so `stop sound N` resolves entry `N` through the
  active sound table and stops that target sound area directly.
  - Reason: pure Coleco sound-effect command bytes such as `$C3` do not encode
    the Amy sound table index in their low 6 bits, so the previous legacy-style
    guard could refuse to stop `sound 6`.
- Fixed `bounce X by DX between ...` for indexed record fields with negative
  deltas.
  - Reason: the negative-delta path stored `X` in `D`, then the generated
    record-field address calculation reused `D`, corrupting the comparison.
- Updated the static Coleco BIOS include and regenerated the Studio runtime
  catalogs.

**Verification**
- `node tools/export-studio-examples-asm.js --only brinquitos-game-demo --out-dir build/scratch-brinquitos-bounce-stop-fix --manifest-out build/scratch-brinquitos-bounce-stop-fix/manifest.json`: passed.
- `node tools/check-examples.mjs`: passed as 111/111 examples.

---

## 2026-06-13 — Move Brinquitos Jump SFX Area

**Summary:** Moved the Brinquitos jump effect to the intended preallocated
gameplay SFX area.

**Changes**
- Changed sound table entry 6 from the previous area to `$703F`.
- Kept the Amy game code unchanged: `play sound 6` starts the jump effect and
  `stop sound 6` stops it on landing.
- Updated the Studio-embedded `brinquitos-tiny-music.asm` asset and the
  Brinquitos critique note.

**Verification**
- `node tools/export-studio-examples-asm.js --only brinquitos-game-demo,brinquitos-tiny-music-demo --out-dir build/scratch-brinquitos-jump-area-703f --manifest-out build/scratch-brinquitos-jump-area-703f/manifest.json`: passed.
- `node tools/check-examples.mjs --only brinquitos-game-demo,brinquitos-tiny-music-demo`: passed as 111/111 examples.
- `node tools/check-examples.mjs`: passed as 111/111 examples.

---

## 2026-06-13 — Fix Stop Sound For Shared Sound Areas

**Summary:** Made `stop sound N` resolve the active sound table entry before
stopping playback, matching the legacy lib4ksa behavior.

**Changes**
- Added `AMY_SOUND_TABLE_POINTER` to the sound runtime state so the runtime can
  locate the currently installed sound table.
- Updated `AMY_SET_SOUND_TABLE` to remember the active table.
- Reworked `AMY_STOP_SOUND` to resolve sound index `N` through the table and
  stop the target sound area only if it is still playing that same sound index.
- Updated `brinquitos-game-demo` to `stop sound 6` when the player lands on a
  cloud, so the jump effect does not keep playing after landing.

**Verification**
- `node tools/export-studio-examples-asm.js --only brinquitos-game-demo,brinquitos-tiny-music-demo --out-dir build/scratch-brinquitos-stop-sound3 --manifest-out build/scratch-brinquitos-stop-sound3/manifest.json`: passed.
- `node tools/check-examples.mjs`: passed as 111/111 examples.

---

## 2026-06-13 — Correct Brinquitos Gladiators Channel 2 Phrase

**Summary:** Corrected the compact tiny-music phrase for Brinquitos Gladiators
channel 2.

**Changes**
- Changed `brinquitos_music_gladiators_ch2` from the over-compressed
  phrase to an explicit 32-row phrase while the musical mapping is being
  verified.
- Updated the Studio-embedded `brinquitos-tiny-music.asm` asset and the
  Brinquitos critique appendix listing.

**Verification**
- `node tools/export-studio-examples-asm.js --only brinquitos-game-demo,brinquitos-tiny-music-demo --out-dir build/scratch-brinquitos-ch2-fix --manifest-out build/scratch-brinquitos-ch2-fix/manifest.json`: passed.
- `node tools/check-examples.mjs --only brinquitos-game-demo,brinquitos-tiny-music-demo`: passed as 111/111 examples.

---

## 2026-06-13 — Add Brinquitos Jump Sound Effect

**Summary:** Added the Brinquitos jump effect as pure Coleco BIOS sound data.

**Changes**
- Added `brinquitos_jump_sfx` to the generated Brinquitos sound table data.
- Brinquitos uses `areas 5`; the jump effect is sound table entry 6 and targets
  sound area 5 so the first four music-owned areas remain clean.
- Updated `brinquitos-game-demo` to trigger `play sound 6` when a jump starts.
- Updated `brinquitos-tiny-music-demo` with `BUTTON3 = JUMP SFX` to preview the
  effect without playing the full game.

**Verification**
- `node tools/export-studio-examples-asm.js --only brinquitos-game-demo,brinquitos-tiny-music-demo --out-dir build/scratch-brinquitos-jump-sfx --manifest-out build/scratch-brinquitos-jump-sfx/manifest.json`: passed.
- `node tools/check-examples.mjs --only brinquitos-game-demo,brinquitos-tiny-music-demo`: passed as 111/111 examples.

---

## 2026-06-13 — Clarify PSG Music vs Sound Effects

**Summary:** Documented the split between compact tiny music and pure Coleco
sound effects.

**Changes**
- Clarified that tiny sound / SPECIAL-04 is primarily a compact music and note
  stream, not the preferred format for short effects.
- Documented pure Coleco BIOS/lib4ksa sound data as the target path for game
  effects such as jumps, lasers, explosions, pickups, and engines.
- Added a Studio design note for a future visual sound-effect editor based on
  `examples/cvsoundfx-web.html`, including `.sfx` source files, preview, and
  generated sound-table entries.
- Documented the Coleco BIOS sound command byte families for noise, tone
  channels 1-3, direct output, frequency sweep, volume sweep, and combined
  frequency+volume sweep. The Studio exporter should prefer compact sweep data
  when a drawn effect is linear.

**Verification**
- Documentation-only change.

---

## 2026-06-12 — Infer Known Tile Row Counts

**Summary:** Added count inference for one-row tile buffer output.

**Changes**
- Added `put Name at X,Y` for known-length `u8[]` buffers and ROM `data`
  blocks.
- Added `put Name centered at Y`, using the inferred length and
  `ceil((32 - length) / 2)`.
- Updated `amy-frame-transpose-lab` to use `put FrameBuf centered at 20` for
  the final row.

**Verification**
- `node tools/export-studio-examples-asm.js --only amy-frame-transpose-lab --out-dir build/scratch-frame-transpose --manifest-out build/scratch-frame-transpose/manifest.json`: passed.
- Confirmed the final centered put compiles to `X=6`, `count=21`.
- `node tools/check-examples.mjs`: 111/111 examples passed.

---

## 2026-06-12 — Add Frame Transpose Regression Lab

**Summary:** Added a visual regression lab for `get frame` / `put frame`
width-height behavior.

**Changes**
- Added `amy-frame-transpose-lab`.
- The lab prints `MY NAME IS AMY PURPLE` as 21 characters, captures it as
  `21x1`, rewrites it as `7x3`, captures that, rewrites it as `3x7`, captures
  that, then writes the final buffer centered as `21x1`.

**Verification**
- `node tools/export-studio-examples-asm.js --only amy-frame-transpose-lab --out-dir build/scratch-frame-transpose --manifest-out build/scratch-frame-transpose/manifest.json`: passed.
- Confirmed generated ASM uses `C=width`, `B=height` for `21x1`, `7x3`,
  `3x7`, and `21x1`.
- `node tools/check-examples.mjs`: 111/111 examples passed.

---

## 2026-06-12 — Fix BIOS Frame Width Height Registers

**Summary:** Fixed the register order for `put frame` / `get frame` BIOS calls.

**Changes**
- `frame size W,H` now loads `C=W` and `B=H`, matching the legacy getput11
  `pop bc` convention and ColecoVision BIOS frame routines.
- This fixes `put MazeMap frame size 32,19 at 0,0`, where `19` was being used
  as the width.

**Verification**
- `node tools/export-studio-examples-asm.js --only tile-collision-maze --out-dir build/scratch-tile-maze --manifest-out build/scratch-tile-maze/manifest.json`: passed.
- `node tools/check-examples.mjs`: 110/110 examples passed.

---

## 2026-06-12 — Fix BIOS Frame Call Stack Balance

**Summary:** Fixed `put frame` / `get frame` codegen so direct Amy calls to the
ColecoVision BIOS frame routines do not leave stale parameters on the stack.

**Changes**
- Removed the `push bc`, `push de`, and `push hl` sequence before direct
  `PUT_FRAME` / `GET_BKGRND` calls.
- Kept `IX`/`IY` preservation, matching the safe part of the legacy getput11
  wrapper convention.

**Verification**
- `node tools/export-studio-examples-asm.js --only tile-collision-maze --out-dir build/scratch-tile-maze --manifest-out build/scratch-tile-maze/manifest.json`: passed.
- `node tools/check-examples.mjs`: 110/110 examples passed.

---

## 2026-06-12 — Add Character Map Data Frames

**Summary:** Made tile-map demos easier to read by allowing quoted character
rows to be uploaded with `put frame`.

**Changes**
- Added `data Name chars`, which stores quoted text rows as byte character/tile
  codes in ROM.
- Added `data chars` escapes such as `{CoinTile}`, `{$16}`, `{200}`, and
  `{byte:$16}` for non-printable or custom tile bytes.
- Allowed `put Name frame size W,H at X,Y` to use ROM `data` blocks as well as
  RAM `u8[]` buffers.
- Rewrote `tile-collision-maze` to draw its maze from a visible `MazeMap`
  instead of many individual fill statements.

**Verification**
- `node tools/export-studio-examples-asm.js --only tile-collision-maze --out-dir build/scratch-tile-maze --manifest-out build/scratch-tile-maze/manifest.json`: passed.
- `node tools/check-examples.mjs`: 110/110 examples passed.

---

## 2026-06-12 — Tune Sprite Platformer Jump Ceiling

**Summary:** Adjusted the 16x16 sprite platformer jump and ceiling collision
feel.

**Changes**
- Reduced the jump impulse from `-12` to `-10`.
- Moved ceiling collision probes slightly below the logical sprite top and
  snap the player directly under the ceiling tile on impact.

**Verification**
- `node tools/export-studio-examples-asm.js --only sprite-momentum-platformer --out-dir build/scratch-sprite-platformer --manifest-out build/scratch-sprite-platformer/manifest.json`: passed.
- `node tools/check-examples.mjs`: 110/110 examples passed.

---

## 2026-06-12 — Tighten Sprite Platformer Collision Probes

**Summary:** Reduced per-frame collision work in the 16x16 sprite platformer
demo and made coin pickup use a precise center probe.

**Changes**
- Replaced wall, floor, and ceiling rectangle scans with two point probes per
  side.
- Changed coin pickup from a broad body box to a 1x1 center probe, while still
  returning tile coordinates for `put char`.

**Verification**
- `node tools/export-studio-examples-asm.js --only sprite-momentum-platformer --out-dir build/scratch-sprite-platformer --manifest-out build/scratch-sprite-platformer/manifest.json`: passed.
- `node tools/check-examples.mjs`: 110/110 examples passed.

---

## 2026-06-12 — Tune Sprite Momentum Platformer Controls

**Summary:** Made the 16x16 sprite platformer collision demo playable enough
to validate momentum and jumping.

**Changes**
- Spawned the player on the floor with `OnGround = 1`.
- Increased jump impulse from `-7` to `-12` and gravity cap from `5` to `6`.
- Raised horizontal max speed from `3` to `4`.
- Applied friction only while grounded, preserving X momentum in the air.
- Shortened lateral wall hitboxes so floor/ceiling tiles do not cancel
  horizontal momentum.

**Verification**
- `node tools/export-studio-examples-asm.js --only sprite-momentum-platformer --out-dir build/scratch-sprite-platformer --manifest-out build/scratch-sprite-platformer/manifest.json`: passed.
- `node tools/check-examples.mjs`: 110/110 examples passed.

---

## 2026-06-12 — Add 16x16 Momentum Platformer Collision Demo

**Summary:** Added a playable test case for tile collision primitives with a
16x16 sprite and momentum.

**Changes**
- Added `sprite-momentum-platformer`, a 16x16 sprite demo with horizontal
  acceleration, friction, gravity, jumping, wall checks, landing clamp, and
  coin pickup.
- The demo uses `tile type`, `tiles under box`, and `find tile` against
  pixel-space player coordinates.

**Verification**
- `node tools/export-studio-examples-asm.js --only sprite-momentum-platformer --out-dir build/scratch-sprite-platformer --manifest-out build/scratch-sprite-platformer/manifest.json`: passed.
- `node tools/check-examples.mjs`: 110/110 examples passed.

---

## 2026-06-12 — Add Tile Gameplay Collision Primitives

**Summary:** Added named tile property groups and pixel-to-tile collision
queries for game logic.

**Changes**
- Added compile-time `tile type Name = ...` declarations. Tile types can list
  byte tile values and can reuse earlier tile types.
- Added `if tile under PixelX,PixelY is Type goto Label` for point collision
  using visible pixel coordinates.
- Added `if tiles under box PixelX,PixelY size W,H contain Type goto Label`
  for box queries such as player body, feet, attacks, hazards, and magnet zones.
- Added `find tile Type under box PixelX,PixelY size W,H into TileX,TileY`,
  returning the first matching tile coordinate or `255,255`.
- Added the `tile-collision-maze` example, a small maze-like demo with wall
  blocking, collectible coins, and hazard tiles.
- Updated autocomplete and the language reference to distinguish tile-grid
  reads from pixel-space collision queries.

**Verification**
- `node tools/export-studio-examples-asm.js --only tile-collision-maze --out-dir build/scratch-tile-collision --manifest-out build/scratch-tile-collision/manifest.json`: passed.
- `node tools/check-examples.mjs`: 109/109 examples passed.
- `node tools/check-examples.mjs --test-types`: expected BCD-only failures.

---

## 2026-06-12 — Clamp Skipped Bounce Bounds

**Summary:** Fixed `bounce` movement when a delta skips past a bound instead of
landing exactly on it.

**Changes**
- Updated `bounce Position by Delta between Min and Max` to look ahead before
  storing the next position.
- If the next step exceeds the high or low bound, `bounce` now clamps the
  position to the bound and reverses the signed delta.
- Exact bound hits keep their existing behavior: the position reaches the bound
  and the delta is not reversed until a later call would move past it.
- Added `amy-bounce-edge-lab`, covering high/low skipped bounds and high/low
  exact hits.

**Verification**
- `node tools/export-studio-examples-asm.js --only amy-bounce-edge-lab --out-dir build/scratch-bounce --manifest-out build/scratch-bounce/manifest.json`: passed.
- `node tools/check-examples.mjs`: 108/108 examples passed.

---

## 2026-06-12 — Add Integer Modulo Expressions

**Summary:** Added integer remainder support for byte and word Amy values.

**Changes**
- Added `%` and `mod` expression forms for `u8`, `i8`, `u16`, and `i16`.
- Added `%=`, lowered through the same expression path as `Var = Var % Value`.
- Added `AMY_I16_MOD`, reusing the existing unsigned 16-bit division remainder.
- Added `amy-modulo-lab`, a self-checking modulo example covering unsigned,
  signed, division-by-zero, `mod`, and `%=` cases.
- Modernized stale example syntax in `collision-box-test` and `meteor-dodge`
  so the full catalog compiles under the current language surface.

**Verification**
- `node tools/export-studio-examples-asm.js --only amy-modulo-lab --out-dir build/scratch-modulo --manifest-out build/scratch-modulo/manifest.json`: passed.
- `node tools/check-examples.mjs --test-types`: expected BCD-only failures.
- `node tools/check-examples.mjs`: 107/107 examples passed.

---

## 2026-06-11 — Make Diamond Dash Dynamite Edge-Triggered

**Summary:** Prevented Diamond Dash from repeatedly spending dynamite while
fire is held or reported as held across frames.

**Changes**
- Added `FireWasDown` state to the Diamond Dash port.
- Reset the fire latch when showing the title screen and when starting a
  mountain.
- Changed dynamite placement from level-triggered fire polling to a
  new-press-only action.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-runtime --manifest-out build/scratch-diamond-runtime/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: 104/104 examples passed.

---

## 2026-06-11 — Harden Diamond Dash Title Start

**Summary:** Replaced Diamond Dash's manual title polling with the release-safe
menu wait primitive.

**Changes**
- Added `wait_title_start`, using `pause until press` followed by
  `wait no fire`.
- Reused the same title wait after game over before starting a new session.
- Removed the manual `title_loop` polling path that could carry a held fire
  button into the first gameplay frame.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-runtime --manifest-out build/scratch-diamond-runtime/manifest.json`: passed.
- `node tools/check-examples.mjs --only diamond-dash`: 104/104 examples passed.

---

## 2026-06-11 — Refactor Diamond Dash Placement Retries

**Summary:** Made Diamond Dash mountain generation easier to reason about by
turning placement attempts into boolean functions.

**Changes**
- `Diamond_AddHoles()` now attempts one hole placement and returns `true` on
  success or `false` when the sampled area is blocked.
- `Diamond_AddDiamond()` now attempts one diamond placement and returns
  `true`/`false` instead of hiding its retry loop internally.
- `Diamond_BuildMountain` now owns the retry loops, making random-placement
  pressure visible in the source.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash --out-dir build/scratch-diamond-functions --manifest-out build/scratch-diamond-functions/manifest.json`: passed.
- `node tools/check-examples.mjs`: 104/104 examples passed.

---

## 2026-06-11 — Restore Game-Grade Bounded Random

**Summary:** Fixed expression-style `random(A, B)` so game code receives the
same mixed byte shape as the legacy devkit random helper.

**Changes**
- `random(A, B)` now mixes the BIOS random low byte with the Z80 refresh
  register using `ld a,r` / `xor l`, matching the legacy `_get_random`
  wrapper used by `rnd_byte`.
- The full-byte `random(0, 255)` expression path now uses the same mixed byte.
- Diamond Dash now generates 5 initial holes instead of 6, reducing retry
  pressure during mountain generation while preserving the game layout.

**Verification**
- `node tools/export-studio-examples-asm.js --only diamond-dash,amy-random-expression-test --out-dir build/scratch-random-fix --manifest-out build/scratch-random-fix/manifest.json`: passed.
- `node tools/check-examples.mjs`: 104/104 examples passed.

---

## 2026-06-11 — Split Diamond Dash Graphics Assets From Sound Include

**Summary:** Converted Diamond Dash project files to match their real data
types.

**Changes**
- Replaced the three graphics `.inc` project files with raw `.mdkrle` assets:
  name table, pattern table, and color table.
- Added explicit Amy asset declarations with `codec mdkrle`.
- Replaced ASM-label decompression with Amy-level `decompress mdkrle ... to
  vram.*` commands.
- Kept only `diamond_sounds.inc` as an ASM include, because it defines sound
  labels and `DiamondSoundTable`.

**Verification**
- `node tools/export-studio-examples-asm.js --out-dir build/scratch-diamond-dash-mdkrle-assets --manifest-out build/scratch-diamond-dash-mdkrle-assets/manifest.json --only diamond-dash`: passed.
- `node tools/check-examples.mjs`: 104/104 examples passed.

---

## 2026-06-11 — Attach Diamond Dash Include Assets

**Summary:** Made the Diamond Dash example self-contained for Studio/browser use.

**Changes**
- Added Diamond Dash `.inc` files as project-attached example files.
- Replaced repo-relative ASM includes with `@project/diamond_*.inc`.
- This avoids browser compile failures when examples cannot fetch local repo
  paths directly.

**Verification**
- `node tools/export-studio-examples-asm.js --out-dir build/scratch-diamond-dash-project-files --manifest-out build/scratch-diamond-dash-project-files/manifest.json --only diamond-dash`: passed.
- `node tools/check-examples.mjs`: 104/104 examples passed.

---

## 2026-06-11 — Restore Diamond Dash Amy Port

**Summary:** Re-enabled the Diamond Dash old-devkit port in the Studio catalog.

**Changes**
- Imported and registered the existing `diamondDashSource` example as
  `diamond-dash`.
- Updated the port to current Amy syntax for subroutine calls and inline ASM
  blocks.
- Switched the game bootstrap from `text screen` to `tile screen`, matching its
  Graphics II pattern/color-table data.

**Verification**
- `node tools/export-studio-examples-asm.js --out-dir build/scratch-diamond-dash-port --manifest-out build/scratch-diamond-dash-port/manifest.json --only diamond-dash`: passed.
- `node tools/test-tile-screen-codegen.mjs`: passed.
- `node tools/check-examples.mjs`: 104/104 examples passed.

---

## 2026-06-11 — Timed Wait Interruptible By Fire

**Summary:** Added a compact timed wait that can be skipped by pressing fire.

**Changes**
- Added `wait N frames or press`.
- Added `wait N frames or press on joypad 1/2`.
- The new form uses a 16-bit frame counter, so values like `800` and runtime
  `u16` variables are valid.
- The loop exits immediately for a zero count and otherwise waits up to N
  frames, stopping early when fire is pressed.
- Updated the 10 Years picture/music demo to use `wait 800 frames or press`.
- Updated autocomplete and the language reference.

**Verification**
- `node tools/test-wait-or-press-codegen.mjs`: passed.
- `node tools/test-wait-codegen.mjs`: passed.
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Clean Up Repeated Waits In Examples

**Summary:** Simplified active example waits after the new long-wait expansion.

**Changes**
- Replaced four consecutive `wait 200 frames` statements in the 10 Years
  picture/music demo with one `wait 800 frames`.
- Verified there are no remaining consecutive frame waits in active Studio
  examples.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Canonical One-Frame Wait Syntax

**Summary:** Added `wait` as the preferred one-frame VBlank wait and fixed the
zero-frame edge case.

**Changes**
- `wait` now emits a single `halt`.
- `wait 1 frame` and `wait 1 frames` also collapse to a single `halt`.
- Constant `wait 0 frame(s)` now emits no code instead of accidentally waiting
  256 frames through `djnz`.
- Constant waits above 255 frames are split into 8-bit wait loops at compile
  time, keeping the runtime model small.
- Updated autocomplete, active examples, and the language reference.

**Verification**
- `node tools/test-wait-codegen.mjs`: passed.
- `node tools/test-text-color-codegen.mjs`: passed.
- `node tools/test-tile-screen-codegen.mjs`: passed.
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Center Brinquitos Game Over Text

**Summary:** Updated the Brinquitos end screen to use the centered print helper.

**Changes**
- Replaced `print "G A M E  O V E R" at 7,4` with
  `print centered at 11, "G A M E  O V E R"`.
- Clarified in the language reference that explicit-position print uses `X,Y`,
  while centered print takes only `Y` because Amy computes `X`.

**Verification**
- `node tools/export-studio-examples-asm.js --out-dir build/scratch-brinquitos-centered-gameover --manifest-out build/scratch-brinquitos-centered-gameover/manifest.json --only brinquitos-game-demo`: passed.
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Brinquitos Uses Simplified Color And BCD Score

**Summary:** Updated the Brinquitos game example to use the newer Amy surface
syntax.

**Changes**
- Replaced explicit text color backgrounds with transparent-background shorthand.
- Added `backdrop sky blue` for the global screen/backdrop color.
- Changed `Score` from `u16` plus `digits 5` printing to `bcd digits 2 Score`
  with direct BCD printing.

**Verification**
- `node tools/export-studio-examples-asm.js --out-dir build/scratch-brinquitos-modern-score --manifest-out build/scratch-brinquitos-modern-score/manifest.json --only brinquitos-game-demo`: passed.
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Backdrop Is The Only Global Border Color Keyword

**Summary:** Simplified the global VDP register 7 color command to one public
keyword.

**Changes**
- Removed the `paper Color` alias from the compiler surface.
- Kept `backdrop Color` as the canonical command for the TMS9918A
  backdrop/border color.
- Updated the language reference to avoid confusing global backdrop color with
  text color backgrounds.

**Verification**
- `node tools/test-text-color-codegen.mjs`: passed.
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Optional Transparent Text Color Background

**Summary:** Made the background half of `set text colors` optional.

**Changes**
- `set text colors Foreground ...` now defaults the background nibble to
  `transparent` (`0`).
- Existing `set text colors Foreground on Background ...` syntax is unchanged.
- Documented that `backdrop` is separate from text color backgrounds.

**Verification**
- `node tools/test-text-color-codegen.mjs`: passed.
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Tile Screen Alias For Mode 2 Text-Style Surface

**Summary:** Added `tile screen` as the simplified name for the old Graphics II
text-style surface.

**Changes**
- Added `tile screen` as the full Mode 2 tile/text bootstrap:
  `graphics mode 2 text`, `load default ascii`,
  `duplicate mode 2 text patterns`, `fill mode 2 text color with $F0`, and
  `cls`.
- Kept `graphics mode 2 text` as the explicit low-level setup only.
- Updated graphics-mode tracking so `text screen` is tracked as standard text
  and `tile screen` is tracked as the Mode 2 text-style surface.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Text Screen Uses Real Text Color Groups

**Summary:** Made `text screen` match the expected 32x24 ColecoVision text
surface so `set text colors ... at N count M` controls the 32 text color groups.

**Changes**
- Changed `text screen` from the old Mode 2 text-style bootstrap to the
  standard text-mode bootstrap.
- `text screen` now loads the BIOS ASCII font, clears the name table, and fills
  the 32-byte text color table with `$F0`.
- Kept `graphics mode 2 text` as the explicit advanced/legacy Mode 2 text-style
  surface.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- Brinquitos now emits `VRAM_COLOR` fills over 32-byte text color groups, so
  the digit groups at offsets 6 and 7 can use cyan-on-dark-blue.

---

## 2026-06-11 — Random Bound Constant Codegen

**Summary:** Reduced bounded-random setup code when `random(A, B)` uses named
compile-time constants.

**Changes**
- `random(ConstMin, ConstMax)` now evaluates bounds through the compile-time
  numeric evaluator instead of treating named constants as runtime loads.
- Direct constant bounds emit `ld c,MIN` / `ld b,RANGE` before the existing
  retry loop.
- Added a focused optimizer classification note for the top post-built-in
  oracle targets.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- `lottery-ticket-demo` isolated balanced size: `2078 -> 1994` bytes.

---

## 2026-06-11 — Documentation Root Cleanup

**Summary:** Reduced root-level documentation noise and clarified the current
pre-release Amy documentation entry points.

**Changes**
- Added `docs/README.md` as the documentation index.
- Moved historical prompts, investigations, optimizer audits, old plans, and
  superseded manuals into focused subdirectories.
- Updated README, project orientation, current-version notes, and optimizer QA
  priorities to point at the current docs and archived report locations.
- Replaced public-compatibility wording with pre-release removal/canonical
  surface wording where the project has no public compatibility burden.

**Verification**
- Documentation-only change; no compiler harness run required.

---

## 2026-06-11 — Function Return Terminator Style

**Summary:** Functions now follow the same explicit-return style as subs.

**Changes**
- Allowed a function to close at the next routine or file end when it already
  ends with a terminal `return Value`.
- Removed `end function`; functions must end with `return Value`.
- Added a catalogue modernizer that hides redundant `end function` after a
  terminal `return Value`.
- Added a compiler error when a function reaches `end function`, the next
  routine, or file end without a terminal `return Value`.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Hide Redundant End Sub In Examples

**Summary:** Reduced visible subroutine boilerplate in Studio examples.

**Changes**
- Added a catalogue source modernizer that removes `end sub` only when it is
  immediately preceded by an explicit `return`.
- Removed `end sub` from active autocomplete suggestions so examples teach
  `return` as the normal subroutine terminator.
- Updated the language reference and simplification plan to mark
  `return` + `end sub` as redundant.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Modern Input Read Examples

**Summary:** Moved the remaining frame/spinner examples to expression-style
input reads.

**Changes**
- Replaced visible `read frame into FrameCount` with `FrameCount = frame`.
- Replaced visible `read spinner N into Var` examples with
  `Var = spinner(N)`.
- Updated autocomplete to suggest `FrameCount = frame` and
  `SpinX = spinner(1)` / `SpinY = spinner(2)` instead of staged read forms.
- Updated the language reference and removal plan to mark staged
  frame/spinner reads as old/internal migration forms.
- Updated compiler capability inference so `FrameCount = frame` activates the
  frame-counter runtime state without relying on the old staged read syntax.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Simplified Example Surface Syntax

**Summary:** Made the public examples and editor suggestions favor the modern,
short Amy surface forms.

**Changes**
- Migrated visible examples from low-level `graphics mode ...` setup spelling to
  `text screen`, `bitmap screen`, `picture screen`, and `multicolor screen`.
- Stopped expanding `text screen` into the long Mode 2 bootstrap in example
  display paths.
- Updated autocomplete to suggest the modern screen forms and
  `pause until press` instead of older button/menu wait spelling.
- Updated the language reference and simplification plan to mark old technical
  screen forms as internal/deprecation-plan material, not example style.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Modern Screen Surface Aliases

**Summary:** Added user-facing screen surface commands that hide confusing
legacy/VDP mode numbering.

**Changes**
- Added `bitmap screen [color X]` for the drawable bitmap surface used by
  `pset`, `preset`, `line`, and `circle`; default color remains `$F0`.
- Added `picture screen` for raw full-screen picture/table setup.
- Added `multicolor screen` for the Mode 3 multicolor surface.
- Routed the new commands through the existing graphics-mode tracking so `cls`
  clears the correct surface.
- Updated removed-form rewrites: `graphics mode1` now points to `bitmap screen`;
  `graphics bitmap` / `graphics mode bitmap` now point to `picture screen`.
- Documented that `text 40 screen` is reserved until 40-column text I/O address
  math exists.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Graphics Mode1 Migration Fix

**Summary:** Corrected the removed-form migration for the old CVBasic-style
bitmap setup.

**Changes**
- Fixed `graphics mode1` migration guidance from `graphics mode 1 text` to
  `graphics mode 1 color $F0`.
- Updated `cvbasic-plot-port` to use the explicit CVBasic-style bitmap setup
  expected by `pset`, `line`, and `circle`.
- Updated autocomplete to suggest the canonical spaced bitmap form.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.

---

## 2026-06-11 — Sprite Argument Stack Cleanup

**Summary:** Reduced generated code for dynamic `set sprite` statements.

**Changes**
- Replaced `ld h,a` + `push hl` staging with `push af` when preserving
  evaluated sprite arguments before the final `AMY_SET_SPRITE` call.
- Kept the existing evaluation order (`y`, `x`, `pattern`, `color`, `index`)
  so expressions with observable calls keep the same behavior.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 572 -> 430.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Sprite Clear Pointer Cleanup

**Summary:** Removed a redundant sprite-table address reload in the sprite
runtime.

**Changes**
- Replaced `ld hl,AMY_SPRITE_TABLE` with `inc hl` inside
  `AMY_CLEAR_SPRITES` after clearing `AMY_SPRITE_COUNT`.
- This relies on the documented layout where `AMY_SPRITE_TABLE` immediately
  follows `AMY_SPRITE_COUNT`.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 592 -> 572.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Guarded CP Zero Peephole

**Summary:** Added a conservative `cp 0` to `or a` rewrite when the next
instruction directly tests compatible flags.

**Changes**
- Replaced `cp 0` with `or a` only before immediate `z`, `nz`, `c`, or `nc`
  conditional `jr`, `jp`, `call`, or `ret`.
- Kept the rule narrow because `cp 0` and `or a` differ on `N`, `H`, and
  parity/overflow flags.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 611 -> 592.
- 44-example math/numeric post-built-in MDL residual bytes: 125 -> 124.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — U8 Formatter Tail Cleanup

**Summary:** Removed two dead tail increments from the unsigned 8-bit decimal
formatting runtime.

**Changes**
- Removed the final `inc de` before `ret` in `AMY_U8_TO_ASCII3`.
- Removed the final `inc de` before `ret` in `AMY_U8_TO_ASCII2`.
- Clarified that these helpers write their fixed-size output, but do not
  guarantee `DE` after return.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 651 -> 611.
- 44-example math/numeric post-built-in MDL residual bytes: 151 -> 125.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Wipe Halt Preservation Cleanup

**Summary:** Removed unnecessary `HL` preservation around `halt` in the text
wipe runtime.

**Changes**
- Removed `push hl` / `pop hl` around `halt` in `AMY_WIPE_SCREEN_UP` and
  `AMY_WIPE_SCREEN_DOWN`.
- Kept the `HL` preservation around `FILL_VRAM`, which can still clobber `HL`.
- This is safe for Amy-generated ColecoVision programs because the generated
  NMI handlers preserve `HL` before returning from VBlank.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- `wipe-screen-demo`: 616 -> 612 bytes after Amy built-in optimization.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 659 -> 651.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Direct Immediate Store Peephole

**Summary:** Added a narrow `ld a,n; ld (hl),a` cleanup when `A` is proven dead.

**Changes**
- Folded `ld a,n; ld (hl),a` into `ld (hl),n` only when `A` is explicitly
  overwritten before any later read, label, branch, call, or return.
- The rule saves one byte per accepted site and rejects cases where the loaded
  `A` value remains useful for repeated stores or call arguments.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 663 -> 659.
- 44-example math/numeric post-built-in oracle audit: 44 succeeded, 0 failed,
  residual unchanged at 151.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Redundant D-Zero Peephole Cleanup

**Summary:** Removed a second safe zero-register redundancy identified by the
post-built-in oracle audit.

**Changes**
- Removed redundant `ld d,0` when a short local lookback proves that `D` is
  already zero.
- Accepted proofs are narrow: previous `ld d,0` or `ld de,nn` with a zero high
  byte, with no labels, calls, jumps, returns, or intervening writes to `D`.
- This mostly helps repeated byte-to-word and record/array indexing setup.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- `brinquitos-game-demo`: 3151 -> 3137 bytes after Amy built-in optimization.
- Targeted `checkers` + `brinquitos-game-demo` MDL residual bytes:
  121 -> 109.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 719 -> 663.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Redundant H-Zero Peephole Cleanup

**Summary:** Ported one more safe local MDL residual pattern into Amy's
built-in optimizer.

**Changes**
- Removed redundant `ld h,0` when the optimizer can prove `H` is already zero
  within a short local window.
- The proof is intentionally narrow: previous `ld h,0` or `ld hl,nn` with a
  zero high byte, no labels, calls, jumps, returns, or intervening writes to
  `H`.
- Refreshed the full post-built-in oracle report after the Mode 3 catalog grew
  the example set to 103.

**Verification**
- `node tools/check-examples.mjs`: 103/103 examples passed.
- `checkers`: 3859 -> 3771 bytes after Amy built-in optimization.
- Targeted `checkers` + `brinquitos-game-demo` MDL residual bytes:
  195 -> 121.
- Full post-built-in oracle audit: 103 examples, 103 succeeded, 0 failed.
- Full post-built-in MDL residual bytes: 821 -> 719.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Byte Compare and Record-Stride Codegen Cleanup

**Summary:** Removed two bounded codegen inefficiencies identified by the
targeted post-built-in residual audit.

**Changes**
- Unsigned byte comparisons against compile-time constants now load the right
  operand directly into `B`.
- This avoids the previous
  `push af; ld a,const; ld b,a; pop af; cp b` shape for cases such as
  `MovingPiece = P1`.
- Record/array byte-index scaling for strides greater than 2 now clears `HL`
  with `ld l,d; ld h,d` after `ld d,0`, replacing the larger `ld hl,0` form
  without changing flags.
- Refreshed the full post-built-in oracle audit report.

**Verification**
- `node tools/check-examples.mjs`: 102/102 examples passed.
- Targeted post-built-in oracle audit: `checkers` and `brinquitos-game-demo`,
  2/2 succeeded.
- `checkers`: 3927 -> 3859 bytes after Amy built-in optimization.
- `brinquitos-game-demo`: 3183 -> 3151 bytes after Amy built-in optimization.
- Targeted MDL residual bytes for those two examples: 287 -> 195.
- Full post-built-in MDL residual bytes: 907 -> 821.
- copt residual executable-code changes remained 0.

---

## 2026-06-11 — Targeted Residual Optimization Audit

**Summary:** Audited the two largest full-catalog MDL residual examples after
Amy built-in optimization.

**Changes**
- Added `docs/post-builtin-residual-target-audit-2026-06-11.md`.
- Classified `checkers` residuals as primarily byte compare-constant codegen
  inefficiency.
- Classified `brinquitos-game-demo` residuals as primarily repeated
  record-array indexed field offset computation.
- Rejected broad inter-routine liveness and code folding as premature compared
  with these bounded codegen fixes.

---

## 2026-06-11 — Optimization and QA Priority Backlog

**Summary:** Captured the next optimizer and QA priorities after the full
post-built-in oracle audit.

**Changes**
- Added `docs/amy-optimization-qa-priorities-2026-06-11.md`.
- Recorded the full-audit interpretation policy: MDL residual growth is a
  signal to inspect, while new copt executable-code changes should be treated
  as suspicious until proven correct.
- Prioritized focused residual audits of `checkers` and
  `brinquitos-game-demo` over immediate global inter-routine optimization.
- Tracked the remaining value of `amy-removed-forms.md` as migration tooling
  and canonical-surface protection, not parser compatibility.

---

## 2026-06-11 — Full Post-Built-In Oracle Audit

**Summary:** Expanded the post-built-in MDL/copt oracle audit from the
math/numeric subset to the full Studio example catalog.

**Changes**
- Fixed exported `@project` asset placement so non-default audit output roots
  can compile examples with project-local files.
- Fixed post-built-in ASM translation so `.builtin.asm` inputs resolve
  `@project` assets through the original example id instead of an accidental
  `.builtin` suffix.
- Added `docs/post-builtin-oracle-full-audit-2026-06-11.md`.

**Verification**
- Full post-built-in oracle audit: 102 examples, 102 succeeded, 0 failed.
- MDL residual bytes after Amy built-in: 907 bytes total across the full
  catalog.
- copt residual executable-code changes after Amy built-in remained 0 for both
  `sdcc` and `z88dk-so3` rule sets.

---

## 2026-06-11 — Post-Built-In Peephole Follow-Up

**Summary:** Ported two low-risk MDL residual peepholes into Amy's built-in
optimizer after the post-built-in oracle audit identified them as safe local
misses.

**Changes**
- Folded transient `HL -> BC -> DE` register copies into direct `HL -> DE`
  copies when `BC` is proven dead before any read.
- Removed duplicate `LD A,r` reloads after `LD (mem),A` stores, since the
  store does not alter `A`, `r`, or flags.
- Refreshed `docs/post-builtin-oracle-audit-2026-06-11.md`.

**Verification**
- `node tools/check-examples.mjs`: 102/102 examples passed.
- Post-built-in oracle audit: 44 targeted math/numeric examples, 44 succeeded.
- MDL residual bytes after Amy built-in decreased from 154 to 121 bytes.
- copt residual executable-code changes after Amy built-in remained 0.

---

## 2026-06-11 — Post-Built-In External Oracle Audit

**Summary:** Added an audit lane that feeds Amy's built-in optimized ASM into
MDL and z88dk copt, so residual external gains are measured after built-in
optimization rather than against raw generated ASM.

**Changes**
- Added `--builtin-out` to `tools/compare-z80-optimizer.js` for exporting the
  final optimized assembler tokens used by pass 3.
- Added `tools/audit-post-builtin-oracles.ps1` to run MDL `-po` and copt rule
  sets on that post-built-in ASM.
- Added `docs/post-builtin-oracle-audit-2026-06-11.md` with top residual gains
  and MDL pattern hotspots.

**Verification**
- Post-built-in oracle audit: 44 targeted math/numeric examples, 44 succeeded.
- MDL residual bytes after Amy built-in: 154 bytes total.
- copt residual executable-code changes after Amy built-in: 0.

---

## 2026-06-11 — copt Third Optimizer Oracle

**Summary:** Completed the third audit oracle using local z88dk `copt` and
produced apples-to-apples triangulation against built-in and MDL optimization.

**Changes**
- Extended the existing Amy-to-MDL translator with a `--target copt` backend
  flag so `copt` uses the same translation path as MDL.
- Reworked `tools/audit-copt-examples.ps1` to run two copt rule sets:
  `sdcc` (`sdcc_peeph.0..3`) and `z88dk-so3` (`z80rules.0..2`).
- MDL now assembles copt output without `-po`, giving a real binary-size oracle
  instead of a source-text-only comparison.
- Added `docs/copt-audit-2026-06-11.md` with the 44-example math/numeric
  triangulation table.
- Added `docs/peephole-rule-candidates-2026-06-11.md`, mining SDCC and z88dk
  rules into safety-audit candidate notes.

**Verification**
- `tools/audit-copt-examples.ps1`: 44 examples, 88 copt runs, 88 succeeded.
- Corrected verification: both rule sets were loaded and switched correctly, but
  copt made zero normalized executable-code changes on the 44-example corpus.
- Corrected verified copt delta: 0 bytes for both `sdcc` and `z88dk-so3`.
- The former large copt wins were assembler-baseline artifacts, not fired copt
  rules.
- `node tools/check-examples.mjs`: 102/102 examples passed.
- No optimizer, compiler, or runtime library behavior was changed.

---

## 2026-06-10 — External Peephole Oracle Scaffolding

**Summary:** Added a third optimizer-audit lane for z88dk `copt` and a rule
miner for public SDCC/z88dk peephole definitions.

**Changes**
- Added `tools/fetch-external-peephole-rules.mjs` to fetch public rule files
  into ignored `build/external-peepholes/`.
- Added `tools/mine-external-peephole-rules.mjs` to extract rewrite shapes and
  classify them with the June 8 safety-audit method.
- Added `tools/audit-copt-examples.ps1` to run `z88dk-copt`/`copt` over already
  translated audit ASM when a local copt binary is configured.
- Added `docs/z80-external-peephole-rule-mining-2026-06-10.md` as the current
  external-rule candidate queue.

**Verification**
- Rule mining parsed 1143 Z80-relevant rules and deduped them to 1101 rewrite
  shapes.
- `audit-copt-examples.ps1` produced a report but could not run the third
  oracle because `z88dk-copt`/`copt` is not installed locally.

---

## 2026-06-10 — Legacy VDP Bridge Syntax

**Summary:** Migrated three focused lib4ksa/getput11 VDP helpers into modern
Amy syntax without exposing the old C/ASM wrapper names.

**Changes**
- Added `merge Source count N to vram.* mask M xor X` for masked VRAM uploads
  equivalent to the useful part of `_put_vram_ex`.
- Added `pset multicolor X,Y color C` and `Var = pget multicolor X,Y` for
  Mode 3 multicolor nibble pixels.
- Added pattern-table transforms: `reflect pattern ... vertical/horizontal`
  and `rotate pattern ... 90`.
- Fixed the multicolor setup to match getput11: name-table bands repeat each
  32-pattern block for 4 rows, and pixel set/get writes pattern bytes instead
  of the color table.
- Split the old mixed VDP smoke test into a pure `Amy Multicolor Pixel Lab` and
  a separate `Amy VDP Pattern Tools Lab` so Mode 3 examples do not imply that
  pattern reflect/rotate are part of multicolor drawing.
- Made `cls` context-aware for `graphics multicolor`: it clears the visible
  pattern bytes instead of the text name table.
- Added the `Amy VDP Legacy Bridge Lab` example and autocomplete/reference
  entries.
- Kept `_put_frame0` out of the language surface; Amy keeps the safe frame API.

---

## 2026-06-10 — Raw Hex Debug Surface

**Summary:** Split numeric hex values from raw memory-bit literals so fixed-point
debugging is explicit.

**Changes**
- Added `print hex Value at X,Y` for raw little-endian byte display.
- Added `format hex Value into Buffer` for raw-byte hex text generation.
- Added `raw $xxxx` / `raw $xxxxxxxx` for exact fixed/fixed32 memory-bit
  literals.
- Documented that fixed-point `$0001` is a hex value literal for the value `1`,
  while `raw $0001` means one raw 8.8 LSB.
- Added coverage in `amy-surface-coverage` and migrated fixed/fixed32 labs that
  assert exact encodings to use `raw`.

**Verification**
- `node tools/check-examples.mjs` passes: 99/99 examples.
- `node tools/check-examples.mjs --compare` passes with zero ASM drift after
  refreshing the baseline.
- `node tools/check-examples.mjs --test-types` remains stable; only `bcd *=`
  and `bcd /=` are intentionally unsupported.

---

## 2026-06-10 — Amy Language Reference Precision Pass

**Summary:** Tightened the live language reference without making the language
surface more verbose.

**Changes**
- Added explicit status tags for canonical, compatibility, removed, planned, and
  experimental forms.
- Added a compact expression precedence table and clearer signed-comparison
  guidance.
- Added a Z80-style subroutine termination rule to discourage accidental
  fall-through.
- Added local-frame and inline-ASM register/stack contracts.
- Added a VDP side-effect table for screen/display/NMI/mode/picture commands.
- Updated arithmetic coverage and division wording to match the current harness.

---

## 2026-06-10 — Random Statement Forms Retired

**Summary:** Completed the migration from `random ... into` statements to
expression-style random assignment.

**Changes**
- `random between A and B into V` now reports a migration error to
  `V = random(A, B)`.
- `random fixed32 into V`, `random fp5 into V`, and `rnd [fp5] into V` now
  report migration errors to `V = random()`.
- `random(A, B)` codegen now loads constant bounds directly and no longer emits
  the `push af` / `pop af` shuffle or dead `ld b,a` pattern flagged by MDL.
- `random(A, B)` now samples the deterministic low byte from the xorshift seed
  after `GET_RANDOM`, allowing self-checking seeded tests.
- The random expression selftest now checks the first seeded values from
  `$0033`, including a `u16` assignment target.

**Verification**
- `node tools/check-examples.mjs --test-types` passes; only `bcd *=` and
  `bcd /=` remain intentionally unsupported.
- `node tools/check-examples.mjs` passes: 98/98 examples.
- `node tools/export-studio-examples-asm.js` passes: 98/98 examples exported.
- `node tools/check-examples.mjs --compare` passes with zero ASM drift after
  refreshing the baseline.

---

## 2026-06-10 — Runtime Math Work Queued

**Summary:** Captured the next runtime-math implementation target before
starting code changes.

**Notes**
- Target missing cells: `u16 /=`, `i16 /=`, `u32 *=`, `u32 /=`, and fixed 8.8
  `*=` `/=`.
- `bcd *=` and `bcd /=` remain intentionally out of scope.
- Runtime module granularity is the acceptance bar: one routine family per
  `.asm` file, explicit Studio resolver dependencies, and no unrelated math
  linked by default.

**Verification**
- `node tools/check-examples.mjs --compare` passes: 91/91, zero ASM drift.

---

## 2026-06-10 — Inclusive `random(A, B)` Expressions

**Summary:** Added expression-style inclusive byte random ranges, so
`Die = random(1, 6)` now replaces `random between 1 and 6 into Die`.

**Changes**
- The byte expression engine now emits `random(A, B)` as an inclusive range.
- Type inference recognizes one-argument and two-argument integer `random()`
  calls as `u8` expressions.
- Added a focused `Amy Random Expression Test` Studio example.
- Updated the language references and legacy-removal plan to teach
  `random(A, B)` as the modern form.

**Verification**
- `node tools/export-studio-examples-asm.js` passes: 91/91 examples exported.

---

## 2026-06-10 — Runtime Input Expressions

**Summary:** Added expression-style `spinner(N)` and `frame`, completing the
modern input/status surface alongside `joypad(N)`, `keypad(N)`, and
`vdp.status`.

**Changes**
- `Spin = spinner(1)` and `Spin = spinner(2)` now compile as byte reads from
  the spinner runtime state.
- `Frame = frame` now compiles as a 16-bit frame-counter read, with byte targets
  receiving the low byte like the old staged command.
- Added a focused `Amy Runtime Input Expression Test` Studio example.
- The modernizer now rewrites `read spinner ... into ...`,
  `read frame into ...`, and `read vdp status into ...` to expression form.
- Updated the language references to teach expression input reads first.

**Verification**
- `node tools/export-studio-examples-asm.js` passes: 90/90 examples exported.

---

## 2026-06-10 — `min()` / `max()` Expressions

**Summary:** Added expression-style `min(A, B)` and `max(A, B)` for byte/word
integer expressions.

**Changes**
- The expression engine now infers and emits `min()` / `max()` calls for 8-bit
  and 16-bit integer values.
- Added a focused `Amy Min/Max Expression Test` Studio example.
- The modernizer now rewrites `min X with Y` / `max X with Y` to
  `X = min(X, Y)` / `X = max(X, Y)`.
- Updated the language references to teach expression assignment instead of the
  statement forms.

**Verification**
- `node tools/export-studio-examples-asm.js` passes: 89/89 examples exported.

---

## 2026-06-09 — Fixed32 `random()` Assignment

**Summary:** Extended expression-style random assignment to `fixed32`, matching
the fp5 modernization path.

**Changes**
- `fixed32` runtime assignment now recognizes `random()` and emits
  `AMY_FX16_16_RND` followed by storage into the target.
- The modernizer now rewrites `random fixed32 into X` to `X = random()`.
- Updated fixed32 numeric examples and docs to prefer `Fixed32Var = random()`.

**Verification**
- `node tools/export-studio-examples-asm.js` passes: 88/88 examples exported.

---

## 2026-06-09 — FP5 `random()` Assignment

**Summary:** Added expression-style fp5 random assignment so `A = random()` can
replace `rnd fp5 into A`.

**Changes**
- `fp5` runtime assignment now recognizes `random()` and emits
  `AMY_FP5_RND` followed by storage into the target.
- Shared the `AMY_FP5_FPA1`-to-target store path for global and stack fp5
  targets.
- Re-enabled the modernizer rule that rewrites `rnd fp5 into X` and
  `rnd into X` to `X = random()`.
- Updated fp5 examples and docs to prefer `Fp5Var = random()`.

**Verification**
- `node tools/export-studio-examples-asm.js` passes: 88/88 examples exported.

---

## 2026-06-09 — Amy Modernizer First Pass

**Summary:** Added the first deterministic Amy source modernizer and used it to
convert safe Tier 1 syntax in built-in Studio examples.

**Changes**
- Added [tools/modernize-amy.mjs](C:/Users/Amy/Desktop/ALEXIS-Z80/tools/modernize-amy.mjs)
  with dry-run default, `--write`, `--list`, and explicit `--include-js` for
  Studio example-source strings.
- Modernized supported example syntax such as:
  - `add X by N` / `sub X by N` to `X += N` / `X -= N`
  - `random between A and B into X` to `X = random(A, B)`
  - `copy array Dst from Src` to `copy Src to Dst`
  - `put tile` to `put char`
  - `wend`, `default`, `for ... from`, and `graphics mode1` aliases
- Kept `rnd fp5 into X` unchanged because `X = random()` for fp5 targets is not
  implemented yet.

**Verification**
- `node tools/export-studio-examples-asm.js` passes: 88/88 examples exported.

---

## 2026-06-09 — Legacy Removal Plan Captured

**Summary:** Captured the external legacy-removal proposal as a staged Amy
cleanup plan and removed a few legacy examples from the teaching path.

**Changes**
- Added [amy-legacy-removal-plan-2026-06-09.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-legacy-removal-plan-2026-06-09.md)
  with Tier 1 / Tier 2 cleanup sequencing, modernizer requirement, and keep-list
  for intentional retro constructs.
- Linked the removal plan from the language-design priorities note.
- Updated the manual so section 9.3 teaches plain typed-variable printing
  instead of `print byte` / `print word` prefixes.
- Updated the manual so section 15.7 teaches `*=`, `/=`, `<<=`, and `>>=`
  instead of presenting `multiply`, `div`, `shl`, and `shr` as current style.

**Verification**
- Documentation-only change; checked the edited manual sections and removal
  plan for the intended canonical direction.

---

## 2026-06-09 — Language Critique Triage

**Summary:** Captured the external language-design critique and corrected the
documentation issues that were immediately factual.

**Changes**
- Added [amy-language-design-priorities-2026-06-09.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-language-design-priorities-2026-06-09.md)
  to track expression-engine, signed-comparison, alias, fall-through, reserved
  name, and signed-byte cleanup priorities.
- Added `fixed32` to the manual type table.
- Clarified `random(N)` as `0..N-1` and `random between A and B into Var` as
  inclusive.
- Clarified `min Var with Value` / `max Var with Value` and made `with` the
  teaching form while keeping `to` documented as an alias.
- Clarified that `on Expr goto` is 1-based and that implicit `Start` looping
  should be made explicit with `goto MainLoop` when intended.

**Verification**
- Documentation-only change; checked the referenced guide sections after edit.

---

## 2026-06-09 — Language And User Guides Refreshed

**Summary:** Updated the main Amy language guide, manual-style reference, and
Studio workflow guide for the current pre-release language surface.

**Changes**
- Removed stale public-facing `v2.1` / `v2.2` migration framing from the active
  guides.
- Reframed the manual as the current Amy reference while keeping compatibility
  notes quarantined in the compatibility ledger.
- Updated the Studio workflow guide for compact compile status, implicit
  `codec raw`, Files-tab project assets, picture preview naming, `show picture`
  / `upload picture`, DSOUND, tiny music files, and DAN2-capable picture assets.

**Verification**
- Documentation-only change; checked the active guides for stale `v2.1` /
  `v2.2` wording after editing.

---

## 2026-06-09 — Compact Compile Status

**Summary:** Reduced compile-status verbosity in Amy Studio so diagnostics do
not hide the useful result summary.

**Changes**
- Compile success now reports a compact status line and summarizes compiler
  hints as `Hints: N` instead of printing every hint inline.
- Removed public-facing `AMY v2.2 migration` wording from autocomplete details
  and compiler preference hints.
- Kept the technical warnings in compiler results; they are no longer expanded
  into the small status pane by default.

**Verification**
- Brinquitos compiles unchanged at 3222 bytes, 248 symbols, net -104 bytes.
- Full Studio example ASM export passes: 88/88.

---

## 2026-06-09 — Byte Expression Immediate Codegen

**Summary:** Improved byte expression code generation for simple operations
against constants.

**Changes**
- `u8` expressions such as `LoopI + $30` now emit direct immediate operations
  like `add a,48` instead of `push af` / load-constant / `pop af` sequences.
- The fast path covers `+`, `-`, `&`, `|`, and `^` when one side is a
  compile-time byte constant.

**Verification**
- `amy-for-putchar-test`, `amy-manual-loop-putchar-test`, and `amy-selftest`
  export and assemble.
- `amy-for-putchar-test` now assembles with no optimizer delta for this path
  (`434` raw bytes, `434` optimized bytes).
- Full Studio example ASM export passes: 88/88.

---

## 2026-06-09 — Inline Loop Tile Expressions

**Summary:** Updated loop selftests to use direct byte expressions in
`put char` instead of temporary variables.

**Changes**
- Replaced `Temp = LoopI` / `add Temp by $30` / `put char Temp ...` with
  `put char LoopI + $30 ...` in loop-focused examples.
- Removed now-unused `u8 Temp` declarations from the affected selftests.

**Verification**
- `amy-selftest`, `amy-loop-test`, `amy-for-putchar-test`, and
  `amy-manual-loop-putchar-test` export and assemble.
- Full Studio example ASM export passes: 88/88.

---

## 2026-06-09 — Brinquitos Sprite Index Expression

**Summary:** Simplified the Brinquitos cloud sprite loop to use the intended
inline sprite index expression instead of a temporary variable.

**Changes**
- Replaced `NextCloud = C` / `NextCloud += 1` / `set sprite NextCloud ...`
  with `set sprite C + 1 ...` in the Brinquitos game demo.
- Updated the Brinquitos critique notes so this old temporary-variable
  criticism is no longer presented as current.

**Verification**
- Brinquitos ASM export passes.
- Brinquitos assembles at 3222 bytes with balanced optimization.

---

## 2026-06-09 — DAN2 Compression Codec

**Summary:** Added Studio-side DAN2 compression and decompression so picture
project files using `.dan2` can be previewed and generated by tools.

**Changes**
- Added `DAN2Codec` as a JavaScript codec ported from `src/vendor/dan2.c`.
- Registered `.dan2` in the RetroCompress Lite codec catalog.
- The encoder follows the DAN2 optimal parser, including the variable high
  offset bit-width header and no DAN1 RLE literal-block mode.

**Verification**
- `commando-title-pattern.dan2` decompresses from 3501 bytes to 6144 bytes.
- `commando-title-color.dan2` decompresses from 1811 bytes to 6144 bytes.
- Recompressing both Commando title tables regenerates byte-identical `.dan2`
  streams.

---

## 2026-06-09 — Music Example Project Files

**Summary:** Migrated music-box examples away from repo-local include/asset
paths and into embedded Studio project files.

**Changes**
- `africa-music-box` now includes `@project/africa-music-data.asm`.
- `commando-music-box` now loads title graphics and music data from
  `@project/...` files instead of `assets/compressed/...` and
  `examples/vendor/...`.
- Commando title project files use the `commando-title.pattern.dan2` /
  `commando-title.color.dan2` naming convention expected by picture previews.
- `commando-tiny-music-box` now includes `@project/commando-tiny-music.asm`.

**Verification**
- Africa Music Box, Commando Music Box, and Commando Tiny Music export and
  assemble with their embedded project files.
- Full Studio example ASM export passes: 88/88.

## 2026-06-09 — Picture Start Bootstrap Fix

**Summary:** Fixed top-level `show picture` / `upload picture` statements so
they execute under the generated `Start:` entry point.

**Changes**
- top-level picture commands now open the implicit `Start:` procedure before
  emitting upload/display code.
- fixed Warrior Slideshow and Barbarian Slideshow generating picture-display
  instructions before `Start:`.

**Verification**
- Warrior Slideshow and Barbarian Slideshow ASM exports pass.
- both slideshows assemble with their embedded project files.

## 2026-06-09 — Named Text Colors

**Summary:** Added a readable text color-table helper for mode 1 text-style
games.

**Changes**
- added `set text colors Foreground on Background` with Coleco color names,
  defaulting to `count 32`.
- added optional `at N count M` so a short color-table range can be changed
  without repeated `vpoke` statements.
- updated Brinquitos to use `set text colors light green on dark blue count 32`
  and `set text colors cyan on dark blue at 6 count 2` instead of `$34`/`$74`.

**Verification**
- Brinquitos ASM export passes.
- Full Studio example ASM export passes: 88/88.

## 2026-06-09 — Sprite Definition Convenience

**Summary:** Added `define sprites Name at N` as a compact sprite16 upload
surface for game code.

**Changes**
- `define sprites BrinquitosSprites at 0` now selects `vram.spr_pat` as the
  sprite pattern table and copies the full `sprite16` data block to
  `vram.spr_pat + N*32`.
- the compiler precomputes `sprite16` block lengths, so the command can appear
  before the data block.
- updated Brinquitos to use `define sprites` instead of spelling out
  `set sprite pattern table vram.spr_pat` plus `copy ... count 128`.
- cleaned up the Brinquitos cloud placement retry loop to use the existing
  structured `do` / `loop while` form instead of a hand-written retry label.

**Verification**
- Brinquitos ASM export passes.
- Full Studio example ASM export passes: 88/88.

## 2026-06-09 — Picture Asset Priority

**Summary:** Added the first Studio + language tranche for picture assets.

**Changes**
- added `picture Name:` / `end picture` declarations with `pattern`, `color`,
  optional `name`, and raw `pattern_color` components.
- added `show picture Name` as the simple all-in-one bitmap display command:
  blank display, set bitmap mode, upload/decompress components, prepare the
  name table, then turn the screen on.
- added `upload picture Name` as the controlled form that only uploads the
  picture data and prepares `vram.name`.
- updated the compressed picture demo to use `picture WarriorPicture` instead
  of separate asset/decompress statements.
- added Files-tab picture preview for ready-to-display `.pc`, `.pattern`,
  `.color`, and `.name` files, including compressed component files such as
  `.pattern.zx0`.
- low-level `asset`, `copy`, and `decompress ... to vram.*` commands remain the
  explicit escape hatch.

**Current Limits**
- compressed combined `.pc` files can be previewed, but `show picture` currently
  supports combined `pattern_color` only when raw; compressed source-level use
  should provide separate pattern/color components.

**Deferred**
- No new immediate PSG/tone shortcut is planned; sound should keep the legacy
  sound-table/area model.

**Verification**
- Full Studio example ASM export passes: 87/87.
- `compressed-picture-demo` assembles with balanced optimization.

## 2026-06-09 — For Loop Alias

**Summary:** Amy now accepts `for I from A to B` as an optional alias for the
existing counted loop syntax, while `for I = A to B` / `next I` remains the
preferred compact form.

**Changes**
- added `from` as an alias for `=` in upward and downward `for` loops.
- updated Brinquitos to use compact `for C = 0 to MaxClouds - 1` / `next C`
  cloud-array loops instead of hand-written labels.
- optimized simple global `u8` counted loops with constant positive bounds and
  `step 1`, emitting a bottom-tested `inc (var)` / `cp end+1` loop instead of
  the generic top-tested loop.
- kept `for each` and bitwise flag operators deferred to a later phase.

**Verification**
- Brinquitos ASM export passes.
- Brinquitos assembles with balanced optimization.
- Brinquitos size with balanced optimization is now 3229 bytes, down from 3301
  with the generic `for` lowering and 3253 with the previous hand-written label
  loops.

## 2026-06-09 — Enum Constants

**Summary:** Amy now supports `enum ... end enum` as grouped compile-time
constants.

**Changes**
- added `enum Name:` blocks with entries such as `Standing = 0`.
- omitted enum values auto-increment from the previous entry, starting at `0`.
- enum entries emit the same constant symbols as `const`, so there is no runtime
  cost and existing expression/codegen paths keep working.
- updated Brinquitos to use `enum PlayerFrame`; singleton sprite pattern values
  stay as ordinary `const` declarations.
- bitwise flag operators remain deferred to a later phase; enum is currently a
  constant-grouping feature, not a strict runtime type system.

**Verification**
- Brinquitos ASM export passes.
- Full Studio example ASM export passes: 87/87.
- Brinquitos assembles at 3253 bytes with balanced optimization.

## 2026-06-09 — Record-Based Clouds In Brinquitos

**Summary:** Brinquitos now groups cloud state with an Amy `record` array
instead of parallel `CloudX` / `CloudY` / `CloudDX` arrays.

**Changes**
- added compile-time constant length support for record arrays, so
  `Cloud Clouds[MaxClouds]` works like byte arrays already did.
- rewrote Brinquitos cloud state as:
  `record Cloud: X/Y/DX` plus `Cloud Clouds[MaxClouds]`.
- updated gameplay code to use `Clouds[C].X`, `Clouds[C].Y`, and
  `Clouds[C].DX` in sprite updates, collision checks, setup, and `bounce`.
- updated the Brinquitos critique so obsolete parallel-array criticism stays in
  the historical appendix instead of the active critique.

**Verification**
- Brinquitos ASM export passes.
- Full Studio example ASM export passes: 87/87.
- A follow-up fix below completes record-field assignment and `bounce` emission;
  use that entry for the current verified binary size.

## 2026-06-09 — Signed Record Field Deltas

**Summary:** Brinquitos cloud velocity now uses an `i8` record field, so the
source can write `-2` instead of `$FE`.

**Changes**
- changed `Cloud.DX` from `u8` to `i8` in the Brinquitos example.
- replaced the leftward cloud speed assignment with `Clouds[C].DX = -2`.
- extended normal assignment parsing to accept record-field targets such as
  `Clouds[C].Y += 1` and `Clouds[C].DX = -2`.
- extended `bounce` to accept byte record fields for position and delta.
- fixed the previous record-cloud path where some record-field statements were
  falling through as `TODO Amy` comments instead of emitted code.

**Verification**
- Brinquitos ASM export passes with no `TODO Amy: Clouds` fallbacks.
- Full Studio example ASM export passes: 87/87.
- Brinquitos assembles at 3253 bytes with balanced optimization.

## 2026-06-09 — Preserve `set sprite` Inline Operands

**Summary:** Fixed non-constant `set sprite` generation so inline expressions
cannot overwrite earlier sprite operands before `AMY_SET_SPRITE`.

**Changes**
- `set sprite NextCloud to CloudY[C] - 1, CloudX[C] - 8, ...` now stages
  Y/X/pattern/color safely before restoring `B/C/D/E` for the runtime helper.
- This fixes Brinquitos cloud Y coordinates being corrupted by the X expression
  using `B` as a scratch register.

**Verification**
- Brinquitos ASM export passes.
- Full Studio example ASM export passes: 87/87.
- Brinquitos assembles at 2871 bytes with balanced optimization.

## 2026-06-09 — Byte `abs(...)` Expressions

**Summary:** Amy now supports byte-sized `abs(...)` expressions in gameplay
comparisons and assignments.

**Changes**
- `if abs(CloudX[C] + 1 - PlayerX) < 8 then` compiles without helper variables.
- Brinquitos no longer needs `TempA`, `TempB`, `Distance`, or `abs_diff`.
- Brinquitos cloud setup now uses `CloudX[C] = random(96) * 2 + 32`.
- Brinquitos shrinks from 2928 bytes to 2847 bytes after the source cleanup and
  byte-compare codegen fix.

## 2026-06-09 — Cleaner Brinquitos Source

**Summary:** Brinquitos now leans harder on Amy source-level conveniences instead
of preserving CVBasic-port scaffolding.

**Changes**
- fixed-size arrays accept compile-time constant lengths, so `u8 CloudX[MaxClouds]`
  works and RAM accounting still resolves to the final byte count.
- Brinquitos uses `CloudX[MaxClouds]`, `CloudY[MaxClouds]`, and
  `CloudDX[MaxClouds]` instead of repeating literal `4`.
- Brinquitos sprite updates now use inline byte expressions in `set sprite`,
  removing the temporary setup lines around `TempA`/`TempB`.

## 2026-06-09 — Compact CVBasic MUSIC Stop Streams

**Summary:** The CVBasic MUSIC converter no longer emits a 32-byte zero tail for
`MUSIC STOP` tiny streams.

**Why this matters**
- one-shot tracks such as Brinquitos `music_end` now rely on the song-table
  duration plus silence override, with only one safe boundary no-op byte.
- `brinquitos_music_end_ch1` drops from a long padded byte list to
  `db $13,$0E,$07,$00,$00,$00,$01,$00`.

## 2026-06-09 — Generalized Bounce Delta

**Summary:** Updated `bounce Position by Delta between Min and Max` so `Delta`
can be any signed byte step, not only `1` / `$FF`.

**Follow-up**
- `bounce` now accepts indexed byte array elements such as `CloudX[C]` and
  `CloudDX[C]`.
- the Brinquitos Amy port now uses `CloudDX = 2/$FE` plus `bounce` for cloud
  movement instead of manual direction-state branches.
- `data ... bitmap8` and `data ... sprite16` names are now registered during
  first-pass scanning, so `copy SpriteData count N to vram.spr_pat` resolves to
  the generated `AMY_UDATA_*` label correctly.
- Brinquitos now uses `copy BrinquitosSprites count 128 to vram.spr_pat`
  instead of an inline ASM `WRITE_VRAM` block.

**Why this matters**
- Brinquitos-style moving platforms can use `2` / `$FE` speed without calling
  `bounce` twice or keeping separate direction-state branches.
- Existing `1` / `$FF` bounce programs keep the same behavior.

---

## 2026-06-09 — CVBasic MUSIC to Tiny Sound Converter

**Summary:** Added a first command-line converter for simple CVBasic `MUSIC`
blocks into Amy-compatible `SPECIAL-04` tiny sound data.

**What changed**
- new `tools/convert-cvbasic-music.mjs` parser/converter for `DATA BYTE` +
  `MUSIC` blocks
- supports up to two tonal channels, fixed tempo rows, `S` sustain, `-` silence,
  `MUSIC REPEAT`, and `MUSIC STOP`
- generated ASM exposes a sound table plus `play song` labels that work with
  the existing `sndtiny_1` / `sndtiny_2` runtime path
- new `tools/test-cvbasic-music-converter.mjs` covers a small fixture and the
  attached Brinquitos CVBasic music source

**Why this matters**
- this gives Amy Studio a deterministic bridge from very regular CVBasic music
  into compact ColecoVision sound data
- it avoids guessing the larger lib4ksa/Bios sound stream format and uses the
  tiny sound runtime that Amy already validates with Commando
- it establishes the command-line core needed for a later Studio import button

**Follow-up**
- added `brinquitos-tiny-music-demo`, a Studio-visible example that plays the
  converted Gladiators loop and one-shot game-over cue
- widened tiny-sound source detection so `*-tiny-music.asm` includes activate
  the `sndtiny_1` / `sndtiny_2` runtime automatically
- embedded the generated Brinquitos ASM as a project file for the Studio demo,
  so compilation does not depend on serving `examples/generated/...` over HTTP
- corrected CVBasic note-to-`SPECIAL-04` mapping to use the tiny runtime's real
  code-to-period transform instead of treating data-table indexes as note codes
- added whole-channel loop phrase compression for repeated `MUSIC REPEAT`
  channels; Brinquitos bass compresses from 64 row bytes to a 4-byte phrase
- aligned conversion with CVBasic's 3.58 MHz SN76489 note-period table and
  emits tiny tempo at `DATA BYTE * 2`, matching Brinquitos closer to the
  original playback speed
- retuned the CVBasic import default to convert PAL-timed music to NTSC
  playback (`50Hz->60Hz`, `DATA BYTE * 1.2`) with a `+3` tiny note-code offset
  after comparison with the original Brinquitos playback

## 2026-06-08 — Balanced LDI Byte-Copy Peephole

**Summary:** Added a guarded balanced-level ASM optimizer fold for byte-copy
steps that MDL repeatedly identified in fp5 library output.

**What changed**
- the optimizer can rewrite:
  - `ld a,(hl)`
  - `ld (de),a`
  - `inc hl`
  - `inc de`
- into:
  - `ldi`
  - `inc bc`
- the rule is gated behind `localValueReuse`, so it is active at `balanced` and
  above, not `safe`
- the rule only fires when the existing flag-liveness scan proves flags are
  dead before their next use

**Why this matters**
- the rewrite preserves the final `HL`, `DE`, and `BC` values while saving 1
  byte per matched copy step
- unlike `bit 7,a` -> `rla`, this does not alter `A`; the remaining semantic
  risk is flags, which the guard checks explicitly
- the FP5 audit gains 45 bytes total across 15 examples with no corpus export
  failures

## 2026-06-08 — Balanced Dead-A Transfer Peephole

**Summary:** Added a conservative balanced-level fold for `A` as a temporary
copy register when `A` is proven dead immediately after the transfer.

**What changed**
- the optimizer can rewrite `ld a,src / ld dst,a` into `ld dst,src`
- the rule supports only plain 8-bit registers and immediates; memory operands
  and special `I/R` transfers are deliberately excluded
- the rule is gated behind `localValueReuse`, so it is active at `balanced` and
  above, not `safe`
- `isRegisterDeadBeforeNextUse` now treats `xor a` as a complete overwrite of
  `A`, allowing the existing liveness helper to prove the old `A` value dead

**Why this matters**
- the rewrite preserves flags and the destination value
- it avoids the unsafe MDL-style `bit 7,a` / `rla` family and only removes `A`
  transfers when the old/final `A` value is irrelevant
- the FP5 audit gains another 15 bytes total across 15 examples with no corpus
  export failures

## 2026-06-09 — Balanced Known-Half Register-Pair Load Peephole

**Summary:** Added a conservative balanced-level fold for `LD rr,imm16` when
one half of the register pair is already known to contain the required byte.

**What changed**
- the optimizer can rewrite cases such as `ld de,$1000` into `ld d,$10` when
  `E` is proven to already be `$00`
- proof can come from a prior `ld e,0` or prior `ld de,$0800`
- the lookback stops on labels, calls, jumps, returns, loops, or any instruction
  that writes the target register pair
- the rule is gated behind `localValueReuse`, so it is active at `balanced` and
  above, not `safe`

**Why this matters**
- the rewrite preserves flags and the final register-pair value
- it closes the final 1-byte MDL advantage in `amy-float-storage-lab`
- the targeted FP5 audit now has zero MDL wins; AMY built-in is smaller than MDL
  on all 19 FP5 examples
- measured gain versus the previous balanced optimizer is 30 bytes across the
  FP5 audit set, with no corpus export failures

## 2026-06-09 — Fixed32 Formatter Fraction Setup Cleanup

**Summary:** Simplified the fixed16/fixed32 hundredths formatter setup in the
hand-written ASM library.

**What changed**
- `AMY_FX16_16_FRAC_TO_HUNDREDTHS` now uses `ld l,h / ld h,0` instead of
  `ld a,h / ld h,0 / ld l,a`
- regenerated the browser-side Alexis library source catalog

**Why this matters**
- the final `A` result is still produced by the later `ld a,h` before `ret`
- the setup now emits one fewer byte without relying on a generic optimizer
  liveness proof
- targeted fixed32 MDL audit passed 5/5; the change saves 1 byte in four of the
  five fixed32 canaries

## 2026-06-09 — Fixed32 Multiply Helper Zero Setup Cleanup

**Summary:** Simplified two fixed32 multiply helper zero-initialization sites in
the hand-written ASM library.

**What changed**
- replaced two `ld h,0 / ld l,0` sequences with `ld hl,0`
- regenerated the browser-side Alexis library source catalog

**Why this matters**
- the raw library source now emits the compact form directly instead of relying
  on a later peephole fold
- targeted fixed32 MDL audit passed 5/5
- raw fixed32 canary output shrinks by 2 bytes per affected example; balanced
  final ROM size is unchanged because the built-in optimizer already folded
  this pattern

## 2026-06-09 — Balanced Delayed IX Local Reload Peephole

**Summary:** Added a guarded balanced-level peephole for redundant reloads of
`A` from the same IX/IY local that was just written.

**What changed**
- the optimizer can remove a short delayed `ld a,(ix+d)` after `ld (ix+d),a`
  when `A` is still known to hold that value
- the lookahead is deliberately small and stops on labels, calls, jumps,
  returns, memory writes, `A` touches, or IX/IY base changes
- the rule is gated behind `localValueReuse`, so it is active at `balanced` and
  above, not `safe`

**Why this matters**
- closes the remaining 3-byte MDL gap in `amy-bcd-selftest`
- preserves flags because the removed `ld a,(ix+d)` did not affect flags
- corpus export passed 85/85 after the change

## 2026-06-09 — Fixed32 Divide Sign Toggle Cleanup

**Summary:** Simplified the fixed32 divide sign-toggle path in the hand-written
ASM library.

**What changed**
- `AMY_FX16_16_DIV_CHECK_RIGHT` now toggles `AMY_FX16_SIGN` through `HL`
  instead of using two absolute `A` memory accesses
- regenerated the browser-side Alexis library source catalog

**Why this matters**
- `HL` is immediately reloaded with `AMY_FX16_WORK_B`, so the temporary address
  clobber is local and intentional
- targeted fixed32 MDL audit passed 5/5
- `amy-fixed32-divide-lab` shrinks by 1 byte at balanced level

## 2026-06-08 — FP5 Multiply Precision Fix

**Summary:** Replaced the native fp5 multiply product builder with a direct
32x32 -> 64-bit bit-loop so self-square recovery keeps the high mantissa bits.

**What changed**
- `AMY_FP5_MUL_FPA1_FPA2` now builds the 64-bit product directly from two
  32-bit mantissas
- the multiply scratch layout no longer overlaps sign/exp with the product
  builder work area
- direct fp5 multiply users now include the shared fp5 64-bit helper module
- added a regression check that fp5 multiply does not call the shared 16x16
  helper path
- regenerated the browser-side library source catalog

**Why this matters**
- `sqrt(65535)` already produced the correct fp5 bytes, but squaring that value
  returned `65279`; the loss was in multiply, not sqrt
- the new path favors correctness over a small ROM-size increase

## 2026-06-08 — FP5 Sqrt Scratch Overlap Fix

**Summary:** Fixed an internal fp5 square-root scratch collision that affected
large values such as the `amy-float-sqrt-precision-lab` `65535` case.

**What changed**
- `AMY_FP5_SQRT_MEM` no longer stores exponent parity in `AMY_FP5_EXP_K`
- the sqrt pack step recomputes exponent parity from the source fp5 value
- added a regression check to keep sqrt from reusing the overlapped scratch byte
- regenerated the browser-side library source catalog

**Why this matters**
- the sqrt routine uses the full 32-byte `AMY_BUFFER32` work area; writing
  `AMY_FP5_EXP_K` at `AMY_BUFFER32+23` overlapped `AMY_FP5_SQRT_BIT+7`

## 2026-06-08 — FP5 Divide Mantissa Fix

**Summary:** Fixed native fp5 divide normalization so quotients keep their
mantissa instead of collapsing to nearby powers of two.

**What changed**
- `AMY_FP5_DIV_FPA1_FPA2` now builds a full 32-bit quotient
- the divide loop compares/subtracts before shifting the remainder, preserving
  the integer mantissa bit
- the denominator is copied before the remainder scratch area overwrites the
  shared fp5 accumulator buffer
- the numerator sign/mantissa byte is saved before the denominator scratch area
  overlaps the source accumulator
- regenerated the browser-side library source catalog

**Why this matters**
- cases such as `100 / 4`, `10 / 1`, `10 / 3`, and `1000 / 10` no longer
  collapse to `16`, `8`, `4`, and `64`

## 2026-06-08 — Native FP5 Divide Codegen

**Summary:** FP5 `/=` now uses the native fp5 divide helper instead of the
fixed16 bridge.

**What changed**
- `fp5 A /= B` now emits `AMY_FP5_DIV_FPA1_FPA2`
- added a regression check that the divide truth lab does not call
  `AMY_FX16_16_DIV`

**Why this matters**
- `10 / 3` no longer quantizes through 16.16 precision before returning to fp5
- the earlier native-divide hang was consistent with the optimizer BC boundary
  bug fixed separately, not with an inherent fp5 format limit

## 2026-06-07 — Optimizer BC Boundary Fix

**Summary:** Fixed an unsafe optimizer fold that could make optimized builds
copy too many bytes with `ldir`.

**What changed**
- `ld bc,00nn -> ld c,nn` tracking now stops at labels and control-flow
  boundaries such as `ret`, `jp`, `jr`, `djnz`, and `call`
- extended the FP5 convert regression test with a minimal optimizer boundary
  fixture

**Why this matters**
- callable routines must not inherit `B=0` from a previous routine's `ldir`;
  doing so corrupted memory in optimized FP5 convert builds before display

## 2026-06-07 — FP5 Convert Init Pruning Fix

**Summary:** Fixed a dead-init pruning bug that made the FP5 convert lab show
all-zero raw bytes.

**What changed**
- RAM initializers are now retained when a scalar variable is passed by address
  to a memory-reading helper such as `AMY_FP5_LOAD_U16_MEM_TO_FPA1`
- added a regression script for `Amy FP5 Convert Lab` init retention

**Why this matters**
- `fp5 F = UOne` depends on the initialized value of `UOne`; pruning that init
  silently converted every tested value as zero

## 2026-06-07 — Native FP5 Self-Square Codegen

**Summary:** FP5 self-square now uses the native fp5 multiply helper instead of
the previous small-exponent fixed16 shortcut.

**What changed**
- `fp5 A *= A` and `fp5 A ^= 2` now emit `AMY_FP5_MUL_FPA1_FPA2`
- removed the previous small-exponent fixed16 shortcut for fp5 self-square
- marked the existing AHL fp5 benchmark numbers as needing re-measurement
- `fp5 A /= B` was kept on the fixed16/fixed32 bridge at this point; it was
  moved to the native fp5 divide helper after the optimizer BC boundary fix

**Why this matters**
- the AHL benchmark repeatedly does `sqrt` followed by self-square, so bridge
  truncation directly hurt fp5 accuracy
- it kept the self-square improvement isolated while the native divide hang was
  still under investigation

## 2026-06-07 — FP5 AHL Accuracy Reference Conditions

**Summary:** Added a deterministic reference tool and test plan for improving
AMY `fp5` accuracy without guessing from one benchmark number.

**What changed**
- added `tools/fp5-ahl-reference.mjs`
- added `docs/fp5-accuracy-test-plan-2026-06-07.md`
- separated AHL arithmetic fidelity from random-generator fidelity
- documented that current `AMY_FP5_RND` still uses the same 16-bit seed family
  as fixed32 random

**Why this matters**
- future fp5 runtime changes can be compared against a stable `double` and
  `fp5-ideal` reference
- random score limitations can be identified separately from sqrt/multiply/divide
  accuracy problems

## 2026-06-07 — Graphics Tooling Inventory For Amy Studio

**Summary:** Added a targeted inventory of Amy's older graphics tools and
conversion references to guide future Amy Studio picture import and preview
work.

**What changed**
- documented ICVGM v2/v3/DOS as useful history for charset/font/tile workflows
- documented Amy's CV Paint Studio and convert9918 as references for
  pattern/color formats, SC2/PC imports, dithering, and TMS9918 rendering
- identified `.pc`, `.pattern`, `.color`, and `.sc2` as the best first graphics
  asset targets for Amy Studio
- clarified that static picture preview can render decoded VRAM tables directly
  and does not require full emulator integration

**Why this matters**
- gives the next graphics work a concrete path:
  ready-to-display picture assets first, bitmap conversion later
- connects existing `asset` + `decompress ... to vram.*` language support with
  a future Studio wizard and file preview workflow

## 2026-06-07 — Shared Record-Array Put-Char Codegen

**Summary:** Record-array field reads feeding a single `put char` now share one
element-base calculation instead of recomputing the same scaled index three
times for `Tile`, `X`, and `Y`.

**What changed**
- added a finalization/codegen compaction pass for the exact straight-line
  pattern:
  - `put char Pieces[I].Tile at Pieces[I].X,Pieces[I].Y`
  - and the nested-record equivalent
- the pass now rewrites three repeated record-array field loads into:
  - one array-element base calculation
  - sequential `ld e,(hl) / inc hl / ld d,(hl) / inc hl / ld a,(hl)`
- removed an experimental `push af/pop af` optimizer idea after proving the
  current built-in optimizer already handled those cases

**Observed result**
- `record-array-minimal`
  - before: raw `499`, built-in `480`, MDL `424`
  - after: raw `455`, built-in `436`, MDL `424`
- `nested-record-array-minimal`
  - before: raw `499`, built-in `480`, MDL `426`
  - after: raw `455`, built-in `436`, MDL `426`

**Why this matters**
- this is a real codegen fix, not just another peephole
- the built-in vs MDL gap on the two record canaries dropped from:
  - `56 -> 12` bytes
  - `54 -> 10` bytes
- full example export and balanced MDL audit still pass

## 2026-06-07 — `LD DE,2` Folded To `INC DE` When `DE=1` Is Still Known

**Summary:** The built-in optimizer now reuses a still-known `DE=1` state to
replace later `ld de,2` with `inc de` in local record-init patterns.

**What changed**
- refined `DE` immediate tracking so plain reads like `add hl,de` no longer
  destroy the known-immediate state
- added a narrow peephole:
  - if `DE` is still known to be `1`
  - and a later instruction is `ld de,2`
  - rewrite it to `inc de`

**Observed result**
- `record-array-minimal`
  - before this peephole: raw `455`, built-in `436`, MDL `424`
  - after this peephole: raw `455`, built-in `432`, MDL `424`
- `nested-record-array-minimal`
  - before this peephole: raw `455`, built-in `436`, MDL `426`
  - after this peephole: raw `455`, built-in `432`, MDL `426`

**Why this matters**
- the remaining record canary gap dropped again:
  - `12 -> 8` bytes
  - `10 -> 6` bytes
- full example export still passes
- balanced MDL audit still passes

## 2026-06-06 — `struct` Added As A Friendly Alias For `record`

**Summary:** AMY now keeps `record` as the canonical structured-data keyword
while accepting `struct` / `end struct` as familiarity aliases for programmers
coming from C-like languages.

### What changed

- updated [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - record parsing now accepts:
    - `record Name: ... end record`
    - `struct Name: ... end struct`
- updated [studio/core/editor/autocompleteCatalog.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/editor/autocompleteCatalog.js)
  - added canonical `record` examples
  - added `struct` alias examples with wording that keeps `record` as the preferred Amy spelling
- updated:
  - [docs/amy-language.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-language.md)
  - [docs/amy-v2.1-reference-manual.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-v2.1-reference-manual.md)
  - removed stale wording that still treated records / arrays of record as wholly future work

### Language direction

- `record` stays the friendly, compact, canonical AMY keyword
- `struct` exists as an accepted alias for programmer familiarity
- this keeps the source language easy to read without fighting habits from other languages

---

## 2026-06-06 — Nested Global Record Fields Added

**Summary:** AMY records can now contain previously defined records as fields,
so global arrays of record can use nested paths such as `Pieces[I].Pos.X`.

### What changed

- updated [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - record field declarations now accept previously defined record types
  - nested record fields contribute their full byte size to parent layout
- updated:
  - [studio/core/compiler/valueParseHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/valueParseHelpers.js)
  - [studio/core/compiler/loadStoreHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/loadStoreHelpers.js)
  - nested member paths now resolve cumulative field offsets such as `Piece.Pos.X`
- added a new shipped canary example:
  - [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js)
  - `Nested Record Array Minimal`

### Validation

- `node tools/export-studio-examples-asm.js` → `84/84`
- `pwsh -ExecutionPolicy Bypass -File tools/audit-mdl-examples.ps1 -Level balanced` → `Succeeded: 84 / Failed: 0`

### Current limits

- still global-only
- no arrays inside a record yet
- no local record variables yet
- no wider record field families beyond the current byte/word/bool plus nested-record subset

---

## 2026-06-02 — Fresh MDL Analysis Replaced Stale Constant-Reuse Story

**Summary:** A direct investigation of the remaining MDL gap confirmed that the
older `ld a,#N -> ld a,c` explanation had become stale. A fresh MDL analysis was
run against the current balanced audit, and the remaining gap is now understood
to be driven primarily by hazardous `inc/dec (hl)` folds, `bit -> rla`
rewrites, `ldi` substitutions, and a few residual local register-fact wins.

### What changed

- ran:
  - `node tools/analyze-mdl-audit.js`
- refreshed current analysis artifacts:
  - [build/mdl-audit/mdl-analysis.md](C:/Users/Amy/Desktop/ALEXIS-Z80/build/mdl-audit/mdl-analysis.md)
  - [build/mdl-audit/mdl-analysis.json](C:/Users/Amy/Desktop/ALEXIS-Z80/build/mdl-audit/mdl-analysis.json)
- recorded the findings in:
  - [docs/findings-trace-constant-reuse-2026-06-02.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/findings-trace-constant-reuse-2026-06-02.md)

### What was learned

- the older small-constant reuse target (`ld a,#06/#07/#13 -> ld a,c`) is no
  longer the main active explanation for the current top gaps
- `AMY_U16_TO_ASCII5_COUNT_SUB` remains a real helper-preservation fact
  (`BC` preserved), but still has no measurable payoff at its call sites
- future callee-clobber work must start from the **current** MDL analysis and
  exact current diff sites, not from older snapshots

### Current top MDL wins

- `amy-float-builtin-surface-lab` : `6374 -> 6353` (`-21`)
- `amy-float-log-lab` : `4713 -> 4696` (`-17`)
- `amy-float-muldiv-lab` : `4756 -> 4739` (`-17`)
- `amy-fixed32-divide-lab` : `2358 -> 2347` (`-11`)

### Power-outage resume note

If work stops during optimizer investigation, read these first:

1. [docs/ai-project-orientation.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/ai-project-orientation.md)
2. [docs/claude-studio-handoff.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/claude-studio-handoff.md)
3. [docs/claude-validation-and-next-steps-2026-06-01.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/claude-validation-and-next-steps-2026-06-01.md)
4. [docs/findings-trace-constant-reuse-2026-06-02.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/findings-trace-constant-reuse-2026-06-02.md)
5. [build/mdl-audit/mdl-analysis.md](C:/Users/Amy/Desktop/ALEXIS-Z80/build/mdl-audit/mdl-analysis.md)

## 2026-06-02 — Narrow `LDIR/LDDR` BC=0 Promotion To Balanced

**Summary:** Re-evaluated whether post-`LDIR/LDDR` `BC=0` reuse was truly
speculative. Conclusion: the postcondition itself is architectural Z80 truth,
so Amy Studio now allows this one narrow reuse at `balanced` without promoting
the rest of speculative register tracking.

### What changed

- updated [studio/core/optimization.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/optimization.js)
  - `balanced` now explicitly includes proven `LDIR/LDDR BC=0` reuse
- updated [studio/vendor/amyscvassembly/optimizerCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/vendor/amyscvassembly/optimizerCore.js)
  - added a narrow config gate for block-copy `BC=0` reuse
  - kept the rest of `speculativeValueReuse` at `aggressive`
- updated investigation / plan docs:
  - [docs/codex-investigation-amy-fixed32-sqrt-lab-2026-06-02.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/codex-investigation-amy-fixed32-sqrt-lab-2026-06-02.md)
  - [docs/plan-optimizer-next-2026-06-01.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/plan-optimizer-next-2026-06-01.md)

### Why this is not treated as speculative anymore

- on Z80, normal completion of `LDIR` / `LDDR` leaves `BC = 0`
- that fact is not a heuristic or value guess
- the only promoted reuse is:
  - when `B` is known zero from `LDIR/LDDR`, reduce `ld bc,00nn` to `ld c,nn`

### Validation

- `node tools/export-studio-examples-asm.js` → `81/81`
- `pwsh -ExecutionPolicy Bypass -File tools/audit-mdl-examples.ps1 -Level balanced` → `81/81`

### Measured result

- `amy-fixed32-sqrt-lab`
  - before: built-in `2966`, MDL `2945`, gap `-21`
  - after: built-in `2949`, MDL `2945`, gap `-4`

### Boundary kept in place

- this does **not** promote:
  - general `ld a,n -> ld a,c`
  - broad zero-value reuse
  - other speculative register facts
- those remain outside default `balanced`

## 2026-06-02 — Local Reuse Window Hypothesis Refuted

**Summary:** The proposed `SHORT_LOCAL_REUSE_WINDOW = 10` follow-up was tested
and then formally refuted. The candidate sites in `amy-fixed32-divide-lab`
cross `call` barriers, so widening the local scan window does not unlock the
claimed wins.

### What was learned

- Codex already measured:
  - export `81/81`
  - audit `81/81`
  - no measurable improvement from `5 -> 10`
- Claude then proved why:
  - the relevant `localValueReuse` scan stops at `call`
  - so the window length is not the limiting factor

### Implication

- keep `SHORT_LOCAL_REUSE_WINDOW = 5`
- do not treat that hypothesis as an open `balanced` action anymore
- remaining math-helper gaps are still mostly:
  - `bit -> rla` rewrites outside `balanced`
  - value tracking across calls (`aggressive`)
  - `HL`-clobbering memory folds (`hazardous`)

### Key docs

- [docs/claude-proof-window-refuted-2026-06-02.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/claude-proof-window-refuted-2026-06-02.md)
- [docs/codex-investigation-amy-float-muldiv-lab-2026-06-02.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/codex-investigation-amy-float-muldiv-lab-2026-06-02.md)

## 2026-06-01 — Optimizer Parens Fix And Peephole Session

**Summary:** Closed the main structural bug in the built-in peephole optimizer
and added dead-reload elimination for IX-indexed stack locals. Built-in now
beats MDL on `amy-function-selftest` and `amy-recursive-selftest`.

### Commits this session

- `de91569` — Phase 1.1e/1.1f: dead ix-indexed A/HL reload elimination
- `1b606a4` — Fix ix-operand parens bug across all optimizer patterns;
  implement missing `readsIndexedOffset` / `writesIndexedOffset` helpers
- Several docs commits: session report, catalog survey, plan, findings

### Root cause fixed

All indexed memory operands in the tokenizer are stored **without** outer
parens (`ix-2` not `(ix-2)`). `parseIndexedDisplacement` and two other sites
in `optimizerCore.js` assumed the parenthesised form and silently returned
null for every indexed-slot pattern. This blocked 17+ callsites.

### Net optimizer results (balanced, 81/81)

| Example | Before | After | Delta |
|---|---:|---:|---:|
| `amy-function-selftest` | 2614 | 2584 | **-30** |
| `amy-recursive-selftest` | 629 | 617 | **-12** |
| `checkers` | 4511 | 4502 | **-9** |

`amy-function-selftest` MDL gap: -23 → **+7** (built-in now beats MDL).
`amy-recursive-selftest` MDL gap: -7 → **+5** (built-in now beats MDL).

### BIOS/VDP fixes (earlier in session, by Codex)

- `bca4724` — Remove unnecessary A loads before WRITE_VRAM
- `1b5d871` — Bypass VRAM count fix for byte-sized writes
- `b527f04` — Route large READ_VRAM counts through wrapper
- `cd2f21c` — Remove lingering WRITE_VRAM A-load

These corrected the `_WrtVRAM` / `_ReadVRAM` count bug handling in the
compiler. `WRITE_VRAM EQU $1FDF` is the buggy raw BIOS routine.
`AMY_COPY_BYTES_TO_VRAM` carries the fix; byte-sized counts bypass it safely.

### What was investigated but not changed

- **Push/pop BC/DE in math helpers**: the existing pass at line ~3598
  (`instructionSafeBetweenPushPop`) already handles these. All surviving
  push/pop pairs in the math helpers have the register genuinely modified
  in the block.
- **Remaining math gaps (-16 to -22)**: primarily register value tracking
  and HL-liveness proofs — aggressive-level, not targeted at balanced.

### Key docs to read after a power outage

1. `docs/ai-project-orientation.md` — project overview and workflow
2. `docs/claude-validation-and-next-steps-2026-06-01.md` — Codex validation
   and mandatory methodology for new peepholes
3. `docs/plan-optimizer-next-2026-06-01.md` — joint plan status
4. `docs/claude-task-b-findings-2026-06-01.md` — Task B findings

---

## 2026-05-24 — FP5 Log Cleanup And Exp Backlog

- moved the current fp5 `exp` improvement work out of the active tranche and recorded it as deferred backlog work in [docs/amy-current-version.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-current-version.md)
- recorded `log` improvement alongside `exp` as backlog-quality future work, while keeping the current first-pass `log` helper active
- cleaned the first fp5 `log` helper in [src/alexis_lib/coleco_math_fp5.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math_fp5.asm) so it no longer converts a fixed32 `ln(2)` constant at runtime:
  - replaced the fixed32 bridge constant with a native fp5 `ln(2)` constant
  - kept the rest of the first-pass fp5 `log` structure unchanged
  - this makes the exponent contribution path fully fp5 end-to-end
- added `Amy FP5 Sign / Int Lab` in [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) and [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js) to verify the already-implemented fp5 `sgn` and `int` helpers with exact expected results
- verified the current fp5 helper tranche through the example labs:
  - `Amy FP5 Abs Lab`
  - `Amy FP5 Sign / Int Lab`
  - `Amy FP5 Sqrt Lab`
  - `Amy FP5 Log Lab`
  - `Amy FP5 Exp Lab` kept explicitly in experimental-smoke-test status only

---

## 2026-05-24 — FP5 Documentation And Surface Consolidation

- promoted `fp5` in docs and examples as the preferred source spelling for the historical 5-byte real type, while keeping `float` accepted as a compatibility alias
- kept the internal example IDs and project names on the historical `amy-float-*` pattern for compatibility, while continuing to normalize the visible user-facing example names to `FP5`
- updated the current-state docs to reflect the verified fp5 formatting split:
  - exact/debug output through `print Value ... digits 16`
  - friendly/public decimal text through `str$ Value into Buffer`
- added the first native fp5 control-flow comparison path:
  - new runtime helper `AMY_FP5_CMP_FPA1_FPA2` in [src/alexis_lib/coleco_math_fp5.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math_fp5.asm)
  - compiler support for fp5 comparisons in [studio/core/compiler/fx16Helpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/fx16Helpers.js), [studio/core/compiler/controlFlowHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/controlFlowHelpers.js), and [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - current direct support covers fp5-vs-fp5 and fp5-vs-integer-literal control-flow comparisons
- added `amy-float-compare-lab` / `Amy FP5 Compare Lab` in [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) and [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js) as a dedicated fp5 comparison smoke test
- refreshed the current-version note, user-facing language reference, reference manual, fp5 runtime contract, SmartBASIC fp5 guide, and root README so they describe the same current fp5 reality
- expanded parser/editor acceptance so `fp5` is now a first-class built-in spelling in:
  - [studio/core/compiler/typeSymbolHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/typeSymbolHelpers.js)
  - [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - [studio/core/editor/autocompleteCatalog.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/editor/autocompleteCatalog.js)
- extended fp5 random statement parsing:
  - `random fp5 into Var`
  - `rnd fp5 into Var`
  - `random float into Var` remains accepted
  - implemented in [studio/core/compiler/randomBounceStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/randomBounceStatementHelpers.js)
- updated the main fp5 showcase examples to teach `fp5` directly instead of only `float`:
  - [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js)
  - [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js)

## 2026-05-19 — Refactor Progress

- started tranche-1 source/runtime scaffolding for the future 5-byte `float` type:
  - `float` is now recognized as a canonical AMY source type
  - compiler/runtime sizing now reserves 5 bytes for `float` storage
  - global and local `float` variables now allocate proper storage and support zero initialization plus float-to-float copy
  - added the first real `fp5` runtime module in [src/alexis_lib/coleco_math_fp5.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math_fp5.asm):
    - zero/copy/load/store helpers
    - `u16 -> float`
    - `i16 -> float`
  - added byte-level smoke labs:
    - `amy-float-storage-lab`
    - `amy-float-convert-lab`
  - unsupported surfaces are now rejected explicitly instead of falling through integer paths:
    - `float` arrays
    - non-zero/non-copy `float` initialization
    - `float` parameters and return types in subroutines/functions
  - touched:
    - [studio/core/compiler/typeSymbolHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/typeSymbolHelpers.js)
    - [studio/core/compiler/procHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/procHelpers.js)
    - [studio/core/compiler/declarationStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/declarationStatementHelpers.js)
    - [studio/core/compiler/runtimeValueHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/runtimeValueHelpers.js)
    - [studio/core/compiler/typeInferenceHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/typeInferenceHelpers.js)
    - [studio/core/compiler/firstPassScanHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/firstPassScanHelpers.js)
    - [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
    - [studio/core/editor/autocompleteCatalog.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/editor/autocompleteCatalog.js)

- added statement-style fixed32 fractional random support:
  - `random fixed32 into Var` now compiles to `AMY_FX16_16_RND` and stores a `0.0 .. <1.0` fixed32 sample
  - wired through [studio/core/compiler/fx16Helpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/fx16Helpers.js), [studio/core/compiler/randomBounceStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/randomBounceStatementHelpers.js), and [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - added `amy-fixed32-random-lab` in [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) and [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js) as a focused smoke test
- added statement-style fixed32 absolute value support:
  - `abs Value into Target` now compiles for fixed32-capable source/target pairs
  - wired through [studio/core/compiler/fx16Helpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/fx16Helpers.js), [studio/core/compiler/printFormatStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/printFormatStatementHelpers.js), and [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - added `amy-fixed32-abs-lab` in [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) and [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js) as a focused smoke test
- expanded the live `fixed32` surface toward production arithmetic:
  - implemented compiler-routed `fixed32 *= ...` through [studio/core/compiler/fx16Helpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/fx16Helpers.js), [studio/core/compiler/assignmentArithmeticHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/assignmentArithmeticHelpers.js), and [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - replaced the old placeholder `AMY_FX16_16_MULT` in [src/alexis_lib/coleco_math_fx16.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math_fx16.asm) with a real signed 16.16 multiply that builds a 64-bit absolute product and writes back the middle 32 bits
  - expanded [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) and [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js) so `amy-fixed32-selftest` now covers whole and fractional multiplication in addition to signed add/subtract and whole-value sqrt
- added `amy-fixed32-multiply-lab` as a dedicated fixed32 multiply-debug screen covering multiply-by-zero, one, two, one-half, and signed combinations so the broken multiply path can be diagnosed case by case
- added `amy-fixed32-multiply-bytes` as a second fixed32 multiply-debug screen that prints both the decimal result and the raw `[3][2][1][0]` bytes, so multiply failures can be distinguished from formatting issues
- added `copy bytes of Value to Buffer` to the compiler for scalar RAM values (`u8/i8`, `u16/i16/fixed/ufixed`, `u32/i32/fixed32`) so AMY code can inspect raw little-endian bytes without ad hoc casts
- documented `copy bytes of Value to Buffer` as a user-facing debugging technique in:
  - [docs/amy-language.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-language.md)
  - [docs/amy-v2.1-reference-manual.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-v2.1-reference-manual.md)
  - including a concrete `fixed32 = 1.5` raw-byte example and little-endian debugging guidance
- implemented the first real `fixed32` math helper surface:
  - added [src/alexis_lib/coleco_math_fx16.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math_fx16.asm) `AMY_FX16_16_SQRT`
  - exposed statement-style `sqrt Value into Target` for `fixed32` source/target pairs through [studio/core/compiler/fx16Helpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/fx16Helpers.js), [studio/core/compiler/printFormatStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/printFormatStatementHelpers.js), and [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
  - kept expression-form `A = sqrt(B)` explicitly out of scope for now
- updated `fix16_16` library integration so `AMY_FX16_16_SQRT` is auto-resolved:
  - [studio/core/project.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/project.js)
  - [studio/core/libraryModules.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/libraryModules.js)
- cleaned the current `fix16_16` helper layer in [src/alexis_lib/coleco_math_fx16.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math_fx16.asm):
  - fixed `AMY_FX16_16_ABS`, which was previously checking the combined OR of all four bytes instead of the actual sign byte
  - marked `AMY_FX16_16_MULT`, `AMY_FX16_16_DIV`, and `AMY_FX16_16_RND` as provisional low-level routines, not yet compiler-integrated promises
- updated the umbrella include [src/alexis_lib/coleco_math.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math.asm) so it now includes `coleco_math_fx16.asm`
- fixed library auto-resolution for `fix16_16` usage:
  - [studio/core/project.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/project.js) now detects `AMY_FX16_16_*` references and pulls in `src/alexis_lib/coleco_math_fx16.asm`
  - [studio/core/libraryModules.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/libraryModules.js) now lists the broader `fix16_16` symbol surface for split-library resolution
- kept the next `fixed32` math step explicitly tracked in [docs/fixed-ufixed-roadmap.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/fixed-ufixed-roadmap.md):
  - `MULT` / `DIV` / formatter / language-level support still need a proper audited pass

- compiler optimization pass added for startup-clear-aware RAM init elision:
  - global zero initializers already covered by the `Start:` RAM clear block are no longer emitted again into `AMY_INIT_RAM`
  - this now catches plain integer zeroes and `fixed32` zero forms such as `0.0`
  - zero-valued global boolean pack initializers are no longer forced back into `AMY_INIT_RAM`
- compiler post-pass now includes a safe repeated-immediate-load peephole cleanup:
  - removes redundant `ld r,n` reloads when the register value is still provably live
  - intentionally does **not** do flag-changing substitutions like `ld a,0 -> xor a`
  - kept conservative so it fits `Balanced`-class optimization rather than risky experimental rewriting
- recorded the next `fixed32` math step in [docs/fixed-ufixed-roadmap.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/fixed-ufixed-roadmap.md):
  - expand and audit the existing `fix16_16` math subsystem properly
  - do not blindly paste the proposed 16.16 math listing without syntax and correctness review

- recorded the first improved runnable AMY `fixed32` Ahl benchmark result in [docs/creative-computing-benchmark.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/creative-computing-benchmark.md):
  - `0:20`, `accuracy 3.0623`, `random 9.5361`, `S 5034.6885`, `R 990.4638`
  - explicitly marked as a `fixed32` result and not an optimized historical floating-point comparison
- continued the `fixed32` quality pass in [src/alexis_lib/coleco_math_fx16.asm](C:/Users/Amy/Desktop/ALEXIS-Z80/src/alexis_lib/coleco_math_fx16.asm):
  - `AMY_FX16_16_DIV` now rounds to nearest instead of always truncating the quotient
  - this aligns divide behavior with the recent multiply and square-root rounding improvements
- documented the preferred next high-accuracy real-number direction in [docs/apple-mbasic-float-plan.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/apple-mbasic-float-plan.md):
  - no custom float
  - prefer a proven Apple / MBASIC-style `5-byte` BASIC float family for future benchmark-grade accuracy work
- promoted the Creative Computing / Ahl benchmark from blocked sketch to runnable fixed32 rewrite:
  - [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) now runs the benchmark with statement `sqrt`, `random fixed32`, `^= 2`, and statement `abs`
  - [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js) now lists it as `Ahl Benchmark` with project name `amy-ahl-benchmark`
  - [docs/creative-computing-benchmark.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/creative-computing-benchmark.md) now describes it as a runnable rewrite pending numerical validation
- updated the Creative Computing benchmark tracking:
  - [docs/creative-computing-benchmark.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/creative-computing-benchmark.md) now uses the intended `fixed32` benchmark sketch
  - [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) now carries the same `fixed32` benchmark target source
  - [studio/examples.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples.js) now lists the blocked benchmark sketch in the studio catalog so progress can be tracked until it becomes runnable
- refreshed [README.md](C:/Users/Amy/Desktop/ALEXIS-Z80/README.md) so it reflects the current AMY Studio state instead of older meta-project wording
- cleaned [studio/core/editor/autocompleteCatalog.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/editor/autocompleteCatalog.js):
  - removed several stale/non-canonical suggestions from the active catalog
  - kept canonical suggestions such as `next` and `graphics mode 2 bitmap`
  - added current `fixed32` suggestions for declaration, copy, and `+=` / `-=`
- moved the autocomplete catalog into [studio/core/editor/autocompleteCatalog.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/editor/autocompleteCatalog.js)
- removed the autocomplete type-name set, snippet lists, detail overrides, and command-bias scoring from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `701` lines after this autocomplete extraction
- moved the main compiler body into [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js)
- left a thin `transpileAmy(...)` wrapper in [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) that forwards the live helper/module dependencies
- `studio/app.js` is now down to about `1075` lines after this core compiler extraction
- wired [studio/core/projectBridgeHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/projectBridgeHelpers.js) for the local project bridge wrapper layer:
  - starter source wrapper
  - new/load/migrate project wrappers
  - project-file candidate wrapper
  - save/export/import wrappers
- removed those local project bridge wrappers from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3056` lines after this shell extraction
- wired [studio/core/bindStudioEvents.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/bindStudioEvents.js) for the top-level studio event-binding shell:
  - ASM view event wiring
  - top UI event wiring
  - studio runtime event wiring
- removed that `bindEvents()` shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3077` lines after this shell extraction
- wired [studio/core/projectEditorUi.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/projectEditorUi.js) for the project editor shell block:
  - commit source text to project/editor
  - insert snippet into source
  - sync UI from the current project
- removed that project editor shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3089` lines after this shell extraction
- wired [studio/core/previewShell.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/previewShell.js) for the preview / optimization shell block:
  - optimization hint update
  - preview button visibility/state
  - source cartridge metadata refresh
- removed that preview / optimization shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3119` lines after this shell extraction
- wired [studio/core/emulatorShell.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/emulatorShell.js) for the emulator shell block:
  - emulator UI state update
  - ROM object URL lifecycle
  - clear compiled artifacts
  - emulator srcdoc build
  - embedded emulator launch
  - BIOS auto-load
  - simple view switch helper
- removed that emulator shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3139` lines after this shell extraction
- wired [studio/core/statusAsmUi.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/statusAsmUi.js) for the status / ASM view shell block:
  - status line update
  - library resolution panel render
  - ASM view state selection
  - RAM summary build/render
  - editor insight refresh
  - ASM editor sync
  - codec status line
- removed that status / ASM view shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3281` lines after this shell extraction
- wired [studio/core/projectLifecycle.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/projectLifecycle.js) for the project lifecycle shell block:
  - default starter source
  - new project creation
  - build-from-example creation
  - project load/migrate
  - project-file candidate naming
  - save-to-storage helper
- removed that lifecycle shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3373` lines after this shell extraction
- wired [studio/core/examplePicker.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/examplePicker.js) for the example picker shell/UI block:
  - example tag ordering
  - example filtering
  - example metadata panel render
  - example picker render
- removed that example picker shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3427` lines after this shell extraction
- wired [studio/core/projectPersistence.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/projectPersistence.js) for project export/import normalization
- wired [studio/core/projectFileUi.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/projectFileUi.js) for the embedded project-file shell/UI block:
  - asset snippet insertion
  - dsound play snippet insertion
  - upsert/remove project files
  - project-file rendering
  - imported project-file attachment
- removed that project persistence / project-file shell block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3471` lines after this shell extraction
- wired [studio/core/compiler/transpileFinalizationHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileFinalizationHelpers.js) for the end-of-transpile finalizer:
  - unclosed block checks
  - deferred final proc/function cleanup
  - data block flush
  - default data cursor init
  - stack frame prologue insertion
  - runtime init / numeric helper / text / ROM block assembly
  - final optimized body packaging
- removed that finalization block from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3571` lines after the finalization extraction
- wired [studio/core/compiler/firstPassScanHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/firstPassScanHelpers.js) for the first-pass symbol/signature scan:
  - source type alias registration
  - const/data/declaration pre-scan
  - label pre-scan
  - sub/function signature pre-scan
  - stack parameter slot pre-registration
- removed that first-pass scan cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3651` lines after the first-pass extraction
- wired [studio/core/compiler/declarationStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/declarationStatementHelpers.js) for the declaration cluster:
  - `let` / `var` / `const`
  - `bcd`
  - typed global/local declarations
  - array declarations
  - removed built-in type rejection
- removed that declaration cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3784` lines after the declaration extraction
- wired [studio/core/compiler/dataMetaStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/dataMetaStatementHelpers.js) for the early data/meta parser cluster:
  - `define TypeAlias as CanonicalType` second-pass skip
  - multiline `data` block state
  - `enddata`
  - `asm { ... }`
  - `asset ... from "..." codec ...`
  - `data ... bytes`
  - `data ... bitmap8`
  - `data ... sprite16`
  - `memory "..."`
  - `cartridge "..."`
- removed that early data/meta cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- added [docs/fixed-ufixed-roadmap.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/fixed-ufixed-roadmap.md) to document the current real `fixed` / `ufixed` surface and the future path toward stronger numeric support
- updated [docs/creative-computing-benchmark.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/creative-computing-benchmark.md) with corrected time ordering and additional benchmark context
- wired [studio/core/compiler/inlineStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/inlineStatementHelpers.js) for the inline statement compiler used by one-line `if ... then ... else ...` forms:
  - inline `return`
  - inline `set`
  - inline `print`
  - inline direct calls
  - inline `goto`
  - inline `clear`
  - inline `inc/dec`
  - inline `add/sub`
  - inline loop exits / continues
- removed the buried local inline statement compiler from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `3884` lines after this extraction
- wired [studio/core/compiler/procFunctionStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/procFunctionStatementHelpers.js) for the proc / function declaration cluster:
  - removed `proc` / `call` / `gosub` legacy declaration checks
  - legacy `sub start:` compatibility
  - `sub ...`
  - `function ... as ...`
  - `end sub`
  - `end function`
  - `end` / `project` / `use lib` no-op lines
- removed the buried local proc / function declaration cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `4013` lines after this extraction
- wired [studio/core/compiler/routineStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/routineStatementHelpers.js) for the routine / return / set / implicit-call cluster:
  - `set Name = Value`
  - `return`
  - `return Value`
  - `exit sub`
  - `loop forever`
  - implicit procedure calls
  - `include asm "..."`
  - removed `call/gosub` rejection path
- removed the buried local routine / return / set / implicit-call cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `4098` lines after this extraction
- wired [studio/core/compiler/vramPixelInputStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/vramPixelInputStatementHelpers.js) for the VRAM pixel / mode1 draw / input-read cluster:
  - `vpoke`
  - `vpeek`
  - `pset` / `plot` / `preset`
  - `line`
  - `circle`
  - `read joypad/keypad/spinner/frame/vdp status`
  - `wait fire`
  - `wait key`
  - `wait key release`
  - `choose keypad ... into ...`
- removed the buried local VRAM pixel / mode1 draw / input-read statement cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `4156` lines after this extraction
- added [docs/creative-computing-benchmark.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/creative-computing-benchmark.md) to document the Creative Computing / Ahl benchmark, its AMY translation sketch, the current numeric blockers, and a partial historical result table
- added `amyAhlBenchmarkSketchSource` in [studio/examples-numeric.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/examples-numeric.js) as a non-catalogued future benchmark sketch
- wired [studio/core/compiler/printFormatStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/printFormatStatementHelpers.js) for the print / format statement cluster:
  - `print at ...`
  - `print "..." at ...`
  - `print Value at X,Y`
  - `format Value into Buffer`
  - legacy `print byte/word`, `format word`
  - `sqrt ... into ...`
  - legacy `u32 zero/copy/add/inc/sub`
  - `add/sub/clear/copy/print bcd`
- removed the buried local print / format / legacy u32 / BCD statement cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `4190` lines after the print/format extraction
- wired [studio/core/compiler/soundSpinnerStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/soundSpinnerStatementHelpers.js) for the sound / spinner / wait statement cluster:
  - `set sound table ...`
  - `play song`
  - `stop song`
  - `sound runtime on/off`
  - `music runtime on/off`
  - `enable/disable spinner`
  - `reset spinner 1/2`
  - `reset spinners`
  - `play sound`
  - `stop sound`
  - `stop all`
  - `mute all`
  - `wait vblank`
  - `wait N frames`
  - `play dsound`
- removed the buried local sound / spinner / wait statement cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `4952` lines after the sound/spinner extraction
- wired [studio/core/compiler/displayGraphicsSpriteStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/displayGraphicsSpriteStatementHelpers.js) for the display / graphics / sprite statement cluster:
  - `screen on/off`
  - `display on/off`
  - `graphics bitmap`
  - `graphics mode1`
  - `graphics mode 1 text`
  - `graphics mode 2 text`
  - `graphics mode 3 multicolor`
  - `text screen`
  - `set sprite pattern table ...`
  - `nmi on/off`
  - `cls`
  - `load default ascii`
  - `fill mode 2 text color ...`
  - `duplicate mode 2 text pattern thirds`
  - `sprites 8x8/16x16/simple/double`
  - `set sprite count`
  - `clear sprites`
  - `update sprites`
  - `set sprite ...`
  - `hide sprite ...`
- removed the buried local display / graphics / sprite statement cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5063` lines after the display/graphics/sprite extraction
- wired [studio/core/compiler/mathBitStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/mathBitStatementHelpers.js) for the scalar math/bit utility statement cluster:
  - `multiply` / `mul`
  - `divide` / `div`
  - `clamp ... between ... and ...`
  - `swap ... with ...`
  - `set bit ... of ...`
  - `clear/reset bit ... of ...`
  - `min ... with/to ...`
  - `max ... with/to ...`
  - `shift array ... down/up ...`
- removed the buried local math/bit utility statement cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5270` lines after the math/bit extraction
- wired [studio/core/compiler/mutateStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/mutateStatementHelpers.js) for the core mutate/arithmetic statement cluster:
  - `inc` / `dec`
  - `add ... by ...`
  - `add ... to ...`
  - `sub ... by ...`
  - `subtract ... from ...`
  - `and/or/xor ... with ...`
  - `shift left/right`
  - `shl/shr`
  - `<<=` / `>>=`
  - `negate`
  - `not`
  - `toggle`
- removed the buried local mutate/arithmetic statement cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5503` lines after the mutate/arithmetic extraction
- wired [studio/core/compiler/dispatchLabelStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/dispatchLabelStatementHelpers.js) for the dispatch/label cluster:
  - `set number digits ...`
  - `set number pad ...`
  - `copy X to Y`
  - `on ... goto`
  - `on ... gosub`
  - `label Foo`
  - bare `Foo:`
  - `goto Foo`
  - removed `call/gosub` rejection
- removed the buried local dispatch/label cluster from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5692` lines after the dispatch/label extraction
- wired [studio/core/compiler/specialIfGotoStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/specialIfGotoStatementHelpers.js) for the special branch forms:
  - `if Var goto Label`
  - `if any collision goto Label`
  - sprite collision `if ... goto` forms
  - compare `if ... goto`
  - controller-direction / controller-button `if ... goto`
  - `if bit N of Var goto Label`
- removed the buried local special `if ... goto` family from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5754` lines after the special-branch extraction
- wired [studio/core/compiler/randomBounceStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/randomBounceStatementHelpers.js) for `random between ... into ...` and `bounce ... by ... between ... and ...`
- removed the buried local random/bounce statement family from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5795` lines after the random/bounce extraction
- wired [studio/core/compiler/arrayBulkStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/arrayBulkStatementHelpers.js) for bulk byte-array statements
  - `fill array ... with ...`
  - `copy array ... from ...`
  - `fill array ... repeating ...`
  - `reverse array ...`
- removed the buried local bulk array statement family from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5839` lines after the bulk-array extraction
- wired [studio/core/compiler/ifStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/ifStatementHelpers.js) for `if` / `elseif` / `else` / `end if` plus single-line `if ... then ... else ...`
- removed the buried local core `if` statement family from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- `studio/app.js` is now down to about `5976` lines after the `if` extraction
- wired [studio/core/compiler/forStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/forStatementHelpers.js) for the full `for` / `downto` / `next` / `end for` / `exit for` / `continue for` family
- removed the buried local `for` statement family from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- fixed helper wire-order regressions in [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) by using lazy wrapper calls where later-wired compiler helpers were captured too early
- `studio/app.js` is now down to about `6046` lines after the `for` extraction
- wired [studio/core/compiler/simpleArithmeticHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/simpleArithmeticHelpers.js) for int8/int16 arithmetic and shifts
- removed the local duplicate simple arithmetic helper slab from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `emitArithInt8Op`
  - `emitLoadInt16ArithSourceIntoDE`
  - `emitArithInt16Op`
  - `emitShiftVar`
  - `emitShiftVarByN`
- wired [studio/core/compiler/expressionComputeHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/expressionComputeHelpers.js) for AST expression loading/storage helpers
- removed the local duplicate expression-compute helper slab from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `emitComputeExpressionAst`
  - `emitStoreComputedExpression`
  - `emitStoreComputedToScratch32`
  - `coerceComputedExpressionForCompare`
  - `emitLoadInt8AstIntoA`
  - `emitLoadInt16AstIntoHL`
- wired [studio/core/compiler/valueParseHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/valueParseHelpers.js) for parse/value helper logic
- removed the local duplicate parse/value helper slab from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `splitTopLevelArgs`
  - `parseAmyDeclarationList`
  - `isWordChar`
  - `stripOuterParens`
  - `splitTopLevelKeyword`
  - `parseBooleanConditionAst`
  - `parseRoutineInvocation`
  - `getImplicitNoArgFunctionInvocation`
  - `parseFix8_8Component`
  - `parseWordByteComponent`
  - `parseDwordWordComponent`
  - `emitRoutineArgumentPushes`
  - `emitFunctionInvocation`
  - `isKnownProcedureStatementName`
  - `parseArrayRef`
  - `parseBuiltinInputRef`
  - `emitLoadBuiltinInputInto`
  - `isIndexedByteReadable`
  - `resolveValueType`
  - `resolveExpressionAstValueType`
  - `resolveExpressionAstDeclaredType`
- wired [studio/core/compiler/u32Helpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/u32Helpers.js) for the 32-bit compare/store family
- removed the local duplicate 32-bit helper slab from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `ensureCompareScratch32`
  - `emitStoreMemory32ToTarget`
  - `emitPrepareU32Source`
  - `emitPrepareI32Source`
  - `emitStoreExtended32`
  - `emitLoadDwordInt16ComponentIntoHL`
  - `emitCompareScratch32Goto`
  - `emitComputedCompareGoto`
  - `getU32Info`
  - `getI32Info`
  - `emitU32ArrayCompareGoto`
- wired [studio/core/compiler/procHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/procHelpers.js) to match the live compiler behavior
- removed the local duplicate proc/runtime helper slab from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `ensureProcLocalMap`
  - `ensureProcFrame`
  - `emitAdjustSpBy`
  - `emitCurrentProcReturnLines`
  - `bodyAlreadyEndsWith`
  - `emitCurrentProcReturnLinesIfNeeded`
  - `removeDeadReturnsAfterJumps`
  - `inlineSingleCallUserProcedures`
  - `simplifyStartTailForeverGoto`
  - `openStartProc`
  - `ensureImplicitStartForExecutable`
  - `getRuntimeInfo`
  - `scopedRuntimeName`
  - `runtimeTypeSize`
- `studio/app.js` is now down to about `6467` lines after the proc/runtime, 32-bit, parse/value, expression-compute, and simple-arithmetic extractions
- fully wired the BCD compiler helper family through [studio/core/compiler/bcdHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/bcdHelpers.js)
- removed the local duplicate BCD slab from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js)
- staged then wired [studio/core/compiler/loadStoreHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/loadStoreHelpers.js) for the first load/store/address cut
- removed these local helpers from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `emitLoadArrayAddressIntoHL`
  - `getByteArrayBufferInfo`
  - `emitStoreInt8FromA`
  - `emitStoreInt16FromHL`
- staged then wired [studio/core/compiler/byteLoadHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/byteLoadHelpers.js) for the byte-load/count family
- removed these local helpers from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `emitLoadInt8Into`
  - `emitLoadInt8ValueInto`
  - `emitLoadInt8ValueIntoPreserving`
  - `emitLoadRawInt8IntoA`
  - `emitLoadCountIntoBC`
  - `emitLoadCountIntoDE`
  - `SIMPLE_BYTE_TOKEN_RE`
  - `splitTopLevelByteExpression`
  - `emitScaleAByConst`
  - `emitRandomCountIntoA`
  - `emitLoadInt8TermIntoA`
- staged then wired [studio/core/compiler/addressHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/addressHelpers.js) for source/VRAM address loading
- removed these local helpers from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js):
  - `emitLoadSourceAddressIntoHL`
  - `emitLoadVramAddressIntoDE`
  - `emitLoadVramAddressIntoHL`

---

## 2026-05-18 — AMY v2.1

Current status:
- established as the active AMY version
- pre-release, but no longer treated as a vague design direction
- `v2.2` remains deferred

Why this is still `v2.1` and not `v2.2`:
- the archived `v2.2` notes are centered on runtime string expressions
- AMY still has no true runtime `string` type
- features such as `chr$()` and string concatenation are not implemented as a real source/runtime layer
- `str$ Value into Buffer` now exists as a transitional numeric formatting helper, but it is not a full runtime string-expression feature
- runtime strings are now treated as a future `v3` topic instead

### Language surface

- direct procedure calls without `call` are now supported
  - `DrawMarker(22, 10, $5A)`
  - `opt_chain`
- plain `call Name(...)` is removed from the active parser surface
- plain `gosub Name` is removed from the active parser surface
- `proc`, `end proc`, and `exit proc` are removed from the active parser surface
- canonical scalar type names are now the only built-in source-level type spellings
  - use `u8`, `i8`, `u16`, `i16`, `u32`, `i32`, `fixed`, `ufixed`, `bool`
  - old names such as `byte`, `word`, `integer`, `char`, `int`, `long`, `fix8_8`, and `ufix8_8` no longer exist as built-ins
- source-level type aliases can now be declared explicitly
  - `define byte as u8`
  - `define word as u16`
- modern shift-assignment forms are supported
  - `Value <<= 3`
  - `Score >>= 2`
- `on Expr goto` and `on Expr gosub` remain supported as intentional indexed-dispatch tools for 8-bit state-driven code
- `return` is valid in `sub` and is now preferred in examples for early exit
- `end sub` remains valid and recommended
- if a file ends with an open `sub`, the compiler now emits an implicit close at end-of-file
- `function` still requires explicit closure and now errors when left open

### Compiler and runtime fixes

- fixed `data ... bytes` emission for multi-byte numeric literals
  - wider literals now expand to little-endian byte streams before ROM emission
  - `data FeatureData bytes 5,6,$0123` now reads back correctly as `u8, u8, u16`
- fixed implicit no-argument subroutine calls
  - bare calls such as `opt_chain` no longer fall through to `TODO` placeholders in generated assembly
- fixed Experimental optimizer IX/IY indexed-use detection
  - indexed operands like `(ix+4)` are now recognized as real frame usage
  - this prevents false removal of IX frame setup/teardown in routines that still need it

### Documentation direction

- established a strict split between:
  - the manual's canonical surface
  - the reference document's complete alias/compatibility surface
- updated the manual and reference to reflect the parser cleanup:
  - removed syntax is described as removed, not merely discouraged
  - `on ... goto` / `on ... gosub` are documented as supported indexed dispatch
  - strings are explicitly deferred to `v3`
- confirmed editorial rule:
  - the manual should teach hardware-real and legacy-devkit-grounded screen/mode concepts first
  - the reference should keep AMY/CVBasic compatibility aliases
- clarified that `v2.2` notes are archived future work, not the current language version

### Studio maintenance

- began Phase 1 of the `studio/app.js` refactor
- extracted low-risk pure helpers into:
  - [studio/core/emulatorBackends.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/emulatorBackends.js)
  - [studio/core/utils/bytes.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/utils/bytes.js)
  - [studio/core/utils/cartridgeMeta.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/utils/cartridgeMeta.js)
  - [studio/core/utils/dataUrls.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/utils/dataUrls.js)
  - [studio/core/utils/downloads.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/utils/downloads.js)
  - [studio/core/utils/formatters.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/utils/formatters.js)
  - [studio/core/optimization.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/optimization.js)
  - [studio/core/editor/autocomplete.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/editor/autocomplete.js)
  - [studio/core/amyCompiler.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/amyCompiler.js)
  - [studio/core/compilerFrontend.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compilerFrontend.js)
  - [studio/core/compiler/runtimeCallHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/runtimeCallHelpers.js)
  - [studio/core/uiEvents.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/uiEvents.js)
- moved autocomplete, ASM view buttons, and most `bindEvents()` UI wiring out of `studio/app.js`
- moved compiler frontend helpers out of `studio/app.js`
- renamed compiler entrypoints from Alexis-facing names to Amy-facing names
- moved source-language compiler dispatch out of `studio/app.js`
- moved compiler runtime call-clobber logic out of `studio/app.js`
  - [studio/core/utils/projectFiles.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/utils/projectFiles.js)
- kept behavior unchanged while reducing some utility clutter inside `studio/app.js`
- started duplicate-first staging for deeper compiler-family extraction
  - added [studio/core/compiler/typeSymbolHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/typeSymbolHelpers.js) as a staged type/symbol module
  - added [studio/core/compiler/dataHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/dataHelpers.js) as a staged data/bitmap module
  - added [studio/core/compiler/controlFlowHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/controlFlowHelpers.js) as a staged compare/conditional/indexed-dispatch module
  - added [studio/core/compiler/bcdHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/bcdHelpers.js) as a staged packed-BCD runtime/codegen module
  - added [studio/core/compiler/printHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/printHelpers.js) as a staged numeric/text print emitter module
  - added [studio/core/compiler/procHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/procHelpers.js) as a staged proc/runtime helper module
  - wired `dataHelpers.js` into `studio/app.js` and removed the old inline data/bitmap helper block
  - wired `typeSymbolHelpers.js` into `studio/app.js` and removed the old inline type/symbol helper block
  - wired `controlFlowHelpers.js` into `studio/app.js` and removed the old inline control-flow helper block
  - wired `bcdHelpers.js` into `studio/app.js` and removed the old inline BCD helper block
  - wired `printHelpers.js` into `studio/app.js` and removed the old inline print helper block
  - reduced `studio/app.js` to roughly 7,022 lines
  - biggest remaining compiler work is now the main `transpileAmy(...)` body plus still-embedded VRAM/graphics/sprite/audio helper families

### Examples and baselines

- refreshed examples toward a cleaner canonical style where safe
  - direct procedure calls
  - `next` instead of `next I`
  - `<<=` / `>>=`
- updated screen/mode wording in selected examples to better distinguish hardware modes from convenience aliases
- expanded and corrected the size baseline set in [amy-studio-size-baselines.csv](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-studio-size-baselines.csv)
- confirmed recent baseline additions including:
  - `amy-feature-test`
  - `cvbasic-test3-port`
  - `cvbasic-plot-port` size results recorded
  - `wipe-screen-demo`
  - `africa-music-box`
  - `commando-music-box`
  - `cvbasic-spinner-port`

### Known limits kept explicit

- runtime strings remain deferred to `v3`
- `struct` and array-of-struct support remain future work
- some hardware-facing features are compile/runtime proven but not fully emulator-verified
  - example: spinner support in `cvbasic-spinner-port`
- the manual still contains some convenience bootstraps such as `text screen`, pending broader terminology cleanup toward stricter hardware-first presentation

### Refactor progress

- moved assignment and mixed arithmetic helpers out of [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) into [assignmentArithmeticHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/assignmentArithmeticHelpers.js)
  - `emitLoadUnsignedInt16ValueIntoBC`
  - `emitU32Add`
  - `emitU32Sub`
  - `emitArith32Op`
  - `emitFormulaAssignment`
  - `emitMultiplyInt8Op`
  - `emitMultiplyInt16Op`
  - `emitDivideInt8Op`
- updated the helper wiring order in `app.js` so the new module binds after simple arithmetic helpers and keeps `=` assignment support through `emitRuntimeStore`
- moved runtime value/store helpers out of [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) into [runtimeValueHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/runtimeValueHelpers.js)
  - `emitLoadInt16IntoHL`
  - `emitRuntimeStore`
  - `emitStoreImmediate32`
  - `emitPushArgument`
  - `ensureDataCursorVar`
- moved compare/literal helpers out of [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) into [compareLiteralHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/compareLiteralHelpers.js)
  - `emitTextLiteral`
  - `optimizeRepeatedBitTestLoads`
  - `emitSignedInt8CompareGoto`
  - `emitSignedInt16CompareGoto`
- moved the remaining shell helper cluster out of [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) into [compilerShellHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/compilerShellHelpers.js)
  - `makeGeneratedLabel`
  - `optimizeTransientDrawCoordinateTemps`
  - `reserveRam`
  - `isZeroInitializer`
  - `formatIxOffset`
- extracted the `restore` / `read` DATA cursor statement family from [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) into [dataCursorStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/dataCursorStatementHelpers.js)
- extracted the `while` / `do` loop statement families from the main compiler loop in [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) into [loopStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/loopStatementHelpers.js)
- extracted the `select case` statement family from the main compiler loop in [studio/app.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/app.js) into [selectCaseStatementHelpers.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/selectCaseStatementHelpers.js)
- reduced `studio/app.js` to roughly `6128` lines after these cuts
- Added first visible `fixed32` selftest example to Studio, covering add, subtract, square root, and on-screen decimal output.
- Added `coleco_math_format_fx16.asm` plus compiler/library wiring so `fixed32` values can now print and format through a native 16.16 decimal path.
- Made `coleco_math_fx16.asm` assemble cleanly for current builds by replacing the broken provisional `MULT` / `DIV` bodies with explicit compile-safe placeholders and by widening the square-root loop back-edge from `djnz` to `dec b` / `jp nz`.
## 2026-05-19 - Fixed32 Selftest Follow-up

- Reworked the `fixed32` print/format compiler path to format values through compare scratch and existing `U16`/`U8` decimal helpers instead of relying on the first `AMY_FX16_16_TO_ASCII9` path.
- Fixed the low-level `AMY_FX16_16_SQRT` loop counter preservation bug by saving/restoring `BC` across inner helper calls.
- Corrected the fixed32 formatter dot placement and simplified hundredths conversion for common quarter/half-step values.
- Verified that `fixed32` RAM allocation is counted by transpile RAM usage: the fixed32 selftest currently reports `26` used bytes and `9` RAM symbols.
- Replaced the broken `fixed32` square-root path with a stable whole-value implementation based on `AMY_U16_SQRT`. This makes `sqrt 9.0 into X` correct while full fractional `fixed32` sqrt remains a tracked future step.
- Fixed library auto-resolution so `fixed32` sqrt pulls in `src/alexis_lib/coleco_math_sqrt.asm` through the `coleco_math_fx16.asm` dependency path.
- Expanded the Studio `fixed32` selftest to cover negative-result add/subtract cases in addition to the positive-path checks.
## 2026-06-02 — Remaining optimizer opportunities re-triaged

- Added a fresh investigation note:
  - `docs/codex-investigation-improvement-directions-2026-06-02.md`
- Main conclusion:
  - repeated MDL pattern counts should no longer be treated as direct proof of
    missing built-in optimizer features, because many of those folds already
    happen in the final built-in optimized listing
- Best non-experimental next candidates were narrowed to:
  - promote dead `or a` removal to `balanced` if the existing dead-flags proof
    is accepted as strong enough
  - add dead `inc/dec rr` cleanup for `bc/de/hl`
  - add dead `ld b,n` cleanup with strict local liveness proof
- Float-heavy remaining gaps are now understood to be dominated mostly by
  currently intentional `experimental` territory:
  - `inc/dec (hl)`
  - `bit -> rla`
  - `ldi`

## 2026-06-02 — Dead `OR A` promoted into `balanced`

- Narrow promotion only:
  - `dead OR A` removal now has its own config gate
  - enabled in `balanced`, `aggressive`, and `experimental`
  - this does **not** promote the broader `flagLivenessPeepholes` bundle
  - at that point, `dead CP 0` still remained out of `balanced`
- Files:
  - `studio/core/optimization.js`
  - `studio/vendor/amyscvassembly/optimizerCore.js`
- Validation:
  - `node tools/export-studio-examples-asm.js` → `81/81`
  - `pwsh -ExecutionPolicy Bypass -File tools/audit-mdl-examples.ps1 -Level balanced` → `81/81`
- Measured effect:
  - no visible ROM-size delta on the current 81-example corpus
  - keep the change as a justified `balanced` reclassification, not as a size-win

## 2026-06-02 — Dead `CP 0` promoted into `balanced`

- Follow-up to the `dead OR A` promotion:
  - `dead CP 0` now has its own config gate
  - enabled in `balanced`, `aggressive`, and `experimental`
  - still **does not** promote the broader `flagLivenessPeepholes` bundle
- Files:
  - `studio/core/optimization.js`
  - `studio/vendor/amyscvassembly/optimizerCore.js`
- Validation:
  - `node tools/export-studio-examples-asm.js` → `81/81`
  - `pwsh -ExecutionPolicy Bypass -File tools/audit-mdl-examples.ps1 -Level balanced` → `81/81`
- Measured effect:
  - `amy-bcd-selftest` improved from built-in `1085` to `1080`
  - MDL gap there dropped from `-6` to `-1`
  - other highlighted math gaps were unchanged

## 2026-06-02 — Dead overwrite cleanup for `LD B,imm` and `INC/DEC rr`

- Added two new narrow intra-block `balanced` peepholes in:
  - `studio/vendor/amyscvassembly/optimizerCore.js`
- New rules:
  - remove `ld b,imm` when `B` is overwritten before any read in the same block
  - remove `inc/dec bc|de|hl` when that pair is overwritten before any read in
    the same block
- Safety shape:
  - no labels crossed
  - no `call/rst/ret/jp/jr/djnz/halt` crossed
  - overwrite must happen before any read/touch of the same register/pair
- Validation:
  - `node tools/export-studio-examples-asm.js` → `81/81`
  - `pwsh -ExecutionPolicy Bypass -File tools/audit-mdl-examples.ps1 -Level balanced` → `81/81`
- Major effect:
  - `amy-fixed32-divide-lab` : built-in `2358 -> 2330`
  - `amy-fixed32-sqrt-lab` : built-in `2949 -> 2920`
  - `amy-float-builtin-surface-lab` : built-in `6372 -> 6337`
  - `amy-float-muldiv-lab` : built-in `4754 -> 4720`
  - `amy-float-log-lab` : built-in `4711 -> 4677`
  - `amy-bcd-selftest` : built-in `1080 -> 1076`
- New global state:
  - MDL now remains ahead only on:
    - `compressed-picture-demo` by `2`
    - `barbarian-slideshow` by `2`
## 2026-06-03

- Moved `AMY_FRAME_COUNTER` from `$73F2` to `$73BA`.
- Reason: BIOS source-of-truth shows `$73F2` is `SprtTabShad`, not free RAM.
- This avoids corrupting the BIOS/getput11 sprite-table base shadow during Amy frame-counter increments.
- Regenerated `studio/core/alexisLibrarySources.generated.js` so browser-side Studio compile uses the corrected include constants too.
- Fixed `AMY_SCREEN_ON_NMI` and `AMY_SCREEN_OFF_NO_NMI` so they preserve sprite size/zoom bits from BIOS VDP R1 shadow `$73C4` instead of forcing hardcoded register-1 values.
- Reason: programs such as `cvbasic-controller-port` could correctly select `sprites 8x8`, then silently get reset to `16x16 simple` by a later `screen on`.
- Regenerated both `studio/core/alexisLibrarySources.generated.js` and `studio/core/alexisRuntimeCatalog.generated.js` so Studio browser/runtime export paths pick up the corrected VDP screen helpers.
- Added [docs/vdp-r1-order-simulation-2026-06-03.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/vdp-r1-order-simulation-2026-06-03.md) to document systematic R1 order simulation.
- Result: no mismatch was found between expected R1 semantics and emitted/helper behavior across ordered sequences of length 1, 2, and 3 for the main R1-affecting screen/sprite/NMI commands.
- Important nuance: `text screen` / `graphics mode 2 text` intentionally reset R1 to the mode baseline (`$82`), so `sprites 8x8` must still come after them if the program wants 8x8 sprites to remain active.
- Removed redundant `ld ($73C4),a` writes from the sprite/screen/NMI helpers that already end in BIOS `WRITE_REGISTER`.
- Reason: BIOS `WRITE_REGISTER` updates `VDP1Shad` (`$73C4`) itself when writing VDP register 1, so those extra stores only cost bytes.
- Added [docs/vdp-r1-smart-transpiler-plan-2026-06-03.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/vdp-r1-smart-transpiler-plan-2026-06-03.md).
- Plan direction:
  - Phase 1: warning-only transpiler diagnostics for misleading R1 command order
  - Phase 2: explicit docs for “authoritative mode commands” vs “incremental R1 modifiers”
  - Phase 3: future state-aware compact codegen for VDP R1
- Implemented the first Phase 1 warning in [studio/core/compiler/transpileAmyCore.js](C:/Users/Amy/Desktop/ALEXIS-Z80/studio/core/compiler/transpileAmyCore.js).
- Current warning scope:
  - an authoritative R1 mode command such as `text screen` or `graphics mode 2 text`
  - appearing after earlier R1 modifiers such as:
    - `sprites 8x8/16x16/simple/double`
    - `screen on/off`
    - `display on/off`
    - `nmi on/off`
- It now also warns on some straight-line no-op R1 modifiers when the current known R1 state already matches the requested setting.
- Narrow safe upgrade implemented:
  - some pure R1-only no-op modifiers now become `warn + don't emit`
  - examples:
    - `text screen -> sprites simple`
    - `text screen -> sprites 16x16`
    - `text screen -> screen off`
    - `text screen -> nmi off`
- `nmi on` remains excluded from elision because `AMY_ENABLE_NMI` also calls `READ_REGISTER` for VDP status acknowledgement.
- Warning text is now more explicit:
  - if a pure R1-only modifier is skipped, the warning says it was omitted from generated ASM
  - if the case is `nmi on`, the warning says the bit-state request is redundant but emission is retained because of the status-ack side effect
- The warning layer now also reports same-category straight-line replacement such as:
  - `sprites 8x8` later followed by `sprites 16x16`
  - `display on` later followed by `display off`
- Narrow compaction now goes one step further for pure sprite modifiers:
  - if a later straight-line sprite modifier supersedes an earlier one in the same category, the earlier one is omitted from generated ASM
  - if buffered pure sprite modifiers are followed immediately by an authoritative mode command such as `text screen`, those earlier sprite modifiers are omitted as dead overwritten setup
- This remains intentionally narrow:
  - only pure sprite size / zoom modifiers are compacted this way
  - display/screen/NMI replacements still remain warning-first unless already covered by the existing no-op elision rules
- Narrow pure-R1 compaction has now been extended one small step further:
  - `display on/off` joins sprite size/zoom in the bufferable straight-line pure-R1 subset
  - this means a superseded `display on/off` or one immediately overwritten by an authoritative mode command can now also be omitted from generated ASM
- That same narrow pure-R1 compaction has now been widened to every pure modifier except `nmi on`:
  - `screen off`
  - `screen on no nmi`
  - `screen on`
  - `display on/off`
  - `nmi off`
- `nmi on` remains excluded because `AMY_ENABLE_NMI` still performs a required `READ_REGISTER` status acknowledge side effect
- Added the first actual multi-command R1 compaction step beyond simple replacement/no-op checks:
  - the transpiler now remembers the last authoritative mode baseline for `R1`
  - at flush time, if a buffered pure-R1 chain collectively returns to that same baseline, the whole chain is discarded
- This covers patterns like:
  - `text screen -> sprites 8x8 -> sprites 16x16`
  - `text screen -> screen on -> screen off`
  - `graphics mode 3 multicolor -> sprites double -> sprites simple`
- This still does **not** perform general intermediate-write elision or mode-helper specialization.
- This is still intentionally narrow and does not attempt broad multi-command collapse.
- `AMY_INIT_RAM` investigation resolved more cleanly than expected:
  - the suspected retained-body mismatch was not a current bug
  - `cvbasic-controller-port` instead proved a dead non-zero runtime init at transpiler level: `AMY_UVAR_CurrentKey = $FF`
  - that led to commit `f2e4456`, which adds a narrow v1 pruning pass in `transpileFinalizationHelpers.js`
  - the pruning happens before emission, so both the `call AMY_INIT_RAM` and the `AMY_INIT_RAM:` body disappear together when all relevant init records are proven dead
  - this intentionally avoids creating an optimizer/DCE ordering problem later in the pipeline

## 2026-06-04 — Dead Runtime Init Pruning v2 For Inline `AMY_ULBL_*` Regions

- Extended transpiler-level dead runtime init pruning in:
  - `studio/core/compiler/transpileFinalizationHelpers.js`
- Kept `v1` intact and added a separate `v2` path for a second, stricter model:
  - scalar global only
  - single direct init record only
  - all direct reads/writes must stay inside `AMY_ULBL_*` regions
  - `Start:` and `Nmi:` may not read the variable
  - in each reading region, the first reference to the variable must be a write
  - no branch/call may appear before that first write
  - no external jump/call/djnz may target an internal `AMY_*` label inside the reading region
  - any non-direct reference shape bails out conservatively
- First proven `v2` case:
  - `commando-music-box`
  - dead init: `AMY_UVAR_Key1 = $FF`
  - the transpiler now removes that init before `AMY_INIT_RAM` emission because:
    - `Start:` never reads `Key1`
    - `Nmi:` never touches `Key1`
    - `AMY_ULBL_MainLoop` writes `Key1` before all reads
    - `AMY_ULBL_WaitKeyRelease` writes `Key1` before its read
- Proof and model docs recorded in:
  - `docs/dead-runtime-init-corpus-sweep-2026-06-04.md`
  - `docs/commando-music-box-key1-init-proof-2026-06-04.md`
  - `docs/v2-inline-loop-region-model-2026-06-04.md`
- Validation:
  - `node tools/export-studio-examples-asm.js` → `81/81`
  - `pwsh -ExecutionPolicy Bypass -File tools/audit-mdl-examples.ps1 -Level balanced` → `81/81`
- `screen` vs `display` surface wording was tightened after the June 5 investigation:
  - autocomplete now keeps `screen on/off` first and marks `display on/off` as advanced
  - mode helper comments no longer present `display on` as a peer alternative to `screen on`
  - `amy-language.md` now explicitly tells normal Amy code to prefer `screen on/off`
- Added a targeted transpiler warning for `display on` when the known `VDP R1`
  state still has NMI disabled.
  - Reason: `display on` is a low-level display-bit toggle, not a synonym for
    `screen on`
  - Effect: beginners now get a clear warning in the exact case most likely to
    produce a silent "screen visible but no NMI" mistake
- Refined that `display on` warning so it becomes more specific after an
  authoritative mode setup.
  - If Amy knows the current hidden-loading phase started from `text screen` or
    `graphics mode ...`, the warning now explicitly says that `screen on` is the
    likely intended "resume display + NMI together" command at the end of setup
- Added the symmetric targeted warning for `display off` when the known `VDP R1`
  state still has NMI enabled.
  - Reason: `display off` is not the same as `screen off`; it blanks the
    display without disabling interrupts
  - Effect: Amy now warns in the exact case most likely to create a surprising
    "blank screen but NMI still running" state
- The emulator shell now falls back automatically to the CDN stable EmulatorJS
  backend if the active local vendor backend does not contain the Gearcoleco
  core package.
  - Reason: the current `EmulatorJS-main` vendor snapshot is the active default
    backend, but the committed `data/cores/` tree does not include the local
    `@emulatorjs/core-gearcoleco` package
  - Effect: Amy Studio no longer tries to launch a known-incomplete local core
    setup without warning; it falls back to the CDN backend and reports that
    choice in the status text
- Emulator UX/docs were tightened for BIOS/public-repo reality:
  - the emulator panel now says explicitly that a BIOS must be placed in `studio/bios/` or loaded manually
  - `README.md` now has an `Emulator setup` section covering the BIOS requirement and the local-vs-CDN emulator behavior
  - Claude's public-repo emulator packaging plan is now checked into `docs/public-repo-emulator-plan-2026-06-05.md`
- The June 5 follow-up corpus sweep for `R1` compaction/warnings confirmed that
  the remaining families are mostly theoretical.
  - real shipped examples exercise mostly:
    - post-mode redundant sprite size/zoom modifiers
    - duplicate `screen on`
    - pre-mode sprite modifier discard before an authoritative mode command
  - not meaningfully exercised in the shipped corpus:
    - baseline-return cycles like `screen on -> screen off`
    - explicit `display on/off` cycle families
    - `nmi off` as a post-mode no-op
    - `sprites double` / `graphics mode 3 multicolor`
  - conclusion:
    - no further `R1` compaction implementation is justified right now
    - future `R1` work should come from new dedicated examples or a real user case
- The default emulator backend is now `emulatorjsCdnStable`.
  - Reason: the current committed local EmulatorJS vendor shell does not include
    the Gearcoleco core package, so CDN was already the effective runtime path
    after fallback
  - Effect: no probe latency, no fallback message in the normal case, and a
    cleaner default for a future public repo build
- Public-repo emulator packaging now has two concrete follow-up docs:
  - `docs/local-offline-emulator-setup-2026-06-05.md`
  - `docs/public-repo-release-checklist-2026-06-05.md`
  - Effect: the repo now has a practical offline-install path for developers and
    a separate publish-time checklist for the eventual public release
- The `WAV → DSound` Studio dialog can now record a short microphone clip in the
  browser and convert that recording directly into Amy dsound data.
  - Effect: DSOUND is now practical end-to-end from inside Amy Studio:
    record voice -> convert -> save `.dsound` project file -> `play dsound`
- The DSOUND workflow now also has:
  - a `Save + insert play snippet` shortcut in the Studio dialog
  - a new `DSound Voice Minimal` example in the shipped example catalog
  - that example now uses an embedded `.dsound` project file, not only inline data
- The Studio converter surface is now framed as `Audio/Voice -> DSound`, not only `WAV -> DSound`.
  - It still supports PCM WAV directly
  - It can also decode browser-supported audio files through `AudioContext`
- The converter now has one-click DSOUND insertion paths:
  - `Quick add file to Amy`
  - `Quick add recording to Amy`
  - Effect: the easiest flow now skips the separate convert/save/insert steps entirely
- Added a direct DSOUND conversion regression test:
  - `tools/test-dsound-converter.mjs`
  - it generates a small WAV fixture, converts it, and also checks the `AudioBuffer` path
- Record/struct write codegen now compacts adjacent global record-field byte stores before assembly-time peepholes.
  - consecutive absolute field writes now share one `ld hl,...` walk with `inc hl`
  - avoids source-level `push/pop af` scaffolding and repeated base reloads on the record canaries
  - immediate byte values now prefer `ld (hl),n` directly, while repeated identical values can still reuse `A`
- The fp5 runtime sources now use direct `inc (hl)` / `dec (hl)` updates in several handwritten math helpers instead of round-tripping through `A`.
  - touched helpers:
    - `coleco_math_fp5_basic_arith.asm`
    - `coleco_math_fp5_bridge.asm`
    - `coleco_math_fp5_core.asm`
    - `coleco_math_fp5_div.asm`
    - `coleco_math_fp5_mul.asm`
  - effect:
    - the previous MDL-only float-lab wins disappeared
    - `amy-float-builtin-surface-lab`, `amy-float-log-lab`, and `amy-float-muldiv-lab` now end up smaller with Amy's built-in path than with MDL
- The built-in Z80 optimizer now recognizes `ldir` / `lddr` as valid sources of `BC = 0` during the existing `ld bc,#000N -> ld c,N` lookback fold.
  - effect:
    - trims more of Amy's machine-generated `ldir -> WRITE_VRAM` templates without adding a new optimization family
    - reduced the `amy-fixed32-divide-lab` MDL gap from `12` bytes to `10`
- `AMY_INIT_RAM` generation now reuses the last byte already loaded into `A` across adjacent one-byte init stores.
  - effect:
    - removes duplicated `ld a,$XX` setup in scalar runtime init sequences
    - reduced `amy-fixed32-divide-lab` from `2364 / 2348 / 2338` to `2358 / 2342 / 2338`
    - projected by Claude as the correct stopping point for this specific hotspot, leaving only a 4-byte MDL residual
- Added a one-week Amy Studio planning note:
  - `docs/amy-studio-week-plan-2026-06-07.md`
  - focus:
    - make embedded project assets first-class
    - split the crowded Project side panel into `Project` and `Files` tabs
    - define a first graphics asset golden path comparable to DSOUND
    - prioritize `length(Array)` / record docs before any dynamic string work
- Added a Claude investigation task for the first graphics asset workflow:
  - `docs/claude-task-investigate-graphics-asset-golden-path-2026-06-07.md`
- Amy Studio's left panel now has explicit `Project` and `Files` tabs.
  - `Project` keeps the project name, examples, RAM summary, Method 2 summary, and status
  - `Files` now owns embedded project files and the `Audio/Voice` shortcut
  - this prepares the UI for a future graphics asset quick-add workflow without crowding project metadata
