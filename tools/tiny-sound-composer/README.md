# Tiny Sound Composer

A two-channel, piano-roll editor for Amy Studio's Tiny Sound format. The Examples
menu imports existing Brinquitos, Pitdemons, and Blueberries music, while Import
Tiny ASM accepts another source containing `sndtiny_1` and `sndtiny_2` streams.
Paste mixed ASM accepts the same material directly and ignores unrelated regular
sound records, tables, routines, and comments.

Preview assembles a temporary ColecoVision audition ROM and runs it through Amy
Studio's GearColeco core. The browser plays GearColeco's own stereo PCM, so the
BIOS sound manager, Tiny Sound runtime, Noise/Tone 3 interaction, envelopes,
vibrato, and arpeggios follow the same path as a compiled game.

The Custom instrument exposes the Tiny Sound starting volume, decay, and rate
bytes. Instrument changes are embedded only where the score changes voice.
Choose Arpeggio, click its base pitch, then click the second pitch in the same
column. The editor emits the Tiny Sound `$40` decorated base byte followed by
the second pitch. Vibrato emits the `$80` decorated note and displays a
sine-wave mark.
Sustain commands remain visually empty because the previous note continues;
explicit silence commands appear in the dedicated REST row.

The built-in envelopes are drawn from 263 Tiny Sound streams in the Amy Studio
example corpus, including Commando. When a complete Commando-style source uses
matching `music_ch0_X`, `music_ch3_X`, `music_ch2_X`, and `music_ch1_X` labels,
the regular Noise and Tone 3 streams accompany the two editable Tiny tracks.
The accompaniment panel interprets Commando's muted Tone 3 as the clock for
periodic Noise. Bass labels use `Tone3 / 15`, matching the 15-stage LFSR, rather
than incorrectly naming the inaudible Tone 3 oscillator pitch. Audible volume
and fade belong to Noise. Exact OS7 byte streams remain visible and regenerate
after every semantic change.

The full-mix timeline uses rendered frames as its common unit. Tiny cells occupy
`tempo` frames, simple Tone 3 clocks use their command length, and Noise fades
use their complete rendered envelope duration. Tracks retain independent loop
lengths and repeat to the common preview cycle; Commando therefore aligns its
192-frame Tiny parts, 384-frame Tone 3 clock, and 96-frame Noise rhythm without
changing any of their native encodings.
Tracks with different loop lengths repeat independently to their least common
cycle, matching Commando's 96/192/384-frame arrangement instead of leaving gaps.

Standalone two-channel piano-roll composer for Amy Studio's ColecoVision Tiny Sound runtime.

Run from the repository root so browser modules have a normal HTTP origin:

```powershell
python -m http.server 8090
```

Open `http://127.0.0.1:8090/tools/tiny-sound-composer/`.

Each painted note stores its instrument. The ASM exporter emits a Tiny Sound `$02` envelope
command only where the selected instrument changes, followed by the note. Projects save as JSON;
the final output is an Amy/lib4ksa-compatible two-entry sound table and song trigger.

The preview assembles a temporary ROM and uses Amy Studio's GearColeco emulator rather than a
separate simplified synthesizer. `Import Tiny ASM` accepts an existing `sndtiny_1` plus
`sndtiny_2` pair, including music exported from Amy Studio projects. The Custom instrument exposes
the Tiny Sound attenuation, decay, and rate bytes and stores them with the project.

Run the format test with `node tools/tiny-sound-composer/test.mjs`.
