#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseAmyByteDataBlocks, parseGraphicsEditorsConfig } from "../studio/core/graphicsEditorMetadata.js";
import { projectFilesById } from "../studio/examples-project-files.js";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "studio/examples-src/afterglow-garden.alexis"), "utf8");
const configBytes = readFileSync(resolve(root, "studio/examples-src/afterglow-garden.editors.json"));
const config = parseGraphicsEditorsConfig({ path: "editors.json" }, configBytes);
const blocks = parseAmyByteDataBlocks(source, ["TilePat", "TileCol", "SpritePat"]);

assert.equal(config.editors.length, 2);
assert.deepEqual(config.editors.map((editor) => editor.kind), ["charset", "sprite-patterns"]);
assert.equal(blocks.get("TilePat").length, 88, "11 editable tile patterns");
assert.equal(blocks.get("TileCol").length, 88, "11 editable tile colors");
assert.equal(blocks.get("SpritePat").length, 96, "three editable 16x16 glow frames");
assert.deepEqual(config.editors[1].animation.frames, [0, 1, 2, 1]);

const embedded = projectFilesById["afterglow-garden"]?.find((file) => file.path === "editors.json");
assert.ok(embedded, "example browser must attach editors.json to Afterglow Garden");
const embeddedConfig = parseGraphicsEditorsConfig(embedded, Buffer.from(embedded.base64, "base64"));
assert.deepEqual(embeddedConfig.editors.map((editor) => editor.name), config.editors.map((editor) => editor.name));

console.log("Afterglow Garden editor configuration: PASS (11 tiles, 3 animated glow frames)");
