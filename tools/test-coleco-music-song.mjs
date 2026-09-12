import assert from "node:assert/strict";
import { inspectSoundTableSource } from "../studio/core/soundTableInspector.js";
import { scheduleColecoMusicSong } from "../studio/core/colecoMusicSong.js";
import { scheduleColecoSoundSequence } from "../studio/core/colecoSoundPreview.js";

const source = `
MusicTable:
  dw NoiseA,$702B
  dw BassA,$7035
  dw LeadA,$703F
  dw LeadB,$703F

NoiseA:
  db $00,$00,$E4,$20,$10
BassA:
  db $C0,$80,$F0,$20,$D0
LeadA:
  db $40,$80,$60,$20,$50
LeadB:
  db $40,$40,$50,$10,$50

MainSong:
  dw 120
  db $82,$01,$03
  dw 60
  db $43,$02
  dw MainSong

EndSong:
  dw 30
  db $01
  dw 0
`;

const analysis = inspectSoundTableSource(source);
assert.equal(analysis.tables.length, 1);
assert.equal(analysis.songs.length, 2);
const main = analysis.songs.find((song) => song.name === "MainSong");
assert.deepEqual(main.rows, [
  { startFrame: 0, durationFrames: 120, indices: [2, 1, 3] },
  { startFrame: 120, durationFrames: 60, indices: [3, 2] }
]);
assert.equal(main.totalFrames, 180);
assert.deepEqual(main.terminal, { type: "jump", label: "MainSong" });
assert.deepEqual(main.tables, ["MusicTable"]);
assert.equal(analysis.songs.find((song) => song.name === "EndSong").terminal.type, "end");
const scheduled = scheduleColecoMusicSong(main, analysis.tables[0], { scheduleSequence: scheduleColecoSoundSequence });
assert.ok(scheduled.some((event) => event.soundIndex === 2 && event.startFrame === 0));
assert.ok(scheduled.some((event) => event.soundIndex === 3 && event.startFrame === 120));
assert.ok(scheduled.every((event) => event.startFrame + event.durationFrames <= 180));

const malformed = inspectSoundTableSource(`${source}\nBadSong:\n dw 10\n db $C1,$02\n dw 0\n`);
assert.equal(malformed.songs.some((song) => song.name === "BadSong"), false);

console.log("Coleco music song parser tests passed.");
