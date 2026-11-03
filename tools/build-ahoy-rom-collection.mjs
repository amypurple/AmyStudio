#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "studio", "examples-src");
const catalog = JSON.parse(readFileSync(join(sourceRoot, "index.json"), "utf8"));
const outputRoot = resolve(root, process.argv[2] || "artifacts/ahoy-magazine-aggressive");
const packageOnly = process.argv.includes("--package-only");
const rawRoot = join(outputRoot, "raw");
const romRoot = join(outputRoot, "roms");

const months = new Map([
  ["january", 1], ["february", 2], ["march", 3], ["april", 4], ["may", 5], ["june", 6],
  ["july", 7], ["august", 8], ["september", 9], ["october", 10], ["november", 11], ["december", 12]
]);
const dateOverrides = new Map([
  ["constco", "1984"]
]);

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safePart(value) {
  return clean(value).replace(/[<>:"/\\|?*]/g, "-").replace(/\.+$/g, "");
}

function sourceFor(id) {
  return readFileSync(join(sourceRoot, `${id}.alexis`), "utf8");
}

function head(source, lines = 70) {
  return source.split(/\r?\n/).slice(0, lines).map((line) => line.replace(/^\s*'\s?/, "")).join(" ");
}

function publicationDate(entry, source) {
  const override = dateOverrides.get(entry.id);
  if (override) {
    return { display: override, year: Number(override), month: 0 };
  }
  const text = `${entry.label || ""} ${entry.detail || ""} ${head(source)}`;
  const match = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*[-/]\s*(January|February|March|April|May|June|July|August|September|October|November|December))?\s+(19\d{2}|20\d{2})\b/i);
  if (match) {
    const first = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    const second = match[2] ? match[2][0].toUpperCase() + match[2].slice(1).toLowerCase() : "";
    return {
      display: `${first}${second ? `-${second}` : ""} ${match[3]}`,
      year: Number(match[3]),
      month: months.get(first.toLowerCase())
    };
  }
  const year = text.match(/\b(19\d{2}|20\d{2})\b/)?.[1];
  if (!year) throw new Error(`${entry.id}: publication date not found`);
  return { display: year, year: Number(year), month: 0 };
}

function titleFor(entry) {
  return clean(entry.label || entry.projectName || entry.id)
    .replace(/\s*\((?:(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*[-/]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December))?\s+)?(?:19|20)\d{2}\)\s*$/i, "");
}

function authorFor(entry, source) {
  const text = `${entry.detail || ""} ${head(source, 45)}`;
  if (/no (?:original )?author (?:is |was )?named|author not named/i.test(text)) return "Author not named";
  const patterns = [
    /\badaptation of\s+(.+?)\s+by\s+(.+?)(?=,\s*originally|$)/i,
    /\breimagining of\s+(.+?)['’]s\s+Ahoy!/i,
    /\bColecoVision adaptation of\s+(.+?)\s+by\s+(.+?)(?=,\s*originally|$)/i,
    /\bby\s+(.+?)(?=,\s*(?:Ahoy!|originally|from|published)|\s+for\s+Ahoy!|$)/i,
    /\b(.+?)['’]s\s+Ahoy!\s+(?:game|program)/i
  ];
  for (let index = 0; index < patterns.length; index += 1) {
    const match = text.match(patterns[index]);
    const candidate = clean(index === 0 || index === 2 ? match?.[2] : match?.[1]);
    if (candidate && candidate.length <= 80 && !/Ahoy!|magazine|Amy Bienvenu|Claude|Anthropic|ChatGPT|OpenAI/i.test(candidate)) return candidate;
  }
  return "Author not named";
}

const entries = catalog
  .filter((entry) => (entry.tags || []).includes("ahoy!"))
  .filter((entry) => existsSync(join(sourceRoot, `${entry.id}.alexis`)))
  .map((entry) => {
    const source = sourceFor(entry.id);
    if (!/Ahoy!/i.test(`${entry.detail || ""} ${head(source)}`)) throw new Error(`${entry.id}: Ahoy! provenance is not stated`);
    return {
      ...entry,
      source,
      title: titleFor(entry),
      author: authorFor(entry, source),
      date: publicationDate(entry, source)
    };
  })
  .sort((a, b) => a.date.year - b.date.year || a.date.month - b.date.month || a.title.localeCompare(b.title));

if (entries.length < 100) throw new Error(`unexpectedly small Ahoy! collection: ${entries.length}`);

if (!packageOnly) rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
rmSync(romRoot, { recursive: true, force: true });
mkdirSync(romRoot, { recursive: true });

const auditPath = join(outputRoot, "aggressive-build-audit.json");
if (!packageOnly) {
  const build = spawnSync(process.execPath, [
    join(root, "tools", "check-examples.mjs"),
    "--assemble", "--optimization", "aggressive",
    "--only", entries.map((entry) => entry.id).join(","),
    "--rom-dir", rawRoot,
    "--audit-json", auditPath
  ], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  writeFileSync(join(outputRoot, "build.log"), `${build.stdout || ""}${build.stderr || ""}`, "utf8");
  if (build.status !== 0) throw new Error(`Ahoy! collection build failed: ${build.stdout || ""}${build.stderr || ""}`);
}

const width = Math.max(3, String(entries.length).length);
const manifest = entries.map((entry, index) => {
  const input = join(rawRoot, `${entry.id}.rom`);
  if (!existsSync(input)) throw new Error(`${entry.id}: ROM was not produced`);
  const number = String(index + 1).padStart(width, "0");
  const file = [number, entry.title, `by ${entry.author}`, "Ahoy!", entry.date.display].map(safePart).join(" - ") + ".rom";
  const output = join(romRoot, file);
  copyFileSync(input, output);
  const bytes = readFileSync(output);
  return {
    number,
    id: entry.id,
    title: entry.title,
    author: entry.author,
    date: entry.date.display,
    bytes: bytes.length,
    file: basename(output),
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
});

const table = manifest.map((item) => `${item.number}. ${item.title} - ${item.author} - Ahoy! ${item.date} - ${item.bytes.toLocaleString("en-US")} bytes`).join("\n");
const readme = `AMY STUDIO AHOY! MAGAZINE COLLECTION\r\n\r\n` +
  `This archive contains ${manifest.length} ColecoVision ROMs adapted from programs published in Ahoy! magazine.\r\n` +
  `They were rebuilt from the audited Amy Studio sources with the current bug-fixed compiler and Aggressive optimization.\r\n\r\n` +
  `The ROM filenames begin with three digits so they sort in original publication order. Each filename also identifies the program, original author, magazine and publication date. Some listings did not name an author; those entries are marked accordingly rather than guessed.\r\n\r\n` +
  `These are modern ColecoVision adaptations, not recovered commercial prototypes. They preserve the original rules where practical while adding ColecoVision controls, graphics, sound and presentation. See Amy Studio for the complete source code and provenance notes.\r\n\r\n` +
  `Amy Studio: https://amypurple.github.io/AmyStudio/\r\n\r\n` +
  `PROGRAMS\r\n\r\n${table}\r\n`;
writeFileSync(join(romRoot, "README.txt"), readme, "utf8");
writeFileSync(join(romRoot, "manifest.json"), `${JSON.stringify({
  version: 1,
  generated: new Date().toISOString(),
  optimization: "aggressive",
  publication: "Ahoy!",
  count: manifest.length,
  roms: manifest
}, null, 2)}\n`, "utf8");

console.log(`Ahoy! collection: ${manifest.length} Aggressive ROMs in ${romRoot}`);
