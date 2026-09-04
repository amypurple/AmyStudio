import { decodeColecoSoundStream } from "./colecoSoundNotes.js";
import { decodeTinySoundSource } from "./colecoTinySound.js";

function stripComment(line) {
  return String(line || "").replace(/;.*/, "");
}

function parseNumber(token) {
  const text = String(token || "").trim();
  if (/^\$[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(1), 16);
  if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(2), 16);
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  return null;
}

function parseAddressExpression(expression) {
  const compact = String(expression || "").replace(/\s+/g, "");
  if (!/^[^+-]+(?:[+-][^+-]+)*$/.test(compact)) return null;
  const terms = compact.match(/[+-]?[^+-]+/g) || [];
  let value = 0;
  for (const term of terms) {
    const sign = term.startsWith("-") ? -1 : 1;
    const token = /^[+-]/.test(term) ? term.slice(1) : term;
    const number = parseNumber(token);
    if (number === null) return null;
    value += sign * number;
  }
  return value >= 0 && value <= 0xffff ? value : null;
}

function hex4(value) {
  return (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function parseDbBytes(line) {
  const match = stripComment(line).trim().match(/^(?:\.?db|defb)\s+(.+)$/i);
  if (!match) return null;
  const values = match[1].split(",").map((token) => parseNumber(token));
  return values.every((value) => Number.isInteger(value) && value >= 0 && value <= 255) ? values : null;
}

function decodeStreamAtLabel(lines, labelInfo) {
  const bytes = [];
  for (let cursor = labelInfo.line; cursor < lines.length; cursor += 1) {
    const clean = stripComment(lines[cursor]).trim();
    if (!clean) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(clean)) continue; // Shared-tail labels remain in the same byte stream.
    const row = parseDbBytes(lines[cursor]);
    if (!row) break;
    bytes.push(...row);
  }
  if (!bytes.length) return { status: "no-data", events: [], byteCount: 0 };
  try {
    const decoded = decodeColecoSoundStream(bytes);
    const kinds = Object.fromEntries([...new Set(decoded.events.map((event) => event.type))].sort().map((kind) =>
      [kind, decoded.events.filter((event) => event.type === kind).length]));
    return {
      status: decoded.terminated ? "valid" : "unterminated",
      events: decoded.events,
      eventCount: decoded.events.length,
      byteCount: decoded.consumed,
      terminal: decoded.events.at(-1)?.type || null,
      kinds
    };
  } catch (error) {
    return { status: "decode-error", events: [], byteCount: bytes.length, error: error.message };
  }
}

function decodeTinyAtLabel(source, label) {
  try {
    const tiny = decodeTinySoundSource(source, label);
    return {
      status: "valid",
      format: "tiny",
      events: tiny.commands,
      eventCount: tiny.commands.length,
      byteCount: tiny.bytes.length + 4,
      terminal: tiny.loop ? "loop" : "end",
      tiny
    };
  } catch {
    return null;
  }
}

export function inspectSoundTableSource(sourceText, { base = 0x702b, stride = 10 } = {}) {
  const source = String(sourceText || "");
  const lines = source.split(/\r?\n/);
  const labels = new Map();
  const tables = [];

  for (let index = 0; index < lines.length; index += 1) {
    const labelMatch = stripComment(lines[index]).trim().match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
    if (!labelMatch) continue;
    labels.set(labelMatch[1].toLowerCase(), { name: labelMatch[1], line: index + 1 });

    const entries = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const line = stripComment(lines[cursor]).trim();
      if (!line) {
        cursor += 1;
        continue;
      }
      const entryMatch = line.match(/^(?:\.?dw|defw)\s+([A-Za-z_][A-Za-z0-9_]*)\s*,\s*(.+?)\s*$/i);
      if (!entryMatch) break;
      const address = parseAddressExpression(entryMatch[2]);
      if (address === null) break;
      const delta = address - base;
      const area = delta >= 0 && delta % stride === 0 ? (delta / stride) + 1 : null;
      entries.push({
        index: entries.length + 1,
        label: entryMatch[1],
        address,
        area,
        priority: area,
        line: cursor + 1
      });
      cursor += 1;
    }

    // Requiring a valid Coleco sound-area address avoids misidentifying ordinary word tables.
    if (entries.length && entries.some((entry) => entry.area !== null)) {
      tables.push({ name: labelMatch[1], line: index + 1, entries });
    }
  }

  const diagnostics = [];
  for (const table of tables) {
    if (table.entries[0].address !== base) {
      diagnostics.push(`${table.name}: entry 1 should target $${hex4(base)}.`);
    }
    for (const entry of table.entries) {
      if (entry.area === null) diagnostics.push(`${table.name}: entry ${entry.index} uses unaligned area $${hex4(entry.address)}.`);
      if (!labels.has(entry.label.toLowerCase())) diagnostics.push(`${table.name}: missing sound label ${entry.label}.`);
      const labelInfo = labels.get(entry.label.toLowerCase());
      entry.stream = labelInfo ? (decodeTinyAtLabel(source, entry.label) || decodeStreamAtLabel(lines, labelInfo)) : null;
      if (entry.stream && entry.stream.status !== "valid") {
        diagnostics.push(`${table.name}: entry ${entry.index} ${entry.label} is ${entry.stream.status}${entry.stream.error ? ` (${entry.stream.error})` : ""}.`);
      }
    }
  }

  return {
    source,
    tables,
    diagnostics,
    // The inspector never regenerates expert ASM. This is deliberately byte-for-byte lossless.
    serialize: () => source
  };
}

export function decodeProjectTextFile(file) {
  if (typeof file?.text === "string") return file.text;
  if (typeof file?.base64 !== "string") return "";
  try {
    const binary = globalThis.atob(file.base64.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function inspectProjectSoundFile(file, bytes = null) {
  if (!/\.(?:asm|inc|s)$/i.test(String(file?.path || ""))) return null;
  const text = bytes
    ? new TextDecoder().decode(bytes)
    : decodeProjectTextFile(file);
  const analysis = inspectSoundTableSource(text);
  return analysis.tables.length ? analysis : null;
}
