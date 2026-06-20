export function handleRoutineStatement({
  line,
  rawLine,
  body,
  normalizeExpression,
  parseRoutineInvocation,
  resolveValueType,
  isSafeExpression,
  emitRuntimeStore,
  currentFunction,
  emitCurrentProcReturnLines,
  emitLoadInt8Into,
  emitLoadInt16IntoHL,
  emitStoreExtended32,
  ensureCompareScratch32,
  makeGeneratedLabel,
  isKnownProcedureStatementName,
  procSignatures,
  splitTopLevelArgs,
  emitRoutineArgumentPushes,
  resolveJumpTarget,
  emitAdjustSpBy
}) {
  const setVar = line.match(/^set\s+(.+?)\s*=\s*(.+)$/i);
  if (setVar) {
    const name = setVar[1];
    const value = normalizeExpression(setVar[2].trim());
    const valueInvocation = parseRoutineInvocation(value);
    if (!resolveValueType(name) || (!isSafeExpression(value) && !valueInvocation)) {
      return { handled: true, ok: false, log: `Invalid runtime assignment: ${rawLine}` };
    }
    const storeCode = emitRuntimeStore(name, value);
    if (!storeCode) return { handled: true, ok: false, log: `Invalid runtime assignment types: ${rawLine}` };
    body.push(...storeCode);
    return { handled: true, ok: true };
  }

  if (/^return$/i.test(line)) {
    if (currentFunction) {
      return { handled: true, ok: false, log: `Function return requires a value: ${rawLine}` };
    }
    body.push(...emitCurrentProcReturnLines());
    return { handled: true, ok: true };
  }

  const returnValue = line.match(/^return\s+(.+)$/i);
  if (returnValue) {
    if (!currentFunction) {
      return { handled: true, ok: false, log: `Only functions can return a value: ${rawLine}` };
    }
    const valueToken = normalizeExpression(returnValue[1].trim());
    const returnType = currentFunction.returnType;
    let returnLines = null;
    if (returnType === "int8") {
      returnLines = emitLoadInt8Into("a", valueToken);
    } else if (returnType === "int16") {
      returnLines = emitLoadInt16IntoHL(valueToken);
    } else if (returnType === "u32" || returnType === "i32") {
      ensureCompareScratch32();
      returnLines = emitStoreExtended32(valueToken, "AMY_CMP_LEFT32");
    }
    if (!returnLines) {
      return { handled: true, ok: false, log: `Invalid function return value: ${rawLine}` };
    }
    body.push(...returnLines, ...emitCurrentProcReturnLines());
    return { handled: true, ok: true };
  }

  if (/^exit\s+sub$/i.test(line)) {
    body.push(...emitCurrentProcReturnLines());
    return { handled: true, ok: true };
  }

  if (/^exit\s+proc$/i.test(line)) {
    return { handled: true, ok: false, log: `EXIT PROC has been removed. Use 'return' or 'exit sub'. Offending line: ${rawLine}` };
  }

  if (/^loop\s+forever$/i.test(line)) {
    const foreverLabel = makeGeneratedLabel("Forever");
    body.push(`${foreverLabel}:`);
    body.push(`    jr ${foreverLabel}`);
    return { handled: true, ok: true };
  }

  const removedCallWithArgs = line.match(/^(call|gosub)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/i);
  if (removedCallWithArgs) {
    return { handled: true, ok: false, log: `CALL/GOSUB syntax has been removed. Use '${removedCallWithArgs[2]}(...)' instead. Offending line: ${rawLine}` };
  }

  const implicitCallMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
  if (implicitCallMatch && isKnownProcedureStatementName(implicitCallMatch[1])) {
    const procName = implicitCallMatch[1];
    const sig = procSignatures.get(procName) || [];
    const argsStr = implicitCallMatch[2].trim();
    const argTokens = argsStr ? splitTopLevelArgs(argsStr).map((s) => normalizeExpression(s.trim())) : [];
    if (argTokens.length !== sig.length) {
      return { handled: true, ok: false, log: `call ${procName}: expected ${sig.length} argument(s), got ${argTokens.length}: ${rawLine}` };
    }
    const prepared = emitRoutineArgumentPushes(procName, argTokens, sig, "call");
    if (!prepared) return { handled: true, ok: false, log: `call ${procName}: cannot prepare arguments: ${rawLine}` };
    body.push(...prepared.lines);
    body.push(`    call ${resolveJumpTarget(procName)}`);
    body.push(...emitAdjustSpBy(prepared.cleanupBytes));
    return { handled: true, ok: true };
  }

  const implicitBareCall = line.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
  if (implicitBareCall && isKnownProcedureStatementName(implicitBareCall[1])) {
    body.push(`    call ${resolveJumpTarget(implicitBareCall[1])}`);
    return { handled: true, ok: true };
  }

  const includeAsm = line.match(/^include\s+asm\s+"([^"]+)"$/i);
  if (includeAsm) {
    body.push(`include "${includeAsm[1]}"`);
    return { handled: true, ok: true };
  }

  return { handled: false };
}
