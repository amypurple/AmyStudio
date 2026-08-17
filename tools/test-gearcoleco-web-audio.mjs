import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const repoRoot = resolve(import.meta.dirname, "..");
const [bios, rom] = await Promise.all([
  readFile(resolve(repoRoot, "studio/bios/colecovision.rom")),
  readFile(resolve(repoRoot, "build/rom-tests/commando-tiny-music-box.rom"))
]);

function hashAudio(frames) {
  const hash = createHash("sha256");
  for (const frame of frames) {
    hash.update(new Uint8Array(
      frame.samples.buffer,
      frame.samples.byteOffset,
      frame.samples.byteLength
    ));
  }
  return hash.digest("hex");
}

function captureAudioSegment(core, frameCount) {
  const frames = [];
  for (let frame = 0; frame < frameCount; ++frame) {
    core.runFrame();
    frames.push(core.getAudioFrame());
  }
  return hashAudio(frames);
}
async function capture() {
  const core = await GearcolecoTestCore.create({ seed: 0x19770527 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const audio = [];
    for (let frame = 0; frame < 120; ++frame) {
      core.runFrame();
      audio.push(core.getAudioFrame());
    }
    const nonZero = audio.reduce((total, frame) => {
      return total + frame.samples.reduce(
        (count, sample) => count + (sample !== 0 ? 1 : 0),
        0
      );
    }, 0);
    return {
      hash: hashAudio(audio),
      nonZero,
      sampleRate: audio[0].sampleRate,
      channels: audio[0].channels,
      minFrameCount: Math.min(...audio.map((frame) => frame.frameCount)),
      maxFrameCount: Math.max(...audio.map((frame) => frame.frameCount))
    };
  } finally {
    core.destroy();
  }
}

async function verifySaveStateAudioReplay() {
  const core = await GearcolecoTestCore.create({ seed: 0x19770527 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 90; ++frame) core.runFrame();
    const keyframe = core.saveState();
    const straight = captureAudioSegment(core, 45);
    core.loadState(keyframe);
    const replayed = captureAudioSegment(core, 45);
    assert.equal(replayed, straight, "save-state replay must reproduce identical PCM");
    return straight;
  } finally {
    core.destroy();
  }
}
const first = await capture();
const second = await capture();
const replayHash = await verifySaveStateAudioReplay();
console.log(JSON.stringify({ ...first, replayHash }, null, 2));
assert.deepEqual(second, first, "seeded PCM output must be deterministic");
assert.equal(first.sampleRate, 44100);
assert.equal(first.channels, 2);
assert.ok(first.nonZero > 0, "automatic music ROM must produce non-silent PCM");
assert.ok(first.minFrameCount >= 540 && first.maxFrameCount <= 740);

console.log("GearColeco web audio PASS");
console.log(JSON.stringify({ ...first, replayHash }, null, 2));
