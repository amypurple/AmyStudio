import { buildMegaCartImage } from "./megaCartImage.js";
import { buildMegaCartLinkMap } from "./megaCartLinkMap.js";
import { projectFileBytes } from "./utils/projectFiles.js";

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

export async function buildMegaCartProject({ project, manifest, fixedBank, fixedSymbols = [], fixedSourceMap = null, compileAsm, compileAmyBank = null }) {
  if (manifest?.target?.platform !== "colecovision-megacart") return null;
  const sizeKb = Number(manifest.target.romSizeKb || project?.target?.romSizeKb || 128);
  const outputs = Array.isArray(manifest.outputs) ? manifest.outputs : [];
  const fixedOutputs = outputs.filter((output) => output.type === "fixed-bank");
  if (fixedOutputs.length !== 1) throw new Error("MegaCart project requires exactly one fixed-bank output.");
  const normalizedFixed = normalizedAssembly(fixedBank, 0x8000, 0xC000);
  const resolvedFixedSymbols = fixedSymbols.length ? fixedSymbols : normalizedFixed.symbols;
  const resolvedFixedSourceMap = fixedSourceMap || normalizedFixed.sourceMap;

  const switchableBanks = [];
  for (const output of outputs.filter((entry) => entry.type === "switchable-bank")) {
    const logicalBank = Number(output.bank);
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
    switchableBanks.push({ bank: logicalBank - 1, logicalBank, id: output.name || `bank ${logicalBank}`, bytes, symbols, sourceMap });
  }

  const built = buildMegaCartImage({ sizeKb, fixedBank: normalizedFixed.bytes, switchableBanks });
  const linkMap = buildMegaCartLinkMap({
    sizeKb,
    fixedBank: { bytes: normalizedFixed.bytes, symbols: resolvedFixedSymbols, sourceMap: resolvedFixedSourceMap },
    switchableBanks
  });
  return { ...built, linkMap };
}
