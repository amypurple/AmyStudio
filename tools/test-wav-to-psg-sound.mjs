import assert from "node:assert/strict";
import { parseSoundAsm } from "../studio/core/soundAsm.js";
import {
  buildPsgSoundAsm,
  convertSamplesToPsgSound,
  encodePsgNoiseStream,
  frequencyToPsgPeriod,
  psgSoundToPreviewEvents,
  simplifyPsgEdgeEvents,
  psgPeriodToFrequency
} from "../studio/core/wavToPsgSound.js";

function assertSimpleNoiseGrammar(bytes) {
  let offset = 0;
  while (bytes[offset] !== 0x10) {
    assert.equal(bytes[offset++], 0x00, "noise command opcode");
    assert.equal(bytes[offset++], 0x00, "noise command filler byte");
    assert.equal(bytes[offset++] & 0x07, 0x07, "white variable-noise mix");
    offset += 1;
  }
  assert.equal(offset, bytes.length - 1, "noise end marker must terminate the stream");
}

function synth(duration, sampleRate, frequencies, amplitude = 0.7) {
  return Float32Array.from({ length: Math.round(duration * sampleRate) }, (_, index) => {
    const time = index / sampleRate;
    return frequencies.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * time), 0)
      * amplitude / Math.max(1, frequencies.length);
  });
}

function deterministicNoise(duration, sampleRate) {
  let state = 0x12345678;
  return Float32Array.from({ length: Math.round(duration * sampleRate) }, () => {
    state = ((state * 1664525) + 1013904223) >>> 0;
    return ((state / 0xffffffff) * 2 - 1) * 0.75;
  });
}

function harmonicVoice(duration, sampleRate, fundamental) {
  return Float32Array.from({ length: Math.round(duration * sampleRate) }, (_, index) => {
    const phase = 2 * Math.PI * fundamental * index / sampleRate;
    return (0.08 * Math.sin(phase)) + (0.55 * Math.sin(phase * 2)) + (0.32 * Math.sin(phase * 3));
  });
}

const sampleRate = 22050;
const a4Period = frequencyToPsgPeriod(440, "NTSC");
assert.ok(Math.abs(psgPeriodToFrequency(a4Period, "NTSC") - 440) < 2);

const tone = convertSamplesToPsgSound(synth(1, sampleRate, [440]), sampleRate, { maxVoices: 3, allowNoise: true });
assert.equal(tone.frameCount, 60);
assert.equal(tone.analysis.useNoiseTrack, false);
assert.equal(tone.usedVoices, 1);
assert.ok(tone.streams[0].events.some((event) => event.attenuation < 15 && Math.abs(event.period - a4Period) <= 2));
assert.equal(tone.streams[0].events.length, 1);

const chord = convertSamplesToPsgSound(synth(1, sampleRate, [440, 660]), sampleRate, { maxVoices: 2, allowNoise: false });
assert.equal(chord.streams.length, 2);
assert.ok(chord.streams.every((stream) => stream.events.some((event) => event.attenuation < 15)));

const speech = convertSamplesToPsgSound(harmonicVoice(0.5, sampleRate, 140), sampleRate, {
  maxVoices: 2,
  allowNoise: false,
  speechMode: true
});
const speechFrequencies = speech.streams.flatMap((stream) => stream.events)
  .filter((event) => event.attenuation < 15)
  .map((event) => psgPeriodToFrequency(event.period));
assert.ok(speechFrequencies.some((frequency) => Math.abs(frequency - 140) < 8),
  "speech mode must retain a weak fundamental below stronger harmonics");

const lowSpeech = convertSamplesToPsgSound(harmonicVoice(0.5, sampleRate, 80), sampleRate, {
  maxVoices: 2,
  allowNoise: false,
  speechMode: true
});
const lowSpeechFrequencies = lowSpeech.streams.flatMap((stream) => stream.events)
  .filter((event) => event.attenuation < 15)
  .map((event) => psgPeriodToFrequency(event.period));
assert.ok(lowSpeechFrequencies.some((frequency) => Math.abs(frequency - 160) < 10),
  "speech below the PSG range must fold up an octave rather than clamp to $03FF");

const noise = convertSamplesToPsgSound(deterministicNoise(1, sampleRate), sampleRate, { maxVoices: 3, allowNoise: true });
assert.equal(noise.analysis.useNoiseTrack, true);
assert.ok(noise.streams.some((stream) => stream.type === "noise" && stream.events.some((event) => event.attenuation < 15)));
assert.ok(noise.streams.some((stream) => stream.type === "noise-clock" && stream.channel === 3));
assert.ok(noise.streams.find((stream) => stream.type === "noise").events.every((event) => event.noiseRate === 3));
assert.equal(noise.usedVoices, noise.audibleVoices + 1);
const noiseBuilt = buildPsgSoundAsm(noise, { label: "VariableNoise" });
assert.equal(noiseBuilt.soundCount, noise.usedVoices);
assert.match(noiseBuilt.asm, /\$[0-9A-F]7/, "white noise must use the variable Tone 3 clock code");
assertSimpleNoiseGrammar(noise.streams.find((stream) => stream.type === "noise").bytes);
assert.deepEqual(encodePsgNoiseStream([{ noiseRate: 3, attenuation: 14, length: 1 }]),
  [0x00, 0x00, 0xe7, 0x01, 0x10]);

const silence = convertSamplesToPsgSound(new Float32Array(sampleRate / 2), sampleRate, { region: "PAL" });
assert.equal(silence.frameCount, 25);
assert.equal(silence.usedVoices, 0);

const built = buildPsgSoundAsm(chord, { label: "Two Tone" });
assert.equal(built.soundCount, 2);
assert.equal(built.play, "play sounds 1,2");
const parsed = parseSoundAsm(built.asm);
assert.equal(parsed.error, undefined);
const parsedStreams = parsed.tables.filter((bytes) => bytes.length > 0);
assert.equal(parsedStreams.length, 2);
assert.ok(parsedStreams.every((bytes) => bytes.length > 1));
const preview = psgSoundToPreviewEvents(chord);
assert.ok(preview.some((event) => event.channel === 1));
assert.ok(preview.some((event) => event.channel === 2));
assert.ok(preview.every((event) => event.durationFrames > 0));

assert.deepEqual(simplifyPsgEdgeEvents([
  { period: 255, attenuation: 6, length: 1 },
  { period: 254, attenuation: 5, length: 19 },
  { period: 255, attenuation: 6, length: 1 }
]), [{ period: 254, attenuation: 5, length: 21 }]);

console.log("WAV spectral PSG conversion tests passed.");
