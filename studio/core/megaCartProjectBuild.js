import { buildMegaCartImage } from "./megaCartImage.js";
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

export async function buildMegaCartProject({ project, manifest, fixedBank, compileAsm }) {
  if (manifest?.target?.platform !== "colecovision-megacart") return null;
  const sizeKb = Number(manifest.target.romSizeKb || project?.target?.romSizeKb || 128);
  const outputs = Array.isArray(manifest.outputs) ? manifest.outputs : [];
  const fixedOutputs = outputs.filter((output) => output.type === "fixed-bank");
  if (fixedOutputs.length !== 1) throw new Error("MegaCart project requires exactly one fixed-bank output.");

  const switchableBanks = [];
  for (const output of outputs.filter((entry) => entry.type === "switchable-bank")) {
    const logicalBank = Number(output.bank);
    const chunks = [];
    const asmParts = [];
    for (const rawSource of output.sources || []) {
      const source = sourceDescriptor(rawSource);
      const file = findProjectFile(project, source.path);
      if (!file) throw new Error(`MegaCart ${output.name} cannot find '${source.path}'.`);
      if (source.kind === "amy") {
        throw new Error(`MegaCart ${output.name} uses Amy source '${source.path}'. Bank-local Amy linking is not available yet; use ASM or binary assets.`);
      }
      if (source.kind === "asm") asmParts.push(new TextDecoder().decode(projectFileBytes(file)));
      else chunks.push(projectFileBytes(file));
    }
    if (asmParts.length) {
      if (chunks.length) throw new Error(`MegaCart ${output.name} cannot mix ASM and binary assets in one output yet.`);
      const source = asmParts.join("\n");
      const assembled = await compileAsm(source, `${output.name || `bank${logicalBank}`}.asm`);
      chunks.push(assembled);
    }
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    switchableBanks.push({ bank: logicalBank - 1, bytes });
  }

  return buildMegaCartImage({ sizeKb, fixedBank, switchableBanks });
}
