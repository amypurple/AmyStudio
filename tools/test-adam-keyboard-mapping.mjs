import assert from "node:assert/strict";
import { adamKeyFromKeyboardCode } from "../studio/core/romTestRecorderUi.js";
import fs from "node:fs";

assert.equal(adamKeyFromKeyboardCode("KeyA"), 0);
assert.equal(adamKeyFromKeyboardCode("KeyZ"), 25);
assert.equal(adamKeyFromKeyboardCode("Digit0"), 26);
assert.equal(adamKeyFromKeyboardCode("Digit9"), 35);
assert.equal(adamKeyFromKeyboardCode("Numpad7"), 33);
assert.equal(adamKeyFromKeyboardCode("F1"), 53);
assert.equal(adamKeyFromKeyboardCode("F6"), 58);
assert.equal(adamKeyFromKeyboardCode("F7"), 60);
assert.equal(adamKeyFromKeyboardCode("F8"), 59);
assert.equal(adamKeyFromKeyboardCode("PageUp"), 61);
assert.equal(adamKeyFromKeyboardCode("PageDown"), 62);
assert.equal(adamKeyFromKeyboardCode("ArrowLeft"), 70);
assert.equal(adamKeyFromKeyboardCode("ShiftRight"), 71);
assert.equal(adamKeyFromKeyboardCode("ControlLeft"), 72);
assert.equal(adamKeyFromKeyboardCode("CapsLock"), 73);
assert.equal(adamKeyFromKeyboardCode("F12"), null);

const recorderSource = fs.readFileSync(new URL("../studio/core/romTestRecorderUi.js", import.meta.url), "utf8");
assert.match(recorderSource, /data-field="keyboardTarget"/);
assert.match(recorderSource, /<option value="adam" selected>ADAM<\/option>/);
assert.match(recorderSource, /<option value="joy1">JOY P1<\/option>/);
assert.match(recorderSource, /<option value="joy2">JOY P2<\/option>/);

console.log("ADAM browser keyboard mapping tests passed.");
