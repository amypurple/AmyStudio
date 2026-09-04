# Audio Workflow

## Choose the sound path

Amy Studio currently supports three playback families, plus one historical reconstruction workflow that is not yet integrated. Choose by runtime need rather than treating them as interchangeable:

| Need | Format and Amy path |
|---|---|
| Coleco BIOS/lib4ksa music and effects | sound table plus `play sound N` |
| Amy's compact music/effect sequences | Tiny Sound / `play tiny` workflows |
| Short digital voice or sampled audio | DSound / `play dsound` |
| Reconstruct WAV audio as editable PSG notes | historical WAV2CV FFT pipeline; planned Studio tool |

Coleco BIOS sound composition remains technical because its compact commands directly describe PSG periods, attenuation, duration, sweeps, and sound-area behavior. Amy Studio provides a Sound FX editor inside the source sound inspector: select a command, change its note/noise, channel, volume, duration or envelope, audition it, replace it, then play and save the complete sequence. Existing advanced sweep commands remain byte-exact unless deliberately replaced. Full song arrangement remains future work.

The source sound inspector includes a small command authoring preview. `Echo tail` models a sustained note followed by a quieter tail: a volume-sweep step of `+3` is approximately -6 dB, and a BIOS sweep count of `2` means one transition because the count includes the initial volume. The first-transition delay is a four-bit value, so a single-command echo can hold its main volume for only 1..16 frames. Longer musical echoes need multiple commands or another sound-table area.

The preview can accept Note On and Note Off messages from a Web MIDI keyboard. MIDI note number selects note/octave, velocity selects Coleco volume 1..15, and held time becomes a deterministic PAL/NTSC frame count when the key is released. The browser asks for access only after `MIDI` is pressed. A held note saturates at the BIOS command limit of 256 frames; one-command echo capture is capped at its 16-frame initial-delay limit.

Open `SOURCE` > `SOUND` to enter the compact sound library. Use `Play`, `Edit`, or `Sequencer` directly. `Composer` builds individual commands; `Technical` reveals decoded bytes and priority only when needed. The regular BIOS editor can add, duplicate, reorder, delete, audition, and save commands while preserving shared tails.

For Tiny Sound music stored as `_ch1` and `_ch2`, choose `Sequencer` beside channel 1. Both channels appear as synchronized columns with duration-scaled notes, rests, holds, a shared `Play`/`Pause`/`Stop` transport, and a playhead that highlights the active events. Select a plain note, choose a pitch, and use `Preview note` repeatedly before saving. Amy Studio replaces only that command byte; arpeggios and special commands remain read-only until their exact encoding is fully covered.

DSound is not the WAV-to-notes converter. It preserves a short waveform as digital amplitude samples. Amy's historical `WAV2CV3` instead uses FFT analysis to extract dominant frequencies and strengths over time, then produces ordinary PSG tone commands that can coexist with gameplay. See [Legacy WAV to ColecoVision PSG Reconstruction](legacy-wav-to-coleco-psg-reconstruction.md).

## PSG Music and Sound Effects (lib4ksa)

BIOS/lib4ksa sound data may be embedded as editable ASM in the project or included from a project file. Existing external composition tools such as CVSoundGen remain optional sources of sound data.

Amy statements for PSG:

```basic
set sound table SoundTable
play sound 1
stop song
play song MySong
mute all
```

Important: `play sound N` selects the Nth sound-table entry. Inserting or removing an entry shifts every later number. Preserve positional slots with a compatible alias, or update and test every later `play sound` command.

In the optional Assistant Lab, `/sound` performs a read-only inspection of embedded
`.asm`, `.inc`, and `.s` files. It lists recognized BIOS tables and sound areas and
flags missing labels or invalid area alignment. It deliberately does not regenerate
the source, so shared-tail labels and hand-optimized byte layout remain untouched.

The Studio sound-authoring foundation also uses a DOM-free Coleco BIOS note
encoder. It distinguishes NTSC and PAL periods and preserves the historical bass
formats: a simple bass noise command contains its filler byte, while a faded bass
command does not. This low-level layer is tested independently before a visual
music editor is allowed to emit project data.

The low-level encoder covers all four BIOS tone forms: simple note, frequency
sweep, volume sweep, and combined frequency-plus-volume sweep. The friendly note
helper supplies periods and a standard fade, while expert controls retain exact
period, attenuation, step count, step duration, and signed frequency-step bytes.

