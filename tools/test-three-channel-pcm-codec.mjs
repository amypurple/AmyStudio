import assert from "node:assert/strict";
import {
  THREE_CHANNEL_PCM_LEVELS,
  decodeThreeChannelPcm,
  encodeThreeChannelPcm,
  quantizeThreeChannelPcmSample,
  resampleThreeChannelPcm,
  samplesToThreeChannelPcm,
  threeChannelPcmBytesToPreviewSamples,
  threeChannelPcmDeltaTableBytes,
  threeChannelPcmLevelTableBytes
} from "../studio/core/colecoThreeChannelPcm.js";

assert.equal(THREE_CHANNEL_PCM_LEVELS.length, 46);
assert.deepEqual(THREE_CHANNEL_PCM_LEVELS[0].attenuations, [15, 15, 15]);
assert.deepEqual(THREE_CHANNEL_PCM_LEVELS[19].attenuations, [8, 9, 9]);
assert.deepEqual(THREE_CHANNEL_PCM_LEVELS[45].attenuations, [0, 0, 0]);
assert.equal(threeChannelPcmLevelTableBytes().length, 138);
assert.equal(threeChannelPcmDeltaTableBytes().length, 32);
for (let index = 1; index < THREE_CHANNEL_PCM_LEVELS.length; index += 1) {
  assert(THREE_CHANNEL_PCM_LEVELS[index].amplitude > THREE_CHANNEL_PCM_LEVELS[index - 1].amplitude);
}
assert.equal(quantizeThreeChannelPcmSample(-1), 0);
assert.equal(quantizeThreeChannelPcmSample(1), 45);

const exact = Uint8Array.from([19, 20, 21, 21, 21, 22, 20, 20, 35, 35, 35, 35]);
assert.deepEqual(decodeThreeChannelPcm(encodeThreeChannelPcm(exact)), exact);

const longRun = Uint8Array.from({ length: 24 }, () => 34);
assert.deepEqual(decodeThreeChannelPcm(encodeThreeChannelPcm(longRun)), longRun);
assert(encodeThreeChannelPcm(longRun).length < longRun.length);

const hostile = Uint8Array.from([0, 45, 0, 45, 0, 45]);
const approximated = decodeThreeChannelPcm(encodeThreeChannelPcm(hostile));
assert.equal(approximated.length, hostile.length);
assert([...approximated].every(level => level >= 0 && level < 46));

const samples = Float32Array.from([-1, -0.5, 0, 0.5, 1]);
const resampled = resampleThreeChannelPcm(samples, 5, 5);
assert.equal(resampled.length, samples.length);
assert.deepEqual([...resampled], [...samples].map(quantizeThreeChannelPcmSample));

const converted = samplesToThreeChannelPcm(samples, 5, { targetRate: 5, label: "Wave" });
assert.equal(converted.unitCount, 5);
assert.match(converted.alexisSource, /^data Wave bytes/m);
const convertedLevels = decodeThreeChannelPcm(converted.bytes);
assert.equal(convertedLevels.length, resampled.length);
assert([...convertedLevels].every(level => level >= 0 && level < 46));
assert.equal(threeChannelPcmBytesToPreviewSamples(converted.bytes).length, 5);

assert.throws(() => decodeThreeChannelPcm([0]), /no end marker/i);
assert.throws(() => decodeThreeChannelPcm([30, 255], { startIndex: 0 }), /leaves the amplitude table/i);
assert.throws(() => encodeThreeChannelPcm([46]), /0\.\.45/);

console.log("Three-channel PCM codec tests passed.");
