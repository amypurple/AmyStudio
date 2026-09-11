#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { projectFilesById } from "../studio/examples-project-files.js";
import { parseAmyByteDataBlocks, parseGraphicsEditorsConfig } from "../studio/core/graphicsEditorMetadata.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expected = new Map([
  ["toolchain-benchmark-sprite-metasprite", 3],
  ["toolchain-benchmark-tile-animation", 2]
]);

for (const [id, editorCount] of expected) {
  const source = fs.readFileSync(path.join(root, "studio", "examples-src", id + ".alexis"), "utf8");
  const file = (projectFilesById[id] || []).find(({ path: filePath }) => filePath === "editors.json");
  assert.ok(file, id + " must include editors.json");
  const config = parseGraphicsEditorsConfig(file, Buffer.from(file.base64, "base64"));
  assert.equal(config.editors.length, editorCount, id + " editor count");
  for (const editor of config.editors) {
    const names = [...editor.patternRefs, ...editor.colorRefs]
      .filter(({ from }) => from === "inline")
      .map(({ name }) => name);
    const blocks = parseAmyByteDataBlocks(source, names);
    for (const name of names) assert.ok(blocks.get(name)?.length, id + " must define inline data " + name);
  }
}

console.log("Benchmark graphics editor tests passed.");
