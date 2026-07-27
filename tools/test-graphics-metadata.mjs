#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  appendAmyByteDataBlock,
  appendAmyWordTableEntry,
  describeGraphicsEditor,
  isGraphicsEditorsProjectFile,
  parseAmyByteDataBlocks,
  parseGraphicsEditorsConfig,
  replaceAmyByteDataBlock
} from "../studio/core/graphicsEditorMetadata.js";

const enc = new TextEncoder();

function jsonBytes(value) {
  return enc.encode(JSON.stringify(value));
}

function assertThrowsMessage(fn, pattern) {
  assert.throws(fn, (error) => pattern.test(String(error?.message || error)));
}

assert.equal(isGraphicsEditorsProjectFile({ path: "editors.json" }), true);
assert.equal(isGraphicsEditorsProjectFile({ path: "@project/editors.json" }), true);
assert.equal(isGraphicsEditorsProjectFile({ path: "dacman.editors.json" }), true);
assert.equal(isGraphicsEditorsProjectFile({ path: "dacman-grafx.bin" }), false);

const config = parseGraphicsEditorsConfig({ path: "editors.json" }, jsonBytes({
  version: 1,
  editors: [
    { name: "Board", kind: "tilemap", canvas: [19, 21], screenAt: [6, 2], entries: ["Board1"], blankTile: 32, tileset: { from: "asset", name: "GameTiles" }, color: { from: "file", name: "game.color.zx0" } },
    { name: "Tiles", kind: "charset", canvas: [8, 8], screenAt: [0, 0] }
  ]
}));
assert.equal(config.editors.length, 2);
assert.deepEqual(config.editors[0].canvas, [19, 21]);
assert.deepEqual(config.editors[0].screenAt, [6, 2]);
assert.deepEqual(config.editors[0].entries, ["Board1"]);
assert.equal(config.editors[0].blankTile, 32);
assert.deepEqual(config.editors[0].tilesetRef, { from: "asset", name: "GameTiles" });
assert.deepEqual(config.editors[0].colorRef, { from: "file", name: "game.color.zx0" });
assert.equal(config.editors[1].blankTile, 0);
assert.match(describeGraphicsEditor(config.editors[0]), /tilemap .* 19x21 .* screen 6,2 .* 1 entry/);

assert.equal(parseGraphicsEditorsConfig({ path: "not-editors.json.bin" }, jsonBytes({ editors: [] })), null);
assertThrowsMessage(() => parseGraphicsEditorsConfig({ path: "editors.json" }, enc.encode("{")), /invalid JSON/);
assertThrowsMessage(() => parseGraphicsEditorsConfig({ path: "editors.json" }, jsonBytes({ editors: [] })), /no editors defined/);
assertThrowsMessage(() => parseGraphicsEditorsConfig({ path: "editors.json" }, jsonBytes({ editors: [{ name: "Bad", kind: "tilemap", canvas: [1] }] })), /canvas must be a two-value array/);

const amySource = [
  "' prelude",
  "data Board1 bytes",
  "  $20 count 2, $81, 130",
  "  ' comment ignored",
  "  0x83",
  "end data",
  "data Other bytes",
  "  1,2,3",
  "end data"
].join("\n");

const blocks = parseAmyByteDataBlocks(amySource, ["Board1"]);
assert.deepEqual(Array.from(blocks.keys()), ["Board1"]);
assert.deepEqual(Array.from(blocks.get("Board1")), [0x20, 0x20, 0x81, 130, 0x83]);

const repeatedBlocks = parseAmyByteDataBlocks("data UntitledNameTable bytes\n  $20 count 768\nend data", ["UntitledNameTable"]);
assert.equal(repeatedBlocks.get("UntitledNameTable").length, 768);
assert.equal(repeatedBlocks.get("UntitledNameTable")[0], 0x20);
assert.equal(repeatedBlocks.get("UntitledNameTable")[767], 0x20);

const replaced = replaceAmyByteDataBlock(amySource, "Board1", Uint8Array.from([1, 2, 3, 4, 5]), 3);
const reparsed = parseAmyByteDataBlocks(replaced, ["Board1", "Other"]);
assert.deepEqual(Array.from(reparsed.get("Board1")), [1, 2, 3, 4, 5]);
assert.deepEqual(Array.from(reparsed.get("Other")), [1, 2, 3]);
assert.match(replaced, /data Board1 bytes\n  \$01,\$02,\$03\n  \$04,\$05\nend data/);

assertThrowsMessage(() => parseAmyByteDataBlocks("data Bad bytes\n  LabelRef\nend data", ["Bad"]), /unsupported byte token 'LabelRef'/);
assertThrowsMessage(() => replaceAmyByteDataBlock(amySource, "Missing", Uint8Array.from([1])), /Cannot find data Missing bytes block/);

