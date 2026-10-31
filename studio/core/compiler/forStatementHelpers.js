import { checkForDeprecation } from "./deprecations.js";

export function handleForStatement({
  line,
  rawLine,
  forStack,
  getRuntimeInfo,
  parseRecordFieldRef,
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
  emitStoreInt16FromHL,
  isAnyFixedDeclaredType,
  captureForRuntimeValue,
  useConstantDownStep = true
}) {
  const _dep = checkForDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const isFixedDeclared = (declared) => typeof isAnyFixedDeclaredType === 'function' && isAnyFixedDeclaredType(normalizeDeclaredType(declared));
  const rejectFixedLoopVariable = (name) => ({
    ok: false,
    handled: true,
    log: "for loop variable cannot be fixed/ufixed; use a u8/u16 counter or 'whole " + name + "': " + rawLine
  });
  const rejectFixedLoopBound = (token) => ({
    ok: false,
    handled: true,
    log: "for loop bound cannot be fixed/ufixed; use 'whole " + token + "' as the loop bound: " + rawLine
  });
  const qualifiedCounterPattern = String.raw`([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?(?:\.[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)*)`;
  const resolveCounterInfo = (name) => {
    const field = parseRecordFieldRef(name);
    if (!field) return getRuntimeInfo(name);
    const baseInfo = getRuntimeInfo(field.name);
    const staticAddressable = field.baseKind === "scalar"
      && !field.index
      && !(field.arrayFieldOffsets || []).length
      && baseInfo?.asmName;
    return {
      kind: "record_field",
      type: field.fieldInfo.type,
      declaredType: field.fieldInfo.declaredType,
      scope: baseInfo?.scope,
      asmName: staticAddressable
        ? `${baseInfo.asmName}${field.totalOffset ? ` + ${field.totalOffset}` : ""}`
        : null
    };
  };

  const forDownto = line.match(new RegExp(`^for\\s+${qualifiedCounterPattern}\\s*(?:=|from)\\s*(.+?)\\s+downto\\s+(.+?)(?:\\s+step\\s+(.+?))?\\s*:?$`, "i"));
  if (forDownto) {
    const info = resolveCounterInfo(forDownto[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) {
      return { ok: false, handled: true, log: `for..downto loop variable must be a scalar byte/integer variable: ${rawLine}` };
    }
    const declaredType = normalizeDeclaredType(info.declaredType || resolveDeclaredValueType(forDownto[1]) || info.type);
    if (isFixedDeclared(declaredType)) return rejectFixedLoopVariable(forDownto[1]);
    const endDeclaredType = resolveDeclaredValueType(normalizeExpression(forDownto[3]));
    if (isFixedDeclared(endDeclaredType)) return rejectFixedLoopBound(forDownto[3]);
    const initCode = emitRuntimeStore(forDownto[1], normalizeExpression(forDownto[2]));
    if (!initCode) return { ok: false, handled: true, log: `Invalid for-loop start value: ${rawLine}` };
    const loopLabel = makeGeneratedLabel("ForLoop");
    const exitLabel = makeGeneratedLabel("ForExit");
    const continueLabel = makeGeneratedLabel("ForContinue");
    const stepAnalysis = analyzeForStep(normalizeExpression(forDownto[4] || "1"), "down");
    if (stepAnalysis.error) return { ok: false, handled: true, log: `${stepAnalysis.error} ${rawLine}` };
    const stepValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(stepAnalysis.magnitudeToken)
      : null;
    const endValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(normalizeExpression(forDownto[3]))
      : null;
    const omitInitialBoundCheck = !isSignedDeclaredType(declaredType) && endValue === 0;
    const endToken = normalizeExpression(forDownto[3]);
    const capturedEnd = endValue === null && typeof captureForRuntimeValue === "function"
      ? captureForRuntimeValue("bound", forStack.length, endToken, info.type, declaredType)
      : null;
    const capturedStep = stepValue === null && typeof captureForRuntimeValue === "function"
      ? captureForRuntimeValue("step", forStack.length, stepAnalysis.magnitudeToken, info.type, declaredType)
      : null;
    if (capturedEnd?.error) return { ok: false, handled: true, log: capturedEnd.error };
    if (capturedStep?.error) return { ok: false, handled: true, log: capturedStep.error };
    const stableEndToken = capturedEnd?.token || endToken;
    const stableStepToken = capturedStep?.token || stepAnalysis.magnitudeToken;
    forStack.push({
      name: forDownto[1],
      endToken: stableEndToken,
      stepToken: stableStepToken,
      type: info.type,
      declaredType,
      loopLabel,
      continueLabel,
      exitLabel,
      direction: "down",
      constantStep: Number.isInteger(stepValue) ? stepValue : null
    });
    const lines = [
      ...initCode,
      ...(capturedEnd?.lines || []),
      ...(capturedStep?.lines || []),
      `${loopLabel}:`
    ];
    // An unsigned byte/word can never be below zero. The subtraction at NEXT
    // already exits on borrow, so a zero lower bound needs no per-iteration test.
    if (!omitInitialBoundCheck) {
      const exitCode = emitCompareGoto(forDownto[1], "<", stableEndToken, exitLabel);
      if (!exitCode) return { ok: false, handled: true, log: `Unsupported downto-loop bound comparison: ${rawLine}` };
      lines.push(...exitCode);
    }
    return { ok: true, handled: true, lines };
  }

  const forDecl = line.match(new RegExp(`^for\\s+${qualifiedCounterPattern}\\s*(?:=|from)\\s*(.+?)\\s+to\\s+(.+?)(?:\\s+step\\s+(.+?))?\\s*:?$`, "i"));
  if (forDecl) {
    const info = resolveCounterInfo(forDecl[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) {
      return { ok: false, handled: true, log: `for loop variable must be a scalar byte/integer variable: ${rawLine}` };
    }
    const declaredType = normalizeDeclaredType(info.declaredType || resolveDeclaredValueType(forDecl[1]) || info.type);
    if (isFixedDeclared(declaredType)) return rejectFixedLoopVariable(forDecl[1]);
    const endDeclaredType = resolveDeclaredValueType(normalizeExpression(forDecl[3]));
    if (isFixedDeclared(endDeclaredType)) return rejectFixedLoopBound(forDecl[3]);
    const initCode = emitRuntimeStore(forDecl[1], normalizeExpression(forDecl[2]));
    if (!initCode) return { ok: false, handled: true, log: `Invalid for-loop start value: ${rawLine}` };
    const loopLabel = makeGeneratedLabel("ForLoop");
    const exitLabel = makeGeneratedLabel("ForExit");
    const continueLabel = makeGeneratedLabel("ForContinue");
    const stepAnalysis = analyzeForStep(normalizeExpression(forDecl[4] || "1"), "up");
    if (stepAnalysis.error) return { ok: false, handled: true, log: `${stepAnalysis.error} ${rawLine}` };
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
    const omitInitialDownBoundCheck = stepAnalysis.direction === "down"
      && !isSignedDeclaredType(declaredType)
      && endValue === 0;
    const endToken = normalizeExpression(forDecl[3]);
    const capturedEnd = endValue === null && typeof captureForRuntimeValue === "function"
      ? captureForRuntimeValue("bound", forStack.length, endToken, info.type, declaredType)
      : null;
    const capturedStep = stepValue === null && typeof captureForRuntimeValue === "function"
      ? captureForRuntimeValue("step", forStack.length, stepAnalysis.magnitudeToken, info.type, declaredType)
      : null;
    if (capturedEnd?.error) return { ok: false, handled: true, log: capturedEnd.error };
    if (capturedStep?.error) return { ok: false, handled: true, log: capturedStep.error };
    const stableEndToken = capturedEnd?.token || endToken;
    const stableStepToken = capturedStep?.token || stepAnalysis.magnitudeToken;
    forStack.push({
      name: forDecl[1],
      endToken: stableEndToken,
      stepToken: stableStepToken,
      type: info.type,
      declaredType,
      loopLabel,
      continueLabel,
      exitLabel,
      direction: stepAnalysis.direction,
      constantStep: Number.isInteger(stepValue) ? stepValue : null,
      smallU8: canUseSmallU8Loop ? {
        asmName: info.asmName,
        exclusiveEnd: endValue + 1
      } : null
    });
    const lines = [
      ...initCode,
      ...(capturedEnd?.lines || []),
      ...(capturedStep?.lines || []),
      `${loopLabel}:`
    ];
    if (!canUseSmallU8Loop && !omitInitialDownBoundCheck) {
      const exitCode = emitCompareGoto(
        forDecl[1],
        stepAnalysis.direction === "down" ? "<" : ">",
        stableEndToken,
        exitLabel
      );
      if (!exitCode) return { ok: false, handled: true, log: `Unsupported for-loop bound comparison: ${rawLine}` };
      lines.push(...exitCode);
    }
    return { ok: true, handled: true, lines };
  }

  const nextDecl = line.match(new RegExp(`^(?:next(?:\\s+${qualifiedCounterPattern})?|end\\s+for)$`, "i"));
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
      if (loop.recordIxIterator) {
        if (loop.recordIxIterator.recordSize <= 2) {
          for (let offset = 0; offset < loop.recordIxIterator.recordSize; offset += 1) lines.push("    inc ix");
        } else {
          lines.push(`    ld de,${loop.recordIxIterator.recordSize}`);
          lines.push("    add ix,de");
        }
      }
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
        if (useConstantDownStep && Number.isInteger(loop.constantStep) && loop.constantStep >= 1 && loop.constantStep <= 255) {
          lines.push(`    sub ${loop.constantStep}`);
        } else {
          lines.push("    ld b,a");
          const loadStep = emitLoadInt8Into("a", loop.stepToken);
          if (!loadStep) return { ok: false, handled: true, log: `Unsupported for-loop step value for ${loop.name}` };
          lines.push(...loadStep);
          lines.push("    ld c,a");
          lines.push("    ld a,b");
          lines.push("    sub c");
        }
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
      const unsignedUpLoop = !isSignedDeclaredType(loop.declaredType);
      lines.push(...emitLoadInt8Into("a", loop.name));
      if (loop.constantStep === 1) {
        lines.push("    inc a");
        if (unsignedUpLoop) lines.push(`    jp z,${loop.exitLabel}`);
      } else {
        lines.push("    ld b,a");
        const loadStep = emitLoadInt8Into("a", loop.stepToken);
        if (!loadStep) return { ok: false, handled: true, log: `Unsupported for-loop step value for ${loop.name}` };
        lines.push(...loadStep);
        lines.push("    add a,b");
        if (unsignedUpLoop) lines.push(`    jp c,${loop.exitLabel}`);
      }
      lines.push(...emitStoreInt8FromA(loop.name));
    } else {
      const unsignedUpLoop = !isSignedDeclaredType(loop.declaredType);
      lines.push(...emitLoadInt16IntoHL(loop.name));
      if (loop.constantStep === 1) {
        lines.push("    inc hl");
        if (unsignedUpLoop) {
          lines.push("    ld a,h");
          lines.push("    or l");
          lines.push(`    jp z,${loop.exitLabel}`);
        }
      } else {
        lines.push("    push hl");
        const loadStep = emitLoadInt16IntoHL(loop.stepToken);
        if (!loadStep) return { ok: false, handled: true, log: `Unsupported for-loop step value for ${loop.name}` };
        lines.push(...loadStep);
        lines.push("    ex de,hl");
        lines.push("    pop hl");
        lines.push("    add hl,de");
        if (unsignedUpLoop) lines.push(`    jp c,${loop.exitLabel}`);
      }
      lines.push(...emitStoreInt16FromHL(loop.name));
    }
    if (loop.recordIxIterator) {
      if (loop.recordIxIterator.recordSize <= 2) {
        for (let offset = 0; offset < loop.recordIxIterator.recordSize; offset += 1) lines.push("    inc ix");
      } else {
        lines.push(`    ld de,${loop.recordIxIterator.recordSize}`);
        lines.push("    add ix,de");
      }
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
