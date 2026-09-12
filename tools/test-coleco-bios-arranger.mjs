import assert from "node:assert/strict";
import { buildColecoBiosArrangement, scheduleColecoBiosArrangement } from "../studio/core/colecoBiosArranger.js";

const table = {
  name: "TestTable",
  entries: [
    { index: 1, label: "Voice1", area: 1, stream: { status: "valid", events: [{ type: "note", channel: 1, length: 8 }, { type: "end", channel: 1 }] } },
    { index: 2, label: "Voice2", area: 2, stream: { status: "valid", events: [{ type: "rest", channel: 2, length: 3 }, { type: "note", channel: 2, length: 9 }, { type: "repeat", channel: 2 }] } },
    { index: 3, label: "Tiny", area: 3, stream: { status: "valid", format: "tiny", events: [] } },
    { index: 4, label: "Broken", area: 4, stream: { status: "decode-error", events: [] } }
  ]
};

const arrangement = buildColecoBiosArrangement(table);
assert.equal(arrangement.lanes.length, 2);
assert.equal(arrangement.totalFrames, 12);
assert.deepEqual(arrangement.lanes.map((lane) => lane.totalFrames), [8, 12]);
const scheduled = scheduleColecoBiosArrangement(arrangement, new Set([1, 2]));
assert.equal(scheduled.length, 3);
assert.deepEqual(scheduled.filter((event) => event.soundIndex === 2).map((event) => event.startFrame), [0, 3]);
assert.ok(scheduled.every((event) => event.soundArea === event.soundIndex));
assert.deepEqual(scheduleColecoBiosArrangement(arrangement, [2]).map((event) => event.soundIndex), [2, 2]);

const sharedArea = structuredClone(table);
sharedArea.entries[1].area = 1;
const sharedArrangement = buildColecoBiosArrangement(sharedArea);
assert.deepEqual(
  scheduleColecoBiosArrangement(sharedArrangement, [1, 2]).map((event) => event.soundIndex),
  [2, 2],
  "the later table entry must own a shared BIOS work area"
);

console.log("Coleco BIOS arranger tests passed.");
