import assert from "node:assert/strict";
import { amplitudeForAttenuation } from "../studio/core/colecoSoundPreview.js";

assert.equal(amplitudeForAttenuation(15), 0);
assert.equal(amplitudeForAttenuation(16), 0);
assert(amplitudeForAttenuation(0) > amplitudeForAttenuation(1));
assert(amplitudeForAttenuation(1) > amplitudeForAttenuation(14));
assert(Math.abs(amplitudeForAttenuation(0) - 0.24) < 0.000001);

console.log("Coleco sound preview tests passed.");
