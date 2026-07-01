function formatHex8(value) {
  return `$${(value & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
}

export function createRuntimeValueHelpers({
  normalizeExpression,
  tryEvaluateCompileTimeNumericExpression,
  isAnyFixedDeclaredType,
  isFix16_16DeclaredType,
  parseFixedPointLiteral,
  formatFixedPointLiteral16,
  parseFixedPointLiteral32,
  parseNumericLiteral,
  emitStoreFx16Source,
  parseExpressionAst,
  emitLoadInt16AstIntoHL,
  parseBuiltinInputRef,
  parseRecordFieldRef,
  emitLoadInt8Into,
  isSignedDeclaredType,
  parseDwordWordComponent,
  emitLoadDwordInt16ComponentIntoHL,
  parseArrayRef,
  getRuntimeInfo,
  emitLoadArrayAddressIntoHL,
  emitLoadRecordFieldAddressIntoHL,
  getDirectRecordFieldAddress,
  emitFunctionInvocation,
  resolveDeclaredValueType,
  scopedRuntimeName,
  symbolOrValue,
  emitBcdStore,
  resolveValueType,
  emitComputeExpressionAst,
  emitStoreComputedExpression,
  emitStoreInt8FromA,
  emitLoadInt8ValueInto,
  ensureCompareScratch32,
  emitStoreExtended32,
  emitStoreMemory32ToTarget,
  emitStoreInt16FromHL,
  runtimeTypeSize,
  reserveRam,
  runtimeState,
  formatHex16,
  splitTopLevelArgs
}) {
  function parseRandomCallArgs(valueToken) {
    const match = String(valueToken || "").trim().match(/^random\s*\((.*)\)$/i);
    if (!match) return null;
    const inner = match[1].trim();
    if (!inner) return [];
    return typeof splitTopLevelArgs === "function" ? splitTopLevelArgs(inner) : inner.split(",").map((part) => part.trim());
  }

  function isFp5ZeroValue(token) {
    const normalized = normalizeExpression(String(token).trim());
    return /^-?0(?:\.0+)?$/i.test(normalized) || /^-?(?:\$0+|0x0+)$/i.test(normalized);
  }

  function emitStoreZeroBytes(name, byteCount) {
    const info = getRuntimeInfo(name);
    if (!info) return null;
    const lines = ["    xor a"];
    if (info.storage === "stack") {
      for (let index = 0; index < byteCount; index += 1) {
        const offset = info.offset + index;
        lines.push(`    ld (ix${offset < 0 ? offset : `+${offset}`}),a`);
      }
      return lines;
    }
    const baseName = scopedRuntimeName(name);
    for (let index = 0; index < byteCount; index += 1) {
      lines.push(`    ld (${baseName}+${index}),a`);
    }
    return lines;
  }

  function emitStoreFpa1ToFp5Target(name) {
    const info = getRuntimeInfo(name);
    if (!info) return null;
    if (info.storage === "stack") {
      return [
        "    ld a,(AMY_FP5_FPA1+0)",
        `    ld (ix${info.offset < 0 ? info.offset : `+${info.offset}`}),a`,
        "    ld a,(AMY_FP5_FPA1+1)",
        `    ld (ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`}),a`,
        "    ld a,(AMY_FP5_FPA1+2)",
        `    ld (ix${info.offset + 2 < 0 ? info.offset + 2 : `+${info.offset + 2}`}),a`,
        "    ld a,(AMY_FP5_FPA1+3)",
        `    ld (ix${info.offset + 3 < 0 ? info.offset + 3 : `+${info.offset + 3}`}),a`,
        "    ld a,(AMY_FP5_FPA1+4)",
        `    ld (ix${info.offset + 4 < 0 ? info.offset + 4 : `+${info.offset + 4}`}),a`
      ];
    }
    return [
      `    ld hl,${scopedRuntimeName(name)}`,
      "    call AMY_FP5_STORE_FPA1_TO_MEM"
    ];
  }

  function emitStoreFpa2ToFp5Target(name) {
    const info = getRuntimeInfo(name);
    if (!info) return null;
    if (info.storage === "stack") {
      return [
        "    ld a,(AMY_FP5_FPA2+0)",
        `    ld (ix${info.offset < 0 ? info.offset : `+${info.offset}`}),a`,
        "    ld a,(AMY_FP5_FPA2+1)",
        `    ld (ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`}),a`,
        "    ld a,(AMY_FP5_FPA2+2)",
        `    ld (ix${info.offset + 2 < 0 ? info.offset + 2 : `+${info.offset + 2}`}),a`,
        "    ld a,(AMY_FP5_FPA2+3)",
        `    ld (ix${info.offset + 3 < 0 ? info.offset + 3 : `+${info.offset + 3}`}),a`,
        "    ld a,(AMY_FP5_FPA2+4)",
        `    ld (ix${info.offset + 4 < 0 ? info.offset + 4 : `+${info.offset + 4}`}),a`
      ];
    }
    return [
      `    ld hl,${scopedRuntimeName(name)}`,
      "    call AMY_FP5_STORE_FPA2_TO_MEM"
    ];
  }

  function emitLoadFp5SourceToFpa(valueToken, fpa) {
    const info = getRuntimeInfo(valueToken);
    const fpaLabel = fpa === 2 ? "AMY_FP5_FPA2" : "AMY_FP5_FPA1";
    if (info && info.type === "fp5") {
      if (info.storage === "stack") {
        const lines = [];
        for (let index = 0; index < 5; index += 1) {
          const offset = info.offset + index;
          lines.push(`    ld a,(ix${offset < 0 ? offset : `+${offset}`})`);
          lines.push(`    ld (${fpaLabel}+${index}),a`);
        }
        return lines;
      }
      return [
        `    ld hl,${scopedRuntimeName(valueToken)}`,
        `    call ${fpa === 2 ? "AMY_FP5_LOAD_MEM_TO_FPA2" : "AMY_FP5_LOAD_MEM_TO_FPA1"}`
      ];
    }
    const loadHL = emitLoadInt16IntoHL(valueToken);
    if (!loadHL) return null;
    const signed = isSignedDeclaredType(resolveDeclaredValueType(valueToken)) || String(valueToken || "").trim().startsWith("-");
    const lines = [
      ...loadHL,
      `    call ${signed ? "AMY_FP5_I16_TO_FPA1" : "AMY_FP5_U16_TO_FPA1"}`
    ];
    if (fpa === 2) lines.push("    call AMY_FP5_COPY_FPA1_TO_FPA2");
    return lines;
  }

  function emitRandomFp5BetweenStore(name, minToken, maxToken) {
    const loadMax = emitLoadFp5SourceToFpa(maxToken, 2);
    const loadMinForRange = emitLoadFp5SourceToFpa(minToken, 1);
    const loadMinForOffset = emitLoadFp5SourceToFpa(minToken, 1);
    const storeTarget = emitStoreFpa2ToFp5Target(name);
    if (!loadMax || !loadMinForRange || !loadMinForOffset || !storeTarget) return null;
    return [
      ...loadMax,
      ...loadMinForRange,
      "    call AMY_FP5_SUB_FPA1_FROM_FPA2",
      "    call AMY_FP5_RND",
      "    call AMY_FP5_MUL_FPA1_FPA2",
      ...loadMinForOffset,
      "    call AMY_FP5_ADD_FPA1_TO_FPA2",
      ...storeTarget
    ];
  }

  function encodeFp5Number(value) {
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

  function emitStoreImmediateFp5Bytes(name, bytes) {
    const info = getRuntimeInfo(name);
    if (!info || info.type !== "fp5" || !Array.isArray(bytes) || bytes.length !== 5) return null;
    if (info.storage === "stack") {
      return bytes.map((value, index) => {
        const offset = info.offset + index;
        return `    ld (ix${offset < 0 ? offset : `+${offset}`}),${formatHex8(value)}`;
      });
    }
    const baseName = scopedRuntimeName(name);
    return bytes.flatMap((value, index) => [
      `    ld a,${formatHex8(value)}`,
      `    ld (${baseName}+${index}),a`
    ]);
  }

  function emitPushImmediateFp5Bytes(bytes) {
    if (!Array.isArray(bytes) || bytes.length !== 5) return null;
    return [
      "    dec sp",
      `    ld a,${formatHex8(bytes[4])}`,
      "    ld hl,0",
      "    add hl,sp",
      "    ld (hl),a",
      `    ld hl,${formatHex16(((bytes[3] & 0xFF) << 8) | (bytes[2] & 0xFF))}`,
      "    push hl",
      `    ld hl,${formatHex16(((bytes[1] & 0xFF) << 8) | (bytes[0] & 0xFF))}`,
      "    push hl"
    ];
  }

  function emitPushFp5FromFPA1() {
    return [
      "    dec sp",
      "    ld a,(AMY_FP5_FPA1+4)",
      "    ld hl,0",
      "    add hl,sp",
      "    ld (hl),a",
      "    ld hl,(AMY_FP5_FPA1+2)",
      "    push hl",
      "    ld hl,(AMY_FP5_FPA1+0)",
      "    push hl"
    ];
  }

  function encodeSignedIntegerBytes(value, byteCount) {
    const totalBits = byteCount * 8;
    const maxUnsigned = 2 ** totalBits;
    let wrapped = Math.trunc(value);
    wrapped = ((wrapped % maxUnsigned) + maxUnsigned) % maxUnsigned;
    const bytes = [];
    for (let index = 0; index < byteCount; index += 1) {
      bytes.push((wrapped >> (index * 8)) & 0xFF);
    }
    return bytes;
  }

  function emitStoreImmediateBytes(name, bytes) {
    const info = getRuntimeInfo(name);
    if (!info || info.kind === "array") return null;
    if (info.storage === "stack") {
      return bytes.map((value, index) => {
        const offset = info.offset + index;
        return `    ld (ix${offset < 0 ? offset : `+${offset}`}),${formatHex8(value)}`;
      });
    }
    const baseName = scopedRuntimeName(name);
    return bytes.flatMap((value, index) => [
      `    ld a,${formatHex8(value)}`,
      `    ld (${baseName}+${index}),a`
    ]);
  }

  function emitCopyBytes(sourceToken, targetToken, byteCount) {
    const srcInfo = getRuntimeInfo(sourceToken);
    const dstInfo = getRuntimeInfo(targetToken);
    if (!srcInfo || !dstInfo) return null;
    if (srcInfo.storage !== "stack" && dstInfo.storage !== "stack") {
      return [
        `    ld hl,${scopedRuntimeName(sourceToken)}`,
        `    ld de,${scopedRuntimeName(targetToken)}`,
        `    ld bc,${byteCount}`,
        "    ldir"
      ];
    }
    const lines = [];
    for (let index = 0; index < byteCount; index += 1) {
      if (srcInfo.storage === "stack") {
        const srcOffset = srcInfo.offset + index;
        lines.push(`    ld a,(ix${srcOffset < 0 ? srcOffset : `+${srcOffset}`})`);
      } else {
        lines.push(`    ld a,(${scopedRuntimeName(sourceToken)}+${index})`);
      }
      if (dstInfo.storage === "stack") {
        const dstOffset = dstInfo.offset + index;
        lines.push(`    ld (ix${dstOffset < 0 ? dstOffset : `+${dstOffset}`}),a`);
      } else {
        lines.push(`    ld (${scopedRuntimeName(targetToken)}+${index}),a`);
      }
    }
    return lines;
  }

  function emitLoadInt16IntoHL(token, preferredDeclaredType = null) {
    const normalized = normalizeExpression(String(token).trim());
    if (isAnyFixedDeclaredType(preferredDeclaredType)) {
      const fixedLiteral = parseFixedPointLiteral(normalized);
      if (fixedLiteral !== null) return [`    ld hl,${formatFixedPointLiteral16(fixedLiteral)}`];
    }
    const numericLiteral = parseNumericLiteral(normalized);
    if (numericLiteral !== null && Number.isInteger(numericLiteral)) {
      return [`    ld hl,${symbolOrValue(normalized)}`];
    }
    const expressionAst = parseExpressionAst(normalized);
    if (expressionAst && (expressionAst.kind === "binary" || expressionAst.kind === "unary")) {
      const astCode = emitLoadInt16AstIntoHL(expressionAst, preferredDeclaredType);
      if (astCode) return astCode;
    }
    if (expressionAst?.kind === "call" && String(expressionAst.name || "").toLowerCase() === "random" && (expressionAst.args.length === 1 || expressionAst.args.length === 2)) {
      const computed = emitComputeExpressionAst(expressionAst, null);
      if (computed?.runtimeType === "int16") return [...computed.lines];
      if (computed?.runtimeType === "int8") {
        if (isAnyFixedDeclaredType(preferredDeclaredType)) {
          return [...computed.lines, "    ld h,a", "    ld l,0"];
        }
        if (isSignedDeclaredType(computed.declaredType)) {
          return [...computed.lines, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a"];
        }
        return [...computed.lines, "    ld l,a", "    ld h,0"];
      }
    }
    const builtinInput = parseBuiltinInputRef(expressionAst || normalized);
    if (builtinInput?.source === "frame") {
      return [
        "    ld hl,AMY_FRAME_COUNTER",
        "    ld e,(hl)",
        "    inc hl",
        "    ld d,(hl)",
        "    ex de,hl"
      ];
    }
    if (builtinInput?.valueType === "int8") {
      const loadByte = emitLoadInt8Into("a", normalized);
      if (!loadByte) return null;
      if (isAnyFixedDeclaredType(preferredDeclaredType)) {
        return [...loadByte, "    ld h,a", "    ld l,0"];
      }
      if (isSignedDeclaredType(builtinInput.declaredType)) {
        return [...loadByte, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a"];
      }
      return [...loadByte, "    ld l,a", "    ld h,0"];
    }
    const dwordWordPart = parseDwordWordComponent(token);
    if (dwordWordPart) {
      return emitLoadDwordInt16ComponentIntoHL(dwordWordPart.valueToken, dwordWordPart.component);
    }
    const recordField = parseRecordFieldRef(token);
    if (recordField) {
      if (recordField.fieldInfo.type !== "int16") return null;
      const directAddress = getDirectRecordFieldAddress?.(token);
      if (directAddress) {
        return [
          `    ld a,(${directAddress}+0)`,
          "    ld l,a",
          `    ld a,(${directAddress}+1)`,
          "    ld h,a"
        ];
      }
      const loadAddress = emitLoadRecordFieldAddressIntoHL(token);
      if (!loadAddress) return null;
      return [...loadAddress, "    ld e,(hl)", "    inc hl", "    ld d,(hl)", "    ld h,d", "    ld l,e"];
    }
    const arrayRef = parseArrayRef(token);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info || info.kind !== "array" || info.elementType !== "int16") return null;
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      return [...loadAddress, "    ld e,(hl)", "    inc hl", "    ld d,(hl)", "    ld h,d", "    ld l,e"];
    }
    const functionCall = emitFunctionInvocation(token);
    if (functionCall) {
      if (functionCall.returnType === "int16") return [...functionCall.lines];
      if (functionCall.returnType === "int8") {
        if (isAnyFixedDeclaredType(preferredDeclaredType)) {
          return [...functionCall.lines, "    ld h,a", "    ld l,0"];
        }
        const declaredType = resolveDeclaredValueType(token);
        if (isSignedDeclaredType(declaredType)) {
          return [...functionCall.lines, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a"];
        }
        return [...functionCall.lines, "    ld l,a", "    ld h,0"];
      }
      return null;
    }
    const resolvedToken = scopedRuntimeName(token);
    const info = getRuntimeInfo(token);
    if (!info) return [`    ld hl,${symbolOrValue(token)}`];
    if (isAnyFixedDeclaredType(preferredDeclaredType) && info.type === "int8") {
      const loadByte = emitLoadInt8Into("a", token);
      if (!loadByte) return null;
      return [...loadByte, "    ld h,a", "    ld l,0"];
    }
    if (info.type !== "int16") return null;
    if (info.storage === "stack") {
      return [
        `    ld l,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
        `    ld h,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`
      ];
    }
    return [`    ld hl,(${resolvedToken})`];
  }

  function emitRuntimeStore(name, value) {
    const targetInfo = getRuntimeInfo(name);
    if (targetInfo && targetInfo.kind === "packed_bool") {
      const normVal = normalizeExpression(value);
      if (normVal === "0") {
        if (targetInfo.storage === "stack") return [`    res ${targetInfo.bit},(ix${(targetInfo.packOffset ?? targetInfo.offset) < 0 ? (targetInfo.packOffset ?? targetInfo.offset) : `+${targetInfo.packOffset ?? targetInfo.offset}`})`];
        return [`    ld hl,${targetInfo.packLabel}`, `    res ${targetInfo.bit},(hl)`];
      }
      if (normVal === "1") {
        if (targetInfo.storage === "stack") return [`    set ${targetInfo.bit},(ix${(targetInfo.packOffset ?? targetInfo.offset) < 0 ? (targetInfo.packOffset ?? targetInfo.offset) : `+${targetInfo.packOffset ?? targetInfo.offset}`})`];
        return [`    ld hl,${targetInfo.packLabel}`, `    set ${targetInfo.bit},(hl)`];
      }
    }
    if (targetInfo && targetInfo.kind === "bcd") {
      return emitBcdStore(name, value);
    }
    const targetType = resolveValueType(name);
    if (!targetType) return null;
    const targetDeclaredType = resolveDeclaredValueType(name);
    const sourceType = resolveValueType(value);
    const sourceDeclaredType = resolveDeclaredValueType(value);
    const compileTimeNumericValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(value)
      : null;
    if (targetType === "i32" && isFix16_16DeclaredType(targetDeclaredType) && /^random\s*\(\s*\)$/i.test(String(value).trim())) {
      const storeTarget = emitStoreMemory32ToTarget("AMY_BUFFER32", name);
      if (!storeTarget) return null;
      return ["    call AMY_FX16_16_RND", ...storeTarget];
    }
    if (targetType === "fp5") {
      const randomArgs = parseRandomCallArgs(value);
      if (randomArgs && randomArgs.length === 0) {
        const storeTarget = emitStoreFpa1ToFp5Target(name);
        if (!storeTarget) return null;
        return ["    call AMY_FP5_RND", ...storeTarget];
      }
      if (randomArgs && randomArgs.length === 2) {
        const randomStore = emitRandomFp5BetweenStore(name, randomArgs[0], randomArgs[1]);
        if (randomStore) return randomStore;
      }
      if (isFp5ZeroValue(value)) return emitStoreZeroBytes(name, 5);
      if (compileTimeNumericValue !== null) {
        const encoded = encodeFp5Number(compileTimeNumericValue);
        if (encoded) return emitStoreImmediateFp5Bytes(name, encoded);
      }
      if (sourceType === "fp5") return emitCopyBytes(value, name, 5);
      if (sourceType === "int8" || sourceType === "int16") {
        const targetInfo = getRuntimeInfo(name);
        const sourceInfo = getRuntimeInfo(value);
        if (!targetInfo) return null;
        const convertCall = isSignedDeclaredType(sourceDeclaredType)
          ? "    call AMY_FP5_I16_TO_FPA1"
          : "    call AMY_FP5_U16_TO_FPA1";
        let loadSource = null;
        if (sourceInfo && sourceInfo.type === "int16" && sourceInfo.storage !== "stack") {
          loadSource = [
            `    ld hl,${scopedRuntimeName(value)}`,
            `    call ${isSignedDeclaredType(sourceDeclaredType) ? "AMY_FP5_LOAD_I16_MEM_TO_FPA1" : "AMY_FP5_LOAD_U16_MEM_TO_FPA1"}`
          ];
        } else {
          loadSource = emitLoadInt16IntoHL(value);
          if (!loadSource) return null;
          loadSource = [...loadSource, convertCall];
        }
        const storeTarget = emitStoreFpa1ToFp5Target(name);
        if (!storeTarget) return null;
        return [...loadSource, ...storeTarget];
      }
      const numericLiteral = /^-?[0-9]+$/.test(String(value).trim()) || /^-?\$[0-9A-Fa-f]+$/.test(String(value).trim()) || /^-?0x[0-9A-Fa-f]+$/i.test(String(value).trim());
      if (numericLiteral) {
        const loadSource = emitLoadInt16IntoHL(value);
        if (!loadSource) return null;
        const targetInfo = getRuntimeInfo(name);
        if (!targetInfo) return null;
        const signedLiteral = String(value).trim().startsWith("-");
        const convertCall = signedLiteral ? "    call AMY_FP5_I16_TO_FPA1" : "    call AMY_FP5_U16_TO_FPA1";
        const storeTarget = emitStoreFpa1ToFp5Target(name);
        if (!storeTarget) return null;
        return [...loadSource, convertCall, ...storeTarget];
      }
      return null;
    }
    if (compileTimeNumericValue !== null) {
      if (targetType === "i32" && isFix16_16DeclaredType(targetDeclaredType)) {
        return emitStoreImmediateBytes(name, encodeSignedIntegerBytes(Math.round(compileTimeNumericValue * 65536), 4));
      }
      if (targetType === "int16" && isAnyFixedDeclaredType(targetDeclaredType)) {
        return emitStoreImmediateBytes(name, encodeSignedIntegerBytes(Math.round(compileTimeNumericValue * 256), 2));
      }
    }
    if (sourceType === "fp5") return null;
    const valueAst = parseExpressionAst(value);
    if ((targetType === "int8" || targetType === "int16") && valueAst) {
      const computed = emitComputeExpressionAst(valueAst, targetDeclaredType);
      const stored = emitStoreComputedExpression(name, computed);
      if (stored) return stored;
    }
    if (targetType === "int8") {
      if (sourceType) {
        if (sourceType !== "int8") return null;
        const loadSource = emitLoadInt8Into("a", value);
        const storeTarget = emitStoreInt8FromA(name);
        if (!loadSource || !storeTarget) return null;
        return [...loadSource, ...storeTarget];
      }
      const loadValue = emitLoadInt8ValueInto("a", value);
      const storeTarget = emitStoreInt8FromA(name);
      if (!loadValue || !storeTarget) return null;
      return [...loadValue, ...storeTarget];
    }
    if (targetType === "int16" && valueAst) {
      const loadExpr = emitLoadInt16AstIntoHL(valueAst, targetDeclaredType);
      const storeTarget = emitStoreInt16FromHL(name);
      if (loadExpr && storeTarget) return [...loadExpr, ...storeTarget];
    }
    if (sourceType) {
      if (targetType === "i32" && isFix16_16DeclaredType(targetDeclaredType)) {
        const scratch = ensureCompareScratch32();
        const storeSrc = emitStoreFx16Source(value, scratch.leftLabel);
        const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
        if (!storeSrc || !storeTarget) return null;
        return [...storeSrc, ...storeTarget];
      }
      if (targetType === "u32" || targetType === "i32") {
        if (sourceType === "u32" || sourceType === "i32") {
          const srcInfo = getRuntimeInfo(value);
          const dstInfo = getRuntimeInfo(name);
          if (srcInfo && dstInfo && srcInfo.storage !== "stack" && dstInfo.storage !== "stack") {
            return [
              `    ld hl,${srcInfo.asmName}`,
              `    ld de,${dstInfo.asmName}`,
              "    ld bc,4",
              "    ldir"
            ];
          }
        }
        const scratch = ensureCompareScratch32();
        const storeValue = emitStoreExtended32(value, scratch.leftLabel);
        const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
        if (!storeValue || !storeTarget) return null;
        return [...storeValue, ...storeTarget];
      }
      if (sourceType === "int16") {
        const loadSource = emitLoadInt16IntoHL(value, targetDeclaredType);
        const storeTarget = emitStoreInt16FromHL(name);
        if (!loadSource || !storeTarget) return null;
        return [...loadSource, ...storeTarget];
      }
      const loadSource = emitLoadInt8Into("a", value);
      const storeTarget = emitStoreInt16FromHL(name);
      if (!loadSource || !storeTarget) return null;
      if (isAnyFixedDeclaredType(targetDeclaredType)) {
        return [...loadSource, "    ld h,a", "    ld l,0", ...storeTarget];
      }
      if (isSignedDeclaredType(sourceDeclaredType)) {
        return [...loadSource, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a", ...storeTarget];
      }
      return [...loadSource, "    ld l,a", "    ld h,0", ...storeTarget];
    }
    if (targetType === "i32" && isFix16_16DeclaredType(targetDeclaredType)) {
      const scratch = ensureCompareScratch32();
      const storeSrc = emitStoreFx16Source(value, scratch.leftLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
      if (!storeSrc || !storeTarget) return null;
      return [...storeSrc, ...storeTarget];
    }
    if (targetType === "u32" || targetType === "i32") {
      const scratch = ensureCompareScratch32();
      const storeValue = emitStoreExtended32(value, scratch.leftLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
      if (!storeValue || !storeTarget) return null;
      return [...storeValue, ...storeTarget];
    }
    const storeTarget = emitStoreInt16FromHL(name);
    if (!storeTarget) return null;
    if (isAnyFixedDeclaredType(targetDeclaredType)) {
      const fixedLiteral = parseFixedPointLiteral(value);
      if (fixedLiteral !== null) return [`    ld hl,${formatFixedPointLiteral16(fixedLiteral)}`, ...storeTarget];
    }
    return [`    ld hl,${symbolOrValue(value)}`, ...storeTarget];
  }

  function emitStoreImmediate32(baseLabel, value) {
    const unsigned = value < 0 ? (0x100000000 + value) >>> 0 : value >>> 0;
    const bytes = [
      unsigned & 0xFF,
      (unsigned >>> 8) & 0xFF,
      (unsigned >>> 16) & 0xFF,
      (unsigned >>> 24) & 0xFF
    ];
    const lines = [];
    let lastA = null;
    bytes.forEach((byte, index) => {
      if (lastA !== byte) {
        lines.push(`    ld a,${formatHex8(byte)}`);
        lastA = byte;
      }
      lines.push(`    ld (${baseLabel}+${index}),a`);
    });
    return lines;
  }

    function emitPushArgument(token, paramInfo) {
      const type = paramInfo.type;
      const declaredType = paramInfo.declaredType || type;
      if (type === "u32" || type === "i32") {
      ensureCompareScratch32();
      const storeArg = emitStoreExtended32(token, "AMY_CMP_LEFT32");
        if (!storeArg) return null;
        return [
          ...storeArg,
          "    ld hl,(AMY_CMP_LEFT32+2)",
        "    push hl",
        "    ld hl,(AMY_CMP_LEFT32+0)",
        "    push hl"
      ];
    }
    if (type === "int16") {
      const loadArg = emitLoadInt16IntoHL(token);
      if (!loadArg) return null;
      return [...loadArg, "    push hl"];
    }
    if (type === "int8") {
      const constantValue = tryEvaluateCompileTimeNumericExpression(token);
      if (constantValue !== null) {
        const widened = isSignedDeclaredType(declaredType)
          ? ((constantValue << 24) >> 24)
          : (constantValue & 0xFF);
        return [`    ld hl,${formatHex16(widened & 0xFFFF)}`, "    push hl"];
      }
      const loadArg = emitLoadInt8Into("a", token);
      if (!loadArg) return null;
      if (isSignedDeclaredType(declaredType)) {
        return [
          ...loadArg,
          "    ld l,a",
          "    add a,a",
          "    sbc a,a",
          "    ld h,a",
          "    push hl"
        ];
      }
      return [
        ...loadArg,
        "    ld l,a",
        "    ld h,0",
        "    push hl"
      ];
    }
    if (type === "fp5") {
      const fpInfo = getRuntimeInfo(token);
      if (fpInfo?.type === "fp5") {
        if (fpInfo.storage === "stack") {
          return [
            "    dec sp",
            `    ld a,(ix${fpInfo.offset + 4 < 0 ? fpInfo.offset + 4 : `+${fpInfo.offset + 4}`})`,
            "    ld hl,0",
            "    add hl,sp",
            "    ld (hl),a",
            `    ld a,(ix${fpInfo.offset + 3 < 0 ? fpInfo.offset + 3 : `+${fpInfo.offset + 3}`})`,
            "    ld h,a",
            `    ld a,(ix${fpInfo.offset + 2 < 0 ? fpInfo.offset + 2 : `+${fpInfo.offset + 2}`})`,
            "    ld l,a",
            "    push hl",
            `    ld a,(ix${fpInfo.offset + 1 < 0 ? fpInfo.offset + 1 : `+${fpInfo.offset + 1}`})`,
            "    ld h,a",
            `    ld a,(ix${fpInfo.offset + 0 < 0 ? fpInfo.offset + 0 : `+${fpInfo.offset + 0}`})`,
            "    ld l,a",
            "    push hl"
          ];
        }
        const baseName = scopedRuntimeName(token);
        return [
          "    dec sp",
          `    ld a,(${baseName}+4)`,
          "    ld hl,0",
          "    add hl,sp",
          "    ld (hl),a",
          `    ld hl,(${baseName}+2)`,
          "    push hl",
          `    ld hl,(${baseName}+0)`,
          "    push hl"
        ];
      }
      const constantValue = tryEvaluateCompileTimeNumericExpression(token);
      if (constantValue !== null) {
        const bytes = encodeFp5Number(constantValue);
        return bytes ? emitPushImmediateFp5Bytes(bytes) : null;
      }
      const sourceType = resolveValueType(token);
      const declaredSourceType = resolveDeclaredValueType(token);
      if (sourceType === "int16" || sourceType === "int8") {
        const loadArg = sourceType === "int8"
          ? emitLoadInt8Into("a", token)
          : emitLoadInt16AstIntoHL(parseExpressionAst(normalizeExpression(String(token).trim())));
        if (!loadArg) return null;
        const signed = isSignedDeclaredType(declaredSourceType);
        const promote = sourceType === "int8"
          ? [
              "    ld l,a",
              ...(signed ? ["    add a,a", "    sbc a,a"] : ["    ld a,0"]),
              "    ld h,a"
            ]
          : [];
        return [
          ...loadArg,
          ...promote,
          `    call ${signed ? "AMY_FP5_I16_TO_FPA1" : "AMY_FP5_U16_TO_FPA1"}`,
          ...emitPushFp5FromFPA1()
        ];
      }
      return null;
    }
    return null;
  }

  function ensureDataCursorVar() {
    const existing = runtimeState.getDataCursorName();
    if (existing) return existing;
    const name = "AMY_DATA_CURSOR";
    const address = reserveRam(name, runtimeTypeSize("int16"), "internal DATA cursor");
    runtimeState.runtimeVars.set(name, { type: "int16", declaredType: "u16", address, scope: "global", internal: true });
    runtimeState.runtimeDeclarations.push(`${name} EQU ${formatHex16(address)}`);
    runtimeState.setDataCursorName(name);
    return name;
  }

  return {
    emitLoadInt16IntoHL,
    emitRuntimeStore,
    emitStoreImmediate32,
    emitPushArgument,
    ensureDataCursorVar
  };
}
