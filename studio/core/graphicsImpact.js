import { parseAmyByteDataBlocks } from "./graphicsEditorMetadata.js";

const VRAM_LIMITS = {
  pattern: 0x1800,
  color: 0x1800,
  name: 0x0400,
  spr_pat: 0x0800,
  sprite: 0x0080,
  spr_attr: 0x0080
};

function stripAmyComment(line) {
  return String(line || "").replace(/'.*$/, "");
}

function normalizeNumberLiteral(token) {
  const raw = String(token || "").trim();
  if (/^\$[0-9a-f]+$/i.test(raw)) return String(parseInt(raw.slice(1), 16));
  if (/^0x[0-9a-f]+$/i.test(raw)) return String(parseInt(raw.slice(2), 16));
  if (/^[0-9]+$/.test(raw)) return raw;
  return null;
}

function tokenizeNumericExpression(expression) {
  const source = String(expression || "").trim();
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const space = /^\s+/.exec(rest);
    if (space) {
      index += space[0].length;
      continue;
    }
    const number = /^(\$[0-9a-f]+|0x[0-9a-f]+|[0-9]+)/i.exec(rest);
    if (number) {
      tokens.push({ type: "number", value: Number(normalizeNumberLiteral(number[1])) });
      index += number[1].length;
      continue;
    }
    const op = /^[()+\-*/]/.exec(rest);
    if (op) {
      tokens.push({ type: op[0] === "(" || op[0] === ")" ? "paren" : "op", value: op[0] });
      index += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

function precedence(op) {
  if (op === "*" || op === "/") return 2;
  if (op === "+" || op === "-") return 1;
  return 0;
}

function toReversePolish(tokens) {
  const output = [];
  const ops = [];
  let expectsValue = true;
  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
      expectsValue = false;
      continue;
    }
    if (token.type === "paren" && token.value === "(") {
      ops.push(token);
      expectsValue = true;
      continue;
    }
    if (token.type === "paren" && token.value === ")") {
      while (ops.length && ops[ops.length - 1].value !== "(") output.push(ops.pop());
      if (!ops.length) return null;
      ops.pop();
      expectsValue = false;
      continue;
    }
    if (token.type !== "op") return null;
    if (expectsValue) {
      if (token.value === "+") continue;
      if (token.value === "-") {
        output.push({ type: "number", value: 0 });
      } else {
        return null;
      }
    }
    while (ops.length && ops[ops.length - 1].type === "op" && precedence(ops[ops.length - 1].value) >= precedence(token.value)) {
      output.push(ops.pop());
    }
    ops.push(token);
    expectsValue = true;
  }
  if (expectsValue) return null;
  while (ops.length) {
    const op = ops.pop();
    if (op.value === "(" || op.value === ")") return null;
    output.push(op);
  }
  return output;
}

export function evaluateGraphicsConstExpression(expression) {
  const tokens = tokenizeNumericExpression(expression);
  if (!tokens || !tokens.length) return null;
  const rpn = toReversePolish(tokens);
  if (!rpn) return null;
  const stack = [];
  for (const token of rpn) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }
    if (stack.length < 2) return null;
    const b = stack.pop();
    const a = stack.pop();
    let value;
    if (token.value === "+") value = a + b;
    else if (token.value === "-") value = a - b;
    else if (token.value === "*") value = a * b;
    else if (token.value === "/") {
      if (b === 0 || a % b !== 0) return null;
      value = a / b;
    } else {
      return null;
    }
    if (!Number.isSafeInteger(value)) return null;
    stack.push(value);
  }
  return stack.length === 1 && Number.isSafeInteger(stack[0]) ? stack[0] : null;
}

function lineNumberForOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function editorSourceNames(editor) {
  const names = new Set();
  for (const ref of [editor?.tilesetRef, editor?.patternRef, editor?.colorRef]) {
    if (ref?.name) names.add(String(ref.name));
  }
  for (const key of ["tileset", "pattern", "color", "tilesetFile", "patternFile", "colorFile", "colorAsset"]) {
    const value = editor?.[key];
    if (typeof value === "string" && value.trim()) names.add(value.trim());
  }
  return [...names];
}

