# Amy suggestions from the COMPUTE! TI-99/4A ports

Date: 2026-10-19
Source: porting about a dozen TI-99/4A Extended BASIC listings from COMPUTE!
magazine to ColecoVision with `tools/amyc.mjs` (Jumping Jack, Gold Miner,
First Math, Southern States, Diamond Drop, Mystery Spell, Runway 180, Balloon
Crazy, Ludwig, Crazy Climber, Get The Gold, Devastator, Jackpot).

Each item says what happened in a real port, what the workaround cost, and
a proposal. Items are ordered by how much they would have saved.

---

## 1. `choose menu ... at list`: menus that are not vertical

### What happened

`choose menu` only handles a vertical list (`at X,Y step N`). Two ports
needed something else:

- **Jackpot:** the help line under the payout chart became a horizontal menu
  `PLAY   LEVEL   RESET` on row 21. It took about 35 lines of hand-written
  code (cursor erase and redraw, `left.pressed` / `right.pressed`, fire,
  plus keypad shortcuts):

  ```basic
  key_wait:
    wait
    if joypad(1).fire then
      if Menu = 0 then goto play_round
      if Menu = 1 then goto choose_level
      goto reset_money
    end if
    if joypad(1).right.pressed then
      if Menu < 2 then
        inc Menu
        ShowMenu
      end if
    end if
    if joypad(1).left.pressed then
      if Menu > 0 then
        dec Menu
        ShowMenu
      end if
    end if
    Choice = keypad(1)
    if Choice = 10 then goto choose_level   ' * shortcut
    if Choice = 11 then goto reset_money    ' # shortcut
    goto key_wait

  sub ShowMenu:
    put char 32 at 4,21
    put char 32 at 12,21
    put char 32 at 21,21
    X = MenuX[Menu]
    put char 62 at X,21
    return
  end sub
  data MenuX bytes 4,12,21
  ```

- **Devastator:** the `YES` / `NO` question worked with the vertical form,
  but only because there was room for a two-row layout.

### Proposal

Accept a data table of cursor positions instead of `at X,Y step N`:

```basic
data MenuSpots bytes 4,21, 12,21, 21,21
choose menu 1 to 3 into Choice cursor $3E at list MenuSpots
```

```basic
' Sprite cursor, pixel coordinates
data MenuSpotsPx bytes 32,168, 96,168, 168,168
choose menu 1 to 3 into Choice cursor sprite 0 at list MenuSpotsPx
```

Suggested rules:

- Entry N of the list is the cursor position for choice `min + N`. The
  compiler can check that the list holds `2 * (max - min + 1)` bytes.
- LEFT and UP move to the previous entry; RIGHT and DOWN move to the next.
  The same code then serves a row, a column or a wrapped row.
- Wrapping should behave like the vertical form, with an optional
  `no wrap`.
- `clear Tile`, `on joypad N` and `sleep after N seconds` keep their current
  meaning.
- Like the current form, the cursor sits on the given coordinate, not next
  to it.

### Companion: keypad escapes

