# Amy Studio Heritage

This page is a compact map of the technical lineage behind Amy Studio. It is
not nostalgia for its own sake: it explains why the language, runtime, graphics
tools, and sound tools look the way they do.

## Lineage At A Glance

| Era | Layer | What It Contributed |
|---|---|---|
| February 1996 | ColecoVision web/tooling presence | The 1998 Wayback captures state Daniel Bienvenu's ColecoVision page had existed since February 1996 |
| 1996-1998 | Early Amy/Daniel QuickBASIC tools | `VOIRROM`/`VOIROM` hex/ROM viewing, `CVPHOTO`, `CVPHOTOC`, and DOS ICVGM graphics tools |
| 1997 public web evidence | Daniel Bienvenu ColecoVision page | Wayback capture confirms a ColecoVision page with games, emulator links, and `VOIROM version 1.4 beta` made in QuickBASIC |
| January 1998 | ICVGM public demo | Wayback confirms I.C.V.G.M. version 0.8 demo, dated 1998-01-09, made in QuickBASIC by Daniel Bienvenu |
| November 1998 | ICVGM and CVPHOTO updates | Wayback confirms I.C.V.G.M. version 0.81 and CVPHOTO version 1.01, both dated 1998-11-06 |
| 1997-1998 | Marcel de Kogel's Hi-Tech C ColecoVision kit | C startup, cartridge header, NMI model, OS-7/BIOS wrappers, VDP helpers, sprite helpers, RLE-to-VRAM, sample games |
| 1999 | Breakout | Confirmed on NewColeco: Breakout by Daniel Bienvenu, dated 1999-02-02 and linked to `respublica.fr/emulation` |
| 2000 | NewColeco on GeoCities | Declared project history: GeoCities `newcoleco` account created, then `newcoleco2` added for more space for images, games, and tools |
| 1999-2003 | Game-driven utility growth | Breakout 1999, DacMan 2000 era helpers, graphics experiments, sound experiments, and practical tooling around real game needs |
| circa 2004, to verify | SDCC devkit migration | SDCC-oriented `crtcv`, lib4ksa evolution, `getput11`, Coleco BIOS sound-table use |
| 2005 | ColecoVision Coding Guide | Daniel Bienvenu's `ColecoVision Coding Guide with the Absolute Coleco BIOS Listing`, last modified 2005-07-28, documents OS-7 BIOS routines, sound, objects, timers, controllers, VDP/VRAM, and the absolute BIOS listing |
| 2000s-2010s | Graphics and sound tools | ICVGM, CV Paint, bitmap/tile/sprite formats, picture conversion, direct sound experiments, practical compression workflows |
| 2011-2026 | NewColeco YouTube evidence | Official channel/RSS lead documents public videos around ColecoVision music, Flora, ADAMCon, and Z80 VRAM decompression/compression comparisons |
| 2016-2018 | DAN compression family | DAN1/DAN2/DAN3 compression and Z80 VRAM decompressors; DAN3 is marked 2018 in the local source |
| Amy Studio | Modern integrated tool | Amy language, compiler/transpiler, project files, asset preview, compression, examples, emulator integration, and documentation in one place |

## Marcel de Kogel Kit

The newly archived folder `marcel de kogel/` contains Marcel de Kogel's 1997
Hi-Tech C ColecoVision package. Its local `COLECO.TXT` describes the package as
a way to build ColecoVision ROM images with Hi-Tech C 3.09 and includes:

- `cch/`: Cosmo Challenge sample game.
- `ctrainer/`: Cosmo Trainer sample game.
- `copt/`: ADAM game selector.
- `lib/`: ColecoVision library source.
- `coleco.txt`: build notes, RLE format, memory warnings, and license note.

Technically, the important inherited ideas are:

- Code and initialized data live in ROM at `$8000`; uninitialized data lives in
  Coleco RAM around `$7000`.
- The cartridge header points to a work buffer and a game start address.
- NMI reads VDP status, scans controllers, calls user frame logic, and updates
  BIOS sound state.
- The runtime wraps useful BIOS services: `PUT_VRAM`, `GET_VRAM`, `FILL_VRAM`,
  `WRITE_REGISTER`, `READ_REGISTER`, `PLAY_IT`, `SOUND_MAN`, and random number
  generation.
