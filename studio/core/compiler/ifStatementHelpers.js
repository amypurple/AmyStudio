import { checkIfDeprecation } from "./deprecations.js";

function isWordChar(ch) {
  return /[A-Za-z0-9_]/.test(ch || "");
}

function findTopLevelKeyword(source, keyword, fromIndex = 0) {
  const text = String(source || "");
  const loweredKeyword = String(keyword || "").toLowerCase();
  let depthParen = 0;
  let depthBracket = 0;
  let inString = false;
  for (let i = Math.max(0, fromIndex); i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "(") {
      depthParen += 1;
      continue;
    }
    if (ch === ")") {
      depthParen = Math.max(0, depthParen - 1);
      continue;
    }
    if (ch === "[") {
      depthBracket += 1;
      continue;
    }
    if (ch === "]") {
      depthBracket = Math.max(0, depthBracket - 1);
      continue;
    }
    if (depthParen !== 0 || depthBracket !== 0) continue;
    if (text.slice(i, i + loweredKeyword.length).toLowerCase() !== loweredKeyword) continue;
    const before = i > 0 ? text[i - 1] : "";
    const after = i + loweredKeyword.length < text.length ? text[i + loweredKeyword.length] : "";
    if (isWordChar(before) || isWordChar(after)) continue;
    return i;
  }
  return -1;
}

function findNextInlineBranch(source, fromIndex = 0) {
  const elseifIndex = findTopLevelKeyword(source, "elseif", fromIndex);
  const elseIndex = findTopLevelKeyword(source, "else", fromIndex);
  if (elseifIndex < 0 && elseIndex < 0) return null;
  if (elseifIndex >= 0 && (elseIndex < 0 || elseifIndex <= elseIndex)) return { keyword: "elseif", index: elseifIndex };
  return { keyword: "else", index: elseIndex };
}

