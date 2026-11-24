#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-ratios.json");
const representativesPath = path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-representatives.json");
const targetArg = process.argv.find((value) => value.startsWith("--target="));
const documentPath = targetArg
  ? path.resolve(targetArg.slice("--target=".length))
  : path.join(root, "docs", "amy-five-tool-colecovision-comparison-2026-09-01.md");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const representatives = JSON.parse(fs.readFileSync(representativesPath, "utf8")).pictures;

const aggregateRows = report.aggregate.map((row, index) =>
  `| ${index + 1} | ${row.codec} | ${row.totalBytes.toLocaleString("en-US")} | ${row.averageRatio.toFixed(2)}% | ${row.medianRatio.toFixed(2)}% | ${row.firstPlaces} | ${row.secondPlaces} | ${row.thirdPlaces} | ${row.fourthPlaces} | ${row.fifthPlaces} |`
);
const representativeRows = representatives.map((row) =>
  `| ${row.role.replaceAll("-", " ")} | ${row.picture} | ${row.bestRatio.toFixed(2)}% |`
);
const replacement = [
  "### Graphics II bitmap compression corpus",
  "",
  `The corpus contains ${report.rows.length} unique pictures. Each is 12,288 RAW bytes (6,144 Pattern + 6,144 Color). All ${report.rows.length * (report.columns.length - 1)} measured codec streams round-trip exactly. Ratios exclude decoder code because one routine can serve many assets.`,
  "",
  "The place columns rank each picture by first-use ROM cost: payload plus one linked decoder. RAM requirements remain separate. UPKR uses Claude's independently validated 221-byte small VRAM decoder for this ranking; Amy compiler integration remains pending.",
  "",
  "| Rank | Codec | Total bytes | Average ratio | Median ratio | 1st | 2nd | 3rd | 4th | 5th |",
  "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...aggregateRows,
  "",
  "The three website representatives are selected mechanically from each picture's best payload ratio:",
  "",
  "| Role | Picture | Best ratio |",
  "|---|---|---:|",
  ...representativeRows,
  "",
  "The PDF shows every converted image. Complete per-picture ratios, decoder sizes, first-use totals, and exact source values are in `competition/benchmarks/compression/bitmap-codec-ratios.csv`, `bitmap-codec-aggregate.csv`, and `bitmap-codec-first-use.csv`.",
  "",
].join("\n");

const source = fs.readFileSync(documentPath, "utf8");
const sectionPattern = /### Graphics II bitmap compression (?:ratios|corpus)[\s\S]*?(?=### Observations supported by this suite)/;
if (!sectionPattern.test(source)) throw new Error("Compression report section marker was not found");
const updated = source.replace(sectionPattern, replacement);
if (updated !== source) fs.writeFileSync(documentPath, updated);
console.log(path.relative(root, documentPath));