function escapeRegExpLiteral(text) {
  return String(text || "").replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function tileRangeForEditor(editor, proposedChange = {}) {
  const oldBase = Number(editor?.baseTile ?? 0);
  const oldCount = Number(editor?.tileCount ?? 0);
  const newBase = Number(proposedChange.baseTile ?? oldBase);
  const newCount = Number(proposedChange.tileCount ?? oldCount);
  if (!Number.isInteger(oldBase) || !Number.isInteger(oldCount) || !Number.isInteger(newBase) || !Number.isInteger(newCount)) {
    throw new Error("Graphics editor tile range must use integer baseTile and tileCount.");
  }
  return {
    oldBase,
    oldCount,
    oldEnd: oldBase + oldCount - 1,
    newBase,
    newCount,
    newEnd: newBase + newCount - 1,
    deltaBase: newBase - oldBase,
    deltaCount: newCount - oldCount
  };
}

function classifyUploadKind(target) {
  if (target === "pattern" || target === "spr_pat") return "pattern";
  if (target === "color") return "color";
  if (target === "name") return "name";
  return target;
}

export function scanGraphicsUploadSites(sourceText, editor, proposedChange = {}) {
  const source = String(sourceText || "");
  const names = editorSourceNames(editor);
  if (!names.length) return [];
  const alternation = names.map(escapeRegExpLiteral).join("|");
  const uploadRe = new RegExp("\\b(copy|decompress)\\s+(?:(\\w+)\\s+)?(" + alternation + ")(?:\\s*\\+\\s*([^\\n]+?))?(?:\\s+count\\s+(.+?))?\\s+to\\s+vram\\.(\\w+)(?:\\s*\\+\\s*([^\\n]+?))?(?=\\s*(?:'|$))", "gim");
  const sites = [];
  let match;
  while ((match = uploadRe.exec(source))) {
    const line = lineNumberForOffset(source, match.index);
    const statement = stripAmyComment(match[0]).trim();
    const sourceOffsetExpression = String(match[4] || "").trim();
    const countExpression = String(match[5] || "").trim();
    const vramOffsetExpression = String(match[7] || "0").trim();
    const target = String(match[6] || "").toLowerCase();
    const count = countExpression ? evaluateGraphicsConstExpression(countExpression) : null;
    const vramOffset = vramOffsetExpression ? evaluateGraphicsConstExpression(vramOffsetExpression) : 0;
    const sourceOffset = sourceOffsetExpression ? evaluateGraphicsConstExpression(sourceOffsetExpression) : 0;
    const zone = (countExpression && count == null) || (vramOffsetExpression && vramOffset == null) || (sourceOffsetExpression && sourceOffset == null) ? "B" : "A";
    const kind = classifyUploadKind(target);
    const currentTileCount = editor?.tileCount;
    const proposedTileCount = proposedChange.tileCount ?? currentTileCount;
    const currentFullCount = kind === "pattern" && Number.isInteger(Number(currentTileCount)) && Number(currentTileCount) > 0 ? Number(currentTileCount) * 8 : null;
    const expectedCount = kind === "pattern" && Number.isInteger(Number(proposedTileCount)) && Number(proposedTileCount) > 0 ? Number(proposedTileCount) * 8 : null;
    const hasExplicitSourceOffset = sourceOffsetExpression.length > 0;
    const partial = zone === "A" && count != null && currentFullCount != null && (hasExplicitSourceOffset || count < currentFullCount);
    const incoherences = [];
    if (zone === "A" && expectedCount != null && count != null && count !== expectedCount && !partial) {
      incoherences.push({ type: "upload-count-mismatch", expected: expectedCount, actual: count });
    }
    if (zone === "A" && vramOffset != null && count != null && VRAM_LIMITS[target] != null && vramOffset + count > VRAM_LIMITS[target]) {
      incoherences.push({ type: "vram-overflow", limit: VRAM_LIMITS[target], end: vramOffset + count });
    }
    sites.push({
      zone,
      line,
      statement,
      operation: String(match[1]).toLowerCase(),
      codec: match[1].toLowerCase() === "decompress" ? String(match[2] || "").trim() || null : null,
      source: match[3],
      sourceOffsetExpression,
      sourceOffset,
      partial,
      target,
      countExpression,
      count,
      vramOffsetExpression,
      vramOffset,
      incoherences
    });
  }
  return sites;
}

export function scanOwnedTilemaps(sourceText, editor, proposedChange = {}) {
  const entries = Array.isArray(editor?.entries) ? editor.entries : [];
  const range = tileRangeForEditor(editor, proposedChange);
  const blocks = parseAmyByteDataBlocks(sourceText, entries);
  const maps = [];
  for (const entry of entries) {
    const bytes = blocks.get(entry);
    if (!bytes) {
      maps.push({ name: entry, zone: "B", missing: true, bytes: 0, oldRangeUses: 0, newRangeUses: 0, outOfNewRangeUses: 0 });
      continue;
    }
    let oldRangeUses = 0;
    let newRangeUses = 0;
    let outOfNewRangeUses = 0;
    for (const value of bytes) {
      if (value >= range.oldBase && value <= range.oldEnd) oldRangeUses += 1;
      if (value >= range.newBase && value <= range.newEnd) newRangeUses += 1;
      else if (value >= range.oldBase && value <= range.oldEnd) outOfNewRangeUses += 1;
    }
    maps.push({ name: entry, zone: "A", missing: false, bytes: bytes.length, oldRangeUses, newRangeUses, outOfNewRangeUses });
  }
  return maps;
}

export function scanSuspectTileLiterals(sourceText, editor) {
  const range = tileRangeForEditor(editor);
  const suspects = [];
  const lines = String(sourceText || "").split(/\r?\n/);
  const contextRe = /\b(tile|char|sprite|put|get|case|if|select|cell|board|frame)\b|[=!<>]/i;
  const literalRe = /(\$[0-9a-f]{1,2}|0x[0-9a-f]{1,2})\b/ig;
  lines.forEach((line, index) => {
    const clean = stripAmyComment(line);
    if (!contextRe.test(clean)) return;
    let match;
    while ((match = literalRe.exec(clean))) {
      const value = normalizeNumberLiteral(match[1]);
      const numeric = value == null ? null : Number(value);
      if (numeric != null && numeric >= range.oldBase && numeric <= range.oldEnd) {
        suspects.push({ zone: "B", line: index + 1, value: numeric, literal: match[1], statement: clean.trim() });
      }
    }
  });
  return suspects;
}

export function scanGraphicsBlindSpots(sourceText) {
  const spots = [];
  const lines = String(sourceText || "").split(/\r?\n/);
  let inAsmBlock = false;
  lines.forEach((line, index) => {
    const clean = stripAmyComment(line).trim();
    if (!clean) return;
    if (/^asm\s*\{/i.test(clean)) {
      inAsmBlock = true;
      spots.push({ zone: "C", line: index + 1, type: "asm-block", statement: clean });
      return;
    }
    if (inAsmBlock) {
      if (/^\}/.test(clean)) inAsmBlock = false;
      return;
    }
    if (/\b(call|include)\s+asm\b/i.test(clean)) {
      spots.push({ zone: "C", line: index + 1, type: "asm-reference", statement: clean });
    }
  });
  return spots;
}

export function computeTilesetImpact({ editor, sourceText, proposedChange = {} }) {
  if (!editor) throw new Error("Missing graphics editor metadata.");
  const range = tileRangeForEditor(editor, proposedChange);
  const uploadedBy = scanGraphicsUploadSites(sourceText, editor, proposedChange);
  const usedBy = scanOwnedTilemaps(sourceText, editor, proposedChange);
  const suspectLiterals = scanSuspectTileLiterals(sourceText, editor);
  const blindSpots = scanGraphicsBlindSpots(sourceText);
  const incoherences = [];
  if (range.newBase < 0 || range.newCount < 0 || range.newEnd > 0xFF) {
    incoherences.push({ type: "tile-range-overflow", range });
  }
  for (const site of uploadedBy) {
    for (const issue of site.incoherences || []) {
      incoherences.push({ ...issue, line: site.line, source: site.source, target: site.target });
    }
  }
  for (const map of usedBy) {
    if (map.outOfNewRangeUses > 0) {
      incoherences.push({ type: "tilemap-values-outside-new-range", name: map.name, count: map.outOfNewRangeUses });
    }
  }
  return { range, uploadedBy, usedBy, suspectLiterals, blindSpots, incoherences };
}
