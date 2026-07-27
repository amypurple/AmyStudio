export function isGraphicsEditorsProjectFile(entry) {
  const path = String(entry?.path || "").replace(/\\/g, "/").toLowerCase();
  return path === "editors.json" || path.endsWith("/editors.json") || path.endsWith(".editors.json");
}

function bytesToUtf8(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes || []));
}

function normalizePair(value, fallback, label, editorName) {
  const pair = Array.isArray(value) ? value : fallback;
  if (!Array.isArray(pair) || pair.length !== 2) {
    throw new Error(editorName + ": " + label + " must be a two-value array.");
  }
  const a = Number(pair[0]);
  const b = Number(pair[1]);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    throw new Error(editorName + ": " + label + " must contain non-negative integers.");
  }
  return [a, b];
}


function normalizeEditorRef(value, fallback = {}, label = "ref", editorName = "Editor") {
  if (value == null || value === "") {
    const from = String(fallback.from || "").trim().toLowerCase();
    const name = String(fallback.name || "").trim();
    return from && name ? { from, name } : null;
  }
  if (typeof value === "string") {
    const from = String(fallback.from || "file").trim().toLowerCase();
    const name = value.trim();
    return name ? { from, name } : null;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const from = String(value.from || fallback.from || "file").trim().toLowerCase();
    const name = String(value.name || value.path || value.asset || fallback.name || "").trim();
    if (!from || !name) throw new Error(editorName + ": " + label + " must include { from, name }.");
    if (!["inline", "file", "asset"].includes(from)) throw new Error(editorName + ": " + label + ".from must be inline, file, or asset.");
    return { ...value, from, name };
  }
  throw new Error(editorName + ": " + label + " must be a string or { from, name }.");
}
function normalizeEditor(editor, index) {
  if (!editor || typeof editor !== "object" || Array.isArray(editor)) {
    throw new Error("Editor " + (index + 1) + " must be an object.");
  }
  const name = String(editor.name || "Editor " + (index + 1)).trim();
  const kind = String(editor.kind || "").trim().toLowerCase();
  if (!kind) throw new Error(name + ": missing editor kind.");
  const canvas = normalizePair(editor.canvas, [32, 24], "canvas", name);
  const screenAt = normalizePair(editor.screenAt, [0, 0], "screenAt", name);
  const entries = Array.isArray(editor.entries) ? editor.entries.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
  const tilesetRef = normalizeEditorRef(editor.tilesetRef || editor.tileset || editor.tilesetFile, {
    from: editor.tilesetFile ? "file" : (editor.tileset ? "asset" : ""),
    name: editor.tilesetFile || editor.tileset || ""
  }, "tileset", name);
  const patternRef = normalizeEditorRef(editor.patternRef || editor.pattern || editor.patternFile || editor.tilesetFile, {
    from: editor.patternFile || editor.tilesetFile ? "file" : "",
    name: editor.patternFile || editor.tilesetFile || ""
  }, "pattern", name);
  const colorRef = normalizeEditorRef(editor.colorRef || editor.color || editor.colorFile || editor.colorAsset, {
    from: editor.colorFile ? "file" : (editor.colorAsset ? "asset" : ""),
    name: editor.colorFile || editor.colorAsset || ""
  }, "color", name);
  return {
    ...editor,
    name,
    kind,
    canvas,
    screenAt,
    entries,
    tilesetRef,
    patternRef,
    colorRef,
    blankTile: Number.isInteger(Number(editor.blankTile)) ? Number(editor.blankTile) : 0
  };
}

export function parseGraphicsEditorsConfig(entry, bytes) {
  if (!isGraphicsEditorsProjectFile(entry)) return null;
  const text = bytesToUtf8(bytes);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error((entry?.path || "editors.json") + ": invalid JSON (" + error.message + ").");
  }
  const editors = Array.isArray(parsed?.editors) ? parsed.editors.map(normalizeEditor) : [];
  if (!editors.length) {
    throw new Error((entry?.path || "editors.json") + ": no editors defined.");
  }
  return { ...parsed, editors };
}

