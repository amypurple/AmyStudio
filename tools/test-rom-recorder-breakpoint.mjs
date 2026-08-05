import assert from "node:assert/strict";
import { RomTestRecorder } from "../studio/core/romTestRecorder.js";

class BreakpointCore {
  constructor() {
    this.calls = 0;
    this.masks = [0, 0];
  }
  setControllerMask(port, mask) {
    this.masks[port] = mask;
  }
  setSpinner() {}
  saveState() {
    return Uint8Array.of(this.calls, ...this.masks);
  }
  loadState(bytes, { controllerMasks }) {
    this.calls = bytes[0];
    this.masks = [...controllerMasks];
  }
  runFrame() {
    ++this.calls;
    return { breakpointHit: this.calls === 2, pc: 0x8123 };
  }
}

const recorder = new RomTestRecorder(new BreakpointCore(), {
  keyframeInterval: 2,
  maxKeyframes: 4
});
recorder.start();
assert.equal(recorder.runFrame().frame, 1);
const hit = recorder.runFrame({ controllerMasks: [16, 0] });
assert.equal(hit.breakpointHit, true);
assert.equal(hit.frame, 1, "partial frame must not advance the VBlank timeline");
assert.equal(recorder.getTimeline().latestFrame, 1);
assert.deepEqual(recorder.getRecordedInputs({ from: 0, to: 2 }), [
  { controllerMasks: [0, 0], spinnerDeltas: [0, 0] },
  { controllerMasks: [16, 0], spinnerDeltas: [0, 0] }
]);

const resumed = recorder.runFrame({ controllerMasks: [4, 0] });
assert.equal(resumed.frame, 2);
assert.equal(
  recorder.getRecordedInputs({ from: 1, to: 2 })[0].controllerMasks[0],
  16,
  "input changes while stopped must wait until the next complete frame"
);
console.log("ROM recorder breakpoint accounting PASS");
