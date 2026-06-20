import { checkDeclarationDeprecation } from "./deprecations.js";

export function handleDeclarationStatement({
  line,
  rawLine,
  state,
  normalizeExpression,
  validateGlobalUserName,
  isSafeExpression,
  ensureConstAsmSymbol,
  parseAmyDeclarationList,
  isZeroInitializer,
  ensureProcLocalMap,
  lowerName,
  ensureProcFrame,
  emitBcdClear,
  reserveRam,
  ensureUserVarAsmSymbol,
  formatHex16,
  emitRuntimeStore,
  parseRoutineInvocation,
  runtimeTypeSize,
  parseNumericLiteral,
  tryEvaluateCompileTimeNumericExpression,
  emitStoreImmediate32,
  isSupportedSourceTypeName,
  normalizeDeclaredType,
  normalizeRuntimeType,
  isRemovedSourceTypeName,
  canonicalSourceTypeList,
  parseFixedPointLiteral,
  parseFixedPointLiteral32,
  isSupportedRecordTypeName,
  getRecordTypeInfo
}) {
  function encodeImmediateBytes(value, byteCount) {
    const unsigned = BigInt.asUintN(byteCount * 8, BigInt(value));
    const bytes = [];
    for (let index = 0n; index < BigInt(byteCount); index += 1n) {
      bytes.push(Number((unsigned >> (index * 8n)) & 0xFFn));
    }
    return bytes;
  }

  function decimalToBcdBytes(n, byteCount) {
    const bytes = [];
    let remaining = Math.floor(n);
    for (let index = 0; index < byteCount; index += 1) {
      const twoDigits = remaining % 100;
      bytes.push((Math.floor(twoDigits / 10) << 4) | (twoDigits % 10));
      remaining = Math.floor(remaining / 100);
    }
    return bytes;
  }

  function doesDecimalFitBcdDigits(value, digitCount) {
    if (!Number.isFinite(value) || value < 0) return false;
    if (!Number.isInteger(digitCount) || digitCount < 1) return false;
    return String(Math.floor(value)).length <= digitCount;
  }

  function resolveBcdInitializer(initial, digitCount, byteCount) {
    if (isZeroInitializer(initial)) return null;
    const normalized = normalizeExpression(String(initial || "").trim());
    const value = /^[0-9]+$/.test(normalized)
      ? Number.parseInt(normalized, 10)
      : (tryEvaluateCompileTimeNumericExpression ? tryEvaluateCompileTimeNumericExpression(normalized) : null);
    if (!Number.isInteger(value) || !doesDecimalFitBcdDigits(value, digitCount)) return undefined;
    return decimalToBcdBytes(value, byteCount);
  }

  function queueImmediateRuntimeInit(address, bytes) {
    state.runtimeInitRecords.push({ address, bytes: [...bytes] });
    state.hasRuntimeInit = true;
  }

  function encodeFp5ImmediateBytes(value) {
    if (!Number.isFinite(value)) return null;
    if (value === 0) return [0, 0, 0, 0, 0];
    const negative = value < 0;
    const absValue = Math.abs(value);
    let exponent = Math.floor(Math.log2(absValue)) + 1;
    if (exponent < -127) return [0, 0, 0, 0, 0];
    let fraction = Math.round(((absValue / (2 ** (exponent - 1))) - 1) * 0x80000000);
    if (fraction >= 0x80000000) {
      fraction = 0;
      exponent += 1;
    }
    const storedExponent = exponent + 128;
    if (storedExponent <= 0) return [0, 0, 0, 0, 0];
    if (storedExponent >= 256) return null;
    return [
      fraction & 0xFF,
      (fraction >>> 8) & 0xFF,
      (fraction >>> 16) & 0xFF,
      ((fraction >>> 24) & 0x7F) | (negative ? 0x80 : 0x00),
      storedExponent & 0xFF
    ];
  }

  function encodeScaledSignedBytes(value, scale, byteCount) {
    if (!Number.isFinite(value)) return null;
    return encodeImmediateBytes(Math.round(value * scale), byteCount);
  }

  function encodeFixed8_8ImmediateBytes(token, byteCount) {
    if (typeof parseFixedPointLiteral !== "function") return null;
    const fixedValue = parseFixedPointLiteral(token);
    if (fixedValue === null) return null;
    return encodeImmediateBytes(fixedValue, byteCount);
  }

  function resolveArrayLength(lengthToken) {
    if (!lengthToken) return null;
    const normalized = normalizeExpression(String(lengthToken).trim());
    const evaluated = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(normalized)
      : null;
    const numeric = evaluated !== null ? evaluated : parseNumericLiteral(normalized);
    if (!Number.isInteger(numeric) || numeric < 1) return null;
    return numeric;
  }

  function emitImmediateStackBytes(offset, bytes) {
    return bytes.map((value, index) => {
      const slot = offset + index;
      const hex = `$${(value & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
      return `    ld (${state.formatIxOffset(slot)}),${hex}`;
    });
  }

  function isCompileTimeZeroInitializer(declaredType, initial) {
    if (isZeroInitializer(initial)) return true;
    const normalizedType = normalizeDeclaredType(declaredType);
    if (normalizedType === "fix16_16") {
      return parseFixedPointLiteral32(initial) === 0;
    }
    if (normalizedType === "fp5") {
      return /^-?0(?:\.0+)?$/i.test(String(initial).trim()) || /^-?(?:\$0+|0x0+)$/i.test(String(initial).trim());
    }
    const numeric = parseNumericLiteral(initial);
    return numeric === 0;
  }

  const _dep = checkDeclarationDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const decl = line.match(/^(?:let|var|const)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i);
  if (decl) {
    const name = decl[1];
    const expr = normalizeExpression(decl[2].trim());
    const nameError = validateGlobalUserName(name, "Constant", rawLine);
    if (nameError) return { handled: true, ok: false, log: nameError };
    if (!isSafeExpression(expr)) return { handled: true, ok: false, log: `Invalid constant declaration: ${rawLine}` };
    state.symbols.add(name);
    state.compileTimeConstants?.set(name, expr);
    const asmName = ensureConstAsmSymbol(name);
    state.declarations.push(`${asmName} EQU ${state.rewriteUserSymbolsInExpression(expr)}`);
    return { handled: true, ok: true };
  }

  const bcdDecl = line.match(/^(?:(ram|dim|local)\s+)?bcd\s+(?:(digits)\s+)?([1-9]|10|11|12)\s+(.+)$/i);
  if (bcdDecl) {
    const scopeKeyword = bcdDecl[1] ? bcdDecl[1].toLowerCase() : null;
    const explicitDigits = !!bcdDecl[2];
    const rawBcdCount = Number.parseInt(bcdDecl[3], 10);
    const digitCount = explicitDigits ? rawBcdCount : rawBcdCount * 2;
    const byteCount = Math.ceil(digitCount / 2);
    let declarationsForLine = [];
    try {
      declarationsForLine = parseAmyDeclarationList(bcdDecl[4], rawLine);
    } catch (error) {
      return { handled: true, ok: false, log: String(error.message || error) };
    }
    const inferredLocal = !scopeKeyword && !!state.currentProc;
    const isLocalDecl = scopeKeyword === "local" || inferredLocal;
    for (const declEntry of declarationsForLine) {
      const name = declEntry.name;
      if (declEntry.lengthToken) {
        return { handled: true, ok: false, log: `BCD variables do not support array lengths: ${rawLine}` };
      }
      const initialBcdBytes = resolveBcdInitializer(declEntry.initial, digitCount, byteCount);
      if (initialBcdBytes === undefined) return { handled: true, ok: false, log: `BCD initializer must be a non-negative constant that fits ${digitCount} digits: ${rawLine}` };
      if (isLocalDecl) {
        if (!state.currentProc) {
          return { handled: true, ok: false, log: `local declaration requires a sub or function scope: ${rawLine}` };
        }
        if (initialBcdBytes) return { handled: true, ok: false, log: `Local BCD variables currently support only zero initialization: ${rawLine}` };
        const procMap = ensureProcLocalMap(state.currentProc);
        const mangledName = `${state.currentProc}_${name}`;
        if (!state.isValidSymbolName(name) || state.isReservedAmyIdentifier(name) || state.describeGlobalNameCollision(name) || state.mapHasInsensitive(procMap, name) || state.runtimeVars.has(mangledName) || lowerName(name) === lowerName(state.currentProc)) {
          return { handled: true, ok: false, log: `Invalid local BCD variable declaration: ${rawLine}` };
        }
        const frame = ensureProcFrame(state.currentProc);
        procMap.set(name, mangledName);
        frame.size += byteCount;
        const offset = -frame.size;
        state.runtimeVars.set(mangledName, { type: "bcd", kind: "bcd", byteCount, digitCount, scope: state.currentProc, localName: name, storage: "stack", offset });
        frame.init.push(...emitBcdClear(name));
        continue;
      }
      const globalBcdNameError = validateGlobalUserName(name, "BCD variable", rawLine);
      if (globalBcdNameError) return { handled: true, ok: false, log: globalBcdNameError };
      let address;
      try {
        address = reserveRam(name, byteCount, rawLine.trim());
      } catch (error) {
        return { handled: true, ok: false, log: String(error.message || error) };
      }
      const asmName = ensureUserVarAsmSymbol(name);
      state.runtimeVars.set(name, { type: "bcd", kind: "bcd", byteCount, digitCount, address, scope: "global", asmName });
      state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
      state.hasRuntimeRamDeclarations = true;
      if (initialBcdBytes) queueImmediateRuntimeInit(address, initialBcdBytes);
    }
    return { handled: true, ok: true };
  }

  const scopedDecl = line.match(/^(?:(ram|dim|local)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/i);
  if (scopedDecl && isSupportedRecordTypeName?.(scopedDecl[2])) {
    const scopeKeyword = scopedDecl[1] ? scopedDecl[1].toLowerCase() : null;
    const recordTypeName = scopedDecl[2];
    const recordInfo = getRecordTypeInfo?.(recordTypeName);
    if (!recordInfo) return { handled: true, ok: false, log: `Unknown record type '${recordTypeName}': ${rawLine}` };
    const inferredLocal = !scopeKeyword && !!state.currentProc;
    const isLocalDecl = scopeKeyword === "local" || inferredLocal;
    if (isLocalDecl) {
      return { handled: true, ok: false, log: `Local record variables are not supported yet: ${rawLine}` };
    }
    let declarationsForLine = [];
    try {
      declarationsForLine = parseAmyDeclarationList(scopedDecl[3], rawLine);
    } catch (error) {
      return { handled: true, ok: false, log: String(error.message || error) };
    }
    for (const declEntry of declarationsForLine) {
      const name = declEntry.name;
      const lengthToken = declEntry.lengthToken;
      const initial = declEntry.initial;
      const globalVarNameError = validateGlobalUserName(name, "Variable", rawLine);
      if (globalVarNameError) return { handled: true, ok: false, log: globalVarNameError };
      if (!isZeroInitializer(initial)) {
        return { handled: true, ok: false, log: `Record declarations currently support only zero initialization: ${rawLine}` };
      }
      if (lengthToken) {
        const length = resolveArrayLength(lengthToken);
        if (!Number.isInteger(length) || length < 1) {
          return { handled: true, ok: false, log: `Record array length must be >= 1: ${rawLine}` };
        }
        let address;
        try {
          address = reserveRam(name, recordInfo.byteSize * length, rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        const asmName = ensureUserVarAsmSymbol(name);
        state.runtimeVars.set(name, {
          kind: "record_array",
          type: "record",
          declaredType: recordTypeName,
          recordTypeName,
          recordInfo,
          recordSize: recordInfo.byteSize,
          address,
          length,
          scope: "global",
          asmName
        });
        state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
        state.hasRuntimeRamDeclarations = true;
      } else {
        let address;
        try {
          address = reserveRam(name, recordInfo.byteSize, rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        const asmName = ensureUserVarAsmSymbol(name);
        state.runtimeVars.set(name, {
          kind: "record",
          type: "record",
          declaredType: recordTypeName,
          recordTypeName,
          recordInfo,
          recordSize: recordInfo.byteSize,
          address,
          scope: "global",
          asmName
        });
        state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
        state.hasRuntimeRamDeclarations = true;
      }
    }
    return { handled: true, ok: true };
  }
  if (scopedDecl && isSupportedSourceTypeName(scopedDecl[2])) {
    const scopeKeyword = scopedDecl[1] ? scopedDecl[1].toLowerCase() : null;
    const declaredType = normalizeDeclaredType(scopedDecl[2].toLowerCase());
    const type = normalizeRuntimeType(declaredType);
    const inferredLocal = !scopeKeyword && !!state.currentProc;
    const isLocalDecl = scopeKeyword === "local" || inferredLocal;
    let declarationsForLine = [];
    try {
      declarationsForLine = parseAmyDeclarationList(scopedDecl[3], rawLine);
    } catch (error) {
      return { handled: true, ok: false, log: String(error.message || error) };
    }
    for (const declEntry of declarationsForLine) {
      const name = declEntry.name;
      const lengthToken = declEntry.lengthToken;
      const initial = declEntry.initial;
      if (isLocalDecl) {
        if (!state.currentProc) {
          return { handled: true, ok: false, log: `local declaration requires a sub or function scope: ${rawLine}` };
        }
        const procMap = ensureProcLocalMap(state.currentProc);
        const mangledName = `${state.currentProc}_${name}`;
        const initialInvocation = parseRoutineInvocation(initial);
        if (!state.isValidSymbolName(name) || state.isReservedAmyIdentifier(name) || state.describeGlobalNameCollision(name) || (!isSafeExpression(initial) && !initialInvocation) || state.mapHasInsensitive(procMap, name) || state.runtimeVars.has(mangledName) || lowerName(name) === lowerName(state.currentProc)) {
          return { handled: true, ok: false, log: `Invalid local variable declaration: ${rawLine}` };
        }
        const frame = ensureProcFrame(state.currentProc);
        procMap.set(name, mangledName);
        if (declaredType === "boolean" && !lengthToken) {
          if (frame.boolPackOffset === null || frame.boolPackBits >= 8) {
            frame.size += 1;
            frame.boolPackOffset = -frame.size;
            frame.boolPackBits = 0;
            frame.init.push("    xor a", `    ld (${state.formatIxOffset(frame.boolPackOffset)}),a`);
          }
          const bit = frame.boolPackBits++;
          state.runtimeVars.set(mangledName, {
            type: "int8",
            declaredType: "boolean",
            kind: "packed_bool",
            scope: state.currentProc,
            localName: name,
            storage: "stack",
            packOffset: frame.boolPackOffset,
            bit
          });
          const initCode = emitRuntimeStore(name, initial);
          if (!initCode) return { handled: true, ok: false, log: `Invalid local initializer for ${name}: ${initial}` };
          state.body.push(...initCode);
          continue;
        }
        if (declaredType === "fp5") {
          if (lengthToken) {
            return { handled: true, ok: false, log: `fp5 arrays are not supported yet: ${rawLine}` };
          }
          const size = runtimeTypeSize(type);
          frame.size += size;
          const offset = -frame.size;
          state.runtimeVars.set(mangledName, { type, declaredType, kind: "fp5", scope: state.currentProc, localName: name, storage: "stack", offset });
          let initCode = null;
          const numeric = typeof tryEvaluateCompileTimeNumericExpression === "function"
            ? tryEvaluateCompileTimeNumericExpression(initial)
            : null;
          if (numeric !== null) {
            const bytes = encodeFp5ImmediateBytes(numeric);
            if (!bytes) return { handled: true, ok: false, log: `Invalid fp5 local initializer for ${name}: ${initial}.` };
            initCode = emitImmediateStackBytes(offset, bytes);
          } else {
            initCode = emitRuntimeStore(name, initial);
          }
          if (!initCode) {
            return { handled: true, ok: false, log: `Invalid fp5 local initializer for ${name}: ${initial}. Current fp5 support allows zero and fp5-to-fp5 copy only.` };
          }
          state.body.push(...initCode);
          continue;
        }
        if (lengthToken) {
          const length = resolveArrayLength(lengthToken);
          if (!length) {
            return { handled: true, ok: false, log: `Local array length must be a constant integer >= 1: ${rawLine}` };
          }
          const elementSize = runtimeTypeSize(type);
          frame.size += elementSize * length;
          const offset = -frame.size;
          state.runtimeVars.set(mangledName, { kind: "array", type, declaredType, elementType: type, length, scope: state.currentProc, localName: name, storage: "stack", offset });
          if (!isZeroInitializer(initial)) {
            for (let index = 0; index < length; index += 1) {
              const initCode = emitRuntimeStore(`${name}[${index}]`, initial);
              if (!initCode) return { handled: true, ok: false, log: `Invalid local array initializer for ${name}: ${initial}` };
              state.body.push(...initCode);
            }
          }
        } else {
          const size = runtimeTypeSize(type);
          frame.size += size;
          const offset = -frame.size;
          state.runtimeVars.set(mangledName, { type, declaredType, kind: declaredType, scope: state.currentProc, localName: name, storage: "stack", offset });
          let initCode = null;
          const numeric = typeof tryEvaluateCompileTimeNumericExpression === "function"
            ? tryEvaluateCompileTimeNumericExpression(initial)
            : null;
          if (numeric !== null && declaredType === "fix16_16") {
            const bytes = encodeScaledSignedBytes(numeric, 65536, size);
            initCode = bytes ? emitImmediateStackBytes(offset, bytes) : null;
          } else if (declaredType === "fix8_8" || declaredType === "ufix8_8") {
            const bytes = encodeFixed8_8ImmediateBytes(initial, size);
            initCode = bytes ? emitImmediateStackBytes(offset, bytes) : null;
          } else {
            initCode = emitRuntimeStore(name, initial);
          }
          if (!initCode) return { handled: true, ok: false, log: `Invalid local initializer for ${name}: ${initial}` };
          state.body.push(...initCode);
        }
        continue;
      }

      const initialInvocation = parseRoutineInvocation(initial);
      const globalVarNameError = validateGlobalUserName(name, "Variable", rawLine);
      if (globalVarNameError) return { handled: true, ok: false, log: globalVarNameError };
      if (!isSafeExpression(initial) && !initialInvocation) return { handled: true, ok: false, log: `Invalid variable declaration: ${rawLine}` };
      if (declaredType === "boolean" && !lengthToken) {
        if (state.nextBoolBit >= 8) {
          const packName = `AMY_BOOL_PACK${state.boolPackCount++}`;
          let packAddr;
          try {
            packAddr = reserveRam(packName, 1, rawLine.trim());
          } catch (error) {
            return { handled: true, ok: false, log: String(error.message || error) };
          }
          state.currentBoolPackLabel = packName;
          state.currentBoolPackAddress = packAddr;
          state.runtimeVars.set(packName, { type: "int8", kind: "bool_pack_byte", address: packAddr, internal: true });
          state.runtimeDeclarations.push(`${packName} EQU ${formatHex16(packAddr)}`);
          state.boolPackInits.set(packName, 0);
          state.nextBoolBit = 0;
        }
        const bit = state.nextBoolBit++;
        const packLabel = state.currentBoolPackLabel;
        state.runtimeVars.set(name, { type: "int8", declaredType: "boolean", kind: "packed_bool", packLabel, bit, address: state.currentBoolPackAddress, scope: "global" });
        state.runtimeDeclarations.push(`; ${name} = bit ${bit} of ${packLabel}`);
        if (initial === "1") {
          state.boolPackInits.set(packLabel, (state.boolPackInits.get(packLabel) || 0) | (1 << bit));
          state.hasRuntimeInit = true;
        }
        state.hasRuntimeRamDeclarations = true;
        continue;
      }
      if (declaredType === "fix16_16") {
        if (lengthToken) {
          return { handled: true, ok: false, log: `fixed32 arrays are not supported: ${rawLine}` };
        }
        let address;
        try {
          address = reserveRam(name, 4, rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        const asmName = ensureUserVarAsmSymbol(name);
        state.runtimeVars.set(name, { type: "i32", declaredType: "fix16_16", kind: "fix16_16", address, scope: "global", asmName });
        state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
        state.hasRuntimeRamDeclarations = true;
        if (!isCompileTimeZeroInitializer(declaredType, initial)) {
          const numeric = typeof tryEvaluateCompileTimeNumericExpression === "function"
            ? tryEvaluateCompileTimeNumericExpression(initial)
            : null;
          if (numeric !== null) {
            const bytes = encodeScaledSignedBytes(numeric, 65536, 4);
            if (!bytes) return { handled: true, ok: false, log: `Invalid fixed32 initializer for ${name}: ${initial}` };
            queueImmediateRuntimeInit(address, bytes);
          } else {
            const initCode = emitRuntimeStore(name, initial);
            if (!initCode) return { handled: true, ok: false, log: `Invalid fixed32 initializer for ${name}: ${initial}` };
            state.runtimeInit.push(...initCode);
            state.hasRuntimeInit = true;
          }
        }
        continue;
      }
      if (declaredType === "fp5") {
        if (lengthToken) {
          return { handled: true, ok: false, log: `fp5 arrays are not supported yet: ${rawLine}` };
        }
        let address;
        try {
          address = reserveRam(name, 5, rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        const asmName = ensureUserVarAsmSymbol(name);
        state.runtimeVars.set(name, { type, declaredType, kind: "fp5", address, scope: "global", asmName });
        state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
        state.hasRuntimeRamDeclarations = true;
        if (!isCompileTimeZeroInitializer(declaredType, initial)) {
          const numeric = typeof tryEvaluateCompileTimeNumericExpression === "function"
            ? tryEvaluateCompileTimeNumericExpression(initial)
            : null;
          if (numeric !== null) {
            const bytes = encodeFp5ImmediateBytes(numeric);
            if (!bytes) return { handled: true, ok: false, log: `Invalid fp5 initializer for ${name}: ${initial}.` };
            queueImmediateRuntimeInit(address, bytes);
          } else {
            const initCode = emitRuntimeStore(name, initial);
            if (!initCode) {
              return { handled: true, ok: false, log: `Invalid fp5 initializer for ${name}: ${initial}. Current fp5 support allows zero and fp5-to-fp5 copy only.` };
            }
            state.runtimeInit.push(...initCode);
            state.hasRuntimeInit = true;
          }
        }
        continue;
      }
      if (declaredType === "u32" || declaredType === "i32") {
        if (lengthToken) {
          return { handled: true, ok: false, log: `${declaredType} arrays are not supported yet: ${rawLine}` };
        }
        let address;
        try {
          address = reserveRam(name, 4, rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        const asmName = ensureUserVarAsmSymbol(name);
        state.runtimeVars.set(name, { type, declaredType, kind: declaredType, address, scope: "global", asmName });
        state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
        state.hasRuntimeRamDeclarations = true;
        if (!isCompileTimeZeroInitializer(declaredType, initial)) {
          const numeric = parseNumericLiteral(initial);
          if (numeric !== null) {
            queueImmediateRuntimeInit(address, encodeImmediateBytes(numeric, 4));
          } else {
            const initCode = emitRuntimeStore(name, initial);
            if (!initCode) return { handled: true, ok: false, log: `Invalid initializer for ${name}: ${initial}` };
            state.runtimeInit.push(...initCode);
            state.hasRuntimeInit = true;
          }
        }
        continue;
      }
      if (lengthToken) {
        const length = resolveArrayLength(lengthToken);
        if (!length) {
          return { handled: true, ok: false, log: `Array length must be a constant integer >= 1: ${rawLine}` };
        }
        let address;
        try {
          address = reserveRam(name, runtimeTypeSize(type) * length, rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        const asmName = ensureUserVarAsmSymbol(name);
        state.runtimeVars.set(name, { kind: "array", type, declaredType, elementType: type, address, length, scope: "global", asmName });
        state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
        state.hasRuntimeRamDeclarations = true;
        if (!isCompileTimeZeroInitializer(declaredType, initial)) {
          const isFix8_8Array = declaredType === "fix8_8" || declaredType === "ufix8_8";
          const numeric = isFix8_8Array
            ? null
            : parseNumericLiteral(initial);
          const fixedBytes = isFix8_8Array
            ? encodeFixed8_8ImmediateBytes(initial, runtimeTypeSize(type))
            : null;
          if (fixedBytes || numeric !== null) {
            const elementBytes = fixedBytes || encodeImmediateBytes(numeric, runtimeTypeSize(type));
            const bytes = [];
            for (let index = 0; index < length; index += 1) bytes.push(...elementBytes);
            queueImmediateRuntimeInit(address, bytes);
          } else {
            for (let index = 0; index < length; index += 1) {
              const initCode = emitRuntimeStore(`${name}[${index}]`, initial);
              if (!initCode) return { handled: true, ok: false, log: `Invalid array initializer for ${name}: ${initial}` };
              state.runtimeInit.push(...initCode);
            }
            state.hasRuntimeInit = true;
          }
        }
      } else {
        let address;
        try {
          address = reserveRam(name, runtimeTypeSize(type), rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        const asmName = ensureUserVarAsmSymbol(name);
        state.runtimeVars.set(name, { type, declaredType, address, scope: "global", asmName });
        state.runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
        state.hasRuntimeRamDeclarations = true;
        if (!isCompileTimeZeroInitializer(declaredType, initial)) {
          const isFix8_8Scalar = declaredType === "fix8_8" || declaredType === "ufix8_8";
          const numeric = isFix8_8Scalar
            ? null
            : parseNumericLiteral(initial);
          const fixedBytes = isFix8_8Scalar
            ? encodeFixed8_8ImmediateBytes(initial, runtimeTypeSize(type))
            : null;
          if (fixedBytes || numeric !== null) {
            const bytes = fixedBytes || encodeImmediateBytes(numeric, runtimeTypeSize(type));
            queueImmediateRuntimeInit(address, bytes);
          } else {
            const initCode = emitRuntimeStore(name, initial);
            if (!initCode) return { handled: true, ok: false, log: `Invalid initializer for ${name}: ${initial}` };
            state.runtimeInit.push(...initCode);
            state.hasRuntimeInit = true;
          }
        }
      }
    }
    return { handled: true, ok: true };
  }

  if (scopedDecl && isRemovedSourceTypeName(scopedDecl[2])) {
    return {
      handled: true,
      ok: false,
      log: `Built-in type '${scopedDecl[2]}' is no longer supported. Use canonical types only (${canonicalSourceTypeList}) or define your own alias first, for example 'define ${scopedDecl[2]} as u8'. Offending line: ${rawLine}`
    };
  }

  return { handled: false };
}
