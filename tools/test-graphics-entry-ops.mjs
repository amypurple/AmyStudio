#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  addGraphicsEntryToConfig,
  nextGraphicsEntryName,
  validateNewGraphicsEntryName
} from "../studio/core/graphicsEditorEntryOps.js";

const entries = ["Dacman_board1", "Dacman_board2", "Dacman_board4", "Dacman_board_vide"];
assert.equal(nextGraphicsEntryName(entries, { prefix: "Dacman_board" }), "Dacman_board5");
assert.equal(nextGraphicsEntryName(["LevelA"], { activeName: "LevelA" }), "LevelA1");
assert.equal(nextGraphicsEntryName([], { fallback: "Board" }), "Board1");

assert.equal(validateNewGraphicsEntryName("Board_6", entries), "Board_6");
assert.throws(() => validateNewGraphicsEntryName("6Board", entries), /Invalid graphics entry name/);
assert.throws(() => validateNewGraphicsEntryName("dacman_BOARD2", entries), /already exists/);

const config = {
  editors: [
    { name: "Dacman Boards", entries: ["Dacman_board1"] },
    { name: "Tiles", entries: [] }
  ]
};
addGraphicsEntryToConfig(config, "Dacman Boards", "Dacman_board2");
assert.deepEqual(config.editors[0].entries, ["Dacman_board1", "Dacman_board2"]);
assert.throws(() => addGraphicsEntryToConfig(config, "Missing", "Board3"), /Cannot find graphics editor/);
assert.throws(() => addGraphicsEntryToConfig(config, "Dacman Boards", "Dacman_board2"), /already exists/);

console.log("graphics entry ops tests passed");