Runtime validation compiles a generated BIOS note under every optimization
profile and runs each ROM through GearColeco. The test requires non-silent PCM,
matching pitch, duration, and peak amplitude; profiles with equivalent generated
code must also produce byte-identical PCM. Tiny cycle differences before playback
may shift oscillator phase, so a raw whole-capture hash alone is not treated as a
musical correctness test.

---

## Pure Coleco Sound Effects

See also: [Legacy WAV2CV to Coleco BIOS Sound Porting](legacy-wav2cv-to-coleco-bios-porting.md) for converting old Hi-Tech C / SDCC WAV2CV arrays into Amy-compatible sound table includes.

### What it is

ColecoVision sound effects should use the regular Coleco BIOS/lib4ksa sound
data format and be triggered through the installed sound table with `play sound`.
This is the right path for laser shots, jumps, explosions, pickups, engines,
and other short game effects.

The current Amy runtime already supports this playback model:

```basic
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

### Planned Studio asset workflow - not compilable today

The following syntax is a design target. `codec coleco-sfx`, named `play sound JumpSfx`, and `play effect` are not accepted Amy syntax today.

```basic
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
In Amy Studio this format is played through the `sndtiny_1` / `sndtiny_2` handlers
plus a regular `_snd_table` and music pointer table such as `_commando_music`.
It is primarily a compact music/note stream, not the preferred format for short
sound effects. It is useful for melody lines, simple instruments, and musical
ornaments such as vibrato or arpeggio-like behavior.

### Current support

- `sndtiny_1` and `sndtiny_2` are emitted by the Amy Coleco runtime
- `SPECIAL-04` entries can be referenced from `_snd_table`
- music tables can trigger tiny sound slots through `play song`
- the runtime automatically keeps `AMY_FRAME_COUNTER` active when tiny sound is present
- Commando sample status: working
- status note: tiny sound support is almost perfect; one known bug remains inside the historical tiny sound routine itself and is intentionally deferred for a later fix
- the Studio sound inspector decodes tempo, instrument, notes, sustain, silence, drums, special notes, and loops; it can audition one Tiny Sound channel or matching `_ch1`/`_ch2` pairs
- plain Tiny Sound note pitches can be edited with byte-local source preservation; instruments, timing, arpeggios, drums, and special commands remain read-only until their exact encoding is fully covered

### Integration rules

1. Keep the original tiny sound data as assembly includes.
2. Include the source that defines `_snd_table`, `sndtiny_1`, `sndtiny_2`, and the song label.
3. Install the table with `set sound table ...`.
4. Start playback with `play song ...`.

Minimal shape:

```basic
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

```basic
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
- tiny sound modulation reads the low byte of `AMY_FRAME_COUNTER`; if the runtime NMI is removed, effects will break
- the current validated Studio reference is `studio/examples-src/commando-tiny-music-box.alexis`

---

## Digital Sound — DSOUND (getput11 / gpdsound.s)

### What it is

Digital sound playback on the ColecoVision AY-3-8910 chip, authored by Amy Bienvenu
(previously Daniel Bienvenu). The technique rapidly modulates the AY-3-8910 volume
registers at high frequency to simulate a DAC. Produces speech, sampled effects, and
sounds impossible with standard PSG tone/noise channels.

This path does not infer musical notes, PSG voices, or BIOS sweep commands from the WAV. Use the separate WAV-to-PSG reconstruction workflow for that purpose.

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

Original tool: Amy's historical `wav2cvds` Visual Basic 6 project.

Two versions exist:
- `wav2cvds` — v1: RLE nibble compression, direct AY-3-8910 quantization
- `wav2cvds2` — v2: adds FFT pre-processing (`iDFT.bas`, `Vbfft.bas`) for improved
  frequency shaping before quantization. Contains the "delta compression" and better
  quality control Amy mentions. This version is more experimental.

**Integrated web version:** Amy Studio's **Audio/Voice -> DSound** dialog accepts browser-decodable audio or a microphone recording, converts it to DSound, previews the result, and can insert inline data or save an embedded project file.

Current embedded-file workflow:

```basic
asset SpeechHello from "@project/hello.dsound" codec raw
play dsound SpeechHello step 0
```

The converter's **Save + insert play snippet** action creates the project file and matching Amy source. `DSound Voice Minimal` is the smallest complete Studio example.

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

