import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "studio", "core", "docsUi.js"), "utf8");
const paths = [...source.matchAll(/path:\s*"\.\.\/docs\/([^"]+)"/g)].map((match) => match[1]);
assert.ok(paths.length >= 12, `Expected the public Studio Docs workflows, got ${paths.length}.`);
assert.equal(new Set(paths).size, paths.length, "Studio Docs catalog contains duplicate paths.");
for (const relativePath of paths) {
  const fullPath = path.join(root, "docs", relativePath);
  assert.ok(fs.existsSync(fullPath), `Studio Docs entry is missing: docs/${relativePath}`);
  assert.match(fs.readFileSync(fullPath, "utf8"), /^#\s+\S/m, `Studio Docs entry has no title: docs/${relativePath}`);
}
for (const relativePath of ["studio-workflow.md", "graphics-workflow.md", "rom-runtime-testing.md", "amy-optimization-cookbook.md"]) {
  const text = fs.readFileSync(path.join(root, "docs", relativePath), "utf8");
  assert.doesNotMatch(text, /\.alexis\.json/i, `${relativePath} recommends the obsolete suffix.`);
  assert.doesNotMatch(text, /tools\/asset-sync\.py graphics/i, `${relativePath} recommends an unimplemented workflow.`);
  assert.doesNotMatch(text, /Web version\*\* \(planned\)/i, `${relativePath} describes shipped DSound as planned.`);
}
for (const required of [
  "amy-current-version.md", "studio-workflow.md", "graphics-workflow.md", "rom-runtime-testing.md",
  "colecovision-official-controller-routines.md", "compression-suite.md", "development-quality-pipeline.md"
]) {
  assert.ok(paths.includes(required), `Studio Docs must expose ${required}.`);
}
console.log(`Studio docs catalog PASS (${paths.length} documents).`);
