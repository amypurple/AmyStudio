import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodeTinySoundSource, describeTinySoundCommand, readTinySoundLabel, replaceTinySoundByte, tinyInstrumentEnvelope, tinyNoteChoices, tinyNoteHasArpeggio, tinyNoteIndex } from "../studio/core/colecoTinySound.js";
import { inspectSoundTableSource } from "../studio/core/soundTableInspector.js";

const fixture = `
TinyTable:
    dw brinquitos_music_gladiators_ch1,$702B
    dw brinquitos_music_gladiators_ch2,$7035
    dw brinquitos_jump_sfx,$703F
brinquitos_music_gladiators_ch1:
    db $44
    dw sndtiny_1
    db $08,$02,$60,$19,$22,$1F,$00,$1E,$01,$FF
brinquitos_music_gladiators_ch2:
    db $84
    dw sndtiny_2
    db $08,$02,$80,$19,$22,$13,$00,$12,$01,$FF
brinquitos_jump_sfx:
    db $40,$6B,$00,$02,$50
`;
let source = fixture;
try {
  source = await readFile(new URL("../examples/generated/brinquitos-tiny-music.asm", import.meta.url), "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const raw = readTinySoundLabel(source, "brinquitos_music_gladiators_ch1");
assert.equal(raw.channel, 1);
assert.equal(raw.handler, "sndtiny_1");

const decoded = decodeTinySoundSource(source, "brinquitos_music_gladiators_ch1");
assert.equal(decoded.tempo, 8);
assert.equal(decoded.commands[0].type, "instrument");
assert.equal(decoded.commands[1].type, "note");
assert.equal(decoded.commands.at(-1).type, "loop");
assert.equal(decoded.loop, true);
assert.ok(decoded.previewEvents.length >= 2);
assert.ok(decoded.previewEvents.every((event, index, events) => index === 0 || event.startFrame >= events[index - 1].startFrame));
assert.ok(decoded.commands.every((command) => Number.isInteger(command.startFrame)));
assert.equal(decoded.commands.at(-1).startFrame, decoded.totalFrames);
assert.match(describeTinySoundCommand(decoded.commands[1]), /Hz/);
assert.equal(tinyNoteIndex(0x1f), 55, "ordinary note follows the runtime's code-minus-four indexing");
assert.equal(tinyNoteIndex(0x40), 9, "note indexing wraps the low six bits like the runtime");
assert.equal(tinyNoteHasArpeggio(0x40), false);
assert.equal(tinyNoteHasArpeggio(0x44), true);
assert.equal(tinyNoteHasArpeggio(0x80), true);
assert.deepEqual(tinyInstrumentEnvelope([0x00, 0x33, 0x22]), {
  step: 3, count: 3, firstLength: 2, stepLength: 2
});
const envelope = decodeTinySoundSource(`Envelope:\n db $44\n dw sndtiny_1\n db $08,$02,$00,$33,$22,$1F,$00,$01,$FF`, "Envelope");
assert.equal(envelope.previewEvents[0].length, 16, "sustain extends the note and its envelope");
assert.deepEqual(envelope.previewEvents[0].volumeSweep, { step: 3, count: 3, firstLength: 2, stepLength: 2 });
const drum = decodeTinySoundSource(`Drum:\n db $44\n dw sndtiny_1\n db $08,$FE,$01,$FF`, "Drum");
assert.deepEqual(drum.previewEvents[0], {
  type: "frequency-volume-sweep", channel: 1, period: 0x015f, attenuation: 1, length: 8, durationFrames: 8, startFrame: 0,
  frequencySweep: { step: 0x30, firstLength: 1, stepLength: 1 },
  volumeSweep: { step: 1, count: 13, firstLength: 2, stepLength: 2 }
}, "$FE is a descending tone with decay on the Tiny voice channel, not noise");

const special = decodeTinySoundSource(`Special:\n db $44\n dw sndtiny_1\n db $08,$03,$10,$20,$31,$40,$50,$60,$70,$01,$FF`, "Special");
assert.equal(special.commands[0].type, "special-note");
assert.equal(special.commands[0].frames, 8, "$03 lasts for the stream tempo, not its third register byte");
assert.equal(special.commands[1].startFrame, 8);

const noBoundaryArpeggio = decodeTinySoundSource(`NoArp:\n db $44\n dw sndtiny_1\n db $08,$40,$01,$FF`, "NoArp");
assert.deepEqual(noBoundaryArpeggio.commands.map((command) => command.type), ["note", "silence", "loop"]);
const boundaryArpeggio = decodeTinySoundSource(`Arp:\n db $44\n dw sndtiny_1\n db $08,$80,$10,$01,$FF`, "Arp");
assert.deepEqual(boundaryArpeggio.commands.map((command) => command.type), ["note", "silence", "loop"]);
assert.equal(boundaryArpeggio.commands[0].arpeggioCode, 0x10);
assert.deepEqual(boundaryArpeggio.previewEvents[0].frequencyFrames.slice(0, 4).map((point) => point.period), [
  boundaryArpeggio.previewEvents[0].period,
  tinyNoteChoices().find((choice) => choice.code === 0x10).period,
  boundaryArpeggio.previewEvents[0].period,
  tinyNoteChoices().find((choice) => choice.code === 0x10).period
]);

const choices = tinyNoteChoices();
assert.equal(choices.length, 60);
assert.equal(choices[0].code, 4);
assert.equal(choices[0].period, 0x03f8);
const editedSource = replaceTinySoundByte(fixture, "brinquitos_music_gladiators_ch1", 5, 0x20);
assert.match(editedSource, /db \$08,\$02,\$60,\$19,\$22,\$20,\$00,\$1E,\$01,\$FF/);
const editedDecoded = decodeTinySoundSource(editedSource, "brinquitos_music_gladiators_ch1");
assert.equal(editedDecoded.commands[1].code, 0x20);
assert.equal(editedDecoded.previewEvents[0].period, tinyNoteChoices().find((choice) => choice.code === 0x20).period,
  "full-sequence playback data must use the edited pitch");
assert.notEqual(editedDecoded.previewEvents[0].period, decodeTinySoundSource(fixture, "brinquitos_music_gladiators_ch1").previewEvents[0].period,
  "edited playback must not retain the cached original pitch");
assert.equal(editedSource.replace("$20", "$1F"), fixture, "surgical edit preserves every unrelated source character");
assert.throws(() => replaceTinySoundByte(fixture, "brinquitos_music_gladiators_ch1", 999, 4), /was not found/);

const inspected = inspectSoundTableSource(source);
const tinyEntry = inspected.tables[0].entries.find((entry) => entry.label === "brinquitos_music_gladiators_ch1");
const normalEntry = inspected.tables[0].entries.find((entry) => entry.label === "brinquitos_jump_sfx");
assert.equal(tinyEntry.stream.format, "tiny");
assert.equal(tinyEntry.stream.eventCount, decoded.commands.length);
assert.equal(normalEntry.stream.format, undefined);
assert.equal(inspected.diagnostics.length, 0);

assert.throws(() => decodeTinySoundSource("Bad:\n db $44\n dw sndtiny_1", "Bad"), /no tempo/);
assert.throws(() => readTinySoundLabel("Normal:\n db $40,$10", "Normal"), /not a SPECIAL-04/);

console.log("Coleco Tiny Sound inspector tests passed.");
