import { getRoutineInputs } from "./routineAbi.js";

const BYTE_REGISTERS = new Set(["a", "b", "c", "d", "e", "h", "l"]);

export function emitLoadRoutineInputFromAst({
  routineName,
  input,
  node,
  signed = false,
  expressionType = null,
  renderExpressionAst,
  emitLoadInt8Into,
  emitLoadInt16AstIntoHL,
  tryEvaluateAstInteger,
  symbolOrValue,
  isSignedDeclaredType
}) {
  const normalizedInput = String(input || "").trim().toLowerCase();
  const inputs = getRoutineInputs(routineName);
  if (!inputs || !Object.prototype.hasOwnProperty.call(inputs, normalizedInput)) return null;
  if (!node || typeof renderExpressionAst !== "function") return null;

  const rendered = renderExpressionAst(node);
  if (normalizedInput === "hl") {
    return emitLoadInt16AstIntoHL(node, signed ? "i16" : "u16");
  }
  if (normalizedInput === "bc") {
    return emitLoadUnsignedOrSignedWordIntoBC({
      node,
      rendered,
      signed,
      expressionType,
      emitLoadInt8Into,
      emitLoadInt16AstIntoHL,
      tryEvaluateAstInteger,
      symbolOrValue,
      isSignedDeclaredType
    });
  }
  if (normalizedInput === "de") {
    const loadHL = emitLoadInt16AstIntoHL(node, signed ? "i16" : "u16");
    return loadHL ? [...loadHL, "    ex de,hl"] : null;
  }
  if (BYTE_REGISTERS.has(normalizedInput)) {
    return emitLoadInt8Into(normalizedInput, rendered);
  }
  return null;
}

export function emitLoadRoutineInputFromToken({
  routineName,
  input,
  token,
  signed = false,
  expressionType = null,
  parseExpressionAst,
  resolveExpressionAstComputationType,
  renderExpressionAst,
  emitLoadInt8Into,
  emitLoadInt8ValueInto,
  emitLoadInt16IntoHL,
  emitLoadInt16AstIntoHL,
  tryEvaluateAstInteger,
  symbolOrValue,
  isSignedDeclaredType
}) {
  const tokenText = String(token ?? "").trim();
  const normalizedInput = String(input || "").trim().toLowerCase();
  const inputs = getRoutineInputs(routineName);
  if (!inputs || !Object.prototype.hasOwnProperty.call(inputs, normalizedInput)) return null;

  if (typeof parseExpressionAst !== "function") {
    if (BYTE_REGISTERS.has(normalizedInput)) {
      return (emitLoadInt8ValueInto || emitLoadInt8Into)?.(normalizedInput, tokenText) || null;
    }
    if (normalizedInput === "hl") return emitLoadInt16IntoHL?.(tokenText) || null;
    if (normalizedInput === "de") {
      const loadHL = emitLoadInt16IntoHL?.(tokenText);
      return loadHL ? [...loadHL, "    ex de,hl"] : null;
    }
    if (normalizedInput === "bc") {
      const loadHL = emitLoadInt16IntoHL?.(tokenText);
      return loadHL ? [...loadHL, "    ld b,h", "    ld c,l"] : null;
    }
    return null;
  }

  const node = parseExpressionAst(tokenText);
  if (!node) return null;
  const effectiveType = expressionType || resolveExpressionAstComputationType?.(node, signed ? "i16" : "u16") || null;
  return emitLoadRoutineInputFromAst({
    routineName,
    input,
    node,
    signed,
    expressionType: effectiveType,
    renderExpressionAst,
    emitLoadInt8Into,
    emitLoadInt16AstIntoHL,
    tryEvaluateAstInteger,
    symbolOrValue,
    isSignedDeclaredType
  });
}

export function emitLoadRoutineByteInputsFromTokens({
  routineName,
  values,
  emitLoadInt8Into,
  emitLoadInt8ValueInto,
  emitLoadInt8ValueIntoPreserving
}) {
  const inputs = getRoutineInputs(routineName);
  if (!inputs || !values || typeof values !== "object") return null;
  const requested = Object.entries(values)
    .map(([input, token]) => [String(input).trim().toLowerCase(), token]);
  if (!requested.length) return [];
  if (requested.some(([input]) => !Object.prototype.hasOwnProperty.call(inputs, input))) return null;
  if (requested.some(([input]) => !BYTE_REGISTERS.has(input))) return null;

  const ordered = [
    ...requested.filter(([input]) => input !== "a"),
    ...requested.filter(([input]) => input === "a")
  ];
  const lines = [];
  const liveRegs = [];
  for (const [input, token] of ordered) {
    const load = emitLoadInt8ValueIntoPreserving
      ? emitLoadInt8ValueIntoPreserving(input, token, liveRegs)
      : (emitLoadInt8ValueInto || emitLoadInt8Into)?.(input, token);
    if (!load) return null;
    lines.push(...load);
    if (input !== "a" && !liveRegs.includes(input)) liveRegs.push(input);
  }
  return lines;
}

function emitLoadUnsignedOrSignedWordIntoBC({
  node,
  rendered,
  signed,
  expressionType,
  emitLoadInt8Into,
  emitLoadInt16AstIntoHL,
  tryEvaluateAstInteger,
  symbolOrValue,
  isSignedDeclaredType
}) {
  if (!signed) {
    const constant = tryEvaluateAstInteger(node);
    if (constant !== null && constant >= 0 && constant <= 0xFFFF) {
      return [`    ld bc,${symbolOrValue(String(constant))}`];
    }
    if (expressionType?.runtimeType === "int8" && !isSignedDeclaredType(expressionType.declaredType)) {
      const loadByte = emitLoadInt8Into("a", rendered);
      if (loadByte) return [...loadByte, "    ld c,a", "    ld b,0"];
    }
  }
  const loadRight = emitLoadInt16AstIntoHL(node, signed ? "i16" : "u16");
  return loadRight ? [...loadRight, "    ld b,h", "    ld c,l"] : null;
}
