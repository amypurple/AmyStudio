import assert from "node:assert/strict";
import {
  isEditableProjectTextPath,
  replaceTextSelection
} from "../studio/core/projectFileTextEditor.js";

assert.equal(isEditableProjectTextPath("brinquitos-tiny-music.asm"), true);
assert.equal(isEditableProjectTextPath("engine.S"), true);
assert.equal(isEditableProjectTextPath("sound.inc"), true);
assert.equal(isEditableProjectTextPath("music.bin"), false);
assert.equal(isEditableProjectTextPath("picture.pattern.zx0"), false);

assert.deepEqual(replaceTextSelection("ld a,1", 3, 4, "hl"), {
  value: "ld hl,1",
  selectionStart: 5,
  selectionEnd: 5
});
assert.deepEqual(replaceTextSelection("label:", 6, 6, "  "), {
  value: "label:  ",
  selectionStart: 8,
  selectionEnd: 8
});

console.log("project file text editor tests passed");
