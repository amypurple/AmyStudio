#!/usr/bin/env node
import assert from "node:assert/strict";

import { createGraphicsProjectAssetAccess } from "../studio/core/projectAssetAccess.js";

const files = [
  { path: "@project/tiles.bin", kind: "asset", codec: "raw", bytes: Uint8Array.from([1, 2, 3]) },
  { path: "@project/game.color.zx0", kind: "asset", codec: "zx0", bytes: Uint8Array.from([9, 8, 7]) },
  { path: "@project/board.pattern", kind: "asset", codec: "raw", bytes: Uint8Array.from([4]) },
  { path: "@project/board.name.zx0", kind: "asset", codec: "zx0", bytes: Uint8Array.from([6, 5, 4]) }
];
const calls = [];
const access = createGraphicsProjectAssetAccess({
  getProject: () => ({ projectFiles: files }),
  normalizeProjectFilePath: (path) => String(path || "").startsWith("@project/") ? String(path) : "@project/" + String(path || ""),
  assetNameFromProjectPath: (path) => String(path || "").split("/").pop().replace(/\.[^.]+$/, ""),
  projectFileBytes: (entry) => entry.bytes,
  detectCodecFromName: (path) => String(path || "").endsWith(".zx0") ? "zx0" : "raw",
  decompressBytes: async (codec, bytes) => {
    calls.push({ codec, bytes: Array.from(bytes) });
    return Uint8Array.from([7, 8, 9]);
  }
});

assert.equal(access.findEditorTilesetFile({ tilesetRef: { from: "file", name: "tiles.bin" } }), files[0]);
assert.equal(access.findEditorTilesetFile({ tilesetFile: "tiles.bin" }), files[0]);
assert.equal(access.findEditorTilesetFile({ tileset: "tiles" }), files[0]);
assert.equal(access.patternFileForCharsetEditor({ patternRef: { from: "file", name: "board.pattern" } }), files[2]);
assert.equal(access.patternFileForCharsetEditor({ patternFile: "board.pattern" }), files[2]);
assert.equal(access.findEditorColorFile({ colorRef: { from: "file", name: "game.color.zx0" } }), files[1]);
assert.equal(access.findEditorColorFile({ colorFile: "game.color.zx0" }), files[1]);
assert.equal(access.findEditorColorFile({}), files[1]);
assert.equal(access.findEditorDataFile({ source: { from: "file", name: "board.name.zx0" } }), files[3]);
assert.equal(access.findEditorDataFile({ sourceFile: "board.name.zx0" }), files[3]);
assert.deepEqual(Array.from(await access.decodedProjectFileBytes(files[0])), [1, 2, 3]);
assert.deepEqual(Array.from(await access.decodedProjectFileBytes(files[1])), [7, 8, 9]);
assert.deepEqual(calls, [{ codec: "zx0", bytes: [9, 8, 7] }]);

console.log("graphics project asset access tests passed");
