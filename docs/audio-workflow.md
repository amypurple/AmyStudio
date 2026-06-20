# Audio Workflow

## PSG Music and Sound Effects (lib4ksa)

1. **Compose** in `CVSoundGen.exe` (path: `../CVSoundGen/CVSoundGen.exe`).
2. **Export** PSG register log or raw `.asm` data per channel.
3. **Normalize** using the forthcoming script `tools/sound/convert_psg.py` (TODO) which will:
   - Split tone/noise
   - Quantize envelopes
   - Generate `DB` tables grouped per frame
4. **Integrate** by copying the generated `.inc` file into `assets/sound/` and referencing it from `src/audio/` routines.

ALEXIS statements for PSG:

```alexis
set sound table SoundTable
play sound 1
stop song
play song MySong
mute all
```

Future enhancements:
- Batch preview inside Amy Studio
- Auto-ducking suggestions when mixing music and effects
- Library of reusable envelopes derived from Amy's past ROMs

---

## Pure Coleco Sound Effects

### What it is

ColecoVision sound effects should use the regular Coleco BIOS/lib4ksa sound
data format and be triggered through the installed sound table with `play sound`.
This is the right path for laser shots, jumps, explosions, pickups, engines,
and other short game effects.

The current Amy runtime already supports this playback model:

```alexis
set sound table GameSoundTable areas 8
play sound 43
```

Existing examples:

- `commando-music-box` uses a single `_snd_table` containing songs plus sound
  effects. The effect slots start at `$2B` and are triggered with `play sound`.
- `diamond-dash-port` uses `DiamondSoundTable areas 6` and short numbered
  effects for gameplay actions.
- `happy-birthday-sound-demo` is a minimal two-effect table demo.

### Sound table validation

Use the validator before turning a hand-authored or generated sound bank into a
Studio asset:

```powershell
node tools/validate-sound-table.mjs --file examples/vendor/music-bank/commando-music-data.asm --table _snd_table --areas 8 --music intro_music,ingame_music,end_level_music,high_score_music --sfx 43-55
```

The validator checks:

- entry 1 targets the lowest sound area `$702B`
- every entry targets an aligned sound area
- music-triggered sound indexes stay in areas 1-4 under the current Amy runtime
- declared SFX indexes stay in higher areas when the table has spare areas

This protects the important Coleco BIOS sound-table contract: low areas are
low priority and are currently owned by music playback, while later areas are
the safer place for gameplay effects.

### Studio sound-effect editor target

`examples/cvsoundfx-web.html` is the current prototype for a visual effect
editor. It lets the user draw one frame per column with:

- sound mode: tone, periodic noise, or white noise
- period/frequency: 10-bit PSG period range
- attenuation/volume: 0..15 hardware attenuation
- start/end playback range
- browser preview using a SN76489-style simulation

The standalone prototype currently exports the expanded tone-channel-1 form:

```asm
laser:
    .db 0x40,0x82,0x00,1
    .db 0x40,0xa0,0x10,1
    .db 0x40,0xbe,0x20,1
    .db 0x40,0xdc,0x30,1
    .db 0x50
```

This is correct but not always compact. A linear frequency and volume sweep can
often be emitted as the BIOS sweep form instead:

```asm
laser:
    .db 0x43,0x82,0x00,0x0e,0x11,0x1e,0x1e,0x11
    .db 0x50
```

In that example:

- `$43` means tone channel 1 plus BIOS command format 3: frequency and volume
  swept.
- `$82,$00` are the starting 10-bit period and starting attenuation nibble.
- `$0e` is the number of sweep steps.
- `$11` means first frequency step length 1 and later frequency step length 1.
- `$1e` is the signed frequency step size, producing `$0082`, `$00a0`,
  `$00be`, and so on.
- The final `$1e,$11` applies the matching volume sweep toward silence.

Channel command bases:

| Base byte | Meaning |
|---|---|
| `$00` | noise |
| `$40` | tone channel 1 |
| `$80` | tone channel 2 |
| `$C0` | tone channel 3 |

The low two bits of the command byte select the BIOS data shape:

| Low bits | Shape | Bytes after command |
|---|---|---|
| `0` | direct period + attenuation + duration | `periodLo, attenuationAndPeriodHi, duration` |
| `1` | direct value plus frequency sweep | `periodLo, attenuationAndPeriodHi, duration, freqStepTiming, freqStepSize` |
| `2` | direct value plus volume sweep | `periodLo, attenuationAndPeriodHi, duration, volumeStepTiming, volumeStepSize` |
| `3` | direct value plus frequency and volume sweep | `periodLo, attenuationAndPeriodHi, duration, freqStepTiming, freqStepSize, volumeStepTiming, volumeStepSize` |

