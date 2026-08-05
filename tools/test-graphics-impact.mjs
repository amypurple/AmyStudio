#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  computeTilesetImpact,
  evaluateGraphicsConstExpression,
  scanGraphicsBlindSpots,
  scanGraphicsUploadSites,
  scanOwnedTilemaps,
  scanSuspectTileLiterals,
  tileRangeForEditor
} from "../studio/core/graphicsImpact.js";

const editor = {
  name: "Dacman Boards",
  kind: "tilemap",
  entries: ["Board1", "Board2"],
  baseTile: 0x80,
  tileCount: 84,
  tilesetRef: { from: "asset", name: "DacmanGrafx" },
  patternRef: { from: "file", name: "dacman-grafx.bin" },
  colorRef: { from: "file", name: "dacman-game.color.zx0" }
};

const source = [
  "project \"impact test\"",
  "copy DacmanGrafx count 84 * 8 to vram.pattern + $80 * 8",
  "copy DacmanGrafx count TileCount * 8 to vram.pattern + TileBase * 8",
  "copy DacmanGrafx + 128 count 128 to vram.pattern + (256 + 128) * 8",
  "data Board1 bytes",
  "  $20,$80,$81,$D3,$D4",
  "end data",
  "data Board2 bytes",
  "  $82 count 2, $20",
  "end data",
  "if Tile = $80 then put char $81 at 1,1",
  "call asm LegacyLoader",
  "asm {",
  "  ld a,$80",
  "}"
].join("\n");

assert.equal(evaluateGraphicsConstExpression("84 * 8"), 672);
assert.equal(evaluateGraphicsConstExpression("$80 * 8"), 1024);
assert.equal(evaluateGraphicsConstExpression("(256 + 128) * 8"), 3072);
assert.equal(evaluateGraphicsConstExpression("TileCount * 8"), null);
assert.equal(evaluateGraphicsConstExpression("5 / 2"), null);

assert.deepEqual(tileRangeForEditor(editor), {
  oldBase: 128,
  oldCount: 84,
  oldEnd: 211,
  newBase: 128,
  newCount: 84,
  newEnd: 211,
  deltaBase: 0,
  deltaCount: 0
});

const uploads = scanGraphicsUploadSites(source, editor, { tileCount: 90 });
assert.equal(uploads.length, 3);
assert.equal(uploads[0].zone, "A");
assert.equal(uploads[0].count, 672);
assert.equal(uploads[0].vramOffset, 1024);
assert.deepEqual(uploads[0].incoherences, [{ type: "upload-count-mismatch", expected: 720, actual: 672 }]);
assert.equal(uploads[1].zone, "B");
assert.equal(uploads[1].count, null);
assert.equal(uploads[1].vramOffset, null);
assert.equal(uploads[2].zone, "A");
assert.equal(uploads[2].partial, true);
assert.deepEqual(uploads[2].incoherences, []);
const unknownSizeEditor = { ...editor };
delete unknownSizeEditor.tileCount;
const unknownSizeUploads = scanGraphicsUploadSites(source, unknownSizeEditor);
assert.equal(unknownSizeUploads[0].count, 672);
assert.deepEqual(unknownSizeUploads[0].incoherences, []);

const maps = scanOwnedTilemaps(source, editor, { tileCount: 82 });
assert.equal(maps.length, 2);
assert.deepEqual(maps[0], {
  name: "Board1",
  zone: "A",
  missing: false,
  bytes: 5,
  oldRangeUses: 3,
  newRangeUses: 2,
  outOfNewRangeUses: 1
});
assert.equal(maps[1].oldRangeUses, 2);

const suspects = scanSuspectTileLiterals(source, editor);
assert.equal(suspects.length, 2);
assert.deepEqual(suspects.map((item) => item.value), [0x80, 0x81]);
assert.equal(suspects[0].zone, "B");

const blind = scanGraphicsBlindSpots(source);
assert.deepEqual(blind.map((item) => item.type), ["asm-reference", "asm-block"]);

const impact = computeTilesetImpact({ editor, sourceText: source, proposedChange: { tileCount: 90 } });
assert.equal(impact.range.newEnd, 0xD9);
assert.equal(impact.uploadedBy.length, 3);
assert.equal(impact.usedBy.length, 2);
assert.equal(impact.suspectLiterals.length, 2);
assert.equal(impact.blindSpots.length, 2);
assert.equal(impact.incoherences.some((issue) => issue.type === "upload-count-mismatch"), true);

const overflow = computeTilesetImpact({ editor, sourceText: source, proposedChange: { baseTile: 0xF0, tileCount: 32 } });
assert.equal(overflow.incoherences.some((issue) => issue.type === "tile-range-overflow"), true);

console.log("graphics impact tests passed");
