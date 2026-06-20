import { checkForDeprecation } from "./deprecations.js";

export function handleForStatement({
  line,
  rawLine,
  forStack,
  getRuntimeInfo,
  emitRuntimeStore,
  normalizeExpression,
  makeGeneratedLabel,
  analyzeForStep,
  tryEvaluateCompileTimeNumericExpression,
  normalizeDeclaredType,
  resolveDeclaredValueType,
  emitCompareGoto,
  isSignedDeclaredType,
  emitLoadInt8Into,
  emitStoreInt8FromA,
  emitLoadInt16IntoHL,
  emitStoreInt16FromHL
}) {
  const _dep = checkForDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const forDownto = line.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|from)\s*(.+?)\s+downto\s+(.+?)(?:\s+step\s+(.+?))?\s*:?$/i);
  if (forDownto) {
    const info = getRuntimeInfo(forDownto[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) {
      return { ok: false, handled: true, log: `for..downto loop variable must be a scalar byte/integer variable: ${rawLine}` };
    }
    const initCode = emitRuntimeStore(forDownto[1], normalizeExpression(forDownto[2]));
    if (!initCode) return { ok: false, handled: true, log: `Invalid for-loop start value: ${rawLine}` };
    const loopLabel = makeGeneratedLabel("ForLoop");
    const exitLabel = makeGeneratedLabel("ForExit");
    const continueLabel = makeGeneratedLabel("ForContinue");
    const stepAnalysis = analyzeForStep(normalizeExpression(forDownto[4] || "1"), "down");
    if (stepAnalysis.error) return { ok: false, handled: true, log: `${stepAnalysis.error} ${rawLine}` };
    forStack.push({
      name: forDownto[1],
      endToken: normalizeExpression(forDownto[3]),
      stepToken: stepAnalysis.magnitudeToken,
      type: info.type,
      declaredType: normalizeDeclaredType(info.declaredType || resolveDeclaredValueType(forDownto[1]) || info.type),
      loopLabel,
      continueLabel,
      exitLabel,
      direction: "down"
    });
    const lines = [...initCode, `${loopLabel}:`];
    const exitCode = emitCompareGoto(forDownto[1], "<", normalizeExpression(forDownto[3]), exitLabel);
    if (!exitCode) return { ok: false, handled: true, log: `Unsupported downto-loop bound comparison: ${rawLine}` };
    lines.push(...exitCode);
    return { ok: true, handled: true, lines };
  }

  const forDecl = line.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|from)\s*(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+?))?\s*:?$/i);
  if (forDecl) {
    const info = getRuntimeInfo(forDecl[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) {
      return { ok: false, handled: true, log: `for loop variable must be a scalar byte/integer variable: ${rawLine}` };
    }
    const initCode = emitRuntimeStore(forDecl[1], normalizeExpression(forDecl[2]));
    if (!initCode) return { ok: false, handled: true, log: `Invalid for-loop start value: ${rawLine}` };
    const loopLabel = makeGeneratedLabel("ForLoop");
    const exitLabel = makeGeneratedLabel("ForExit");
    const continueLabel = makeGeneratedLabel("ForContinue");
    const stepAnalysis = analyzeForStep(normalizeExpression(forDecl[4] || "1"), "up");
    if (stepAnalysis.error) return { ok: false, handled: true, log: `${stepAnalysis.error} ${rawLine}` };
    const declaredType = normalizeDeclaredType(info.declaredType || resolveDeclaredValueType(forDecl[1]) || info.type);
    const startValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(normalizeExpression(forDecl[2]))
      : null;
    const endValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(normalizeExpression(forDecl[3]))
      : null;
    const stepValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(stepAnalysis.magnitudeToken)
      : null;
    const canUseSmallU8Loop = info.type === "int8"
      && !isSignedDeclaredType(declaredType)
      && info.scope === "global"
      && info.asmName
      && stepAnalysis.direction === "up"
      && stepValue === 1
      && Number.isInteger(startValue)
      && Number.isInteger(endValue)
      && startValue >= 0
      && startValue <= endValue
      && endValue < 255;
    forStack.push({
      name: forDecl[1],
      endToken: normalizeExpression(forDecl[3]),
      stepToken: stepAnalysis.magnitudeToken,
      type: info.type,
      declaredType,
      loopLabel,
      continueLabel,
      exitLabel,
      direction: stepAnalysis.direction,
      smallU8: canUseSmallU8Loop ? {
        asmName: info.asmName,
        exclusiveEnd: endValue + 1
      } : null
    });
    const lines = [...initCode, `${loopLabel}:`];
    if (!canUseSmallU8Loop) {
      const exitCode = emitCompareGoto(
        forDecl[1],
        stepAnalysis.direction === "down" ? "<" : ">",
        normalizeExpression(forDecl[3]),
        exitLabel
      );
      if (!exitCode) return { ok: false, handled: true, log: `Unsupported for-loop bound comparison: ${rawLine}` };
      lines.push(...exitCode);
    }
    return { ok: true, handled: true, lines };
  }

  const nextDecl = line.match(/^(?:next(?:\s+([A-Za-z_][A-Za-z0-9_]*))?|end\s+for)$/i);
  if (nextDecl) {
    const loop = forStack.pop();
    if (!loop) return { ok: false, handled: true, log: `for closer without matching for: ${rawLine}` };
    if (nextDecl[1] && nextDecl[1] !== loop.name) {
      return { ok: false, handled: true, log: `next ${nextDecl[1]} does not match for ${loop.name}: ${rawLine}` };
    }
    const lines = [`${loop.continueLabel}:`];
    if (loop.smallU8) {
      lines.push(`    ld hl,${loop.smallU8.asmName}`);
      lines.push("    inc (hl)");
      lines.push("    ld a,(hl)");
      lines.push(`    cp ${loop.smallU8.exclusiveEnd}`);
      lines.push(`    jp c,${loop.loopLabel}`);
      lines.push(`${loop.exitLabel}:`);
      return { ok: true, handled: true, lines };
    }
    if (loop.direction === "down") {
      const unsignedDownLoop = !isSignedDeclaredType(loop.declaredType);
      if (loop.type === "int8") {
        lines.push(...emitLoadInt8Into("a", loop.name));
        lines.push("    ld b,a");
        const loadStep = emitLoadInt8Into("a", loop.stepToken);
        if (!loadStep) return { ok: false, handled: true, log: `Unsupported for-loop step value for ${loop.name}` };
        lines.push(...loadStep);
        lines.push("    ld c,a");
        lines.push("    ld a,b");
        lines.push("    sub c");
        if (unsignedDownLoop) lines.push(`    jp c,${loop.exitLabel}`);
        lines.push(...emitStoreInt8FromA(loop.name));
      } else {
        lines.push(...emitLoadInt16IntoHL(loop.name));
        lines.push("    push hl");
        const loadStep = emitLoadInt16IntoHL(loop.stepToken);
        if (!loadStep) return { ok: false, handled: true, log: `Unsupported for-loop step value for ${loop.name}` };
        lines.push(...loadStep);
        lines.push("    ex de,hl");
        lines.push("    pop hl");
        lines.push("    or a");
        lines.push("    sbc hl,de");
        if (unsignedDownLoop) lines.push(`    jp c,${loop.exitLabel}`);
        lines.push(...emitStoreInt16FromHL(loop.name));
      }
    } else if (loop.type === "int8") {
      lines.push(...emitLoadInt8Into("a", loop.name));
      lines.push("    ld b,a");
      const loadStep = emitLoadInt8Into("a", loop.stepToken);
      if (!loadStep) return { ok: false, handled: true, log: `Unsupported for-loop step value for ${loop.name}` };
      lines.push(...loadStep);
      lines.push("    add a,b");
      lines.push(...emitStoreInt8FromA(loop.name));
    } else {
      lines.push(...emitLoadInt16IntoHL(loop.name));
      lines.push("    push hl");
      const loadStep = emitLoadInt16IntoHL(loop.stepToken);
      if (!loadStep) return { ok: false, handled: true, log: `Unsupported for-loop step value for ${loop.name}` };
      lines.push(...loadStep);
      lines.push("    ex de,hl");
      lines.push("    pop hl");
      lines.push("    add hl,de");
      lines.push(...emitStoreInt16FromHL(loop.name));
    }
    lines.push(`    jp ${loop.loopLabel}`);
    lines.push(`${loop.exitLabel}:`);
    return { ok: true, handled: true, lines };
  }

  if (/^exit\s+for$/i.test(line)) {
    const loop = forStack[forStack.length - 1];
    if (!loop) return { ok: false, handled: true, log: `exit for without matching for: ${rawLine}` };
    return { ok: true, handled: true, lines: [`    jp ${loop.exitLabel}`] };
  }

  if (/^continue\s+for$/i.test(line)) {
    const loop = forStack[forStack.length - 1];
    if (!loop) return { ok: false, handled: true, log: `continue for without matching for: ${rawLine}` };
    return { ok: true, handled: true, lines: [`    jp ${loop.continueLabel}`] };
  }

  return { handled: false };
}