- The library exposes game-grade primitives: screen on/off, NMI enable/disable,
  sprite updates, collision checks, ASCII upload, RLE decode to RAM/VRAM,
  delay, memory copy/fill, and `utoa`.

The original RLE format is intentionally simple:

- `$ff`: end marker.
- Byte below `$80`: copy the next `(n & $7f) + 1` bytes.
- Byte `$80` or above: repeat the next byte `(n & $7f) + 1` times.

That RLE model is one reason Amy Studio treats compression as a practical asset
pipeline, not as a decorative afterthought.

## Amy/Daniel Pre-SDCC Tools

Amy's own ColecoVision tooling predates the SDCC migration. The current working
timeline, based on project memory and local source hints, is:

- Around 1996-1998: early DOS/QuickBASIC tools such as `VOIRROM` or `VOIROM`
  for ROM/hex inspection.
- Around 1996-1998: image and graphics tools such as `CVPHOTO`, `CVPHOTOC`,
  and ICVGM for DOS.
- Public evidence: the 1998-02-15 and 1998-12-06 Wayback captures say Daniel
  Bienvenu's ColecoVision page had existed since February 1996.
- Public evidence: the Wayback Machine capture from 1997-06-26 of Daniel
  Bienvenu's ColecoVision page lists `VOIROM version 1.4 beta`, described there
  as a DOS ColecoVision ROM viewer/editor made in QuickBASIC by Daniel Bienvenu.
  The same page also lists ColecoVision games and emulator resources, confirming
  that this toolchain existed publicly before the later SDCC migration.
- Public evidence: by 1998-02-15, `VOIROM` was listed as version 1.5 beta, and
  I.C.V.G.M. version 0.8 demo was listed as a QuickBASIC DOS graphics editor
  dated 1998-01-09.
- Public evidence: by 1998-12-06, I.C.V.G.M. version 0.81 was dated 1998-11-06,
  and the page expands the acronym as Instant-Coleco-Vision-Game-Maker.
- Public evidence: the 2000-10-18 NewColeco `games.html` Wayback capture lists
  Breakout by Daniel Bienvenu, dated 1999-02-02, and links the author entry to
  `www.respublica.fr/emulation/colem.html`. The same page calls Breakout the
  first new Coleco game in 1999.
- Declared project history: by 2000, the GeoCities `newcoleco` account existed
  and was used for the ColecoVision tools/games site; a second `newcoleco2`
  account was later used to gain enough space for images, games, and tools.
  Some mirrored or preserved versions from the GeoCities period may still exist
  on the web today, but they are not under Amy's control.
- Late 1990s to early 2000s: utilities were added in response to real game
  work, including Breakout 1999 and DacMan 2000 era needs.
- The SDCC migration appears later, probably around 2004, but this date still
  needs source confirmation.
- 2000s onward: game ports, original games, music work, and compression formats
  continued to shape the devkit.

This matters because Amy Studio is not only a descendant of the Hi-Tech C kit.
It is also a continuation of Amy's own editor/converter/debugger lineage.

## Amy/Daniel SDCC Devkit

Amy's later devkit work moved the practical ColecoVision workflow toward SDCC
and toward the way real games were being written. The exact first SDCC migration
date still needs archival confirmation; circa 2004 is the current working date,
not a proven release date.

The local `src/vendor/cvdevkit_sdcc/lib4ksa/` and
`src/vendor/cvdevkit_sdcc/getput11/` trees preserve that middle generation.
They are not just passive vendor files: many Amy language decisions are direct
translations of their patterns.

Major inherited pieces:

- `crtcv.s`: SDCC startup, cartridge header, RAM layout, NMI, controller decode,
  sound-area layout, and frame-time responsibilities.
- `lib4ksa`: VDP, sprite, RLE, controller, random, sound, delay, and screen
  helpers.
- `getput11`: higher-level game utilities: text printing, centered printing,
  frame get/put, picture display, BCD score helpers, direct sound, pauses,
  wipes, mode 3 pixel helpers, and small game-loop conveniences.
- `comp/` and later tools: compression experimentation and asset packaging.

Two important design shifts happened here:

- The old runtime sound idea was replaced by the Coleco BIOS sound-table format,
  which is stricter but compatible with the console's own sound manager.
- `getput11` grew as a practical game-making layer: helpers were added when real
  games needed them, including Breakout 1999 and DacMan 2000 style workflows.

Amy Studio should keep that pragmatism: add language features when they remove
real game-programming friction, not because they look fashionable.

