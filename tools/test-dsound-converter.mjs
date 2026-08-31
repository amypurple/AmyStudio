import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { wavToDsound, audioBufferToDsound, cvSampleRateInt, decodeDsoundBytes,
  dsoundBytesToPreviewSamples, resampleAndQuantize } from "../studio/core/wavToDsound.js";

const buildDir = path.join(tmpdir(), `amy-dsound-test-${process.pid}`);
const wavPath = path.join(buildDir, "test-dsound-tone.wav");
const clamp16 = (value) => Math.max(-32768, Math.min(32767, value | 0));

async function ensureTestWav() {
  await fs.mkdir(buildDir, { recursive: true });
  const sampleRate = 22050;
  const frameCount = Math.floor(sampleRate * 0.35);
  const dataSize = frameCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii"); buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii"); buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii"); buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < frameCount; index += 1) {
    const sample = clamp16(Math.round(32767 * 0.6 * Math.sin(2 * Math.PI * 440 * index / sampleRate)));
    buffer.writeInt16LE(sample, 44 + index * 2);
  }
  await fs.writeFile(wavPath, buffer);
}

function makeFakeAudioBuffer(samples, sampleRate = 22050) {
  return { length: samples.length, numberOfChannels: 1, sampleRate,
    getChannelData(channel) { assert.equal(channel, 0); return samples; } };
}

await ensureTestWav();
const wavBuffer = await fs.readFile(wavPath);
const wavResult = wavToDsound(wavBuffer.buffer.slice(wavBuffer.byteOffset, wavBuffer.byteOffset + wavBuffer.byteLength), {
  label: "ToneData", step: 4, ampPercent: 125
});
assert.ok(wavResult.byteCount > 2);
assert.ok(wavResult.alexisSource.startsWith("data ToneData bytes"));
assert.ok(/\bend\s+data\b/i.test(wavResult.alexisSource));
assert.equal(wavResult.sampleRate, cvSampleRateInt(4));

const fakeSamples = new Float32Array([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0, -0.25, -0.5, -0.75, -1, -0.75, -0.5, -0.25]);
const audioBufferResult = audioBufferToDsound(makeFakeAudioBuffer(fakeSamples), {
  label: "AudioBufferData", step: 0, ampPercent: 100
});
assert.ok(audioBufferResult.byteCount > 2);
assert.ok(audioBufferResult.alexisSource.startsWith("data AudioBufferData bytes"));
assert.equal(audioBufferResult.sampleRate, cvSampleRateInt(0));
const decodedNibbles = decodeDsoundBytes(audioBufferResult.bytes);
assert.ok(decodedNibbles.length > 0);
assert.equal(dsoundBytesToPreviewSamples(audioBufferResult.bytes, { sampleRate: audioBufferResult.sampleRate }).length, decodedNibbles.length);
assert.equal(decodedNibbles.length, audioBufferResult.nibbleCount);
const negative = resampleAndQuantize(new Float32Array(64).fill(-1), 22050, 0, 100);
const centered = resampleAndQuantize(new Float32Array(64).fill(0), 22050, 0, 100);
const positive = resampleAndQuantize(new Float32Array(64).fill(1), 22050, 0, 100);
assert.ok(negative.length && centered.length && positive.length);
assert.notEqual(negative[0], centered[0]);
assert.notEqual(centered[0], positive[0]);
console.log(JSON.stringify({ wavByteCount: wavResult.byteCount, audioBufferByteCount: audioBufferResult.byteCount,
  wavNibbleCount: wavResult.nibbleCount, audioBufferNibbleCount: audioBufferResult.nibbleCount, ok: true }, null, 2));
