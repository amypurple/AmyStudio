import { emitLoadRoutineByteInputsFromTokens } from "./routineRegisterLoadHelpers.js";

export function createInlineStatementCompiler(ctx) {
  const {
    currentFunctionRef,
    doStack,
    whileStack,
    forStack,
    normalizeExpression,
    emitCurrentProcReturnLines,
    emitLoadInt8Into,
    emitLoadInt16IntoHL,
    emitStoreExtended32,
    parseFormulaAssignment,
    emitFormulaAssignment,
    emitTextLiteral,
    emitLoadInt8ValueInto,
    emitLoadInt8ValueIntoPreserving,
    tryEvaluateByteConstantExpression,
    formatHex16,
    splitTopLevelArgs,
    emitPrintAtDense,
    emitPrintAutoAt,
    isKnownProcedureStatementName,
    procSignatures,
    emitRoutineArgumentPushes,
    resolveJumpTarget,
    emitAdjustSpBy,
    resolveSourceJumpTarget,
    formatUnknownJumpTargetLog,
    emitClearValue,
    resolveValueType,
    emitU32Inc,
    emitArith32Op,
    emitStoreInt8FromA,
    emitStoreInt16FromHL,
    getRuntimeInfo,
    getByteArrayBufferInfo,
    dataLengths,
    emitLoadSourceAddressIntoHL,
    emitLoadArrayAddressIntoHL,
    emitLoadCountIntoBC,
    isDefinitelyByteSizedCount,
    ensureCompareScratch32,
    emitBcdAdd,
    emitBcdSub,
    emitArithInt8Op,
    emitArithInt16Op
  } = ctx;

  return function compileInlineStatement(inlineStmt, rawLineText) {
    let inlineLines = null;
    const currentFunction = currentFunctionRef();
    if (/^return$/i.test(inlineStmt)) {
      if (currentFunction) return { ok: false, lines: [], log: `Function return requires a value: ${rawLineText}` };
      inlineLines = emitCurrentProcReturnLines();
    } else {
      const inlineReturnValue = inlineStmt.match(/^return\s+(.+)$/i);
      if (inlineReturnValue) {
        if (!currentFunction) return { ok: false, lines: [], log: `Only functions can return a value: ${rawLineText}` };
        const valueToken = normalizeExpression(inlineReturnValue[1].trim());
        const returnType = currentFunction.returnType;
        if (returnType === "int8") inlineLines = emitLoadInt8Into("a", valueToken);
        else if (returnType === "int16") inlineLines = emitLoadInt16IntoHL(valueToken);
        else if (returnType === "u32" || returnType === "i32") {
          ensureCompareScratch32();
          inlineLines = emitStoreExtended32(valueToken, "AMY_CMP_LEFT32");
        }
        if (!inlineLines) return { ok: false, lines: [], log: `Invalid function return value: ${rawLineText}` };
        inlineLines = [...inlineLines, ...emitCurrentProcReturnLines()];
      } else if (/^exit\s+sub$/i.test(inlineStmt)) {
        inlineLines = emitCurrentProcReturnLines();
      } else if (/^exit\s+proc$/i.test(inlineStmt)) {
        return { ok: false, lines: [], log: `EXIT PROC has been removed. Use 'return' or 'exit sub': ${rawLineText}` };
      } else if (/^exit\s+do$/i.test(inlineStmt)) {
        const loop = doStack[doStack.length - 1];
        if (!loop) return { ok: false, lines: [], log: `exit do without matching do: ${rawLineText}` };
        inlineLines = [`    jp ${loop.exitLabel}`];
      } else if (/^continue\s+do$/i.test(inlineStmt)) {
        const loop = doStack[doStack.length - 1];
        if (!loop) return { ok: false, lines: [], log: `continue do without matching do: ${rawLineText}` };
        inlineLines = [`    jp ${loop.continueLabel}`];
      } else if (/^exit\s+while$/i.test(inlineStmt)) {
        const loop = whileStack[whileStack.length - 1];
        if (!loop) return { ok: false, lines: [], log: `exit while without matching while: ${rawLineText}` };
        inlineLines = [`    jp ${loop.exitLabel}`];
      } else if (/^continue\s+while$/i.test(inlineStmt)) {
        const loop = whileStack[whileStack.length - 1];
        if (!loop) return { ok: false, lines: [], log: `continue while without matching while: ${rawLineText}` };
        inlineLines = [`    jp ${loop.loopLabel}`];
      } else if (/^exit\s+for$/i.test(inlineStmt)) {
        const loop = forStack[forStack.length - 1];
        if (!loop) return { ok: false, lines: [], log: `exit for without matching for: ${rawLineText}` };
        inlineLines = [`    jp ${loop.exitLabel}`];
      } else if (/^continue\s+for$/i.test(inlineStmt)) {
        const loop = forStack[forStack.length - 1];
        if (!loop) return { ok: false, lines: [], log: `continue for without matching for: ${rawLineText}` };
        inlineLines = [`    jp ${loop.continueLabel}`];
      } else {
        const inlineSet = inlineStmt.match(/^set\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s*=\s*(.+)$/i);
        const inlineFormulaAssignment = parseFormulaAssignment(inlineStmt);
        if (inlineSet || inlineFormulaAssignment) {
          const target = inlineSet ? inlineSet[1] : inlineFormulaAssignment.target;
          const op = inlineSet ? "=" : inlineFormulaAssignment.op;
          const value = inlineSet ? normalizeExpression(inlineSet[2]) : inlineFormulaAssignment.value;
          inlineLines = emitFormulaAssignment(target, op, value);
          if (!inlineLines) return { ok: false, lines: [], log: `Invalid runtime assignment: ${rawLineText}` };
        } else {
          const inlineGetCharAssign = inlineStmt.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:get|read)\s+(?:char|tile)\s+at\s+(.+?)\s*,\s*(.+)$/i);
          if (inlineGetCharAssign) {
            const targetInfo = getRuntimeInfo(inlineGetCharAssign[1]);
            const loadInputs = emitLoadRoutineByteInputsFromTokens({
              routineName: "AMY_GET_CHAR_AT",
              values: { e: inlineGetCharAssign[2], d: inlineGetCharAssign[3] },
              emitLoadInt8Into,
              emitLoadInt8ValueInto,
              emitLoadInt8ValueIntoPreserving
            });
            if (!targetInfo || targetInfo.type !== "int8" || !loadInputs) {
              return { ok: false, lines: [], log: `Invalid inline get char assignment: ${rawLineText}` };
            }
            inlineLines = [...loadInputs, "    call AMY_GET_CHAR_AT", ...emitStoreInt8FromA(inlineGetCharAssign[1])];
          } else {
            const inlineGetCountAssign = inlineStmt.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:get|read)\s+count\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
            if (inlineGetCountAssign) {
              const targetInfo = getByteArrayBufferInfo(inlineGetCountAssign[1], 1);
              const loadCount = emitLoadCountIntoBC(inlineGetCountAssign[2]);
              const loadX = emitLoadInt8ValueInto("e", inlineGetCountAssign[3]);
              const loadY = emitLoadInt8ValueInto("d", inlineGetCountAssign[4]);
              const loadTarget = emitLoadArrayAddressIntoHL(inlineGetCountAssign[1], "0");
              if (!targetInfo || !loadCount || !loadX || !loadY || !loadTarget) {
                return { ok: false, lines: [], log: `Invalid inline get count assignment: ${rawLineText}` };
              }
              inlineLines = [
                ...loadY,
                ...loadX,
                "    call CALC_OFFSET",
                "    push de",
                "    ld hl,($73F6)",
                "    pop de",
                "    add hl,de",
                "    ex de,hl",
                ...loadTarget,
                ...loadCount,
                `    call ${isDefinitelyByteSizedCount(inlineGetCountAssign[2]) ? "READ_VRAM" : "AMY_GET_VRAM"}`
              ];
            } else {
              const inlineGetFrameAssign = inlineStmt.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:get|read)\s+frame\s+size\s+(.+?)\s*,\s*(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
              if (inlineGetFrameAssign) {
                const targetInfo = getByteArrayBufferInfo(inlineGetFrameAssign[1], 1);
                const loadInputs = emitLoadRoutineByteInputsFromTokens({
                  routineName: "GET_BKGRND",
                  values: { b: inlineGetFrameAssign[3], c: inlineGetFrameAssign[2], d: inlineGetFrameAssign[5], e: inlineGetFrameAssign[4] },
                  emitLoadInt8Into,
                  emitLoadInt8ValueInto,
                  emitLoadInt8ValueIntoPreserving
                });
                const loadTarget = emitLoadArrayAddressIntoHL(inlineGetFrameAssign[1], "0");
                if (!targetInfo || !loadInputs || !loadTarget) {
                  return { ok: false, lines: [], log: `Invalid inline get frame assignment: ${rawLineText}` };
                }
                inlineLines = [
                  ...loadTarget,
                  ...loadInputs,
                  "    push ix",
                  "    push iy",
                  "    call GET_BKGRND",
                  "    pop iy",
                  "    pop ix"
                ];
              } else {
                const inlinePutCountAt = inlineStmt.match(/^put\s+([A-Za-z_][A-Za-z0-9_]*)\s+count\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
                if (inlinePutCountAt) {
                  const loadSource = emitLoadSourceAddressIntoHL(inlinePutCountAt[1]);
                  const loadInputs = emitLoadRoutineByteInputsFromTokens({
                    routineName: "AMY_PUT_AT",
                    values: { b: inlinePutCountAt[2], e: inlinePutCountAt[3], d: inlinePutCountAt[4] },
                    emitLoadInt8Into,
                    emitLoadInt8ValueInto,
                    emitLoadInt8ValueIntoPreserving
                  });
                  if (!loadSource || !loadInputs) {
                    return { ok: false, lines: [], log: `Invalid inline put count statement: ${rawLineText}` };
                  }
                  inlineLines = [...loadSource, ...loadInputs, "    call AMY_PUT_AT"];
                } else {
                  const inlinePutFrameAt = inlineStmt.match(/^put\s+([A-Za-z_][A-Za-z0-9_]*)\s+frame\s+size\s+(.+?)\s*,\s*(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
                  if (inlinePutFrameAt) {
                    const sourceInfo = getByteArrayBufferInfo(inlinePutFrameAt[1], 1);
                    const sourceIsData = /^[A-Za-z_][A-Za-z0-9_]*$/.test(inlinePutFrameAt[1])
                      && typeof dataLengths?.get(inlinePutFrameAt[1]) === "number";
                    const loadSource = emitLoadSourceAddressIntoHL(inlinePutFrameAt[1]);
                    const loadInputs = emitLoadRoutineByteInputsFromTokens({
                      routineName: "PUT_FRAME",
                      values: { b: inlinePutFrameAt[3], c: inlinePutFrameAt[2], d: inlinePutFrameAt[5], e: inlinePutFrameAt[4] },
                      emitLoadInt8Into,
                      emitLoadInt8ValueInto,
                      emitLoadInt8ValueIntoPreserving
                    });
                    if ((!sourceInfo && !sourceIsData) || !loadSource || !loadInputs) {
                      return { ok: false, lines: [], log: `Invalid inline put frame statement: ${rawLineText}` };
                    }
                    inlineLines = [
                      ...loadSource,
                      ...loadInputs,
                      "    push ix",
                      "    push iy",
                      "    call PUT_FRAME",
                      "    pop iy",
                      "    pop ix"
                    ];
                  }
                }
              }
            }
          }
          if (inlineLines) {
            return { ok: true, lines: inlineLines, log: "" };
          }
          const inlinePrintLiteral = inlineStmt.match(/^print\s+"([^"]*)"\s+at\s+(.+?)\s*,\s*(.+?)\s*$/i);
          if (inlinePrintLiteral) {
            const literal = emitTextLiteral(inlinePrintLiteral[1]);
            const loadY = emitLoadInt8ValueInto("d", inlinePrintLiteral[3]);
            const loadX = emitLoadInt8ValueInto("e", inlinePrintLiteral[2]);
            if (!loadY || !loadX) return { ok: false, lines: [], log: `Invalid inline print statement: ${rawLineText}` };
            const constY = tryEvaluateByteConstantExpression(inlinePrintLiteral[3]);
            const constX = tryEvaluateByteConstantExpression(inlinePrintLiteral[2]);
            inlineLines = [];
            if (constY !== null && constX !== null) {
              inlineLines.push(`    ld de,${formatHex16(((constY << 5) + constX) & 0xFFFF)}`);
              inlineLines.push("    ld hl,($73F6)");
              inlineLines.push("    add hl,de");
            } else {
              inlineLines.push(...loadY);
              inlineLines.push(...loadX);
              inlineLines.push("    call CALC_OFFSET");
              inlineLines.push("    push de");
              inlineLines.push("    ld hl,($73F6)");
              inlineLines.push("    pop de");
              inlineLines.push("    add hl,de");
            }
            inlineLines.push("    ex de,hl");
            inlineLines.push(`    ld hl,${literal.label}`);
            inlineLines.push(`    ld bc,$${literal.length.toString(16).toUpperCase().padStart(4, "0")}`);
            inlineLines.push("    call WRITE_VRAM");
          } else if (/^print\s+at\s+/i.test(inlineStmt)) {
            const argText = inlineStmt.replace(/^print\s+at\s+/i, "");
            const parts = splitTopLevelArgs(argText).map((part) => part.trim()).filter(Boolean);
            if (parts.length < 3) return { ok: false, lines: [], log: `Invalid inline print statement: ${rawLineText}` };
            inlineLines = emitPrintAtDense(parts[0], parts[1], parts.slice(2));
            if (!inlineLines) return { ok: false, lines: [], log: `Invalid inline print statement: ${rawLineText}` };
          } else {
            const inlinePrintAt = inlineStmt.match(/^print\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+?)(?:\s+(digits|width)\s+([0-9]+))?$/i);
            if (inlinePrintAt) {
              inlineLines = emitPrintAutoAt(normalizeExpression(inlinePrintAt[1]), inlinePrintAt[2], inlinePrintAt[3], inlinePrintAt[5] || null, (inlinePrintAt[4] || "").toLowerCase() === "width");
              if (!inlineLines) return { ok: false, lines: [], log: `Invalid inline print statement: ${rawLineText}` };
            } else {
              const inlineRemovedCall = inlineStmt.match(/^(call|gosub)\b/i);
              if (inlineRemovedCall) {
                return { ok: false, lines: [], log: `CALL/GOSUB syntax has been removed. Call subroutines directly by name instead: ${rawLineText}` };
              }
              const inlineImplicitCallWithArgs = inlineStmt.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
              if (inlineImplicitCallWithArgs && isKnownProcedureStatementName(inlineImplicitCallWithArgs[1])) {
                const procName = inlineImplicitCallWithArgs[1];
                const sig = procSignatures.get(procName) || [];
                const argsStr = inlineImplicitCallWithArgs[2].trim();
                const argTokens = argsStr ? splitTopLevelArgs(argsStr).map((s) => normalizeExpression(s.trim())) : [];
                const prepared = emitRoutineArgumentPushes(procName, argTokens, sig, "call");
                if (!prepared) return { ok: false, lines: [], log: `Invalid call arguments for ${procName}: ${rawLineText}` };
                inlineLines = [...prepared.lines, `    call ${resolveJumpTarget(procName)}`, ...emitAdjustSpBy(prepared.cleanupBytes)];
              } else {
                const inlineImplicitCallBare = inlineStmt.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
                if (inlineImplicitCallBare && isKnownProcedureStatementName(inlineImplicitCallBare[1])) {
                  inlineLines = [`    call ${resolveJumpTarget(inlineImplicitCallBare[1])}`];
                } else {
                  const inlineGoto = inlineStmt.match(/^goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
                  if (inlineGoto) {
                    const jumpTarget = resolveSourceJumpTarget(inlineGoto[1]);
                    if (!jumpTarget) return { ok: false, lines: [], log: formatUnknownJumpTargetLog(inlineGoto[1], rawLineText) };
                    inlineLines = [`    jp ${jumpTarget}`];
                  } else {
                    const inlineClear = inlineStmt.match(/^clear\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
                    if (inlineClear) {
                      inlineLines = emitClearValue(inlineClear[1]);
                      if (!inlineLines) return { ok: false, lines: [], log: `Invalid inline clear statement: ${rawLineText}` };
                    } else {
                      const inlineIncDec = inlineStmt.match(/^(inc|dec)\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)$/i);
                      if (inlineIncDec) {
                        const op = inlineIncDec[1].toLowerCase();
                        const name = inlineIncDec[2];
                        const valueType = resolveValueType(name);
                        if (valueType === "u32" || valueType === "i32") inlineLines = op === "inc" ? emitU32Inc(name) : emitArith32Op(name, "1", "sub");
                        else if (valueType === "int8") {
                          const load = emitLoadInt8Into("a", name);
                          const store = emitStoreInt8FromA(name);
                          inlineLines = load && store ? [...load, op === "inc" ? "    inc a" : "    dec a", ...store] : null;
                        } else if (valueType === "int16") {
                          const load = emitLoadInt16IntoHL(name);
                          const store = emitStoreInt16FromHL(name);
                          inlineLines = load && store ? [...load, op === "inc" ? "    inc hl" : "    dec hl", ...store] : null;
                        }
                        if (!inlineLines) return { ok: false, lines: [], log: `Invalid inline ${op} statement: ${rawLineText}` };
                      } else {
                        const inlineAdd = inlineStmt.match(/^add\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+by\s+(.+)$/i);
                        const inlineSub = !inlineAdd && inlineStmt.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+by\s+(.+)$/i);
                        if (inlineAdd || inlineSub) {
                          const target = inlineAdd ? inlineAdd[1] : inlineSub[1];
                          const valueToken = normalizeExpression((inlineAdd ? inlineAdd[2] : inlineSub[2]).trim());
                          const targetType = resolveValueType(target);
                          if (targetType === "u32" || targetType === "i32") inlineLines = emitArith32Op(target, valueToken, inlineAdd ? "add" : "sub");
                          else if (targetType === "int8") inlineLines = emitArithInt8Op(target, valueToken, inlineAdd ? "add" : "sub");
                          else if (targetType === "int16") inlineLines = emitArithInt16Op(target, valueToken, inlineAdd ? "add" : "sub");
                          else {
                            const targetInfo = getRuntimeInfo(target);
                            if (targetInfo?.kind === "bcd") inlineLines = inlineAdd ? emitBcdAdd(target, valueToken) : emitBcdSub(target, valueToken);
                          }
                          if (!inlineLines) return { ok: false, lines: [], log: `Invalid inline arithmetic statement: ${rawLineText}` };
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return inlineLines ? { ok: true, lines: inlineLines, log: "" } : { ok: false, lines: [], log: `Unsupported inline statement: ${rawLineText}` };
  };
}
