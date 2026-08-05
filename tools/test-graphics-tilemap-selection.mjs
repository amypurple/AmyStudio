import assert from "node:assert/strict";
import {
  copyTilemapSelection,
  fillTilemapSelection,
  normalizeTilemapSelection,
  pasteTilemapSelection
} from "../studio/core/graphicsTilemapSelection.js";

const source = Uint8Array.from({ length: 20 }, (_, index) => index);
const selection = normalizeTilemapSelection({ col: 3, row: 2 }, { col: 1, row: 1 }, 5, 4);
assert.deepEqual(selection, { x: 1, y: 1, width: 3, height: 2 });

const clipboard = copyTilemapSelection(source, 5, selection);
assert.deepEqual([...clipboard.bytes], [6, 7, 8, 11, 12, 13]);

const cut = Uint8Array.from(source);
fillTilemapSelection(cut, 5, selection, 0x20);
assert.deepEqual([...cut.slice(5, 10)], [5, 0x20, 0x20, 0x20, 9]);
assert.deepEqual([...cut.slice(10, 15)], [10, 0x20, 0x20, 0x20, 14]);

const target = new Uint8Array(20).fill(0xff);
const pasted = pasteTilemapSelection(target, 5, 4, 3, 2, clipboard);
assert.deepEqual(pasted, { x: 3, y: 2, width: 2, height: 2 });
assert.deepEqual([...target.slice(13, 15)], [6, 7]);
assert.deepEqual([...target.slice(18, 20)], [11, 12]);

const moved = Uint8Array.from(source);
const moveClipboard = copyTilemapSelection(moved, 5, selection);
fillTilemapSelection(moved, 5, selection, 0x20);
pasteTilemapSelection(moved, 5, 4, 2, 1, moveClipboard);
assert.deepEqual([...moved.slice(5, 10)], [5, 0x20, 6, 7, 8]);
assert.deepEqual([...moved.slice(10, 15)], [10, 0x20, 11, 12, 13]);

console.log("graphics tilemap selection tests passed");