const appendSource = [
  "data Board1 bytes",
  "  $20",
  "end data",
  "data Boards words = @Board1"
].join("\n");
const appendedBlock = appendAmyByteDataBlock(appendSource, "Board2", Uint8Array.from([0x81, 0x82, 0x83]), 2, { beforeWordTable: "Boards" });
assert.match(appendedBlock, /data Board2 bytes\n  \$81,\$82\n  \$83\nend data\n\ndata Boards words = @Board1/);
const appendedTable = appendAmyWordTableEntry(appendedBlock, "Boards", "Board2");
assert.match(appendedTable, /data Boards words = @Board1,@Board2/);
assert.deepEqual(Array.from(parseAmyByteDataBlocks(appendedTable, ["Board2"]).get("Board2")), [0x81, 0x82, 0x83]);


const bitmap8Source = [
  "data Smile bitmap8",
  "  \"...XX...\"",
  "  \"..XXXX..\"",
  "  \".XXXXXX.\"",
  "  \"XXXXXXXX\"",
  "  \"XXXXXXXX\"",
  "  \".XXXXXX.\"",
  "  \"..XXXX..\"",
  "  \"...XX...\"",
  "end data"
].join("\n");
const bitmap8Blocks = parseAmyByteDataBlocks(bitmap8Source, ["Smile"]);
assert.deepEqual(Array.from(bitmap8Blocks.get("Smile")), [0x18, 0x3C, 0x7E, 0xFF, 0xFF, 0x7E, 0x3C, 0x18]);
const bitmap8Replaced = replaceAmyByteDataBlock(bitmap8Source, "Smile", Uint8Array.from([0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81]), 8);
assert.match(bitmap8Replaced, /data Smile bitmap8/);
assert.match(bitmap8Replaced, /  "X......X"/);
assert.match(bitmap8Replaced, /  ".X....X."/);
assert.equal(parseAmyByteDataBlocks(bitmap8Replaced, ["Smile"]).get("Smile").length, 8);
const sprite16Source = [
  "data Spr sprite16",
  "  \"X...............\"",
  "  \".X..............\"",
  "  \"..X.............\"",
  "  \"...X............\"",
  "  \"....X...........\"",
  "  \".....X..........\"",
  "  \"......X.........\"",
  "  \".......X........\"",
  "  \"........X.......\"",
  "  \".........X......\"",
  "  \"..........X.....\"",
  "  \"...........X....\"",
  "  \"............X...\"",
  "  \".............X..\"",
  "  \"..............X.\"",
  "  \"...............X\"",
  "end data"
].join("\n");
const sprite16Blocks = parseAmyByteDataBlocks(sprite16Source, ["Spr"]);
assert.equal(sprite16Blocks.get("Spr").length, 32);
assert.deepEqual(Array.from(sprite16Blocks.get("Spr").slice(0, 4)), [0x80, 0x40, 0x20, 0x10]);
assert.deepEqual(Array.from(sprite16Blocks.get("Spr").slice(16, 20)), [0x00, 0x00, 0x00, 0x00]);
const sprite16Replaced = replaceAmyByteDataBlock(sprite16Source, "Spr", Uint8Array.from(Array(32).fill(0xFF)), 16);
assert.match(sprite16Replaced, /data Spr sprite16/);
assert.match(sprite16Replaced, /  "XXXXXXXXXXXXXXXX"/);
assert.equal(parseAmyByteDataBlocks(sprite16Replaced, ["Spr"]).get("Spr").length, 32);
assertThrowsMessage(() => appendAmyByteDataBlock(appendedTable, "Board2", Uint8Array.from([1])), /already exists/);
assertThrowsMessage(() => appendAmyWordTableEntry(appendedTable, "Boards", "Board2"), /already includes/);
assertThrowsMessage(() => appendAmyByteDataBlock(appendSource, "Board3", Uint8Array.from([1]), 16, { beforeWordTable: "Missing" }), /Cannot find data Missing words table/);


const legacyConfig = parseGraphicsEditorsConfig({ path: "editors.json" }, jsonBytes({
  version: 1,
  editors: [
    { name: "Legacy", kind: "charset", patternFile: "tiles.bin", colorAsset: "TileColors", tileset: "TileAsset" }
  ]
}));
assert.deepEqual(legacyConfig.editors[0].patternRef, { from: "file", name: "tiles.bin" });
assert.deepEqual(legacyConfig.editors[0].colorRef, { from: "asset", name: "TileColors" });
assert.deepEqual(legacyConfig.editors[0].tilesetRef, { from: "asset", name: "TileAsset" });
assertThrowsMessage(() => parseGraphicsEditorsConfig({ path: "editors.json" }, jsonBytes({ editors: [{ name: "BadRef", kind: "tilemap", tileset: { from: "cloud", name: "x" } }] })), /tileset\.from must be inline, file, or asset/);
console.log("graphics metadata tests passed");
