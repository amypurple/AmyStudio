# Porting 1980s BASIC games to ColecoVision with Amy

A working guide distilled from porting about fifteen type-in games from
*COMPUTE!* magazine (1983-1984) to ColecoVision cartridges with Amy:
Jumping Jack, Gold Miner, First Math, Southern States, Diamond Drop, Mystery
Spell, Runway 180, Balloon Crazy, Ludwig, Crazy Climber, Get The Gold,
Devastator, Jackpot, Bunny Hop and Blueberries.

It covers the whole path: reading a scanned listing, understanding what the
program really does, choosing what to keep, writing the Amy code, and
checking it before delivery. Each rule comes from a real mistake or a real
fix; the case is named so it can be found again.

---

## 1. House rules for every port

These are the standing conventions. Apply them without being asked.

| Rule | Why |
| --- | --- |
| Credit the author(s) by name in the cartridge line, the source header and an editorial page. | The games are their work. Name the converter too (for example Patrick Parrish for many TI versions). |
| Write the historical and editorial text in your own words. | Summarize the article; never paste it. |
| Keep everything important in columns 2-29. | CRT overscan hides columns 0, 1 and 31 on many TVs. Count string lengths: `print at 2,Y` allows at most 28 characters. |
| Put all graphics on character codes 128-255. | A font reload (`load default ascii`, mode changes) cannot then destroy the picture (Runway 180). |
| Scores: zero-padded, BCD where it fits. | `bcd digits N Score` prints padded for free. Use `i32` plus `str$` when the score can go negative (Blueberries). |
| Replace keyboard questions with joystick menus. | `choose menu ... cursor $3E at X,Y step N`; keep keypad digits as shortcuts. Clear the menu rows before writing anything else there (Devastator's "NSO LONG"). |
| Add an editorial page at power-on, and a how-to-play page when the rules are not obvious. | Blueberries' seed counter confused the player until a help page explained it. |
| Adaptations may take liberties: animation, nicer graphics, smoother motion. | List every liberty in the source header so the original stays recoverable. |
| Fix reported runtime bugs first, then explain the cause. | The user tests on real hardware or emulators; the port must not regress. |

---

## 2. Workflow

1. **Collect** the article pages and every listing. Read the article first:
   it states the rules, the scoring and the differences between versions.
2. **Transcribe** the listing that matters (section 3) into a `.bas` file.
   Note every guess in a header comment.
3. **Model the game**: write down the variables, the main loop, the scoring,
   the end condition and the timing. Look for quirks (section 5).
4. **Choose the target design**: which version to follow for the rules,
   which for the layout, what to improve. Tell the user before coding when
   the choice is not obvious.
5. **Generate data with scripts**, never by hand: patterns, screen rows,
   sound tables, lookup tables. Keep the generators next to the source
   (`gen.py`, `s.mjs`, `build.py` with `@@DATA@@` / `@@SOUNDS@@`
   placeholders).
6. **Render a mock** of the main screen from the same data (a few lines of
   Python with PIL). It catches wrong transcriptions, bad colors and layout
   problems before any ROM exists (Jackpot, Bunny Hop, Blueberries).
7. **Compile** with `node tools/amyc.mjs game.alexis --rom game.rom --asm
   out.asm`, then **read the generated assembly** of the hot paths
   (section 8).
8. **Deliver** the ROM, the `.alexis` source and the transcription, with a
   short list of what was kept, what changed and what is untested.

---

## 3. Transcribing scanned listings

### Getting legible text

- Crop and enlarge the scan (3x to 5x, Lanczos) before reading.
- Magazine listings use a fixed-pitch font. Fit the pitch and offset by
  finding the column positions with the least ink, then cut every line into
  character cells and lay them out in a numbered grid image. Counting
  cells is far more reliable than counting characters by eye, especially in
  long runs such as `0000000000F` or `FFFFFFFF`.
- Tesseract is poor on these scans. A tiny nearest-neighbour classifier
  seeded with a few hand-labelled lines works better, but always verify by
  eye on the cell grid.
- *COMPUTE!* lines wrap at a fixed width (31 characters for many listings).
  A wrapped hex string can be checked by its length: `CALL CHAR` strings
  are multiples of 16 hex digits per character.

### Typography traps

| Printed | Meaning |
| --- | --- |
| `Ø` | zero (`O` is the letter) |
| `{,}` | a character the typesetter could not print; deduce it from use (in Jackpot it stood for both `}` and `~`) |
| `¦` that looks like `!` | `\|` |
| `{3 SPACES}`, `{RVS}`, `{HOME}`, `{2 DOWN}` | Commodore control codes; keep them as printed in the transcription |
| `{EY}`, `{2 Y}` | Commodore graphics characters; identify them from the article or the screenshot |
| Partly erased hex digits | Use symmetry (Devastator's alien sprite) or the rendered shape to decide |

### Verify by rendering

Render every `CALL CHAR` / `DATA` pattern and every screen row from the
transcription. Wrong digits show up as broken shapes; wrong row lengths show
up as misaligned walls. Fix the transcription, not the port.

---

## 4. Reading each machine's BASIC

### TI-99/4A Extended BASIC

Closest to the ColecoVision: same TMS9918A video chip, same SN76489-class
sound. Most graphics map one to one.

| TI | Amy |
| --- | --- |
| `DISPLAY AT(R,C)` | `print at C+1, R-1` (DISPLAY AT has a 2-column margin) |
| `HCHAR(R,C,ch,n)` / `VCHAR` | `fill ch count n at C-1, R-1` (absolute screen columns) |
| Sprite dot-row R, dot-column C | `set sprite I to R-2, C-1, ...` |
| `CALL COLOR(set, fg, bg)` | TI color N = VDP color N-1; set N covers chars `32+8*(N-1)` to `+7`, VDP color group = char / 8 |
| `CALL CHAR(n, "hex")` | 16 hex digits per character; a longer string continues into the next characters; missing digits are zeros |
| `CALL MAGNIFY(1..4)` | 1-2: 8x8, 3-4: 16x16; 2 and 4 are doubled (`sprites double`) |
| `CALL MOTION(#n, vy, vx)` | v/16 pixels per frame; keep positions in 8.8 fixed point (`u16`, add `v*16`) |
| `CALL COINC(#1,#2,TOL)` | compares the sprites' upper-left corners within TOL pixels, not their shapes |
| `CALL COINC(ALL)` | `if any collision` (pixel overlap) |
| `CALL SOUND(ms, f, vol, ...)` | duration ms*60/1000 frames; period = round(111860.78 / f); attenuation = vol / 2; noise `-n` = BIOS noise mode n-1; negative duration interrupts the previous sound |
| `CALL JOYST(1, X, Y)` | Y = +4 means **up** (opposite to screen Y); X, Y in {-4, 0, 4} |
| `CALL KEY(0,...)` | whole keyboard |
| `CALL KEY(1 or 2,...)` | split keyboard as two controllers; codes 0-19, **18 = fire button** |
| `ACCEPT AT ... VALIDATE` | joystick menu or `choose keypad` |
| Logical true | **-1**: `X = X + (A > B)` subtracts one when true; `-4*(K=68)` adds 4 |

### Commodore 64 and VIC-20 BASIC V2

Everything is `POKE` / `PEEK`. Decode the addresses once and write them down.

| Item | VIC-20 | C64 |
| --- | --- | --- |
| Screen | 22 x 23, base 7680 (unexpanded) | 40 x 25, base 1024 |
| Cell address | `base + row*22 + col` | `base + row*40 + col` |
| Color RAM offset `K` | +30720 (to 38400) | +54272 (to 55296) |
| Characters | `POKE 36869,255` = RAM charset at 7168 | `POKE 53272,28` = charset at 12288 |
| Joystick | `PEEK(37137)`, `PEEK(37152)` with `POKE 37154` DDR switching; bits are active low | `PEEK(56320)` / `PEEK(56321)`; bits 0-4 up, down, left, right, fire, active low |
| Sound | `POKE 36874-36877` voices, 36878 volume | SID at 54272 |
| ML routines | `SYS addr`; DATA lines hold 6502 code | same |

Tips:

- Range tests on addresses such as
  `IF(Y<8143 AND Y>8118)` exclude whole screen rows; convert them to rows to
  understand the rule (Bunny Hop: no carrots in cloud rows).
- Moving one cell right with `P=P+1` wraps to the next row in linear screen
  memory. Clamp instead.
- A character game on the VIC is the easiest to fit on the ColecoVision:
  22 columns sit comfortably in the 28 safe ones.

### Atari 400/800 BASIC

The most readable: named statements for screen, joystick and sound.

| Atari | Meaning |
| --- | --- |
| `GRAPHICS 17` (1+16) | 20 x 24 large-character text mode, no text window |
| `POSITION X,Y : PRINT #6;"..."` | write at a cell (0-based) |
| `LOCATE X,Y,Z` | read the character at a cell into Z |
| `COLOR C : PLOT X,Y` | put character C at a cell in text modes |
| `STICK(0)` | 15 = centre, 7 right, 11 left, 13 down, 14 up (other values = diagonals) |
| `STRIG(0)` | 0 = fire pressed |
| `SOUND v, p, d, vol` | pitch p: frequency about 31960 / (p+1) Hz with distortion 10; vol 0-15 |
| `PEEK(53279)` | console keys: 6 = START, 5 = SELECT, 3 = OPTION |
| `USR(addr)` | machine language, often a VBI routine that runs every frame |

### IBM PC / PCjr BASIC

`LOCATE row, col` (1-based), `STICK(0..3)` returns coordinates rather than
directions, `STRIG(n)`, `SOUND freq, ticks` (18.2 ticks per second). The PC
version is rarely the most useful one but confirms formulas.

### Which listing to read first

When an article prints several versions:

1. **The article** for the rules and the intent.
2. **Atari** for the logic: it states positions and tests plainly.
3. **VIC-20** for the layout: its character grid is closest to ours.
4. **TI-99/4A** when present: it maps directly to the TMS9918A.
5. **C64** only for shapes or details missing elsewhere.
6. **PC** to confirm a formula.

Different versions often differ in rules (Blueberries: Atari berries grow
one at a time, the 64 and PC ones all at once). Pick one, say which, and
write it in the header.

---

## 5. Understand the game before porting it

Write the main loop as a short list of numbered steps with the original
line numbers. Then look for these traps:

| Trap | Example | Decision |
| --- | --- | --- |
| Free points from a loophole | Blueberries: standing still with fire held planted a seed every pass and scored | Close the loophole; note it |
| Rule contradicted by the article | Bunny Hop: dying advanced the level and added a carrot; the article says you return to your start | Follow the article; note the listing's behaviour |
| Hit tests far looser than they look | Devastator: `COINC` with TOL 30 on 32-pixel sprites destroyed ships at a brush | Keep the original test but expose the tolerance as constants |
| Hidden state that becomes visible | Blueberries' seed count was never shown; displaying it revealed that pushing into the shed rerolls it every pass | Explain it on a help page, or change the mechanic |
| Winner rule | Blueberries ends when a player has no farmhands, but the higher score wins | Keep it; say so when asked |
| Wrapping off the screen | Devastator's ship wrapped through the overscan | Bounce or clamp inside the safe area |
| Diagonals ignored | Many joystick games accept only pure directions | Decide (vertical priority is usually friendlier) and note it |

---

## 6. Timing: rebuild the original pace

Compiled Amy runs hundreds of times faster than interpreted BASIC. The
original pace must be rebuilt on purpose.

- **One BASIC pass = N frames.** Estimate N from the article (Devastator:
  "30 seconds" for `W>200` passes gave 9 frames per pass) or from the feel
  of the original (7 to 10 frames is typical for a loop with a few dozen
  statements). Run the game logic once every N frames.
- **Keep everything else per frame.** Read the joystick, glide sprites,
  scroll and animate every frame; only the rules advance per pass. This is
  what makes a port feel smooth rather than choppy.
- **Glide, don't jump.** When a sprite moves one 8-pixel cell per pass, move
  the sprite 8/N pixels per frame toward its cell (8.8 fixed point), so it
  arrives just as the next pass starts. A fixed 2-pixel step that finishes
  early and waits looks like stuttering (Bunny Hop, first version).
- **Physics with the original limits.** For a jump that rises R rows in R
  passes and falls one row per pass: take-off speed v0 = 2h/t, gravity
  g = v0/t (h = 8R pixels, t = R*N frames), and cap the fall at 8/N pixels
  per frame. Same height, same timing, continuous arc. Precompute the values
  per speed level in a ROM table.
- **Real-time clocks** (`TI$`, `TIME`): count frames (60 per second; PAL
  differs).
- **Speed-ups**: a delay loop that shrinks per level (Bunny Hop `I=I-3`)
  becomes a frames-per-pass value that shrinks every few levels.
- **Sound durations** convert to frames, but blocking BASIC loops that play
  sounds also set the pace: keep their total length similar.

---

## 7. Graphics

### Mode choice

- **Graphics I** (`text screen`): one foreground/background pair per group
  of 8 characters. Enough for most TI ports.
- **Graphics II** (`tile screen`): a color pair per pixel row of each tile.
  Use it when a single color per character looks poor: carrots with green
  leaves, berries with stems, shaded clouds (Bunny Hop, Blueberries). Load
  every custom tile into **all three thirds** of the pattern and color
  tables (`vram.pattern + 2048*k`, `vram.color + 2048*k`), and write
  per-frame pattern updates into each third that shows them.

### Tiles

- Allocate graphics from code 128 upward; keep 32-127 for the font.
- If an original shape reads badly (a carrot that looks like a fish, briers
  that look like grass), redraw it and note the change.
- `fill mode 2 text color with $F0` sets the font colors in Graphics II;
  call it before loading your own tile colors, because it overwrites them.

### Sprites

- Most single-color 8x8 shapes look better as two to four stacked sprites
  of different colors (Blueberries' farmers: hat, face, shirt, overalls).
  Keep the four-sprites-per-line limit in mind.
- A sprite Y of 208 ends the sprite list; keep moving sprites off it.
- `clear sprites` also sets the sprite count to 0: always follow it with
  `set sprite count N` (Mystery Spell's invisible sprites).

### Smooth tile scrolling

For rows of tiles that drift horizontally (Bunny Hop's clouds):

1. Store each row as tile *pairs*: the tile at cell i shows cell i and its
   right neighbour, code `base + 2*left + right`.
2. Precompute the pair patterns for each pixel offset 0-7 and copy the
   current offset's patterns every frame (24 bytes per row family).
3. When the offset wraps, advance the row by one cell by moving a
   **circular start index**; do not shift arrays.
4. Use two tile sets (codes xor 8) and switch sets at each wrap, with the
   new set already drawn at offset 0. `merge Row count N to vram.name + A
   mask $FF xor $08` writes the names with the other set in one call. No
   tile ever shows the wrong offset, so there is no seam.
5. Anything riding a row adds the row's pixel offset to its own position.

---

## 8. Amy idioms and pitfalls

### Statements

- A single-line `if ... then` accepts assignments, `inc`/`dec`, `goto` and
  subroutine calls, but not `put char`, `print`, `play sound`, `fill`,
  `set sprite` and similar: use the block form.
- Reserved names cannot be variables or labels: `play`, `Fire`, `Start`
  (when a label `start:` exists) all failed. Prefer descriptive names
  (`play_round`, `Planting`, `RowStart`).
- A `u16` cannot be loaded straight from a `u8` array element or a ROM table
  (`V0 = V0Tab[T]` fails): go through a `u8` variable.
- `copy Source count N to Array + Offset` (offset destination in RAM) is
  not supported; `copy Array + K count N to Array` is. Variable counts and
  destinations work for `put` and `merge` to VRAM.
- `random(A, B)` with constant bounds is the reliable form.
- BCD accepts `+=` only with literals or constants: add a variable amount
  with a loop of `Score += 1`.
- `i32` + `str$` gives an 11-character buffer: sign at index 0, ten digits
  after it. Print `NumBuf + 5 count 6` for six padded digits.
- `keypad(1)` returns 0-9, 10 for `*`, 11 for `#`, 255 for none.
- `choose menu min to max into Var cursor Tile at X,Y step N` starts on the
  current value of `Var`; keep it between calls so the cursor stays put.

### Scratch variables

Amy subroutines share global variables. A routine that uses `N` as scratch
will overwrite the caller's `N`. Two real bugs came from this:

- Bunny Hop: `CarryCheck` stored the row index in `M`, then reused `M` for
  the cell value; every cloud looked like a right-moving one.
- Blueberries: the game-over test read `N` after `ShowStatus` and
  `PlaceFarmers` had changed it; the computer kept playing with no
  farmhands.

Rules: re-read the real variable just before a test (`N = Hands[P]`), give
loops that call per-frame routines their own counter (`F`), and note at the
top of each routine which scratch variables it changes.

### Arithmetic cost

Multiplication, division and modulo by non-powers of two are software
loops on the Z80. In a loop that runs hundreds of times per frame they add
up fast. Blueberries' computer opponent slowed the whole game down until
`CI / 26`, `CI % 26` and `R * 26` were replaced by two ROM lookup tables and
±1 / ±26 neighbour steps. Also:

- Comparisons between an `i16` and a `u8` compile to a 32-bit compare; keep
  hot comparisons in one type.
- `get char at` reads VRAM; fine for a few dozen cells per frame, not for
  hundreds.
- Spread long searches across frames (Blueberries does 12 cells of its
  breadth-first search per frame and lets the computer wait a turn if it is
  not done).

### The frame budget and the NMI

The NMI handler reads the VDP status register. If a frame's work runs past
the next NMI while a VRAM transfer is in progress, the status read resets
the VDP address latch and the rest of the transfer lands at a wrong address:
random characters or corrupted glyphs (Bunny Hop). The generated NMI
currently reads the status before checking Amy's `$701F` guard (reported in
`amy-port-feedback-2026-10-19.md`, item 12). Until that changes, protect
any game whose frame work can grow:

```basic
sub FrameUpdate:
  nmi on
  wait
  nmi off
  ' all per-frame VRAM work and game logic follow
  ...
end sub
```

Turn `nmi on` again before any other `wait`, menu, `pause until press` or
end screen, and use `nmi off` around large redraws. An overrun then costs a
frame instead of corrupting the screen.

### Reading the generated assembly

After each compile, search the `.asm` for the routines that run every frame
and check:

- no `call` to multiply or divide helpers inside loops,
- no 32-bit compare where a byte compare was intended,
- `push` / `pop` balanced inside loops you leave with `goto` or `return`,
- the highest `AMY_UVAR_` address: Amy's RAM ends at `$73B8`, and the
  stack grows down toward the variables. Keep at least about 150 bytes free.

---

### Naming and colors (January-February 1984 ports)

- Never name a variable like a hex byte (`FC`, `C1`, `BE`): every `$FC` or
  `$C1` in a `data` block then assembles as that variable and fails far
  from the cause (TI Aquarium, Circus).
- `fill mode 2 text color` resets the whole color table, custom tiles
  included. Call `LoadTiles` right after it on every screen (Trident,
  Circus, Gotcha!, Quatrainment, Colorbot, TI Aquarium lost their tile
  colors).
- `backdrop` takes a color name or a literal, not a variable: use an `if`
  per color (TI Mozart's `CALL SCREEN(KOL)`).
- Compare array elements and `i16` values through a scalar copy and a
  literal: `if FX[I] >= 4096` and `if T < Const` are refused.

### Reading the listing

- Read every line of a pattern routine before modelling it: missing one
  `GCHAR`/`HCHAR` pair (Quatrainment's corners) changes the whole puzzle.
  Check the result mathematically when you can (rank of the press table).
- Zoom into blurred scans before guessing values (Circus's line 50 and its
  DATA music were readable at 3x).
- Check which way a shape faces from its bits: the empty side of a
  "pac-man" row is its mouth (Gotcha!'s Collector).
- Count what the listing draws against what it waits for: Circus drew 81
  balloons and waited for 84.

## 9. Sound and music

### BIOS sound tables from `CALL SOUND` / `SOUND` / POKEs

Generate them with `studio/core/colecoSoundNotes.js`
(`buildColecoSoundCommand`, `decodeColecoSoundStream`). A small Node script
turns a list of events `[frames, [freq, vol], ...]` into one stream per
channel and a table:

- areas: `$702B` noise, `$7035` / `$703F` / `$7049` tones 1-3;
- `set sound table Table areas N` must cover the highest area used;
- `play sound Slot` for one stream, `play sounds A, B` to start a chord.

### Speech

TI `CALL SAY` becomes a VoxPCM clip (`colecoVoxPcm.js`,
`play voxpcm Label`). A short phrase synthesized from two or three formant
vowels works without any voice module (Crazy Climber's "uh-oh").

### Tiny Sound music

For a title tune, two-channel SPECIAL-04 streams are compact and play on
their own. Each stream is:

```asm
MelodyLabel:
    db $44              ; tone 1, special effect   ($84 for tone 2)
    dw sndtiny_1        ; sndtiny_2 for the second channel
    db 9                ; frames per step
    db $02,$20,$1A,$21  ; instrument: attenuation 2, decay
    db $1A,$1A,$17,...  ; note codes, $00 hold, $01 rest
    db $FF              ; loop
```

Note codes run from `$04` (A2) upward in semitones: code = MIDI number - 41.
Add the two streams to the sound table (for example areas `$703F` and
`$7049`), start them with `play sounds`, and stop them with `stop sound` and
`mute all` before the game. Check the streams with
`decodeTinySoundSource` from `studio/core/colecoTinySound.js`. Write
original melodies; do not reproduce copyrighted songs.

---

## 10. Computer opponents

Two-player games deserve a one-player mode against the computer
(Blueberries `VS CPU`):

- **Same rules, same pace.** The computer moves once per pass, sees only
  what is on screen, and uses the same scoring.
- **Breadth-first search over the field** toward the nearest goal (a berry
  to pick, the shed when the bag is empty, a random patch of soil to sow
  toward). Store the direction that reached each cell; walk back from the
  goal to find the first step.
- **Re-check before moving.** The search is a few frames old; if the next
  cell has just become dangerous, choose another direction or wait.
- **Make it thrifty.** Track counters incrementally (crop size per field,
  updated on every plant, pick, trample and rot) rather than scanning the
  screen; the computer then sows only what it can harvest.
- **Expose difficulty as constants** (`CropMax`, sowing probability).

---

## 11. Checklist before delivery

- [ ] Credits, historical summary in your own words, list of liberties in the header.
- [ ] Every `print at` fits in columns 2-29 (count the characters).
- [ ] Graphics use codes 128 and up; sprites never sit at Y = 208.
- [ ] `screen on` reached on every path; `set sprite count` after `clear sprites`.
- [ ] Menus clear their rows before the next message.
- [ ] Hot loops checked in the assembly; RAM top below about `$7320`.
- [ ] Per-frame work protected with `nmi off` / `nmi on` if it can grow.
- [ ] Scratch variables re-read before decisions that end the game.
- [ ] A mock rendered from the data matches the article's screenshot in spirit.
- [ ] ROM, `.alexis` source and `.bas` transcription delivered, with what is untested.

---

## 12. Quick reference: decisions made in past ports

| Game | Original | Port decision |
| --- | --- | --- |
| Runway 180 | Graphics in the ASCII range | Moved to 128+ after a font reload broke the screen |
| Mystery Spell | Sprites vanished | `clear sprites` resets the count; set it again |
| Crazy Climber | `CALL SAY("UHOH")` | Formant-synthesized VoxPCM, works without a voice module |
| Get The Gold | Text adventure | Mini-map in the safe area; ADAM version with keyboard and disk save |
| Devastator | `COINC` TOL 30, ship wraps through overscan, `ACCEPT` | Adjustable TOL constants, bouncing inside columns 2-29, joystick menus |
| Jackpot | Keys P, AID, REDO | Help-line menu PLAY / LEVEL / RESET plus keypad shortcuts; spinning reels |
| Bunny Hop | Cell-by-cell hops, ML cloud scroll | Ballistic jump within the original limits, smooth double-buffered tile scroll, Graphics II art, NMI-safe frame loop |
| Blueberries | Two players only, hidden seed count | Computer opponent, bag icon full / half / empty, help page, Tiny Sound title tune |