## Game-Driven Devkit Pressure

Amy's devkit evolved through finished games, ports, tools, and experiments, not
as an abstract API exercise.

Declared lineage still needing more archive proof:

- `BUSTin-Out`, `Spektank`, `Bejeweled`, `Miss Space Fury`, `GhostBlaster`,
  `Jeepers Creepers`, `Flora and the Ghost Mirror`, and `Strip Poker` are part
  of the later game lineage that kept exposing missing helpers.
- `GamePack 1` and `GamePack 2` were old BASIC games ported to C for
  ColecoVision. They helped reveal missing `getput` features and pushed the
  devkit toward smaller compiled output.
- `Canadian Minigames` required two Amy-made games, a joystick test utility, and
  a framework for bundling several games in one package.
- `Jeepers Creepers` was started around 2001 and completed around 2008, based on
  current recollection.
- `Flora and the Ghost Mirror` and `Strip Poker` were the last two games Amy
  made in this lineage.

The same practical pressure shaped sound and compression:

- Amy coded music used in other ColecoVision projects, including `Jump` in
  `Rip Cord` and `Crazy Train` in `Side Track`.
- `DAN0` came around the GamePack period and mixed RLE with Huffman-coded
  literals.
- After `GhostBlaster`, compression became more important. `Strip Poker` used
  `ZX7`; `DAN1` was inspired by `ZX7` and Huffman ideas; `DAN2` evolved the
  format; `DAN3` kept a small decompressor while improving hard-data
  compression.

## Graphics Lineage

ColecoVision graphics are table-driven. Amy Studio's picture and tile workflows
come from that reality.

The graphics branch starts before Amy Studio:

- `CVPHOTO` and `CVPHOTOC`: early picture conversion experiments.
- ICVGM for DOS and later ICVGM generations: tile, charset, and sprite-oriented
  editing/export.
- CV Paint: later visual editing and conversion workflows for pattern/color/name
  data and common picture formats.

Publicly confirmed 1998 graphics-tool details:

- I.C.V.G.M. v0.8 demo, dated 1998-01-09, is described as a QuickBASIC DOS
  background graphics editor for ColecoVision ROM work.
- The v0.8 page lists character editing, fast character color changes, output
  screen editing, used-character detection, mouse detection, and ROM-only sprite
  editing.
- I.C.V.G.M. v0.81, dated 1998-11-06, is described as based on Purple Dinosaur
  Massacre and keeps compatibility with CVEDITOR-style `.DAT` files.
- CVPHOTO v1.01, dated 1998-11-06, converts 256-color BMP files into monochrome
  RLE-compressed image data in a generated `tables.c`, intended for display
  through Marcel de Kogel's `show_picture` path in `cch.c`.

Key inherited concepts:

- `NAME`, `PATTERN`, and `COLOR` tables are separate data surfaces.
- Bitmap-style pictures usually need pattern and color data, and often a default
  sequential name table.
- Tile screens often use shorter pattern/color tables plus duplication across
  mode-2 thirds.
- Some historical tools store `PATTERN`, `COLOR`/`MCOLOR`, `NAME`, `SPATT`,
  `SCOLOR`, and sometimes sprite attributes in one export.
- Full VDP emulation is not required for static previews: a renderer over
  pattern/color/name tables is enough for asset review.

Current Amy Studio consequences:

- A grouped picture asset can be recognized from matching
  `.pattern`, `.color`, and optional `.name` files.
- ICVGM `.dat` files are treated as tile/charset assets, not forced into a full
  bitmap picture.
- SC2/GRP imports should preserve sprite pattern/attribute data when present.
- Compression choice matters: raw, RLE/MDKRLE, DAN, ZX, and Bitbuster-style
  codecs serve different size/speed/debugging needs.

Future graphics work should preserve the distinction between:

- **Picture import**: convert a PC image to ColecoVision pattern/color data.
- **Picture preview**: render existing pattern/color/name tables.
- **Tile/charset import**: preserve ICVGM-style game assets.
- **Sprite import**: preserve sprite patterns and attributes separately.

## Sound Lineage

ColecoVision sound has two different needs:

- Music and effects scheduled through the Coleco BIOS sound manager.
- Direct one-shot experiments such as `dsound`, where the PSG is driven more
  directly for sampled or pseudo-sampled effects.

