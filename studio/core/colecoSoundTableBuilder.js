const AREA_BASE = 0x702b;
const AREA_STRIDE = 10;

export function colecoSoundAreaAddress(slot) {
  if (!Number.isInteger(slot) || slot < 1 || slot > 8) throw new Error("Sound slot must be 1..8.");
  return AREA_BASE + ((slot - 1) * AREA_STRIDE);
}

export function buildColecoSoundTableSource({ tableName, areaCount, sounds }) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName || "")) throw new Error("Sound table name must be an Amy identifier.");
  if (!Number.isInteger(areaCount) || areaCount < 1 || areaCount > 8) throw new Error("Sound areas must be 1..8.");
  if (!Array.isArray(sounds) || !sounds.length) throw new Error("Add at least one sound.");
  const names = new Set();
  const normalized = sounds.map((sound) => {
    const name = String(sound?.name || "").trim();
    const role = sound?.role === "music" ? "music" : "sfx";
    const slot = Number(sound?.slot);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid sound name: ${name || "(empty)"}.`);
    if (names.has(name.toLowerCase())) throw new Error(`Duplicate sound name: ${name}.`);
    if (!Number.isInteger(slot) || slot < 1 || slot > areaCount) throw new Error(`${name} needs a slot from 1 to ${areaCount}.`);
    names.add(name.toLowerCase());
    return { name, role, slot, address: colecoSoundAreaAddress(slot) };
  });
  const hex = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
  const lines = ["asm {", `${tableName}:`];
  for (const sound of normalized) lines.push(`    dw ${sound.name},${hex(sound.address)} ; ${sound.role} · slot ${sound.slot}`);
  lines.push("");
  for (const sound of normalized) lines.push(`${sound.name}:`, "    db $50", "");
  lines.push("}");
  const slots = new Map();
  for (const sound of normalized) slots.set(sound.slot, [...(slots.get(sound.slot) || []), sound.name]);
  const sharedSlots = [...slots].filter(([, namesInSlot]) => namesInSlot.length > 1)
    .map(([slot, namesInSlot]) => ({ slot, names: namesInSlot }));
  return { setup: `set sound table ${tableName} areas ${areaCount}`, asm: lines.join("\n"), sounds: normalized, sharedSlots };
}

export function insertColecoSoundTableSource(sourceText, built) {
  const source = String(sourceText || "");
  if (!built?.setup || !built?.asm) throw new Error("Built sound table is missing setup or data.");
  if (new RegExp(`\\b${built.setup.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(source)) throw new Error("This sound table is already installed.");
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s*sub\s+start\s*:/i.test(line));
  let insertion = start >= 0 ? start + 1 : lines.findIndex((line) => /^\s*(?:text|tile|bitmap|picture|mode\s+\d+)\s+screen\b/i.test(line));
  if (insertion < 0) insertion = lines.length;
  const indent = start >= 0 ? (lines[start].match(/^\s*/)?.[0] || "") + "  " : "";
  lines.splice(insertion, 0, `${indent}${built.setup}`);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  return `${lines.join(newline).replace(/\s*$/, "")}${newline}${newline}${built.asm}${newline}`;
}

export function addColecoSoundToTableSource(sourceText, { tableName, soundName, role = "sfx", slot }) {
  const source = String(sourceText || "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName || "")) throw new Error("Sound table name must be an Amy identifier.");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(soundName || "")) throw new Error("Sound name must be an Amy identifier.");
  if (!Number.isInteger(slot) || slot < 1 || slot > 8) throw new Error("Sound slot must be 1..8.");
  if (new RegExp(`^\\s*${soundName}\\s*:`, "im").test(source)) throw new Error(`Sound label ${soundName} already exists.`);
  const lines = source.split(/\r?\n/);
  const tableLine = lines.findIndex((line) => new RegExp(`^\\s*${tableName}\\s*:\\s*(?:;.*)?$`, "i").test(line));
  if (tableLine < 0) throw new Error(`Sound table ${tableName} was not found.`);
  let insertion = tableLine + 1;
  while (insertion < lines.length && (/^\s*(?:\.?dw|defw)\b/i.test(lines[insertion]) || /^\s*(?:;.*)?$/.test(lines[insertion]))) insertion += 1;
  const indent = lines.slice(tableLine + 1, insertion).find((line) => /\S/.test(line))?.match(/^\s*/)?.[0] || "    ";
  const address = colecoSoundAreaAddress(slot).toString(16).toUpperCase().padStart(4, "0");
  lines.splice(insertion, 0,
    `${indent}dw ${soundName},$${address} ; ${role === "music" ? "music" : "sfx"} · slot ${slot}`,
    "",
    `${soundName}:`,
    `${indent}db $50`,
    ""
  );
  return lines.join(source.includes("\r\n") ? "\r\n" : "\n");
}
