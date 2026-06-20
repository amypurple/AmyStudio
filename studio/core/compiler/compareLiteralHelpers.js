export function createCompareLiteralHelpers({
  textState,
  emitLoadInt8ValueInto,
  resolveValueType,
  isByteValueType,
  makeGeneratedLabel,
  emitLoadInt16IntoHL,
  isWordValueType,
  symbolOrValue
}) {
  function emitTextLiteral(value) {
    const label = `AMY_TEXT_LITERAL_${textState.getNextTextLabel()}`;
    textState.bumpNextTextLabel();
    const bytes = [];
    for (const ch of value) bytes.push(`$${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
    bytes.push("0");
    textState.textData.push(`${label}:`, `    db ${bytes.join(",")}`);
    return { label, length: value.length };
  }

  function optimizeRepeatedBitTestLoads(lines) {
    const sameLoadPattern = /^\s*ld\s+a,\(([^)]+)\)\s*$/i;
    const bitTestPattern = /^\s*bit\s+[0-7],a\s*$/i;
    const conditionalJumpPattern = /^\s*j(?:p|r)\s+(?:nz|z|nc|c|po|pe|p|m)\s*,/i;
    const optimized = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const loadMatch = line.match(sameLoadPattern);
      if (
        loadMatch
        && index + 1 < lines.length
        && bitTestPattern.test(lines[index + 1] || "")
        && index >= 3
        && conditionalJumpPattern.test(lines[index - 1] || "")
        && bitTestPattern.test(lines[index - 2] || "")
      ) {
        const previousLoadMatch = (lines[index - 3] || "").match(sameLoadPattern);
        if (previousLoadMatch && previousLoadMatch[1].trim().toLowerCase() === loadMatch[1].trim().toLowerCase()) {
          continue;
        }
      }
      optimized.push(line);
    }

    return optimized;
  }

  function emitSignedInt8CompareGoto(leftToken, operator, rightToken, label) {
    const loadLeft = emitLoadInt8ValueInto("a", leftToken);
    if (!loadLeft) return null;
    const rightType = resolveValueType(rightToken);
    const lines = [];
    const effectiveOp = operator;
    if (effectiveOp === "==" || effectiveOp === "!=") {
      if (rightType) {
        if (!isByteValueType(rightType)) return null;
        const loadRight = emitLoadInt8ValueInto("b", rightToken);
        if (!loadRight) return null;
        lines.push(...loadRight);
        lines.push(...loadLeft);
        lines.push("    cp b");
      } else {
        const loadRight = emitLoadInt8ValueInto("b", rightToken);
        if (!loadRight) return null;
        lines.push(...loadRight);
        lines.push(...loadLeft);
        lines.push("    cp b");
      }
      lines.push(`    jp ${effectiveOp === "==" ? "z" : "nz"},${label}`);
      return lines;
    }
    if (rightType) {
      if (!isByteValueType(rightType)) return null;
      const loadRight = emitLoadInt8ValueInto("b", rightToken);
      if (!loadRight) return null;
      lines.push(...loadRight);
      lines.push(...loadLeft);
      lines.push("    xor $80");
      lines.push("    ld c,a");
      lines.push("    ld a,b");
      lines.push("    xor $80");
      lines.push("    ld b,a");
      lines.push("    ld a,c");
      lines.push("    cp b");
    } else {
      const loadRight = emitLoadInt8ValueInto("b", rightToken);
      if (!loadRight) return null;
      lines.push(...loadRight);
      lines.push(...loadLeft);
      lines.push("    xor $80");
      lines.push("    ld c,a");
      lines.push("    ld a,b");
      lines.push("    xor $80");
      lines.push("    ld b,a");
      lines.push("    ld a,c");
      lines.push("    cp b");
    }
    if (effectiveOp === "<") lines.push(`    jp c,${label}`);
    else if (effectiveOp === ">=") lines.push(`    jp nc,${label}`);
    else if (effectiveOp === "<=") {
      lines.push(`    jp c,${label}`);
      lines.push(`    jp z,${label}`);
    } else if (effectiveOp === ">") {
      const doneLabel = makeGeneratedLabel("CompareDone");
      lines.push(`    jp z,${doneLabel}`);
      lines.push(`    jp nc,${label}`);
      lines.push(`${doneLabel}:`);
    } else return null;
    return lines;
  }

  function emitSignedInt16CompareGoto(leftToken, operator, rightToken, label) {
    const loadLeft = emitLoadInt16IntoHL(leftToken);
    if (!loadLeft) return null;
    const rightType = resolveValueType(rightToken);
    const lines = [];
    const effectiveOp = operator;
    if (effectiveOp === "==" || effectiveOp === "!=") {
      if (rightType) {
        if (!isWordValueType(rightType)) return null;
        const loadRight = emitLoadInt16IntoHL(rightToken);
        if (!loadRight) return null;
        lines.push(...loadLeft);
        lines.push("    push hl");
        lines.push(...loadRight);
        lines.push("    ex de,hl");
        lines.push("    pop hl");
      } else {
        lines.push(...loadLeft);
        lines.push(`    ld de,${symbolOrValue(rightToken)}`);
      }
      lines.push("    or a");
      lines.push("    sbc hl,de");
      lines.push(`    jp ${effectiveOp === "==" ? "z" : "nz"},${label}`);
      return lines;
    }
    if (rightType) {
      if (!isWordValueType(rightType)) return null;
      const loadRight = emitLoadInt16IntoHL(rightToken);
      if (!loadRight) return null;
      lines.push(...loadLeft);
      lines.push("    push hl");
      lines.push(...loadRight);
      lines.push("    ex de,hl");
      lines.push("    pop hl");
    } else {
      lines.push(...loadLeft);
      lines.push(`    ld de,${symbolOrValue(rightToken)}`);
    }
    const highDiff = makeGeneratedLabel("CmpHighDiff");
    const done = makeGeneratedLabel("CmpDone");
    lines.push("    ld a,h");
    lines.push("    xor $80");
    lines.push("    ld b,a");
    lines.push("    ld a,d");
    lines.push("    xor $80");
    lines.push("    ld c,a");
    lines.push("    ld a,b");
    lines.push("    cp c");
    lines.push(`    jr nz,${highDiff}`);
    lines.push("    ld a,l");
    lines.push("    cp e");
    if (effectiveOp === "<") lines.push(`    jp c,${label}`);
    else if (effectiveOp === ">=") lines.push(`    jp nc,${label}`);
    else if (effectiveOp === "<=") {
      lines.push(`    jp c,${label}`);
      lines.push(`    jp z,${label}`);
    } else if (effectiveOp === ">") {
      lines.push(`    jr z,${done}`);
      lines.push(`    jp nc,${label}`);
    } else return null;
    lines.push(`    jr ${done}`);
    lines.push(`${highDiff}:`);
    if (effectiveOp === "<") lines.push(`    jp c,${label}`);
    else if (effectiveOp === ">=") lines.push(`    jp nc,${label}`);
    else if (effectiveOp === "<=") lines.push(`    jp c,${label}`);
    else if (effectiveOp === ">") lines.push(`    jp nc,${label}`);
    else return null;
    lines.push(`${done}:`);
    return lines;
  }

  return {
    emitTextLiteral,
    optimizeRepeatedBitTestLoads,
    emitSignedInt8CompareGoto,
    emitSignedInt16CompareGoto
  };
}
