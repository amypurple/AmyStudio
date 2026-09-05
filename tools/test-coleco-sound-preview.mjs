import assert from "node:assert/strict";
import { amplitudeForAttenuation, buildColecoPreviewTracks, eventDurationFrames, scheduleColecoSoundSequence, startColecoSoundPreview, volumeEnvelopeForEvent } from "../studio/core/colecoSoundPreview.js";
import { buildColecoEchoTone } from "../studio/core/colecoSoundNotes.js";

assert.equal(amplitudeForAttenuation(15), 0);
assert.equal(amplitudeForAttenuation(16), 0);
assert(amplitudeForAttenuation(0) > amplitudeForAttenuation(1));
assert(amplitudeForAttenuation(1) > amplitudeForAttenuation(14));
assert(Math.abs(amplitudeForAttenuation(0) - 0.24) < 0.000001);

const scheduled = scheduleColecoSoundSequence([
  { type: "note", length: 3 },
  { type: "frequency-sweep", length: 5 },
  { type: "end" }
]);
assert.deepEqual(scheduled.map((event) => event.startFrame), [0, 3]);
assert.equal(scheduled.length, 2);
assert.equal(eventDurationFrames({
  length: 4,
  frequencySweep: { firstLength: 2, stepLength: 3 }
}), 11, "BIOS frequency-sweep length counts expirations, not rendered frames");
assert.equal(eventDurationFrames({
  length: 4,
  durationFrames: 4,
  frequencySweep: { firstLength: 2, stepLength: 3 }
}), 4, "synthetic preview events can provide an explicit rendered duration");
assert.deepEqual(scheduleColecoSoundSequence([
  { type: "frequency-sweep", length: 4, frequencySweep: { firstLength: 2, stepLength: 3 } },
  { type: "note", length: 5 }
]).map((event) => event.startFrame), [0, 11]);
const tracks = buildColecoPreviewTracks([
  { type: "note", channel: 1, startFrame: 0, length: 3 },
  { type: "note", channel: 1, startFrame: 3, length: 4 },
  { type: "note", channel: 2, startFrame: 0, length: 5 },
  { type: "note", channel: 0, startFrame: 1, length: 2 }
]);
assert.deepEqual([...tracks.tones.keys()], [1, 2]);
assert.equal(tracks.tones.get(1).length, 2, "adjacent commands on one PSG channel share one preview track");
assert.equal(tracks.noises.length, 1);

class FakeParam { setValueAtTime() {} }
class FakeNode {
  constructor() { this.gain = new FakeParam(); this.frequency = new FakeParam(); }
  connect() {}
  start() {}
  stop() {}
}
class FakeAudioContext {
  static last = null;
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.oscillators = 0; this.sources = 0; FakeAudioContext.last = this; }
  createGain() { return new FakeNode(); }
  createOscillator() { this.oscillators += 1; return new FakeNode(); }
  createBufferSource() { this.sources += 1; return new FakeNode(); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  async close() {}
  async suspend() {}
  async resume() {}
}
const originalAudioContext = globalThis.AudioContext;
try {
  globalThis.AudioContext = FakeAudioContext;
  const continuous = await startColecoSoundPreview([
    { type: "note", channel: 1, period: 200, attenuation: 0, startFrame: 0, length: 3 },
    { type: "note", channel: 1, period: 180, attenuation: 0, startFrame: 3, length: 4 },
    { type: "note", channel: 0, noise: 4, attenuation: 2, startFrame: 0, length: 2 },
    { type: "note", channel: 0, noise: 5, attenuation: 2, startFrame: 2, length: 2 }
  ]);
  assert.equal(FakeAudioContext.last.oscillators, 1, "adjacent tones reuse one phase-continuous oscillator");
  assert.equal(FakeAudioContext.last.sources, 1, "adjacent noise commands reuse one continuous LFSR source");
  await continuous.stop();
} finally {
  globalThis.AudioContext = originalAudioContext;
}

assert.deepEqual(volumeEnvelopeForEvent({
  attenuation: 0,
  length: 24,
  volumeSweep: { step: 3, count: 2, firstLength: 12, stepLength: 8 }
}), [
  { frame: 0, attenuation: 0 },
  { frame: 12, attenuation: 3 }
]);
assert.deepEqual(volumeEnvelopeForEvent({
  attenuation: 0,
  length: 24,
  volumeSweep: { step: 3, count: 1, firstLength: 12, stepLength: 8 }
}), [{ frame: 0, attenuation: 0 }], "BIOS count includes the initial attenuation");

const echo = buildColecoEchoTone({ note: "A", octave: 4, mainFrames: 12, tailFrames: 8, volume: 15 });
assert.equal(echo.bytes.length, 6);
assert.equal(echo.event.length, 20);
assert.deepEqual(volumeEnvelopeForEvent(echo.event), [
  { frame: 0, attenuation: 0 },
  { frame: 12, attenuation: 3 }
]);
assert.match(echo.description, /one BIOS command/);
assert.throws(() => buildColecoEchoTone({ note: "A", octave: 4, mainFrames: 17, tailFrames: 8 }), /1\.\.16 main frames/);

console.log("Coleco sound preview tests passed.");
