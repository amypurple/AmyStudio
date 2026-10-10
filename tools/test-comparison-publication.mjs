import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;

function parseCsv(text) {
  const rows = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        cells.push(cell);
        cell = "";
      } else {
        cell += char;
      }
    }
    cells.push(cell);
    rows.push(cells);
  }
  const headers = rows.shift();
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
}

function display(value) {
  return Number(value).toLocaleString("en-US");
}

function requireText(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`${label} is missing: ${needle}`);
}

function rejectText(text, pattern, label) {
  if (pattern.test(text)) throw new Error(`${label} contains stale or unsupported claim: ${pattern}`);
}

const sizes = parseCsv(fs.readFileSync(path.join(root, "competition/benchmarks/occupied-sizes.csv"), "utf8"));
const tools = ["Amy", "Legacy devkit", "libcv", "PVColLib", "devkitSMS", "CVBasic", "z88dk", "ugBASIC"];
const labels = {
  Amy: "Amy Studio",
  "Legacy devkit": "NewColeco",
  libcv: "PkK's devkit",
};
const sampleLabels = {
  "Hello World": "Hello World",
  "Bitmap Picture": "Warrior bitmap",
  "Controller Visual": "Controller Visual",
  "Sprite Metasprite": "Sprite Metasprite",
  "State Update": "Gameplay State Update*",
  "Tile Animation": "Tile Animation",
};

const totals = new Map(tools.map((tool) => [tool, 0]));
for (const row of sizes) totals.set(row.Tool, totals.get(row.Tool) + Number(row.Occupied));
const expectedOrder = [...tools].sort((left, right) => totals.get(left) - totals.get(right));
if (expectedOrder.join("|") !== tools.join("|")) {
  throw new Error(`Tool columns are not ordered by six-sample total: ${expectedOrder.join(", ")}`);
}

const internalMarkdown = path.join(root, "docs/amy-five-tool-colecovision-comparison-2026-09-01.md");
const publicMarkdown = path.join(root, "docs/amy-eight-tool-colecovision-comparison.md");
const markdownPaths = [fs.existsSync(internalMarkdown) ? internalMarkdown : publicMarkdown];
if (publicRoot) {
  const externalMarkdown = path.join(publicRoot, "docs/amy-eight-tool-colecovision-comparison.md");
  if (!markdownPaths.includes(externalMarkdown)) markdownPaths.push(externalMarkdown);
}
for (const markdownPath of markdownPaths) {
  const markdown = fs.readFileSync(markdownPath, "utf8");
  for (const [sample, sampleLabel] of Object.entries(sampleLabels)) {
    const row = sizes.filter((entry) => entry.Sample === sample);
    requireText(markdown, `| ${sampleLabel} |`, markdownPath);
    for (const tool of tools) {
      const value = row.find((entry) => entry.Tool === tool)?.Occupied;
      requireText(markdown, display(value), `${markdownPath} ${sample}/${tool}`);
    }
  }
  for (const tool of tools) requireText(markdown, display(totals.get(tool)), `${markdownPath} total/${tool}`);
  rejectText(markdown, /\b1,?387\b|\b7,?917\b|NewColeco \/ SDCC 3\.8|unrelated seventh competitor/i, markdownPath);
}

const aggregate = parseCsv(fs.readFileSync(path.join(root, "competition/benchmarks/compression/bitmap-codec-aggregate.csv"), "utf8"));
if (aggregate.length !== 16) throw new Error(`Expected 16 measured codecs, found ${aggregate.length}`);

if (publicRoot) {
  const htmlPath = path.join(publicRoot, "comparison.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const tool of tools) requireText(html, `<th>${labels[tool] ?? tool}</th>`, `${htmlPath} heading/${tool}`);
  for (const row of sizes) requireText(html, display(row.Occupied), `${htmlPath} ${row.Sample}/${row.Tool}`);
  for (const tool of tools) requireText(html, display(totals.get(tool)), `${htmlPath} total/${tool}`);
  for (const codec of aggregate) {
    requireText(html, `<td>${codec.Codec}</td>`, `${htmlPath} codec/${codec.Codec}`);
    requireText(html, `<td>${display(codec["Total bytes"])}</td>`, `${htmlPath} codec total/${codec.Codec}`);
    requireText(html, `<td>${display(codec["Decoder bytes"])}</td>`, `${htmlPath} decoder/${codec.Codec}`);
  }
  rejectText(html, /all 48 ROMs[^.]*passed|\b1,?387\b|\b7,?917\b|ZX0 (?:Classic|Modern)|DAN3 Best/i, htmlPath);
  requireText(html, "all nine controller ROMs pass, including Pure ASM and ugBASIC", htmlPath);
}

console.log(`PASS comparison publication: ${sizes.length} ROM sizes, ${tools.length} totals, ${aggregate.length} codecs`);
