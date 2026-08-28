# Official ColecoVision Controller Routines

This page preserves the controller model documented by Coleco Industries in
Section VI of the *ColecoVision Programmers' Manual*, Revision 5, and checks it
against the production OS_7 BIOS image and commented disassembly kept with Amy
Studio.

The restored source text was supplied and OCR-cleaned by Amy. An unedited
archival copy is retained as
[`archive/coleco-industries-os-hardware-manual-restored-source.txt`](archive/coleco-industries-os-hardware-manual-restored-source.txt).
The photographed source used to resolve ambiguous `8` and `B` characters is
archived as
[`archive/coleco-industries-appendix-e-jump-table.png`](archive/coleco-industries-appendix-e-jump-table.png).

## The Four Official Layers

Coleco documented four controller services because games have different needs:

| Routine | Intended use | Production OS_7 entry |
|---|---|---:|
| `POLLER` | Selective decode plus two-sample debounce into a user table | `$1FEB` |
| `DECODER` | Immediate decode of one controller and one segment | `$1F79` |
| `CONT_SCAN` | Raw scan of both controller ports into BIOS shadow bytes | `$1F76` |
| `UPDATE_SPINNER` | Spinner pulse interrupt handling | `$1F88` |

This hierarchy is useful design guidance. `POLLER` is the complete general
service, but `DECODER` or `CONT_SCAN` avoids its table and debounce machinery
when a game needs immediate or custom handling.

## POLLER

`POLLER` reads active portions of both controllers, decodes them, and accepts a
changed value only after seeing the same raw value on two successive calls. It
is intended to run once per vertical retrace and cannot safely interrupt itself.

The cartridge header word at `$8008` points to a 12-byte RAM table:

| Offset | Player 1 | Offset | Player 2 |
|---:|---|---:|---|
| `+0` | Enable mask | `+1` | Enable mask |
| `+2` | Left FIRE | `+7` | Left FIRE |
| `+3` | Joystick | `+8` | Joystick |
| `+4` | Spinner count | `+9` | Spinner count |
| `+5` | ARM/right FIRE | `+10` | ARM/right FIRE |
| `+6` | Keypad | `+11` | Keypad |

Enable-mask bits are:

| Bit | Meaning |
|---:|---|
| 7 | Enable this controller |
| 4 | Decode keypad |
| 3 | Decode ARM/right FIRE |
| 2 | Process spinner (implemented by the BIOS although omitted from the printed bit diagram) |
| 1 | Decode joystick |
| 0 | Decode left FIRE |

For example, `$83` enables one controller and requests left FIRE plus joystick.
The BIOS still performs its raw controller scan, but skips disabled decode and
debounce groups.

Debounce state occupies `$73D7-$73EA`: five `(previous value, state)` pairs for
each player. Enabling spinner processing consumes and clears that player's
spinner accumulator.

`POLLER` returns stable held state, not a one-shot press event. A game that needs
press-versus-hold semantics must compare the accepted result with its own prior
accepted state.

## DECODER

`DECODER` is the smaller immediate interface:

```asm
out ($C0),a  ; select joystick hardware mode for segment 0
ld h,0       ; 0 = player 1, 1 = player 2
ld l,0       ; 0 = joystick/left FIRE, 1 = keypad/right FIRE
call $1F79
```

Results:

| Register | Segment 0 | Segment 1 |
|---|---|---|
| `H` | Left FIRE (`$00` or `$40`) | ARM/right FIRE (`$00` or `$40`) |
| `L` | Joystick direction nibble | Keypad code (`$00-$0B`, `$0F` for none) |
| `E` | Previous spinner accumulator | Not specified |

Unlike `POLLER`, it has no two-pass debounce and needs no 12-byte controller
table. In the production BIOS implementation, segment 0 consumes and clears the
selected spinner accumulator. Segment 0 does not select joystick hardware mode
itself; callers that did not just run `CONT_SCAN` must write to port `$C0`
before the call. GearColeco runtime tests caught and verify this precondition.

## CONT_SCAN

`CONT_SCAN` at `$1F76` performs one complete hardware scan and writes raw,
active-high values to:

| Address | Meaning |
|---:|---|
| `$73EE` | Player 1 joystick/left FIRE |
| `$73EF` | Player 2 joystick/left FIRE |
| `$73F0` | Player 1 keypad/right FIRE |
| `$73F1` | Player 2 keypad/right FIRE |

It destroys `AF`. This is the appropriate BIOS layer when a game wants its own
decode, edge detection, or controller policy.

## Spinner Handling

The printed manual describes `UPDATE_SPINNER` as the maskable interrupt routine
installed through the cartridge IRQ vector at `$801E`. It increments or
decrements `$73EB`/`$73EC` according to spinner direction and pulses.

The production BIOS image exposes `$1F88 -> $116A`, a routine that samples both
spinner pulse inputs and updates those counters. The photographed jump table
also prints `UPDATE_SPINNER $1F88`, and Amy's spinner interrupt path uses this
entry. `$1F8B` is an OCR confusion between `8` and `B`; in the production BIOS,
that next jump-table slot enters unrelated graphics code.

## OCR Corrections And Verified Differences

The restored text passed through several generations of copying and OCR. The
photographed jump table and the production BIOS binary settle its ambiguous
hexadecimal characters:

