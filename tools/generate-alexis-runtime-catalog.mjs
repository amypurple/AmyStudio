import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getSplitLibraryCatalog } from "../studio/core/libraryModules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const currentRuntimeModule = path.join(repoRoot, "studio", "core", "alexisRuntime.js");
const generatedCatalogModule = path.join(repoRoot, "studio", "core", "alexisRuntimeCatalog.generated.js");
const fallbackCatalogModule = path.join(repoRoot, "studio", "core", "alexisRuntimeCatalog.fallback.js");
const nonExtractableSymbols = new Set([]);

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

// Aliases map legacy vendor label names to canonical AMY_* names.
// Only needed when the vendor source file uses a different label.
// Symbols with canonical AMY_* labels in their own .asm files need no alias.
const symbolAliases = new Map([
  ["AMY_TINY_SOUND", ["sndtiny_1"]]
]);

function listSourceFiles(rootDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.(asm|s)$/i.test(entry.name)) out.push(full);
    }
  };
  walk(rootDir);
  return out;
}

function buildLabelIndex(files) {
  const index = new Map();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const match = trimmed.match(/^([A-Za-z_.$][A-Za-z0-9_.$]*):$/);
      if (!match) continue;
      const label = match[1];
      if (!index.has(label)) index.set(label, []);
      index.get(label).push({
        file,
        relPath: normalizePath(path.relative(repoRoot, file)),
        line: i
      });
    }
  }
  return index;
}

function chooseSourceLocation(symbol, entry, labelIndex) {
  if (nonExtractableSymbols.has(symbol)) return null;
  const aliases = [symbol, ...(symbolAliases.get(symbol) || [])];
  const candidates = [];
  for (const alias of aliases) {
    for (const candidate of labelIndex.get(alias) || []) {
      candidates.push({ ...candidate, alias });
    }
  }
  if (!candidates.length) return null;

  const hintedParts = normalizePath(entry.sourcePath)
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const splitCatalog = getSplitLibraryCatalog();
  const expandedHints = [];
  for (const hinted of hintedParts) {
    expandedHints.push(hinted);
    const modules = splitCatalog[hinted];
    if (modules) {
      for (const module of modules) expandedHints.push(normalizePath(module.path));
    }
  }
  const hintedBasenames = expandedHints.map((part) => path.basename(part).toLowerCase());

  for (const hinted of expandedHints) {
    const exact = candidates.find((candidate) => candidate.relPath === hinted);
    if (exact) return exact;
  }
  for (const base of hintedBasenames) {
    const byBase = candidates.find((candidate) => path.basename(candidate.relPath).toLowerCase() === base);
    if (byBase) return byBase;
  }
  return candidates[0];
}

function extractRoutineText(symbol, location, fileSymbolStarts) {
  if (!location) return null;
  if (path.extname(location.file).toLowerCase() !== ".asm") return null;
  const lines = fs.readFileSync(location.file, "utf8").split(/\r?\n/);
  const starts = fileSymbolStarts.get(location.relPath) || [];
  const current = starts.find((item) => item.symbol === symbol && item.line === location.line);
  if (!current) return null;
  const next = starts.find((item) => item.line > current.line);
  const endLine = next ? next.line : lines.length;
  return lines.slice(current.line, endLine).join("\n").trimEnd();
}

function buildFileSymbolStarts(catalog, labelIndex) {
  const perFile = new Map();
  for (const [symbol, entry] of Object.entries(catalog)) {
    const location = chooseSourceLocation(symbol, entry, labelIndex);
    if (!location) continue;
    if (!perFile.has(location.relPath)) perFile.set(location.relPath, []);
    perFile.get(location.relPath).push({ symbol, line: location.line });
  }
  for (const items of perFile.values()) {
    items.sort((a, b) => a.line - b.line);
  }
  return perFile;
}

function serializeCatalog(catalog) {
  return `export const alexisRuntimeCatalog = ${JSON.stringify(catalog, null, 2)};\n`;
}

async function loadCatalog() {
  const sourceModulePath = fs.existsSync(fallbackCatalogModule)
    ? fallbackCatalogModule
    : (fs.existsSync(generatedCatalogModule) ? generatedCatalogModule : currentRuntimeModule);
  const moduleUrl = pathToFileURL(sourceModulePath).href;
  const loaded = await import(moduleUrl);
  if (!loaded.alexisRuntimeCatalog) {
    throw new Error(`Module does not export alexisRuntimeCatalog: ${sourceModulePath}`);
  }
  return loaded.alexisRuntimeCatalog;
}

async function main() {
  const catalog = await loadCatalog();
  const sourceFiles = listSourceFiles(path.join(repoRoot, "src"));
  const labelIndex = buildLabelIndex(sourceFiles);
  const fileSymbolStarts = buildFileSymbolStarts(catalog, labelIndex);

  const nextCatalog = {};
  let extractedCount = 0;
  let fallbackCount = 0;

  for (const [symbol, entry] of Object.entries(catalog)) {
    const location = chooseSourceLocation(symbol, entry, labelIndex);
    const extractedAsm = extractRoutineText(symbol, location, fileSymbolStarts);
    nextCatalog[symbol] = {
      ...entry,
      asm: extractedAsm || entry.asm,
      extractedFromSource: Boolean(extractedAsm),
      extractedFromPath: extractedAsm && location ? location.relPath : null,
      extractedFromLabel: extractedAsm && location ? location.alias : null
    };
    if (extractedAsm) extractedCount++;
    else fallbackCount++;
  }

  const header = [
    "// Auto-generated by tools/generate-alexis-runtime-catalog.mjs",
    "// Source of truth is the ASM files when extraction is possible.",
    `// Extracted routines: ${extractedCount}`,
    `// Fallback hardcoded snippets: ${fallbackCount}`,
    ""
  ].join("\n");
  fs.writeFileSync(generatedCatalogModule, header + serializeCatalog(nextCatalog), "utf8");
  console.log(JSON.stringify({
    generated: normalizePath(path.relative(repoRoot, generatedCatalogModule)),
    extractedCount,
    fallbackCount
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
