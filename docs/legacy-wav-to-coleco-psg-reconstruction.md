# Legacy WAV to ColecoVision PSG Reconstruction

## Purpose

This workflow reconstructs a WAV recording as ColecoVision PSG notes and effects. It is not DSound sampling.

- **WAV to PSG reconstruction** analyzes pitch and loudness over time, then emits compact tone-channel commands for the SN76489 through the Coleco BIOS/lib4ksa player.
- **DSound** quantizes the waveform into digital amplitude samples and plays them with a blocking software-DAC routine.
- **Tiny Sound** is a compact authored note/effect stream with musical ornaments such as vibrato and arpeggios.

The reconstructed PSG result is necessarily lossy: three tone channels and one noise channel cannot preserve every component of an arbitrary recording. The intended result is a recognizable, editable ColecoVision arrangement suitable for normal gameplay.

## Recovered Historical Evidence

Amy's historical `WAV2CV3` Visual Basic project is preserved under:

```text
C:\Users\Amy\Desktop\Novembre\programmes en VB\wav2cv3
```

The active VB6 project combines `Frm_main.frm`, `Slow7.bas`, and `VBFFT.BAS`. The source establishes this pipeline:

1. Accept mono PCM WAV data in 8-, 16-, or 32-bit storage.
2. Divide input into time windows related to PAL or NTSC updates.
3. Zero-pad each window to the next FFT power of two.
4. Compute its spectrum and restrict analysis to a user-selected frequency range.
5. Find the strongest spectral region, calculate its weighted center, and refine the frequency estimate.
6. Convert frequency to an SN76489 period with `3579000 / 32 / frequency`.
7. Convert spectral strength to the PSG's 4-bit attenuation.
8. Remove the selected spectral region and repeat for additional simultaneous tone channels.
9. Emit Marcel de Kogel/WAV2CV commands, rests, termination, and optional looping.

The old converter already performs one safe compaction: adjacent identical notes are represented by one note with a longer duration instead of repeated commands.

The sibling `wav2cv4 en vb` directory contains later experiments using several Fourier-like transforms. These are research evidence, not automatically the canonical implementation. A new browser port should first reproduce the validated `WAV2CV3` behavior, then compare alternatives with audible and byte-size tests.

## Coleco BIOS Target

Amy Studio's preferred final target is the regular Coleco BIOS/lib4ksa sound-table format used by:

```amy
set sound table GameSoundTable areas 8
play sound SoundIndex
```

Each direct tone command stores a 10-bit PSG period, 4-bit attenuation, and duration. The low two bits of its command byte select direct, frequency-sweep, volume-sweep, or combined-sweep data. See [Audio Workflow](audio-workflow.md) for the byte layout and sound-area rules.

Historical WAV2CV arrays used Marcel de Kogel's channel allocator. The existing `tools/convert-wav2cv-to-coleco-bios.mjs` converts those arrays to explicit BIOS/lib4ksa entries. That converter ports existing command arrays; it does not analyze a WAV file.

## Two Levels of Compaction

### Exact command compaction

These transformations must reproduce the same PSG register values over the same ticks:

- merge adjacent identical notes or rests by increasing duration;
- split only when the BIOS duration field requires it;
- replace a sequence with a frequency, volume, or combined sweep only when every generated step matches;
- share an identical suffix by placing a second sound label inside an existing stream;
- preserve all positional sound-table entries so `play sound N` keeps its meaning.

DacMan demonstrates two important forms. `DacmanDing` and `DacmanNewLife` replace repeated direct commands with BIOS sweep commands. `DacmanOpenLock`, `DacmanTeleport`, and `DacmanKey` also demonstrate labels entering useful suffixes of longer streams without duplicating those bytes.

### Controlled lossy musical optimization

Lossy optimization may reduce data when an exact sweep is impossible, but it must remain optional and previewable. Candidate operations include:

- quantize nearby periods to one stable note;
- approximate a nearly linear pitch or attenuation sequence with one sweep;
- discard spectral components below a configurable loudness threshold;
- reduce channel count when the omitted voice is perceptually weak;
- merge very short fluctuations that do not materially change the phrase;
- share near-identical phrases only after their audible difference is accepted.

Every proposal must report original bytes, optimized bytes, duration change, maximum period/frequency error, attenuation error, and affected time range. Amy Studio must never overwrite the source or claim losslessness when these tolerances are nonzero.

## Proposed Studio Workflow

1. Import or record a short mono WAV.
2. Choose NTSC, PAL, or dual-region analysis timing.
3. Select frequency range, number of tone voices, amplitude threshold, and time precision.
4. Analyze and display frequency tracks plus attenuation envelopes.
5. Audition the original WAV, expanded PSG reconstruction, exact compact form, and optional lossy candidates.
6. Edit notes, sweeps, durations, channel assignments, and sound-area placement visually.
7. Export an editable project asset and generated BIOS sound-table entry.
8. Validate table layout, positional indexes, ROM size, and playback in the ROM debugger.

The UI should expose musical units such as hertz, note names, cents, ticks, and attenuation while retaining an advanced byte view. It should not ask users to understand raw command bytes before they can hear or edit a result.

## Required Tests

- A deterministic sinusoid maps to the expected PSG period and attenuation.
- Two- and three-tone fixtures preserve distinct voices when configured.
- Silence and long rests encode correctly.
- NTSC and PAL window timing produce the requested real-time duration.
- Exact compaction expands to the same per-tick PSG state as its input.
- Shared-tail aliases preserve every sound-table index and termination path.
- Lossy candidates never replace the source and never grow the generated data silently.
- Browser preview and ROM playback agree on command duration and channel behavior.
- DSound and WAV-to-PSG actions remain visibly separate in Studio.

## Current Status

The historical analysis source, WAV2CV-array converter, BIOS player, validator, and hand-optimized DacMan evidence exist. The integrated WAV-to-PSG analyzer/editor described here is a planned feature, not a shipped Studio command.
