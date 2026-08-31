#!/usr/bin/env node
import assert from "node:assert/strict";
import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";
import { getRamLayout } from "../studio/ramLayouts.js";

const layoutFor = (source) => getRamLayout("colecovision_legacy_sdcc", inferAmyMemoryCapabilities(source, () => false));
const findRegion = (layout, label) => layout.reserved.find((region) => region.label === label);
const defaultLayout = layoutFor("set sound table DemoSounds areas 8\nplay sound 1");
assert.deepEqual(findRegion(defaultLayout, "snd_areas (8 x 10-byte slots + terminator)"), {
  start: 0x702B, endExclusive: 0x707C, label: "snd_areas (8 x 10-byte slots + terminator)"
});
assert.deepEqual(findRegion(defaultLayout, "Amy runtime state"), {
  start: 0x707C, endExclusive: 0x707F, label: "Amy runtime state"
});
assert.deepEqual(findRegion(defaultLayout, "Amy sound/music runtime state"), {
  start: 0x707F, endExclusive: 0x708A, label: "Amy sound/music runtime state"
});
const sixteenAreaLayout = layoutFor("const SoundAreas = 16\nset sound table DacmanSoundTable areas SoundAreas\nplay sound 10");
assert.deepEqual(findRegion(sixteenAreaLayout, "snd_areas (16 x 10-byte slots + terminator)"), {
  start: 0x702B, endExclusive: 0x70CC, label: "snd_areas (16 x 10-byte slots + terminator)"
});
assert.deepEqual(findRegion(sixteenAreaLayout, "Amy runtime state"), {
  start: 0x70CC, endExclusive: 0x70CF, label: "Amy runtime state"
});
assert.deepEqual(findRegion(sixteenAreaLayout, "Amy sound/music runtime state"), {
  start: 0x70CF, endExclusive: 0x70DA, label: "Amy sound/music runtime state"
});
assert.ok(findRegion(sixteenAreaLayout, "Amy sound/music runtime state").start >= 0x702B + (16 * 10) + 1);
console.log("sound area RAM layout: PASS");
