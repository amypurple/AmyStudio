#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { rgbaToColecoBitmapTables } from "../studio/core/pictureConvert.js";
import { compareTms9918Mode2Tables, repackTms9918Mode2, TMS9918_MODE2_REPACK_STRATEGIES } from "../studio/core/tms9918Mode2Repacker.js";
import { loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";

const sourcePath = resolve(process.argv[2] || "examples/ports/books/caverns/caverns-source.alexis");
const rgbaPath = resolve(process.argv[3] || "artifacts/caverns/caverns-title.rgba");
const outputDir = resolve(process.argv[4] || "examples/ports/books/caverns");
const outputSource = resolve(outputDir, "caverns.alexis");
const studioSource = resolve("studio/examples-src/caverns.alexis");
const studioAssets = resolve("studio/examples-caverns-assets.generated.js");

const rgba = new Uint8ClampedArray(readFileSync(rgbaPath));
if (rgba.length !== 256 * 192 * 4) throw new Error(`Expected 256x192 RGBA, got ${rgba.length} bytes.`);

const converted = rgbaToColecoBitmapTables(rgba, 256, 192, { ditherMode: "none", ditherAmount: 0 });
const zx0 = await loadCodec("zx0");
const candidates = [];
for (const strategy of TMS9918_MODE2_REPACK_STRATEGIES) {
  const repacked = repackTms9918Mode2(converted.pattern, converted.color, strategy.id);
  const visual = compareTms9918Mode2Tables(converted.pattern, converted.color, repacked.pattern, repacked.color);
  if (!visual.identical) throw new Error(`${strategy.id} changed ${visual.changedPixels} title pixels.`);
  const pattern = await zx0.compress(repacked.pattern);
  const color = await zx0.compress(repacked.color);
  candidates.push({ strategy, repacked, pattern, color, total: pattern.length + color.length });
}
candidates.sort((a, b) => a.total - b.total || a.strategy.id.localeCompare(b.strategy.id));
const best = candidates[0];

let source = readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
source = source.replace(
  /^cartridge\s+"[^"]+"/m,
  'project "In the Caverns of Carnage"\nmemory "colecovision_legacy_sdcc"'
);
source = source.replace(
  "\n  tile screen\n",
  `\npicture CavernsTitle:
  pattern from "@project/caverns-title.pattern.zx0" codec zx0
  color from "@project/caverns-title.color.zx0" codec zx0
end picture

  tile screen
`
);
source = source.replace("  screen on\n  EditorialPage\n", "  screen on\n");
source = source.replace(
  "sub StartCave:\n  nmi off\n  HideSprites\n  ClearBoth",
  `sub StartCave:
  nmi off
  HideSprites
  ' Restore the text charset after the full-screen Graphics II title.
  tile screen
  ClearBoth`
);
source = source.replace(
  "  RebuildBoth\n  StatusBoth\n  return\nend sub",
  "  RebuildBoth\n  StatusBoth\n  screen on\n  return\nend sub"
);
source = source.replace(
  `sub ShowStatus:
  print at 2,0, "SCORE"
  NumU = Score
  print at 8,0, digits$(NumU, 5)
  print at 14,0, "LIVES"
  NumU = Lives
  print at 20,0, digits$(NumU, 1)
  print at 22,0, "HI"
  NumU = HighScore
  print at 25,0, digits$(NumU, 5)`,
  `sub ShowStatus:
  ' Compact CRT-safe HUD: meaningful pixels stay inside columns 2-30.
  print at 2,0, "SC"
  NumU = Score
  print at 5,0, digits$(NumU, 5)
  print at 11,0, "LV"
  NumU = Lives
  print at 14,0, digits$(NumU, 1)
  print at 17,0, "HI"
  put char HighName[0] at 20,0
  put char HighName[1] at 21,0
  put char HighName[2] at 22,0
  NumU = HighScore
  print at 24,0, digits$(NumU, 5)`
);
source = source.replace("    PA[K] = 1\n    PB[K] = 30", "    PA[K] = 2\n    PB[K] = 29");
source = source.replace(
  "      PA[K] = R + 1\n      PB[K] = R + 3",
  "      PA[K] = R + 1\n      PB[K] = R + 3\n      if PB[K] > 29 then PB[K] = 29"
);

const titleStart = source.indexOf("sub TitlePage:");
const titleEnd = source.indexOf("end sub", titleStart);
if (titleStart < 0 || titleEnd < 0) throw new Error("TitlePage routine was not found.");
const titleRoutine = `sub TitlePage:
  nmi off
  HideSprites
  show picture CavernsTitle
  play sound SndTuneA
  play sound SndTuneB
  Rearm
  wait no fire
  pause until press
  Rearm
  wait no fire
  nmi off
  stop sound SndTuneA
  stop sound SndTuneB
  mute all
  return
end sub`;
source = `${source.slice(0, titleStart)}${titleRoutine}${source.slice(titleEnd + "end sub".length)}`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, "caverns-title.pattern.zx0"), best.pattern);
writeFileSync(resolve(outputDir, "caverns-title.color.zx0"), best.color);
writeFileSync(resolve(outputDir, "caverns-title.pattern.raw"), best.repacked.pattern);
writeFileSync(resolve(outputDir, "caverns-title.color.raw"), best.repacked.color);
writeFileSync(outputSource, source);
writeFileSync(studioSource, source);

const editors = `${JSON.stringify({
  version: 1,
  editors: [{
    name: "Caverns title",
    kind: "bitmap-screen",
    pattern: { from: "file", name: "caverns-title.pattern.raw" },
    color: { from: "file", name: "caverns-title.color.raw" },
    screenMode: "graphics2",
    notes: "Editable 256x192 title. The ROM uses the corresponding ZX0 files."
  }]
}, null, 2)}\n`;
writeFileSync(resolve(outputDir, "editors.json"), editors);

const files = [
  ["caverns-title.pattern.zx0", "binary", best.pattern],
  ["caverns-title.color.zx0", "binary", best.color],
  ["caverns-title.pattern.raw", "binary", best.repacked.pattern],
  ["caverns-title.color.raw", "binary", best.repacked.color],
  ["editors.json", "editor-config", Buffer.from(editors)]
].map(([path, kind, bytes]) => ({ path, kind, source: "example", base64: Buffer.from(bytes).toString("base64") }));
writeFileSync(studioAssets, `// Generated by tools/build-caverns-port.mjs.\nexport const cavernsProjectFiles = ${JSON.stringify(files)};\n`);

console.log(`Wrote ${outputSource}`);
console.log(`Title: pattern ${best.pattern.length}, color ${best.color.length}, total ${best.total} bytes (${best.strategy.label}, pixel-exact).`);
