import assert from "node:assert/strict";
import {
  isPictureProjectFile,
  pictureComponentFromPath,
  spriteComponentFromPath
} from "../studio/core/picturePreview.js";

const cases = [
  ["reversi.pattern.zx0", "pattern"],
  ["title.pattern.zx1", "pattern"],
  ["reversi.name.zx0", "name"],
  ["reversi.color.raw", "color"],
  ["legacy.pattern.mdkrle", "pattern"],
  ["screen.pc.raw", "pc"]
];

for (const [path, component] of cases) {
  assert.equal(pictureComponentFromPath(path), component, path);
  assert.equal(isPictureProjectFile({ path }), true, path);
}

assert.equal(pictureComponentFromPath("reversi-sprites.bin"), "");
assert.equal(isPictureProjectFile({ path: "reversi-sprites.bin" }), false);

assert.equal(spriteComponentFromPath("reversi.sprpat.zx0"), "sprpat");
assert.equal(spriteComponentFromPath("flies.sprpat.zx1"), "sprpat");
assert.equal(spriteComponentFromPath("reversi-sprites.bin"), "");

console.log(`Picture preview paths: ${cases.length} recognized, non-picture control rejected.`);
