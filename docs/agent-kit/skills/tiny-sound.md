# Skill: Tiny Sound Composition and Integration

Use this skill when a project needs compact music, multiple songs, Tiny Sound
instruments, vibrato, arpeggios, or music that coexists with ordinary OS7 effects.

## Choose the smallest suitable level

### Level 1: compact four-stream teaching example

Target reference: **Flynn's Gold**, after its source is promoted from the incoming
project material.

Its `Prospector's Jig` is the clearest compact architecture found so far:

- tone 1: Tiny Sound melody;
- tone 2: Tiny Sound harmony;
- tone 3: muted pitch source for periodic noise;
- noise: audible bass envelope and embedded drum hits.

The streams share one timeline, and the noise stream restores tone-3-driven periodic
noise after a drum interrupts the bass. Teach this architecture before exposing an
agent to a large game's complete sound bank.

### Level 2: several simple songs in one game

Reference: `studio/examples-src/lamplighter.alexis`.

Lamplighter demonstrates:

- one installed sound table;
- ordinary effects and multiple pairs of Tiny Sound streams;
- different tempos and musical identities for several scenes;
- music in low-priority areas and effects allocated according to their role;
- explicit comments naming each composition and its musical intent.

Read only the sound-table block around `LmSoundTable` and the requested song pair,
not the entire game.

### Level 3: four-stream music inside a large game

Target reference: **Hassle Castle**, after its source is promoted.

`Lladnar's March` uses the same two Tiny Sound plus tone-3/noise architecture as
Flynn's Gold, but across a longer composition and a large bank of channel-specific
effects. It is a good integration and priority-management reference, not the first
code sample an agent should read.

The currently reviewed **Raging Thunder** source is useful for a different lesson:
its `Silent Running` title music contains two Tiny Sound streams, while tone 3 and
noise areas are assigned to effects. Do not label that particular source as
four-stream music unless a newer source adds the missing music streams.

### Level 4: advanced complete composition

References:

- `studio/examples-src/commando-tiny-music-box.alexis`
- its embedded project file `commando-tiny-music.asm`, registered by
  `studio/examples-music-project-files.generated.js`
- `docs/audio-workflow.md`, section `Tiny Music - SPECIAL-04`

Commando is the advanced reference because it demonstrates a scheduled composition
across noise and all three tone channels, Tiny Sound envelopes, tempo, ornaments,
and coexistence with regular sound data. Load it only when the task needs those
features.

## Minimal Amy integration

```basic
include "music.asm"

set sound table GameSoundTable areas 8
play song GameSong
```

Use `play song GameSong once` only when the channels must stop at their `$FF`
terminators. Projects that never request `once` retain the smaller looping runtime.
For a polished title screen, prefer a short original cue played once before the
menu wait. Re-entering the title may restart it; remaining on the menu must not
silently turn it into an endless loop.

`once` means "release the channels when both streams reach `$FF`"; it is not a time
limit. A long schedule may still be playing when input becomes available. When a
title cue must last a fixed number of frames, service it through `wait`, then use
`stop song` at the explicit boundary. Verify both the natural `$FF` case and the
bounded-stop case in OS7 sound RAM.

The song operand names a schedule that points at the two Tiny Sound streams; it is
not a pair of raw OS7 sound-area addresses. Start from a validated song declaration
in Lamplighter or the compact teaching excerpt rather than inventing the schedule
shape from the sound table.

A minimal two-stream schedule selecting sound-table entries 1 and 2 is:

```asm
TitleSong:
    dw $0001
    db $41,$02
    dw $0000
```

The schedule is independent from note duration. Do not put a frame count such as
`dw 180` in this header.

## Sound-area rules

- A sound area occupies ten bytes: `$702B`, `$7035`, `$703F`, `$7049`, and so on.
- The first sound-table entry must use the lowest allocated address, normally
  `$702B`; subsequent entries advance by ten bytes. Keep the table in ascending
  address order so source indexes, priority, and RAM inspection remain unambiguous.
- Put persistent background music first, in the lowest-priority areas.
- Put effects that must interrupt music in later, higher-priority areas.
- Do not allocate two simultaneously active streams to the same area.
- Do not replace compact Tiny Sound music with expanded frame-by-frame PSG writes
  unless measurements prove a benefit.
- Tone-3-driven noise is the useful coordinated bass/noise case. Do not describe a
  noise divider as a conventional pitched bass note.
- For four-stream music, keep tone 3 muted and use its period to drive periodic
  noise. The audible bass and drums come from the noise channel's attenuation and
  control stream.

## Composition vocabulary

- A pitch starts or changes a note.
- A hold continues the previous note; it is not a rest.
- A rest silences the channel for that step.
- An instrument command changes the envelope before subsequent notes.
- Vibrato modulates one sounding note; it is not an arpeggio.
- An arpeggio alternates pitches rapidly and should be represented as related notes
  in the editor.
- Tempo is counted in frames per Tiny Sound step. Always audition at the target NTSC
  or PAL timing.

## Validation

1. Compile the real project, not a copied byte fragment.
2. Verify the table with the existing sound-table validator when using historical
   or imported data.
3. Audition through Amy Studio's Tiny Sound decoder for editing feedback.
4. Validate final playback through GearColeco with the real OS7 BIOS.
5. Check that effects can play without corrupting or permanently silencing music.
6. Check loop and `once` behavior separately.
7. A gameplay bot that triggers OS7 sound must inspect the assigned ten-byte sound
   area with the real BIOS: prove that playback starts, advances without corrupting
   adjacent areas, and returns to the inactive `$FF` state. Continuing gameplay
   after `play sound` is not audio proof.

For the historical Commando bank, the repository already documents this validator:

```powershell
node tools/validate-sound-table.mjs --file examples/vendor/music-bank/commando-music-data.asm --table _snd_table --areas 8 --music intro_music,ingame_music,end_level_music,high_score_music --sfx 43-55
```

## Avoid these failures

- Do not use an approximate browser PSG emulator when Amy Studio already contains
  the production sound path.
- Do not invent OS7 command bytes from PSG intuition. Copy a validated record or
  generate it with Amy's sound tools, then prove its complete lifecycle in OS7 RAM.
- Do not call a stuck tone a successful music preview.
- Do not treat every zero byte as silence without decoding its stream context.
- Do not claim full-chip use from two Tiny Sound channels alone.
- Do not copy an entire game into agent context to explain one song.
- Do not cite Hassle Castle as repository-validated until its source and playback
  evidence have been imported.

## Canonical excerpts to prepare next

1. Flynn's Gold: the four sound-table entries and one short synchronized phrase.
2. Hassle Castle: effect priority over four-stream music in a large project.
3. Raging Thunder: two-stream music with tone 3 and noise reserved for effects.
4. Lamplighter: one two-channel song and the shared table entries.
5. Lamplighter: switching between two scene songs.
6. Commando: one instrument change, one vibrato, and one arpeggio.
7. Commando: tone 3 plus noise coordination.
8. A minimal `play song ... once` ending cue.