The BIOS sound-table format is powerful but easy to misuse. The first sound
table entry must correspond to the lowest sound area in RAM, and lower sound
areas have lower priority when the BIOS sound manager resolves playback. This is
why Amy Studio needs validation, not just byte import.

Current Amy conventions:

- `set sound table ... areas N` installs the BIOS-compatible sound table.
- `play sound N`, `stop sound N`, `stop song`, and `mute all` target the sound
  manager model.
- Tiny music is useful for compact note-based music.
- Pure Coleco sound effects should remain BIOS sound data, not be converted to
  tiny music.
- DSound is a separate direct-sound workflow for voice/sample-like effects.

The planned Studio direction is:

- A sound-table validator that detects bad sound-area ordering.
- A visual sound-effect editor derived from `examples/cvsoundfx-web.html`.
- Project assets for sound effects that can generate correct table entries.
- Clear separation between music slots and gameplay-effect slots.

## Compression Lineage

Compression is part of the project history, not only a modern Studio feature.

Known local anchors:

- Marcel's package includes a compact RLE format and RLE-to-RAM/VRAM helpers.
- Amy's later toolchain uses MDK-style RLE, MDKRLE, DAN-family codecs, ZX-family
  codecs, and Bitbuster-style codecs depending on speed/size needs.
- `src/compression/dan1_vram.asm` identifies DAN1 as an Amy Bienvenu LZSS
  compression routine from 2016.
- `src/compression/dan3_vram.asm` identifies DAN3 as an Amy Bienvenu LZSS
  compression routine from 2018.

The Studio import UI should therefore avoid a single "best" compression choice.
It should let the user compare data size, decompressor size, decompression
speed, and edit/debug convenience.

## BIOS Knowledge Amy Should Expose Carefully

Amy Studio is allowed to hide BIOS complexity from the programmer, but it should
not erase the contracts that make ColecoVision code safe.

Important facts to keep visible in docs and tooltips:

- The cartridge starts at `$8000`; `$8024` is the normal first code byte after
  the header.
- The public 1998 ColecoVision page identifies the hardware surface in the
  same terms Amy Studio still cares about: Z80A, TMS9928A, SN76489AN, and
  3.58 MHz timing.
- The 2005 `ColecoVision Coding Guide with the Absolute Coleco BIOS Listing`
  bridges the older devkit documentation and the modern Studio docs. It covers
  OS-7 routine specifications, the absolute BIOS listing, VDP/VRAM access,
  sound routines, object/sprite routines, timers, and controller routines.
- User RAM is small. Amy preserves OS-reserved areas and allocates user
  variables inside the safe window.
- VDP writes are timing-sensitive. Higher-level commands should batch VRAM I/O
  when practical, for example `get frame`/`put frame` instead of many tiny reads.
- NMI must save registers before using them. Bugs in NMI register preservation
  create mysterious game glitches.
- BIOS `READ_REGISTER` acknowledges VDP status; it is not a harmless read.
- Sound areas and sound-table order are load-bearing.

The existing `docs/colecovision-memory-map.md` is the detailed technical map.
This page is the historical and product-design map.

## Amy Language Inheritance

| Legacy Concept | Amy Direction |
|---|---|
| `screen_on`, `screen_off`, VDP mode helpers | `text screen`, `tile screen`, `bitmap screen`, `multicolor screen`, `screen on/off`, `nmi on/off` |
| RLE/picture helpers | `asset`, `decompress codec Asset to vram.*`, `show picture`, `upload picture` |
| `put_char`, `get_char`, `put_frame`, `get_frame` | `put char`, `get char`, `put frame`, `get frame`, tile collision helpers |
| Sprite shadow table | `set sprite`, `update sprites`, hitboxes, tile-aware sprite placement |
| BCD score helpers | `bcd` variables, `add/sub/print bcd`, future stronger BCD comparisons/copy |
| BIOS sound table | `set sound table`, `play sound`, `stop sound`, `mute all`, validator |
| DSound experiments | `asset ... .dsound`, `play dsound`, Studio conversion and preview |
| `delay`, pause helpers | `wait`, `delay`, `pause until press`, `wait no fire` |

The goal is not to expose every old helper one-for-one. The goal is to preserve
what made them useful while making the source code shorter, clearer, and less
fragile.

## Credit And Provenance

