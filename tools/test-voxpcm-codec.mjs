#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOX_PCM_MASTER_CLOCK,
  VOX_PCM_QUALITY_PRESETS,
  encodeVoxPcmSegments,
  voxPcmQualityPreset,
  voxPcmSequenceAsm
} from "../studio/core/colecoVoxPcm.js";
import { decodeThreeChannelPcmCompact } from "../studio/core/colecoThreeChannelPcm.js";

assert.equal(VOX_PCM_QUALITY_PRESETS.length, 7);
assert.deepEqual(VOX_PCM_QUALITY_PRESETS.map(item => item.id), ["minimum", "draft", "tiny", "compact", "balanced", "high", "maximum"]);
assert.throws(() => voxPcmQualityPreset("unknown"), /Unknown VoxPCM quality/);

const sourceRate = 8000;
const samples = new Float32Array(sourceRate / 2);
for (let index = samples.length / 2; index < samples.length; index += 1) {
  samples[index] = index & 1 ? 0.9 : -0.9;
}
const adaptive = encodeVoxPcmSegments(samples, sourceRate, {
  segmentMilliseconds: 250,
  minimumQuality: "minimum",
  maximumQuality: "maximum",
  dither: false
});
assert.equal(adaptive.parts.length, 2);
assert.equal(adaptive.parts[0].quality, "minimum", "flat audio should use the smallest adaptive preset");
assert.equal(adaptive.parts[1].quality, "maximum", "rapidly changing audio should use the largest adaptive preset");

const globallyCalibrated = encodeVoxPcmSegments(samples.slice(0, sourceRate / 4), sourceRate, {
  segmentMilliseconds: 250,
  minimumQuality: "minimum",
  maximumQuality: "maximum",
  adaptiveComplexityRange: {
    minimum: adaptive.parts[0].complexity,
    maximum: adaptive.parts[1].complexity
  },
  dither: false
});
assert.equal(globallyCalibrated.parts[0].quality, "minimum", "shared calibration must preserve cross-fragment quality decisions");
assert.throws(() => encodeVoxPcmSegments(samples, sourceRate, {
  adaptiveComplexityRange: { minimum: 2, maximum: 1 }
}), /range is reversed/);

for (const preset of VOX_PCM_QUALITY_PRESETS) {
  const encoded = encodeVoxPcmSegments(samples.slice(0, sourceRate / 4), sourceRate, {
    segmentMilliseconds: 250,
    quality: preset.id,
    dither: false
  });
  const part = encoded.parts[0];
  assert.equal(part.quality, preset.id);
  assert.deepEqual(Array.from(decodeThreeChannelPcmCompact(part.bytes)).length, part.unitCount);
  const representedSeconds = part.unitCount * preset.targetCycles / VOX_PCM_MASTER_CLOCK;
  assert(Math.abs(representedSeconds - 0.25) < 0.0002, `${preset.id} must preserve segment duration`);
}

const repeated = [adaptive.parts[0], adaptive.parts[1], adaptive.parts[0]];
const table = voxPcmSequenceAsm("VoiceSequence", repeated, { loop: true });
assert.equal((table.match(/dw VoxPart1/g) || []).length, 2, "one payload can be referenced more than once");
assert.match(table, /dw 0,VoiceSequence$/);
assert.match(voxPcmSequenceAsm("OneShot", [adaptive.parts[0]], { loop: false }), /dw 0,0$/);

console.log("VoxPCM codec planning tests passed.");
