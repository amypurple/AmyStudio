#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { exampleManifest } from "../studio/examples-index.generated.js";
import { exampleManifest as browserExampleManifest } from "../studio/examples.js";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "studio", "examples-src");
const catalog = JSON.parse(readFileSync(join(sourceRoot, "index.json"), "utf8"));
const checked = [];

for (const example of catalog) {
  const sourcePath = join(sourceRoot, `${example.id}.alexis`);
  if (!existsSync(sourcePath)) continue;
  const source = readFileSync(sourcePath, "utf8");
  const tags = Array.isArray(example.tags) ? example.tags : [];
  if (!tags.includes("compute") && !source.includes("COMPUTE!")) continue;

  const visible = source
    .split(/\r?\n/)
    .filter((line) => /^\s*print\b/i.test(line))
    .join("\n");

  assert.match(visible, /COMPUTE!|GAZETTE/i, `${example.id}: no visible COMPUTE!/Gazette credit`);
  assert.match(visible, /19[78]\d/, `${example.id}: no visible publication year`);
  if (example.id === "circus") {
    assert.match(visible, /TI-99\/4A VERSION/i, "circus: collective TI-version credit is missing");
  } else {
    assert.match(visible, /\bBY\b|INSPIRED BY/i, `${example.id}: no visible author credit`);
  }
  const manifestEntry = exampleManifest.find((entry) => entry.id === example.id);
  assert.ok(manifestEntry?.tags?.includes("compute!"), `${example.id}: generated compute! tag is missing`);
  assert.ok(!manifestEntry?.tags?.includes("compute"), `${example.id}: legacy compute tag was not normalized`);
  const browserEntry = browserExampleManifest.find((entry) => entry.id === example.id);
  assert.ok(browserEntry?.tags?.includes("compute!"), `${example.id}: browser compute! tag is missing`);
  checked.push(example.id);
}

assert.ok(checked.length >= 55, `expected at least 55 COMPUTE!-related examples, found ${checked.length}`);
console.log(`COMPUTE! attribution screens: PASS (${checked.length} examples)`);

