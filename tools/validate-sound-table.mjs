#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE = 0x702b;
const DEFAULT_STRIDE = 0x000a;
const DEFAULT_MUSIC_AREAS = 4;

export function parseSoundTableAsm(sourceText, options = {}) {
  const tableLabel = options.table || "_snd_table";
  const lines = sourceText.split(/\r?\n/);
  const tableStart = lines.findIndex((line) => new RegExp(`^\\s*${escapeRegExp(tableLabel)}\\s*:`, "i").test(line));
  if (tableStart < 0) {
    throw new Error(`Cannot find sound table label: ${tableLabel}`);
  }

  const entries = [];
  for (let lineIndex = tableStart + 1; lineIndex < lines.length; lineIndex += 1) {
    const line = stripComment(lines[lineIndex]).trim();
    if (!line) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*\s*:/.test(line)) break;
    const match = line.match(/^(?:\.?dw|defw)\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+|[0-9]+)\s*,\s*(\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+|[0-9]+)/i);
    if (!match) break;
    entries.push({
      index: entries.length + 1,
      label: match[1],
      address: parseNumber(match[2]),
      line: lineIndex + 1
    });
  }

  return { tableLabel, entries };
}

export function parseMusicSoundReferences(sourceText, labels) {
  const lines = sourceText.split(/\r?\n/);
  const refsBySong = new Map();
  for (const label of labels) {
    const start = lines.findIndex((line) => new RegExp(`^\\s*${escapeRegExp(label)}\\s*:`, "i").test(line));
    if (start < 0) {
      refsBySong.set(label, { missing: true, refs: [] });
      continue;
    }
    const refs = [];
    for (let lineIndex = start + 1; lineIndex < lines.length; lineIndex += 1) {
      const line = stripComment(lines[lineIndex]).trim();
      if (!line) continue;
      if (/^[A-Za-z_][A-Za-z0-9_]*\s*:/.test(line)) break;
      const dbMatch = line.match(/^(?:\.?db|defb)\s+(.+)$/i);
      if (!dbMatch) continue;
      const bytes = splitAsmArgs(dbMatch[1])
        .map((token) => parseNumber(token))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 0xff);
      if (!bytes.length) continue;
      const first = bytes[0];
      const count = (((first << 2) | (first >> 6)) & 0x03) + 1;
      const eventRefs = [first & 0x3f, ...bytes.slice(1, count)].filter((value) => value > 0);
      refs.push(...eventRefs);
    }
    refsBySong.set(label, { missing: false, refs });
  }
  return refsBySong;
}

export function validateSoundTable(sourceText, options = {}) {
  const base = options.base ?? DEFAULT_BASE;
  const stride = options.stride ?? DEFAULT_STRIDE;
  const areaCount = options.areas ?? null;
  const musicAreas = options.musicAreas ?? Math.min(DEFAULT_MUSIC_AREAS, areaCount || DEFAULT_MUSIC_AREAS);
  const musicLabels = options.music || [];
  const sfxIndexes = options.sfx || [];
  const errors = [];
  const warnings = [];
  const { tableLabel, entries } = parseSoundTableAsm(sourceText, options);

  if (!entries.length) {
    errors.push(`Sound table '${tableLabel}' has no entries.`);
    return { ok: false, tableLabel, entries, errors, warnings, musicRefs: [] };
  }

  const first = entries[0];
  if (first.address !== base) {
    errors.push(`First sound table entry must target the lowest sound area $${hex4(base)}; entry 1 targets $${hex4(first.address)}.`);
  }
  const minAddress = Math.min(...entries.map((entry) => entry.address));
  if (first.address !== minAddress) {
    errors.push(`First sound table entry must be the lowest address used by the table; lowest is $${hex4(minAddress)}, entry 1 is $${hex4(first.address)}.`);
  }

  for (const entry of entries) {
    const delta = entry.address - base;
    if (delta < 0 || delta % stride !== 0) {
      errors.push(`Entry ${entry.index} (${entry.label}) targets non-aligned sound area address $${hex4(entry.address)}.`);
      continue;
    }
    entry.area = (delta / stride) + 1;
    if (areaCount && (entry.area < 1 || entry.area > areaCount)) {
      errors.push(`Entry ${entry.index} (${entry.label}) targets area ${entry.area}, outside declared areas 1..${areaCount}.`);
    }
  }

  const musicRefs = parseMusicSoundReferences(sourceText, musicLabels);
  for (const [label, info] of musicRefs) {
    if (info.missing) {
      errors.push(`Music label '${label}' was not found.`);
      continue;
    }
    for (const ref of new Set(info.refs)) {
      const entry = entries[ref - 1];
      if (!entry) {
        errors.push(`Music '${label}' references missing sound index ${ref}.`);
        continue;
      }
      if (entry.area > musicAreas) {
        errors.push(`Music '${label}' references sound index ${ref} in area ${entry.area}; current Amy music runtime owns areas 1..${musicAreas}.`);
      }
    }
  }

  const sfxMinArea = options.sfxMinArea ?? (areaCount && areaCount > musicAreas ? musicAreas + 1 : null);
  if (sfxMinArea) {
    for (const ref of sfxIndexes) {
      const entry = entries[ref - 1];
      if (!entry) {
        errors.push(`SFX list references missing sound index ${ref}.`);
        continue;
      }
      if (entry.area < sfxMinArea) {
        errors.push(`SFX sound index ${ref} uses area ${entry.area}; expected SFX area ${sfxMinArea}+ so music areas stay reserved.`);
      }
    }
  } else if (sfxIndexes.length) {
    warnings.push(`SFX separation was not enforced because declared area count (${areaCount ?? "unknown"}) leaves no area above music areas 1..${musicAreas}.`);
  }

  const areaSummary = summarizeAreas(entries);
  return {
    ok: errors.length === 0,
    tableLabel,
    areaCount,
    musicAreas,
    base,
    stride,
    entryCount: entries.length,
    firstEntry: { index: first.index, label: first.label, address: first.address, area: first.area },
    areaSummary,
    musicRefs: [...musicRefs.entries()].map(([label, info]) => ({
      label,
      missing: info.missing,
      refs: [...new Set(info.refs)].sort((a, b) => a - b)
    })),
    sfxIndexes,
    errors,
    warnings
  };
}

