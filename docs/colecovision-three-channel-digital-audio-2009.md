# Three-channel ColecoVision digital audio experiment (2009)

## Provenance

This note archives Amy Bienvenu's December 12, 2009 experiment in using the
three SN76489 tone attenuators as a higher-resolution digital audio output.
The supplied `result_19.rom` has SHA-256
`60797E73D1F471221A7A0E9998B4C86B005480DE2DEBB53A00BA119685291833`.
Only independently observed ROM structure is documented here; the ROM itself
is not added to the repository.

## Signal model

One tone channel provides 15 audible attenuation levels at nominal 2 dB
steps, plus attenuation 15 as mute. Using three channels independently creates
46 ordered amplitude combinations:

```text
FFF, EFF, EEF, EEE, DEE, DDE, DDD, ... 011, 001, 000
```

Their normalized amplitude is the mean of the three channel amplitudes. This
fills much of the large gap between one channel's attenuation 14 and mute and
is closer to a six-bit amplitude ladder than ordinary four-bit PSG playback.
It consumes all three tone channels while playing and cannot coexist with
normal tone music.

## ROM format recovered from result_19

The player at `$E71F` uses these ROM tables:

- `$8118..$81A1`: 46 triples of PSG volume latch bytes (`$9x,$Bx,$Dx`).
- `$81A2..$81C1`: 32 signed byte deltas. Every delta is a multiple of three,
  so it moves between amplitude triples.
- `$81C2..$E71D`: 25,948 compressed bytes.
- `$E71E`: `$FF` end marker; the demo restarts the stream.

Each compressed byte is decoded as:

```text
bits 7..5: repeat count minus one (1..8 output units)
bits 4..0: index into the 32-entry signed-delta table
```

The player adds the selected delta to the current amplitude-table pointer,
then sends the selected three-byte volume triple directly to PSG port `$FF`
with `OTIR`. A short fixed delay follows each output unit. This is therefore a
streaming lossy delta codec with a small RLE field, not the existing DSOUND
format.

The 2009 post reports about 67,000 source attenuation units from a 3.8-second
44 kHz sample reduced to an approximately 17.5 kHz player rate. The final ROM
occupies 26,642 bytes including code and tables.

## Reimplementation requirements

A new Amy Studio implementation should be a separate codec and player rather
than a DSOUND extension. It should:

1. Resample input audio to the measured player rate.
2. Quantize each sample to the nearest of the 46 three-channel amplitudes.
3. Search the 32 legal deltas while accounting for quantization error.
4. Encode runs of one to eight identical reconstructed values.
5. Stream directly to PSG without a decompressed RAM buffer.
6. Preserve cycle balance for every decoded unit.
7. Provide NTSC and PAL timing choices even though PSG attenuation itself is
   independent of the video standard.
8. Mute all three tone channels on stop or malformed input.

The historical stream occasionally moves its pointer before the 46-entry
amplitude table and emits adjacent code bytes as PSG data. A modern encoder
must reject, clamp, or choose another legal delta instead. The decoder should
also fail safely rather than read beyond its amplitude table.

## Development prototype

The development repository now contains a first independent implementation:

- `studio/core/colecoThreeChannelPcm.js`: 46-level quantizer, linear
  resampling, safe 32-delta selection, 1..8-unit RLE, encoder and strict
  decoder;
- `src/alexis_lib/coleco_tripcm.asm`: direct-to-PSG streaming player using the
  historical cadence and table layout;
- `tools/test-three-channel-pcm-codec.mjs`: deterministic codec and hostile
  stream tests;
- `tools/test-three-channel-pcm-rom.mjs`: five-profile compile and GearColeco
  runtime validation.

The initial player plus its 170 bytes of amplitude/delta tables occupies about
279 bytes before optimization. It is intentionally not wired into the public
Amy language or clean repository yet. The remaining work is to calibrate its
exact sample rate, compare generated audio against the real-output MP3, decide
the public format name and syntax, and integrate WAV preview/import without
confusing it with ordinary DSOUND.

## Current attenuation validation

The separately supplied real-ColecoVision attenuation recording measures
approximately `-1.97 dB` per step over its clean range. This validates Amy
Studio's existing `10^(-2*attenuation/20)` preview curve. The new format needs
the 46-level quantizer and streaming player, not a change to that curve.

## Real-output MP3 comparison

The supplied `sndtest_sample.mp3` has SHA-256
`9F2B6EEBED58C953E9488EE0EEB1DC6FC4E559FC51226D75297A9FBB880059AC`.
It is mono, 44.1 kHz, and 7.680 seconds long. An NTSC GearColeco capture of
the supplied ROM over the matching 461-frame interval is 7.689 seconds long.
The nearly exact duration and matching time-frequency structure strongly
support that the MP3 is a recording of this encoded stream.

A deterministic comparison used 150 proportional time windows and 48
logarithmically spaced frequencies from 90 Hz to 18 kHz. After removing each
window's overall level, spectral-shape correlation measured:

```text
mean       0.668
median     0.692
10th pct   0.465
90th pct   0.834
```

The recording is approximately 6.2 dB louder overall than GearColeco's output
and has a higher zero-crossing rate (`0.0355` versus `0.0264`), consistent with
more high-frequency content. Absolute gain is not significant, but the
spectral difference means the emulator output is a useful decoder oracle, not
yet proof of analog-output fidelity. The MP3 should be retained as a private
reference oracle for future PSG mixer/filter calibration; it should not be
committed without an explicit publication decision.
