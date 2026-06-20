export function createAddressHelpers(ctx) {
  const {
    normalizeExpression,
    getRuntimeInfo,
    resolveAddressSymbol,
    parseExpressionAst,
    resolveExpressionAstValueType,
    emitLoadInt8ValueInto,
    emitLoadInt16IntoHL,
    symbolOrValue
  } = ctx;

  function emitLoadSourceAddressIntoHL(sourceExpr) {
    const normalized = normalizeExpression(String(sourceExpr).trim());
    function emitLoadAddressOfIdentifierIntoHL(name) {
      const info = getRuntimeInfo(name);
      if (!info) return [`    ld hl,${resolveAddressSymbol(name)}`];
      if (info.storage === "stack") {
        const lines = ["    push ix", "    pop hl"];
        if (info.offset) lines.push(`    ld de,${info.offset}`, "    add hl,de");
        return lines;
      }
      return [`    ld hl,${resolveAddressSymbol(name)}`];
    }
    const offsetExpr = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\+\s*(.+)$/);
    if (!offsetExpr) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) return null;
      return emitLoadAddressOfIdentifierIntoHL(normalized);
    }
    const baseName = offsetExpr[1];
    const offsetToken = normalizeExpression(offsetExpr[2].trim());
    if (!offsetToken) return null;
    const lines = emitLoadAddressOfIdentifierIntoHL(baseName);
    if (!lines) return null;
    const expressionAst = parseExpressionAst(offsetToken);
    const exprType = expressionAst ? resolveExpressionAstValueType(expressionAst) : null;
    if (exprType === "int8") {
      const loadOffset = emitLoadInt8ValueInto("a", offsetToken);
      if (!loadOffset) return null;
      return [...lines, ...loadOffset, "    ld e,a", "    ld d,0", "    add hl,de"];
    }
    if (exprType === "int16") {
      const loadOffset = emitLoadInt16IntoHL(offsetToken);
      if (!loadOffset) return null;
      return [...lines, "    push hl", ...loadOffset, "    ex de,hl", "    pop hl", "    add hl,de"];
    }
    return [`    ld hl,${resolveAddressSymbol(baseName)} + ${symbolOrValue(offsetToken)}`];
  }

  function emitLoadVramAddressIntoDE(targetExpr) {
    const rawTarget = targetExpr.trim();
    const baseOnly = rawTarget.match(/^vram\.(pattern|color|name|spr_pat|spr_attr)$/i);
    if (baseOnly) {
      const baseLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME", spr_pat: "VRAM_SPR_PAT", spr_attr: "VRAM_SPR_ATTR" }[baseOnly[1].toLowerCase()];
      return [`    ld de,${baseLabel}`];
    }
    const baseOffset = rawTarget.match(/^vram\.(pattern|color|name|spr_pat|spr_attr)\s*\+\s*(.+)$/i);
    if (baseOffset) {
      const baseLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME", spr_pat: "VRAM_SPR_PAT", spr_attr: "VRAM_SPR_ATTR" }[baseOffset[1].toLowerCase()];
      const offsetToken = normalizeExpression(baseOffset[2].trim());
      if (!offsetToken) return null;
      const expressionAst = parseExpressionAst(offsetToken);
      const exprType = expressionAst ? resolveExpressionAstValueType(expressionAst) : null;
      if (exprType === "int8") {
        const loadOffset = emitLoadInt8ValueInto("a", offsetToken);
        if (!loadOffset) return null;
        return [
          `    ld de,${baseLabel}`,
          ...loadOffset,
          "    ld l,a",
          "    ld h,0",
          "    add hl,de",
          "    ex de,hl"
        ];
      }
      if (exprType === "int16") {
        const loadOffset = emitLoadInt16IntoHL(offsetToken);
        if (!loadOffset) return null;
        return [
          ...loadOffset,
          `    ld de,${baseLabel}`,
          "    add hl,de",
          "    ex de,hl"
        ];
      }
      return [
        `    ld de,${baseLabel}`,
        `    ld hl,${symbolOrValue(offsetToken)}`,
        "    add hl,de",
        "    ex de,hl"
      ];
    }
    const rawAddress = rawTarget.match(/^vram\s+(\$[0-9A-Fa-f]+|[0-9]+)$/i);
    if (rawAddress) {
      return [`    ld de,${symbolOrValue(rawAddress[1])}`];
    }
    return null;
  }

  function emitLoadVramAddressIntoHL(targetExpr) {
    const rawTarget = targetExpr.trim();
    const baseOnly = rawTarget.match(/^vram\.(pattern|color|name)$/i);
    if (baseOnly) {
      const baseLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME" }[baseOnly[1].toLowerCase()];
      return [`    ld hl,${baseLabel}`];
    }
    const baseOffset = rawTarget.match(/^vram\.(pattern|color|name)\s*\+\s*(.+)$/i);
    if (baseOffset) {
      const baseLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME" }[baseOffset[1].toLowerCase()];
      const offsetToken = normalizeExpression(baseOffset[2].trim());
      if (!offsetToken) return null;
      const expressionAst = parseExpressionAst(offsetToken);
      const exprType = expressionAst ? resolveExpressionAstValueType(expressionAst) : null;
      if (exprType === "int8") {
        const loadOffset = emitLoadInt8ValueInto("a", offsetToken);
        if (!loadOffset) return null;
        return [
          `    ld hl,${baseLabel}`,
          ...loadOffset,
          "    ld e,a",
          "    ld d,0",
          "    add hl,de"
        ];
      }
      if (exprType === "int16") {
        const loadOffset = emitLoadInt16IntoHL(offsetToken);
        if (!loadOffset) return null;
        return [
          ...loadOffset,
          `    ld de,${baseLabel}`,
          "    add hl,de"
        ];
      }
      return [
        `    ld hl,${baseLabel}`,
        `    ld de,${symbolOrValue(offsetToken)}`,
        "    add hl,de"
      ];
    }
    const rawAddress = rawTarget.match(/^vram\s+(\$[0-9A-Fa-f]+|[0-9]+)$/i);
    if (rawAddress) {
      return [`    ld hl,${symbolOrValue(rawAddress[1])}`];
    }
    return null;
  }

  return {
    emitLoadSourceAddressIntoHL,
    emitLoadVramAddressIntoDE,
    emitLoadVramAddressIntoHL
  };
}
