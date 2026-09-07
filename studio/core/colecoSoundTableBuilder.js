import { readTinySoundLabel } from "./colecoTinySound.js?v=20260906-tiny-import-scan";

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
  return { setup: `set sound table ${tableName} areas ${areaCount}`, asm: lines.join("\n"), tableName, sounds: normalized, sharedSlots };
}

export function insertColecoSoundTableSource(sourceText, built) {
  const source = String(sourceText || "");
  if (!built?.setup || !built?.asm) throw new Error("Built sound table is missing setup or data.");
  const setupInstalled = new RegExp(`\\b${built.setup.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(source);
  if (setupInstalled) {
    const tableName = built.tableName || built.setup.match(/\btable\s+([A-Za-z_][A-Za-z0-9_]*)/i)?.[1];
    if (tableName && new RegExp(`^\\s*${tableName}\\s*:`, "im").test(source)) {
      throw new Error(`${tableName} is already installed. Open SOUND to edit it.`);
    }
    const newline = source.includes("\r\n") ? "\r\n" : "\n";
    return `${source.replace(/\s*$/, "")}${newline}${newline}${built.asm}${newline}`;
  }
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s*sub\s+start\s*:/i.test(line));
  let insertion = start >= 0 ? start + 1 : lines.findIndex((line) => /^\s*(?:text|tile|bitmap|picture|mode\s+\d+)\s+screen\b/i.test(line));
  if (insertion < 0) insertion = lines.length;
  const indent = start >= 0 ? (lines[start].match(/^\s*/)?.[0] || "") + "  " : "";
  lines.splice(insertion, 0, `${indent}${built.setup}`);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  return `${lines.join(newline).replace(/\s*$/, "")}${newline}${newline}${built.asm}${newline}`;
}

// Tiny Sound channel 1/2 -> BIOS sound-area slot, matching the convention already used
// throughout this project's own Tiny Sound content (see
// "examples/tiny music/applied in a project/snddata_tinymusic.asm"'s _snd_table: every
// music_ch1_* entry targets $702B+30 (slot 4) and every music_ch2_* entry targets $702B+20
// (slot 3)).
const TINY_CHANNEL_SLOT = { 1: 1, 2: 2 };

export function buildTinySoundStarterSource() {
  return [
    "starter_ch1_A:",
    "    db $44",
    "    dw sndtiny_1",
    "    db 8",
    "    db $02,$60,$19,$22",
    "    db $28,$2C,$30,$34,$34,$30,$2C,$28,$00,$01,$FF",
    "",
    "starter_ch2_A:",
    "    db $84",
    "    dw sndtiny_2",
    "    db 8",
    "    db $02,$80,$13,$33",
    "    db $18,$1C,$20,$24,$24,$20,$1C,$18,$00,$01,$FF",
    ""
  ].join("\n");
}

// Rename one assembler symbol and its code references. Comments stay byte-for-byte intact,
// and identifier boundaries prevent similarly named labels from changing.
export function renameLabelDeclaration(fileText, oldLabel, newLabel) {
  const text = String(fileText || "");
  const lines = text.split(/\r?\n/);
  const targetLine = lines.findIndex((line) => new RegExp(`^\\s*${oldLabel}\\s*:\\s*$`, "i").test(line));
  if (targetLine < 0) throw new Error(`Label ${oldLabel} was not found.`);
  if (lines.some((line, index) => index !== targetLine && new RegExp(`^\\s*${newLabel}\\s*:\\s*$`, "i").test(line))) {
    throw new Error(`Label ${newLabel} already exists.`);
  }
  const symbol = new RegExp(`\\b${oldLabel}\\b`, "gi");
  for (let index = 0; index < lines.length; index += 1) {
    const commentAt = lines[index].indexOf(";");
    const code = commentAt < 0 ? lines[index] : lines[index].slice(0, commentAt);
    const comment = commentAt < 0 ? "" : lines[index].slice(commentAt);
    lines[index] = `${code.replace(symbol, newLabel)}${comment}`;
  }
  return lines.join(text.includes("\r\n") ? "\r\n" : "\n");
}

// Builds a self-contained "play song" wrapper referencing one or two already-existing Tiny
// Sound channel alias labels (see insertLabelAlias above - channel.label here must already
// be a real declared label in the same text, either the stream's own original label or an
// alias inserted for it). The wrapper is plain assembly text meant to be appended to the
// SAME attached .asm/.inc file the channel streams live in (see appendTinySoundWrapper
// below) - not wrapped in an Amy `asm { }` block, since it never becomes part of the Amy
// source text itself; the Sound Library's own inspector (soundTableInspector.js) only ever
// reads one text blob at a time (either the visible Amy source or one attached project
// file), never a combination, so keeping the wrapper in the SAME file as the streams it
// references is what makes the generated song show up correctly when that file is
// inspected or opened in the sequencer.
//
// Always creates its OWN sound-area table rather than trying to splice into an existing
// one: an existing table's `dw` pointer list may live in a different file this function
// never sees, and appending in the wrong place would corrupt someone else's working table,
// so a fresh table is the only broadly-safe option. The generated song label's byte layout
// (duration word; a "trigger count in bits 7-6, 1-based sound-table index in bits 5-0"
// byte per triggered entry; a final loop/chain word whose bit 15 being set makes the
// player treat it as a jump instead of a duration) is transcribed directly from this
// project's own runtime, src/alexis_lib/coleco_music.asm's AMY_TRIGGER_SOUNDS - not
// guessed from the example file's (sometimes off-by-one) comments.
export function buildTinySoundSongSource({ name, channels, durationFrames }) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name || "")) throw new Error("Song name must be an Amy identifier.");
  if (!Array.isArray(channels) || !channels.length || channels.length > 2) throw new Error("Pick one or two Tiny Sound channel streams to import.");
  const seenChannels = new Set();
  for (const channel of channels) {
    if (![1, 2].includes(channel?.number)) throw new Error("Tiny Sound channel must be 1 or 2.");
    if (seenChannels.has(channel.number)) throw new Error(`Channel ${channel.number} was picked twice.`);
    seenChannels.add(channel.number);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(channel?.label || "")) throw new Error(`Invalid Tiny Sound stream label: ${channel?.label}`);
  }
  if (!Number.isInteger(durationFrames) || durationFrames < 1 || durationFrames > 0x7fff) {
    throw new Error("Song duration must be 1..32767 frames so a single loop entry can hold it.");
  }
  const tableName = `${name}_table`;
  const songLabel = `${name}_song`;
  const hex2 = (value) => `$${value.toString(16).toUpperCase().padStart(2, "0")}`;
  const hex4 = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
  const entries = channels.map((channel, index) => ({
    label: channel.label,
    channel: channel.number,
    slot: TINY_CHANNEL_SLOT[channel.number],
    index: index + 1
  }));
  const lines = [`${tableName}:`];
  for (const entry of entries) lines.push(`    dw ${entry.label},${hex4(colecoSoundAreaAddress(entry.slot))} ; music - channel ${entry.channel}`);
  lines.push("", `${songLabel}:`, `    dw ${durationFrames}`);
  const indexBytes = entries.map((entry, i) => i === 0 ? (((entries.length - 1) << 6) | (entry.index & 0x3f)) : (entry.index & 0x3f));
  lines.push(`    db ${indexBytes.map(hex2).join(",")}`, `    dw ${songLabel} ; loop forever`);
  return {
    asm: lines.join("\n"),
    setup: `set sound table ${tableName} areas ${entries.length}`,
    play: `play song ${songLabel}`,
    tableName,
    songLabel,
    entries
  };
}

// Appends the wrapper (table + song data) to the attached file's own text - the channel
// streams/aliases and the wrapper that references them must stay in one file/text blob
// (see buildTinySoundSongSource's comment for why).
export function appendTinySoundWrapper(fileText, built) {
  if (!built?.asm) throw new Error("Built Tiny Sound song is missing its data.");
  const text = String(fileText || "");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  return `${text.replace(/\s*$/, "")}${newline}${newline}${built.asm}${newline}`;
}

// End-to-end: given the raw pasted/uploaded candidate file text and the channel streams the
// human picked from it (each `{ number: 1|2, label }`, label being the stream's own real
// declared label as found by scanTinySoundStreams), produces the final attached-file text
// (original content untouched except for renaming each picked channel's own declaration
// line to "<name>_ch1"/"<name>_ch2" - see renameLabelDeclaration - so the existing
// sequencer's channel-pairing regex can find it) plus the built song/setup/play wrapper.
export function prepareTinySoundImport({ fileText, name, channels, durationFrames }) {
  if (!Array.isArray(channels) || !channels.length) throw new Error("Pick one or two Tiny Sound channel streams to import.");
  const seenChannels = new Set();
  for (const channel of channels) {
    if (seenChannels.has(channel?.number)) throw new Error(`Channel ${channel.number} was picked twice.`);
    seenChannels.add(channel?.number);
  }
  let text = String(fileText || "");
  const renamedChannels = channels.map((channel) => {
    const stream = readTinySoundLabel(text, channel.label);
    if (stream.channel !== channel.number) throw new Error(`${channel.label} is encoded for channel ${stream.channel}, not channel ${channel.number}.`);
    const renamed = `${name}_ch${channel.number}`;
    if (channel.label.toLowerCase() !== renamed.toLowerCase()) {
      text = renameLabelDeclaration(text, channel.label, renamed);
    }
    return { number: channel.number, label: renamed };
  });
  const built = buildTinySoundSongSource({ name, channels: renamedChannels, durationFrames });
  return { fileText: appendTinySoundWrapper(text, built), built };
}

// Inserts the `set sound table ...`/`play song ...` lines into Amy source, right after
// `sub start:` (matching insertColecoSoundTableSource's own insertion point) - only when
// `installTable` is true, meaning the caller has confirmed (via inspectSourceSoundTables
// finding nothing) that no sound table is already active. Starting a second table/song
// when one is already playing would silently override it, so callers must never pass
// installTable:true otherwise; when it's false this returns the source unchanged, and the
// caller is expected to surface built.setup/built.play as text for the human to place.
export function insertTinySoundSongPlayback(sourceText, built, { installTable }) {
  const source = String(sourceText || "");
  if (!built?.setup || !built?.play) throw new Error("Built Tiny Sound song is missing setup or play.");
  if (!installTable) return source;
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s*sub\s+start\s*:/i.test(line));
  let insertion = start >= 0 ? start + 1 : lines.findIndex((line) => /^\s*(?:text|tile|bitmap|picture|mode\s+\d+)\s+screen\b/i.test(line));
  if (insertion < 0) insertion = lines.length;
  const indent = start >= 0 ? (lines[start].match(/^\s*/)?.[0] || "") + "  " : "";
  lines.splice(insertion, 0, `${indent}${built.setup}`, `${indent}${built.play}`);
  return lines.join(newline);
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