export function describeGraphicsEditor(editor) {
  const size = Array.isArray(editor?.canvas) ? editor.canvas[0] + "x" + editor.canvas[1] : "unknown size";
  const placement = Array.isArray(editor?.screenAt) ? "screen " + editor.screenAt[0] + "," + editor.screenAt[1] : "screen 0,0";
  const entries = Array.isArray(editor?.entries) && editor.entries.length ? editor.entries.length + " entr" + (editor.entries.length === 1 ? "y" : "ies") : "no entries";
  return (editor?.kind || "editor") + " · " + size + " · " + placement + " · " + entries;
}


function parseNumericByteToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  let value;
  if (/^\$[0-9a-f]+$/i.test(raw)) value = parseInt(raw.slice(1), 16);
  else if (/^0x[0-9a-f]+$/i.test(raw)) value = parseInt(raw.slice(2), 16);
  else if (/^[0-9]+$/.test(raw)) value = parseInt(raw, 10);
  else return null;
  if (!Number.isInteger(value) || value < 0 || value > 255) return null;
  return value;
}

function parseRepeatCountToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  let value;
  if (/^\$[0-9a-f]+$/i.test(raw)) value = parseInt(raw.slice(1), 16);
  else if (/^0x[0-9a-f]+$/i.test(raw)) value = parseInt(raw.slice(2), 16);
  else if (/^[0-9]+$/.test(raw)) value = parseInt(raw, 10);
  else return null;
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

function stripAmyComment(line) {
  return String(line || "").replace(/'.*$/, "");
}

function parseByteDataBody(body, name) {
  const bytes = [];
  const tokens = String(body || "")
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  for (let i = 0; i < tokens.length; i += 1) {
    const value = parseNumericByteToken(tokens[i]);
    if (value == null) {
      throw new Error(name + ": unsupported byte token '" + tokens[i] + "'.");
    }
    if (/^count$/i.test(tokens[i + 1] || "")) {
      const count = parseRepeatCountToken(tokens[i + 2]);
      if (count == null) throw new Error(name + ": invalid count after '" + tokens[i] + "'.");
      for (let j = 0; j < count; j += 1) bytes.push(value);
      i += 2;
    } else {
      bytes.push(value);
    }
  }
  return bytes;
}

function spriteBitmapCharToBit(ch) {
  return ch === "0" || ch === "_" || ch === " " || ch === "." ? 0 : 1;
}

function parseBitmap8DataBody(body, name) {
  const bytes = [];
  const lines = String(body || "").split(/\r?\n/);
  for (const rawLine of lines) {
    const match = String(rawLine || "").trim().match(/^(?:bitmap\s+)?"([^"]+)"$/i);
    if (!match) {
      if (String(rawLine || "").trim()) throw new Error(name + ": unsupported bitmap8 row '" + rawLine.trim() + "'.");
      continue;
    }
    const rowText = match[1];
    if (rowText.length !== 8) throw new Error(name + ": bitmap8 rows must be 8 pixels.");
    let value = 0;
    for (let index = 0; index < 8; index += 1) {
      if (spriteBitmapCharToBit(rowText[index])) value |= 0x80 >> index;
    }
    bytes.push(value);
  }
  if (!bytes.length || (bytes.length % 8) !== 0) {
    throw new Error(name + ": bitmap8 data must contain 8 rows per tile.");
  }
  return bytes;
}

