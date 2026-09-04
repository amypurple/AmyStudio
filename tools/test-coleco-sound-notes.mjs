import assert from "node:assert/strict";
import {
  encodeBassNote,
  encodeToneNote,
  encodeToneCommand,
  encodeNoiseCommand,
  decodeColecoSoundStream,
  encodeColecoSoundEvents,
  buildColecoBassNote,
  buildColecoNoise,
  buildColecoSoundCommand,
  buildColecoToneNote,
  describeColecoSoundEvent,
  fadeParameters,
  notePeriod
} from "../studio/core/colecoSoundNotes.js";

assert.equal(notePeriod("A", 4, "NTSC"), 254);
assert.equal(notePeriod("A", 4, "PAL"), 252);
assert.deepEqual(fadeParameters(16), [0x1f, 0x12]);
assert.deepEqual(encodeToneNote({ channel: 1, note: "A", octave: 4, length: 16 }), [0x40, 0xfe, 0x00, 0x10]);
assert.deepEqual(encodeToneNote({ channel: 1, note: "A", octave: 4, length: 16, fade: true }), [0x42, 0xfe, 0x00, 0x10, 0x1f, 0x12]);
assert.deepEqual(encodeToneCommand({
  channel: 1,
  period: 0x0c8,
  attenuation: 5,
  length: 0x20,
  frequencySweep: { stepLength: 1, firstLength: 1, step: -43 },
  volumeSweep: { step: 8, count: 15, stepLength: 2, firstLength: 2 }
}), [0x43, 0xc8, 0x50, 0x20, 0x11, 0xd5, 0x8f, 0x22]);
assert.deepEqual(encodeNoiseCommand({
  noise: 4,
  volume: 10,
  length: 256,
  frequencySweep: { stepLength: 16, firstLength: 16, step: -2 },
  volumeSweep: { step: 2, count: 16, stepLength: 4, firstLength: 16 }
}), [0x03, 0x54, 0x00, 0x00, 0xfe, 0x20, 0x40]);

const simpleBass = encodeBassNote({ note: "G", octave: 1, length: 16 });
const fadeBass = encodeBassNote({ note: "G", octave: 1, length: 16, fade: true });
assert.deepEqual(simpleBass.noise, [0x00, 0x00, 0x03, 0x10], "simple bass keeps its filler byte");
assert.deepEqual(fadeBass.noise, [0x02, 0x03, 0x10, 0x1f, 0x12], "fade bass must not gain a filler byte");
assert.equal(fadeBass.tone3[0], 0xc0);

assert.throws(() => encodeToneNote({ channel: 4, note: "A", octave: 4, length: 8 }), /channel/);
assert.throws(() => encodeBassNote({ note: "A", octave: 2, length: 8, lfsr: 12 }), /LFSR/);
assert.throws(() => notePeriod("H", 4), /Invalid musical note/);

const decoded = decodeColecoSoundStream([
  0x40, 0xaa, 0x50, 0x03,
  0x63,
  0x43, 0xc8, 0x50, 0x20, 0x11, 0xd5, 0x8f, 0x22,
  0x50
]);
assert.deepEqual(decoded.events.map((event) => event.type), ["note", "rest", "frequency-volume-sweep", "end"]);
assert.deepEqual(decoded.events.map((event) => event.channel), [1, 1, 1, 1]);
assert.equal(decoded.consumed, 14);
assert.equal(decoded.trailing, 0);
assert.equal(decoded.terminated, true);
assert.deepEqual(decoded.events[0], {
  offset: 0, type: "note", channel: 1, length: 3,
  bytes: [0x40, 0xaa, 0x50, 0x03], period: 0xaa, attenuation: 5
});
assert.deepEqual(decoded.events[2].frequencySweep, { stepLength: 1, firstLength: 1, step: -43 });
assert.deepEqual(decoded.events[2].volumeSweep, { step: 8, count: 15, stepLength: 2, firstLength: 2 });
assert.match(describeColecoSoundEvent(decoded.events[0]), /^Tone 1 · E5 · 658\.0 Hz · period 170 · volume 10\/15 · 3 frames$/);
assert.match(describeColecoSoundEvent(decoded.events[1]), /^Rest · 3 frames$/);
assert.match(describeColecoSoundEvent(decoded.events[2]), /freq -43 every 1 frame · volume \+8 × 15$/);
assert.deepEqual(encodeColecoSoundEvents(decoded.events), [
  0x40, 0xaa, 0x50, 0x03, 0x63, 0x43, 0xc8, 0x50, 0x20, 0x11, 0xd5, 0x8f, 0x22, 0x50
]);

