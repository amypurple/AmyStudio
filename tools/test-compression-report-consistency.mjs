#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCompressionCatalog } from "../studio/core/compression.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportCandidates = [
  path.join(root, "docs", "amy-five-tool-colecovision-comparison-2026-09-01.md"),
  path.join(root, "docs", "amy-seven-tool-colecovision-comparison.md"),
];
const reportPath = reportCandidates.find(candidate => fs.existsSync(candidate));
assert.ok(reportPath, "Comparison report is missing");
const ratioPath = path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-ratios.json");
const cyclePath = path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-vram-cycles.json");
const markdown = fs.readFileSync(reportPath, "utf8");
const ratios = JSON.parse(fs.readFileSync(ratioPath, "utf8"));
const cycles = JSON.parse(fs.readFileSync(cyclePath, "utf8"));
const codecs = getCompressionCatalog().filter(({ codecId }) => codecId !== "raw");

assert.equal(codecs.length, 18, "Update the documented active-codec count");
assert.equal(ratios.aggregate.length, codecs.length, "Compression corpus/catalog mismatch");
assert.equal(ratios.rows.length * codecs.length, 756, "Documented corpus result count is stale");
const runtimeCodecs = codecs.filter(({ codecId }) => codecId !== "upkr");
assert.equal(cycles.ranking.length, runtimeCodecs.length, "Cycle ranking/catalog mismatch");
assert.equal(cycles.rows.length, runtimeCodecs.length * 3, "Representative cycle suite must cover three pictures per runtime codec");
assert.ok(cycles.rows.every((row) => row.exactVram), "Cycle evidence contains a VRAM mismatch");

const confirmed = [...markdown.matchAll(/^\| Amy Studio \| ([^|]+) \| [^|]+ \|/gm)]
  .map((match) => match[1])
  .find((value) => value.includes("AMYZ")) ?? "";
for (const { name } of codecs) {
  const documented = /^DAN[123]$/.test(name)
    ? "DAN1/2/3"
    : name.replace(" 1.2", "").replace(" v0.5", "").replace("-ZX-Spectrum", "");
  assert.ok(confirmed.includes(documented), `Confirmed formats omits ${documented}`);
}

assert.match(markdown, /Eighteen measured codecs, including AMYZ and UPKR/);
assert.doesNotMatch(markdown, /Thirteen active codecs|Fourteen active codecs|Fifteen active codecs|All thirteen integrated/);
assert.doesNotMatch(markdown, /cycle suite pending|measure Coleco cycle cost|Z80 cycle measurements remain required/);
assert.doesNotMatch(markdown, /DAN3 Best|ZX0 modern/);
assert.equal(ratios.names.dan3, "DAN3");
assert.equal(ratios.names.zx0, "ZX0");
assert.ok(cycles.rows.every((row) => row.codec !== "DAN3 Best" && row.codec !== "ZX0 modern"));
assert.equal((markdown.match(/^### Graphics II bitmap compression corpus$/gm) ?? []).length, 1);
assert.equal((markdown.match(/^### Direct-to-VRAM speed ranking$/gm) ?? []).length, 1);

const attributedRows = ratios.rows.filter((row) => row.author);
assert.equal(attributedRows.length, 19, "Corpus author attribution count changed unexpectedly");
assert.ok(attributedRows.filter((row) => row.portrait).every((row) => ["newcoleco", "mermaid", "alekmaul"].includes(row.portrait)), "Unknown corpus portrait id");
assert.ok(fs.existsSync(path.join(root, "competition", "benchmarks", "compression", "authors", "newcoleco.jfif")), "NewColeco portrait is missing");
assert.ok(fs.existsSync(path.join(root, "competition", "benchmarks", "compression", "authors", "mermaid.jpg")), "Mermaid portrait is missing");
assert.ok(fs.existsSync(path.join(root, "competition", "benchmarks", "compression", "authors", "alekmaul.png")), "AlekMaul portrait is missing");
assert.equal(ratios.rows.find((row) => row.id === "bank-benchmark-wizard-sketch")?.picture, "Mad Cow");
assert.ok(ratios.rows.every((row) => !row.picture.startsWith("benchmark-") && !row.picture.endsWith(".pp")), "Technical corpus title leaked into the report");

console.log(`Compression report consistency PASS (${codecs.length} codecs, ${ratios.rows.length} pictures, ${cycles.rows.length} timed ROMs)`);