function parseSprite16DataBody(body, name) {
  const leftRows = [];
  const rightRows = [];
  const lines = String(body || "").split(/\r?\n/);
  for (const rawLine of lines) {
    const match = String(rawLine || "").trim().match(/^(?:bitmap\s+)?"([^"]+)"$/i);
    if (!match) {
      if (String(rawLine || "").trim()) throw new Error(name + ": unsupported sprite16 row '" + rawLine.trim() + "'.");
      continue;
    }
    const rowText = match[1];
    if (rowText.length !== 16) throw new Error(name + ": sprite16 rows must be 16 pixels.");
    let left = 0;
    let right = 0;
    for (let index = 0; index < 8; index += 1) {
      if (spriteBitmapCharToBit(rowText[index])) left |= 0x80 >> index;
      if (spriteBitmapCharToBit(rowText[index + 8])) right |= 0x80 >> index;
    }
    leftRows.push(left);
    rightRows.push(right);
  }
  if (!leftRows.length || (leftRows.length % 16) !== 0) {
    throw new Error(name + ": sprite16 data must contain 16 rows per sprite.");
  }
  const bytes = [];
  for (let index = 0; index < leftRows.length; index += 16) {
    bytes.push(...leftRows.slice(index, index + 16));
    bytes.push(...rightRows.slice(index, index + 16));
  }
  return bytes;
}

function formatAmyBitmap8Rows(bytes) {
  const out = [];
  const source = Uint8Array.from(bytes || []);
  for (let offset = 0; offset < source.length; offset += 8) {
    const chunk = source.slice(offset, offset + 8);
    if (chunk.length < 8) break;
    for (let row = 0; row < 8; row += 1) {
      const value = chunk[row] || 0;
      let text = "";
      for (let bit = 0; bit < 8; bit += 1) text += (value & (0x80 >> bit)) ? "X" : ".";
      out.push('  "' + text + '"');
    }
  }
  return out;
}

function formatAmySprite16Rows(bytes) {
  const out = [];
  const source = Uint8Array.from(bytes || []);
  for (let offset = 0; offset < source.length; offset += 32) {
    const chunk = source.slice(offset, offset + 32);
    if (chunk.length < 32) break;
    for (let row = 0; row < 16; row += 1) {
      const left = chunk[row] || 0;
      const right = chunk[16 + row] || 0;
      let text = "";
      for (let bit = 0; bit < 8; bit += 1) text += (left & (0x80 >> bit)) ? "X" : ".";
      for (let bit = 0; bit < 8; bit += 1) text += (right & (0x80 >> bit)) ? "X" : ".";
      out.push('  "' + text + '"');
    }
  }
  return out;
}

export function parseAmyByteDataBlocks(sourceText, requestedNames = null) {
  const wanted = requestedNames ? new Set(requestedNames.map((name) => String(name || "").toLowerCase())) : null;
  const blocks = new Map();
  const lines = String(sourceText || "").split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const clean = stripAmyComment(line);
    if (!current) {
      const match = /^\s*data\s+([A-Za-z_][A-Za-z0-9_]*)\s+(bytes|bitmap8|sprite16)\b/i.exec(clean);
      if (!match) continue;
      const name = match[1];
      current = { name, layout: String(match[2] || "bytes").toLowerCase(), lines: [] };
      continue;
    }
    if (/^\s*end\s+data\b/i.test(clean)) {
      if (!wanted || wanted.has(current.name.toLowerCase())) {
        blocks.set(current.name, current.layout === "sprite16"
          ? parseSprite16DataBody(current.lines.join("\n"), current.name)
          : current.layout === "bitmap8"
            ? parseBitmap8DataBody(current.lines.join("\n"), current.name)
            : parseByteDataBody(current.lines.join("\n"), current.name));
      }
      current = null;
    } else {
      current.lines.push(clean);
    }
  }
  return blocks;
}


function formatAmyByteRows(bytes, rowWidth = 16) {
  const width = Math.max(1, Number.isInteger(rowWidth) ? rowWidth : 16);
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += width) {
    const chunk = Array.from(bytes.slice(offset, offset + width), (value) => "$" + (value & 0xFF).toString(16).toUpperCase().padStart(2, "0"));
    rows.push("  " + chunk.join(","));
  }
  return rows;
}

