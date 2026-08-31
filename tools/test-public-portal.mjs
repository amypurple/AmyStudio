#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
for (const relativePath of ["studio/manifest.js", "studio/vendor/README.md", "studio/vendor/amyscvassembly/README.md"]) {
  const publicText = readFileSync(resolve(root, relativePath), "utf8");
  assert.doesNotMatch(publicText, /C:[\\/]Users[\\/]/i, `${relativePath} exposes a personal absolute path`);
}

for (const expected of ["./studio/", "./docs/", "./comparison.html", "https://github.com/amypurple/AmyStudio"]) {
  assert.ok(home.includes(expected), `home page missing link: ${expected}`);
}

const previewHtml = home.match(/<div class="studio-preview"[\s\S]*?<pre><code>([\s\S]*?)<\/code><\/pre>/)?.[1] || "";
const previewSource = previewHtml
  .replace(/<span class="line-number">[^<]*<\/span> ?/g, "")
  .replace(/<[^>]+>/g, "")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&")
  .trim();
assert.match(previewSource, /^text screen/);
assert.doesNotMatch(previewSource, /^project\b/im, "first program must use the Studio project name");
assert.doesNotMatch(previewSource, /^memory\b/im, "first program must use Studio's default memory profile");
const previewTemp = mkdtempSync(resolve(tmpdir(), "amy-public-preview-"));
try {
  const sourcePath = resolve(previewTemp, "first-cartridge.alexis");
  const romPath = resolve(previewTemp, "first-cartridge.rom");
  writeFileSync(sourcePath, `${previewSource}\n`);
  const compile = spawnSync(process.execPath, [resolve(root, "tools", "amyc.mjs"), sourcePath, "--rom", romPath, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(compile.status, 0, `home-page Amy example must compile:\n${compile.stdout || ""}${compile.stderr || ""}`);
  assert.ok(existsSync(romPath), "home-page Amy example did not produce a ROM");
} finally {
  rmSync(previewTemp, { recursive: true, force: true });
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
for (const document of ["amy-language.md", "amy-optimization-cookbook.md", "amy-graphics-editors-guide.md", "graphics-workflow.md", "development-quality-pipeline.md"]) {
  assert.ok(docs.includes(document), `documentation reader missing document: ${document}`);
}
const qualityHtml = markdownToHtml(qualityMarkdown);
assert.ok(qualityHtml.includes("Amy Studio Development Quality Pipeline"), "quality pipeline heading did not render");
assert.ok(qualityHtml.includes("<ul>"), "quality pipeline lists did not render");
assert.ok(qualityHtml.includes("<pre><code>"), "quality pipeline commands did not render");

console.log("Public portal: PASS");
