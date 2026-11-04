#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "studio", "examples-src");
const catalog = JSON.parse(readFileSync(join(sourceRoot, "index.json"), "utf8"));
const outputRoot = resolve(root, process.argv[2] || "artifacts/compute-gazette-aggressive");
const packageOnly = process.argv.includes("--package-only");
const rawRoot = join(outputRoot, "raw");
const romRoot = join(outputRoot, "roms");
const months = new Map([
  ["january", 1], ["february", 2], ["march", 3], ["april", 4], ["may", 5], ["june", 6],
  ["july", 7], ["august", 8], ["september", 9], ["october", 10], ["november", 11], ["december", 12]
]);

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const safePart = (value) => clean(value).replace(/[<>:"/\\|?*]/g, "-").replace(/\.+$/g, "");
const sourceFor = (id) => readFileSync(join(sourceRoot, `${id}.alexis`), "utf8");
const head = (source, lines = 80) => source.split(/\r?\n/).slice(0, lines).map((line) => line.replace(/^\s*'\s?/, "")).join(" ");

function publicationDate(entry, source) {
  const text = `${entry.label || ""} ${entry.detail || ""} ${head(source)}`;
  const match = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*[-/]\s*(January|February|March|April|May|June|July|August|September|October|November|December))?\s+(19\d{2}|20\d{2})\b/i);
  if (!match) throw new Error(`${entry.id}: publication month and year not found`);
  const first = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  const second = match[2] ? match[2][0].toUpperCase() + match[2].slice(1).toLowerCase() : "";
  return { display: `${first}${second ? `-${second}` : ""} ${match[3]}`, year: Number(match[3]), month: months.get(first.toLowerCase()) };
}

function titleFor(entry) {
  return clean(entry.label || entry.projectName || entry.id)
    .replace(/\s*\((?:(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*[-/]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December))?\s+)?(?:19|20)\d{2}\)\s*$/i, "");
}

function authorFor(entry, source) {
  const text = clean(`${entry.detail || ""} ${head(source)}`);
  if (/no (?:original )?author (?:is |was )?named|author not named|listing names no author|credit is the magazine/i.test(text)) return "Author not named";
  const patterns = [
    /(?:^|[.;]\s+)([A-Z][A-Za-z .,&'-]{2,80})['’]s\s+COMPUTE!'s Gazette\b/i,
    /(?:port|adaptation|reinterpretation|reimagining) of\s+["“]?[^"”]+["”]?\s+by\s+(.+?)(?=,\s*(?:COMPUTE|originally|published)|\s+for\s+COMPUTE|$)/i,
    /(?:port|adaptation|reinterpretation|reimagining) of\s+(.+?)['’]s\s+COMPUTE!/i,
    /\bby\s+(.+?)(?=,\s*(?:COMPUTE|originally|published|from|a\s|an\s|the\s)|\s+for\s+COMPUTE|$)/i,
    /\b(.+?)['’]s\s+COMPUTE!'s Gazette\s+(?:game|program|adaptation)/i,
    /\bORIGINAL (?:GAME )?(?:BY|AUTHOR)\s*[:=-]?\s*(.+?)(?=\s{2,}| ORIGINAL| COMPUTE|$)/i
  ];
  for (const pattern of patterns) {
    const candidate = clean(text.match(pattern)?.[1]);
    if (candidate && candidate.length <= 90 && !/magazine|Amy Bienvenu|Claude|Anthropic|ChatGPT|OpenAI/i.test(candidate)) return candidate;
  }
  return "Author not named";
}

const entries = catalog
  .filter((entry) => (entry.tags || []).includes("gazette"))
  .filter((entry) => existsSync(join(sourceRoot, `${entry.id}.alexis`)))
  .map((entry) => {
    const source = sourceFor(entry.id);
    if (!/COMPUTE!'s Gazette/i.test(`${entry.detail || ""} ${head(source)}`)) throw new Error(`${entry.id}: Gazette provenance is not stated`);
    return { ...entry, source, title: titleFor(entry), author: authorFor(entry, source), date: publicationDate(entry, source) };
  })
  .sort((a, b) => a.date.year - b.date.year || a.date.month - b.date.month || a.title.localeCompare(b.title));

if (entries.length < 200) throw new Error(`unexpectedly small Gazette collection: ${entries.length}`);
if (!packageOnly) rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(rawRoot, { recursive: true });
rmSync(romRoot, { recursive: true, force: true });
mkdirSync(romRoot, { recursive: true });

if (!packageOnly) {
  const build = spawnSync(process.execPath, [
    join(root, "tools", "check-examples.mjs"), "--assemble", "--optimization", "aggressive",
    "--only", entries.map((entry) => entry.id).join(","), "--rom-dir", rawRoot,
    "--audit-json", join(outputRoot, "aggressive-build-audit.json")
  ], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  writeFileSync(join(outputRoot, "build.log"), `${build.stdout || ""}${build.stderr || ""}`, "utf8");
  if (build.status !== 0) throw new Error(`Gazette collection build failed: ${build.stdout || ""}${build.stderr || ""}`);
}

const width = Math.max(3, String(entries.length).length);
const manifest = entries.map((entry, index) => {
  const input = join(rawRoot, `${entry.id}.rom`);
  if (!existsSync(input)) throw new Error(`${entry.id}: ROM was not produced`);
  const number = String(index + 1).padStart(width, "0");
  const file = [number, entry.title, `by ${entry.author}`, "COMPUTE! Gazette", entry.date.display].map(safePart).join(" - ") + ".rom";
  const output = join(romRoot, file);
  copyFileSync(input, output);
  const bytes = readFileSync(output);
  return { number, id: entry.id, title: entry.title, author: entry.author, date: entry.date.display, bytes: bytes.length, file: basename(output), sha256: createHash("sha256").update(bytes).digest("hex") };
});

const table = manifest.map((item) => `${item.number}. ${item.title} - ${item.author} - COMPUTE!'s Gazette ${item.date} - ${item.bytes.toLocaleString("en-US")} bytes`).join("\r\n");
const readme = `AMY STUDIO COMPUTE!'S GAZETTE COLLECTION\r\n\r\n` +
  `This archive contains ${manifest.length} ColecoVision ROMs adapted from programs published in COMPUTE!'s Gazette. They are arranged in original publication order and rebuilt from the audited Amy Studio sources with the current bug-fixed compiler and Aggressive optimization.\r\n\r\n` +
  `The collection is a tribute to the programmers who shared their games through type-in listings and magazine disks. Their work became part of many childhood memories, taught readers how computers worked, and still deserves to be played and studied. Every filename identifies the program, credited author and publication date. When the surviving listing or article names no author, the entry says so instead of guessing.\r\n\r\n` +
  `These are modern ColecoVision adaptations, not recovered commercial prototypes. They preserve the original ideas and rules where practical while adding ColecoVision controls, graphics, sound and presentation. Amy Studio contains the complete source code and provenance notes.\r\n\r\n` +
  `Amy Studio: https://amypurple.github.io/AmyStudio/\r\n\r\nPROGRAMS\r\n\r\n${table}\r\n`;
writeFileSync(join(romRoot, "README.txt"), readme, "utf8");
writeFileSync(join(romRoot, "manifest.json"), `${JSON.stringify({ version: 1, generated: new Date().toISOString(), optimization: "aggressive", publication: "COMPUTE!'s Gazette", count: manifest.length, roms: manifest }, null, 2)}\n`, "utf8");
console.log(`COMPUTE!'s Gazette collection: ${manifest.length} Aggressive ROMs in ${romRoot}`);
