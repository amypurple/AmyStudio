#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetArg = process.argv.find((value) => value.startsWith("--target="));
if (!targetArg) throw new Error("Usage: --target=<comparison.html> [--asset-prefix=./assets/comparison/corpus]");
const target = path.resolve(targetArg.slice("--target=".length));
const assetPrefix = process.argv.find((value) => value.startsWith("--asset-prefix="))?.slice("--asset-prefix=".length)
  || "./assets/comparison/corpus";
const authorAssetPrefix = process.argv.find((value) => value.startsWith("--author-asset-prefix="))?.slice("--author-asset-prefix=".length)
  || "./assets/comparison/authors";
const report = JSON.parse(fs.readFileSync(path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-ratios.json"), "utf8"));
const representatives = JSON.parse(fs.readFileSync(path.join(root, "competition", "benchmarks", "compression", "bitmap-codec-representatives.json"), "utf8")).pictures;
const streamCount = report.rows.length * (report.columns.length - 1);

function rankedCodecs(row) {
  const seen = new Set();
  return report.columns
    .filter((codec) => codec !== "raw")
    .map((codec) => ({ codec, label: report.names[codec], bytes: row.sizes[codec] }))
    .filter((entry) => {
      const key = entry.label;
      if (seen.has(key)) return false;
      seen.add(key);
      entry.label = key;
      return true;
    })
    .sort((a, b) => a.bytes - b.bytes || a.label.localeCompare(b.label));
}

function portraitFilename(id) {
  return { newcoleco: "newcoleco.jfif", mermaid: "mermaid.jpg", alekmaul: "alekmaul.png" }[id];
}

const aggregateRows = report.aggregate.map((row, index) =>
  `            <tr><td>${index + 1}</td><td>${escapeHtml(row.codec)}</td><td>${row.totalBytes.toLocaleString("en-US")}</td><td>${Number.isInteger(row.decoderBytes) ? row.decoderBytes : "n/a"}</td><td>${row.firstPlaces}</td><td>${row.secondPlaces}</td><td>${row.thirdPlaces}</td><td>${row.fourthPlaces}</td><td>${row.fifthPlaces}</td></tr>`
).join("\n");
const cards = representatives.map((row) => {
  const filename = path.basename(row.preview);
  const measured = report.rows.find((item) => item.id === row.id);
  const ranked = measured ? rankedCodecs(measured) : [];
  const topThree = ranked.slice(0, 3);
  const pletterIndex = ranked.findIndex((entry) => entry.label === "Pletter");
  const pletter = pletterIndex >= 3 ? `<br><strong>... ${pletterIndex + 1}. Pletter: ${ranked[pletterIndex].bytes.toLocaleString("en-US")} bytes</strong>` : "";
  const ranking = topThree.map((entry, index) => `${index + 1}. ${entry.label}: ${entry.bytes.toLocaleString("en-US")} bytes`).join("<br>") + pletter;
  const author = measured?.author
    ? `<span class="corpus-author"><span><small>Artwork by</small>${escapeHtml(measured.author)}</span><img src="${authorAssetPrefix}/${escapeHtml(portraitFilename(measured.portrait))}" alt="${escapeHtml(measured.author)}" /></span>`
    : "";
  return `          <figure><img src="${assetPrefix}/${filename}" alt="${escapeHtml(row.picture)} converted for the TMS9918" /><figcaption><strong>${escapeHtml(row.role.replaceAll("-", " "))}</strong><br>${escapeHtml(row.picture)}<br>${ranking}${author}</figcaption></figure>`;
}).join("\n");
const section = `      <section class="section">
        <p class="eyebrow">GRAPHICS II COMPRESSION CORPUS</p>
        <h2>${report.rows.length} pictures, ${report.columns.length - 1} codecs, ${streamCount} exact checks.</h2>
        <p>Every 12,288-byte Pattern + Color picture round-tripped exactly. Podiums rank first-use ROM bytes: payload plus one linked decoder. UPKR is payload-only and excluded from those places because it has no accepted stock-ColecoVision runtime decoder. Gallery cards show the three smallest payloads and Pletter's rank when it is outside the top three.</p>
        <div class="comparison-table-wrap"><table class="comparison-table">
          <thead>
            <tr><th rowspan="2">Rank</th><th rowspan="2">Codec</th><th rowspan="2">Payload total</th><th rowspan="2">Decoder</th><th colspan="5">First-use places (pictures)</th></tr>
            <tr><th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th></tr>
          </thead>
          <tbody>
${aggregateRows}
          </tbody>
        </table></div>
        <h3>Most, median, and least compressible</h3>
        <div class="visual-pair compression-corpus-samples">
${cards}
        </div>
        <p>Selection is mechanical. Exomizer uses a 226-byte ROM decoder plus 156 bytes of CPU RAM. Amy Studio reserves that workspace at a 256-byte boundary; its generated address varies and must not overlap other RAM. The detailed PDF contains all ${report.rows.length} converted images and per-picture evidence.</p>
      </section>`;

const source = fs.readFileSync(target, "utf8");
const sectionPattern = /      <section class="section">\s*<p class="eyebrow">GRAPHICS II COMPRESSION CORPUS<\/p>[\s\S]*?<\/section>/;
if (!sectionPattern.test(source)) throw new Error(`Compression section marker not found in ${target}`);
const updated = source.replace(sectionPattern, section);
if (updated !== source) fs.writeFileSync(target, updated);
console.log(target);

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
