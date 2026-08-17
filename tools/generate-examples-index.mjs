import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const examplesIndexPath = path.join(root, "studio", "examples-src", "index.json");
const outputPath = path.join(root, "studio", "examples-index.generated.js");
const checkOnly = process.argv.includes("--check");

const exampleCategoryOrder = [
  "Minimal",
  "Language",
  "Numeric",
  "CVBasic Ports",
  "Demos",
  "Music",
  "Selftests",
  "Algorithms",
  "Games"
];

const exampleEditorialTracks = {
  MANUAL_CANON: "manual-canon",
  LEGACY_COMPAT: "legacy-compat",
  CVBASIC_PORT: "cvbasic-port"
};

const legacyCompatExampleIds = new Set([
  "text-screen-demo",
  "amy-qbasic-flow-demo",
  "cvbasic-vpoke-demo",
  "cvbasic-data-array-demo",
  "commando-tiny-music-box",
  "amy-manual-loop-putchar-test",
  "snake-demo",
  "commando-music-box",
  "amy-feature-test",
  "insertion-sort-bars",
  "heap-sort-bars",
  "quick-sort-bars"
]);

function classifyEditorialTrack(id) {
  if (id.startsWith("cvbasic-") && id.endsWith("-port")) return exampleEditorialTracks.CVBASIC_PORT;
  if (legacyCompatExampleIds.has(id)) return exampleEditorialTracks.LEGACY_COMPAT;
  return exampleEditorialTracks.MANUAL_CANON;
}

function categorizeExample(id) {
  if (id.includes("minimal") || id === "text-screen-demo") return "Minimal";
  if (id.includes("qbasic") || id.includes("flow") || id.includes("v22")) return "Language";
  if (id.includes("numeric") || id.includes("math") || id.includes("compare-fixed") || id.includes("arithmetic") || id.includes("fixed-ufixed") || id.includes("fixed32") || id.includes("float")) return "Numeric";
  if (id.includes("cvbasic-") && id.includes("-port")) return "CVBasic Ports";
  if (id.includes("music") || id.includes("song") || id.includes("commando") || id === "portal-demo") return "Music";
  if (id.includes("selftest") || id.includes("-test")) return "Selftests";
  if (id.includes("sort")) return "Algorithms";
  if (id.includes("slideshow") || id.includes("picture") || id.includes("variables") || id.includes("snake") || id.includes("rebound") || id.includes("lottery") || id.includes("cvbasic") || id.includes("wipe") || id.includes("flag") || id.includes("mode3") || id.includes("forest") || id.includes("benchmark")) return "Demos";
  return "Games";
}

function collectExampleTags(example) {
  const tags = [example.sourceLang];
  if (example.id.includes("minimal")) tags.push("minimal");
  if (example.id.includes("numeric") || example.id.includes("math") || example.id.includes("fixed-ufixed") || example.id.includes("arithmetic") || example.id.includes("fixed32")) tags.push("numeric");
  if (example.id.includes("qbasic")) tags.push("qbasic");
  if (example.id.includes("v22")) tags.push("v2.2");
  if (example.id.includes("sprite")) tags.push("sprites");
  if (example.id.includes("collision")) tags.push("collision");
  if (example.id.includes("cvbasic")) tags.push("cvbasic");
  if (example.id.includes("-port")) tags.push("port");
  if (example.id.includes("sort")) tags.push("algorithms");
  if (example.id.includes("music") || example.id.includes("song")) tags.push("audio");
  if (example.id.includes("selftest") || example.id.includes("-test")) tags.push("selftest");
  if (example.editorialTrack === exampleEditorialTracks.MANUAL_CANON) tags.push("manual-canon");
  if (example.editorialTrack === exampleEditorialTracks.LEGACY_COMPAT) tags.push("legacy-compat");
  if (example.editorialTrack === exampleEditorialTracks.CVBASIC_PORT) tags.push("cvbasic-port");
  return [...new Set(tags)];
}

const index = JSON.parse(fs.readFileSync(examplesIndexPath, "utf8"));
const manifest = index.map((entry) => {
  const item = {
    id: entry.id,
    label: entry.label || entry.id,
    detail: entry.detail || "",
    projectName: entry.projectName || entry.id,
    sourceLang: entry.sourceLang || "amy",
    editorialTrack: entry.editorialTrack || classifyEditorialTrack(entry.id)
  };
  item.category = entry.category || categorizeExample(item.id);
  item.tags = entry.tags || collectExampleTags(item);
  return item;
});

const output = `// Generated lightweight examples directory. Do not add sourceText or projectFiles here.
` +
  `// Run: node tools/generate-examples-index.mjs
` +
  `export const exampleCategoryOrder = ${JSON.stringify(exampleCategoryOrder, null, 2)};

` +
  `export const exampleEditorialTracks = ${JSON.stringify(exampleEditorialTracks, null, 2)};

` +
  `export const exampleManifest = ${JSON.stringify(manifest, null, 2)};
`;

if (checkOnly) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== output) {
    console.error(`${path.relative(root, outputPath)} is stale. Run: node tools/generate-examples-index.mjs`);
    process.exit(1);
  }
  console.log(`${path.relative(root, outputPath)} is up to date with ${manifest.length} examples.`);
} else {
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${path.relative(root, outputPath)} with ${manifest.length} examples.`);
}