function summarizeAreas(entries) {
  const byArea = new Map();
  for (const entry of entries) {
    if (!Number.isInteger(entry.area)) continue;
    if (!byArea.has(entry.area)) byArea.set(entry.area, []);
    byArea.get(entry.area).push(entry.index);
  }
  return [...byArea.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([area, indexes]) => ({ area, indexes: summarizeRanges(indexes) }));
}

function summarizeRanges(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const ranges = [];
  for (let index = 0; index < sorted.length;) {
    let end = index;
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) end += 1;
    ranges.push(index === end ? String(sorted[index]) : `${sorted[index]}-${sorted[end]}`);
    index = end + 1;
  }
  return ranges.join(", ");
}

function splitAsmArgs(text) {
  return text.split(",").map((part) => part.trim()).filter(Boolean);
}

function parseNumber(token) {
  const trimmed = String(token).trim();
  if (/^\$[0-9A-Fa-f]+$/.test(trimmed)) return parseInt(trimmed.slice(1), 16);
  if (/^0x[0-9A-Fa-f]+$/i.test(trimmed)) return parseInt(trimmed.slice(2), 16);
  if (/^[0-9]+$/.test(trimmed)) return parseInt(trimmed, 10);
  return null;
}

function parseRangeList(text) {
  if (!text) return [];
  const values = [];
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let value = Math.min(start, end); value <= Math.max(start, end); value += 1) values.push(value);
      continue;
    }
    values.push(Number(trimmed));
  }
  return [...new Set(values)].filter(Number.isInteger).sort((a, b) => a - b);
}

function stripComment(line) {
  return line.replace(/;.*/, "");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hex4(value) {
  return (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function parseArgs(argv) {
  const args = {
    file: null,
    table: "_snd_table",
    areas: null,
    music: [],
    sfx: [],
    musicAreas: DEFAULT_MUSIC_AREAS,
    json: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file" || arg === "-f") args.file = argv[++index];
    else if (arg === "--table") args.table = argv[++index];
    else if (arg === "--areas") args.areas = Number(argv[++index]);
    else if (arg === "--music") args.music = argv[++index].split(",").map((item) => item.trim()).filter(Boolean);
    else if (arg === "--sfx") args.sfx = parseRangeList(argv[++index]);
    else if (arg === "--music-areas") args.musicAreas = Number(argv[++index]);
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (!args.file) args.file = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return [
    "Usage: node tools/validate-sound-table.mjs --file sound.asm --table _snd_table --areas 8 --music intro_music,ingame_music --sfx 43-55",
    "",
    "Validates Coleco BIOS/lib4ksa-style sound table area layout:",
    "- entry 1 must target the lowest sound area $702B",
    "- table entries must target aligned sound areas",
    "- music song references must stay in areas 1..4 by default",
    "- declared SFX indexes must stay above music areas when spare areas exist"
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file) {
    console.log(usage());
    return;
  }
  const sourceText = await fs.readFile(args.file, "utf8");
  const result = validateSoundTable(sourceText, args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${result.ok ? "OK" : "FAIL"} ${path.basename(args.file)}:${result.tableLabel}`);
    console.log(`entries: ${result.entryCount}, areas: ${result.areaCount ?? "unknown"}, music areas: 1..${result.musicAreas}`);
    console.log(`first: ${result.firstEntry.label} -> $${hex4(result.firstEntry.address)} area ${result.firstEntry.area ?? "?"}`);
    for (const area of result.areaSummary) console.log(`area ${area.area}: ${area.indexes}`);
    for (const error of result.errors) console.log(`error: ${error}`);
    for (const warning of result.warnings) console.log(`warning: ${warning}`);
  }
  if (!result.ok) process.exitCode = 1;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
