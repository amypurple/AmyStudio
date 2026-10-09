#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { alexisLibrarySources } from "../studio/core/alexisLibrarySources.generated.js";

const root = path.resolve(import.meta.dirname, "..");
const excluded = new Set(["exomizer_vram.asm", "rnc2_vram.asm"]);
const expected = {};

for (const [directory, extensions] of [
  ["src/alexis_lib", [".asm"]],
  ["src/compression", [".asm"]],
  ["include", [".inc"]]
]) {
  const absoluteDirectory = path.resolve(root, directory);
  for (const name of fs.readdirSync(absoluteDirectory).sort()) {
    const lower = name.toLowerCase();
    if (excluded.has(lower) || !extensions.some((extension) => lower.endsWith(extension))) continue;
    const key = `${directory}/${name}`;
    expected[key] = fs.readFileSync(path.resolve(absoluteDirectory, name), "utf8").replace(/\r\n/g, "\n");
  }
}

assert.deepEqual(
  alexisLibrarySources,
  expected,
  "Embedded library catalog is stale; run node tools/generate-alexis-library-source-catalog.mjs"
);
console.log(`Alexis library source catalog self-test: PASS (${Object.keys(expected).length} sources)`);
