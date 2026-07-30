export function nextGraphicsEntryName(entries, { prefix = "", activeName = "", fallback = "Tilemap" } = {}) {
  const basePrefix = String(prefix || String(activeName || "").replace(/\d+$/, "") || fallback).trim();
  if (!basePrefix) throw new Error("Missing graphics entry prefix.");
  const lowerPrefix = basePrefix.toLowerCase();
  const used = new Set((entries || []).map((name) => String(name).toLowerCase()));
  let max = 0;
  for (const name of entries || []) {
    const textName = String(name);
    if (!textName.toLowerCase().startsWith(lowerPrefix)) continue;
    const suffix = textName.slice(basePrefix.length);
    if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix));
  }
  for (let candidateIndex = max + 1; candidateIndex < max + 1000; candidateIndex += 1) {
    const candidate = basePrefix + candidateIndex;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  throw new Error("Cannot find a free graphics entry name for prefix " + basePrefix + ".");
}

export function validateNewGraphicsEntryName(name, entries = []) {
  const clean = String(name || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(clean)) throw new Error("Invalid graphics entry name " + clean + ".");
  if (entries.some((entry) => String(entry).toLowerCase() === clean.toLowerCase())) {
    throw new Error("Graphics entry " + clean + " already exists.");
  }
  return clean;
}

export function addGraphicsEntryToConfig(config, editorName, entryName) {
  if (!config || !Array.isArray(config.editors)) throw new Error("Missing graphics editor config.");
  const editor = config.editors.find((item) => item?.name === editorName);
  if (!editor) throw new Error("Cannot find graphics editor " + editorName + ".");
  if (!Array.isArray(editor.entries)) editor.entries = [];
  const clean = validateNewGraphicsEntryName(entryName, editor.entries);
  editor.entries.push(clean);
  return config;
}
