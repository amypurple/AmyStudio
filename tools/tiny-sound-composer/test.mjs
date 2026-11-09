import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bassPitchNameForTone3Period, compileChannel, createSong, decodeEditableOs7Bytes, encodeEditableOs7Events, exportAsm, mixedPreviewCycleFrames, prepareTinyImportSource, repeatPreviewTrack, validateSong } from "./core.js";
import { decodeTinySoundSource, scanTinySoundStreams } from "../../studio/core/colecoTinySound.js";
import { decodeColecoSoundSegment } from "../../studio/core/colecoSoundSequence.js";
import { scheduleColecoSoundSequence } from "../../studio/core/colecoSoundPreview.js";

const song = createSong(4);
song.name = "Instrument Test";
song.channels[0][0] = { code: 0x1c, instrument: "trumpet" };
song.channels[0][1] = { code: 0x1e, instrument: "trumpet" };
song.channels[0][2] = { code: 0x20, instrument: "piano" };
const bytes = compileChannel(song.channels[0], song);
assert.deepEqual(bytes.slice(0, 10), [0x02,0x60,0x18,0x32,0x1c,0x1e,0x02,0x30,0x1a,0x21]);
assert.equal(bytes.filter((byte) => byte === 0x02).length, 2, "instrument commands must be emitted only at changes");
song.channels[1][0] = { code: 0x18, instrument: "bass" };
song.channels[1][2] = { code: 0x1a, instrument: "bass" };
assert.equal(compileChannel(song.channels[1], song).filter((byte) => byte === 0x02).length, 1, "a rest must not reset the instrument");
const asm = exportAsm(song);
assert.match(asm, /Instrument_Test_ch1:/);
assert.match(asm, /dw Instrument_Test_ch1,\$702B/);
assert.equal(validateSong(JSON.parse(JSON.stringify(song))).channels[0][2].instrument, "piano");
const streams = scanTinySoundStreams(asm);
assert.deepEqual(streams.map((stream) => stream.channel), [1, 2]);
assert.ok(decodeTinySoundSource(asm, "Instrument_Test_ch1").previewEvents.length > 0, "Amy's validated preview decoder must accept the export");

const custom = createSong(2);
custom.customInstrument.bytes = [0x40, 0x2a, 0x31];
custom.channels[0][0] = { code: 0x20, instrument: "custom" };
custom.channels[0][1] = { code: 0x20, instrument: "custom", hold: true };
assert.deepEqual(compileChannel(custom.channels[0], custom).slice(0, 7), [0x02,0x40,0x2a,0x31,0x20,0x00,0xff]);

const expressionSource = prepareTinyImportSource(`music_ch2_A:
  db 0x84
  dw sndtiny_2
  db 6
  db 0x02,0x40,0x1B,0x22
  db 0x2F+0x40,0x23,0
  db 0xff
music_ch1_A:
  db 0x44
  dw sndtiny_1
  db 6
  db 0x02,0x60,0x19,0x22
  db 0x28+0x40,0x1c,0
  db 0xff`);
const expressionStreams = scanTinySoundStreams(expressionSource);
assert.deepEqual(expressionStreams.map((stream) => stream.channel), [2, 1]);
const expressionNote = decodeTinySoundSource(expressionSource, "music_ch2_A").commands.find((command) => command.type === "note");
assert.equal(expressionNote.code, 0x6f);
assert.equal(expressionNote.arpeggioCode, 0x23);
const importedVoiceSong = createSong(1);
importedVoiceSong.importedInstruments.push({ id: "imported_401b22", name: "Imported", icon: "◇", color: "#69b3a2", bytes: [0x40,0x1b,0x22] });
importedVoiceSong.channels[0][0] = { code: 0x6f, arpeggioCode: 0x23, instrument: "imported_401b22" };
assert.deepEqual(compileChannel(importedVoiceSong.channels[0], importedVoiceSong), [0x02,0x40,0x1b,0x22,0x6f,0x23,0xff]);
importedVoiceSong.companionStreams = { noise: [0x02,0x33,0x01,0x10], tone3: [0xc0,0x88,0xf0,0x01,0xd0] };
const companionAsm = exportAsm(importedVoiceSong);
assert.match(companionAsm, /\$6F,\$23,\$FF/);
assert.match(companionAsm, /dw MyTinySong_noise,\$702B/);
assert.match(companionAsm, /dw MyTinySong_tone3,\$7035/);
assert.deepEqual(validateSong(JSON.parse(JSON.stringify(importedVoiceSong))).companionStreams, importedVoiceSong.companionStreams);

for (const path of [
  "examples/generated/brinquitos-tiny-music.asm",
  "examples/ports/books/pitdemons/pitdemons.alexis",
  "studio/examples-src/blueberries.alexis"
]) {
  const source = prepareTinyImportSource(await readFile(new URL(`../../${path}`, import.meta.url), "utf8"));
  const imported = scanTinySoundStreams(source);
  assert.ok(imported.some((stream) => stream.channel === 1), `${path} needs a channel 1 stream`);
  assert.ok(imported.some((stream) => stream.channel === 2), `${path} needs a channel 2 stream`);
  for (const channel of [1, 2]) {
    const stream = imported.find((candidate) => candidate.channel === channel);
    assert.ok(decodeTinySoundSource(source, stream.label).previewEvents.length > 0, `${path} channel ${channel} must preview`);
  }
}

const commando = prepareTinyImportSource(await readFile(new URL("../../examples/tiny%20music/applied%20in%20a%20project/snddata_tinymusic.asm", import.meta.url), "utf8"));
const commandoNoise = scheduleColecoSoundSequence(decodeColecoSoundSegment(commando, "music_ch0_A").events);
const commandoTone3 = scheduleColecoSoundSequence(decodeColecoSoundSegment(commando, "music_ch3_A").events);
assert.ok(commandoNoise.some((event) => event.channel === 0 && event.type === "volume-sweep"), "Commando noise accompaniment must decode");
assert.ok(commandoTone3.some((event) => event.channel === 3 && event.type === "note"), "Commando Tone 3 accompaniment must decode");
assert.equal(bassPitchNameForTone3Period(136).name, "A1");
assert.equal(bassPitchNameForTone3Period(68).name, "A2");
for (const label of ["music_ch0_A", "music_ch3_A"]) {
  const original = decodeColecoSoundSegment(commando, label).bytes;
  assert.deepEqual(encodeEditableOs7Events(decodeEditableOs7Bytes(original)), original, `${label} semantic editor must round-trip byte-exactly`);
}
const commandoCycle = mixedPreviewCycleFrames([
  { durationFrames: 192 },
  { durationFrames: 192 },
  { durationFrames: 96 },
  { durationFrames: 384 }
]);
assert.equal(commandoCycle, 384);
assert.equal(repeatPreviewTrack({ events: commandoNoise, durationFrames: 96 }, commandoCycle).length, commandoNoise.length * 4);
console.log("Tiny Sound Composer core tests passed.");
