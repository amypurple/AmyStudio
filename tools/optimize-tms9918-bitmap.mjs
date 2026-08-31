#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { CODEC_CONFIG, loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";
import { isTms9918CompressionCandidateEligible, optimizeTms9918BitmapControlled,
  optimizeTms9918BitmapLossless } from "../studio/core/tms9918BitmapOptimization.js";

const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const has = (name) => args.includes(name);
if (has("--help") || !option("--pattern") || !option("--color")) {
  console.log(`Usage:
  node tools/optimize-tms9918-bitmap.mjs --pattern FILE --color FILE [options]

Options:
  --input-codec raw|CODEC       Input encoding for both tables (default raw)
  --mode lossless|controlled    Controlled mode is explicitly lossy (default lossless)
  --codecs zx0,dan1,...|all     Codecs to compare (default zx0)
  --out DIRECTORY               Separate output directory (default: system temporary directory)
  --max-row-pixels N            Controlled: changed pixels per 8-pixel row (default 1)
  --max-color-distance N        Controlled: maximum RGB distance (default 48)
  --max-changed-pixels N        Controlled: global pixel budget
  --write                        Write candidates; never overwrite inputs
`);
  process.exit(has("--help") ? 0 : 2);
}

const patternPath = resolve(option("--pattern"));
const colorPath = resolve(option("--color"));
const inputCodecId = option("--input-codec", "raw").toLowerCase();
const mode = option("--mode", "lossless").toLowerCase();
if (!["lossless", "controlled"].includes(mode)) throw new Error(`Unknown mode ${mode}`);
const outDir = resolve(option("--out", join(tmpdir(), "tms9918-optimized")));
let pattern = new Uint8Array(readFileSync(patternPath));
let color = new Uint8Array(readFileSync(colorPath));
if (inputCodecId !== "raw") {
  const codec = await loadCodec(inputCodecId);
  if (!codec) throw new Error(`Cannot load input codec ${inputCodecId}`);
  [pattern, color] = await Promise.all([codec.decompress(pattern), codec.decompress(color)]);
}

const result = mode === "lossless"
  ? optimizeTms9918BitmapLossless(pattern, color)
  : optimizeTms9918BitmapControlled(pattern, color, {
      maxChangedPixelsPerRow: Number(option("--max-row-pixels", 1)),
      maxColorDistance: Number(option("--max-color-distance", 48)),
      maxChangedPixels: option("--max-changed-pixels") == null ? undefined : Number(option("--max-changed-pixels"))
    });
const codecArg = option("--codecs", "zx0").toLowerCase();
const codecIds = codecArg === "all"
  ? CODEC_CONFIG.settings.defaultCompressionOrder.filter((id) => CODEC_CONFIG.formats[id]?.enabled)
  : codecArg.split(",").map((id) => id.trim()).filter(Boolean);
const rows = [];
const outputs = [];
for (const id of codecIds) {
  const config = CODEC_CONFIG.formats[id];
  if (!config?.enabled) { rows.push({ codec: id, error: "unknown or disabled" }); continue; }
  const codec = await loadCodec(id, config);
  if (!codec) { rows.push({ codec: id, error: "load failed" }); continue; }
  try {
    const [beforePattern, beforeColor, afterPattern, afterColor] = await Promise.all([
      codec.compress(pattern), codec.compress(color), codec.compress(result.pattern), codec.compress(result.color)
    ]);
    const before = beforePattern.length + beforeColor.length;
    const after = afterPattern.length + afterColor.length;
    const roundTrip = await Promise.all([codec.decompress(afterPattern), codec.decompress(afterColor)]);
    const roundTripOk = Buffer.from(roundTrip[0]).equals(Buffer.from(result.pattern))
      && Buffer.from(roundTrip[1]).equals(Buffer.from(result.color));
    const eligible = isTms9918CompressionCandidateEligible({
      beforeBytes: before, afterBytes: after, roundTripOk,
      visualOk: mode === "lossless" ? result.visual.identical : true
    });
    rows.push({ codec: id, beforePattern: beforePattern.length, beforeColor: beforeColor.length, before,
      afterPattern: afterPattern.length, afterColor: afterColor.length, after, saved: before - after, roundTripOk, eligible });
    if (eligible) outputs.push({ id, extension: config.extensions[0], pattern: afterPattern, color: afterColor });
  } catch (error) {
    rows.push({ codec: id, error: error?.message || String(error) });
  }
}

const report = { version: 1, mode, source: { pattern: patternPath, color: colorPath, bytesPerTable: pattern.length },
  visual: result.visual, canonicalizedRows: result.canonicalizedRows ?? 0, acceptedRows: result.acceptedRows ?? 0,
  limits: result.options ?? null, codecs: rows };
console.table(rows);
console.log(`Visual changes: ${result.visual.changedPixels}/${result.visual.pixelCount} pixels; max RGB distance ${result.visual.maxColorDistance.toFixed(2)}`);
if (has("--write")) {
  mkdirSync(outDir, { recursive: true });
  const stem = basename(patternPath, extname(patternPath)).replace(/\.pattern$/i, "");
  if (outputs.length) {
    writeFileSync(join(outDir, `${stem}.${mode}.pattern.raw`), result.pattern);
    writeFileSync(join(outDir, `${stem}.${mode}.color.raw`), result.color);
  }
  for (const output of outputs) {
    writeFileSync(join(outDir, `${stem}.${mode}.pattern${output.extension}`), output.pattern);
    writeFileSync(join(outDir, `${stem}.${mode}.color${output.extension}`), output.color);
  }
  writeFileSync(join(outDir, `${stem}.${mode}.report.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.log(outputs.length ? `Improving candidates written to ${outDir}; source files were not modified.`
    : `No strictly smaller candidate; report written, source files were not modified.`);
}
