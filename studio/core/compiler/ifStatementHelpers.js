import { checkIfDeprecation } from "./deprecations.js";

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
    const elseParts = splitTopLevelKeyword(inlineTail, "else");
    if (elseParts.length > 2) {
      return { ok: false, handled: true, log: `Single-line if supports at most one else: ${rawLine}` };
    }
    if (elseParts.length === 2) {
      const thenResult = compileInlineStatement(elseParts[0].trim(), rawLine);
      if (!thenResult.ok) return { ok: false, handled: true, log: thenResult.log };
      const elseResult = compileInlineStatement(elseParts[1].trim(), rawLine);
      if (!elseResult.ok) return { ok: false, handled: true, log: elseResult.log };
      const elseLabel = makeGeneratedLabel("IfElse");
      const endLabel = makeGeneratedLabel("IfEnd");
      const code = emitConditionalJump(conditionText, elseLabel, true);
      if (!code.ok) return { ok: false, handled: true, log: code.log };
      return {
        ok: true,
        handled: true,
        lines: [...code.lines, ...thenResult.lines, `    jp ${endLabel}`, `${elseLabel}:`, ...elseResult.lines, `${endLabel}:`]
      };
    }
    const inlineResult = compileInlineStatement(inlineTail, rawLine);
    if (!inlineResult.ok) return { ok: false, handled: true, log: inlineResult.log };
    const falseLabel = makeGeneratedLabel("IfFalse");
    const code = emitConditionalJump(conditionText, falseLabel, true);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return {
      ok: true,
      handled: true,
      lines: [...code.lines, ...inlineResult.lines, `${falseLabel}:`]
    };
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
