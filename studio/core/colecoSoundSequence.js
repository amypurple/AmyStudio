import { decodeColecoSoundStream, encodeColecoSoundEvents, formatColecoSoundBytes } from "./colecoSoundNotes.js";

function withoutComment(line) {
  return String(line || "").replace(/;.*/, "");
}

function labelOnLine(line) {
  return withoutComment(line).trim().match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/)?.[1] || null;
}

function dbOnLine(line) {
  const match = withoutComment(line).trim().match(/^(\.?db|defb)\s+(.+)$/i);
  if (!match) return null;
  const values = match[2].split(",").map((token) => {
    const text = token.trim();
    if (/^\$[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(1), 16);
    if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(2), 16);
    if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
    return NaN;
  });
  return values.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)
    ? { directive: match[1], values }
    : null;
}

export function findColecoSoundSegment(sourceText, label) {
  const source = String(sourceText || "");
  const lines = source.split(/\r?\n/);
  const wanted = String(label || "").toLowerCase();
  const labelLine = lines.findIndex((line) => labelOnLine(line)?.toLowerCase() === wanted);
  if (labelLine < 0) throw new Error(`Sound label ${label} was not found.`);

  let firstDataLine = -1;
  let endLine = lines.length;
  let nextLabel = null;
  let directive = "db";
  const bytes = [];
  for (let index = labelLine + 1; index < lines.length; index += 1) {
    const nestedLabel = labelOnLine(lines[index]);
    if (nestedLabel) {
      endLine = index;
      nextLabel = nestedLabel;
      break;
    }
    const clean = withoutComment(lines[index]).trim();
    if (!clean) continue;
    const row = dbOnLine(lines[index]);
    if (!row) {
      endLine = index;
      break;
    }
    if (firstDataLine < 0) firstDataLine = index;
    directive = row.directive;
    bytes.push(...row.values);
  }
  if (firstDataLine < 0) throw new Error(`Sound label ${label} has no editable byte segment.`);
  return { source, lines, label, labelLine, firstDataLine, endLine, nextLabel, directive, bytes };
}

export function decodeColecoSoundSegment(sourceText, label) {
  const segment = findColecoSoundSegment(sourceText, label);
  const decoded = decodeColecoSoundStream(segment.bytes);
  return {
    ...segment,
    ...decoded,
    sharedTailLabel: !decoded.terminated ? segment.nextLabel : null
  };
}

export function createColecoSoundTerminal(type, channel = 1) {
  if (!["end", "repeat"].includes(type)) throw new Error("Sound terminal must be end or repeat.");
  if (!Number.isInteger(channel) || channel < 0 || channel > 3) throw new Error("Sound terminal channel must be 0..3.");
  return {
    type,
    channel,
    bytes: [(channel << 6) | (type === "end" ? 0x10 : 0x18)]
  };
}

export function validateColecoSoundSequence(events, { allowSharedTail = false } = {}) {
  const sequence = [...(events || [])];
  if (!sequence.length) throw new Error("A sound segment cannot be empty.");
  const terminals = sequence
    .map((event, index) => (["end", "repeat", "tiny"].includes(event?.type) ? index : -1))
    .filter((index) => index >= 0);
  if (terminals.length > 1) throw new Error("A sound segment can have only one terminal command.");
  if (terminals.length === 1 && terminals[0] !== sequence.length - 1) {
    throw new Error("End, Repeat, or Tiny must be the last command.");
  }
  if (!terminals.length && !allowSharedTail) {
    throw new Error("A standalone sound segment must end with End, Repeat, or Tiny.");
  }
  encodeColecoSoundEvents(sequence);
  return sequence;
}

export function replaceColecoSoundSegment(sourceText, label, events, { bytesPerLine = 16 } = {}) {
  if (!Number.isInteger(bytesPerLine) || bytesPerLine < 1 || bytesPerLine > 64) {
    throw new Error("Sound bytes per line must be 1..64.");
  }
  const segment = findColecoSoundSegment(sourceText, label);
  const before = decodeColecoSoundStream(segment.bytes);
  if (before.trailing) throw new Error(`Sound label ${label} has ${before.trailing} unreachable trailing byte(s).`);
  const sequence = validateColecoSoundSequence(events, { allowSharedTail: !before.terminated && !!segment.nextLabel });
  const bytes = encodeColecoSoundEvents(sequence);
  const indent = segment.lines[segment.firstDataLine].match(/^\s*/)?.[0] || "    ";
  const replacement = [];
  for (let offset = 0; offset < bytes.length; offset += bytesPerLine) {
    replacement.push(`${indent}${formatColecoSoundBytes(bytes.slice(offset, offset + bytesPerLine), { directive: segment.directive })}`);
  }
  const lines = [
    ...segment.lines.slice(0, segment.firstDataLine),
    ...replacement,
    ...segment.lines.slice(segment.endLine)
  ];
  const newline = segment.source.includes("\r\n") ? "\r\n" : "\n";
  return {
    source: lines.join(newline),
    bytes,
    nextLabel: segment.nextLabel,
    sharedTailPreserved: !before.terminated && !!segment.nextLabel,
    sharedTailLabel: !before.terminated ? segment.nextLabel : null
  };
}

export function moveColecoSoundEvent(events, from, to) {
  const copy = [...(events || [])];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= copy.length || to < 0 || to >= copy.length) {
    throw new Error("Sound event move is outside the sequence.");
  }
  const [event] = copy.splice(from, 1);
  copy.splice(to, 0, event);
  return copy;
}
