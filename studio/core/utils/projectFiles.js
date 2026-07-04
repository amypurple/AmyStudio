export const PROJECT_FILE_PREFIX = "@project/";

export function normalizeProjectFilePath(path) {
  const normalized = String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
  if (!normalized) return "";
  const bare = normalized.toLowerCase().startsWith(PROJECT_FILE_PREFIX)
    ? normalized.slice(PROJECT_FILE_PREFIX.length)
    : normalized;
  return `${PROJECT_FILE_PREFIX}${bare}`;
}

export function projectFileBytes(entry) {
  const base64 = typeof entry?.base64 === "string" ? entry.base64 : "";
  if (!base64) return new Uint8Array();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function assetNameFromProjectPath(path) {
  const base = normalizeProjectFilePath(path).slice(PROJECT_FILE_PREFIX.length).split("/").pop() || "Asset";
  const withoutCodec = base.replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster|nibble)$/i, "");
  const stem = /\.(pattern|pat|chr|color|col|clr|name|nam|pc|sprpat|sprcolor|sprattr)$/i.test(withoutCodec)
    ? withoutCodec
    : withoutCodec.replace(/\.[^.]+$/, "");
  const cleaned = stem.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Asset";
  const pascal = cleaned
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return pascal || "Asset";
}

export function fileKindFromPath(path) {
  const lower = normalizeProjectFilePath(path).toLowerCase();
  if (lower.endsWith(".dsound")) return "dsound";
  if (/\.(sprpat|sprcolor|sprattr)(?:\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster|nibble))?$/.test(lower)) return "sprite";
  if (/\.(pc|pattern|pat|chr|color|col|clr|name|nam)(?:\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster|nibble))?$/.test(lower)) return "picture";
  if (/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster|nibble)$/.test(lower)) return "compressed";
  if (/\.(bin|dat|raw)$/.test(lower)) return "binary";
  return "asset";
}

export function normalizeProjectFiles(files = []) {
  const seen = new Set();
  const normalized = [];
  for (const file of files) {
    const path = normalizeProjectFilePath(file?.path || "");
    const base64 = typeof file?.base64 === "string" ? file.base64 : "";
    if (!path || !base64 || seen.has(path.toLowerCase())) continue;
    seen.add(path.toLowerCase());
    normalized.push({
      path,
      base64,
      kind: typeof file?.kind === "string" ? file.kind : fileKindFromPath(path),
      source: typeof file?.source === "string" ? file.source : "imported",
      codec: typeof file?.codec === "string" ? file.codec.toLowerCase() : undefined,
      dsoundStep: Number.isFinite(file?.dsoundStep) ? Math.max(0, Math.min(255, Math.trunc(file.dsoundStep))) : undefined,
      dsoundAmpPercent: Number.isFinite(file?.dsoundAmpPercent) ? Math.max(0, Math.trunc(file.dsoundAmpPercent)) : undefined
    });
  }
  return normalized.sort((a, b) => a.path.localeCompare(b.path));
}