The OS7 sound work area confirms the runtime state used by these forms:
frequency is stored in bytes `+3/+4`, duration in `+5`, frequency sweep in
`+6/+7`, and volume decay/sweep in `+8/+9`.

For Amy Studio, the useful product feature is not the existing standalone ASM
export. The Studio feature should export a BIOS/lib4ksa-compatible sound-table
entry that can be attached to the project and played with `play sound`.

Target workflow:

```alexis
asset JumpSfx from "@project/jump.sfx" codec coleco-sfx

set sound table GameSoundTable areas 8
play sound JumpSfx
```

Implementation notes:

- Preserve the `.sfx` editor format as the editable source: `MODE`, `SIZE`,
  `START`, `END`, followed by `period attenuation` rows.
- Generate pure Coleco sound data from `.sfx`; do not convert effects to tiny
  music.
- Detect simple linear segments and prefer BIOS sweep commands over expanded
  one-row-per-frame output.
- Allow the asset adder to insert both the generated data and a playable alias
  or slot reference.
- Keep music in low-priority sound areas and effects in later/higher-priority
  areas, matching Commando.
- Preview should use the same drawn data before export, so the user hears what
  the generated effect is intended to do.

Open design questions before implementation:

- Whether `play sound JumpSfx` should compile to a generated numeric slot or
  whether Amy should introduce `play effect JumpSfx` as clearer syntax.
- Whether the editor should pack repeated frames to reduce data size.
- Whether generated effects should default to area 5+ when a music table is
  present.

---

## Tiny Music - SPECIAL-04

### What it is

`tiny music` support targets the historical NewColeco `SPECIAL-04` compact music
format used by the Commando sample under `examples/tiny music/applied in a project/`.
In ALEXIS-Z80 this format is played through the `sndtiny_1` / `sndtiny_2` handlers
plus a regular `_snd_table` and music pointer table such as `_commando_music`.
It is primarily a compact music/note stream, not the preferred format for short
sound effects. It is useful for melody lines, simple instruments, and musical
ornaments such as vibrato or arpeggio-like behavior.

### Current support

- `sndtiny_1` and `sndtiny_2` are emitted by the ALEXIS Coleco runtime
- `SPECIAL-04` entries can be referenced from `_snd_table`
- music tables can trigger tiny sound slots through `play song`
- the runtime automatically keeps `ALEXIS_FRAME_COUNTER` active when tiny sound is present
- Commando sample status: working
- status note: tiny sound support is almost perfect; one known bug remains inside the historical tiny sound routine itself and is intentionally deferred for a later fix

### Integration rules

1. Keep the original tiny sound data as assembly includes.
2. Include the source that defines `_snd_table`, `sndtiny_1`, `sndtiny_2`, and the song label.
3. Install the table with `set sound table ...`.
4. Start playback with `play song ...`.

Minimal shape:

```alexis
include "examples/tiny music/applied in a project/snddata_tinymusic.asm"

set sound table _snd_table areas 8
play song _commando_music
```

### CVBasic MUSIC conversion

`tools/convert-cvbasic-music.mjs` converts simple CVBasic `MUSIC` blocks into
Amy-compatible `SPECIAL-04` tiny sound assembly.

This is intended for regular legacy tracks such as:

```basic
music_gladiators:
    DATA BYTE 7
    MUSIC C5,C3,-,-
    MUSIC S,S,-,-
    MUSIC B4,G3,-,-
    MUSIC REPEAT
```

Usage:

```powershell
node tools\convert-cvbasic-music.mjs --input game.bas --output game-music.asm --prefix GameMusic --summary
```

The generated include exposes:

```alexis
include "game-music.asm"

set sound table GameMusic_snd_table areas 4
play song GameMusic_music_gladiators_song
```

The generated sound table intentionally maps music to `$702B`, then `$7035`.
Those are the first ColecoVision sound areas and therefore the lowest-priority
areas when the BIOS mixer decides what reaches the SN76489. Keep music there so
sound effects can use later/higher-priority areas.

Supported in this first pass:

- up to two tonal channels, mapped to `sndtiny_1` and `sndtiny_2`
- `DATA BYTE n` tempo
- note tokens such as `C4`, `C4#`, and `C4S`
- `S` as sustain and `-` as silence
- `MUSIC REPEAT` via tiny-stream looping
- `MUSIC STOP` via a generated silence override in the song table

Not supported yet:

- three or four simultaneous tonal channels
- noise/drums from CVBasic `MUSIC`
- volume or envelope variation
- direct Studio UI import; this is currently a command-line conversion tool

### Important constraints

