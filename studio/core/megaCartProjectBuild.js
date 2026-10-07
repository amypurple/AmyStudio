import { buildMegaCartImage } from "./megaCartImage.js";
import { buildMegaCartLinkMap } from "./megaCartLinkMap.js";
import { projectFileBytes } from "./utils/projectFiles.js";
import { fingerprintBuildInputs } from "./incrementalBuildCache.js";

function normalizedPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^@project\//i, "");
}

function sourceDescriptor(source) {
  return typeof source === "string"
    ? { path: source, kind: /\.(?:asm|inc)$/i.test(source) ? "asm" : "asset" }
    : source || {};
}

function findProjectFile(project, path) {
  const wanted = normalizedPath(path).toLowerCase();
  return (project.projectFiles || []).find((entry) => normalizedPath(entry.path).toLowerCase() === wanted) || null;
}

function normalizedAssembly(result, logicalStart, logicalEnd) {
  const bytes = result instanceof Uint8Array
    ? result
    : result?.bytes || result?.binary;
  if (!(bytes instanceof Uint8Array)) throw new TypeError("MegaCart ASM compiler must return bytes or { bytes, symbols, sourceDebugMap }.");
  const symbols = Object.entries(result?.symbols || {})
    .filter(([, address]) => Number.isInteger(address) && address >= logicalStart && address < logicalEnd)
    .map(([name, address]) => ({ name, address }));
  return { bytes, symbols, sourceMap: result?.sourceDebugMap || result?.sourceMap || null };
}

export function projectFileContentFingerprint(entry) {
  return fingerprintBuildInputs(projectFileBytes(entry));
}

export function megaCartOutputFingerprint({ output, project, sizeKb, buildSignature = "" }) {
  const parts = [sizeKb, buildSignature, JSON.stringify({
    name: output.name || "",
    type: output.type || "",
    bank: Number(output.bank),
    exports: Array.isArray(output.exports) ? output.exports : [],
    sources: (output.sources || []).map((source) => sourceDescriptor(source))
  })];
  for (const rawSource of output.sources || []) {
    const source = sourceDescriptor(rawSource);
    const file = findProjectFile(project, source.path);
    parts.push(normalizedPath(source.path).toLowerCase(), source.kind || "");
    if (!file) {
      parts.push("missing");
      continue;
    }
    parts.push(projectFileBytes(file));
  }
  return fingerprintBuildInputs(...parts);
}

function outputCacheKey(output) {
  return `${Number(output.bank)}:${String(output.name || "").toLowerCase()}`;
}

export async function buildMegaCartProject({
  project,
  manifest,
  fixedBank,
  fixedSymbols = [],
  fixedSourceMap = null,
  compileAsm,
  compileAmyBank = null,
  compileFixed = null,
  incrementalCache = null,
  buildSignature = ""
}) {
  if (manifest?.target?.platform !== "colecovision-megacart") return null;
  const sizeKb = Number(manifest.target.romSizeKb || project?.target?.romSizeKb || 128);
  const outputs = Array.isArray(manifest.outputs) ? manifest.outputs : [];
  const fixedOutputs = outputs.filter((output) => output.type === "fixed-bank");
  if (fixedOutputs.length !== 1) throw new Error("MegaCart project requires exactly one fixed-bank output.");
  const switchableBanks = [];
  const rebuiltOutputs = [];
  const reusedOutputs = [];
  for (const output of outputs.filter((entry) => entry.type === "switchable-bank")) {
    const logicalBank = Number(output.bank);
    const cacheKey = outputCacheKey(output);
    const fingerprint = megaCartOutputFingerprint({ output, project, sizeKb, buildSignature });
    const cached = incrementalCache instanceof Map ? incrementalCache.get(cacheKey) : null;
    if (cached?.fingerprint === fingerprint) {
      switchableBanks.push(cached.bank);
      reusedOutputs.push(output.name || `bank ${logicalBank}`);
      continue;
    }
    const chunks = [];
    let symbols = [];
    let sourceMap = null;
    const asmParts = [];
    for (const rawSource of output.sources || []) {
      const source = sourceDescriptor(rawSource);
      const file = findProjectFile(project, source.path);
      if (!file) throw new Error(`MegaCart ${output.name} cannot find '${source.path}'.`);
      if (source.kind === "amy") {
        if (typeof compileAmyBank !== "function") {
          throw new Error(`MegaCart ${output.name} uses Amy source '${source.path}', but no bank-local Amy compiler is available.`);
        }
        asmParts.push(await compileAmyBank(new TextDecoder().decode(projectFileBytes(file)), source.path, {
          bank: logicalBank,
          outputName: output.name || `bank${logicalBank}`
        }));
      } else if (source.kind === "asm") asmParts.push(new TextDecoder().decode(projectFileBytes(file)));
      else chunks.push(projectFileBytes(file));
    }
    if (asmParts.length) {
      if (chunks.length) throw new Error(`MegaCart ${output.name} cannot mix ASM and binary assets in one output yet.`);
      const source = asmParts.join("\n");
      const assembled = normalizedAssembly(
        await compileAsm(source, `${output.name || `bank${logicalBank}`}.asm`),
        0xC000,
        0xFFC0
      );
      chunks.push(assembled.bytes);
      symbols = assembled.symbols;
      sourceMap = assembled.sourceMap;
    }
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const bank = {
      bank: logicalBank - 1,
      logicalBank,
      id: output.name || `bank ${logicalBank}`,
      bytes,
      symbols,
      exports: Array.isArray(output.exports) ? output.exports : [],
      sourceMap
    };
    switchableBanks.push(bank);
    rebuiltOutputs.push(output.name || `bank ${logicalBank}`);
    if (incrementalCache instanceof Map) incrementalCache.set(cacheKey, { fingerprint, bank });
  }

  const preliminaryLinkMap = buildMegaCartLinkMap({
    sizeKb,
    fixedBank: { bytes: new Uint8Array(0), symbols: [], sourceMap: null },
    switchableBanks
  });
  const resolvedFixedBank = typeof compileFixed === "function"
    ? await compileFixed({ linkMap: preliminaryLinkMap })
    : fixedBank;
  const normalizedFixed = normalizedAssembly(resolvedFixedBank, 0x8000, 0xC000);
  const resolvedFixedSymbols = fixedSymbols.length ? fixedSymbols : normalizedFixed.symbols;
  const resolvedFixedSourceMap = fixedSourceMap || normalizedFixed.sourceMap;

  const built = buildMegaCartImage({ sizeKb, fixedBank: normalizedFixed.bytes, switchableBanks });
  const linkMap = buildMegaCartLinkMap({
    sizeKb,
    fixedBank: { bytes: normalizedFixed.bytes, symbols: resolvedFixedSymbols, sourceMap: resolvedFixedSourceMap },
    switchableBanks
  });
  return {
    ...built,
    linkMap,
    incremental: {
      rebuiltOutputs: [fixedOutputs[0].name || "fixed", ...rebuiltOutputs],
      reusedOutputs,
      outputFingerprints: Object.fromEntries(outputs
        .filter((output) => output.type === "switchable-bank")
        .map((output) => [output.name || `bank ${Number(output.bank)}`, megaCartOutputFingerprint({
          output,
          project,
          sizeKb,
          buildSignature
        })]))
    }
  };
}
