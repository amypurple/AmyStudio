import { emitLoadRoutineByteInputsFromTokens } from "./routineRegisterLoadHelpers.js";

export function createControlFlowHelpers(ctx) {
  const {
    tryEvaluateConstantExpression,
    tryEvaluateCompileTimeNumericExpression,
    resolveJumpTarget,
    emitBcdCompareGoto,
    getI32Info,
    getU32Info,
    resolveValueType,
    resolveDeclaredValueType,
    isSignedDeclaredType,
    parseExpressionAst,
    emitComputeExpressionAst,
    inferLiteralDeclaredType,
    declaredTypeBitWidth,
    declaredTypeForWidth,
    coerceComputedExpressionForCompare,
    parseArrayRef,
    emitU32ArrayCompareGoto,
    emitCompareScratch32Goto,
    emitCompareFp5Goto,
    isWordValueType,
    emitSignedInt16CompareGoto,
    emitSignedInt8CompareGoto,
    emitLoadInt16IntoHL,
    symbolOrValue,
    makeGeneratedLabel,
    emitLoadInt8ValueInto,
    emitLoadInt8ValueIntoPreserving,
    getRuntimeInfo,
    formatIxOffset,
    emitLoadInt8Into,
    getImplicitNoArgFunctionInvocation,
    emitFunctionInvocation,
    normalizeExpression,
    resolveExpressionAstValueType,
    emitLoadInt8AstIntoA,
    emitLoadInt16AstIntoHL,
    parseBooleanConditionAst,
    parseBuiltinInputRef,
    resolveSourceJumpTarget,
    formatUnknownJumpTargetLog,
    getTileTypeInfo,
    getHitboxInfo
  } = ctx;

  function invertOperator(operator) {
    return {
      "==": "!=",
      "!=": "==",
      "<": ">=",
      ">=": "<",
      "<=": ">",
      ">": "<="
    }[operator] || null;
  }

  function evaluateConstantComparison(leftToken, operator, rightToken) {
    const numericEvaluator = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression
      : tryEvaluateConstantExpression;
    const leftValue = numericEvaluator(leftToken);
    const rightValue = numericEvaluator(rightToken);
    if (leftValue === null || rightValue === null) return null;
    switch (operator) {
      case "==": return leftValue === rightValue;
      case "!=": return leftValue !== rightValue;
      case "<": return leftValue < rightValue;
      case ">": return leftValue > rightValue;
      case "<=": return leftValue <= rightValue;
      case ">=": return leftValue >= rightValue;
      default: return null;
    }
  }

  function parseRawWordLiteral(token) {
    const match = String(token).trim().match(/^raw\s+(\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+)$/i);
    if (!match) return null;
    const digits = match[1].startsWith("$") ? match[1].slice(1) : match[1].slice(2);
    const value = Number.parseInt(digits, 16);
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) return null;
    return `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
  }

  function formatWord(value) {
    return `$${(value & 0xFFFF).toString(16).toUpperCase().padStart(4, "0")}`;
  }

  function hitboxWord(offset, size) {
    return ((size & 0xFF) << 8) | (offset & 0xFF);
  }

  function emitNamedSpriteHitboxCollision(sprite1Token, hitbox1Name, sprite2Token, hitbox2Name, asmJumpTarget, chooseBranch) {
    const hitbox1 = getHitboxInfo?.(hitbox1Name);
    const hitbox2 = getHitboxInfo?.(hitbox2Name);
    if (!hitbox1 || !hitbox2) {
      return { ok: false, lines: [], log: `sprite hitbox collision requires declared hitboxes: ${hitbox1Name}, ${hitbox2Name}` };
    }
    const loadSprite2 = emitLoadInt8Into("b", sprite2Token);
    const loadSprite1 = emitLoadInt8Into("a", sprite1Token);
    if (!loadSprite1 || !loadSprite2) {
      return { ok: false, lines: [], log: `sprite hitbox collision requires byte-sized sprite indices` };
    }
    return {
      ok: true,
      lines: [
        ...loadSprite2,
        ...loadSprite1,
        "    ld c,a",
        `    ld hl,${formatWord(hitboxWord(hitbox2.y, hitbox2.height))}`,
        "    push hl",
        `    ld hl,${formatWord(hitboxWord(hitbox2.x, hitbox2.width))}`,
        "    push hl",
        `    ld hl,${formatWord(hitboxWord(hitbox1.y, hitbox1.height))}`,
        "    push hl",
        `    ld hl,${formatWord(hitboxWord(hitbox1.x, hitbox1.width))}`,
        "    push hl",
        "    ld a,b",
        "    add a,a",
        "    add a,a",
        "    ld l,a",
        "    ld h,0",
        "    ld de,AMY_SPRITE_TABLE",
        "    add hl,de",
        "    push hl",
        "    ld a,c",
        "    add a,a",
        "    add a,a",
        "    ld l,a",
        "    ld h,0",
        "    add hl,de",
        "    push hl",
        "    call AMY_CHECK_COLLISION_RAW",
        "    pop bc",
        "    pop bc",
        "    pop bc",
        "    pop bc",
        "    pop bc",
        "    pop bc",
        "    ld a,l",
        "    or a",
        `    jp ${chooseBranch("nz", "z")},${asmJumpTarget}`
      ],
      log: ""
    };
  }

  function isCompileTimeNumericLiteral(token) {
    const numericEvaluator = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression
      : tryEvaluateConstantExpression;
    return Number.isFinite(numericEvaluator(token));
  }

  function directByteImmediate(token) {
    const numericEvaluator = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression
      : tryEvaluateConstantExpression;
    const value = numericEvaluator(token);
    if (!Number.isInteger(value) || value < 0 || value > 0xFF) return null;
    const normalized = normalizeExpression(String(token).trim());
    if (/^[A-Za-z_][A-Za-z0-9_]*$|^\$[0-9A-Fa-f]+$|^[0-9]+$/.test(normalized)) {
      return symbolOrValue(normalized);
    }
    return String(value & 0xFF);
  }

  function selectCaseExprCanReuseA(exprToken) {
    const declared = resolveDeclaredValueType(exprToken);
    if (declared && declaredTypeBitWidth(declared) <= 8) return true;
    return resolveValueType(exprToken) === "int8";
  }

  function isFix8_8DeclaredTypeName(declared) {
    const lowered = String(declared || "").toLowerCase();
    return lowered === "fixed" || lowered === "ufixed" || lowered === "fix8_8" || lowered === "ufix8_8";
  }
  function isUnsignedFix8_8DeclaredTypeName(declared) {
    const lowered = String(declared || "").toLowerCase();
    return lowered === "ufixed" || lowered === "ufix8_8";
  }
  function isSignedFix8_8DeclaredTypeName(declared) {
    const lowered = String(declared || "").toLowerCase();
    return lowered === "fixed" || lowered === "fix8_8";
  }

  function isUnsignedByteDeclaredTypeName(declared) {
    const lowered = String(declared || "").toLowerCase();
    return lowered === "u8" || lowered === "boolean" || lowered === "bool";
  }

  function isSignedByteDeclaredTypeName(declared) {
    return String(declared || "").toLowerCase() === "i8";
  }

  function isSignedByteLiteral(token) {
    const numericEvaluator = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression
      : tryEvaluateConstantExpression;
    const value = numericEvaluator(token);
    return Number.isInteger(value) && value >= -128 && value <= 127;
  }

  function loadLinesClobberB(lines) {
    return Array.isArray(lines) && lines.some((line) => /\b(?:b|bc)\b/i.test(String(line || "").replace(/;.*/, "")));
  }

  function emitUnsignedFixedWholeByteCompareGoto(fixedToken, byteToken, operator, asmLabel, fixedOnLeft = true) {
    const leftOperand = fixedOnLeft ? "whole " + fixedToken : byteToken;
    const rightOperand = fixedOnLeft ? byteToken : "whole " + fixedToken;
    const loadByte = emitLoadInt8ValueInto("a", byteToken);
    const loadFixed = emitLoadInt8ValueInto("a", "whole " + fixedToken);
    if (!loadByte || !loadFixed) return null;
    const loadLeft = fixedOnLeft ? loadFixed : loadByte;
    const loadRight = fixedOnLeft ? loadByte : loadFixed;
    const lines = [
      ...loadRight,
      "    ld b,a",
      ...loadLeft,
      "    cp b"
    ];
    if (operator === "==") lines.push(`    jp z,${asmLabel}`);
    else if (operator === "!=") lines.push(`    jp nz,${asmLabel}`);
    else if (operator === "<") lines.push(`    jp c,${asmLabel}`);
    else if (operator === ">=") lines.push(`    jp nc,${asmLabel}`);
    else if (operator === "<=") {
      lines.push(`    jp c,${asmLabel}`);
      lines.push(`    jp z,${asmLabel}`);
    } else if (operator === ">") {
      const doneLabel = makeGeneratedLabel("CompareDone");
      lines.push(`    jp z,${doneLabel}`);
      lines.push(`    jp nc,${asmLabel}`);
      lines.push(`${doneLabel}:`);
    } else return null;
    return lines;
  }

  function coerceSimpleLiteralForFixedCompare(token, peerDeclared) {
    if (!isFix8_8DeclaredTypeName(peerDeclared)) return token;
    const raw = String(token || "").trim();
    if (!raw || /^raw\s+/i.test(raw)) return token;
    const numericEvaluator = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression
      : tryEvaluateConstantExpression;
    const value = numericEvaluator(raw);
    if (!Number.isFinite(value)) return token;
    const encoded = Math.round(value * 256);
    return String(encoded);
  }

  function emitCompareGoto(leftToken, operator, rightToken, label, branchWhenFalse = false, compareMode = "auto") {
    const asmLabel = resolveJumpTarget(label);
    const effectiveOperator = branchWhenFalse ? invertOperator(operator) : operator;
    if (!effectiveOperator) return null;
    const initialLeftDeclared = resolveDeclaredValueType(leftToken);
    const initialRightDeclared = resolveDeclaredValueType(rightToken);
    leftToken = coerceSimpleLiteralForFixedCompare(leftToken, initialRightDeclared);
    rightToken = coerceSimpleLiteralForFixedCompare(rightToken, initialLeftDeclared);
    const constantResult = evaluateConstantComparison(leftToken, effectiveOperator, rightToken);
    if (constantResult !== null) {
      return constantResult ? [`    jp ${asmLabel}`] : [];
    }
    const bcdCompare = emitBcdCompareGoto(leftToken, effectiveOperator, rightToken, asmLabel);
    if (bcdCompare) return bcdCompare;
    const leftI32 = getI32Info(leftToken);
    const rightI32 = getI32Info(rightToken);
    const leftU32Array = getU32Info(leftToken);
    const rightU32Array = getU32Info(rightToken);
    const leftType32 = resolveValueType(leftToken);
    const rightType32 = resolveValueType(rightToken);
    const leftDeclared = resolveDeclaredValueType(leftToken);
    const rightDeclared = resolveDeclaredValueType(rightToken);
    const leftFp5 = leftDeclared === "fp5" || leftDeclared === "float";
    const rightFp5 = rightDeclared === "fp5" || rightDeclared === "float";
    const leftSigned = isSignedDeclaredType(leftDeclared);
    const rightSigned = isSignedDeclaredType(rightDeclared);
    const signedCompare = compareMode === "signed"
      || (compareMode === "auto" && leftSigned && rightSigned);
    const leftAst = parseExpressionAst(leftToken);
    const rightAst = parseExpressionAst(rightToken);
    const leftComputed = leftAst ? emitComputeExpressionAst(leftAst) : null;
    const rightComputed = rightAst ? emitComputeExpressionAst(rightAst) : null;
    const leftComputedDeclared = leftComputed?.declaredType || inferLiteralDeclaredType(leftToken) || leftDeclared;
    const rightComputedDeclared = rightComputed?.declaredType || inferLiteralDeclaredType(rightToken) || rightDeclared;
    const computedHasExpression = (ast) => ast && (ast.kind === "binary" || ast.kind === "unary" || ast.kind === "call");
    const computedWidth = Math.max(declaredTypeBitWidth(leftComputedDeclared), declaredTypeBitWidth(rightComputedDeclared));
    const computedMixedSignedness = effectiveOperator !== "=="
      && effectiveOperator !== "!="
      && isSignedDeclaredType(leftComputedDeclared) !== isSignedDeclaredType(rightComputedDeclared);
    const preserveSignedMixedCompare = computedMixedSignedness && compareMode === "unsigned";
    const computedSigned = compareMode === "signed"
      || preserveSignedMixedCompare
      || (compareMode === "auto" && (isSignedDeclaredType(leftComputedDeclared) || isSignedDeclaredType(rightComputedDeclared)));
    const promotedCompareDeclared = preserveSignedMixedCompare
      ? null
      : declaredTypeForWidth(Math.max(computedWidth, 8), computedSigned);
    const unsignedFixedVsByte = compareMode === "auto" && (
      isUnsignedFix8_8DeclaredTypeName(leftDeclared) && isUnsignedByteDeclaredTypeName(rightDeclared)
      || isUnsignedByteDeclaredTypeName(leftDeclared) && isUnsignedFix8_8DeclaredTypeName(rightDeclared)
    );
    if (unsignedFixedVsByte) {
      const fixedOnLeft = isUnsignedFix8_8DeclaredTypeName(leftDeclared);
      const fixedToken = fixedOnLeft ? leftToken : rightToken;
      const byteToken = fixedOnLeft ? rightToken : leftToken;
      const byteCompare = emitUnsignedFixedWholeByteCompareGoto(fixedToken, byteToken, effectiveOperator, asmLabel, fixedOnLeft);
      if (byteCompare) return byteCompare;
    }
    const signedFixedLiteralOnLeft = compareMode === "auto"
      && isSignedFix8_8DeclaredTypeName(leftDeclared)
      && !rightType32
      && isCompileTimeNumericLiteral(rightToken);
    if (signedFixedLiteralOnLeft) {
      const signedFixedCompare = emitSignedInt16CompareGoto(leftToken, effectiveOperator, rightToken, asmLabel);
      if (signedFixedCompare) return signedFixedCompare;
    }
    const signedFixedLiteralOnRight = compareMode === "auto"
      && isSignedFix8_8DeclaredTypeName(rightDeclared)
      && !leftType32
      && isCompileTimeNumericLiteral(leftToken);
    if (signedFixedLiteralOnRight) {
      const swappedOperator = invertOperator(effectiveOperator);
      if (swappedOperator) {
        const signedFixedCompare = emitSignedInt16CompareGoto(rightToken, swappedOperator, leftToken, asmLabel);
        if (signedFixedCompare) return signedFixedCompare;
      }
    }
    const signedByteLiteralOnLeft = (compareMode === "signed" || compareMode === "auto")
      && isSignedByteDeclaredTypeName(leftDeclared)
      && isSignedByteLiteral(rightToken);
    if (signedByteLiteralOnLeft) {
      const signedByteCompare = emitSignedInt8CompareGoto(leftToken, effectiveOperator, rightToken, asmLabel);
      if (signedByteCompare) return signedByteCompare;
    }
    const signedByteLiteralOnRight = (compareMode === "signed" || compareMode === "auto")
      && isSignedByteDeclaredTypeName(rightDeclared)
      && isSignedByteLiteral(leftToken);
    if (signedByteLiteralOnRight) {
      const swappedOperator = invertOperator(effectiveOperator);
      if (swappedOperator) {
        const signedByteCompare = emitSignedInt8CompareGoto(rightToken, swappedOperator, leftToken, asmLabel);
        if (signedByteCompare) return signedByteCompare;
      }
    }
    if (leftFp5 || rightFp5) {
      const fp5Compare = emitCompareFp5Goto(leftToken, effectiveOperator, rightToken, asmLabel);
      if (fp5Compare) return fp5Compare;
    }
    const shouldUseComputedCompare = !!(
      leftComputed && rightComputed
      && leftComputed.runtimeType !== "u32"
      && leftComputed.runtimeType !== "i32"
      && rightComputed.runtimeType !== "u32"
      && rightComputed.runtimeType !== "i32"
      && !(computedWidth <= 8 && !computedSigned)
      && (computedHasExpression(leftAst)
        || computedHasExpression(rightAst)
        || compareMode === "signed"
        || compareMode === "unsigned"
        || leftComputed.runtimeType !== rightComputed.runtimeType
        || computedMixedSignedness)
    );
    if (shouldUseComputedCompare) {
      const promotedLeft = preserveSignedMixedCompare
        ? emitComputeExpressionAst(leftAst)
        : coerceComputedExpressionForCompare(
            emitComputeExpressionAst(leftAst, promotedCompareDeclared),
            promotedCompareDeclared
          );
      const promotedRight = preserveSignedMixedCompare
        ? emitComputeExpressionAst(rightAst)
        : coerceComputedExpressionForCompare(
            emitComputeExpressionAst(rightAst, promotedCompareDeclared),
            promotedCompareDeclared
          );
      const computedLines = ctx.emitComputedCompareGoto(promotedLeft, effectiveOperator, promotedRight, asmLabel, computedSigned);
      if (computedLines) return computedLines;
    }
    if (leftU32Array && rightU32Array && !parseArrayRef(leftToken) && !parseArrayRef(rightToken)) {
      return emitU32ArrayCompareGoto(leftToken, effectiveOperator, rightToken, asmLabel, signedCompare);
    }
    if (leftI32 || rightI32 || leftU32Array || rightU32Array || leftType32 === "u32" || leftType32 === "i32" || rightType32 === "u32" || rightType32 === "i32") {
      return emitCompareScratch32Goto(leftToken, effectiveOperator, rightToken, asmLabel, compareMode === "signed" || compareMode === "auto" && (leftSigned || rightSigned || leftI32 || rightI32));
    }
    const leftType = resolveValueType(leftToken) || (resolveValueType(rightToken) === "int16" ? "int16" : "int8");
    const rightType = resolveValueType(rightToken);
    const forceExplicitCompare = compareMode === "signed" || compareMode === "unsigned";
    const mixedWidth = !!rightType && leftType !== rightType;
    const mixedSignedness = compareMode === "auto"
      && effectiveOperator !== "=="
      && effectiveOperator !== "!="
      && leftSigned !== rightSigned
      && (leftDeclared || rightDeclared);
    if (compareMode === "signed" && !mixedWidth) {
      if (isWordValueType(leftType) || isWordValueType(rightType)) {
        if (rightType && !isWordValueType(rightType)) return null;
        const signedWordCompare = emitSignedInt16CompareGoto(leftToken, effectiveOperator, rightToken, asmLabel);
        if (signedWordCompare) return signedWordCompare;
      } else {
        const signedByteCompare = emitSignedInt8CompareGoto(leftToken, effectiveOperator, rightToken, asmLabel);
        if (signedByteCompare) return signedByteCompare;
      }
    }
    if (forceExplicitCompare || mixedWidth || mixedSignedness) {
      return emitCompareScratch32Goto(leftToken, effectiveOperator, rightToken, asmLabel, compareMode === "signed" || mixedSignedness || signedCompare);
    }
    if (signedCompare) {
      if (isWordValueType(leftType) || isWordValueType(rightType)) {
        if (rightType && !isWordValueType(rightType)) return null;
        return emitSignedInt16CompareGoto(leftToken, effectiveOperator, rightToken, asmLabel);
      }
      return emitSignedInt8CompareGoto(leftToken, effectiveOperator, rightToken, asmLabel);
    }
    if (leftType === "int16" || rightType === "int16") {
      if (rightType && rightType !== "int16") return null;
      const loadLeft = emitLoadInt16IntoHL(leftToken);
      if (!loadLeft) return null;
      const lines = [];
      if (rightType) {
        const loadRight = emitLoadInt16IntoHL(rightToken);
        if (!loadRight) return null;
        lines.push(...loadLeft);
        lines.push("    push hl");
        lines.push(...loadRight);
        lines.push("    ex de,hl");
        lines.push("    pop hl");
      } else if (/^raw\s+/i.test(String(rightToken).trim())) {
        const rawWord = parseRawWordLiteral(rightToken);
        if (!rawWord) return null;
        lines.push(...loadLeft);
        lines.push(`    ld de,${rawWord}`);
      } else {
        lines.push(...loadLeft);
        lines.push(`    ld de,${symbolOrValue(rightToken)}`);
      }
      lines.push("    or a");
      lines.push("    sbc hl,de");
      if (effectiveOperator === "==") lines.push(`    jp z,${asmLabel}`);
      else if (effectiveOperator === "!=") lines.push(`    jp nz,${asmLabel}`);
      else if (effectiveOperator === "<") lines.push(`    jp c,${asmLabel}`);
      else if (effectiveOperator === ">=") lines.push(`    jp nc,${asmLabel}`);
      else if (effectiveOperator === "<=") {
        lines.push(`    jp c,${asmLabel}`);
        lines.push(`    jp z,${asmLabel}`);
      } else if (effectiveOperator === ">") {
        const doneLabel = makeGeneratedLabel("CompareDone");
        lines.push(`    jp z,${doneLabel}`);
        lines.push(`    jp nc,${asmLabel}`);
        lines.push(`${doneLabel}:`);
      } else return null;
      return lines;
    }
    const loadLeft = emitLoadInt8ValueInto("a", leftToken);
    if (!loadLeft) return null;
    const lines = [];
    if (rightType) {
      if (rightType !== "int8") return null;
      const loadRightB = emitLoadInt8ValueInto("b", rightToken);
      if (loadRightB && !loadLinesClobberB(loadLeft)) {
        lines.push(...loadRightB);
        lines.push(...loadLeft);
        lines.push("    cp b");
      } else {
        const loadRight = emitLoadInt8ValueInto("a", rightToken);
        if (!loadRight) return null;
        lines.push(...loadLeft);
        lines.push("    push af");
        lines.push(...loadRight);
        lines.push("    ld b,a");
        lines.push("    pop af");
        lines.push("    cp b");
      }
    } else {
      const rightImmediate = directByteImmediate(rightToken);
      if (rightImmediate !== null) {
        lines.push(...loadLeft);
        const immediateValue = Number.parseInt(String(rightImmediate).replace(/^\$/, "0x"), 0);
        if ((effectiveOperator === "==" || effectiveOperator === "!=") && immediateValue === 0) {
          lines.push("    or a");
        } else {
          lines.push(`    cp ${rightImmediate}`);
        }
      } else {
      const loadRightB = emitLoadInt8ValueInto("b", rightToken);
      if (loadRightB && !loadLinesClobberB(loadLeft)) {
        lines.push(...loadRightB);
        lines.push(...loadLeft);
        lines.push("    cp b");
      } else {
        const loadRight = emitLoadInt8ValueInto("a", rightToken);
        if (!loadRight) return null;
        lines.push(...loadLeft);
        lines.push("    push af");
        lines.push(...loadRight);
        lines.push("    ld b,a");
        lines.push("    pop af");
        lines.push("    cp b");
      }
      }
    }
    if (effectiveOperator === "==") lines.push(`    jp z,${asmLabel}`);
    else if (effectiveOperator === "!=") lines.push(`    jp nz,${asmLabel}`);
    else if (effectiveOperator === "<") lines.push(`    jp c,${asmLabel}`);
    else if (effectiveOperator === ">=") lines.push(`    jp nc,${asmLabel}`);
    else if (effectiveOperator === "<=") {
      lines.push(`    jp c,${asmLabel}`);
      lines.push(`    jp z,${asmLabel}`);
    } else if (effectiveOperator === ">") {
      const doneLabel = makeGeneratedLabel("CompareDone");
      lines.push(`    jp z,${doneLabel}`);
      lines.push(`    jp nc,${asmLabel}`);
      lines.push(`${doneLabel}:`);
    } else return null;
    return lines;
  }

  function emitSimpleConditionalJump(conditionText, asmJumpTarget, branchWhenFalse = false) {
    const condition = String(conditionText || "").trim();
    if (!condition) {
      return { ok: false, lines: [], log: "Missing IF condition." };
    }

    const wantTrueBranch = !branchWhenFalse;
    const chooseBranch = (whenTrue, whenFalse) => (wantTrueBranch ? whenTrue : whenFalse);

    const directInput = parseBuiltinInputRef?.(condition);
    if (directInput?.source === "joypad_bit") {
      return {
        ok: true,
        lines: [
          `    ld a,(${directInput.runtimeName})`,
          `    bit ${directInput.bit},a`,
          `    jp ${chooseBranch("nz", "z")},${asmJumpTarget}`
        ],
        log: ""
      };
    }

    function emitLoadPixelTileCoord(register, token) {
      const load = emitLoadInt8ValueInto("a", token);
      if (!load) return null;
      const lines = [
        ...load,
        "    srl a",
        "    srl a",
        "    srl a"
      ];
      if (register.toLowerCase() !== "a") lines.push(`    ld ${register},a`);
      return lines;
    }

    function emitLoadPixelTileBoxBounds(coordToken, sizeToken, startOffset, endOffset, emptyLabel) {
      const loadCoord = emitLoadInt8ValueInto("a", coordToken);
      const loadSize = emitLoadInt8ValueInto("b", sizeToken);
      if (!loadCoord || !loadSize) return null;
      return [
        ...loadCoord,
        "    ld (AMY_BUFFER32+5),a",
        "    srl a",
        "    srl a",
        "    srl a",
        `    ld (AMY_BUFFER32+${startOffset}),a`,
        ...loadSize,
        "    ld a,b",
        "    or a",
        `    jp z,${emptyLabel}`,
        "    ld a,(AMY_BUFFER32+5)",
        "    add a,b",
        "    sub 1",
        "    srl a",
        "    srl a",
        "    srl a",
        `    ld (AMY_BUFFER32+${endOffset}),a`
      ];
    }

    function emitJumpOnTileTypeInA(typeName, jumpLabel, branchOnMatch = true) {
      const typeInfo = getTileTypeInfo?.(typeName);
      if (!typeInfo || !typeInfo.values?.length) return null;
      const lines = [];
      if (branchOnMatch) {
        for (const value of typeInfo.values) {
          lines.push(`    cp $${value.toString(16).toUpperCase().padStart(2, "0")}`);
          lines.push(`    jp z,${jumpLabel}`);
        }
        return lines;
      }
      const doneLabel = makeGeneratedLabel("TileTypeNotDone");
      for (const value of typeInfo.values) {
        lines.push(`    cp $${value.toString(16).toUpperCase().padStart(2, "0")}`);
        lines.push(`    jp z,${doneLabel}`);
      }
      lines.push(`    jp ${jumpLabel}`);
      lines.push(`${doneLabel}:`);
      return lines;
    }

    function emitRejectWrappedTileBounds(doneLabel) {
      return [
        "    ld a,(AMY_BUFFER32+0)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+1)",
        "    cp b",
        `    jp c,${doneLabel}`,
        "    ld a,(AMY_BUFFER32+2)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+3)",
        "    cp b",
        `    jp c,${doneLabel}`
      ];
    }

    function emitTilePointCondition(xToken, yToken, typeName, targetLabel, branchWhenFalseLocal = false) {
      const loadX = emitLoadPixelTileCoord("e", xToken);
      const loadY = emitLoadPixelTileCoord("d", yToken);
      const test = emitJumpOnTileTypeInA(typeName, targetLabel, !branchWhenFalseLocal);
      if (!loadX || !loadY || !test) return null;
      return [
        ...loadY,
        ...loadX,
        "    call AMY_GET_CHAR_AT",
        ...test
      ];
    }

    function emitTileBoxCondition(xToken, yToken, widthToken, heightToken, typeName, targetLabel, branchWhenFalseLocal = false) {
      const typeInfo = getTileTypeInfo?.(typeName);
      const yLoop = makeGeneratedLabel("TileBoxYLoop");
      const xLoop = makeGeneratedLabel("TileBoxXLoop");
      const rowDone = makeGeneratedLabel("TileBoxRowDone");
      const noMatch = makeGeneratedLabel("TileBoxNoMatch");
      const matchLabel = branchWhenFalseLocal ? makeGeneratedLabel("TileBoxMatch") : targetLabel;
      const test = emitJumpOnTileTypeInA(typeName, matchLabel, true);
      const boundsX = emitLoadPixelTileBoxBounds(xToken, widthToken, 0, 1, noMatch);
      const boundsY = emitLoadPixelTileBoxBounds(yToken, heightToken, 2, 3, noMatch);
      if (!boundsX || !boundsY || !typeInfo || !typeInfo.values?.length || !test) return null;
      const lines = [
        ...boundsX,
        ...boundsY,
        ...emitRejectWrappedTileBounds(noMatch),
        `${yLoop}:`,
        "    ld a,(AMY_BUFFER32+0)",
        "    ld (AMY_BUFFER32+4),a",
        `${xLoop}:`,
        "    ld a,(AMY_BUFFER32+2)",
        "    ld d,a",
        "    ld a,(AMY_BUFFER32+4)",
        "    ld e,a",
        "    call AMY_GET_CHAR_AT",
        ...test,
        "    ld a,(AMY_BUFFER32+4)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+1)",
        "    cp b",
        `    jp z,${rowDone}`,
        "    ld hl,AMY_BUFFER32+4",
        "    inc (hl)",
        `    jp ${xLoop}`,
        `${rowDone}:`,
        "    ld a,(AMY_BUFFER32+2)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+3)",
        "    cp b",
        `    jp z,${noMatch}`,
        "    ld hl,AMY_BUFFER32+2",
        "    inc (hl)",
        `    jp ${yLoop}`,
        `${noMatch}:`
      ];
      if (branchWhenFalseLocal) {
        lines.push(`    jp ${targetLabel}`);
        lines.push(`${matchLabel}:`);
      }
      return lines;
    }

    function emitJumpOnCharMatchInA(matchToken, jumpLabel) {
      const typeInfo = getTileTypeInfo?.(matchToken);
      if (typeInfo?.values?.length) return emitJumpOnTileTypeInA(matchToken, jumpLabel, true);
      const value = tryEvaluateCompileTimeNumericExpression(matchToken);
      if (!Number.isInteger(value) || value < 0 || value > 0xFF) return null;
      return [
        `    cp $${value.toString(16).toUpperCase().padStart(2, "0")}`,
        `    jp z,${jumpLabel}`
      ];
    }

    function emitCharBoxCondition(xToken, yToken, widthToken, heightToken, matchToken, targetLabel, branchWhenFalseLocal = false) {
      const widthValue = tryEvaluateCompileTimeNumericExpression(widthToken);
      const heightValue = tryEvaluateCompileTimeNumericExpression(heightToken);
      const matchLabel = branchWhenFalseLocal ? makeGeneratedLabel("CharBoxMatch") : targetLabel;
      const test = emitJumpOnCharMatchInA(matchToken, matchLabel);
      if (!test) return null;
      if (
        Number.isInteger(widthValue)
        && Number.isInteger(heightValue)
        && widthValue > 0
        && heightValue > 0
        && widthValue * heightValue <= 32
      ) {
        const loadInputs = emitLoadRoutineByteInputsFromTokens({
          routineName: "GET_BKGRND",
          values: { b: heightToken, c: widthToken, d: yToken, e: xToken },
          emitLoadInt8Into,
          emitLoadInt8ValueInto,
          emitLoadInt8ValueIntoPreserving
        });
        if (!loadInputs) return null;
        const noMatch = makeGeneratedLabel("CharBoxNoMatch");
        const scanLoop = makeGeneratedLabel("CharBoxScan");
        const lines = [
          "    ld hl,AMY_BUFFER32",
          ...loadInputs,
          "    push ix",
          "    push iy",
          "    call GET_BKGRND",
          "    pop iy",
          "    pop ix",
          "    ld hl,AMY_BUFFER32",
          `    ld b,${widthValue * heightValue}`,
          `${scanLoop}:`,
          "    ld a,(hl)",
          ...test,
          "    inc hl",
          `    djnz ${scanLoop}`,
          `${noMatch}:`
        ];
        if (branchWhenFalseLocal) {
          lines.push(`    jp ${targetLabel}`);
          lines.push(`${matchLabel}:`);
        }
        return lines;
      }
      const startX = emitLoadInt8ValueInto("a", xToken);
      const endX = emitLoadInt8ValueInto("a", `(${xToken}) + (${widthToken}) - 1`);
      const startY = emitLoadInt8ValueInto("a", yToken);
      const endY = emitLoadInt8ValueInto("a", `(${yToken}) + (${heightToken}) - 1`);
      if (!startX || !endX || !startY || !endY) return null;
      const yLoop = makeGeneratedLabel("CharBoxYLoop");
      const xLoop = makeGeneratedLabel("CharBoxXLoop");
      const rowDone = makeGeneratedLabel("CharBoxRowDone");
      const noMatch = makeGeneratedLabel("CharBoxNoMatch");
      const lines = [
        ...startX,
        "    ld (AMY_BUFFER32+0),a",
        ...endX,
        "    ld (AMY_BUFFER32+1),a",
        ...startY,
        "    ld (AMY_BUFFER32+2),a",
        ...endY,
        "    ld (AMY_BUFFER32+3),a",
        `${yLoop}:`,
        "    ld a,(AMY_BUFFER32+0)",
        "    ld (AMY_BUFFER32+4),a",
        `${xLoop}:`,
        "    ld a,(AMY_BUFFER32+2)",
        "    ld d,a",
        "    ld a,(AMY_BUFFER32+4)",
        "    ld e,a",
        "    call AMY_GET_CHAR_AT",
        ...test,
        "    ld a,(AMY_BUFFER32+4)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+1)",
        "    cp b",
        `    jp z,${rowDone}`,
        "    ld hl,AMY_BUFFER32+4",
        "    inc (hl)",
        `    jp ${xLoop}`,
        `${rowDone}:`,
        "    ld a,(AMY_BUFFER32+2)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+3)",
        "    cp b",
        `    jp z,${noMatch}`,
        "    ld hl,AMY_BUFFER32+2",
        "    inc (hl)",
        `    jp ${yLoop}`,
        `${noMatch}:`
      ];
      if (branchWhenFalseLocal) {
        lines.push(`    jp ${targetLabel}`);
        lines.push(`${matchLabel}:`);
      }
      return lines;
    }

    const ifVar = condition.match(/^(not\s+)?([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifVar) {
      const info = getRuntimeInfo(ifVar[2]);
      if (info && info.kind === "packed_bool") {
        const testLines = info.storage === "stack"
          ? [`    bit ${info.bit},(${formatIxOffset(info.packOffset ?? info.offset)})`]
          : [`    ld a,(${info.packLabel})`, `    bit ${info.bit},a`];
        return {
          ok: true,
          lines: [
            ...testLines,
            `    jp ${ifVar[1] ? chooseBranch("z", "nz") : chooseBranch("nz", "z")},${asmJumpTarget}`
          ],
          log: ""
        };
      }
      if (info && info.type === "int8" && !info.kind) {
        const loadVar = emitLoadInt8Into("a", ifVar[2]);
        if (!loadVar) {
          return { ok: false, lines: [], log: `if var: cannot load variable: ${condition}` };
        }
        return {
          ok: true,
          lines: [
            ...loadVar,
            "    or a",
            `    jp ${ifVar[1] ? chooseBranch("z", "nz") : chooseBranch("nz", "z")},${asmJumpTarget}`
          ],
          log: ""
        };
      }
      if (!info) {
        const implicitFn = getImplicitNoArgFunctionInvocation(ifVar[2]);
        if (implicitFn && implicitFn.returnType === "int8") {
          const callFn = emitFunctionInvocation(ifVar[2]);
          if (!callFn) {
            return { ok: false, lines: [], log: `if var: cannot call function: ${condition}` };
          }
          return {
            ok: true,
            lines: [
              ...callFn.lines,
              "    or a",
              `    jp ${ifVar[1] ? chooseBranch("z", "nz") : chooseBranch("nz", "z")},${asmJumpTarget}`
            ],
            log: ""
          };
        }
      }
      return { ok: false, lines: [], log: `if var requires a boolean or byte RAM variable: ${condition}` };
    }

    const ifAnyCollision = condition.match(/^(not\s+)?any\s+collision$/i);
    if (ifAnyCollision) {
      return {
        ok: true,
        lines: [
          "    ld a,(VDP_STATUS)",
          "    bit 5,a",
          `    jp ${ifAnyCollision[1] ? chooseBranch("z", "nz") : chooseBranch("nz", "z")},${asmJumpTarget}`
        ],
        log: ""
      };
    }

    const ifSpriteHitboxCollision = condition.match(/^sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+hitbox\s+([A-Za-z_][A-Za-z0-9_]*)\s+collides\s+with\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+hitbox\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifSpriteHitboxCollision) {
      return emitNamedSpriteHitboxCollision(
        ifSpriteHitboxCollision[1],
        ifSpriteHitboxCollision[2],
        ifSpriteHitboxCollision[3],
        ifSpriteHitboxCollision[4],
        asmJumpTarget,
        chooseBranch
      );
    }

    const ifSpriteCollision = condition.match(/^sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+collides\s+with\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+box\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)$/i);
    if (ifSpriteCollision) {
      const loadSprite1 = emitLoadInt8Into("a", ifSpriteCollision[1]);
      const loadSprite2 = emitLoadInt8Into("b", ifSpriteCollision[2]);
      const loadWidth = emitLoadInt8Into("c", ifSpriteCollision[3]);
      const loadHeight = emitLoadInt8Into("d", ifSpriteCollision[4]);
      if (!loadSprite1 || !loadSprite2 || !loadWidth || !loadHeight) {
        return { ok: false, lines: [], log: `sprite collision box requires byte-sized sprite indices and dimensions: ${condition}` };
      }
      return {
        ok: true,
        lines: [
          ...loadSprite2,
          ...loadSprite1,
          ...loadWidth,
          ...loadHeight,
          "    call AMY_CHECK_SPRITE_COLLISION_BOX",
          "    or a",
          `    jp ${chooseBranch("nz", "z")},${asmJumpTarget}`
        ],
        log: ""
      };
    }

    const ifSpriteCollisionRect = condition.match(/^sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+collides\s+with\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+box\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+size\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)$/i);
    if (ifSpriteCollisionRect) {
      const loadSprite1 = emitLoadInt8Into("a", ifSpriteCollisionRect[1]);
      const loadSprite2 = emitLoadInt8Into("b", ifSpriteCollisionRect[2]);
      const loadOffsetX = emitLoadInt8Into("c", ifSpriteCollisionRect[3]);
      const loadOffsetY = emitLoadInt8Into("d", ifSpriteCollisionRect[4]);
      const loadWidth = emitLoadInt8Into("e", ifSpriteCollisionRect[5]);
      const loadHeight = emitLoadInt8Into("l", ifSpriteCollisionRect[6]);
      if (!loadSprite1 || !loadSprite2 || !loadOffsetX || !loadOffsetY || !loadWidth || !loadHeight) {
        return { ok: false, lines: [], log: `sprite collision rect requires byte-sized sprite indices, offsets, and dimensions: ${condition}` };
      }
      return {
        ok: true,
        lines: [
          ...loadSprite2,
          ...loadSprite1,
          ...loadOffsetX,
          ...loadOffsetY,
          ...loadWidth,
          ...loadHeight,
          "    call AMY_CHECK_SPRITE_COLLISION_RECT",
          "    or a",
          `    jp ${chooseBranch("nz", "z")},${asmJumpTarget}`
        ],
        log: ""
      };
    }

    const ifCompare = condition.match(/^(?:(signed|unsigned)\s+)?(.+?)\s*(==|=|!=|<>|<=|>=|<|>)\s*(.+)$/i);
    if (ifCompare) {
      const leftToken = normalizeExpression(ifCompare[2]);
      const rightToken = normalizeExpression(ifCompare[4]);
      const lines = emitCompareGoto(
        leftToken,
        ifCompare[3] === "<>" ? "!=" : (ifCompare[3] === "=" ? "==" : ifCompare[3]),
        rightToken,
        asmJumpTarget,
        branchWhenFalse,
        (ifCompare[1] || "auto").toLowerCase()
      );
      if (!lines) {
        return { ok: false, lines: [], log: `Unsupported comparison: ${condition}` };
      }
      return { ok: true, lines, log: "" };
    }

    const ifButton = condition.match(/^(not\s+)?button\s+([1-4])\s+on\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifButton) {
      const bits = { "1": 7, "2": 6, "3": 5, "4": 4 };
      const loadPad = emitLoadInt8Into("a", ifButton[3]);
      if (!loadPad) {
        return { ok: false, lines: [], log: `if button requires a byte pad variable: ${condition}` };
      }
      return {
        ok: true,
        lines: [
          ...loadPad,
          `    bit ${bits[ifButton[2]]},a`,
          `    jp ${ifButton[1] ? chooseBranch("z", "nz") : chooseBranch("nz", "z")},${asmJumpTarget}`
        ],
        log: ""
      };
    }

    const ifDirection = condition.match(/^(not\s+)?(left|right|up|down)\s+on\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifDirection) {
      const bits = { up: 0, right: 1, down: 2, left: 3 };
      const loadPad = emitLoadInt8Into("a", ifDirection[3]);
      if (!loadPad) {
        return { ok: false, lines: [], log: `if direction requires a byte pad variable: ${condition}` };
      }
      return {
        ok: true,
        lines: [
          ...loadPad,
          `    bit ${bits[ifDirection[2].toLowerCase()]},a`,
          `    jp ${ifDirection[1] ? chooseBranch("z", "nz") : chooseBranch("nz", "z")},${asmJumpTarget}`
        ],
        log: ""
      };
    }

    const conditionAst = parseExpressionAst(condition);
    if (conditionAst) {
      const conditionType = resolveExpressionAstValueType(conditionAst);
      if (conditionType === "int8") {
        const loadValue = emitLoadInt8AstIntoA(conditionAst);
        if (!loadValue) return { ok: false, lines: [], log: `Unsupported IF expression: ${condition}` };
        return {
          ok: true,
          lines: [
            ...loadValue,
            "    or a",
            `    jp ${chooseBranch("nz", "z")},${asmJumpTarget}`
          ],
          log: ""
        };
      }
      if (conditionType === "int16") {
        const loadValue = emitLoadInt16AstIntoHL(conditionAst);
        if (!loadValue) return { ok: false, lines: [], log: `Unsupported IF expression: ${condition}` };
        return {
          ok: true,
          lines: [
            ...loadValue,
            "    ld a,h",
            "    or l",
            `    jp ${chooseBranch("nz", "z")},${asmJumpTarget}`
          ],
          log: ""
        };
      }
    }

    const ifTileUnder = condition.match(/^tile\s+under\s+(.+?)\s*,\s*(.+?)\s+is\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifTileUnder) {
      const lines = emitTilePointCondition(ifTileUnder[1], ifTileUnder[2], ifTileUnder[3], asmJumpTarget, branchWhenFalse);
      if (!lines) return { ok: false, lines: [], log: `tile-under condition requires byte pixel coordinates and a declared tile type: ${condition}` };
      return { ok: true, lines, log: "" };
    }

    const ifTilesUnderBox = condition.match(/^tiles\s+under\s+box\s+(.+?)\s*,\s*(.+?)\s+size\s+(.+?)\s*,\s*(.+?)\s+contain(?:s)?\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifTilesUnderBox) {
      const lines = emitTileBoxCondition(ifTilesUnderBox[1], ifTilesUnderBox[2], ifTilesUnderBox[3], ifTilesUnderBox[4], ifTilesUnderBox[5], asmJumpTarget, branchWhenFalse);
      if (!lines) return { ok: false, lines: [], log: `tiles-under-box condition requires byte pixel coordinates, byte size, and a declared tile type: ${condition}` };
      return { ok: true, lines, log: "" };
    }

    const ifCharsInBox = condition.match(/^chars?\s+in\s+box\s+(.+?)\s*,\s*(.+?)\s+size\s+(.+?)\s*,\s*(.+?)\s+contain(?:s)?\s+(.+)$/i);
    if (ifCharsInBox) {
      const lines = emitCharBoxCondition(ifCharsInBox[1], ifCharsInBox[2], ifCharsInBox[3], ifCharsInBox[4], normalizeExpression(ifCharsInBox[5]), asmJumpTarget, branchWhenFalse);
      if (!lines) return { ok: false, lines: [], log: `chars-in-box condition requires byte tile coordinates, byte size, and a byte tile value or tile type: ${condition}` };
      return { ok: true, lines, log: "" };
    }

    return { ok: false, lines: [], log: `Unsupported IF condition: ${condition}` };
  }

  function emitConditionAstJump(conditionAst, asmJumpTarget, branchWhenFalse = false) {
    if (!conditionAst) return { ok: false, lines: [], log: "Missing IF condition." };
    if (conditionAst.kind === "atom") {
      return emitSimpleConditionalJump(conditionAst.text, asmJumpTarget, branchWhenFalse);
    }
    if (conditionAst.kind === "not") {
      return emitConditionAstJump(conditionAst.expr, asmJumpTarget, !branchWhenFalse);
    }
    if (conditionAst.kind === "and") {
      if (branchWhenFalse) {
        const leftFalse = emitConditionAstJump(conditionAst.left, asmJumpTarget, true);
        if (!leftFalse.ok) return leftFalse;
        const rightFalse = emitConditionAstJump(conditionAst.right, asmJumpTarget, true);
        if (!rightFalse.ok) return rightFalse;
        return { ok: true, lines: [...leftFalse.lines, ...rightFalse.lines], log: "" };
      }
      const skipLabel = makeGeneratedLabel("IfAndSkip");
      const leftFalse = emitConditionAstJump(conditionAst.left, skipLabel, true);
      if (!leftFalse.ok) return leftFalse;
      const rightTrue = emitConditionAstJump(conditionAst.right, asmJumpTarget, false);
      if (!rightTrue.ok) return rightTrue;
      return { ok: true, lines: [...leftFalse.lines, ...rightTrue.lines, `${skipLabel}:`], log: "" };
    }
    if (conditionAst.kind === "or") {
      if (!branchWhenFalse) {
        const leftTrue = emitConditionAstJump(conditionAst.left, asmJumpTarget, false);
        if (!leftTrue.ok) return leftTrue;
        const rightTrue = emitConditionAstJump(conditionAst.right, asmJumpTarget, false);
        if (!rightTrue.ok) return rightTrue;
        return { ok: true, lines: [...leftTrue.lines, ...rightTrue.lines], log: "" };
      }
      const skipLabel = makeGeneratedLabel("IfOrSkip");
      const leftTrue = emitConditionAstJump(conditionAst.left, skipLabel, false);
      if (!leftTrue.ok) return leftTrue;
      const rightFalse = emitConditionAstJump(conditionAst.right, asmJumpTarget, true);
      if (!rightFalse.ok) return rightFalse;
      return { ok: true, lines: [...leftTrue.lines, ...rightFalse.lines, `${skipLabel}:`], log: "" };
    }
    return { ok: false, lines: [], log: "Unsupported IF condition." };
  }

  function emitConditionalJump(conditionText, asmJumpTarget, branchWhenFalse = false) {
    const condition = String(conditionText || "").trim();
    if (!condition) {
      return { ok: false, lines: [], log: "Missing IF condition." };
    }
    const conditionAst = parseBooleanConditionAst(condition);
    if (conditionAst && conditionAst.kind !== "atom") {
      return emitConditionAstJump(conditionAst, asmJumpTarget, branchWhenFalse);
    }
    return emitSimpleConditionalJump(condition, asmJumpTarget, branchWhenFalse);
  }

  function emitOnIndexedJump(valueToken, labelNames, mode) {
    if (!Array.isArray(labelNames) || !labelNames.length || labelNames.length > 255) return null;
    const valueType = resolveValueType(valueToken);
    if (valueType !== "int8" && valueType !== "int16") return null;
    const resolvedTargets = [];
    for (const name of labelNames) {
      const target = resolveSourceJumpTarget(name);
      if (!target) {
        return { error: formatUnknownJumpTargetLog(name, `on ${valueToken} ${mode} ${labelNames.join(", ")}`) };
      }
      resolvedTargets.push(target);
    }
    const doneLabel = makeGeneratedLabel("OnDispatchDone");
    const lines = [];
    if (valueType === "int8") {
      const loadValue = emitLoadInt8Into("a", valueToken);
      if (!loadValue) return null;
      lines.push(...loadValue);
      resolvedTargets.forEach((target, index) => {
        const nextLabel = makeGeneratedLabel("OnDispatchNext");
        lines.push(`    cp ${index + 1}`);
        lines.push(`    jp nz,${nextLabel}`);
        lines.push(mode === "goto" ? `    jp ${target}` : `    call ${target}`);
        if (mode !== "goto") lines.push(`    jp ${doneLabel}`);
        lines.push(`${nextLabel}:`);
      });
      if (mode !== "goto") lines.push(`${doneLabel}:`);
      return lines;
    }
    const loadValue = emitLoadInt16IntoHL(valueToken);
    if (!loadValue) return null;
    lines.push(...loadValue);
    resolvedTargets.forEach((target, index) => {
      const nextLabel = makeGeneratedLabel("OnDispatchNext");
      lines.push("    ld a,h");
      lines.push("    or a");
      lines.push(`    jp nz,${nextLabel}`);
      lines.push("    ld a,l");
      lines.push(`    cp ${index + 1}`);
      lines.push(`    jp nz,${nextLabel}`);
      lines.push(mode === "goto" ? `    jp ${target}` : `    call ${target}`);
      if (mode !== "goto") lines.push(`    jp ${doneLabel}`);
      lines.push(`${nextLabel}:`);
    });
    if (mode !== "goto") lines.push(`${doneLabel}:`);
    return lines;
  }

  function emitSelectCaseEqGoto(exprToken, valueToken, label, skipExprLoad, invertCondition = false) {
    const asmLabel = resolveJumpTarget(label);
    if (skipExprLoad && selectCaseExprCanReuseA(exprToken)) {
      const imm = directByteImmediate(valueToken);
      if (imm !== null) {
        return [`    cp ${imm}`, `    jp ${invertCondition ? "nz" : "z"},${asmLabel}`];
      }
    }
    return emitCompareGoto(exprToken, "==", valueToken, label, invertCondition);
  }

  return {
    invertOperator,
    evaluateConstantComparison,
    emitCompareGoto,
    emitSelectCaseEqGoto,
    emitSimpleConditionalJump,
    emitConditionAstJump,
    emitConditionalJump,
    emitOnIndexedJump
  };
}