- `SPECIAL-04` data must keep its historical binary layout; do not reinterpret it as normal lib4ksa sound data
- tiny music playback depends on `PLAY_SOUND_SLOT`, not direct manual copying into sound areas
- tiny sound modulation reads the low byte of `ALEXIS_FRAME_COUNTER`; if the runtime NMI is removed, effects will break
- the current validated reference is [examples/commando-tiny-music-box.alexis](C:\Users\Amy\Desktop\ALEXIS-Z80\examples\commando-tiny-music-box.alexis)

---

## Digital Sound — DSOUND (getput11 / gpdsound.s)

### What it is

Digital sound playback on the ColecoVision AY-3-8910 chip, authored by Amy Bienvenu
(previously Daniel Bienvenu). The technique rapidly modulates the AY-3-8910 volume
registers at high frequency to simulate a DAC. Produces speech, sampled effects, and
sounds impossible with standard PSG tone/noise channels.

Original routine: `getput11/gpdsound.s` — `_play_dsound(void *sound, byte delay)`

This is a **blocking call** — PSG music and sound effects stop during playback.

### Data format

4-bit PCM encoded as nibble pairs with RLE compression.

Nibble values 1–15 represent AY-3-8910 logarithmic volume levels (1 = near-silent,
15 = maximum). Value 0 is reserved as the RLE/termination marker and never appears
as audio data.

**Normal byte:** two samples packed as `(hi_nibble << 4) | lo_nibble`

**RLE code:** `$00` followed by a count byte N — repeat the previous nibble N more times
(used when a value repeats more than 3 consecutive times)

**End of data:** `$00 $00` — two zero bytes terminate the stream

### Sample rate and timing

```
CVSampleRate = 3010000 / (step × 13 + 146)
```

Where 3010000 Hz is the calibrated Z80 clock for ColecoVision hardware timing
(not the theoretical 3579545 — Amy's correction for actual hardware behavior).

| step | sample rate | quality |
|------|------------|---------|
| 0    | ~20616 Hz  | highest |
| 1    | ~19150 Hz  | high |
| 10   | ~11765 Hz  | medium |
| 50   | ~4930 Hz   | low |

### AY-3-8910 volume table

The 16 volume levels (0–15) map to PCM amplitude values via a logarithmic curve
matching the AY-3-8910 hardware. Generated as:

```javascript
// JavaScript equivalent
const table = new Array(16);
let out = 150.0;
for (let i = 15; i >= 0; i--) {
  table[15 - i] = Math.floor(1.4 * Math.floor(out) + 45) & 255;
  out /= 1.26;
}
```

### Conversion tool

Original tool: `C:\Users\Amy\Desktop\Novembre\programmes en VB\wav2cvds\`
(Visual Basic 6, authored by Amy Bienvenu)

Two versions exist:
- `wav2cvds` — v1: RLE nibble compression, direct AY-3-8910 quantization
- `wav2cvds2` — v2: adds FFT pre-processing (`iDFT.bas`, `Vbfft.bas`) for improved
  frequency shaping before quantization. Contains the "delta compression" and better
  quality control Amy mentions. This version is more experimental.

**Web version** (planned): a JavaScript module in ALEXIS-Z80 Studio that accepts a
WAV file and outputs dsound byte data, replacing the VB6 tool with a modern in-browser
workflow.

Planned Studio asset codec integration:

```alexis
asset SpeechHello from "hello.wav" codec dsound step 0 amp 125
```

Planned ALEXIS statement:

```alexis
play dsound SpeechHello
```

### Conversion pipeline (wav2cvds v1 algorithm)

**Pass 1 — Resample and quantize:**
- Read mono PCM WAV (8-bit or 16-bit; 16-bit sign-converted)
- Downsample from source rate to ColecoVision rate using linear interpolation
- Apply amplification (100–700%)
- Optionally adjust amplitude to fit the AY-3-8910 logarithmic curve
- Map each sample to the nearest AY-3-8910 volume level (1–15)
- Write one nibble per byte to a temporary file

**Pass 2 — RLE encode and pack:**
- Read nibbles from temporary file
- Group consecutive identical nibbles into runs
- Runs of 1–3: pack as normal nibble pairs (`$AA`, `$AB`)
- Runs of 4+: emit `$00` + count, then handle remainder as pairs
- Pack two nibbles per output byte
- Terminate stream with `$00 $00`

**Pass 3 — Output:**
- Write as C array (`byte dsound_data[] = { ... }`) or ASM data block

### Important constraints

- Maximum practical data size: limited by ROM space (typically 4–32 KB for a dsound clip)
- Playback blocks the CPU — NMI/music/sprites do not update during playback
- Should not be called from within an NMI handler
- Nibble value 0 must never appear as audio data (reserved for RLE/termination)
- Step value 0 gives highest quality; higher step values reduce sample rate and ROM size
