import assert from "node:assert/strict";
import { checkSoundDeprecation } from "../studio/core/compiler/deprecations.js";

for (const source of ["wait frame", "wait vblank", "wait vblanks"]) {
  const result = checkSoundDeprecation(source, source);
  assert.equal(result.handled, true, `${source} must be recognized as removed`);
  assert.equal(result.ok, false, `${source} must fail closed`);
  assert.ok(result.log.includes("use 'wait'"), `${source} must suggest wait`);
}

const counted = checkSoundDeprecation("wait vblanks 5", "wait vblanks 5");
assert.equal(counted.handled, true);
assert.ok(counted.log.includes("use 'wait 5 frames'"));
for (const source of ["wait", "wait 1 frame", "wait 5 frames"]) {
  assert.equal(checkSoundDeprecation(source, source).handled, false, `${source} is canonical`);
}

console.log("Removed wait aliases PASS.");
