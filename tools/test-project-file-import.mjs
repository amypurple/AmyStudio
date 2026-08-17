import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import {
  PROJECT_FILE_PATTERN,
  readProjectFileText
} from "../studio/core/uiEvents.js";

const source = JSON.stringify({ projectName: "Drop Test", sourceText: "screen on" });

assert.equal(PROJECT_FILE_PATTERN.test("game.amy.json"), true);
assert.equal(PROJECT_FILE_PATTERN.test("game.json.gz"), true);
assert.equal(PROJECT_FILE_PATTERN.test("game.zip"), false);

const plain = new File([source], "game.amy.json", { type: "application/json" });
assert.equal(await readProjectFileText(plain), source);

const compressed = new File([gzipSync(source)], "game.amy.json.gz", { type: "application/gzip" });
assert.equal(await readProjectFileText(compressed), source);

console.log("Project file JSON/gzip import PASS");
