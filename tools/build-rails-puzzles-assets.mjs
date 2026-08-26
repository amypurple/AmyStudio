#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { trainTrackPuzzleProjectFiles } from "../studio/examples-train-track-assets.generated.js";
import { loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";

const root = resolve(import.meta.dirname, "..");
const logo = await readFile(resolve(root, "studio/generated-assets/rails-puzzles-logo.pattern.raw"));
if (logo.length !== 20 * 3 * 8) throw new Error(`Rails Puzzles logo must be 480 bytes, got ${logo.length}.`);

const zx0 = await loadCodec("zx0");
const patternEntry = trainTrackPuzzleProjectFiles.find((entry) => entry.path === "train-track.pattern.zx0");
const colorEntry = trainTrackPuzzleProjectFiles.find((entry) => entry.path === "train-track.color.zx0");
const pattern = await zx0.decompress(Buffer.from(patternEntry.base64, "base64"));
const color = await zx0.decompress(Buffer.from(colorEntry.base64, "base64"));
pattern.set(logo, 0);
color.fill(0xF0, 0, logo.length);
patternEntry.base64 = Buffer.from(await zx0.compress(pattern)).toString("base64");
colorEntry.base64 = Buffer.from(await zx0.compress(color)).toString("base64");

await writeFile(
  resolve(root, "studio/examples-train-track-assets.generated.js"),
  `// Generated Rails Puzzles assets.\nexport const trainTrackPuzzleProjectFiles = ${JSON.stringify(trainTrackPuzzleProjectFiles, null, 2)};\n`
);
console.log(`Rails Puzzles assets: pattern ${Buffer.from(patternEntry.base64, "base64").length}, color ${Buffer.from(colorEntry.base64, "base64").length} ZX0 bytes.`);
