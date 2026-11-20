import { buildFujiNetAppBankImage, FUJINET_APPBANK_PAGE_BYTES } from "./fujiNetImage.js";
import { projectFileBytes } from "./utils/projectFiles.js";

function normalizedPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^@project\//i, "");
}

function descriptor(source) {
  return typeof source === "string"
    ? { path: source, kind: /\.(?:asm|inc)$/i.test(source) ? "asm" : "asset" }
    : source || {};
}

function findFile(project, path) {
  const wanted = normalizedPath(path).toLowerCase();
  return (project.projectFiles || []).find((entry) => normalizedPath(entry.path).toLowerCase() === wanted) || null;
}

function bytesFor(file, context) {
  if (!file?.base64) throw new Error(`${context} has no embedded content.`);
  return projectFileBytes(file);
}

function assemblyBytes(result) {
  const bytes = result instanceof Uint8Array ? result : result?.bytes || result?.binary;
  if (!(bytes instanceof Uint8Array)) throw new TypeError("FujiNet APPBANK assembler must return bytes or { bytes }.");
  return bytes;
}

export async function buildFujiNetAppBankProject({
  project,
  manifest,
  windowProgram,
  compileAsm,
  compileAmyPage = null
}) {
  if (manifest?.target?.platform !== "colecovision-fujinet-appbank") return null;
  const outputs = Array.isArray(manifest.outputs) ? manifest.outputs : [];
  if (outputs.filter((output) => output.type === "appbank-window").length !== 1) {
    throw new Error("FujiNet APPBANK project requires exactly one appbank-window output.");
  }
  const pages = new Map();
  for (const output of outputs.filter((entry) => entry.type === "appbank-page")) {
    const page = Number(output.page);
    if (!Number.isInteger(page) || page < 1 || page > 11) throw new Error(`Invalid FujiNet APPBANK page ${output.page}.`);
    if (pages.has(page)) throw new Error(`Duplicate FujiNet APPBANK page ${page}.`);
    const chunks = [];
    const asm = [];
    for (const rawSource of output.sources || []) {
      const source = descriptor(rawSource);
      const file = findFile(project, source.path);
      if (!file) throw new Error(`FujiNet APPBANK ${output.name || `page ${page}`} cannot find '${source.path}'.`);
      const data = bytesFor(file, `FujiNet APPBANK source '${source.path}'`);
      if (source.kind === "amy") {
        if (typeof compileAmyPage !== "function") throw new Error("No bank-local Amy compiler is available.");
        asm.push(await compileAmyPage(new TextDecoder().decode(data), source.path, { page, outputName: output.name }));
      } else if (source.kind === "asm") asm.push(new TextDecoder().decode(data));
      else chunks.push(data);
    }
    if (asm.length) {
      if (chunks.length) throw new Error(`FujiNet APPBANK ${output.name || `page ${page}`} cannot mix assembled code and binary assets.`);
      chunks.push(assemblyBytes(await compileAsm(asm.join("\n"), `${output.name || `page${page}`}.asm`)));
    }
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (length > FUJINET_APPBANK_PAGE_BYTES) throw new Error(`FujiNet APPBANK page ${page} overflow: ${length} / ${FUJINET_APPBANK_PAGE_BYTES} bytes.`);
    const data = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
    pages.set(page, data);
  }
  const highest = pages.size ? Math.max(...pages.keys()) : 0;
  const ordered = [];
  for (let page = 1; page <= highest; ++page) ordered.push(pages.get(page) || new Uint8Array(0));
  const image = buildFujiNetAppBankImage(windowProgram, ordered);
  return { image, layout: { pageCount: highest + 1, pageBytes: FUJINET_APPBANK_PAGE_BYTES, imageBytes: image.length } };
}