function escapeRegExpLiteral(text) {
  return String(text || "").replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function replaceAmyByteDataBlock(sourceText, blockName, bytes, rowWidth = 16) {
  const name = String(blockName || "").trim();
  if (!name) throw new Error("Missing data block name.");
  const source = String(sourceText || "");
  const lines = source.split(/\r?\n/);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const headerRe = new RegExp("^\\s*data\\s+" + escapeRegExpLiteral(name) + "\\s+(bytes|bitmap8|sprite16)\\b", "i");
  let start = -1;
  let end = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (start < 0) {
      if (headerRe.test(stripAmyComment(lines[index]))) start = index;
    } else if (/^\s*end\s+data\b/i.test(stripAmyComment(lines[index]))) {
      end = index;
      break;
    }
  }
  if (start < 0 || end < 0) throw new Error("Cannot find data " + name + " bytes block.");
  const header = stripAmyComment(lines[start]);
  const isSprite16 = /\bsprite16\b/i.test(header);
  const isBitmap8 = /\bbitmap8\b/i.test(header);
  const sourceBytes = Uint8Array.from(bytes || []);
  const replacementRows = isSprite16
    ? formatAmySprite16Rows(sourceBytes)
    : isBitmap8
      ? formatAmyBitmap8Rows(sourceBytes)
      : formatAmyByteRows(sourceBytes, rowWidth);
  const replacement = [lines[start], ...replacementRows, lines[end]];
  return [...lines.slice(0, start), ...replacement, ...lines.slice(end + 1)].join(newline);
}


export function appendAmyByteDataBlock(sourceText, blockName, bytes, rowWidth = 16, options = {}) {
  const name = String(blockName || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error("Invalid data block name " + name + ".");
  const source = String(sourceText || "");
  const lines = source.split(/\r?\n/);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const headerRe = new RegExp("^\\s*data\\s+" + escapeRegExpLiteral(name) + "\\s+bytes\\b", "i");
  if (lines.some((line) => headerRe.test(stripAmyComment(line)))) throw new Error("Data block " + name + " already exists.");

  let insertAt = lines.length;
  const beforeWordTable = String(options.beforeWordTable || "").trim();
  if (beforeWordTable) {
    const tableRe = new RegExp("^\\s*data\\s+" + escapeRegExpLiteral(beforeWordTable) + "\\s+words\\b", "i");
    const tableIndex = lines.findIndex((line) => tableRe.test(stripAmyComment(line)));
    if (tableIndex < 0) throw new Error("Cannot find data " + beforeWordTable + " words table.");
    insertAt = tableIndex;
  } else {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (/^\s*end\s+data\b/i.test(stripAmyComment(lines[index]))) {
        insertAt = index + 1;
        break;
      }
    }
  }

  const blockLines = ["data " + name + " bytes", ...formatAmyByteRows(Uint8Array.from(bytes || []), rowWidth), "end data", ""];
  return [...lines.slice(0, insertAt), ...blockLines, ...lines.slice(insertAt)].join(newline);
}

export function appendAmyWordTableEntry(sourceText, tableName, entryName) {
  const table = String(tableName || "").trim();
  const entry = String(entryName || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error("Invalid word table name " + table + ".");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entry)) throw new Error("Invalid word table entry " + entry + ".");
  const source = String(sourceText || "");
  const lines = source.split(/\r?\n/);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const tableRe = new RegExp("^(\\s*data\\s+" + escapeRegExpLiteral(table) + "\\s+words\\s*=\\s*)(.*)$", "i");
  const entryRef = "@" + entry;
  for (let index = 0; index < lines.length; index += 1) {
    const clean = stripAmyComment(lines[index]);
    const match = tableRe.exec(clean);
    if (!match) continue;
    const existing = match[2].split(",").map((part) => part.trim()).filter(Boolean);
    if (existing.some((part) => part.replace(/^@/, "").toLowerCase() === entry.toLowerCase())) {
      throw new Error("Word table " + table + " already includes @" + entry + ".");
    }
    const commentMatch = /(\s*'.*)$/.exec(lines[index]);
    const comment = commentMatch ? commentMatch[1] : "";
    const body = existing.length ? existing.join(",") + "," + entryRef : entryRef;
    lines[index] = match[1] + body + comment;
    return lines.join(newline);
  }
  throw new Error("Cannot find inline data " + table + " words table.");
}
