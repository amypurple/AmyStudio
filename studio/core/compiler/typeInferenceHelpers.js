export function createTypeInferenceHelpers({
  normalizeDeclaredType,
  parseBuiltinInputRef,
  parseRecordFieldRef,
  parseRoutineInvocation,
  functionReturnTypes,
  parseArrayRef,
  getRuntimeInfo,
  parseFix8_8Component,
  parseWordByteComponent,
  parseDwordWordComponent,
  getImplicitNoArgFunctionInvocation,
  isAnyFixedDeclaredType,
  isFix16_16DeclaredType,
  normalizeExpression,
  parseExpressionAst,
  renderExpressionAst,
  resolveValueType,
  isSafeExpression,
  tryEvaluateCompileTimeNumericExpression,
  dataLengths
}) {
  function resolveDeclaredValueType(token) {
    const builtinInput = parseBuiltinInputRef(token);
    if (builtinInput) return normalizeDeclaredType(builtinInput.declaredType);
    const recordField = parseRecordFieldRef?.(token);
    if (recordField) return normalizeDeclaredType(recordField.fieldInfo.declaredType || recordField.fieldInfo.type);
    const invocation = parseRoutineInvocation(token);
    if (invocation) {
      const retInfo = functionReturnTypes.get(invocation.name);
      if (!retInfo) return null;
      return normalizeDeclaredType(retInfo.declaredType || retInfo.returnType);
    }
    const arrayRef = parseArrayRef(token);
    if (arrayRef) {
      if (dataLengths?.has(arrayRef.name)) return "u8";
      const info = getRuntimeInfo(arrayRef.name);
      if (!info) return null;
      if (info.kind === "array") return normalizeDeclaredType(info.declaredType || info.elementType || info.type);
      if (info.kind === "bcd") return "u8";
      return null;
    }
    const fixPart = parseFix8_8Component(token);
    if (fixPart) {
      const declared = resolveDeclaredValueType(fixPart.valueToken);
      if (isAnyFixedDeclaredType(declared)) return "u8";
    }
    const wordBytePart = parseWordByteComponent(token);
    if (wordBytePart) {
      const declared = resolveDeclaredValueType(wordBytePart.valueToken);
      if (declared === "u16" || declared === "i16" || isAnyFixedDeclaredType(declared)) return "u8";
    }
    const dwordWordPart = parseDwordWordComponent(token);
    if (dwordWordPart) {
      const declared = resolveDeclaredValueType(dwordWordPart.valueToken);
      if (declared === "u32" || declared === "i32") return "u16";
    }
    const implicitFn = getImplicitNoArgFunctionInvocation(token);
    const info = getRuntimeInfo(token);
    if (!info && implicitFn) return normalizeDeclaredType(implicitFn.declaredType || implicitFn.returnType);
    if (!info || info.kind === "array") return null;
    return normalizeDeclaredType(info.declaredType || info.type);
  }

  function isSignedDeclaredType(type) {
    const lowered = normalizeDeclaredType(type);
    return lowered === "i8" || lowered === "i16" || lowered === "i32" || lowered === "fix8_8" || lowered === "fix16_16";
  }

  function declaredTypeBitWidth(type) {
    const lowered = normalizeDeclaredType(type);
    if (lowered === "u8" || lowered === "i8" || lowered === "boolean") return 8;
    if (lowered === "u16" || lowered === "i16" || lowered === "fix8_8" || lowered === "ufix8_8") return 16;
    if (lowered === "u32" || lowered === "i32" || lowered === "fix16_16") return 32;
    if (lowered === "fp5") return 40;
    return 0;
  }

  function declaredTypeForWidth(widthBits, signed, sourceType = null) {
    const normalizedSource = normalizeDeclaredType(sourceType);
    if (normalizedSource === "fix8_8" && widthBits === 16) return "fix8_8";
    if (normalizedSource === "ufix8_8" && widthBits === 16 && !signed) return "ufix8_8";
    if (normalizedSource === "fix16_16" && widthBits === 32) return "fix16_16";
    if (normalizedSource === "fp5") return "fp5";
    if (widthBits <= 8) return signed ? "i8" : "u8";
    if (widthBits <= 16) return signed ? "i16" : "u16";
    return signed ? "i32" : "u32";
  }

  function runtimeTypeForDeclaredType(type) {
    const lowered = normalizeDeclaredType(type);
    if (lowered === "fp5") return "fp5";
    if (lowered === "u32" || lowered === "i32") return lowered;
    if (declaredTypeBitWidth(lowered) <= 8) return "int8";
    return "int16";
  }

  function inferLiteralDeclaredType(valueToken) {
    const literalValue = parseNumericLiteral(valueToken);
    if (literalValue === null) return null;
    if (literalValue < 0) {
      if (literalValue >= -128) return "i8";
      if (literalValue >= -32768) return "i16";
      return "i32";
    }
    if (literalValue <= 0xFF) return "u8";
    if (literalValue <= 0xFFFF) return "u16";
    return "u32";
  }

  function tryEvaluateAstInteger(node) {
    if (!node) return null;
    const rendered = renderExpressionAst(node);
    const value = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(rendered)
      : parseNumericLiteral(rendered);
    if (!Number.isInteger(value)) return null;
    return value;
  }

  function valueFitsDeclaredDomain(value, declaredType) {
    const lowered = normalizeDeclaredType(declaredType);
    if (lowered === "u8" || lowered === "boolean") return value >= 0 && value <= 0xFF;
    if (lowered === "i8") return value >= -128 && value <= 127;
    if (lowered === "u16") return value >= 0 && value <= 0xFFFF;
    if (lowered === "i16") return value >= -32768 && value <= 32767;
    return false;
  }

  function resolveAbsdiffDomains(leftNode, rightNode, leftType, rightType) {
    let leftSigned = isSignedDeclaredType(leftType.declaredType);
    let rightSigned = isSignedDeclaredType(rightType.declaredType);
    if (leftSigned === rightSigned) return { leftSigned, rightSigned };
    const leftValue = tryEvaluateAstInteger(leftNode);
    const rightValue = tryEvaluateAstInteger(rightNode);
    if (leftValue !== null && rightValue === null && valueFitsDeclaredDomain(leftValue, rightType.declaredType)) {
      leftSigned = rightSigned;
    } else if (rightValue !== null && leftValue === null && valueFitsDeclaredDomain(rightValue, leftType.declaredType)) {
      rightSigned = leftSigned;
    } else if (leftValue !== null && rightValue !== null) {
      const magnitude = Math.abs(leftValue - rightValue);
      if (magnitude <= 0xFFFF) return { leftSigned: false, rightSigned: false, constantMagnitude: magnitude };
    }
    if (leftSigned !== rightSigned) return null;
    return { leftSigned, rightSigned };
  }

  function mergeDeclaredTypes(leftType, rightType, preferredDeclaredType = null, op = null) {
    const normalizedLeft = normalizeDeclaredType(leftType);
    const normalizedRight = normalizeDeclaredType(rightType);
    const normalizedPreferred = normalizeDeclaredType(preferredDeclaredType);
    const leftWidth = declaredTypeBitWidth(normalizedLeft);
    const rightWidth = declaredTypeBitWidth(normalizedRight);
    const preferredWidth = declaredTypeBitWidth(normalizedPreferred);
    let width = Math.max(leftWidth, rightWidth, preferredWidth);
    if (!width) width = preferredWidth || leftWidth || rightWidth || 8;
    if (op === "<<" || op === ">>") {
      width = Math.max(leftWidth, preferredWidth) || width;
    }
    if (normalizedLeft === "fp5" || normalizedRight === "fp5" || normalizedPreferred === "fp5") {
      return "fp5";
    }
    const signed = isSignedDeclaredType(normalizedLeft) || isSignedDeclaredType(normalizedRight) || isSignedDeclaredType(normalizedPreferred);
    const sourceType = (op === "+" || op === "-") && (
      isAnyFixedDeclaredType(normalizedLeft)
      || isAnyFixedDeclaredType(normalizedRight)
      || isAnyFixedDeclaredType(normalizedPreferred)
    )
      ? (normalizedLeft === "fix16_16"
        || normalizedRight === "fix16_16"
        || normalizedPreferred === "fix16_16"
        ? "fix16_16"
        : normalizedLeft === "fix8_8"
          || normalizedRight === "fix8_8"
          || normalizedPreferred === "fix8_8"
          ? "fix8_8"
          : "ufix8_8")
      : normalizedPreferred || normalizedLeft || normalizedRight;
    return declaredTypeForWidth(width, signed, sourceType);
  }

  function resolveExpressionAstComputationType(node, preferredDeclaredType = null) {
    if (!node) return null;
    if (node.kind === "number") {
      const declaredType = mergeDeclaredTypes(inferLiteralDeclaredType(node.value), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "identifier") {
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(node.name), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "call") {
      if (String(node.name || "").toLowerCase() === "random" && (node.args.length === 1 || node.args.length === 2)) {
        return { declaredType: "u8", runtimeType: "int8" };
      }
      if (/^(?:min|max)$/i.test(String(node.name || "")) && node.args.length === 2) {
        const leftType = resolveExpressionAstComputationType(node.args[0]);
        const rightType = resolveExpressionAstComputationType(node.args[1]);
        const declaredType = mergeDeclaredTypes(leftType?.declaredType, rightType?.declaredType, preferredDeclaredType);
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      if (String(node.name || "").toLowerCase() === "absdiff" && node.args.length === 2) {
        const leftType = resolveExpressionAstComputationType(node.args[0]);
        const rightType = resolveExpressionAstComputationType(node.args[1]);
        if (!leftType || !rightType) return null;
        const domains = resolveAbsdiffDomains(node.args[0], node.args[1], leftType, rightType);
        if (!domains) return null;
        if (domains.constantMagnitude !== undefined) {
          const declaredType = domains.constantMagnitude <= 0xFF ? "u8" : "u16";
          return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
        }
        const width = Math.max(8, declaredTypeBitWidth(leftType.declaredType), declaredTypeBitWidth(rightType.declaredType));
        const hasSignedInput = domains.leftSigned || domains.rightSigned;
        const declaredType = width <= 8 && !hasSignedInput ? "u8" : "u16";
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      if (String(node.name || "").toLowerCase() === "abs" && node.args.length === 1) {
        const argType = resolveExpressionAstComputationType(node.args[0], preferredDeclaredType);
        if (!argType) return null;
        const width = Math.max(8, declaredTypeBitWidth(argType.declaredType));
        const declaredType = width <= 8 ? "u8" : "u16";
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(renderExpressionAst(node)), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "index") {
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(`${node.name}[${renderExpressionAst(node.index)}]`), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "member") {
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(renderExpressionAst(node)), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "unary") {
      if (node.op === "~") {
        const exprType = resolveExpressionAstComputationType(node.expr, preferredDeclaredType);
        if (!exprType) return null;
        return exprType;
      }
      const mergedType = mergeDeclaredTypes(resolveExpressionAstDeclaredType(node.expr), null, preferredDeclaredType);
      return { declaredType: mergedType, runtimeType: runtimeTypeForDeclaredType(mergedType) };
    }
    if (node.kind === "binary") {
      const leftType = resolveExpressionAstComputationType(node.left);
      const rightType = resolveExpressionAstComputationType(node.right);
      if (node.op === "%") {
        const declaredType = mergeDeclaredTypes(leftType?.declaredType, rightType?.declaredType, preferredDeclaredType, node.op);
        const lowered = normalizeDeclaredType(declaredType);
        if (lowered === "u32" || lowered === "i32" || lowered === "fp5" || isAnyFixedDeclaredType(lowered)) return null;
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      if (node.op === "<<" || node.op === ">>") {
        const declaredType = mergeDeclaredTypes(leftType?.declaredType, null, preferredDeclaredType, node.op);
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      const declaredType = mergeDeclaredTypes(leftType?.declaredType, rightType?.declaredType, preferredDeclaredType, node.op);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    return null;
  }

  function resolveExpressionAstDeclaredType(node, preferredDeclaredType = null) {
    return resolveExpressionAstComputationType(node, preferredDeclaredType)?.declaredType || null;
  }

  function isByteValueType(type) {
    return type === "int8";
  }

  function isWordValueType(type) {
    return type === "int16";
  }

  function parseNumericLiteral(token) {
    const text = String(token).trim();
    if (/^-?[0-9]+$/.test(text)) return Number.parseInt(text, 10);
    if (/^-?\$[0-9A-Fa-f]+$/.test(text)) {
      const neg = text.startsWith("-");
      const digits = neg ? text.slice(2) : text.slice(1);
      const value = Number.parseInt(digits, 16);
      return neg ? -value : value;
    }
    return null;
  }

  function parseRawIntegerLiteral(token, maxBits) {
    const match = String(token).trim().match(/^raw\s+(\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+)$/i);
    if (!match) return null;
    const digits = match[1].startsWith("$") ? match[1].slice(1) : match[1].slice(2);
    const value = Number.parseInt(digits, 16);
    if (!Number.isInteger(value) || value < 0 || value > (2 ** maxBits) - 1) return null;
    return value;
  }

  function parseFixedPointLiteral32(token) {
    const text = String(token).trim();
    const rawValue = parseRawIntegerLiteral(text, 32);
    if (rawValue !== null) return rawValue >>> 0;
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      const numeric = Number.parseFloat(text);
      if (!Number.isFinite(numeric)) return null;
      const scaled = Math.round(numeric * 65536);
      if (scaled < -2147483648 || scaled > 2147483647) return null;
      return scaled;
    }
    const integerValue = parseNumericLiteral(text);
    if (integerValue === null || !Number.isInteger(integerValue)) return null;
    const scaled = integerValue * 65536;
    if (scaled < -2147483648 || scaled > 2147483647) return null;
    return scaled;
  }

  function formatFixedPointLiteral32(value) {
    const unsigned = value < 0 ? (0x100000000 + value) >>> 0 : value >>> 0;
    return `$${unsigned.toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function parseFixedPointLiteral(token) {
    const text = String(token).trim();
    const rawValue = parseRawIntegerLiteral(text, 16);
    if (rawValue !== null) return rawValue;
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      const numeric = Number.parseFloat(text);
      if (!Number.isFinite(numeric)) return null;
      const scaled = Math.round(numeric * 256);
      if (scaled < -32768 || scaled > 65535) return null;
      return scaled;
    }
    const integerValue = parseNumericLiteral(text);
    if (integerValue === null || !Number.isInteger(integerValue)) return null;
    const scaled = integerValue << 8;
    if (scaled < -32768 || scaled > 65535) return null;
    return scaled;
  }

  function formatFixedPointLiteral16(value) {
    return `$${(value & 0xFFFF).toString(16).toUpperCase().padStart(4, "0")}`;
  }

  function parseFormulaAssignment(text) {
    const match = String(text).trim().match(/^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s*(\+=|-=|\*=|\/=|\^=|=)\s*(.+)$/);
    if (!match) return null;
    return {
      target: match[1],
      op: match[2],
      value: normalizeExpression(match[3])
    };
  }

  function tryEvaluateConstantExpression(expr) {
    const normalized = normalizeExpression(String(expr).trim());
    if (!normalized || !isSafeExpression(normalized) || normalized.includes("[")) return null;
    const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    if (identifiers.length) return null;
    const jsExpr = normalized.replace(/\$([0-9A-Fa-f]+)/g, "0x$1");
    try {
      const value = Function(`"use strict"; return (${jsExpr});`)();
      if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
      return value;
    } catch {
      return null;
    }
  }

  function analyzeForStep(stepToken, defaultDirection = "up") {
    const constantValue = tryEvaluateConstantExpression(stepToken);
    if (constantValue !== null) {
      if (constantValue === 0) return { error: "FOR step cannot be zero." };
      return {
        direction: constantValue < 0 ? "down" : "up",
        magnitudeToken: String(Math.abs(constantValue))
      };
    }
    return {
      direction: defaultDirection,
      magnitudeToken: stepToken
    };
  }

  function tryEvaluateByteConstantExpression(expr) {
    const value = tryEvaluateConstantExpression(expr);
    if (value === null || value < 0 || value > 0xFF) return null;
    return value;
  }

  return {
    resolveDeclaredValueType,
    isSignedDeclaredType,
    declaredTypeBitWidth,
    declaredTypeForWidth,
    runtimeTypeForDeclaredType,
    inferLiteralDeclaredType,
    mergeDeclaredTypes,
    resolveExpressionAstComputationType,
    resolveExpressionAstDeclaredType,
    isByteValueType,
    isWordValueType,
    parseNumericLiteral,
    parseFixedPointLiteral,
    formatFixedPointLiteral16,
    parseFixedPointLiteral32,
    formatFixedPointLiteral32,
    parseFormulaAssignment,
    tryEvaluateConstantExpression,
    analyzeForStep,
    tryEvaluateByteConstantExpression
  };
}
