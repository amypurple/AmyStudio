export function createByteLoadHelpers(ctx) {
  const {
    parseArrayRef,
    parseRecordFieldRef,
    getRuntimeInfo,
    normalizeExpression,
    parseExpressionAst,
    emitLoadInt8AstIntoA,
    parseBuiltinInputRef,
    emitLoadBuiltinInputInto,
    isIndexedByteReadable,
    emitLoadArrayAddressIntoHL,
    emitLoadRecordFieldAddressIntoHL,
    getDirectRecordFieldAddress,
    emitFunctionInvocation,
    parseFix8_8Component,
    resolveDeclaredValueType,
    isAnyFixedDeclaredType,
    emitLoadInt16IntoHL,
    parseWordByteComponent,
    scopedRuntimeName,
    symbolOrValue,
    formatIxOffset,
    makeGeneratedLabel,
    isSafeExpression,
    parseNumericLiteral,
    tryEvaluateConstantExpression,
    resolveExpressionAstValueType,
    dataLengths,
    resolveAddressSymbol
  } = ctx;

  const SIMPLE_BYTE_TOKEN_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?$|^\$[0-9A-Fa-f]+$|^[0-9]+$/;

  function emitLoadDataByteRefInto(register, token) {
    const dataRef = parseArrayRef(token);
    if (!dataRef || !dataLengths?.has(dataRef.name)) return null;
    const loadIndex = emitLoadInt8ValueInto("a", dataRef.index);
    if (!loadIndex) return null;
    const dataLabel = resolveAddressSymbol ? resolveAddressSymbol(dataRef.name) : dataRef.name;
    const lines = [
      ...loadIndex,
      "    ld e,a",
      "    ld d,0",
      `    ld hl,${dataLabel}`,
      "    add hl,de",
      "    ld a,(hl)"
    ];
    if (register.toLowerCase() !== "a") lines.push(`    ld ${register},a`);
    return lines;
  }

  function emitLoadInt8Into(register, token) {
    const normalized = normalizeExpression(String(token).trim());
    const expressionAst = parseExpressionAst(normalized);
    if (expressionAst && (expressionAst.kind === "binary" || expressionAst.kind === "unary")) {
      const astCode = emitLoadInt8AstIntoA(expressionAst);
      if (astCode) {
        if (register.toLowerCase() !== "a") return [...astCode, `    ld ${register},a`];
        return astCode;
      }
    }
    const builtinInput = parseBuiltinInputRef(token);
    if (builtinInput) return emitLoadBuiltinInputInto(register, builtinInput);
    const dataByteRef = emitLoadDataByteRefInto(register, token);
    if (dataByteRef) return dataByteRef;
    const recordField = parseRecordFieldRef(token);
    if (recordField) {
      if (recordField.fieldInfo.type !== "int8") return null;
      const directAddress = getDirectRecordFieldAddress?.(token);
      if (directAddress) {
        if (register.toLowerCase() === "a") return [`    ld a,(${directAddress})`];
        return [`    ld a,(${directAddress})`, `    ld ${register},a`];
      }
      const loadAddress = emitLoadRecordFieldAddressIntoHL(token);
      if (!loadAddress) return null;
      if (register.toLowerCase() === "a") return [...loadAddress, "    ld a,(hl)"];
      return [...loadAddress, "    ld a,(hl)", `    ld ${register},a`];
    }
    const arrayRef = parseArrayRef(token);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!isIndexedByteReadable(info)) return null;
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      if (register.toLowerCase() === "a") return [...loadAddress, "    ld a,(hl)"];
      return [...loadAddress, "    ld a,(hl)", `    ld ${register},a`];
    }
    const functionCall = emitFunctionInvocation(token);
    if (functionCall) {
      if (functionCall.returnType !== "int8") return null;
      if (register.toLowerCase() === "a") return [...functionCall.lines];
      return [...functionCall.lines, `    ld ${register},a`];
    }
    const fixPart = parseFix8_8Component(token);
    if (fixPart) {
      const declaredType = resolveDeclaredValueType(fixPart.valueToken);
      if (!isAnyFixedDeclaredType(declaredType)) return null;
      const loadHL = emitLoadInt16IntoHL(fixPart.valueToken);
      if (!loadHL) return null;
      const lines = [...loadHL, fixPart.component === "whole" ? "    ld a,h" : "    ld a,l"];
      if (register.toLowerCase() !== "a") lines.push(`    ld ${register},a`);
      return lines;
    }
    const wordBytePart = parseWordByteComponent(token);
    if (wordBytePart) {
      const declaredType = resolveDeclaredValueType(wordBytePart.valueToken);
      if (declaredType !== "u16" && declaredType !== "i16" && !isAnyFixedDeclaredType(declaredType)) return null;
      const loadHL = emitLoadInt16IntoHL(wordBytePart.valueToken);
      if (!loadHL) return null;
      const lines = [...loadHL, wordBytePart.component === "highbyte" ? "    ld a,h" : "    ld a,l"];
      if (register.toLowerCase() !== "a") lines.push(`    ld ${register},a`);
      return lines;
    }
    const resolvedToken = scopedRuntimeName(token);
    const info = getRuntimeInfo(token);
    if (!info) return [`    ld ${register},${symbolOrValue(token)}`];
    if (info.type !== "int8") return null;
    if (info.kind === "packed_bool") {
      const trueLabel = makeGeneratedLabel("BoolTrue");
      const doneLabel = makeGeneratedLabel("BoolDone");
      const loadPack = info.storage === "stack"
        ? [`    ld a,(${formatIxOffset(info.packOffset ?? info.offset)})`]
        : [`    ld a,(${info.packLabel})`];
      const lines = [
        ...loadPack,
        `    bit ${info.bit},a`,
        `    jr nz,${trueLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${trueLabel}:`,
        "    ld a,1",
        `${doneLabel}:`
      ];
      if (register.toLowerCase() !== "a") lines.push(`    ld ${register},a`);
      return lines;
    }
    if (info.storage === "stack") {
      if (register.toLowerCase() === "a") return [`    ld a,(${formatIxOffset(info.offset)})`];
      return [`    ld a,(${formatIxOffset(info.offset)})`, `    ld ${register},a`];
    }
    if (register.toLowerCase() === "a") return [`    ld a,(${resolvedToken})`];
    return [`    ld a,(${resolvedToken})`, `    ld ${register},a`];
  }

  function splitTopLevelByteExpression(expr, operators) {
    const parts = [];
    let bracketDepth = 0;
    let parenDepth = 0;
    let start = 0;
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === "[") {
        bracketDepth++;
        continue;
      }
      if (ch === "]") {
        bracketDepth = Math.max(0, bracketDepth - 1);
        continue;
      }
      if (ch === "(") {
        parenDepth++;
        continue;
      }
      if (ch === ")") {
        parenDepth = Math.max(0, parenDepth - 1);
        continue;
      }
      if (bracketDepth === 0 && parenDepth === 0 && operators.includes(ch)) {
        parts.push(expr.slice(start, i).trim());
        parts.push(ch);
        start = i + 1;
      }
    }
    parts.push(expr.slice(start).trim());
    return parts.filter((part) => part.length);
  }

  function emitScaleAByConst(scale) {
    if (!Number.isInteger(scale) || scale < 0 || scale > 16) return null;
    if (scale === 0) return ["    xor a"];
    if (scale === 1) return [];
    if ((scale & (scale - 1)) === 0) {
      const lines = [];
      let shifts = 0;
      let value = scale;
      while (value > 1) {
        shifts++;
        value >>= 1;
      }
      for (let i = 0; i < shifts; i++) lines.push("    add a,a");
      return lines;
    }
    const lines = ["    ld b,a", "    xor a"];
    for (let i = 0; i < scale; i++) lines.push("    add a,b");
    return lines;
  }

  function emitLoadInt8ValueInto(register, token) {
    const normalized = normalizeExpression(String(token).trim());
    if (SIMPLE_BYTE_TOKEN_RE.test(normalized)) return emitLoadInt8Into(register, normalized);
    const expressionAst = parseExpressionAst(normalized);
    if (expressionAst) {
      const astCode = emitLoadInt8AstIntoA(expressionAst);
      if (astCode) {
        if (register.toLowerCase() !== "a") return [...astCode, `    ld ${register},a`];
        return astCode;
      }
    }

    if (!isSafeExpression(normalized) || normalized.includes("[")) return null;
    const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    for (const ident of identifiers) {
      if (getRuntimeInfo(ident)) return null;
    }
    return [`    ld ${register},${symbolOrValue(normalized)}`];
  }

  function emitRandomCountIntoA(countToken) {
    const normalized = normalizeExpression(String(countToken).trim());
    if (!normalized || /random\s*\(/i.test(normalized)) return null;
    const loadCount = emitLoadInt8ValueInto("b", normalized);
    if (!loadCount) return null;
    const nonZeroLabel = makeGeneratedLabel("RandomCountNonZero");
    const retryLabel = makeGeneratedLabel("RandomCountRetry");
    const doneLabel = makeGeneratedLabel("RandomCountDone");
    return [
      ...loadCount,
      "    ld a,b",
      "    or a",
      `    jr nz,${nonZeroLabel}`,
      "    xor a",
      `    jr ${doneLabel}`,
      `${nonZeroLabel}:`,
      `${retryLabel}:`,
      "    call AMY_RANDOM_U8",
      "    cp b",
      `    jr nc,${retryLabel}`,
      `${doneLabel}:`
    ];
  }

  function emitLoadInt8TermIntoA(termText) {
    const normalized = normalizeExpression(String(termText).trim());
    if (!normalized) return null;
    const randomCount = normalized.match(/^random\s*\(\s*(.+)\s*\)$/i);
    if (randomCount) return emitRandomCountIntoA(randomCount[1]);
    if (SIMPLE_BYTE_TOKEN_RE.test(normalized)) return emitLoadInt8Into("a", normalized);

    const mulParts = splitTopLevelByteExpression(normalized, "*");
    if (mulParts.length === 3 && mulParts[1] === "*") {
      const left = mulParts[0];
      const right = mulParts[2];
      const leftConst = parseNumericLiteral(left);
      const rightConst = parseNumericLiteral(right);
      if (leftConst !== null && rightConst !== null) {
        return [`    ld a,${symbolOrValue(String((leftConst * rightConst) & 0xFF))}`];
      }
      if (leftConst !== null && SIMPLE_BYTE_TOKEN_RE.test(right)) {
        const load = emitLoadInt8Into("a", right);
        const scale = emitScaleAByConst(leftConst);
        if (!load || !scale) return null;
        return [...load, ...scale];
      }
      if (rightConst !== null && SIMPLE_BYTE_TOKEN_RE.test(left)) {
        const load = emitLoadInt8Into("a", left);
        const scale = emitScaleAByConst(rightConst);
        if (!load || !scale) return null;
        return [...load, ...scale];
      }
      return null;
    }

    if (!isSafeExpression(normalized) || normalized.includes("[")) return null;
    const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    for (const ident of identifiers) {
      if (getRuntimeInfo(ident)) return null;
    }
    return [`    ld a,${symbolOrValue(normalized)}`];
  }

  function emitLoadInt8ValueIntoPreserving(register, token, liveRegs = []) {
    const load = emitLoadInt8ValueInto(register, token);
    if (!load) return null;
    const normalizedRegister = String(register).toLowerCase();
    const pairForReg = (r) => {
      const lowered = String(r).toLowerCase();
      if (lowered === "a" || lowered === "f" || lowered === "af") return "af";
      if (lowered === "b" || lowered === "c" || lowered === "bc") return "bc";
      if (lowered === "d" || lowered === "e" || lowered === "de") return "de";
      if (lowered === "h" || lowered === "l" || lowered === "hl") return "hl";
      return lowered;
    };
    const targetPair = pairForReg(normalizedRegister);
    const saves = liveRegs
      .map(pairForReg)
      .filter((r, index, list) => r !== targetPair && list.indexOf(r) === index);
    const pushes = saves.map((r) => `    push ${r}`);
    const pops = [...saves].reverse().map((r) => `    pop ${r}`);
    return [...pushes, ...load, ...pops];
  }

  function emitLoadRawInt8IntoA(token) {
    const arrayRef = parseArrayRef(token);
    const recordField = parseRecordFieldRef(token);
    if (recordField) {
      if (recordField.fieldInfo.type !== "int8") return null;
      const directAddress = getDirectRecordFieldAddress?.(token);
      if (directAddress) return [`    ld a,(${directAddress})`];
      const loadAddress = emitLoadRecordFieldAddressIntoHL(token);
      if (!loadAddress) return null;
      return [...loadAddress, "    ld a,(hl)"];
    }
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!isIndexedByteReadable(info)) return null;
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      return [...loadAddress, "    ld a,(hl)"];
    }
    const resolvedToken = scopedRuntimeName(token);
    const info = getRuntimeInfo(token);
    if (!info) return [`    ld a,(${symbolOrValue(token)})`];
    if (info.type !== "int8") return null;
    if (info.storage === "stack") return [`    ld a,(${formatIxOffset(info.offset)})`];
    return [`    ld a,(${resolvedToken})`];
  }

  function emitLoadCountIntoBC(token) {
    const normalized = normalizeExpression(String(token).trim());
    const constantValue = tryEvaluateConstantExpression(normalized);
    if (constantValue !== null && constantValue >= 0 && constantValue <= 0xFFFF) {
      return [`    ld bc,${symbolOrValue(normalized)}`];
    }
    const expressionAst = parseExpressionAst(normalized);
    const exprType = expressionAst ? resolveExpressionAstValueType(expressionAst) : null;
    if (exprType === "int8") {
      const loadCount = emitLoadInt8ValueInto("a", normalized);
      if (!loadCount) return null;
      return [...loadCount, "    ld c,a", "    ld b,0"];
    }
    if (exprType === "int16") {
      const loadCount = emitLoadInt16IntoHL(normalized);
      if (!loadCount) return null;
      return [...loadCount, "    ld b,h", "    ld c,l"];
    }
    const info = getRuntimeInfo(normalized);
    if (!info) return [`    ld bc,${symbolOrValue(normalized)}`];
    if (info.type === "int8") {
      const loadCount = emitLoadInt8Into("a", normalized);
      if (!loadCount) return null;
      return [...loadCount, "    ld c,a", "    ld b,0"];
    }
    const loadCount = emitLoadInt16IntoHL(normalized);
    if (!loadCount) return null;
    return [...loadCount, "    ld b,h", "    ld c,l"];
  }

  function isDefinitelyByteSizedCount(token) {
    const normalized = normalizeExpression(String(token).trim());
    const constantValue = tryEvaluateConstantExpression(normalized);
    if (constantValue !== null) {
      return constantValue >= 0 && constantValue <= 0xFF;
    }
    const expressionAst = parseExpressionAst(normalized);
    const exprType = expressionAst ? resolveExpressionAstValueType(expressionAst) : null;
    if (exprType === "int8") return true;
    const info = getRuntimeInfo(normalized);
    return !!info && info.type === "int8";
  }

  function emitLoadCountIntoDE(token) {
    const normalized = normalizeExpression(String(token).trim());
    const constantValue = tryEvaluateConstantExpression(normalized);
    if (constantValue !== null && constantValue >= 0 && constantValue <= 0xFFFF) {
      return [`    ld de,${symbolOrValue(normalized)}`];
    }
    const expressionAst = parseExpressionAst(normalized);
    const exprType = expressionAst ? resolveExpressionAstValueType(expressionAst) : null;
    if (exprType === "int8") {
      const loadCount = emitLoadInt8ValueInto("a", normalized);
      if (!loadCount) return null;
      return [...loadCount, "    ld e,a", "    ld d,0"];
    }
    if (exprType === "int16") {
      const loadCount = emitLoadInt16IntoHL(normalized);
      if (!loadCount) return null;
      return [...loadCount, "    ex de,hl"];
    }
    const info = getRuntimeInfo(normalized);
    if (!info) return [`    ld de,${symbolOrValue(normalized)}`];
    if (info.type === "int8") {
      const loadCount = emitLoadInt8Into("a", normalized);
      if (!loadCount) return null;
      return [...loadCount, "    ld e,a", "    ld d,0"];
    }
    const loadCount = emitLoadInt16IntoHL(normalized);
    if (!loadCount) return null;
    return [...loadCount, "    ex de,hl"];
  }

  return {
    SIMPLE_BYTE_TOKEN_RE,
    emitLoadInt8Into,
    splitTopLevelByteExpression,
    emitScaleAByConst,
    emitRandomCountIntoA,
    emitLoadInt8TermIntoA,
    emitLoadInt8ValueInto,
    emitLoadInt8ValueIntoPreserving,
    emitLoadRawInt8IntoA,
    emitLoadCountIntoBC,
    emitLoadCountIntoDE,
    isDefinitelyByteSizedCount
  };
}
