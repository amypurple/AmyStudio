#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docs = readFileSync(resolve(root, "docs", "development-quality-pipeline.md"), "utf8");
const runner = readFileSync(resolve(root, "tools", "amy-feature-matrix.mjs"), "utf8");
const suites = ["language", "studio", "graphics", "emulator", "codecs", "examples"];

for (const suite of suites) {
  assert.match(runner, new RegExp(`\\"${suite}\\"`), `Runner must register the ${suite} suite.`);
  assert.ok(
    docs.includes(`node tools/amy-feature-matrix.mjs --suite ${suite}`),
    `Quality pipeline must document the ${suite} suite command.`
  );
}

for (const option of ["--only", "--from", "--full"]) {
  assert.ok(docs.includes(option), `Quality pipeline must document ${option}.`);
}

assert.match(docs, /not a browser click-through\s+E2E suite/i);
assert.match(docs, /explicit `SKIP`/);
console.log("Feature matrix suite documentation PASS.");
