export function createPrintHelpers(ctx) {
  const {
    state,
    reserveRam,
    runtimeVars,
    runtimeDeclarations,
    runtimeInit,
    formatHex16,
    emitLoadArrayAddressIntoHL,
    emitLoadInt8ValueInto,
    emitLoadInt8ValueIntoPreserving,
    emitLoadInt16IntoHL,
    makeGeneratedLabel,
    emitSafeCall,
    normalizeDeclaredType,
    isAnyFixedDeclaredType,
    isFix8_8DeclaredType,
    isFix16_16DeclaredType,
    ensureCompareScratch32,
    emitPrepareU32Source,
    emitPrepareI32Source,
    resolveDeclaredValueType,
    isSignedDeclaredType,
    resolveExpressionAstComputationType,
    parseExpressionAst,
    parseNumericLiteral,
    resolveValueType,
    emitTextLiteral,
    tryEvaluateByteConstantExpression,
    normalizeExpression,
    getRuntimeInfo,
    emitBcdPrint,
    getBcdDigitCount,
    emitFormatBcdIntoBuffer
  } = ctx;

  function ensureNumericFormatVars() {
    if (state.numericDigitBaseName && state.numericPadCharName) {
      return { digitBaseName: state.numericDigitBaseName, padCharName: state.numericPadCharName };
    }
    state.numericDigitBaseName = "AMY_NUMERIC_DIGIT_BASE";
    state.numericPadCharName = "AMY_NUMERIC_PAD_CHAR";
    const digitBaseAddress = reserveRam(state.numericDigitBaseName, 1, "internal numeric digit tile base");
    const padCharAddress = reserveRam(state.numericPadCharName, 1, "internal numeric pad tile");
    runtimeVars.set(state.numericDigitBaseName, { type: "int8", declaredType: "u8", address: digitBaseAddress, scope: "global", internal: true });
    runtimeVars.set(state.numericPadCharName, { type: "int8", declaredType: "u8", address: padCharAddress, scope: "global", internal: true });
    runtimeDeclarations.push(`${state.numericDigitBaseName} EQU ${formatHex16(digitBaseAddress)}`);
    runtimeDeclarations.push(`${state.numericPadCharName} EQU ${formatHex16(padCharAddress)}`);
    state.hasRuntimeRamDeclarations = true;
    state.hasRuntimeInit = true;
    runtimeInit.push("    ld a,$30");
    runtimeInit.push(`    ld (${state.numericDigitBaseName}),a`);
    runtimeInit.push("    ld a,$20");
    runtimeInit.push(`    ld (${state.numericPadCharName}),a`);
    return { digitBaseName: state.numericDigitBaseName, padCharName: state.numericPadCharName };
  }

  function ensureFp5TextBuffer() {
    if (state.fp5TextBufferName) return state.fp5TextBufferName;
    state.fp5TextBufferName = "AMY_FP5_TEXT_BUFFER";
    const address = reserveRam(state.fp5TextBufferName, 16, "internal float text buffer");
    runtimeVars.set(state.fp5TextBufferName, { kind: "array", type: "int8", declaredType: "u8", elementType: "int8", address, length: 16, scope: "global", internal: true, asmName: state.fp5TextBufferName });
    runtimeDeclarations.push(`${state.fp5TextBufferName} EQU ${formatHex16(address)}`);
    state.hasRuntimeRamDeclarations = true;
    return state.fp5TextBufferName;
  }

  function ensureTextExprBuffer() {
    if (state.textExprBufferName) return state.textExprBufferName;
    state.textExprBufferName = "AMY_TEXT_EXPR_BUFFER";
    const address = reserveRam(state.textExprBufferName, 16, "internal text expression buffer");
    runtimeVars.set(state.textExprBufferName, { kind: "array", type: "int8", declaredType: "u8", elementType: "int8", address, length: 16, scope: "global", internal: true, asmName: state.textExprBufferName });
    runtimeDeclarations.push(`${state.textExprBufferName} EQU ${formatHex16(address)}`);
    state.hasRuntimeRamDeclarations = true;
    return state.textExprBufferName;
  }

  function ensureFp5FriendlyFormatVars() {
    if (state.fp5FriendlyFirstIntName && state.fp5FriendlyDotName && state.fp5FriendlyLastFracName) {
      return {
        firstIntName: state.fp5FriendlyFirstIntName,
        dotName: state.fp5FriendlyDotName,
        lastFracName: state.fp5FriendlyLastFracName
      };
    }
    state.fp5FriendlyFirstIntName = "AMY_FP5_FRIENDLY_FIRST_INT";
    state.fp5FriendlyDotName = "AMY_FP5_FRIENDLY_DOT";
    state.fp5FriendlyLastFracName = "AMY_FP5_FRIENDLY_LAST_FRAC";
    const firstIntAddress = reserveRam(state.fp5FriendlyFirstIntName, 1, "internal float friendly first-int offset");
    const dotAddress = reserveRam(state.fp5FriendlyDotName, 1, "internal float friendly dot offset");
    const lastFracAddress = reserveRam(state.fp5FriendlyLastFracName, 1, "internal float friendly last-frac offset");
    runtimeVars.set(state.fp5FriendlyFirstIntName, { type: "int8", declaredType: "u8", address: firstIntAddress, scope: "global", internal: true });
    runtimeVars.set(state.fp5FriendlyDotName, { type: "int8", declaredType: "u8", address: dotAddress, scope: "global", internal: true });
    runtimeVars.set(state.fp5FriendlyLastFracName, { type: "int8", declaredType: "u8", address: lastFracAddress, scope: "global", internal: true });
    runtimeDeclarations.push(`${state.fp5FriendlyFirstIntName} EQU ${formatHex16(firstIntAddress)}`);
    runtimeDeclarations.push(`${state.fp5FriendlyDotName} EQU ${formatHex16(dotAddress)}`);
    runtimeDeclarations.push(`${state.fp5FriendlyLastFracName} EQU ${formatHex16(lastFracAddress)}`);
    state.hasRuntimeRamDeclarations = true;
    return {
      firstIntName: state.fp5FriendlyFirstIntName,
      dotName: state.fp5FriendlyDotName,
      lastFracName: state.fp5FriendlyLastFracName
    };
  }

  function emitNumericPostprocessAt(bufferRef, count, widthMode = false) {
    const width = Number.parseInt(String(count), 10);
    if (!Number.isInteger(width) || width < 1) return null;
    ensureNumericFormatVars();
    state.needsNumericPostprocessHelpers = true;
    if (widthMode) state.needsNumericPostprocessWidthHelper = true;
    return [
      `    ld hl,${bufferRef}`,
      `    ld b,${width}`,
      `    call ${widthMode ? "AMY_NUMERIC_POSTPROCESS_WIDTH" : "AMY_NUMERIC_POSTPROCESS"}`
    ];
  }

  function emitNumericPostprocessBuffer(bufferToken, count, widthMode = false) {
    const loadDest = emitLoadArrayAddressIntoHL(bufferToken, "0");
    const width = Number.parseInt(String(count), 10);
    if (!loadDest || !Number.isInteger(width) || width < 1) return null;
    ensureNumericFormatVars();
    state.needsNumericPostprocessHelpers = true;
    if (widthMode) state.needsNumericPostprocessWidthHelper = true;
    return [
      ...loadDest,
      `    ld b,${width}`,
      `    call ${widthMode ? "AMY_NUMERIC_POSTPROCESS_WIDTH" : "AMY_NUMERIC_POSTPROCESS"}`
    ];
  }

  function emitPrintInt8AtAuto(valueToken, xToken, yToken, digitsToken, widthMode = false) {
    const loadValue = emitLoadInt8ValueInto("a", valueToken);
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadCoords || !loadValue) return null;
    const width = Number.parseInt(String(digitsToken), 10);
    const widthInfo = getRuntimeInfo(digitsToken);
    if (widthInfo) return null;
    if (!Number.isInteger(width) || width < 1 || width > 3) return null;
    const offset = 3 - width;
    const postprocess = emitNumericPostprocessAt(`AMY_BUFFER32${offset ? `+${offset}` : ""}`, width, widthMode);
    if (!postprocess) return null;
    return [
      ...loadValue,
      "    ld de,AMY_BUFFER32",
      "    call AMY_U8_TO_ASCII3",
      ...postprocess,
      ...loadCoords,
      `    ld hl,AMY_BUFFER32${offset ? `+${offset}` : ""}`,
      `    ld b,${width}`,
      "    call AMY_PUT_AT"
    ];
  }

  function emitPrintInt16FromCurrentHLAt(xToken, yToken, digits, xAdvance = 0) {
    if (!Number.isInteger(digits) || digits < 1 || digits > 5) return null;
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadCoords) return null;
    const allPowers = [10000, 1000, 100, 10, 1];
    const powers = allPowers.slice(allPowers.length - digits);
    const result = [];
    for (let i = 0; i < powers.length; i++) {
      const power = powers[i];
      result.push(...loadCoords);
      for (let j = 0; j < xAdvance + i; j++) result.push("    inc e");
      if (power === 1) {
        result.push("    ld a,l");
      } else {
        const loopLabel = makeGeneratedLabel("PWordDig");
        result.push(`    ld bc,${power}`);
        result.push("    ld a,$FF");
        result.push(`${loopLabel}:`);
        result.push("    inc a");
        result.push("    or a");
        result.push("    sbc hl,bc");
        result.push(`    jr nc,${loopLabel}`);
        result.push("    add hl,bc");
      }
      result.push("    add a,$30");
      const isLastDigit = i === powers.length - 1;
      if (isLastDigit) {
        result.push("    call AMY_PUT_CHAR_AT");
      } else {
        result.push(...emitSafeCall("AMY_PUT_CHAR_AT", ["hl"]));
      }
    }
    return result;
  }

  function emitPrintInt16AtAuto(valueToken, xToken, yToken, digitsToken, widthMode = false) {
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 1 || digits > 5) return null;
    const loadHL = emitLoadInt16IntoHL(valueToken);
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadHL || !loadCoords) return null;
    const offset = 5 - digits;
    const postprocess = emitNumericPostprocessAt(`AMY_BUFFER32${offset ? `+${offset}` : ""}`, digits, widthMode);
    if (!postprocess) return null;
    return [
      ...loadHL,
      "    ld de,AMY_BUFFER32",
      "    call AMY_U16_TO_ASCII5",
      ...postprocess,
      ...loadCoords,
      `    ld hl,AMY_BUFFER32${offset ? `+${offset}` : ""}`,
      `    ld b,${digits}`,
      "    call AMY_PUT_AT"
    ];
  }

  function emitPrintI16At(valueToken, xToken, yToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (declaredType !== "i16") return null;
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 2 || digits > 6) return null;
    const loadHL = emitLoadInt16IntoHL(valueToken);
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadHL || !loadCoords) return null;
    const lines = [
      ...loadHL,
      "    ld de,AMY_BUFFER32",
      "    call AMY_I16_TO_ASCII6"
    ];
    if (digits < 6) {
      const magnitudeStart = 7 - digits;
      lines.push(`    ld hl,AMY_BUFFER32+${magnitudeStart}`);
      lines.push("    ld de,AMY_BUFFER32+1");
      lines.push(`    ld bc,${digits - 1}`);
      lines.push("    ldir");
    }
    lines.push(
      ...emitNumericPostprocessAt("AMY_BUFFER32", digits, widthMode),
      ...loadCoords,
      "    ld hl,AMY_BUFFER32",
      `    ld b,${digits}`,
      "    call AMY_PUT_AT"
    );
    return lines;
  }

  function emitPrintI8At(valueToken, xToken, yToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (declaredType !== "i8") return null;
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 2 || digits > 4) return null;
    const loadA = emitLoadInt8ValueInto("a", valueToken);
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    const offset = 3 - (digits - 1);
    const negativeLabel = makeGeneratedLabel("PrintI8Negative");
    const doneLabel = makeGeneratedLabel("PrintI8Done");
    if (!loadA || !loadCoords) return null;
    return [
      ...loadA,
      "    bit 7,a",
      `    jr nz,${negativeLabel}`,
      "    push af",
        "    ld a,$20",
        "    ld hl,AMY_BUFFER32",
        "    ld (hl),a",
      "    pop af",
      "    ld de,AMY_BUFFER32+1",
      "    call AMY_U8_TO_ASCII3",
      `    jr ${doneLabel}`,
      `${negativeLabel}:`,
      "    push af",
        "    ld a,$2D",
        "    ld hl,AMY_BUFFER32",
        "    ld (hl),a",
      "    pop af",
      "    cpl",
      "    inc a",
      "    ld de,AMY_BUFFER32+1",
      "    call AMY_U8_TO_ASCII3",
      `${doneLabel}:`,
      ...emitNumericPostprocessAt(`AMY_BUFFER32${offset ? `+${offset}` : ""}`, digits, widthMode),
      ...loadCoords,
      `    ld hl,AMY_BUFFER32${offset ? `+${offset}` : ""}`,
      `    ld b,${digits}`,
      "    call AMY_PUT_AT"
    ];
  }

  function emitPrintFix8_8At(valueToken, xToken, yToken) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (!isAnyFixedDeclaredType(declaredType)) return null;
    const isSigned = isFix8_8DeclaredType(declaredType);
    const width = isSigned ? 7 : 6;
    const loadHL = emitLoadInt16IntoHL(valueToken);
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadHL || !loadCoords) return null;
    return [
      ...loadHL,
      "    ld de,AMY_BUFFER32",
      `    call ${isSigned ? "AMY_SFX8_8_TO_ASCII7" : "AMY_FX8_8_TO_ASCII6"}`,
      ...emitNumericPostprocessAt("AMY_BUFFER32", width, false),
      ...loadCoords,
      "    ld hl,AMY_BUFFER32",
      `    ld b,${width}`,
      "    call AMY_PUT_AT"
    ];
  }

  function emitPrintFix16_16At(valueToken, xToken, yToken, digitsToken = null) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (!isFix16_16DeclaredType(declaredType)) return null;
    const digits = digitsToken == null ? 9 : Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || (digits !== 9 && digits !== 11)) return null;
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadCoords) return null;
    const scratch = ensureCompareScratch32();
    const source = emitPrepareI32Source(valueToken, scratch.leftLabel);
    if (!source) return null;
    const lines = [...source.lines];
    if (source.pointer !== scratch.leftLabel) {
      lines.push(
        `    ld hl,${source.pointer}`,
        `    ld de,${scratch.leftLabel}`,
        "    ld bc,4",
        "    ldir"
      );
    }
    lines.push(
      `    ld hl,${scratch.leftLabel}`,
      "    ld de,AMY_BUFFER32",
      `    call ${digits === 11 ? "AMY_FX16_16_TO_ASCII11" : "AMY_FX16_16_TO_ASCII9"}`
    );
    return [
      ...lines,
      ...emitNumericPostprocessAt("AMY_BUFFER32", digits, false),
      ...loadCoords,
      "    ld hl,AMY_BUFFER32",
      `    ld b,${digits}`,
      "    call AMY_PUT_AT"
    ];
  }

  function isFp5DeclaredType(declaredType) {
    return normalizeDeclaredType(declaredType) === "float" || normalizeDeclaredType(declaredType) === "fp5";
  }

  function getRuntimeAsmName(token) {
    const info = getRuntimeInfo(token);
    if (!info) return null;
    return info.asmName || token;
  }

  function emitPrepareFp5AsFix16_16(valueToken, targetPointer) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (!isFp5DeclaredType(declaredType) && resolveValueType(valueToken) !== "fp5") return null;
    const info = getRuntimeInfo(valueToken);
    if (!info) return null;
    if (info.storage === "stack") {
      return [
        `    ld a,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
        "    ld (AMY_FP5_FPA2+0),a",
        `    ld a,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`,
        "    ld (AMY_FP5_FPA2+1),a",
        `    ld a,(ix${info.offset + 2 < 0 ? info.offset + 2 : `+${info.offset + 2}`})`,
        "    ld (AMY_FP5_FPA2+2),a",
        `    ld a,(ix${info.offset + 3 < 0 ? info.offset + 3 : `+${info.offset + 3}`})`,
        "    ld (AMY_FP5_FPA2+3),a",
        `    ld a,(ix${info.offset + 4 < 0 ? info.offset + 4 : `+${info.offset + 4}`})`,
        "    ld (AMY_FP5_FPA2+4),a",
        "    ld hl,AMY_FP5_FPA2",
        `    ld de,${targetPointer}`,
        "    call AMY_FP5_TO_FX16_16"
      ];
    }
    const asmName = getRuntimeAsmName(valueToken);
    if (!asmName) return null;
    return [
      `    ld hl,${asmName}`,
      `    ld de,${targetPointer}`,
      "    call AMY_FP5_TO_FX16_16"
    ];
  }

  function emitPrintFp5At(valueToken, xToken, yToken, digitsToken = null) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (!isFp5DeclaredType(declaredType) && resolveValueType(valueToken) !== "fp5") return null;
    const digits = digitsToken == null ? 16 : Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits !== 16) return null;
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadCoords) return null;
    const info = getRuntimeInfo(valueToken);
    if (!info) return null;
    const textBuffer = ensureFp5TextBuffer();
    const loadSource = info.storage === "stack"
      ? [
          `    ld a,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
          "    ld (AMY_FP5_FPA2+0),a",
          `    ld a,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`,
          "    ld (AMY_FP5_FPA2+1),a",
          `    ld a,(ix${info.offset + 2 < 0 ? info.offset + 2 : `+${info.offset + 2}`})`,
          "    ld (AMY_FP5_FPA2+2),a",
          `    ld a,(ix${info.offset + 3 < 0 ? info.offset + 3 : `+${info.offset + 3}`})`,
          "    ld (AMY_FP5_FPA2+3),a",
          `    ld a,(ix${info.offset + 4 < 0 ? info.offset + 4 : `+${info.offset + 4}`})`,
          "    ld (AMY_FP5_FPA2+4),a",
          "    ld hl,AMY_FP5_FPA2"
        ]
      : [`    ld hl,${getRuntimeAsmName(valueToken)}`];
    return [
      ...loadSource,
      ...loadCoords,
      "    call AMY_PRINT_FP5_AT"
    ];
  }

  function emitPrintU32At(valueToken, xToken, yToken, widthMode = false) {
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadCoords) return null;
    const scratch = ensureCompareScratch32();
    const source = emitPrepareU32Source(valueToken, scratch.leftLabel);
    if (!source) return null;
    return [
      ...source.lines,
      `    ld hl,${source.pointer}`,
      "    ld de,AMY_BUFFER32+4",
      "    call AMY_U32_TO_ASCII10",
      ...emitNumericPostprocessAt("AMY_BUFFER32+4", 10, widthMode),
      ...loadCoords,
      "    ld hl,AMY_BUFFER32+4",
      "    ld b,10",
      "    call AMY_PUT_AT"
    ];
  }

  function emitPrintI32At(valueToken, xToken, yToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (declaredType !== "i32") return null;
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 2 || digits > 11) return null;
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!loadCoords) return null;
    const scratch = ensureCompareScratch32();
    const source = emitPrepareI32Source(valueToken, scratch.leftLabel);
    if (!source) return null;
    if (digits === 11) {
      return [
        ...source.lines,
        `    ld hl,${source.pointer}`,
        "    ld de,AMY_BUFFER32+4",
        "    call AMY_I32_TO_ASCII11",
        ...emitNumericPostprocessAt("AMY_BUFFER32+4", 11, widthMode),
        ...loadCoords,
        "    ld hl,AMY_BUFFER32+4",
        "    ld b,11",
        "    call AMY_PUT_AT"
      ];
    }
    const magnitudeStart = 12 - digits;
    return [
      ...source.lines,
      `    ld hl,${source.pointer}`,
      "    ld de,AMY_BUFFER32+4",
      "    call AMY_I32_TO_ASCII11",
      `    ld hl,AMY_BUFFER32+${4 + magnitudeStart}`,
      "    ld de,AMY_BUFFER32+5",
      `    ld bc,${digits - 1}`,
      "    ldir",
      ...emitNumericPostprocessAt("AMY_BUFFER32+4", digits, widthMode),
      ...loadCoords,
      "    ld hl,AMY_BUFFER32+4",
      `    ld b,${digits}`,
      "    call AMY_PUT_AT"
    ];
  }

  function emitPrintAutoAt(valueToken, xToken, yToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (declaredType === "i8") return emitPrintI8At(valueToken, xToken, yToken, digitsToken || "4", widthMode);
    if (declaredType === "i16") return emitPrintI16At(valueToken, xToken, yToken, digitsToken || "6", widthMode);
    if (declaredType === "i32") return emitPrintI32At(valueToken, xToken, yToken, digitsToken || "11", widthMode);
    if (declaredType === "u32") {
      if (digitsToken && digitsToken !== "10") return null;
      return emitPrintU32At(valueToken, xToken, yToken, widthMode);
    }
    if (isFp5DeclaredType(declaredType) || resolveValueType(valueToken) === "fp5") {
      return emitPrintFp5At(valueToken, xToken, yToken, digitsToken);
    }
    if (isFix16_16DeclaredType(declaredType)) {
      return emitPrintFix16_16At(valueToken, xToken, yToken, digitsToken);
    }
    if (isAnyFixedDeclaredType(declaredType)) {
      if (digitsToken) return null;
      return emitPrintFix8_8At(valueToken, xToken, yToken);
    }
    if (declaredType === "bcd") {
      if (digitsToken) return null;
      return emitBcdPrint(valueToken, xToken, yToken, null);
    }
    if (declaredType === "u8") {
      return emitPrintInt8AtAuto(valueToken, xToken, yToken, digitsToken || "3", widthMode);
    }
    if (declaredType === "boolean") {
      return emitPrintInt8AtAuto(valueToken, xToken, yToken, digitsToken || "1", widthMode);
    }
    if (declaredType === "u16") {
      return emitPrintInt16AtAuto(valueToken, xToken, yToken, digitsToken || "5", widthMode);
    }
    const valueType = resolveValueType(valueToken);
    if (valueType === "int8") return emitPrintInt8AtAuto(valueToken, xToken, yToken, digitsToken || "3", widthMode);
    if (valueType === "int16") return emitPrintInt16AtAuto(valueToken, xToken, yToken, digitsToken || "5", widthMode);
    return null;
  }

  function emitPrintLiteralAt(literalText, xToken, yToken) {
    const literal = emitTextLiteral(literalText);
    const loadY = emitLoadInt8ValueInto("d", yToken);
    const loadX = emitLoadInt8ValueInto("e", xToken);
    if (!loadY || !loadX) return null;
    const constY = tryEvaluateByteConstantExpression(yToken);
    const constX = tryEvaluateByteConstantExpression(xToken);
    const lines = [];
    if (constY !== null && constX !== null) {
      lines.push(`    ld de,${formatHex16(((constY << 5) + constX) & 0xFFFF)}`);
      lines.push("    ld hl,($73F6)");
      lines.push("    add hl,de");
    } else {
      lines.push(...loadY);
      lines.push(...loadX);
      lines.push("    call CALC_OFFSET");
      lines.push("    push de");
      lines.push("    ld hl,($73F6)");
      lines.push("    pop de");
      lines.push("    add hl,de");
    }
    lines.push("    ex de,hl");
    lines.push(`    ld hl,${literal.label}`);
    lines.push(`    ld bc,$${literal.length.toString(16).toUpperCase().padStart(4, "0")}`);
    lines.push("    call WRITE_VRAM");
    return { lines, width: literal.length };
  }

  function getDefaultPrintWidth(valueToken) {
    const directInfo = getRuntimeInfo(valueToken);
    if (directInfo?.kind === "bcd") return getBcdDigitCount(directInfo);

    const declaredType = resolveDeclaredValueType(valueToken)
      || resolveExpressionAstComputationType(parseExpressionAst(valueToken))?.declaredType;
    if (declaredType === "i8") return 4;
    if (declaredType === "i16") return 6;
    if (declaredType === "i32") return 11;
    if (declaredType === "u32") return 10;
    if (isFp5DeclaredType(declaredType)) return 16;
    if (isFix16_16DeclaredType(declaredType)) return 9;
    if (isFix8_8DeclaredType(declaredType)) return 7;
    if (normalizeDeclaredType(declaredType) === "ufix8_8") return 6;
    if (declaredType === "bcd") return directInfo ? getBcdDigitCount(directInfo) : null;
    if (declaredType === "u8") return 3;
    if (declaredType === "boolean") return 1;
    if (declaredType === "u16") return 5;

    const valueType = resolveValueType(valueToken);
    if (valueType === "int8") return 3;
    if (valueType === "int16") return 5;
    if (valueType === "u32") return 10;
    return null;
  }

  function splitTopLevelPlus(text) {
    const source = String(text || "").trim();
    if (!source) return [];
    const parts = [];
    let depthParen = 0;
    let depthBracket = 0;
    let depthBrace = 0;
    let inString = false;
    let start = 0;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (inString) {
        if (ch === "\"") inString = false;
        continue;
      }
      if (ch === "\"") {
        inString = true;
        continue;
      }
      if (ch === "(") {
        depthParen += 1;
        continue;
      }
      if (ch === ")") {
        if (depthParen > 0) depthParen -= 1;
        continue;
      }
      if (ch === "[") {
        depthBracket += 1;
        continue;
      }
      if (ch === "]") {
        if (depthBracket > 0) depthBracket -= 1;
        continue;
      }
      if (ch === "{") {
        depthBrace += 1;
        continue;
      }
      if (ch === "}") {
        if (depthBrace > 0) depthBrace -= 1;
        continue;
      }
      if (ch === "+" && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
        const piece = source.slice(start, i).trim();
        if (!piece) return [];
        parts.push(piece);
        start = i + 1;
      }
    }
    const tail = source.slice(start).trim();
    if (!tail) return [];
    parts.push(tail);
    return parts;
  }

  function splitTopLevelComma(text) {
    const source = String(text || "").trim();
    if (!source) return [];
    const parts = [];
    let depthParen = 0;
    let depthBracket = 0;
    let start = 0;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === "(") depthParen++;
      else if (ch === ")") depthParen = Math.max(0, depthParen - 1);
      else if (ch === "[") depthBracket++;
      else if (ch === "]") depthBracket = Math.max(0, depthBracket - 1);
      else if (ch === "," && depthParen === 0 && depthBracket === 0) {
        parts.push(source.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(source.slice(start).trim());
    return parts.filter(Boolean);
  }

  function parseNumericTextCall(segment) {
    const call = String(segment || "").trim().match(/^(str\$|digits\$|width\$)\s*\((.*)\)$/i)
      || String(segment || "").trim().match(/^(str\$)\s+(.+)$/i);
    if (!call) return null;
    const name = call[1].toLowerCase();
    const args = name === "str$" && !String(segment || "").includes("(")
      ? [call[2].trim()]
      : splitTopLevelComma(call[2]);
    if (!args.length) return null;

    if (name === "digits$" || name === "width$") {
      if (args.length !== 2) return null;
      const width = Number.parseInt(String(args[1]).trim(), 10);
      if (!Number.isInteger(width) || width < 1 || width > 16) return null;
      return {
        valueToken: normalizeExpression(args[0]),
        width,
        digitsToken: String(width),
        widthMode: name === "width$"
      };
    }

    if (args.length === 1) {
      const valueToken = normalizeExpression(args[0]);
      const width = getDefaultPrintWidth(valueToken);
      if (!Number.isInteger(width) || width < 1 || width > 16) return null;
      return { valueToken, width, digitsToken: null, widthMode: false };
    }

    if (args.length === 2) {
      if (/^[0-9]+$/.test(String(args[1]).trim())) {
        const width = Number.parseInt(String(args[1]).trim(), 10);
        if (!Number.isInteger(width) || width < 1 || width > 16) return null;
        return {
          valueToken: normalizeExpression(args[0]),
          width,
          digitsToken: String(width),
          widthMode: false
        };
      }
      const mode = String(args[1]).trim().match(/^(digits|width)\s+([0-9]+)$/i);
      if (!mode) return null;
      const width = Number.parseInt(mode[2], 10);
      if (!Number.isInteger(width) || width < 1 || width > 16) return null;
      return {
        valueToken: normalizeExpression(args[0]),
        width,
        digitsToken: String(width),
        widthMode: mode[1].toLowerCase() === "width"
      };
    }

    return null;
  }

  function emitPrintTextExpressionAt(textExprToken, xToken, yToken) {
    const segments = splitTopLevelPlus(textExprToken);
    if (!segments.length) return null;
    const bufferName = ensureTextExprBuffer();
    const lines = [];
    let xAdvance = 0;
    let handledAny = false;

    for (const segment of segments) {
      const itemX = xAdvance === 0 ? xToken : normalizeExpression(`(${xToken})+${xAdvance}`);
      const literalMatch = segment.match(/^"([^"]*)"$/);
      if (literalMatch) {
        const printed = emitPrintLiteralAt(literalMatch[1], itemX, yToken);
        if (!printed) return null;
        lines.push(...printed.lines);
        xAdvance += printed.width;
        handledAny = true;
        continue;
      }

      const textCall = parseNumericTextCall(segment);
      if (!textCall) return null;
      const formatLines = emitFormatFp5FriendlyIntoBuffer(textCall.valueToken, bufferName, textCall.digitsToken)
        || emitFormatAutoIntoBuffer(textCall.valueToken, bufferName, textCall.digitsToken, textCall.widthMode);
      const loadCoords = emitLoadTextCoordsIntoDE(itemX, yToken);
      if (!formatLines || !loadCoords) return null;
      lines.push(
        ...formatLines,
        ...loadCoords,
        `    ld hl,${bufferName}`,
        `    ld b,${textCall.width}`,
        "    call AMY_PUT_AT"
      );
      xAdvance += textCall.width;
      handledAny = true;
    }

    return handledAny ? { lines, width: xAdvance } : null;
  }

  function emitTextExpressionIntoBuffer(textExprToken, bufferToken) {
    const segments = splitTopLevelPlus(textExprToken);
    if (!segments.length) return null;
    let totalWidth = 0;
    const prepared = [];

    for (const segment of segments) {
      const literalMatch = segment.match(/^"([^"]*)"$/);
      if (literalMatch) {
        const literal = emitTextLiteral(literalMatch[1]);
        prepared.push({ kind: "literal", label: literal.label, width: literal.length });
        totalWidth += literal.length;
        continue;
      }

      const textCall = parseNumericTextCall(segment);
      if (!textCall) return null;
      prepared.push({ kind: "str$", ...textCall });
      totalWidth += textCall.width;
    }

    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, totalWidth);
    if (!bufferInfo) return null;

    const tempBuffer = ensureTextExprBuffer();
    const lines = [];
    let targetOffset = 0;
    for (const segment of prepared) {
      if (segment.kind === "literal") {
        const copyLiteral = emitCopyAsciiSliceIntoBuffer(bufferToken, segment.label, 0, segment.width, targetOffset);
        if (!copyLiteral) return null;
        lines.push(...copyLiteral);
      } else {
        const formatLines = emitFormatFp5FriendlyIntoBuffer(segment.valueToken, tempBuffer, segment.digitsToken)
          || emitFormatAutoIntoBuffer(segment.valueToken, tempBuffer, segment.digitsToken, segment.widthMode);
        const copyFormatted = emitCopyAsciiSliceIntoBuffer(bufferToken, tempBuffer, 0, segment.width, targetOffset);
        if (!formatLines || !copyFormatted) return null;
        lines.push(...formatLines, ...copyFormatted);
      }
      targetOffset += segment.width;
    }

    return { lines, width: totalWidth };
  }

  function emitPrintAtDense(xToken, yToken, itemTokens) {
    const items = itemTokens.map((part) => String(part).trim()).filter(Boolean);
    if (!items.length) return null;
    const lines = [];
    let xAdvance = 0;
    for (const item of items) {
      const stringMatch = item.match(/^"([^"]*)"$/);
      const itemX = xAdvance === 0 ? xToken : normalizeExpression(`(${xToken})+${xAdvance}`);
      if (stringMatch) {
        const printed = emitPrintLiteralAt(stringMatch[1], itemX, yToken);
        if (!printed) return null;
        lines.push(...printed.lines);
        xAdvance += printed.width;
        continue;
      }
      const numericText = parseNumericTextCall(item);
      if (numericText) {
        const printed = emitPrintAutoAt(numericText.valueToken, itemX, yToken, numericText.digitsToken, numericText.widthMode);
        if (!printed) return null;
        lines.push(...printed);
        xAdvance += numericText.width;
        continue;
      }
      const textExpr = emitPrintTextExpressionAt(item, itemX, yToken);
      if (textExpr) {
        lines.push(...textExpr.lines);
        xAdvance += textExpr.width;
        continue;
      }
      const printed = emitPrintAutoAt(normalizeExpression(item), itemX, yToken, null, false);
      const width = getDefaultPrintWidth(normalizeExpression(item));
      if (!printed || !Number.isInteger(width) || width < 0) return null;
      lines.push(...printed);
      xAdvance += width;
    }
    return lines;
  }

  function getByteArrayBufferInfoLocal(bufferToken, minimumLength) {
    const info = getRuntimeInfo(bufferToken);
    if (!info || info.kind !== "array" || info.elementType !== "int8") return null;
    if (typeof info.length === "number" && info.length < minimumLength) return null;
    return info;
  }

  function emitLoadInt8ArrayAddressIntoDE(bufferToken, offset = 0) {
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, offset + 1);
    if (!bufferInfo) return null;
    const loadAddress = emitLoadArrayAddressIntoHL(bufferToken, String(offset));
    if (!loadAddress) return null;
    return [...loadAddress, "    ex de,hl"];
  }

  function emitStoreAIntoInt8ArrayElement(bufferToken, offset = 0) {
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, offset + 1);
    if (!bufferInfo) return null;
    const loadAddress = emitLoadArrayAddressIntoHL(bufferToken, String(offset));
    if (!loadAddress) return null;
    return [...loadAddress, "    ld (hl),a"];
  }

  function emitCopyAsciiSliceIntoBuffer(bufferToken, sourceLabel, sourceOffset, count, targetOffset = 0) {
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, targetOffset + count);
    if (!bufferInfo) return null;
    const loadTarget = emitLoadArrayAddressIntoHL(bufferToken, String(targetOffset));
    if (!loadTarget) return null;
    const sourceRef = `${sourceLabel}${sourceOffset ? `+${sourceOffset}` : ""}`;
    return [...loadTarget, "    ex de,hl", `    ld hl,${sourceRef}`, `    ld bc,${count}`, "    ldir"];
  }

  function getHexRawByteCount(valueToken) {
    const declaredType = normalizeDeclaredType(resolveDeclaredValueType(valueToken));
    const valueType = resolveValueType(valueToken);
    if (declaredType === "fp5" || declaredType === "float" || valueType === "fp5") return 5;
    if (declaredType === "u32" || declaredType === "i32" || declaredType === "fix16_16" || valueType === "u32" || valueType === "i32") return 4;
    if (declaredType === "u16" || declaredType === "i16" || isAnyFixedDeclaredType(declaredType) || valueType === "int16") return 2;
    if (declaredType === "u8" || declaredType === "i8" || declaredType === "boolean" || valueType === "int8") return 1;
    const numeric = parseNumericLiteral(valueToken);
    if (numeric !== null && numeric >= -128 && numeric <= 0xFF) return 1;
    if (numeric !== null && numeric >= -32768 && numeric <= 0xFFFF) return 2;
    return null;
  }

  function emitCopyRawBytesToScratch(valueToken, byteCount, scratchLabel = "AMY_BUFFER32") {
    const declaredType = normalizeDeclaredType(resolveDeclaredValueType(valueToken));
    const valueType = resolveValueType(valueToken);
    if (byteCount === 1) {
      const loadA = emitLoadInt8ValueInto("a", valueToken);
      if (!loadA) return null;
      return [...loadA, `    ld (${scratchLabel}),a`];
    }
    if (byteCount === 2) {
      const loadHL = emitLoadInt16IntoHL(valueToken);
      if (!loadHL) return null;
      return [
        ...loadHL,
        "    ld a,l",
        `    ld (${scratchLabel}+0),a`,
        "    ld a,h",
        `    ld (${scratchLabel}+1),a`
      ];
    }
    if (byteCount === 4) {
      const scratch = ensureCompareScratch32();
      const signed = declaredType === "i32" || declaredType === "fix16_16";
      const source = signed
        ? emitPrepareI32Source(valueToken, scratch.leftLabel)
        : emitPrepareU32Source(valueToken, scratch.leftLabel);
      if (!source) return null;
      return [
        ...source.lines,
        `    ld hl,${source.pointer}`,
        `    ld de,${scratchLabel}`,
        "    ld bc,4",
        "    ldir"
      ];
    }
    if (byteCount === 5) {
      const info = getRuntimeInfo(valueToken);
      if (!info) return null;
      if (info.storage === "stack") {
        const lines = [];
        for (let i = 0; i < 5; i += 1) {
          const ixOffset = info.offset + i;
          lines.push(`    ld a,(ix${ixOffset < 0 ? ixOffset : `+${ixOffset}`})`);
          lines.push(`    ld (${scratchLabel}+${i}),a`);
        }
        return lines;
      }
      const asmName = getRuntimeAsmName(valueToken);
      if (!asmName) return null;
      return [
        `    ld hl,${asmName}`,
        `    ld de,${scratchLabel}`,
        "    ld bc,5",
        "    ldir"
      ];
    }
    return null;
  }

  function emitAppendHexNibbleFromA() {
    const digitLabel = makeGeneratedLabel("HexDigit");
    const doneLabel = makeGeneratedLabel("HexDone");
    return [
      "    cp 10",
      `    jr c,${digitLabel}`,
      "    add a,$37",
      `    jr ${doneLabel}`,
      `${digitLabel}:`,
      "    add a,$30",
      `${doneLabel}:`,
      "    ld (hl),a",
      "    inc hl"
    ];
  }

  function emitAppendHexByteFromScratch(sourceOffset, includeSpace) {
    const sourceRef = sourceOffset ? `AMY_BUFFER32+${sourceOffset}` : "AMY_BUFFER32";
    return [
      ...(includeSpace ? ["    ld a,$20", "    ld (hl),a", "    inc hl"] : []),
      `    ld a,(${sourceRef})`,
      "    push af",
      "    rrca",
      "    rrca",
      "    rrca",
      "    rrca",
      "    and $0F",
      ...emitAppendHexNibbleFromA(),
      "    pop af",
      "    and $0F",
      ...emitAppendHexNibbleFromA()
    ];
  }

  function emitFormatHexIntoBuffer(valueToken, bufferToken) {
    const byteCount = getHexRawByteCount(valueToken);
    if (!byteCount) return null;
    const width = byteCount * 3 - 1;
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, width);
    const copyRaw = emitCopyRawBytesToScratch(valueToken, byteCount);
    const loadDest = emitLoadArrayAddressIntoHL(bufferToken, "0");
    if (!bufferInfo || !copyRaw || !loadDest) return null;
    const lines = [...copyRaw, ...loadDest];
    for (let i = 0; i < byteCount; i += 1) {
      lines.push(...emitAppendHexByteFromScratch(i, i > 0));
    }
    return lines;
  }

  function emitPrintHexAt(valueToken, xToken, yToken) {
    const byteCount = getHexRawByteCount(valueToken);
    if (!byteCount) return null;
    const width = byteCount * 3 - 1;
    const copyRaw = emitCopyRawBytesToScratch(valueToken, byteCount);
    const loadCoords = emitLoadTextCoordsIntoDE(xToken, yToken);
    if (!copyRaw || !loadCoords) return null;
    const lines = [...copyRaw, "    ld hl,AMY_BUFFER32+8"];
    for (let i = 0; i < byteCount; i += 1) {
      lines.push(...emitAppendHexByteFromScratch(i, i > 0));
    }
    lines.push(
      ...loadCoords,
      "    ld hl,AMY_BUFFER32+8",
      `    ld b,${width}`,
      "    call AMY_PUT_AT"
    );
    return lines;
  }

  function emitLoadUnsignedInt16ValueIntoHL(token) {
    const valueType = resolveValueType(token);
    const declaredType = resolveDeclaredValueType(token);
    if (!valueType) {
      const numeric = parseNumericLiteral(token);
      if (numeric === null || numeric < 0 || numeric > 0xFFFF) return null;
      return [`    ld hl,${formatHex16(numeric)}`];
    }
    if (valueType === "int8") {
      if (isSignedDeclaredType(declaredType)) return null;
      const loadA = emitLoadInt8ValueInto("a", token);
      if (!loadA) return null;
      return [...loadA, "    ld l,a", "    ld h,0"];
    }
    if (valueType === "int16") {
      if (isSignedDeclaredType(declaredType) || isAnyFixedDeclaredType(declaredType)) return null;
      return emitLoadInt16IntoHL(token);
    }
    return null;
  }

  function emitFormatInt16IntoBufferAuto(valueToken, bufferToken, digitsToken, widthMode = false) {
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 1 || digits > 5) return null;
    const loadHL = emitLoadUnsignedInt16ValueIntoHL(valueToken);
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, digits);
    if (!loadHL || !bufferInfo) return null;
    const offset = 5 - digits;
    const lines = [
      ...loadHL,
      "    ld de,AMY_BUFFER32",
      "    call AMY_U16_TO_ASCII5"
    ];
    const copyOut = emitCopyAsciiSliceIntoBuffer(bufferToken, "AMY_BUFFER32", offset, digits);
    if (!copyOut) return null;
    lines.push(...copyOut);
    const postprocess = emitNumericPostprocessBuffer(bufferToken, digits, widthMode);
    if (!postprocess) return null;
    lines.push(...postprocess);
    return lines;
  }

  function emitLoadTextCoordsIntoDE(xToken, yToken) {
    const constY = tryEvaluateByteConstantExpression(yToken);
    const constX = tryEvaluateByteConstantExpression(xToken);
    if (constY !== null && constX !== null) {
      return [`    ld de,${formatHex16((((constY & 0xFF) << 8) | (constX & 0xFF)) & 0xFFFF)}`];
    }
    const loadY = emitLoadInt8ValueInto("d", yToken);
    const loadX = emitLoadInt8ValueInto("e", xToken);
    if (!loadY || !loadX) return null;
    return [...loadY, ...loadX];
  }

  function emitFormatI8IntoBuffer(valueToken, bufferToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (declaredType !== "i8") return null;
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 2 || digits > 4) return null;
    const loadA = emitLoadInt8ValueInto("a", valueToken);
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, digits);
    if (!loadA || !bufferInfo) return null;
    const offset = 3 - (digits - 1);
    const negativeLabel = makeGeneratedLabel("FmtI8Negative");
    const doneLabel = makeGeneratedLabel("FmtI8Done");
    const storeSpace = emitStoreAIntoInt8ArrayElement(bufferToken, 0);
    const storeMinus = emitStoreAIntoInt8ArrayElement(bufferToken, 0);
    const copyMagnitude = emitCopyAsciiSliceIntoBuffer(bufferToken, "AMY_BUFFER32", offset, digits - 1, 1);
    if (!storeSpace || !storeMinus || !copyMagnitude) return null;
    const lines = [
      ...loadA,
      "    bit 7,a",
      `    jr nz,${negativeLabel}`,
      "    push af",
      "    ld a,$20",
      ...storeSpace,
      "    pop af",
      "    ld de,AMY_BUFFER32",
      "    call AMY_U8_TO_ASCII3"
    ];
    lines.push(...copyMagnitude);
    lines.push(`    jr ${doneLabel}`);
    lines.push(`${negativeLabel}:`);
    lines.push("    push af");
    lines.push("    ld a,$2D");
    lines.push(...storeMinus);
    lines.push("    pop af");
    lines.push("    cpl");
    lines.push("    inc a");
    lines.push("    ld de,AMY_BUFFER32");
    lines.push("    call AMY_U8_TO_ASCII3");
    lines.push(...copyMagnitude);
    lines.push(`${doneLabel}:`);
    const postprocess = emitNumericPostprocessBuffer(bufferToken, digits, widthMode);
    if (!postprocess) return null;
    lines.push(...postprocess);
    return lines;
  }

  function emitFormatI16IntoBuffer(valueToken, bufferToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (declaredType !== "i16") return null;
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 2 || digits > 6) return null;
    const loadHL = emitLoadInt16IntoHL(valueToken);
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, digits);
    if (!loadHL || !bufferInfo) return null;
    const lines = [
      ...loadHL,
      "    ld de,AMY_BUFFER32",
      "    call AMY_I16_TO_ASCII6"
    ];
    if (digits === 6) {
      const copyOut = emitCopyAsciiSliceIntoBuffer(bufferToken, "AMY_BUFFER32", 0, 6);
      if (!copyOut) return null;
      lines.push(...copyOut);
    } else {
      const magnitudeStart = 7 - digits;
      const storeSign = emitStoreAIntoInt8ArrayElement(bufferToken, 0);
      const copyMagnitude = emitCopyAsciiSliceIntoBuffer(bufferToken, "AMY_BUFFER32", magnitudeStart, digits - 1, 1);
      if (!storeSign || !copyMagnitude) return null;
      lines.push("    ld hl,AMY_BUFFER32");
      lines.push("    ld a,(hl)");
      lines.push(...storeSign);
      lines.push(...copyMagnitude);
    }
    const postprocess = emitNumericPostprocessBuffer(bufferToken, digits, widthMode);
    if (!postprocess) return null;
    lines.push(...postprocess);
    return lines;
  }

  function emitFormatFix8_8IntoBuffer(valueToken, bufferToken) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (!isAnyFixedDeclaredType(declaredType)) return null;
    const loadHL = emitLoadInt16IntoHL(valueToken);
    const isSigned = isFix8_8DeclaredType(declaredType);
    const width = isSigned ? 7 : 6;
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, width);
    if (!loadHL || !bufferInfo) return null;
    const loadDest = emitLoadInt8ArrayAddressIntoDE(bufferToken, 0);
    if (!loadDest) return null;
    const lines = [
      ...loadDest,
      ...loadHL,
      `    call ${isSigned ? "AMY_SFX8_8_TO_ASCII7" : "AMY_FX8_8_TO_ASCII6"}`
    ];
    const postprocess = emitNumericPostprocessBuffer(bufferToken, width, false);
    if (!postprocess) return null;
    lines.push(...postprocess);
    return lines;
  }

  function emitFormatFix16_16IntoBuffer(valueToken, bufferToken, digitsToken = null) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (!isFix16_16DeclaredType(declaredType)) return null;
    const digits = digitsToken == null ? 9 : Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || (digits !== 9 && digits !== 11)) return null;
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, digits);
    if (!bufferInfo) return null;
    const scratch = ensureCompareScratch32();
    const source = emitPrepareI32Source(valueToken, scratch.leftLabel);
    if (!source) return null;
    const loadDest = emitLoadInt8ArrayAddressIntoDE(bufferToken, 0);
    if (!loadDest) return null;
    const lines = [...source.lines];
    if (source.pointer !== scratch.leftLabel) {
      lines.push(
        `    ld hl,${source.pointer}`,
        `    ld de,${scratch.leftLabel}`,
        "    ld bc,4",
        "    ldir"
      );
    }
    lines.push(
      ...loadDest,
      `    ld hl,${scratch.leftLabel}`,
      `    call ${digits === 11 ? "AMY_FX16_16_TO_ASCII11" : "AMY_FX16_16_TO_ASCII9"}`
    );
    const postprocess = emitNumericPostprocessBuffer(bufferToken, digits, false);
    if (!postprocess) return null;
    lines.push(...postprocess);
    return lines;
  }

  function emitFormatFp5IntoBuffer(valueToken, bufferToken, digitsToken = null) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (!isFp5DeclaredType(declaredType) && resolveValueType(valueToken) !== "fp5") return null;
    const digits = digitsToken == null ? 16 : Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits !== 16) return null;
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, 16);
    if (!bufferInfo) return null;
    const info = getRuntimeInfo(valueToken);
    if (!info) return null;
    const loadDest = emitLoadInt8ArrayAddressIntoDE(bufferToken, 0);
    if (!loadDest) return null;
    const textBuffer = ensureFp5TextBuffer();
    const lines = info.storage === "stack"
      ? [
          `    ld a,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
          "    ld (AMY_FP5_FPA2+0),a",
          `    ld a,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`,
          "    ld (AMY_FP5_FPA2+1),a",
          `    ld a,(ix${info.offset + 2 < 0 ? info.offset + 2 : `+${info.offset + 2}`})`,
          "    ld (AMY_FP5_FPA2+2),a",
          `    ld a,(ix${info.offset + 3 < 0 ? info.offset + 3 : `+${info.offset + 3}`})`,
          "    ld (AMY_FP5_FPA2+3),a",
          `    ld a,(ix${info.offset + 4 < 0 ? info.offset + 4 : `+${info.offset + 4}`})`,
          "    ld (AMY_FP5_FPA2+4),a",
          "    ld hl,AMY_FP5_FPA2",
          `    ld de,${textBuffer}`,
          "    call AMY_FP5_TO_ASCII16"
        ]
      : [
          `    ld hl,${getRuntimeAsmName(valueToken)}`,
          `    ld de,${textBuffer}`,
          "    call AMY_FP5_TO_ASCII16"
        ];
    lines.push(
      ...loadDest,
      `    ld hl,${textBuffer}`,
      "    ld bc,16",
      "    ldir"
    );
    return lines;
  }

  function emitFormatFp5FriendlyIntoBuffer(valueToken, bufferToken, digitsToken = null) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (!isFp5DeclaredType(declaredType) && resolveValueType(valueToken) !== "fp5") return null;
    const digits = digitsToken == null ? 16 : Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits !== 16) return null;
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, 16);
    if (!bufferInfo) return null;
    const info = getRuntimeInfo(valueToken);
    if (!info) return null;
    const loadDest = emitLoadInt8ArrayAddressIntoDE(bufferToken, 0);
    if (!loadDest) return null;
    const textBuffer = ensureFp5TextBuffer();
    const { firstIntName, dotName, lastFracName } = ensureFp5FriendlyFormatVars();
    state.needsFp5FriendlyFormatHelper = true;
    const lines = info.storage === "stack"
      ? [
          `    ld a,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
          "    ld (AMY_FP5_FPA2+0),a",
          `    ld a,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`,
          "    ld (AMY_FP5_FPA2+1),a",
          `    ld a,(ix${info.offset + 2 < 0 ? info.offset + 2 : `+${info.offset + 2}`})`,
          "    ld (AMY_FP5_FPA2+2),a",
          `    ld a,(ix${info.offset + 3 < 0 ? info.offset + 3 : `+${info.offset + 3}`})`,
          "    ld (AMY_FP5_FPA2+3),a",
          `    ld a,(ix${info.offset + 4 < 0 ? info.offset + 4 : `+${info.offset + 4}`})`,
          "    ld (AMY_FP5_FPA2+4),a",
          "    ld hl,AMY_FP5_FPA2",
          `    ld de,${textBuffer}`,
          "    call AMY_FP5_TO_ASCII16"
        ]
      : [
          `    ld hl,${getRuntimeAsmName(valueToken)}`,
          `    ld de,${textBuffer}`,
          "    call AMY_FP5_TO_ASCII16"
        ];
    lines.push(
      ...loadDest,
      `    ld hl,${textBuffer}`,
      `    call AMY_FP5_TO_FRIENDLY_ASCII16`,
      `    xor a`,
      `    ld (${firstIntName}),a`,
      `    ld (${dotName}),a`,
      `    ld (${lastFracName}),a`
    );
    return lines;
  }

  function emitFormatU32IntoBuffer(valueToken, bufferToken, widthMode = false) {
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, 10);
    if (!bufferInfo) return null;
    const scratch = ensureCompareScratch32();
    const source = emitPrepareU32Source(valueToken, scratch.leftLabel);
    if (!source) return null;
    const loadDest = emitLoadInt8ArrayAddressIntoDE(bufferToken, 0);
    if (!loadDest) return null;
    const lines = [
      ...source.lines,
      ...loadDest,
      `    ld hl,${source.pointer}`,
      "    call AMY_U32_TO_ASCII10"
    ];
    const postprocess = emitNumericPostprocessBuffer(bufferToken, 10, widthMode);
    if (!postprocess) return null;
    lines.push(...postprocess);
    return lines;
  }

  function emitFormatI32IntoBuffer(valueToken, bufferToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (declaredType !== "i32") return null;
    const digits = Number.parseInt(String(digitsToken), 10);
    if (!Number.isInteger(digits) || digits < 2 || digits > 11) return null;
    const bufferInfo = getByteArrayBufferInfoLocal(bufferToken, digits);
    if (!bufferInfo) return null;
    const scratch = ensureCompareScratch32();
    const source = emitPrepareI32Source(valueToken, scratch.leftLabel);
    if (!source) return null;
    const magnitudeStart = 12 - digits;
    if (digits === 11) {
      const loadDest = emitLoadInt8ArrayAddressIntoDE(bufferToken, 0);
      if (!loadDest) return null;
      const lines = [
        ...source.lines,
        ...loadDest,
        `    ld hl,${source.pointer}`,
        "    call AMY_I32_TO_ASCII11"
      ];
      const postprocess = emitNumericPostprocessBuffer(bufferToken, digits, widthMode);
      if (!postprocess) return null;
      lines.push(...postprocess);
      return lines;
    }
    const storeSign = emitStoreAIntoInt8ArrayElement(bufferToken, 0);
    const copyMagnitude = emitCopyAsciiSliceIntoBuffer(bufferToken, "AMY_BUFFER32", magnitudeStart, digits - 1, 1);
    if (!storeSign || !copyMagnitude) return null;
    const lines = [
      ...source.lines,
      `    ld hl,${source.pointer}`,
      "    ld de,AMY_BUFFER32",
      "    call AMY_I32_TO_ASCII11",
        "    ld hl,AMY_BUFFER32",
        "    ld a,(hl)",
      ...storeSign,
      ...copyMagnitude
    ];
    const postprocess = emitNumericPostprocessBuffer(bufferToken, digits, widthMode);
    if (!postprocess) return null;
    lines.push(...postprocess);
    return lines;
  }

  function emitFormatAutoIntoBuffer(valueToken, bufferToken, digitsToken, widthMode = false) {
    const declaredType = resolveDeclaredValueType(valueToken);
    if (declaredType === "bcd") return emitFormatBcdIntoBuffer(valueToken, bufferToken);
    if (isFp5DeclaredType(declaredType) || resolveValueType(valueToken) === "fp5") return emitFormatFp5IntoBuffer(valueToken, bufferToken, digitsToken);
    if (isFix16_16DeclaredType(declaredType)) return emitFormatFix16_16IntoBuffer(valueToken, bufferToken, digitsToken);
    if (isAnyFixedDeclaredType(declaredType)) return emitFormatFix8_8IntoBuffer(valueToken, bufferToken);
    if (declaredType === "i8") return emitFormatI8IntoBuffer(valueToken, bufferToken, digitsToken || "4", widthMode);
    if (declaredType === "i16") return emitFormatI16IntoBuffer(valueToken, bufferToken, digitsToken || "6", widthMode);
    if (declaredType === "u32") {
      if (digitsToken && String(digitsToken) !== "10") return null;
      return emitFormatU32IntoBuffer(valueToken, bufferToken, widthMode);
    }
    if (declaredType === "i32") return emitFormatI32IntoBuffer(valueToken, bufferToken, digitsToken || "11", widthMode);
    if (declaredType === "u8") return emitFormatInt16IntoBufferAuto(valueToken, bufferToken, digitsToken || "3", widthMode);
    if (declaredType === "boolean") return emitFormatInt16IntoBufferAuto(valueToken, bufferToken, digitsToken || "1", widthMode);
    if (declaredType === "u16") return emitFormatInt16IntoBufferAuto(valueToken, bufferToken, digitsToken || "5", widthMode);
    const valueType = resolveValueType(valueToken);
    if (valueType === "u32") {
      if (digitsToken && String(digitsToken) !== "10") return null;
      return emitFormatU32IntoBuffer(valueToken, bufferToken, widthMode);
    }
    if (valueType === "int8") return emitFormatInt16IntoBufferAuto(valueToken, bufferToken, digitsToken || "3", widthMode);
    if (valueType === "int16") return emitFormatInt16IntoBufferAuto(valueToken, bufferToken, digitsToken || "5", widthMode);
    return null;
  }

  return {
    ensureNumericFormatVars,
    emitNumericPostprocessAt,
    emitNumericPostprocessBuffer,
    emitLoadUnsignedInt16ValueIntoHL,
    emitFormatAutoIntoBuffer,
    emitFormatHexIntoBuffer,
    emitFormatI8IntoBuffer,
    emitFormatI16IntoBuffer,
    emitFormatFix8_8IntoBuffer,
    emitFormatFix16_16IntoBuffer,
    emitFormatFp5IntoBuffer,
    emitFormatFp5FriendlyIntoBuffer,
    emitFormatU32IntoBuffer,
    emitFormatI32IntoBuffer,
    emitPrintInt8AtAuto,
    emitPrintInt16FromCurrentHLAt,
    emitPrintInt16AtAuto,
    emitPrintI16At,
    emitPrintI8At,
    emitPrintFix8_8At,
    emitPrintFix16_16At,
    emitPrintFp5At,
    emitPrintU32At,
    emitPrintI32At,
    emitPrintAutoAt,
    emitPrintHexAt,
    emitPrintLiteralAt,
    getDefaultPrintWidth,
    emitPrintAtDense,
    emitTextExpressionIntoBuffer
  };
}