function parseInlineIfBranches(conditionText, inlineTail, rawLine) {
  const source = String(inlineTail || "").trim();
  const branches = [];
  let cursor = 0;
  let currentCondition = String(conditionText || "").trim();
  while (cursor <= source.length) {
    const next = findNextInlineBranch(source, cursor);
    const statementEnd = next ? next.index : source.length;
    const statement = source.slice(cursor, statementEnd).trim();
    if (!statement) return { ok: false, log: `Single-line if branch is empty: ${rawLine}` };
    branches.push({ condition: currentCondition, statement });
    if (!next) return { ok: true, branches };
    if (next.keyword === "else") {
      const elseStatement = source.slice(next.index + 4).trim();
      if (!elseStatement) return { ok: false, log: `Single-line if else branch is empty: ${rawLine}` };
      if (findNextInlineBranch(elseStatement, 0)) return { ok: false, log: `Single-line if supports only one final else: ${rawLine}` };
      branches.push({ condition: null, statement: elseStatement });
      return { ok: true, branches };
    }
    const conditionStart = next.index + "elseif".length;
    const thenIndex = findTopLevelKeyword(source, "then", conditionStart);
    if (thenIndex < 0) return { ok: false, log: `Single-line elseif requires then: ${rawLine}` };
    currentCondition = source.slice(conditionStart, thenIndex).trim();
    if (!currentCondition) return { ok: false, log: `Single-line elseif condition is empty: ${rawLine}` };
    cursor = thenIndex + "then".length;
  }
  return { ok: false, log: `Invalid single-line if: ${rawLine}` };
}
export function handleIfStatement({
  line,
  rawLine,
  body,
  ifStack,
  splitTopLevelKeyword,
  compileInlineStatement,
  makeGeneratedLabel,
  emitConditionalJump
}) {
  const inlineIfThenDecl = line.match(/^if\s+(.+?)\s+then\s+(.+)$/i);
  if (inlineIfThenDecl && !/\bgoto\s+[A-Za-z_][A-Za-z0-9_]*$/i.test(inlineIfThenDecl[1])) {
    const conditionText = inlineIfThenDecl[1];
    const inlineTail = inlineIfThenDecl[2].trim();
    const parsedInline = parseInlineIfBranches(conditionText, inlineTail, rawLine);
    if (!parsedInline.ok) return { ok: false, handled: true, log: parsedInline.log };
    const branches = parsedInline.branches;
    if (branches.length === 1) {
      const inlineResult = compileInlineStatement(branches[0].statement, rawLine);
      if (!inlineResult.ok) return { ok: false, handled: true, log: inlineResult.log };
      const falseLabel = makeGeneratedLabel("IfFalse");
      const code = emitConditionalJump(branches[0].condition, falseLabel, true);
      if (!code.ok) return { ok: false, handled: true, log: code.log };
      return {
        ok: true,
        handled: true,
        lines: [...code.lines, ...inlineResult.lines, `${falseLabel}:`]
      };
    }

    const endLabel = makeGeneratedLabel("IfEnd");
    const lines = [];
    for (let index = 0; index < branches.length; index += 1) {
      const branch = branches[index];
      const isLast = index === branches.length - 1;
      const nextLabel = isLast ? endLabel : makeGeneratedLabel("IfNext");
      if (branch.condition !== null) {
        const code = emitConditionalJump(branch.condition, nextLabel, true);
        if (!code.ok) return { ok: false, handled: true, log: code.log };
        lines.push(...code.lines);
      }
      const inlineResult = compileInlineStatement(branch.statement, rawLine);
      if (!inlineResult.ok) return { ok: false, handled: true, log: inlineResult.log };
      lines.push(...inlineResult.lines);
      if (!isLast) lines.push(`    jp ${endLabel}`, `${nextLabel}:`);
    }
    lines.push(`${endLabel}:`);
    return { ok: true, handled: true, lines };
  }

  const ifThenDecl = line.match(/^if\s+(.+?)\s+then$/i);
  if (ifThenDecl && !/\bgoto\s+[A-Za-z_][A-Za-z0-9_]*$/i.test(ifThenDecl[1])) {
    const falseLabel = makeGeneratedLabel("IfFalse");
    const endLabel = makeGeneratedLabel("IfEnd");
    const code = emitConditionalJump(ifThenDecl[1], falseLabel, true);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    ifStack.push({
      falseLabel,
      endLabel,
      hasElse: false,
      hasEndJump: false
    });
    return { ok: true, handled: true, lines: code.lines };
  }

  const elseifDecl = line.match(/^(?:elseif|else\s+if)\s+(.+?)\s+then$/i);
  if (elseifDecl) {
    const block = ifStack[ifStack.length - 1];
    if (!block) return { ok: false, handled: true, log: `elseif without matching if: ${rawLine}` };
    if (block.hasElse) return { ok: false, handled: true, log: `elseif cannot appear after else: ${rawLine}` };
    const lastElseifLine = body[body.length - 1];
    const lines = [];
    if (!/^\s+jp\s+[^,\s]/.test(lastElseifLine)) {
      lines.push(`    jp ${block.endLabel}`);
      block.hasEndJump = true;
    }
    lines.push(`${block.falseLabel}:`);
    block.falseLabel = makeGeneratedLabel("IfFalse");
    const code = emitConditionalJump(elseifDecl[1], block.falseLabel, true);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    lines.push(...code.lines);
    return { ok: true, handled: true, lines };
  }

  if (/^else$/i.test(line)) {
    const block = ifStack[ifStack.length - 1];
    if (!block) return { ok: false, handled: true, log: `else without matching if: ${rawLine}` };
    if (block.hasElse) return { ok: false, handled: true, log: `Duplicate else in if block: ${rawLine}` };
    const lastElseLine = body[body.length - 1];
    const lines = [];
    if (!/^\s+jp\s+[^,\s]/.test(lastElseLine)) {
      lines.push(`    jp ${block.endLabel}`);
      block.hasEndJump = true;
    }
    lines.push(`${block.falseLabel}:`);
    block.hasElse = true;
    return { ok: true, handled: true, lines };
  }

  const _dep = checkIfDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  if (/^end\s+if$/i.test(line)) {
    const block = ifStack.pop();
    if (!block) return { ok: false, handled: true, log: `end if without matching if: ${rawLine}` };
    const lines = [];
    if (!block.hasElse) lines.push(`${block.falseLabel}:`);
    if (block.hasEndJump) lines.push(`${block.endLabel}:`);
    return { ok: true, handled: true, lines };
  }

  return { handled: false };
}
