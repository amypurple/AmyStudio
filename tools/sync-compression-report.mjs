#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-ratios.json");
const representativesPath = path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-representatives.json");
const cyclesPath = path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-vram-cycles.json");
const targetArg = process.argv.find((value) => value.startsWith("--target="));
const documentPath = targetArg
  ? path.resolve(targetArg.slice("--target=".length))
  : path.join(root, "docs", "amy-five-tool-colecovision-comparison-2026-09-01.md");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const representatives = JSON.parse(fs.readFileSync(representativesPath, "utf8")).pictures;
const cycles = JSON.parse(fs.readFileSync(cyclesPath, "utf8"));

const aggregateRows = report.aggregate.map((row, index) =>
  `| ${index + 1} | ${row.codec} | ${row.totalBytes.toLocaleString("en-US")} | ${row.averageRatio.toFixed(2)}% | ${row.medianRatio.toFixed(2)}% | ${row.firstPlaces} | ${row.secondPlaces} | ${row.thirdPlaces} | ${row.fourthPlaces} | ${row.fifthPlaces} | ${row.sixthPlaces} |`
);
const representativeRows = representatives.map((row) =>
  `| ${row.role.replaceAll("-", " ")} | ${row.picture} | ${row.bestRatio.toFixed(2)}% |`
);
const replacement = [
  "### Graphics II bitmap compression corpus",
  "",
  `The corpus contains ${report.rows.length} unique pictures. Each is 12,288 RAW bytes (6,144 Pattern + 6,144 Color). All ${report.rows.length * (report.columns.length - 1)} measured codec streams round-trip exactly. Ratios exclude decoder code because one routine can serve many assets.`,
  "",
  "The place columns rank each picture by first-use ROM cost: payload plus one linked decoder. RAM requirements remain separate. UPKR uses Claude's independently validated 221-byte small VRAM decoder for this ranking; Amy compiler integration remains pending. An asterisk marks UPKR (about 322 aligned temporary RAM bytes) and Exomizer 2 (156 aligned temporary RAM bytes); the other ranked codecs do not require an equivalent large decode buffer.",
  "",
  "| Rank | Codec | Total bytes | Average ratio | Median ratio | 1st | 2nd | 3rd | 4th | 5th | 6th |",
  "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
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
const speedRows = cycles.ranking.map((row, index) =>
  `| ${index + 1} | ${row.codec}${row.codecId === "exomizer" ? "*" : ""} | ${row.decoderBytes} | ${row.averageCycles.toLocaleString("en-US")} | ${row.minCycles.toLocaleString("en-US")}-${row.maxCycles.toLocaleString("en-US")} | ${row.averageNtscFrames.toFixed(2)} | ${row.averagePalFrames.toFixed(2)} |`
);
const speedReplacement = [
  "| Rank | Codec | Decoder bytes | Average cycles | Observed range | NTSC frames | PAL frames |",
  "|---:|---|---:|---:|---:|---:|---:|",
  ...speedRows,
  "",
  "* Exomizer 2 needs 156 bytes of aligned temporary CPU RAM. UPKR is not mixed into this like-for-like three-picture ranking because it is not yet an Amy compiler/runtime option; Claude's separate 200-file harness measured its 221-byte small decoder at 1,656.4 T per output byte with about 322 aligned temporary RAM bytes.",
  "",
  "",
].join("\n");
const speedPattern = /\| Rank \| Codec \| Decoder bytes \| Average cycles \| Observed range \| NTSC frames \| PAL frames \|[\s\S]*?(?=Frame values are time equivalents)/;
let updated = source.replace(sectionPattern, replacement);
if (!speedPattern.test(updated)) throw new Error("Direct-to-VRAM speed table marker was not found");
updated = updated.replace(speedPattern, speedReplacement);
if (updated !== source) fs.writeFileSync(documentPath, updated);
console.log(path.relative(root, documentPath));
