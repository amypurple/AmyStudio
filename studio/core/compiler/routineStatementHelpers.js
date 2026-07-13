const ASM_CALL_LABEL_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ASM_CALL_ARG_RE = /^(a|b|c|d|e|h|l|hl|de|bc)\s*=\s*(.+)$/i;
const ASM_WORD_REG_BYTES = new Map([
  ["hl", ["h", "l"]],
  ["de", ["d", "e"]],
  ["bc", ["b", "c"]]
]);

function parseAsmCallArgs(argsText, splitTopLevelArgs, normalizeExpression, rawLine) {
  const args = new Map();
  if (!argsText || !argsText.trim()) return { ok: true, args };
  const parts = splitTopLevelArgs(argsText);
  for (const part of parts) {
    const match = part.trim().match(ASM_CALL_ARG_RE);
    if (!match) {
      return { ok: false, log: `Invalid ASM call argument '${part.trim()}'. Use register = expression: ${rawLine}` };
    }
    const reg = match[1].toLowerCase();
    if (args.has(reg)) {
      return { ok: false, log: `Duplicate ASM call register '${reg}': ${rawLine}` };
    }
    args.set(reg, normalizeExpression(match[2].trim()));
  }
  for (const [wordReg, bytes] of ASM_WORD_REG_BYTES) {
    if (!args.has(wordReg)) continue;
    for (const byteReg of bytes) {
      if (args.has(byteReg)) {
        return { ok: false, log: `ASM call cannot set both '${wordReg}' and '${byteReg}' in the same call: ${rawLine}` };
      }
    }
  }
  return { ok: true, args };
}

function emitAsmWordLoad(target, token, emitLoadInt16IntoHL) {
  const lines = emitLoadInt16IntoHL(token);
  if (!lines) return null;
  if (target === "hl") return lines;
  if (target === "de") return [...lines, "    ex de,hl"];
  if (target === "bc") return [...lines, "    ld b,h", "    ld c,l"];
  return null;
}

function emitAsmCallArgLoads(args, rawLine, emitLoadInt8Into, emitLoadInt16IntoHL) {
  const lines = [];
  const has = (reg) => args.has(reg);

  if (has("hl")) {
    const load = emitAsmWordLoad("hl", args.get("hl"), emitLoadInt16IntoHL);
    if (!load) return { ok: false, log: `Invalid ASM call HL argument: ${rawLine}` };
    lines.push(...load);
    if (has("de") || has("bc")) lines.push("    push hl");
  }

  if (has("de")) {
    const load = emitAsmWordLoad("de", args.get("de"), emitLoadInt16IntoHL);
    if (!load) return { ok: false, log: `Invalid ASM call DE argument: ${rawLine}` };
    lines.push(...load);
    if (has("bc")) lines.push("    push de");
  }

  if (has("bc")) {
    const load = emitAsmWordLoad("bc", args.get("bc"), emitLoadInt16IntoHL);
    if (!load) return { ok: false, log: `Invalid ASM call BC argument: ${rawLine}` };
    lines.push(...load);
  }

  if (has("bc") && has("de")) lines.push("    pop de");
  if (has("hl") && (has("de") || has("bc"))) lines.push("    pop hl");

  for (const reg of ["b", "c", "d", "e", "h", "l", "a"]) {
    if (!has(reg)) continue;
    const load = emitLoadInt8Into(reg, args.get(reg));
    if (!load) return { ok: false, log: `Invalid ASM call ${reg.toUpperCase()} argument: ${rawLine}` };
    lines.push(...load);
  }

  return { ok: true, lines };
}

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

  const includeAsm = line.match(/^include\s+asm\s+"([^"]+)"$/i);
  if (includeAsm) {
    body.push(`include "${includeAsm[1]}"`);
    return { handled: true, ok: true };
  }

  const callAsm = line.match(/^call\s+asm\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:with|using)\s+(.+))?$/i);
  if (callAsm) {
    const label = callAsm[1];
    if (!ASM_CALL_LABEL_RE.test(label)) {
      return { handled: true, ok: false, log: `Invalid ASM call label: ${rawLine}` };
    }
    const parsedArgs = parseAsmCallArgs(callAsm[2] || "", splitTopLevelArgs, normalizeExpression, rawLine);
    if (!parsedArgs.ok) return { handled: true, ok: false, log: parsedArgs.log };
    const argLoads = emitAsmCallArgLoads(parsedArgs.args, rawLine, emitLoadInt8Into, emitLoadInt16IntoHL);
    if (!argLoads.ok) return { handled: true, ok: false, log: argLoads.log };
    body.push(...argLoads.lines);
    body.push(`    call ${label}`);
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

  return { handled: false };
}
