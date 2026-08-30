#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { markdownToHtml } from "../studio/core/docsUi.js";

const root = resolve(import.meta.dirname, "..");
const requiredFiles = [
  "index.html",
  "comparison.html",
  "portal.css",
  "docs/index.html",
  "docs/portal-docs.js",
  "studio/index.html",
  "docs/amy-current-version.md",
  "docs/amy-language.md",
  "docs/amy-optimization-cookbook.md",
  "docs/amy-graphics-editors-guide.md",
  "docs/development-quality-pipeline.md",
  "docs/studio-workflow.md"
];

for (const file of requiredFiles) {
  assert.ok(existsSync(resolve(root, file)), `missing public portal file: ${file}`);
}

const home = readFileSync(resolve(root, "index.html"), "utf8");
const comparison = readFileSync(resolve(root, "comparison.html"), "utf8");
const docs = readFileSync(resolve(root, "docs/portal-docs.js"), "utf8");
const qualityMarkdown = readFileSync(resolve(root, "docs/development-quality-pipeline.md"), "utf8");

for (const expected of ["./studio/", "./docs/", "./comparison.html", "https://github.com/amypurple/AmyStudio"]) {
  assert.ok(home.includes(expected), `home page missing link: ${expected}`);
}
for (const repository of [
  "AmysCVAssembly",
  "AmysCVPaintStudio",
  "AmysCVSoundStudio",
  "CVSoundFX-Web",
  "RetroCompress-Lite",
  "DAN3",
  "pvcollib"
]) {
  assert.ok(home.includes(`https://github.com/amypurple/${repository}`), `home page missing repository: ${repository}`);
}
for (const project of ["Amy Studio", "CVBasic", "z88dk +coleco"]) {
  assert.ok(comparison.includes(project), `comparison missing toolchain: ${project}`);
}
for (const document of ["amy-language.md", "amy-optimization-cookbook.md", "amy-graphics-editors-guide.md", "development-quality-pipeline.md"]) {
  assert.ok(docs.includes(document), `documentation reader missing document: ${document}`);
}
const qualityHtml = markdownToHtml(qualityMarkdown);
assert.ok(qualityHtml.includes("Amy Studio Development Quality Pipeline"), "quality pipeline heading did not render");
assert.ok(qualityHtml.includes("<ul>"), "quality pipeline lists did not render");
assert.ok(qualityHtml.includes("<pre><code>"), "quality pipeline commands did not render");

console.log("Public portal: PASS");
