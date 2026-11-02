#!/usr/bin/env node
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageRoot = resolve(process.argv[2] || join(root, "artifacts", "ahoy-package-2026-11-01", "ahoy"));
const dryRun = process.argv.includes("--dry-run");
const examplesRoot = join(root, "studio", "examples-src");
const indexPath = join(examplesRoot, "index.json");
const packageReadme = readFileSync(join(packageRoot, "README.md"), "utf8");
const index = JSON.parse(readFileSync(indexPath, "utf8"));

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function singleLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function displayTitle(value) {
  return String(value).toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

const rows = [];
for (const line of packageReadme.split(/\r?\n/)) {
  const catalog = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(Ahoy!\s+.+?)\s*\|\s*\[.+?\]\((.+?)\/\)\s*\|$/);
  if (catalog && catalog[1] !== "Game") {
    rows.push({ title: singleLine(catalog[1]), author: singleLine(catalog[2]), issue: singleLine(catalog[3]), folder: catalog[4] });
    continue;
  }
  const addition = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\[.+?\]\((.+?)\/\)\s*\|\s*\d+\s*\|$/);
  if (!addition || addition[1] === "Game") continue;
  const folderReadme = readFileSync(join(packageRoot, addition[3], "README.md"), "utf8");
  const issue = folderReadme.match(/Ahoy!\s+(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*\/\s*(?:January|February|March|April|May|June|July|August|September|October|November|December))?\s+)?19\d{2}/i)?.[0]
    || `Ahoy! ${addition[2].match(/\b19\d{2}\b/)?.[0] || "publication"}`;
  const author = folderReadme.match(/Original author:\s*([^\r\n]+)/i)?.[1]?.replace(/\*+/g, "").trim()
    || folderReadme.match(/\bby\s+([^,\r\n]+),\s*Ahoy!/i)?.[1]?.replace(/[*"']/g, "").trim()
    || addition[2].replace(/\s*\/\s*19\d{2}\s*$/, "").trim();
  rows.push({ title: singleLine(addition[1]), author: singleLine(author), issue: singleLine(issue), folder: addition[3] });
}

const uniqueRows = [...new Map(rows.map((row) => [row.folder, row])).values()];
if (uniqueRows.length !== 184) {
  throw new Error(`Expected 184 Ahoy! catalog rows, found ${uniqueRows.length}.`);
}

const byProject = new Map(index.map((entry) => [normalized(entry.projectName), entry]));
const usedIds = new Set(index.map((entry) => entry.id));
let added = 0;
let updated = 0;

for (const row of uniqueRows) {
  const folderPath = join(packageRoot, row.folder);
  const sourceNames = readdirSync(folderPath).filter((name) => name.endsWith(".alexis") && !name.endsWith("-noworkaround.alexis"));
  const sourceName = sourceNames[0];
  if (sourceNames.length !== 1) {
    throw new Error(`Cannot identify shipped source for ${row.folder}.`);
  }
  const slug = basename(sourceName, ".alexis");
  const projectMatch = byProject.get(normalized(row.title)) || byProject.get(normalized(displayTitle(row.title)));
  const existing = projectMatch && (projectMatch.tags || []).includes("ahoy!") ? projectMatch : null;
  const targetId = existing?.id || (usedIds.has(slug) ? `${slug}-ahoy` : slug);
  if (!existing && usedIds.has(targetId)) throw new Error(`Duplicate example id ${targetId}.`);

  if (!dryRun) copyFileSync(join(folderPath, sourceName), join(examplesRoot, `${targetId}.alexis`));
  if (existing) {
    existing.tags = [...new Set([...(existing.tags || []), "ahoy!"])];
    existing.label = singleLine(existing.label);
    existing.detail = singleLine(existing.detail);
    updated += 1;
    continue;
  }

  const date = row.issue.replace(/^Ahoy!\s+/, "");
  const author = row.author === "not named (credit the issue)" ? "an author not named in the issue" : row.author;
  const projectName = displayTitle(row.title.replace(/!$/, "")) + (row.title.endsWith("!") ? "!" : "");
  const entry = {
    id: targetId,
    originKind: "reimagined-adaptation",
    label: `${projectName} (${date})`,
    detail: `A ColecoVision adaptation of ${row.title} by ${author}, originally published in ${row.issue}.`,
    projectName,
    sourceLang: "amy",
    memoryProfile: "colecovision_legacy_sdcc",
    category: "Games",
    tags: ["amy", "ahoy!", "reimagined-adaptation", "game", "commodore-64"]
  };
  index.push(entry);
  byProject.set(normalized(projectName), entry);
  usedIds.add(targetId);
  added += 1;
}

if (!dryRun) writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify({ projects: uniqueRows.length, added, updated, dryRun }, null, 2));
