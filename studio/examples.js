import { loadExampleSource, loadExampleSources, loadExamplesIndex } from "./core/exampleSourceLoader.js";
import { projectFilesById } from "./examples-project-files.js?v=20260808-fly-swatter-editors";

// DATA-DRIVEN CATALOG. The ordered list + text metadata lives in
// studio/examples-src/index.json (loaded here); each Amy listing lives in its own
// studio/examples-src/<id>.alexis file; binary project-file assets are wired by id in
// studio/examples-project-files.js. No program listings are embedded in this module.
const exampleManifestData = await loadExamplesIndex();

// Legacy default-source seed still consumed by projectLifecycle / examples-preview.
export const exampleSources = { amy: "" };


export const exampleCategoryOrder = [
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

export const exampleEditorialTracks = {
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

function applyManualCanonSourceStyle(sourceText) {
  if (!sourceText) return sourceText;
  return sourceText
    .replace(/(^|\n)([ \t]*)graphics bitmap(?=\n|$)/g, "$1$2picture screen");
}

function removeRedundantEndSubAfterReturn(sourceText) {
  if (!sourceText) return sourceText;
  return sourceText
    .replace(/(^|\n)([ \t]*return[ \t]*)(?:\r?\n)[ \t]*end sub(?=\r?\n|$)/gi, "$1$2")
    .replace(/(^|\n)([ \t]*return\s+.+?)(?:\r?\n)[ \t]*end function(?=\r?\n|$)/gi, "$1$2");
}
const rawExampleCatalog = exampleManifestData.map((entry) => ({
  id: entry.id,
  label: entry.label,
  detail: entry.detail || "",
  projectName: entry.projectName || entry.id,
  sourceLang: entry.sourceLang || "amy",
  ...(entry.funFact ? { funFact: entry.funFact } : {}),
  ...(entry.selectedAsmLibs ? { selectedAsmLibs: entry.selectedAsmLibs } : {}),
  selectedLibs: [],
  selectedBundles: [],
  selectedCompression: [],
  selectedAssets: [],
  projectFiles: projectFilesById[entry.id] || [],
  sourceText: ""
}));

export const exampleCatalog = rawExampleCatalog.map((example) => {
  const editorialTrack = classifyEditorialTrack(example.id);
  const styledSourceText = editorialTrack === exampleEditorialTracks.MANUAL_CANON
    ? applyManualCanonSourceStyle(example.sourceText)
    : example.sourceText;
  const sourceText = removeRedundantEndSubAfterReturn(styledSourceText);
  return {
    ...example,
    projectFiles: example.projectFiles || (
      example.id === "brinquitos-game-demo"
        ? rawExampleCatalog.find((item) => item.id === "brinquitos-tiny-music-demo")?.projectFiles?.map((entry) => ({ ...entry })) || []
        : example.projectFiles
    ),
    editorialTrack,
    sourceText
  };
});

// Amy program listings live in standalone studio/examples-src/<id>.alexis files —
// each individually editable and compilable (see tools/amyc.mjs). The embedded
// source strings above are placeholders; the authoritative text is a file loaded
// by id. In the BROWSER nothing is preloaded: the example picker uses metadata
// only, and a single listing is fetched on demand when that example is opened
// (see loadExampleSourceById / app.js). In NODE tooling every source is needed,
// so the catalog is filled eagerly here.
const __IS_NODE = typeof process !== "undefined" && !!(process.versions && process.versions.node);
if (__IS_NODE) {
  const __exampleSources = await loadExampleSources(exampleCatalog.map((example) => example.id));
  for (const example of exampleCatalog) {
    const loaded = __exampleSources.get(example.id);
    if (typeof loaded === "string" && loaded.length) example.sourceText = loaded;
  }
}

// Fetch (and cache into the catalog entry) a single example's listing on demand.
export async function loadExampleSourceById(id) {
  const example = exampleCatalog.find((item) => item.id === id);
  if (!example) return null;
  if (typeof example.sourceText === "string" && example.sourceText.length) return example.sourceText;
  const text = await loadExampleSource(id);
  if (typeof text === "string") example.sourceText = text;
  return example.sourceText;
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

export const exampleManifest = exampleCatalog.map((example) => {
  const category = categorizeExample(example.id);
  const tags = collectExampleTags(example);
  return {
    id: example.id,
    label: example.label,
    detail: example.detail,
    projectName: example.projectName,
    sourceLang: example.sourceLang,
    editorialTrack: example.editorialTrack,
    category,
    tags
  };
});