const built = buildColecoToneNote({ channel: 2, note: "A", octave: 4, length: 12 });
assert.deepEqual(built.bytes, [0x80, 0xfe, 0x00, 0x0c]);
assert.equal(built.asm, "db $80,$FE,$00,$0C");
assert.match(built.description, /^Tone 2 · A4 · 440\.4 Hz · period 254 · volume 15\/15 · 12 frames$/);
assert.throws(() => buildColecoToneNote({ note: "A", octave: 4, length: 0 }), /1\.\.256/);
assert.throws(() => buildColecoToneNote({ note: "A", octave: 4, length: 257 }), /1\.\.256/);
assert.equal(buildColecoToneNote({ note: "A", octave: 4, length: 256 }).bytes[3], 0);

const bass = buildColecoBassNote({ note: "G", octave: 1, length: 16, fade: true });
assert.deepEqual(bass.bytes, [0xc0, 0x98, 0xf0, 0x10, 0x02, 0x03, 0x10, 0x1f, 0x12]);
assert.equal(bass.tone3Asm, "db $C0,$98,$F0,$10");
assert.equal(bass.noiseAsm, "db $02,$03,$10,$1F,$12");
assert.match(bass.asm, /^; Play both table entries together/);
assert.match(bass.description, /^Tone 3 .* \+ Noise 3/);
assert.throws(() => buildColecoBassNote({ note: "G", octave: 1, length: 0 }), /1\.\.256/);
assert.throws(() => buildColecoBassNote({ note: "G", octave: 1, length: 256, fade: true }), /fading.*1\.\.255/i);
assert.equal(buildColecoBassNote({ note: "G", octave: 1, length: 256 }).bytes[3], 0);

const noise = buildColecoNoise({ noise: 6, volume: 9, length: 24, fade: true });
assert.deepEqual(noise.bytes, [0x02, 0x66, 0x18, 0x1f, 0x1a]);
assert.equal(noise.asm, "db $02,$66,$18,$1F,$1A");
assert.match(noise.description, /^Noise 6 \(White · clock \/ 2048\) · volume 9\/15 · 24 frames/);
const exactSweep = buildColecoSoundCommand({
  mode: "Tone period", period: 0x0c8, channel: 1, volume: 10, length: 256,
  frequencySweep: { stepLength: 1, firstLength: 1, step: -43 },
  volumeSweep: { step: 8, count: 15, stepLength: 2, firstLength: 2 }
});
assert.deepEqual(exactSweep.bytes, [0x43, 0xc8, 0x50, 0x00, 0x11, 0xd5, 0x8f, 0x22]);
assert.equal(exactSweep.event.length, 256, "$00 duration must round-trip as 256 frames");
assert.deepEqual(exactSweep.event.frequencySweep, { stepLength: 1, firstLength: 1, step: -43 });
assert.deepEqual(exactSweep.event.volumeSweep, { step: 8, count: 15, stepLength: 2, firstLength: 2 });
assert.throws(() => buildColecoNoise({ noise: 8, length: 8 }), /0\.\.7/);
assert.throws(() => buildColecoNoise({ noise: 4, volume: 16, length: 8 }), /0\.\.15/);
assert.throws(() => decodeColecoSoundStream([0x42, 0xfe]), /Truncated/);
assert.throws(() => decodeColecoSoundStream([0x05]), /Unknown sound code/);
assert.throws(() => encodeColecoSoundEvents([{ bytes: [256] }]), /non-byte/);

console.log("Coleco BIOS note encoder tests passed.");
