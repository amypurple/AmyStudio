import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodeTinySoundSource, describeTinySoundCommand, readTinySoundLabel } from "../studio/core/colecoTinySound.js";
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
assert.match(describeTinySoundCommand(decoded.commands[1]), /Hz/);

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
