#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { projectFilesById } from "../studio/examples-project-files.js";
import { parseAmyByteDataBlocks, parseGraphicsEditorsConfig } from "../studio/core/graphicsEditorMetadata.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expected = new Map([
  ["toolchain-benchmark-sprite-metasprite", 1],
  ["toolchain-benchmark-tile-animation", 2]
]);
const configs = new Map();

for (const [id, editorCount] of expected) {
  const source = fs.readFileSync(path.join(root, "studio", "examples-src", id + ".alexis"), "utf8");
  const file = (projectFilesById[id] || []).find(({ path: filePath }) => filePath === "editors.json");
  assert.ok(file, id + " must include editors.json");
  const config = parseGraphicsEditorsConfig(file, Buffer.from(file.base64, "base64"));
  configs.set(id, config);
  assert.equal(config.editors.length, editorCount, id + " editor count");
  for (const editor of config.editors) {
    const names = [...editor.patternRefs, ...editor.colorRefs, ...(editor.entries || []).map((name) => ({ from: "inline", name }))]
      .filter(({ from }) => from === "inline")
      .map(({ name }) => name);
    const blocks = parseAmyByteDataBlocks(source, names);
    for (const name of names) assert.ok(blocks.get(name)?.length, id + " must define inline data " + name);
  }
}

const metasprite = configs.get("toolchain-benchmark-sprite-metasprite").editors[0];
assert.equal(metasprite.spriteCount, 6);
assert.deepEqual(metasprite.animation.frames.map((frame) => frame.layers.map((layer) => [layer.pattern, layer.color])), [
  [[0, 15], [1, 11], [2, 1]],
  [[3, 15], [4, 11], [5, 1]]
]);

const tiles = configs.get("toolchain-benchmark-tile-animation").editors;
assert.equal(tiles[0].kind, "charset");
assert.deepEqual(tiles[0].animation.frames, [0, 1, 2, 3]);
assert.equal(tiles[0].animation.sharedColor, true);
assert.equal(tiles[1].kind, "charset");
assert.deepEqual(tiles[1].animation.frameSize, [3, 2]);
assert.deepEqual(tiles[1].animation.frames, [0, 1]);
assert.deepEqual(tiles[1].frameEntries, ["ShipFrame0", "ShipFrame1"]);

console.log("Benchmark graphics editor tests passed.");
