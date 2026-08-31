#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docs = readFileSync(resolve(root, "docs", "development-quality-pipeline.md"), "utf8");
const runner = readFileSync(resolve(root, "tools", "amy-feature-matrix.mjs"), "utf8");
const exclusions = JSON.parse(readFileSync(resolve(root, "tools", "amy-feature-matrix-exclusions.json"), "utf8"));
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
const registered = new Set([...runner.matchAll(/file:\s*"(test-[^"]+\.mjs)"/g)].map((match) => match[1]));
const testFiles = readdirSync(resolve(root, "tools")).filter((file) => /^test-.*\.mjs$/.test(file));
for (const [file, reason] of Object.entries(exclusions)) {
  assert.ok(testFiles.includes(file), `Excluded matrix test does not exist: ${file}`);
  assert.ok(!registered.has(file), `Registered matrix test must not also be excluded: ${file}`);
  assert.ok(String(reason).trim().length >= 12, `Excluded matrix test needs a useful reason: ${file}`);
}
const unaccounted = testFiles.filter((file) => !registered.has(file) && !Object.hasOwn(exclusions, file));
assert.deepEqual(unaccounted, [], `Tests missing from the matrix or exclusion manifest: ${unaccounted.join(", ")}`);
console.log("Feature matrix suite documentation PASS.");
