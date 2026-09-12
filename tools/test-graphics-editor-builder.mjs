import assert from "node:assert/strict";
import { animationFrameNames, buildAnimatedCharsetEditor, initialAnimationFrameBytes } from "../studio/core/graphicsEditorBuilder.js";

const editor = buildAnimatedCharsetEditor({
  name: "Ships", patternName: "ShipPatterns", colorName: "ShipColors", baseTile: 144,
  tileCount: 12, frameWidth: 3, frameHeight: 2, frameCount: 2, framePrefix: "ShipFrame", frameMs: 133
});
assert.deepEqual(editor.frameEntries, ["ShipFrame0", "ShipFrame1"]);
assert.deepEqual(editor.animation.frames, [0, 1]);
assert.deepEqual(editor.animation.frameSize, [3, 2]);
assert.deepEqual(Array.from(initialAnimationFrameBytes({ baseTile: 144, tileCount: 12, width: 3, height: 2, frameIndex: 1 })), [150, 151, 152, 153, 154, 155]);
assert.deepEqual(animationFrameNames({ names: ["A", "B"], count: 2 }), ["A", "B"]);
assert.throws(() => animationFrameNames({ names: ["A"], count: 2 }), /must match/);
assert.throws(() => buildAnimatedCharsetEditor({ patternName: "P", baseTile: 250, tileCount: 7, frameWidth: 1, frameHeight: 1, frameCount: 1 }), /exceeds/);

console.log("Graphics editor builder tests passed.");
