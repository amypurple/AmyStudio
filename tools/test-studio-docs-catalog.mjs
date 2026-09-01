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

const removedCodeForms = [
  /^\s*(?:let|var)\s+[A-Za-z_][A-Za-z0-9_]*\s*=/im,
  /^\s*(?:dim|ram|local|boolean)\s+[A-Za-z_]/im,
  /^\s*(?:endif|wend|end\s+(?:for|do|function)|endselect|enddata)\s*$/im,
  /^\s*label\s+[A-Za-z_]/im,
  /^\s*(?:add\s+\S+\s+by|add\s+.+\s+to\s+\S+|subtract\s+|multiply\s+|mul\s+|divide\s+|div\s+|shl\s+|shr\s+)/im,
  /^\s*u32\s+(?:zero|copy|add|inc|sub)\b/im,
  /^\s*put\s+(?:tile|chars)\b/im
];
for (const relativePath of paths) {
  const text = fs.readFileSync(path.join(root, "docs", relativePath), "utf8");
  const amyBlocks = [...text.matchAll(/```(?:basic|amy)\s*\r?\n([\s\S]*?)```/gi)].map((match) => match[1]);
  for (const [index, block] of amyBlocks.entries()) {
    for (const pattern of removedCodeForms) {
      assert.doesNotMatch(block, pattern, `${relativePath} Amy block ${index + 1} teaches removed syntax.`);
    }
  }
}
console.log(`Studio docs catalog PASS (${paths.length} documents).`);
