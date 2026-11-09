#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { identifyProject } from "./amy-author-project-proof.mjs";

function sha(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function fail(message) { throw new Error(message); }

export function runDelivery(input, options = {}) {
  const project = identifyProject(input);
  const reportPath = options.report;
  const output = resolve(options.output || resolve(project.projectDir, "deliver"));
  if (!reportPath || !existsSync(resolve(reportPath))) fail("A completed amy-author-check JSON report is required.");
  const report = JSON.parse(readFileSync(resolve(reportPath), "utf8"));
  if (report.kind !== "amy-author-check" || report.verdict === "FAIL") fail("Author report is missing or failed.");
  const passed = new Set((report.executions || []).filter((item) => item.state === "PASS").map((item) => item.id));
  for (const required of ["doctor", "project-proof"]) if (!passed.has(required)) fail(`Required executed adapter did not pass: ${required}`);
  const substantialGame = project.metadata?.provenance?.classification !== "non-game";
  if (project.metadata.qa?.bot && !passed.has("project-bot")) fail("Declared project bot did not pass.");
  if (substantialGame) {
    for (const required of ["production-quality", "project-bot", "project-bot-metrics", "visual-proof"]) {
      if (!passed.has(required)) fail(`Publishable game evidence did not pass: ${required}`);
    }
  }
  if (project.metadata.qa?.visual?.humanReviewRequired && !options.approveVisual) fail("Visual evidence requires explicit human approval (--approve-visual). ");
  if (!existsSync(project.shippedOutput)) fail(`Built output is missing: ${project.shippedOutput}`);

  rmSync(output, { recursive: true, force: true });
  mkdirSync(resolve(output, "source"), { recursive: true });
  mkdirSync(resolve(output, "evidence"), { recursive: true });
  const sourceFiles = [project.source];
  const includeQueue = [project.source];
  const seenIncludes = new Set();
  while (includeQueue.length) {
    const current = includeQueue.shift();
    if (seenIncludes.has(current)) continue;
    seenIncludes.add(current);
    const text = readFileSync(current, "utf8");
    for (const match of text.matchAll(/(?:include(?:\s+amy|\s+asm)?|incbin)\s+"@project\/([^"]+)"/gi)) {
      const included = resolve(project.projectDir, match[1]);
      if (!existsSync(included) || !statSync(included).isFile()) fail(`Included project file missing: ${included}`);
      sourceFiles.push(included);
      if (/\.(alexis|amy|inc|asm)$/i.test(included)) includeQueue.push(included);
    }
  }
  for (const candidate of [project.metadataPath, resolve(project.projectDir, `${basename(project.source, extname(project.source))}.editors.json`), resolve(project.projectDir, project.metadata.qa?.visual?.config || "")]) {
    if (candidate && existsSync(candidate) && statSync(candidate).isFile()) sourceFiles.push(candidate);
  }
  for (const relative of project.metadata.deliveryFiles || []) {
    const path = resolve(project.projectDir, relative);
    if (!existsSync(path) || !statSync(path).isFile()) fail(`Declared delivery file missing: ${path}`);
    sourceFiles.push(path);
  }
  const uniqueSources = [...new Set(sourceFiles)];
  for (const path of uniqueSources) {
    let destination = relative(project.projectDir, path);
    if (destination.startsWith("..") || /^[A-Za-z]:/.test(destination)) destination = basename(path);
    const target = resolve(output, "source", destination);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(path, target);
  }
  copyFileSync(project.shippedOutput, resolve(output, basename(project.shippedOutput)));
  copyFileSync(resolve(reportPath), resolve(output, "evidence", "amy-author-report.json"));

  const visualDir = project.metadata.qa?.visual?.output ? resolve(project.projectDir, project.metadata.qa.visual.output) : null;
  if (visualDir && existsSync(visualDir)) {
    const target = resolve(output, "evidence", "visual");
    mkdirSync(target, { recursive: true });
    for (const name of readdirSync(visualDir)) if (/\.(png|json)$/i.test(name)) copyFileSync(resolve(visualDir, name), resolve(target, name));
  }
  const files = [];
  function walk(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = resolve(dir, entry.name); if (entry.isDirectory()) walk(path); else files.push(path); } }
  walk(output);
  const manifest = files.map((path) => ({ file: path.slice(output.length + 1).replaceAll("\\", "/"), bytes: statSync(path).size, sha256: sha(path) }));
  writeFileSync(resolve(output, "DELIVERY.json"), `${JSON.stringify({ kind: "amy-author-delivery", version: 1, created: new Date().toISOString(), target: project.target, optimization: project.metadata.optimization || "balanced", visualHumanApproved: Boolean(options.approveVisual), files: manifest }, null, 2)}\n`);
  return { ok: true, output, fileCount: manifest.length + 1 };
}

function value(name) { const at = process.argv.indexOf(name); return at >= 0 ? process.argv[at + 1] : null; }
function main() {
  const input = process.argv[2];
  if (!input) { console.log("Usage: node tools/amy-author-deliver.mjs <source-or-project> --report author.json --output delivery [--approve-visual]"); return 2; }
  const result = runDelivery(input, { report: value("--report"), output: value("--output"), approveVisual: process.argv.includes("--approve-visual") });
  console.log(`Amy author delivery: PASS (${result.output}; ${result.fileCount} files including complete declared source/evidence)`);
  return 0;
}

try { if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exit(main()); }
catch (error) { console.error(`Amy author delivery: FAIL: ${error.message}`); process.exit(1); }
