import assert from "node:assert/strict";
import { amplitudeForAttenuation, volumeEnvelopeForEvent } from "../studio/core/colecoSoundPreview.js";
import { buildColecoEchoTone } from "../studio/core/colecoSoundNotes.js";

assert.equal(amplitudeForAttenuation(15), 0);
assert.equal(amplitudeForAttenuation(16), 0);
assert(amplitudeForAttenuation(0) > amplitudeForAttenuation(1));
assert(amplitudeForAttenuation(1) > amplitudeForAttenuation(14));
assert(Math.abs(amplitudeForAttenuation(0) - 0.24) < 0.000001);

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
