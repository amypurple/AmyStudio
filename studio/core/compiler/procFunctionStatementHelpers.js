export function handleProcFunctionStatement({
  line,
  rawLine,
  body,
  state,
  isSupportedSourceTypeName,
  isRemovedSourceTypeName,
  canonicalSourceTypeList,
  emitCurrentProcReturnLines,
  emitCurrentProcReturnLinesIfNeeded,
  bodyAlreadyEndsWith,
  ensureProcAsmSymbol,
  ensureProcFrame,
  procSignatures,
  ensureProcLocalMap,
  functionReturnTypes,
  normalizeRuntimeType,
  normalizeDeclaredType,
  openStartProc,
  addCompilerWarning
}) {
  if (/^proc\b/i.test(line)) {
    return { handled: true, ok: false, log: `PROC syntax has been removed. Use 'sub' instead. Offending line: ${rawLine}` };
  }
  if (/^call\b/i.test(line) || /^gosub\b/i.test(line)) {
    return { handled: true, ok: false, log: `CALL/GOSUB syntax has been removed. Call subroutines directly by name instead. Offending line: ${rawLine}` };
  }
  if (/^end\s+proc$/i.test(line)) {
    return { handled: true, ok: false, log: `END PROC has been removed. Use 'end sub'. Offending line: ${rawLine}` };
  }
  if (/^exit\s+proc$/i.test(line)) {
    return { handled: true, ok: false, log: `EXIT PROC has been removed. Use 'return' or 'exit sub'. Offending line: ${rawLine}` };
  }
  if (/^sub\s+start:/i.test(line)) {
    openStartProc();
    state.openedImplicitStart = false;
    return { handled: true, ok: true };
  }

  if (/^sub\s+/i.test(line)) {
    if (state.currentFunction) {
      const returnLines = emitCurrentProcReturnLines();
      if (!bodyAlreadyEndsWith(returnLines)) {
        return { handled: true, ok: false, log: `Function '${state.currentProc}' must end with 'return Value' before starting another routine. Offending line: ${rawLine}` };
      }
      state.currentProc = null;
      state.currentFunction = null;
    } else if (state.currentProc === "Start") {
      emitCurrentProcReturnLinesIfNeeded();
      state.currentProc = null;
      state.currentFunction = null;
      state.openedImplicitStart = false;
    }
    const procWithParams = line.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*:?\s*$/i);
    if (procWithParams) {
      state.currentProc = procWithParams[1];
      state.currentFunction = null;
      body.push(`${ensureProcAsmSymbol(state.currentProc)}:`);
      const frame = ensureProcFrame(state.currentProc);
      frame.insertIndex = body.length;
      frame.usesIxFrame = true;
      const sig = procSignatures.get(state.currentProc);
      if (sig) {
        const pmap = ensureProcLocalMap(state.currentProc);
        for (const p of sig) pmap.set(p.name, `${state.currentProc}_${p.name}`);
      }
      return { handled: true, ok: true };
    }
    const procMatch = line.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*):?$/i);
    if (procMatch) {
      state.currentProc = procMatch[1];
      state.currentFunction = null;
      body.push(`${ensureProcAsmSymbol(procMatch[1])}:`);
      ensureProcFrame(state.currentProc).insertIndex = body.length;
      return { handled: true, ok: true };
    }
  }

  if (/^function\s+/i.test(line)) {
    if (state.currentFunction) {
      const returnLines = emitCurrentProcReturnLines();
      if (!bodyAlreadyEndsWith(returnLines)) {
        return { handled: true, ok: false, log: `Function '${state.currentProc}' must end with 'return Value' before starting another routine. Offending line: ${rawLine}` };
      }
      state.currentProc = null;
      state.currentFunction = null;
    } else if (state.currentProc === "Start") {
      emitCurrentProcReturnLinesIfNeeded();
      state.currentProc = null;
      state.currentFunction = null;
      state.openedImplicitStart = false;
    }
    const functionWithParams = line.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
    if (functionWithParams && isSupportedSourceTypeName(functionWithParams[3])) {
      state.currentProc = functionWithParams[1];
      state.currentFunction = functionReturnTypes.get(state.currentProc) || {
        returnType: normalizeRuntimeType(functionWithParams[3].toLowerCase()),
        declaredType: normalizeDeclaredType(functionWithParams[3].toLowerCase())
      };
      body.push(`${ensureProcAsmSymbol(state.currentProc)}:`);
      const frame = ensureProcFrame(state.currentProc);
      frame.insertIndex = body.length;
      frame.usesIxFrame = true;
      const sig = procSignatures.get(state.currentProc);
      if (sig) {
        const pmap = ensureProcLocalMap(state.currentProc);
        for (const p of sig) pmap.set(p.name, `${state.currentProc}_${p.name}`);
      }
      return { handled: true, ok: true };
    }
    const functionBare = line.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(\s*\))?\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
    if (functionBare && isSupportedSourceTypeName(functionBare[2])) {
      state.currentProc = functionBare[1];
      state.currentFunction = functionReturnTypes.get(state.currentProc) || {
        returnType: normalizeRuntimeType(functionBare[2].toLowerCase()),
        declaredType: normalizeDeclaredType(functionBare[2].toLowerCase())
      };
      body.push(`${ensureProcAsmSymbol(state.currentProc)}:`);
      const frame = ensureProcFrame(state.currentProc);
      frame.insertIndex = body.length;
      return { handled: true, ok: true };
    }
    if (functionWithParams && isRemovedSourceTypeName(functionWithParams[3])) {
      return {
        handled: true,
        ok: false,
        log: `Built-in type '${functionWithParams[3]}' is no longer supported in function signatures. Use canonical types only (${canonicalSourceTypeList}) or define your own alias first. Offending line: ${rawLine}`
      };
    }
    if (functionBare && isRemovedSourceTypeName(functionBare[2])) {
      return {
        handled: true,
        ok: false,
        log: `Built-in type '${functionBare[2]}' is no longer supported in function signatures. Use canonical types only (${canonicalSourceTypeList}) or define your own alias first. Offending line: ${rawLine}`
      };
    }
  }

  if (/^end\s+sub$/i.test(line)) {
    if (!state.currentProc || (state.currentProc === "Start" && state.openedImplicitStart)) {
      if (typeof addCompilerWarning === "function") {
        addCompilerWarning(`Line with '${rawLine.trim()}' does not close an explicit subroutine and was ignored.`);
      }
      return { handled: true, ok: true };
    }
    emitCurrentProcReturnLinesIfNeeded();
    state.currentProc = null;
    state.currentFunction = null;
    return { handled: true, ok: true };
  }
  if (/^end\s+function$/i.test(line)) {
    return { handled: true, ok: false, log: `END FUNCTION has been removed. End functions with 'return Value'. Offending line: ${rawLine}` };
  }
  if (/^end$/i.test(line) || /^project\s+/i.test(line) || /^use\s+lib\s+/i.test(line)) {
    return { handled: true, ok: true };
  }

  return { handled: false };
}