Amy Studio descends from a long local toolchain, but the 1997 Marcel de Kogel
kit is a clear historical root. The local archive identifies Marcel as the
author of the Hi-Tech C ColecoVision package and points to his classic-games
distribution site.

When Amy Studio documentation or examples mention that lineage, they should:

- Credit Marcel de Kogel for the original Hi-Tech C ColecoVision library and
  sample-game kit.
- Credit Amy/Daniel for the SDCC devkit evolution, `getput11` additions,
  graphics/sound tools, and Amy Studio/Amy language work.
- Treat Breakout 1999 as archive-confirmed on NewColeco, while preserving Amy's
  declared context that it was a French-language game made with Marcel de
  Kogel's devkit plus early Amy/Daniel tools.
- Treat NewColeco/GeoCities material carefully: surviving mirrors are useful
  historical clues, but they should not be described as current official sites
  or as content currently controlled by Amy.
- Keep third-party code provenance separate from integrated Amy Studio code.
- Avoid implying that abandoned historical code can be overwritten blindly.

## Public Archive Research Notes

The searchable web does not currently expose a clean, authoritative timeline for
the NewColeco, AtariAge, Digital Press, and GeoCities branches of this history.
Useful research keywords for a future archival pass:

- `AtariAge forums NewColeco CVPaint`
- `AtariAge forums NewColeco DAN1`
- `Daniel Bienvenu God Father ColecoVision`
- `NewColeco GeoCities`
- `DigitalPress Daniel Bienvenu ColecoVision`
- `Wayback Machine NewColeco`
- `GeoCities newcoleco`
- `GeoCities newcoleco2`
- `newcoleco mirror`

Confirmed archive anchor:

- 1997-06-26 Wayback capture:
  `https://web.archive.org/web/19970626165003/http://wwwbacc.ift.ulaval.ca/~bienvend/colem.html`
  documents Daniel Bienvenu's ColecoVision page and `VOIROM version 1.4 beta`.
- 1998-02-15 Wayback capture:
  `https://web.archive.org/web/19980215135205/http://wwwbacc.ift.ulaval.ca/~bienvend/colem.html`
  documents the page's February 1996 origin note, I.C.V.G.M. v0.8 demo dated
  1998-01-09, `VOIROM version 1.5 beta`, and Marcel de Kogel's Hi-Tech C link.
- 1998-12-06 Wayback capture:
  `https://web.archive.org/web/19981206174016/http://wwwbacc.ift.ulaval.ca/%7Ebienvend/colem.html`
  documents I.C.V.G.M. v0.81 dated 1998-11-06, CVPHOTO v1.01 dated
  1998-11-06, and the BMP-to-RLE `tables.c` workflow.
- 2000-10-18 NewColeco games page:
  `https://web.archive.org/web/20001018204934/http://www.geocities.com:80/newcoleco/games.html`
  documents Breakout by Daniel Bienvenu dated 1999-02-02, a Respublica author
  link, BUSTin-Out Volume 0 dated 2000-10-18, and DacMan final version 1.3
  dated 2000-08-16.
- 2001-05-11 NewColeco root page:
  `https://web.archive.org/web/20010511160927/http://www.geocities.com:80/newcoleco/`
  documents the GeoCities NewColeco homepage, bilingual French/English site
  structure, free software/source-code positioning, and `newcoleco@yahoo.fr`.
- 2001-05-26 DacMan homepage:
  `https://web.archive.org/web/20010526181117/http://www.geocities.com:80/newcoleco/dacman/index.html`
  documents a dedicated DacMan homepage with copyright 2000 Daniel Bienvenu.

Public mirror and third-party leads:

- `https://www.geocities.ws/newcoleco/tools.html` mirrors a NewColeco tools page
  with `I.C.V.G.M. v2.14`, `I.C.V.G.M. v3.03`, `CVPAINT v1.07a`,
  `WAV2CV v3.06`, `WAV2CVDS v1.01a`, `HI-TECH C`, and `TASM`.
- `https://www.colecovision.dk/bust-in-out-v3.htm` identifies `BUsTin-Out -
  Volume #3` as copyright 2000 by Daniel Bienvenu.
- `https://colecovision.dk/strip-poker.htm` identifies `Strip Poker` as
  copyright 2014 by Daniel Bienvenu.
