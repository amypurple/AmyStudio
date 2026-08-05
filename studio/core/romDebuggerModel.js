const ADDRESS_FIRST_SYMBOL = /^\s*(?:[0-9A-Fa-f]{2}:)?([0-9A-Fa-f]{4})\s+([A-Za-z_.$?][\w.$?]*)\s*$/;
const EQU_SYMBOL = /^\s*([A-Za-z_.$?][\w.$?]*)\s*:\s*equ\s+(?:\$|0x)?([0-9A-Fa-f]{1,4})\s*$/i;

export function formatHex(value, width = 4) {
  return `$${(Number(value) >>> 0).toString(16).toUpperCase().padStart(width, "0")}`;
}

export function parseAmySymbols(text) {
  const symbols = [];
  const seen = new Set();
  for (const line of String(text || "").split(/\r?\n/)) {
    const addressFirst = line.match(ADDRESS_FIRST_SYMBOL);
    const equ = line.match(EQU_SYMBOL);
    if (!addressFirst && !equ) continue;
    const address = Number.parseInt(addressFirst ? addressFirst[1] : equ[2], 16) & 0xFFFF;
    const name = addressFirst ? addressFirst[2] : equ[1];
    const key = `${address}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    symbols.push({ address, name });
  }
  return symbols.sort((left, right) => left.address - right.address || left.name.localeCompare(right.name));
}

export function resolveSymbolOrAddress(value, symbols) {
  const source = String(value || "").trim();
  if (!source) throw new Error("Enter a symbol or address.");
  const numeric = source.match(/^\$([0-9a-f]+)$/i)
    || source.match(/^0x([0-9a-f]+)$/i)
    || source.match(/^([0-9a-f]{1,4})$/i);
  if (numeric) return Number.parseInt(numeric[1], 16) & 0xFFFF;
  const symbol = symbols.find((entry) => entry.name.toLowerCase() === source.toLowerCase());
  if (!symbol) throw new Error(`Unknown symbol "${source}".`);
  return symbol.address;
}

export function findNearestSymbol(address, symbols) {
  const target = Number(address) & 0xFFFF;
  let nearest = null;
  for (const symbol of symbols) {
    if (symbol.address > target) break;
    nearest = symbol;
  }
  if (!nearest) return "";
  const delta = target - nearest.address;
  return delta ? `${nearest.name}+${formatHex(delta, 2)}` : nearest.name;
}

export function classifyAddress(address) {
  const value = Number(address) & 0xFFFF;
  if (value >= 0x8000) return "ROM";
  if (value >= 0x7000 && value <= 0x73FF) return "RAM";
  if (value <= 0x1FFF) return "BIOS";
  if (value >= 0x6000 && value <= 0x63FF) return "SGM RAM";
  return "Address";
}

export function formatHexDump(bytes, startAddress = 0, rowSize = 16) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
  const rows = [];
  for (let offset = 0; offset < data.length; offset += rowSize) {
    const slice = data.subarray(offset, offset + rowSize);
    const hex = [...slice].map((value) => value.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    const ascii = [...slice].map((value) => value >= 32 && value <= 126 ? String.fromCharCode(value) : ".").join("");
    rows.push(`${formatHex(startAddress + offset)}  ${hex.padEnd(rowSize * 3 - 1)}  |${ascii.padEnd(rowSize, " ")}|`);
  }
  return rows.join("\n");
}

export function decodeVdpRegisters(values) {
  const registers = Uint8Array.from(values || []);
  const r0 = registers[0] || 0;
  const r1 = registers[1] || 0;
  const modeBits = ((r1 >> 3) & 1) << 2 | ((r1 >> 4) & 1) << 1 | ((r0 >> 1) & 1);
  const modeNames = new Map([
    [0, "Graphics I"],
    [1, "Graphics II"],
    [2, "Multicolor"],
    [4, "Text"]
  ]);
  return {
    registers: [...registers].map((value, index) => ({
      name: `R${index}`,
      value,
      text: formatHex(value, 2)
    })),
    mode: modeNames.get(modeBits) || `Mode bits ${modeBits.toString(2).padStart(3, "0")}`,
    displayEnabled: Boolean(r1 & 0x40),
    nmiEnabled: Boolean(r1 & 0x20),
    sprites16: Boolean(r1 & 0x02),
    spritesMagnified: Boolean(r1 & 0x01),
    nameTable: ((registers[2] || 0) & 0x0F) << 10,
    colorTable: ((registers[3] || 0) & 0xFF) << 6,
    patternTable: ((registers[4] || 0) & 0x07) << 11,
    spriteAttributeTable: ((registers[5] || 0) & 0x7F) << 7,
    spritePatternTable: ((registers[6] || 0) & 0x07) << 11,
    backdrop: (registers[7] || 0) & 0x0F
  };
}

export function listAmyDebugBreakpoints(symbols) {
  return symbols
    .filter((symbol) => symbol.name.startsWith("AMY_ULBL_BREAK_"))
    .map((symbol) => ({
      ...symbol,
      label: symbol.name.slice("AMY_ULBL_BREAK_".length)
    }));
}

export function listAmySourceMarkers(symbols) {
  return symbols.flatMap((symbol) => {
    const match = symbol.name.match(/^AMY_SOURCE_LINE_(\d+)(?:_(\d+))?$/);
    if (!match) return [];
    return [{
      ...symbol,
      sourceLine: Number(match[1]),
      instance: match[2] ? Number(match[2]) : 1,
      label: `Line ${match[1]}`
    }];
  }).sort((left, right) => left.address - right.address
    || left.sourceLine - right.sourceLine
    || left.instance - right.instance);
}

export function listAmyProcedureSourceMarkers(symbols, sourceText) {
  const lines = String(sourceText || "").split(/\r?\n/);
  const procedures = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*sub\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (!match) continue;
    let bodyIndex = index + 1;
    while (bodyIndex < lines.length && (!lines[bodyIndex].trim() || lines[bodyIndex].trimStart().startsWith("'"))) bodyIndex += 1;
    procedures.set(match[1].toLowerCase(), bodyIndex + 1);
  }
  return (symbols || []).flatMap((symbol) => {
    const match = symbol.name.match(/^AMY_UPROC_(.+)$/i);
    if (!match) return [];
    const sourceLine = procedures.get(match[1].toLowerCase());
    return sourceLine ? [{ ...symbol, sourceLine, instance: 0, procedureEntry: true, label: `Line ${sourceLine}` }] : [];
  });
}

function findAmyProcedureSourceRange(sourceText, procedureName) {
  const wanted = String(procedureName || "").replace(/^AMY_UPROC_/i, "").toLowerCase();
  if (!wanted) return null;
  const lines = String(sourceText || "").split(/\r?\n/);
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*sub\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (!match) continue;
    if (start >= 0) return { start, end: index };
    if (match[1].toLowerCase() === wanted) start = index + 1;
  }
  return start >= 0 ? { start, end: lines.length } : null;
}

export function chooseAmySourceMarker(markers, { address, symbols, sourceText } = {}) {
  let candidates = Array.isArray(markers) ? markers.filter(Boolean) : [];
  if (!candidates.length) return null;

  const procedureRanges = (symbols || [])
    .filter((symbol) => symbol.address === (Number(address) & 0xFFFF) && /^AMY_UPROC_/i.test(symbol.name))
    .map((symbol) => findAmyProcedureSourceRange(sourceText, symbol.name))
    .filter(Boolean);
  if (procedureRanges.length) {
    const inProcedure = candidates.filter((marker) => procedureRanges.some((range) => (
      marker.sourceLine >= range.start && marker.sourceLine <= range.end
    )));
    if (inProcedure.length) candidates = inProcedure;
  }

  const ordered = [...candidates].sort((left, right) => left.sourceLine - right.sourceLine
    || (left.instance || 1) - (right.instance || 1));
  // A label/sub declaration and its first executable statement commonly share
  // an address. Prefer the end of that first contiguous group, never an
  // unrelated later line that the optimizer also folded onto the address.
  let selected = ordered[0];
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].sourceLine > selected.sourceLine + 1) break;
    selected = ordered[index];
  }
  return selected;
}

export function resolveAmySourceBreakpoints(configured, markers) {
  const groupsByAddress = new Map();
  const unresolved = [];

  for (const breakpoint of configured || []) {
    if (breakpoint?.enabled === false) continue;
    const matches = markers.filter((marker) => marker.sourceLine === breakpoint.line);
    if (!matches.length) {
      unresolved.push({ ...breakpoint });
      continue;
    }

    for (const marker of matches) {
      let group = groupsByAddress.get(marker.address);
      if (!group) {
        group = { address: marker.address, members: [] };
        groupsByAddress.set(marker.address, group);
      }
      group.members.push({
        line: breakpoint.line,
        instance: marker.instance,
        condition: breakpoint.condition || "",
        valueType: breakpoint.valueType || "auto"
      });
    }
  }

  return {
    groups: [...groupsByAddress.values()].sort((left, right) => left.address - right.address),
    unresolved
  };
}

export function filterSymbols(symbols, query, limit = 300) {
  const needle = String(query || "").trim().toLowerCase();
  const filtered = needle
    ? symbols.filter((entry) => entry.name.toLowerCase().includes(needle)
      || formatHex(entry.address).toLowerCase().includes(needle))
    : symbols;
  return filtered.slice(0, limit);
}
