import assert from "node:assert/strict";
import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";
import { sourceHintsTinySound } from "../studio/core/optimization.js";
import { getRamLayout } from "../studio/ramLayouts.js";

const source = `
u8 CursorY = 64
sub start:
  play song ThemeSong
  choose menu 1 to 2 into Choice cursor $D7 at 2,16 step 1 sleep after 10 seconds
end sub
`;
const caps = inferAmyMemoryCapabilities(source, sourceHintsTinySound);
const layout = getRamLayout("colecovision_legacy_sdcc", caps);
const tinySlots = layout.reserved.find((region) => region.label.startsWith("Amy tiny sound state"));

assert.equal(caps.needsTinySound, true, "play song must reserve optional Tiny Sound state");
assert.ok(tinySlots, "Tiny Sound slots are absent from the RAM layout");
assert.ok(layout.userRamStart >= tinySlots.endExclusive,
  `user RAM $${layout.userRamStart.toString(16)} overlaps Tiny Sound through $${(tinySlots.endExclusive - 1).toString(16)}`);
const sleepState = layout.reserved.find((region) => region.label === "Amy menu sleep inactivity counter");
assert.ok(sleepState, "choose menu sleep clause did not reserve its runtime state");
assert.ok(layout.userRamStart >= sleepState.endExclusive,
  "user RAM overlaps the choose-menu sleep counter");

const lateSongLayout = getRamLayout("colecovision_legacy_sdcc", {
  needsMusic: true,
  needsSound: true,
  soundAreaCount: 2
});
const lateSongSlots = lateSongLayout.reserved.find((region) =>
  region.label.startsWith("Amy tiny sound state"));
assert.ok(lateSongSlots,
  "music discovered before its external song table must reserve Tiny Sound slots");
assert.ok(lateSongLayout.userRamStart >= lateSongSlots.endExclusive,
  "late-resolved song tables overlap user RAM");

console.log("Tiny Sound user RAM layout PASS");
