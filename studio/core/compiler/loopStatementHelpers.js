import { checkWhileDeprecation, checkDoDeprecation } from "./deprecations.js";

export function handleWhileStatement({
  line,
  rawLine,
  whileStack,
  makeGeneratedLabel,
  emitConditionalJump
}) {
  const _dep = checkWhileDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const whileDecl = line.match(/^while\s+(?:(signed|unsigned)\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s*(==|!=|<>|<=|>=|<|>)\s*([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?|-?\$[0-9A-Fa-f]+|-?[0-9]+)$/i);
  if (whileDecl) {
    const loopLabel = makeGeneratedLabel("WhileLoop");
    const continueLabel = makeGeneratedLabel("WhileContinue");
    const exitLabel = makeGeneratedLabel("WhileExit");
    whileStack.push({ loopLabel, continueLabel, exitLabel });
    const signednessPrefix = whileDecl[1] ? `${whileDecl[1].toLowerCase()} ` : "";
    const code = emitConditionalJump(
      `${signednessPrefix}${whileDecl[2]} ${whileDecl[3] === "<>" ? "!=" : whileDecl[3]} ${whileDecl[4]}`,
      exitLabel,
      true
    );
    if (!code.ok) return { ok: false, handled: true, log: `Unsupported while comparison: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [`${loopLabel}:`, ...code.lines]
    };
  }

  if (/^end\s+while$/i.test(line)) {
    const loop = whileStack.pop();
    if (!loop) return { ok: false, handled: true, log: `while closer without matching while: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [`    jp ${loop.loopLabel}`, `${loop.exitLabel}:`]
    };
  }

  if (/^exit\s+while$/i.test(line)) {
    const loop = whileStack[whileStack.length - 1];
    if (!loop) return { ok: false, handled: true, log: `exit while without matching while: ${rawLine}` };
    return { ok: true, handled: true, lines: [`    jp ${loop.exitLabel}`] };
  }

  if (/^continue\s+while$/i.test(line)) {
    const loop = whileStack[whileStack.length - 1];
    if (!loop) return { ok: false, handled: true, log: `continue while without matching while: ${rawLine}` };
    return { ok: true, handled: true, lines: [`    jp ${loop.loopLabel}`] };
  }

  return { handled: false };
}

export function handleDoStatement({
  line,
  rawLine,
  doStack,
  makeGeneratedLabel,
  emitConditionalJump
}) {
  const _dep = checkDoDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const doDecl = line.match(/^do(?:\s+(while|until)\s+(.+))?$/i);
  if (doDecl) {
    const loopLabel = makeGeneratedLabel("DoLoop");
    const exitLabel = makeGeneratedLabel("DoExit");
    const continueLabel = makeGeneratedLabel("DoContinue");
    const lines = [`${loopLabel}:`];
    doStack.push({
      loopLabel,
      exitLabel,
      continueLabel,
      headKind: doDecl[1] ? doDecl[1].toLowerCase() : null,
      headCondition: doDecl[2] ? doDecl[2].trim() : null
    });
    if (doDecl[1]) {
      const branchWhenFalse = doDecl[1].toLowerCase() === "while";
      const code = emitConditionalJump(doDecl[2], exitLabel, branchWhenFalse);
      if (!code.ok) return { ok: false, handled: true, log: code.log };
      lines.push(...code.lines);
    }
    return { ok: true, handled: true, lines };
  }

  const loopDecl = line.match(/^loop(?:\s+(while|until)\s+(.+))?$/i);
  if (loopDecl) {
    const loop = doStack.pop();
    if (!loop) return { ok: false, handled: true, log: `do closer without matching do: ${rawLine}` };
    const tailKind = loopDecl[1] ? loopDecl[1].toLowerCase() : null;
    const tailCondition = loopDecl[2];
    if (loop.headKind && tailKind) {
      return { ok: false, handled: true, log: `do ${loop.headKind} ... loop ${loopDecl[1].toLowerCase()} mixes head and tail conditions: ${rawLine}` };
    }
    const lines = [`${loop.continueLabel}:`];
    if (tailKind) {
      const branchWhenFalse = tailKind === "until";
      const code = emitConditionalJump(tailCondition, loop.loopLabel, branchWhenFalse);
      if (!code.ok) return { ok: false, handled: true, log: code.log };
      lines.push(...code.lines);
    } else {
      lines.push(`    jp ${loop.loopLabel}`);
    }
    lines.push(`${loop.exitLabel}:`);
    return { ok: true, handled: true, lines };
  }

  if (/^exit\s+do$/i.test(line)) {
    const loop = doStack[doStack.length - 1];
    if (!loop) return { ok: false, handled: true, log: `exit do without matching do: ${rawLine}` };
    return { ok: true, handled: true, lines: [`    jp ${loop.exitLabel}`] };
  }

  if (/^continue\s+do$/i.test(line)) {
    const loop = doStack[doStack.length - 1];
    if (!loop) return { ok: false, handled: true, log: `continue do without matching do: ${rawLine}` };
    return { ok: true, handled: true, lines: [`    jp ${loop.continueLabel}`] };
  }

  return { handled: false };
}