As soon as a menu has a shortcut outside its range (Jackpot's `*` and `#`),
a hand-written loop is needed again. A way to leave the menu on extra keys
would cover it:

```basic
choose menu 1 to 3 into Choice cursor $3E at list MenuSpots escape keypad 10,11 into Key
' Key = 255 when the menu ended normally, otherwise the escape key
```

### Later: spatial navigation

For a grid (an on-screen keyboard, a level map), "the nearest entry in the
pushed direction" feels better than previous/next. This could be a flag
(`navigate spatial`) on the same list form.

---

## 2. Inline `if ... then` does not accept every simple statement

### What happened

Some statements work on a single-line `if`, others stop the build:

| Works inline | Fails inline: `Unsupported inline statement` |
| --- | --- |
| `if Secs > 0 then dec Secs` | `if N = SparkTile then put char StarTile at SparkX,SparkY` (Devastator) |
| `if Y = 208 then Y = 207` | `if Tick = 16 then put char 32 at 11,22` (Devastator) |
| `if DY <= Tol then AlienDestroyed` | `if Left[K] = 0 then play sound SndClunk` (Jackpot) |
| `if Choice = 1 then goto new_round` | |

Each time, the fix was the three-line block form. It costs one compile per
occurrence, and it is hard to guess which statements are allowed.

### Proposal

- Allow any single statement that is legal on its own line after `then`.
  At least `put char`, `put ... count`, `fill`, `print at`, `play sound`,
  `play sounds`, `set sprite`, `hide sprite`, `vpoke` and `backdrop` were
  wanted in these ports.
- If some forms must stay excluded, have the error name the statement and
  suggest the block form:

  ```
  line 412: 'put char' is not allowed after an inline THEN;
  use  if ... then / put char ... / end if
  ```

---

## 3. A CLI that runs a ROM and saves screenshots

### What happened

`amyc.mjs` builds ROMs, but nothing in the CLI runs them. These bugs reached
the user before anyone saw the screen:

- **Southern States:** blue screen after the title, because of a missing
  `screen on`.
- **Mystery Spell:** invisible sprites, because `clear sprites` resets the
  sprite count (see item 5).
- **Runway 180:** font corruption, because its tiles sat in the ASCII range.
- **Devastator:** the `NO` / `SO LONG` overprint.
- **Several ports:** text one column into the overscan.

The GearColeco web core already exists for the Studio recorder. The missing
pieces are a headless entry point and a BIOS path.

### Proposal

```
node tools/amyc.mjs game.alexis --rom game.rom \
     --run 600 --bios /path/coleco.rom \
     --input "120:fire,200-260:right" \
     --screenshot 180,420,600 --out shots/
```

- `--run N` emulates N frames.
- `--input` is a small frame-indexed controller script.
- `--screenshot` writes PNGs, and optionally a name-table text dump.
- The run fails if the program never calls `screen on`, or if a breakpoint
  label is reached.

This lets an assistant or CI check every screen before delivery. It would
have caught every item in the list above.

---

## 4. A safe-area check for the CRT overscan

### What happened

The house rule for these ports: nothing important in columns 0, 1 and 31.
Violations were found by eye (Jumping Jack, Southern States, Runway 180,
Diamond Drop). Most coordinates in a port are constants, so the compiler
could check them.

### Proposal

```basic
safe area columns 2 to 29
```

- **Constants:** warn (not error) when a constant-coordinate `print at`,
  `put ... count N at`, `fill ... count N at` or `put char` writes outside
  the area. Include the last column reached:

  ```
  line 88: print at 1,5 writes columns 1-20, outside safe area 2-29
  ```

- **Sprites:** a runtime-free option, `safe area sprites 16 to 239`, could
  warn on constant `set sprite` X values outside the range.

---

## 5. Sprite-table surprises

### `clear sprites` also sets the sprite count to zero

Mystery Spell drew sprites after `clear sprites` and saw nothing. Every
later port now uses a helper:

```basic
sub HideAll:
  clear sprites
  set sprite count 4
  update sprites
  return
end sub
```

**Proposal:** either keep the active count, or make the docs say plainly,
next to `clear sprites`, that the count becomes 0 and has to be set again.

### The `$D0` terminator with moving sprites

Devastator's guardian, which wraps like the TI version, needed a manual
guard:

```basic
if Y = 208 then Y = 207   ' Y = 208 would end the sprite list
```

The docs explain `$D0`. A `set sprite` option that does this automatically
(`set sprite I to Y,X,P,C safe`), or a global `sprites avoid terminator`,
would remove a whole class of "half my sprites vanished" bugs.

---

## 6. Signed motion on unsigned positions

### What happened

TI `CALL MOTION` velocities are signed. Positions are best kept in 8.8
fixed point in a `u16` so they wrap like the TI sprite plane. Mixing the
two needed tricks:

```basic
AlienVX = random(0, 39)
AlienVX <<= 4
AlienVX -= 320            ' two's complement stored in a u16
AlienX16 += AlienVX       ' works because u16 addition wraps
if AlienVX >= 32768 then  ' "is the velocity negative?"
```

### Proposal

- Document that `u16 += i16` (and `-=`) wraps modulo 65536. If it is not
  allowed today, accept it.
- An `fx16` or `fixed` 8.8 type with `.int` / `.frac` access would make
  `Tmp16 = AlienX16 >> 8 : X = Tmp16` unnecessary. The compiler has
  `fx16Helpers`; if a user-facing form exists, a short example in the
  sprite section would help.
- A small per-sprite motion helper would turn every XB `CALL MOTION` into
  one line:

  ```basic
  set sprite 1 motion to VY,VX     ' 1/16 pixel per frame, like XB
  update motion                    ' once per frame, before update sprites
  ```

---

## 7. Mixed-width comparisons generate 32-bit code

### What happened

In Devastator's hit test, `DX` was an `i16` and `Tol` a `u8`:

```basic
if DX <= Tol then
```

This compiled to a full 32-bit compare: both operands copied into
`AMY_CMP_LEFT32` / `AMY_CMP_RIGHT32`, then four byte-compare steps. It ran
every frame.

### Proposal

When one side is `i16` and the other `u8`, widen the `u8` to 16 bits and
use a 16-bit signed compare (`sbc hl,de` plus the sign/overflow fix-up).
The same applies to `i16` against a small constant.

---

## 8. Text in a custom character set

### What happened

Several TI programs redefine letters at other codes. Jackpot shows `ONE
DOLLAR PER PLAY` with TI letters remapped (`C` is N, `F` is L, `0` is O),
and the port moved all 112 characters to codes 144-255. Every message
string had to be converted by a Python script into `data ... bytes` lists:

```basic
' Line 830: YOU ARE WINNING $
data MsgWin bytes 193,160,197,231,177,194,181,231,199,176,179,179,176,179,183,231,174
```

### Proposal

A per-string or global character map:

```basic
charmap TiText offset 112          ' simple shift
data MsgWin text "Q0UwAREwW@CC@CGw>" charmap TiText
```

```basic
charmap Custom "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" to 160
print at 3,10, "PRESS FIRE" charmap Custom
```

A `print ... charmap` form would also remove the need to keep the ASCII
font loaded just for a few messages.

---

## 9. Scrolling a text window

### What happened

The TI `PRINT` statement scrolls the screen. Devastator's title and Get The
Gold's message window needed one constant `copy` per row, generated by a
script:

```basic
copy vram.name + 34 count 28 to vram.name + 2
copy vram.name + 66 count 28 to vram.name + 34
' ... 21 more lines
```

### Proposal

```basic
scroll text up from 2,0 size 28,23          ' clears the freed row with $20
scroll text up from 2,10 size 28,8 fill 136
```

It could also be offered as a `print` mode for TI and BASIC ports:
`print scroll at 2,22, "TEXT"`.

---

## 10. Sound effects declared in Amy

### What happened

Every port uses an external Node script built on
`studio/core/colecoSoundNotes.js` (`buildColecoSoundCommand`) to turn
`CALL SOUND` into BIOS sound streams, then pastes the result into
`asm { }`. The script also prints the slot numbers that the Amy code has
to repeat as constants (`const SndClunk = 2`).

### Proposal

A declarative block the compiler turns into the same table:

```basic
sound table JackpotSounds
  effect Clunk   noise 5 volume 15 frames 3          ' CALL SOUND(50,-6,0)
  effect Coin    tone 1000 volume 15 frames 2, tone 3250 volume 15 frames 2, tone 6750 volume 15 frames 2
  effect SirenUp sweep 700 to 900 step 10 volume 15 frames 2 each
end sound

play sound Clunk           ' names, not slot numbers
```

The Studio Sound FX editor may already cover this. If so, a short
"CLI-only workflow" section in `audio-workflow.md` would help.

---

## 11. Small things

- **Reserved label names:** `play:` as a label fails with "collides with
  existing reserved Amy keyword". The message is clear. A list of reserved
  words in `amy-language.md` would avoid the round trip.
- **`random(A, B)` with variable bounds:** the docs show constant bounds.
  The ports used `random(0, 208)` plus a clamp, to stay on the safe side.
  It would help to state whether `random(MinX, MaxX)` is supported.
- **`screen on` reminder:** a compile warning when a program never calls
  `screen on` (or calls it only on some paths) would have saved the
  Southern States blue screen.
- **`keypad(N)` values:** the docs are clear (`10` = `*`, `11` = `#`,
  `255` = none). Named constants (`KeyStar`, `KeyHash`, `KeyNone`) would
  make code self-documenting.

---

## 12. The NMI reads the VDP status before checking the `$701F` guard

### What happened

Bunny Hop showed random characters during play. Its frame work sometimes
runs past one video frame: on the frame where a cloud row finished an
8-pixel step, it rebuilt three 28-tile rows in Amy loops. The next NMI then
arrived while the main program was in the middle of a VRAM transfer.

`nmi-runtime-contract-2026-06-22.md` says helpers set `$701F = $A5` around
fragile VDP sequences, so that an NMI landing there "returns without reading
VDP status". The full runtime NMI generated for Bunny Hop does the opposite.
It reads the status port first, then checks the guard:

```asm
AMY_NMI_DO_WORK:
        in a,(VDP_CTRL_PORT)      ; status read: resets the VDP address latch
        ld (NMI_FLAG),a
        ld (VDP_STATUS),a
        ld a,($701F)              ; guard checked too late
        cp $A5
        jr nz,AMY_NMI_CONTINUE
```

The `NO_NMI` path reads the status port unconditionally as well. Either way,
an NMI between the two address bytes of a VRAM write moves the rest of the
transfer to a wrong address.

### Workaround used

The game now runs with `nmi off` and turns the interrupt on only around
`wait`:

```basic
sub FrameUpdate:
  nmi on
  wait
  nmi off
  ...
```

The rows are also no longer rebuilt in loops: each cloud row keeps a
circular start index, and one cell step is just two `put` / `merge` calls.

### Proposal

- Check `$701F` before the `in a,(VDP_CTRL_PORT)` on every NMI path, as the
  contract describes. Set a "status pending" flag so the next `wait`, or the
  helper that clears the guard, reads the status afterwards.
- Add a ROM test: a long VRAM `copy` loop running while NMIs fire, then
  compare VRAM with the expected bytes.
- A compiler or debugger warning when a frame loop's worst-case cycle count
  exceeds one frame would also help (the routine cycle profiler exists in
  `tools/`).

---

## 13. Globals reused as scratch across subroutine calls

### What happened

Not a compiler bug: the programs did what they said. But the same mistake
cost three ports a real gameplay bug, and the compiler has the information
to catch it.

A routine computes a value in a global, calls a subroutine that also uses
that global as scratch, then reads the global again as if it still held its
value:

- **Bunny Hop** (`CarryCheck`): the cloud row index in `M` was overwritten
  by the cell value, so every cloud looked like a right-moving one and
  carried the rabbit the wrong way.
- **Blueberries** (`FarmhandSick`): `N` held the farmhands left, then
  `ShowStatus` and `PlaceFarmers` reused `N` before
  `if N = 0 then Over = true`. The computer kept playing with no
  farmhands.
- **Olympiad** (`knight_falls`): `N` held the fallen side's losses, then
  `ShowStatus` reused it before `if N >= 3 then goto game_over`. The game
  ended after one hit, or went on after the third.

```basic
N = Lost[V]
inc N
Lost[V] = N
ShowStatus            ' writes N internally
wait 40 frames
if N >= 3 then goto game_over   ' N is no longer the loss count
```

### Proposals

1. **Warning: read after clobbering call.** The compiler knows which
   globals each subroutine writes (directly or through its callees). Warn
   when a global is written, then a call to a routine that also writes it
   follows, then the global is read before being assigned again:

   ```
   line 412: N is read after a call to ShowStatus, which also writes N
             (line 655); re-read it or use a local
   ```

   Limit it to plain scalars to keep it quiet. Arrays and record fields
   would be a later step.

2. **Show each routine's side effects in Studio.** On hover over a call (or
   in the outline), list the globals the routine and its callees modify:
   `ShowStatus writes: N, M, NumU, Tmp16`.

3. **Encourage locals in the docs and examples.** `local u8 N` in
   `ShowStatus` would have prevented all three cases. A short "use locals
   for scratch values in subroutines" note next to the `local` declaration,
   with the RAM and stack cost, would make it the default habit.

