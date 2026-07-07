import { assembleAmysCVAssembly } from "../vendor/amyscvassembly/compilerCore.js?v=20260707-async-example-index";
import { alexisLibrarySources } from "./alexisLibrarySources.generated.js";

const textEncoder = new TextEncoder();

function normalizeProjectPath(path) {
  return String(path || "").replace(/\\/g, "/");
}

function decodeProjectFileBytes(entry) {
  const base64 = typeof entry?.base64 === "string" ? entry.base64 : "";
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function embeddedProjectFileKeys(path) {
  const normalized = normalizeProjectPath(path).replace(/^\/+/, "");
  if (!normalized) return [];
  const bare = normalized.toLowerCase().startsWith("@project/")
    ? normalized.slice("@project/".length)
    : normalized;
  return [`@project/${bare}`, bare];
}

function buildEmbeddedProjectFileMap(projectFiles = []) {
  const files = new Map();
  for (const entry of projectFiles || []) {
    const bytes = decodeProjectFileBytes(entry);
    if (!bytes) continue;
    for (const key of embeddedProjectFileKeys(entry.path)) {
      files.set(key, bytes);
    }
  }
  return files;
}

function extractReferencedPaths(asmText) {
  const paths = new Set();
  const re = /^\s*(?:include|incbin)\s+"([^"]+)"/gim;
  let match;
  while ((match = re.exec(asmText))) paths.add(match[1].replace(/\\/g, "/"));
  return [...paths];
}

async function fetchProjectPath(path, embeddedProjectFiles = new Map()) {
  const normalizedPath = normalizeProjectPath(path);
  const embeddedProjectFile = embeddedProjectFiles.get(normalizedPath);
  if (embeddedProjectFile) return embeddedProjectFile;
  const embeddedAlexisSource = alexisLibrarySources[normalizedPath];
  if (typeof embeddedAlexisSource === "string") {
    return textEncoder.encode(embeddedAlexisSource);
  }
  const url = new URL(`../../${normalizedPath}`, import.meta.url);
  url.searchParams.set("v", Date.now().toString(36));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load ${normalizedPath}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchProjectText(path, embeddedProjectFiles = new Map()) {
  const bytes = await fetchProjectPath(path, embeddedProjectFiles);
  return new TextDecoder().decode(bytes);
}

function shortHash(bytes) {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export async function expandAsmIncludes(asmText, options = {}) {
  const embeddedProjectFiles = buildEmbeddedProjectFileMap(options.projectFiles || []);
  const seen = new Set();

  async function expandText(text, currentName = "<generated>") {
    const lines = text.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
      const includeMatch = line.match(/^\s*include\s+"([^"]+)"\s*$/i);
      if (!includeMatch) {
        out.push(line);
        continue;
      }
      const includePath = includeMatch[1].replace(/\\/g, "/");
      if (seen.has(includePath)) {
        out.push(`; --- include skipped (already expanded): ${includePath} ---`);
        continue;
      }
      seen.add(includePath);
      const includeBytes = await fetchProjectPath(includePath, embeddedProjectFiles);
      const includeText = new TextDecoder().decode(includeBytes);
      const includeHash = shortHash(includeBytes);
      out.push(`; --- begin include: ${includePath} (${includeBytes.length} bytes, hash ${includeHash}) ---`);
      out.push(await expandText(includeText, includePath));
      out.push(`; --- end include: ${includePath} ---`);
    }
    return out.join("\n");
  }

  return expandText(asmText);
}

export async function compileGeneratedAsm(asmText, mainFile = "main.asm", options = {}) {
  const embeddedProjectFiles = buildEmbeddedProjectFileMap(options.projectFiles || []);
  const files = {
    [mainFile]: textEncoder.encode(asmText)
  };

  const pending = [...extractReferencedPaths(asmText)];
  const seen = new Set(pending);
  while (pending.length) {
    const path = pending.pop();
    const bytes = await fetchProjectPath(path, embeddedProjectFiles);
    files[path] = bytes;
    const text = new TextDecoder().decode(bytes);
    for (const nested of extractReferencedPaths(text)) {
      if (files[nested] || seen.has(nested)) continue;
      seen.add(nested);
      pending.push(nested);
    }
  }

  const assembleOptions = {
    outputFilename: mainFile.replace(/\.(asm|z80|s)$/i, ".col"),
    outputMode: "binary",
    targetPlatform: options.targetPlatform || "raw"
  };

  const optimizerEnabled = options.optimizerEnabled ?? true;
  const optimizerConfig = options.optimizerConfig || null;
  let baseline = null;

  if (optimizerEnabled && options.measureOptimizerDelta !== false) {
    baseline = await assembleAmysCVAssembly(files, mainFile, {
      ...assembleOptions,
      optimizerEnabled: false
    });
  }

  const optimized = await assembleAmysCVAssembly(files, mainFile, {
    ...assembleOptions,
    optimizerEnabled,
    optimizerConfig
  });

  if (baseline?.ok && optimized?.ok) {
    const rawSize = baseline.binary?.length ?? 0;
    const optimizedSize = optimized.binary?.length ?? 0;
    optimized.baselineBinarySize = rawSize;
    optimized.netOptimizerDelta = rawSize - optimizedSize;
  }

  return optimized;
}