- `WRITER` is `$1FE8` and `POLLER` is `$1FEB`. The OCR text reverses them by
  reading `8` as `B` and `B` as `8`. Their adjacent three-byte jump-table slots
  and the production targets `$1FE8 -> $0679` and `$1FEB -> $11C1` confirm this.
- `UPDATE_SPINNER` is `$1F88`, not the OCR transcription `$1F8B`.

Two behavioral details still differ between the manual's prose and the verified
production implementation:

- The manual says `DECODER` calls `CONT_SCAN`. The production `$1F79` routine
  directly reads only the requested controller/segment instead of calling the
  full `$1F76` scan.
- The printed enable-mask diagram marks bit 2 as don't-care, while both its text
  and the production code use bit 2 to enable spinner processing.

The address issues are OCR errors, not shared entry points or evidence of BIOS
aliasing. The remaining behavioral differences may be simplified documentation
or implementation drift. For portable cartridge code, use the photographed
jump table and production BIOS behavior while retaining the prose as the
historical API description.

## Amy Studio Guidance

- Amy selects its controller backend once for the whole program, independently
  of the ASM optimization profile. One requested controller segment uses BIOS
  `DECODER`; several standard-controller segments use one `CONT_SCAN` followed
  by only the required compact decoding. This avoids unreliable back-to-back
  `DECODER` calls and unused controller RAM.
- The specialization covers constant-port directions, `button1`, `button2`,
  `.fire`, keypad, `.pressed`, `wait fire`, `wait no fire`, timed press waits,
  `pause until press`, `choose keypad`, `choose menu`, and CRT sleep.
- Dynamic ports, raw joypad reads, spinner, `.action`, and Super Action buttons
  3-4 conservatively keep Amy's general controller backend. Unsupported mixes
  never partially use a specialized backend.
- Prefer `joypad(N).property.pressed` for immediate one-shot input, including
  all four Super Action Controller buttons. Those broader controls use Amy's
  general backend when BIOS `DECODER` cannot preserve their semantics.
- Use `DECODER` from inline ASM when immediate official BIOS decoding is useful
  and the two-pass debounce is unwanted.
- Use `CONT_SCAN` when implementing a custom decoder around the four BIOS shadow
  bytes.
- Use `POLLER` deliberately when the original selective two-sample debounce and
  controller-map contract are desired.

## Measured Three-Method Comparison

`tools/benchmark-controller-methods.mjs` executes the production BIOS in
GearColeco with player 1 holding UP plus left FIRE. Counts include the calling
`CALL` instruction and run to its return address:

| Method | Measured cycles | Instructions | What the result provides |
|---|---:|---:|---|
| `CONT_SCAN` `$1F76` | 222 | 20 | Four raw BIOS shadow bytes; caller must decode |
| `DECODER` `$1F79`, segment 0 | 253 | 29 | One player's FIRE, joystick, and spinner result |
| `POLLER` `$1FEB`, FIRE + joystick | 956-1072 | 83-91 | Selected decoded groups with two-sample debounce |

The methods are not exact substitutes. `CONT_SCAN` has the lowest BIOS cost but
needs cartridge decoding. `DECODER` is efficient when only one controller
segment is needed; reading both segments requires two calls. `POLLER` spends
more time and RAM to maintain its selective stable-state service.

For Amy's existing controller runtime, `.pressed` adds 20 bytes of ROM in a
minimal Balanced build and two RAM bytes per involved constant port. Its edge
capture adds about 95 cycles for the first port after Amy's normal frame scan
and decode. These are incremental Amy costs, whereas the table above measures
complete BIOS calls, so they must not be added or compared as if they represented
identical work.

## RAM Safety In Amy Studio

Amy's generated runtime and user variables stay below `$73B8`. The complete
BIOS/getput11 area `$73C4-$73FB` is reserved, so Amy does not allocate controller
state over any of these BIOS-owned regions:

| Region | Owner |
|---|---|
| `$73D7-$73EA` | `POLLER` debounce state |
| `$73EB-$73EC` | Spinner accumulators used by `DECODER` and `POLLER` |
| `$73EE-$73F1` | Raw `CONT_SCAN` controller shadows |

Amy deliberately reuses `$73BA-$73BB`, part of the old Pascal parameter area,
for its optional 16-bit frame counter. The production implementations of
`CONT_SCAN`, `DECODER`, `POLLER`, and spinner update do not access that address,
so this reuse does not conflict with controller input. Other legacy BIOS Pascal
wrappers can use the parameter area and must not run concurrently with Amy's
frame-counter feature unless their RAM contract is handled explicitly.

A future `POLLER` backend must reserve its separate 12-byte controller result
table in Amy's low RAM and write that address into cartridge header word `$8008`.
It must never point the BIOS at reclaimed high RAM or at unrelated Amy state.
`tools/test-controller-ram-safety.mjs` guards the current allocation boundary.
`tools/test-controller-backend-selection-rom.mjs` compiles thirteen specialized
and fallback programs under all five profiles. It checks backend and RAM-map
selection, then verifies both FIRE buttons, all twelve keypad values, both
ports, edge detection, release waits, press/release pauses, and timed exits in
GearColeco.

