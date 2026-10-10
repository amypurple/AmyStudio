#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decompressBytes } from "../studio/core/compression.js";
import { colecoBitmapTablesToImageData } from "../studio/core/pictureConvert.js";
import { loadCodec, CODEC_CONFIG } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";
import { fourTwentyOneProjectFiles, dacmanProjectFiles, dacman2ProjectFiles } from "../studio/examples-games-assets.js";
import { chateauDragonProjectFiles } from "../studio/examples-chateau-assets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "competition", "benchmarks", "compression");
const zx0Classic = path.join(root, "tools", "z88dk", "bin", "z88dk-zx0.exe");
const rawBytes = 6144 * 2;
const codecs = Object.keys(CODEC_CONFIG.formats);

const pictureMetadata = {
  "cake": { label: "Cake", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "commando": { label: "Commando", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "421-title": { label: "421 Title", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "dacman-title": { label: "Dacman Title", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "dacman-info": { label: "Dacman Information", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "dacman2-title": { label: "Dacman 2 Title", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "chateau-title": { label: "Le Chateau du Dragon", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "bank-bejeweled-title-public-pp": { label: "Bejeweled", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "bank-maze-maniac-pp": { label: "Maze Maniac", author: "Amy Bienvenu / NewColeco (contributor)", portrait: "newcoleco" },
  "bank-newcoleco-rom-file-edition": { label: "ROM File Edition", author: "Amy Bienvenu / NewColeco", portrait: "newcoleco" },
  "bank-robee-blaster-title": { label: "Robee Blaster Title", author: "Alek Maul / AlekMaul", portrait: "alekmaul" },
  "bank-benchmark-band-logo": { label: "Band Wagon Logo", author: "Vanja Utne / Mermaid", portrait: "mermaid" },
  "bank-benchmark-bat-character": { label: "Bat Character", author: "Vanja Utne / Mermaid", portrait: "mermaid" },
  "bank-benchmark-blue-portrait": { label: "Blue Portrait", author: "Vanja Utne / Mermaid", portrait: "mermaid" },
  "bank-benchmark-fantasy-camp": { label: "Fantasy Camp", author: "Vanja Utne / Mermaid", portrait: "mermaid" },
  "bank-benchmark-mermaid-portrait": { label: "Mermaid Portrait", author: "Vanja Utne / Mermaid", portrait: "mermaid" },
  "bank-benchmark-turban-character": { label: "Turban Character", author: "Vanja Utne / Mermaid", portrait: "mermaid" },
  "bank-benchmark-wizard-sketch": { label: "Mad Cow", author: "Vanja Utne / Mermaid", portrait: "mermaid" },
  "bank-benchmark-anime-portrait": { label: "Anime Portrait" },
  "bank-benchmark-feliz-navidad": { label: "Feliz Navidad" },
  "bank-benchmark-laser-squad": { label: "Laser Squad" },
  "bank-benchmark-reservoir-dogs": { label: "Reservoir Dogs" },
  "bank-benchmark-robot-quote": { label: "Robot Quote" },
  "bank-benchmark-space-soldier": { label: "Space Soldier" },
  "bank-f1spp": { label: "F1 SPP" },
  "bank-mona-lisa": { label: "Mona Lisa" },
  "bank-smurf-challenge": { label: "Smurf Challenge", author: "Jean-Philippe Meola / Youki" },
};

const filePictures = [
  { id: "cake", label: "Cake", origin: "Native Graphics II", codec: "zx0", pattern: "assets/compressed/old-devkit-10years/cake.pattern.zx0", color: "assets/compressed/old-devkit-10years/cake.color.zx0" },
  { id: "commando", label: "Commando", origin: "Native Graphics II", codec: "dan2", pattern: "assets/compressed/commando-title-pattern.dan2", color: "assets/compressed/commando-title-color.dan2" },
  { id: "warrior", label: "Warrior", origin: "ZX Spectrum conversion", codec: "zx0", pattern: "assets/compressed/warrior/pattern.zx0", color: "assets/compressed/warrior/color.zx0" },
  { id: "barbarian", label: "Barbarian", origin: "ZX Spectrum conversion", codec: "zx0", pattern: "assets/compressed/barbarian/pattern.zx0", color: "assets/compressed/barbarian/color.zx0" },
];

const projectPictures = [
  { id: "421-title", label: "421 title", origin: "Amy legacy game", files: fourTwentyOneProjectFiles, stem: "421-title" },
  { id: "dacman-title", label: "Dacman title", origin: "Amy legacy game", files: dacmanProjectFiles, stem: "dacman-title" },
  { id: "dacman-info", label: "Dacman info", origin: "Amy legacy game", files: dacmanProjectFiles, stem: "dacman-info" },
  { id: "dacman2-title", label: "Dacman 2 title", origin: "Amy Studio game", files: dacman2ProjectFiles, stem: "dacman2-title" },
  { id: "chateau-title", label: "Chateau title", origin: "Amy Studio game", files: chateauDragonProjectFiles, stem: "chateau-title" },
];

function bytes(entry) {
  return Buffer.from(entry.base64, "base64");
}

async function decodeProjectFile(files, name) {
  const entry = files.find((item) => item.path === name);
  if (!entry) throw new Error(`Missing project file ${name}`);
  return Buffer.from(await decompressBytes(entry.codec || path.extname(name).slice(1), bytes(entry)));
}

async function loadPictures() {
  const result = [];
  for (const picture of filePictures) {
    result.push({
      ...picture,
      pattern: Buffer.from(await decompressBytes(picture.codec, fs.readFileSync(path.join(root, picture.pattern)))),
      color: Buffer.from(await decompressBytes(picture.codec, fs.readFileSync(path.join(root, picture.color)))),
    });
  }
  for (const picture of projectPictures) {
    result.push({
      ...picture,
      pattern: await decodeProjectFile(picture.files, `${picture.stem}.pattern.zx0`),
      color: await decodeProjectFile(picture.files, `${picture.stem}.color.zx0`),
    });
  }
  const bankManifestPath = path.join(output, "image-bank", "manifest.json");
  if (fs.existsSync(bankManifestPath)) {
    const bank = JSON.parse(fs.readFileSync(bankManifestPath, "utf8"));
    for (const picture of bank.rows || []) {
      result.push({
        id: `bank-${picture.id}`,
        label: picture.picture,
        origin: "Converted image bank",
        pattern: fs.readFileSync(path.join(root, picture.pattern)),
        color: fs.readFileSync(path.join(root, picture.color)),
        preview: picture.preview
      });
    }
  }
  const unique = [];
  const hashes = new Set();
  for (const picture of result) {
    assert.equal(picture.pattern.length, 6144, `${picture.id} pattern is not a full Graphics II table`);
    assert.equal(picture.color.length, 6144, `${picture.id} color is not a full Graphics II table`);
    const rendered = colecoBitmapTablesToImageData({ pattern: picture.pattern, color: picture.color }).data;
    const hash = createHash("sha256").update(rendered).digest("hex");
    if (hashes.has(hash)) continue;
    hashes.add(hash);
    unique.push(picture);
  }
  return unique;
}

function classicSize(data, directory, name) {
  const source = path.join(directory, `${name}.raw`);
  const packed = path.join(directory, `${name}.zx0v1`);
  fs.writeFileSync(source, data);
  execFileSync(zx0Classic, ["-f", source, packed], { stdio: "ignore" });
  return fs.statSync(packed).size;
}

function ratio(size) {
  return Number((size * 100 / rawBytes).toFixed(2));
}

const pictures = await loadPictures();
const exportRawArg = process.argv.indexOf("--export-raw");
if (exportRawArg >= 0) {
  const exportRoot = path.resolve(process.argv[exportRawArg + 1] || "");
  assert.ok(exportRoot, "--export-raw requires an output directory");
  fs.mkdirSync(exportRoot, { recursive: true });
  for (const picture of pictures) {
    const directory = path.join(exportRoot, picture.id);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "pattern.bin"), picture.pattern);
    fs.writeFileSync(path.join(directory, "color.bin"), picture.color);
  }
  fs.writeFileSync(path.join(exportRoot, "manifest.json"), JSON.stringify(pictures.map(({ id, label, origin }) => ({ id, label, origin })), null, 2));
  console.log(`Exported ${pictures.length} unique Graphics II pictures to ${exportRoot}`);
  process.exit(0);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-bitmap-codecs-"));
const progressPath = path.join(output, "bitmap-codec-progress.json");
const reportOnly = process.argv.includes("--report-only");
const existingReportPath = path.join(output, "bitmap-codec-ratios.json");
const resumableRows = fs.existsSync(progressPath)
  ? JSON.parse(fs.readFileSync(progressPath, "utf8")).rows || []
  : fs.existsSync(existingReportPath)
    ? JSON.parse(fs.readFileSync(existingReportPath, "utf8")).rows || []
    : [];
const rows = reportOnly && fs.existsSync(existingReportPath)
  ? JSON.parse(fs.readFileSync(existingReportPath, "utf8")).rows || []
  : process.argv.includes("--resume")
    ? resumableRows.filter((row) => pictures.some((picture) => picture.id === row.id))
    : [];
try {
  for (const picture of reportOnly ? [] : pictures) {
    const resumed = rows.find((row) => row.id === picture.id);
    const missingCodecs = resumed ? codecs.filter((codecId) => !Number.isInteger(resumed.sizes?.[codecId])) : codecs;
    if (resumed && missingCodecs.length === 0) {
      console.log(`${picture.label}: resumed from verified checkpoint`);
      continue;
    }
    const sizes = resumed?.sizes || { raw: rawBytes };
    if (!Number.isInteger(sizes.zx0classic)) {
      sizes.zx0classic = classicSize(picture.pattern, temp, `${picture.id}-pattern`) + classicSize(picture.color, temp, `${picture.id}-color`);
    }
    for (const codecId of missingCodecs) {
      const startedAt = performance.now();
      process.stdout.write(`${picture.label}/${codecId} ... `);
      const codec = await loadCodec(codecId);
      const packedPattern = Buffer.from(await codec.compress(picture.pattern));
      const packedColor = Buffer.from(await codec.compress(picture.color));
      const decodedPattern = Buffer.from(await codec.decompress(packedPattern));
      const decodedColor = Buffer.from(await codec.decompress(packedColor));
      assert.deepEqual(decodedPattern, picture.pattern, `${picture.id}/${codecId} pattern round-trip`);
      assert.deepEqual(decodedColor, picture.color, `${picture.id}/${codecId} color round-trip`);
      sizes[codecId] = packedPattern.length + packedColor.length;
      console.log(`${sizes[codecId]} bytes, ${Math.round(performance.now() - startedAt)} ms`);
    }
    const row = { id: picture.id, picture: picture.label, origin: picture.origin, sizes, ratios: Object.fromEntries(Object.entries(sizes).map(([id, size]) => [id, ratio(size)])) };
    if (resumed) Object.assign(resumed, row);
    else rows.push(row);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(progressPath, JSON.stringify({ rows }, null, 2));
    console.log(`${picture.label}: ${codecs.length + 1} codecs verified`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

rows.sort((left, right) => pictures.findIndex((picture) => picture.id === left.id) - pictures.findIndex((picture) => picture.id === right.id));
for (const row of rows) {
  const metadata = pictureMetadata[row.id];
  if (!metadata) {
    delete row.author;
    delete row.portrait;
    continue;
  }
  row.picture = metadata.label;
  row.author = metadata.author;
  row.portrait = metadata.portrait;
}

const columns = ["raw", ...codecs];
const names = {
  raw: "RAW", zx0classic: "ZX0 v1", mdkrle: "MDK-RLE", nibble: "Nibble", lzf: "LZF",
  dan1: "DAN1", dan2: "DAN2", dan3: "DAN3", pletter: "Pletter", bitbuster12: "BitBuster",
  zx7: "ZX7", zx0: "ZX0", zx1: "ZX1", zx2: "ZX2", aplib: "aPLib Compact", megalz: "MegaLZ", exomizer: "Exomizer 2", msc1: "MSC1",
};
const decoderBytes = {
  zx0: 136, zx1: 127, zx2: 115, zx7: 136, aplib: 244, megalz: 162, pletter: 212,
  bitbuster12: 166, lzf: 117, dan1: 205, dan2: 212, dan3: 205,
  nibble: 115, mdkrle: 46, exomizer: 226, msc1: 68,
};

const measuredCodecs = codecs.filter((id) => id !== "zx0classic");
const aggregate = measuredCodecs.map((id) => {
  const ratios = rows.map((row) => row.ratios[id]).sort((left, right) => left - right);
  const places = [0, 0, 0, 0, 0];
  for (const row of rows) {
    const podium = [...measuredCodecs].sort((left, right) =>
      (row.sizes[left] + decoderBytes[left]) - (row.sizes[right] + decoderBytes[right]) || left.localeCompare(right)
    ).slice(0, 5);
    const place = podium.indexOf(id);
    if (place >= 0) places[place] += 1;
  }
  return {
    id,
    codec: names[id],
    totalBytes: rows.reduce((sum, row) => sum + row.sizes[id], 0),
    averageRatio: Number((ratios.reduce((sum, value) => sum + value, 0) / ratios.length).toFixed(2)),
    medianRatio: ratios.length % 2
      ? ratios[Math.floor(ratios.length / 2)]
      : Number(((ratios[ratios.length / 2 - 1] + ratios[ratios.length / 2]) / 2).toFixed(2)),
    firstPlaces: places[0],
    secondPlaces: places[1],
    thirdPlaces: places[2],
    fourthPlaces: places[3],
    fifthPlaces: places[4],
    decoderBytes: decoderBytes[id]
  };
}).sort((left, right) => left.totalBytes - right.totalBytes);

fs.mkdirSync(output, { recursive: true });
const csv = [
  ["Picture", "Origin", ...columns.flatMap((id) => [`${names[id]} bytes`, `${names[id]} ratio`])],
  ...rows.map((row) => [row.picture, row.origin, ...columns.flatMap((id) => [row.sizes[id], `${row.ratios[id].toFixed(2)}%`])]),
].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
fs.writeFileSync(path.join(output, "bitmap-codec-ratios.csv"), csv);
fs.writeFileSync(path.join(output, "bitmap-codec-ratios.json"), JSON.stringify({ rawBytes, columns, names, decoderBytes, aggregate, rows }, null, 2));
fs.writeFileSync(path.join(output, "bitmap-codec-aggregate.csv"), [
  ["Rank", "Codec", "Total bytes", "Average ratio", "Median ratio", "First-use 1st", "First-use 2nd", "First-use 3rd", "First-use 4th", "First-use 5th", "Decoder bytes"],
  ...aggregate.map((row, index) => [index + 1, row.codec, row.totalBytes, `${row.averageRatio.toFixed(2)}%`, `${row.medianRatio.toFixed(2)}%`, row.firstPlaces, row.secondPlaces, row.thirdPlaces, row.fourthPlaces, row.fifthPlaces, row.decoderBytes])
].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n");

const previewDir = path.join(output, "corpus-previews");
fs.mkdirSync(previewDir, { recursive: true });
for (const picture of pictures) {
  const previewPath = path.join(previewDir, `${picture.id}.png`);
  if (reportOnly && fs.existsSync(previewPath)) continue;
  const rgba = colecoBitmapTablesToImageData({ pattern: picture.pattern, color: picture.color }).data;
  const encoded = spawnSync("ffmpeg", [
    "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", "256x192", "-i", "pipe:0",
    "-frames:v", "1", "-y", previewPath
  ], { input: Buffer.from(rgba), encoding: null, maxBuffer: 1024 * 1024 });
  if (encoded.status !== 0) throw new Error(`ffmpeg PNG encode failed for ${picture.id}: ${String(encoded.stderr)}`);
}

const rankedPictures = [...rows].sort((left, right) => {
  const leftBest = Math.min(...codecs.map((id) => left.ratios[id]));
  const rightBest = Math.min(...codecs.map((id) => right.ratios[id]));
  return leftBest - rightBest;
});
const representativeRows = [rankedPictures[0], rankedPictures[Math.floor(rankedPictures.length / 2)], rankedPictures.at(-1)];
fs.writeFileSync(path.join(output, "bitmap-codec-representatives.json"), JSON.stringify({
  method: "minimum, median, and maximum of each picture's best compressed payload ratio",
  pictures: representativeRows.map((row, index) => ({
    role: ["most-compressible", "median", "least-compressible"][index],
    id: row.id,
    picture: row.picture,
    bestRatio: Math.min(...codecs.map((codec) => row.ratios[codec])),
    preview: `competition/benchmarks/compression/corpus-previews/${row.id}.png`
  }))
}, null, 2) + "\n");

const familyTables = [
  ["LZ-family ratios", ["zx0", "zx1", "zx2", "zx7", "aplib", "megalz", "exomizer", "msc1", "pletter", "bitbuster12", "lzf"]],
  ["DAN and RLE-family ratios", ["dan1", "dan2", "dan3", "nibble", "mdkrle"]],
];
const ratioTableName = (id) => names[id];
const markdown = [
  "### Graphics II bitmap compression ratios",
  "",
  `The corpus contains ${rows.length} unique pictures. Each picture is exactly ${rawBytes.toLocaleString("en-US")} RAW bytes (6,144 Pattern + 6,144 Color). Percentages are compressed payload / RAW payload; lower is better. Decoder code is excluded because it is linked once and may serve several assets. Every measured stream round-trips exactly; DAN3 uses its full-search best-size setting. One ZX0 column is shown; z88dk's v1 streams had the same payload lengths on this corpus but are not byte-compatible with Amy Studio's v2 streams.`,
  "",
  "### Aggregate codec ranking",
  "",
  "This ranking sums every compressed Pattern + Color payload in the corpus. Podium counts rank each picture by first-use ROM cost: payload plus one linked decoder. RAM requirements remain separate.",
  "",
  "| Rank | Codec | Total bytes | Average ratio | Median ratio | 1st | 2nd | 3rd | 4th | 5th |",
  "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...aggregate.map((row, index) => `| ${index + 1} | ${row.codec} | ${row.totalBytes.toLocaleString("en-US")} | ${row.averageRatio.toFixed(2)}% | ${row.medianRatio.toFixed(2)}% | ${row.firstPlaces} | ${row.secondPlaces} | ${row.thirdPlaces} | ${row.fourthPlaces} | ${row.fifthPlaces} |`),
  "",
];
for (const [title, ids] of familyTables) {
  markdown.push(`### ${title}`, "", `| Picture | ${ids.map(ratioTableName).join(" | ")} |`, `|---|${ids.map(() => "---:").join("|")}|`);
  for (const row of rows) markdown.push(`| ${row.picture} | ${ids.map((id) => `${row.ratios[id].toFixed(2)}%`).join(" | ")} |`);
  markdown.push("");
}
const representativePictures = ["commando", "warrior", "dacman-title"];
const firstUseCsv = [
  ["Codec", "Routine bytes", ...representativePictures.map((id) => `${rows.find((row) => row.id === id).picture} payload + routine`)],
  ...familyTables.flatMap(([, ids]) => ids).map((id) => [
    names[id],
    decoderBytes[id],
    ...representativePictures.map((pictureId) => rows.find((row) => row.id === pictureId).sizes[id] + decoderBytes[id]),
  ]),
].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
fs.writeFileSync(path.join(output, "bitmap-codec-first-use.csv"), firstUseCsv);
markdown.push(
  "### Amy direct-to-VRAM decompressor sizes",
  "",
  "These are assembled routine bytes, excluding compressed data and common program startup code. A routine is linked once and can decode any number of assets using that codec.",
  "",
  "| Codec | Routine bytes |",
  "|---|---:|",
  ...familyTables.flatMap(([, ids]) => ids).map((id) => `| ${names[id]} | ${decoderBytes[id]} |`),
  "",
  "### Representative first-use totals",
  "",
  "Each value is the complete compressed Pattern + Color payload plus one Amy direct-to-VRAM decompressor. It is not the full ROM size. Commando, Warrior, and Dacman title represent a difficult, middle, and highly compressible case in this corpus.",
  "",
);
for (const [title, ids] of familyTables) {
  markdown.push(`### ${title.replace("ratios", "first-use bytes")}`, "", `| Codec | ${representativePictures.map((id) => rows.find((row) => row.id === id).picture).join(" | ")} |`, `|---|${representativePictures.map(() => "---:").join("|")}|`);
  for (const id of ids) {
    markdown.push(`| ${names[id]} | ${representativePictures.map((pictureId) => rows.find((row) => row.id === pictureId).sizes[id] + decoderBytes[id]).join(" | ")} |`);
  }
  markdown.push("");
}
markdown.push("Amy Studio's aPLib Compact routine is 244 bytes under every optimization profile, replacing the previous 348-byte unrolled routine. It preserves IX and IY, writes directly to VRAM, and keeps the same stream format and compressed payloads. MDK-RLE remains the smallest decoder at 46 bytes, but its payloads are much larger on these pictures.", "");
markdown.push("The complete payload counts and ratios are preserved in `bitmap-codec-ratios.csv`; decoder and representative first-use totals are in `bitmap-codec-first-use.csv`.", "");
fs.writeFileSync(path.join(output, "bitmap-codec-ratios.md"), markdown.join("\n"));
fs.rmSync(progressPath, { force: true });
console.log(path.relative(root, path.join(output, "bitmap-codec-ratios.csv")));
