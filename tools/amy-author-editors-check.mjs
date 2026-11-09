#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const kinds = new Set(["bitmap-screen", "charset", "tilemap", "frames", "metatiles", "sprite-patterns"]);

function sourceProblems(value, path) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  const problems = [];
  for (const [index, source] of list.entries()) {
    const at = `${path}${Array.isArray(value) ? `[${index}]` : ""}`;
    if (!source || typeof source !== "object") problems.push(`${at} must be a source object.`);
    else {
      if (!new Set(["inline", "file"]).has(source.from)) problems.push(`${at}.from must be inline or file.`);
      if (typeof source.name !== "string" || !source.name.trim()) problems.push(`${at}.name must be non-empty.`);
    }
  }
  return problems;
}

export function validateEditors(document) {
  const errors = [], warnings = [];
  if (document?.version !== 1) errors.push("version must be 1.");
  if (!Array.isArray(document?.editors)) errors.push("editors must be an array.");
  const names = new Set();
  for (const [index, editor] of (document?.editors || []).entries()) {
    const at = `editors[${index}]`;
    if (!editor || typeof editor !== "object") { errors.push(`${at} must be an object.`); continue; }
    if (typeof editor.name !== "string" || !editor.name.trim()) errors.push(`${at}.name must be non-empty.`);
    else if (names.has(editor.name.toLowerCase())) errors.push(`${at}.name duplicates another editor (case-insensitive).`);
    else names.add(editor.name.toLowerCase());
    if (!kinds.has(editor.kind)) errors.push(`${at}.kind '${editor.kind}' is not supported.`);
    for (const key of ["pattern", "color", "patterns", "tileset"]) errors.push(...sourceProblems(editor[key], `${at}.${key}`));
    if (["charset", "sprite-patterns", "bitmap-screen"].includes(editor.kind) && !editor.pattern && !editor.patterns) {
      errors.push(`${at} requires pattern or patterns ownership.`);
    }
    if (["tilemap", "frames", "metatiles"].includes(editor.kind) && !Array.isArray(editor.entries)) {
      errors.push(`${at}.entries must identify the owned tile data.`);
    }
    if (editor.kind === "sprite-patterns" && (!Array.isArray(editor.spriteSize) || editor.spriteSize.length !== 2)) {
      errors.push(`${at}.spriteSize must be [width,height].`);
    }
    if (!editor.notes) warnings.push(`${at} has no notes; add them when ownership, grouping, or runtime color is not obvious.`);
  }
  return { verdict: errors.length ? "FAIL" : warnings.length ? "WARN" : "PASS", errors, warnings };
}

function main() {
  const path = process.argv[2];
  if (!path) { console.log("Usage: node tools/amy-author-editors-check.mjs <editors.json>"); return 2; }
  let document;
  try { document = JSON.parse(readFileSync(resolve(path), "utf8")); }
  catch (error) { console.error(`FAIL invalid editors JSON: ${error.message}`); return 1; }
  const report = validateEditors(document);
  for (const message of report.errors) console.log(`FAIL ${message}`);
  for (const message of report.warnings) console.log(`WARN ${message}`);
  console.log(`Amy editors check: ${report.verdict} (${document.editors?.length || 0} editor(s))`);
  return report.verdict === "FAIL" ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exitCode = main();