- `https://www.colecovision.dk/bienvenu.htm` identifies Daniel Bienvenu /
  `newcoleco` as a major ColecoVision homebrew figure, describes him as a
  `Godfather`-like programming figure, and ties together tools, documentation,
  games, ADAMCon, public sharing, music, sound work, `Ghost Blaster`, and
  `Flora And The Ghost Mirror`.
- `https://www.colecoboxart.com/colecovisionfr_daniel.htm` is a French
  third-party homage page titled `ColecoBoxArt - Daniel Bienvenu`. It calls
  Daniel Bienvenu / `newcoleco` the `parrain` of ColecoVision homebrew,
  emphasizes shared utilities, developer enablement, original games, technical
  reference status, and music/sound-effect expertise.
- `https://mag.mo5.com/29629/daniel-bienvenu-de-retour-sur-colecovision/` is
  a 2012 MO5 article titled `Daniel Bienvenu de retour sur ColecoVision !`.
  It identifies Daniel Bienvenu as `NewColeco`, ties him to his ColecoVision
  development kit, and discusses `Flora and the Ghost Mirror`.
- `https://archive.org/details/manualzilla-id-5667325` hosts `ColecoVision
  Coding Guide`, with the original PDF available at
  `https://ia600105.us.archive.org/13/items/manualzilla-id-5667325/5667325.pdf`.
  The document itself states `Document written by Daniel Bienvenu` and `Last
  modification date: 28/07/2005`.
- `https://www.youtube.com/user/newcoleco` resolves to YouTube channel ID
  `UCLdmJHIDh6Fzuv2Kh4f61Fw`. Its public RSS feed currently exposes a partial
  upload timeline from 2011 to 2026, including `Flora and the Ghost Mirror`,
  ADAMCon 25, ColecoVision 8-bit music videos, and a Z80 VRAM decompression
  comparison covering ZX0, ZX7, DAN1, DAN3, Pletter, BitBuster, LZF, and RLE.
- A 2013 AtariAge tribute thread, provided as an excerpt by Amy, gives
  community testimony that Daniel's tools, ICVGM/CVPaint/CVToolkit, getput,
  documentation, examples, music, and sound work enabled many later
  ColecoVision developers. Direct fetch is blocked by Cloudflare here, so this
  remains user-provided until independently archived or fetched.
- A user-provided AtariAge excerpt from 2005, `Emulator, Assembler, and tools`,
  captures the transition pressure from the freely available CP/M Hi-Tech C
  compiler toward SDCC/z88dk. The excerpt says the existing ColecoVision
  libraries targeted Hi-Tech C, while SDCC/z88dk required library porting or
  rewrites; it also notes PkK's independent SDCC ColecoVision library/tools.
- DuckDuckGo-indexed leads point to Adam Archive / Good Deal Games
  ColecoVision-programming PDFs that mention I.C.V.G.M. and CVPAINT, plus a
  PDRoms 2002 page that appears to list Bejeweled, Breakout, Breakout Paddle
  Version Demo, and BUSTin-Out entries by Daniel Bienvenu. These still need
  direct page verification before being treated as confirmed anchors.

Declared but not yet archive-confirmed anchors:

- GeoCities/NewColeco: `newcoleco` and `newcoleco2` accounts were used from
  2000 onward; future archive work should identify which surviving mirrors are
  faithful snapshots and which are altered reposts.

The goal of that pass is to date public announcements year by year and separate:

- private/local tool creation dates,
- public forum announcements,
- downloadable tool releases,
- devkit/API changes,
- game release milestones.

## Open Historical Work

Useful follow-up documentation tasks:

- Compare `marcel de kogel/LIB/*.AS` with `src/vendor/cvdevkit_sdcc/lib4ksa/*.s`
  routine by routine.
- Document which helpers are original Marcel concepts, which are Amy/Daniel
  SDCC adaptations, and which are Amy Studio rewrites.
- Search AtariAge, Digital Press, NewColeco, GeoCities, and Wayback Machine for
  year-by-year public evidence of `CVPaint`, `CVPHOTO`, `ICVGM`, `DAN1`, `DAN2`,
  `DAN3`, and NewColeco devkit/tool releases.
- Add a compact "Coleco BIOS sound table cookbook" for musicians and game
  programmers.
- Add a visual "graphics data surfaces" page explaining pattern, color, name,
  sprite patterns, and sprite attributes.
- Add a migration page for old ICVGM/CV Paint/SC2/GRP assets into Amy Studio
  project files.
