export function createExpressionComputeHelpers({
  resolveExpressionAstComputationType,
  emitLoadInt8Into,
  emitLoadInt16ValueIntoHL,
  resolveValueType,
  resolveDeclaredValueType,
  isAnyFixedDeclaredType,
  isSignedDeclaredType,
  normalizeDeclaredType,
  runtimeTypeForDeclaredType,
  parseFixedPointLiteral,
  formatFixedPointLiteral16,
  renderExpressionAst,
  tryEvaluateConstantExpression,
  tryEvaluateCompileTimeNumericExpression,
  symbolOrValue,
  emitRandomCountIntoA,
  emitScaleAByConst,
  emitStoreInt8FromA,
  emitStoreInt16FromHL,
  makeGeneratedLabel
}) {
  function emitComputeExpressionAst(node, preferredDeclaredType = null) {
    const computationType = resolveExpressionAstComputationType(node, preferredDeclaredType);
    if (!computationType) return null;
    if (computationType.runtimeType === "int8") {
      const lines = emitLoadInt8AstIntoA(node);
      if (!lines) return null;
      return { ...computationType, register: "a", lines };
    }
    if (computationType.runtimeType === "int16") {
      const lines = emitLoadInt16AstIntoHL(node, preferredDeclaredType || computationType.declaredType);
      if (!lines) return null;
      return { ...computationType, register: "hl", lines };
    }
    return null;
  }

  function emitStoreComputedExpression(target, computed) {
    if (!computed) return null;
    const targetType = resolveValueType(target);
    const targetDeclaredType = resolveDeclaredValueType(target);
    if (!targetType) return null;
    if (targetType === "int8") {
      const storeTarget = emitStoreInt8FromA(target);
      if (!storeTarget) return null;
      if (computed.runtimeType === "int8") return [...computed.lines, ...storeTarget];
      if (computed.runtimeType === "int16") {
        if (isAnyFixedDeclaredType(computed.declaredType)) return [...computed.lines, "    ld a,h", ...storeTarget];
        return [...computed.lines, "    ld a,l", ...storeTarget];
      }
      return null;
    }
    if (targetType === "int16") {
      const storeTarget = emitStoreInt16FromHL(target);
      if (!storeTarget) return null;
      if (computed.runtimeType === "int16") return [...computed.lines, ...storeTarget];
      if (computed.runtimeType === "int8") {
        if (isAnyFixedDeclaredType(targetDeclaredType)) {
          return [
            ...computed.lines,
            "    ld h,a",
            "    ld l,0",
            ...storeTarget
          ];
        }
        const signed = isSignedDeclaredType(computed.declaredType || targetDeclaredType);
        return [
          ...computed.lines,
          "    ld l,a",
          ...(signed ? ["    add a,a", "    sbc a,a"] : ["    ld a,0"]),
          "    ld h,a",
          ...storeTarget
        ];
      }
      return null;
    }
    return null;
  }

  function emitStoreComputedToScratch32(baseLabel, computed, signedExtend = isSignedDeclaredType(computed?.declaredType)) {
    if (!computed) return null;
    if (computed.runtimeType === "int8") {
      return [
        ...computed.lines,
        `    ld (${baseLabel}+0),a`,
        ...(signedExtend
          ? ["    add a,a", "    sbc a,a"]
          : ["    xor a"]),
        `    ld (${baseLabel}+1),a`,
        `    ld (${baseLabel}+2),a`,
        `    ld (${baseLabel}+3),a`
      ];
    }
    if (computed.runtimeType === "int16") {
      return [
        ...computed.lines,
        "    ld a,l",
        `    ld (${baseLabel}+0),a`,
        "    ld a,h",
        `    ld (${baseLabel}+1),a`,
        ...(signedExtend
          ? ["    ld a,h", "    add a,a", "    sbc a,a"]
          : ["    xor a"]),
        `    ld (${baseLabel}+2),a`,
        `    ld (${baseLabel}+3),a`
      ];
    }
    return null;
  }

  function coerceComputedExpressionForCompare(computed, declaredType) {
    if (!computed) return null;
    const normalizedDeclaredType = normalizeDeclaredType(declaredType) || computed.declaredType;
    return {
      ...computed,
      declaredType: normalizedDeclaredType,
      runtimeType: computed.runtimeType === "u32" || computed.runtimeType === "i32"
        ? runtimeTypeForDeclaredType(normalizedDeclaredType)
        : computed.runtimeType
    };
  }

  function emitLoadModulo16AstIntoHL(node, preferredDeclaredType = null) {
    const leftType = resolveExpressionAstComputationType(node.left, preferredDeclaredType);
    const rightType = resolveExpressionAstComputationType(node.right, preferredDeclaredType);
    if (!leftType || !rightType) return null;
    const signed = isSignedDeclaredType(leftType.declaredType) || isSignedDeclaredType(rightType.declaredType) || isSignedDeclaredType(preferredDeclaredType);
    const leftValue = tryEvaluateConstantExpression(renderExpressionAst(node.left));
    const rightValue = tryEvaluateConstantExpression(renderExpressionAst(node.right));
    if (leftValue !== null && rightValue !== null) {
      if (rightValue === 0) return ["    ld hl,0"];
      const quotient = Math.trunc(leftValue / rightValue);
      const remainder = leftValue - quotient * rightValue;
      return emitLoadInt16ValueIntoHL(String(remainder));
    }
    const loadLeft = emitLoadInt16AstIntoHL(node.left, signed ? "i16" : "u16");
    const loadRight = emitLoadInt16AstIntoHL(node.right, signed ? "i16" : "u16");
    if (!loadLeft || !loadRight) return null;
    return [
      ...loadLeft,
      "    push hl",
      ...loadRight,
      "    ld b,h",
      "    ld c,l",
      "    pop hl",
      `    call ${signed ? "AMY_I16_MOD" : "AMY_U16_DIV"}`,
      ...(signed ? [] : ["    ld hl,(AMY_U16_DIV_REM)"])
    ];
  }

  function tryEvaluateAstInteger(node) {
    if (!node) return null;
    const rendered = renderExpressionAst(node);
    const value = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(rendered)
      : tryEvaluateConstantExpression(rendered);
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
    let leftSigned = isSignedDeclaredType(leftType?.declaredType);
    let rightSigned = isSignedDeclaredType(rightType?.declaredType);
    if (leftSigned === rightSigned) return { leftSigned, rightSigned };
    const leftValue = tryEvaluateAstInteger(leftNode);
    const rightValue = tryEvaluateAstInteger(rightNode);
    if (leftValue !== null && rightValue === null && valueFitsDeclaredDomain(leftValue, rightType?.declaredType)) {
      leftSigned = rightSigned;
    } else if (rightValue !== null && leftValue === null && valueFitsDeclaredDomain(rightValue, leftType?.declaredType)) {
      rightSigned = leftSigned;
    } else if (leftValue !== null && rightValue !== null) {
      const magnitude = Math.abs(leftValue - rightValue);
      if (magnitude <= 0xFFFF) return { leftSigned: false, rightSigned: false, constantMagnitude: magnitude };
    }
    if (leftSigned !== rightSigned) return null;
    return { leftSigned, rightSigned };
  }

  function emitLoadInt8AstIntoA(node) {
    if (!node) return null;
    if (node.kind === "number") return emitLoadInt8Into("a", node.value);
    if (node.kind === "identifier") return emitLoadInt8Into("a", node.name);
    if (node.kind === "call") {
      const callName = node.name.toLowerCase();
      if (callName === "random" && node.args.length === 1) {
        return emitRandomCountIntoA(renderExpressionAst(node.args[0]));
      }
      if (callName === "random" && node.args.length === 2) {
        const evaluateRandomBound = (argNode) => {
          const rendered = renderExpressionAst(argNode);
          return typeof tryEvaluateCompileTimeNumericExpression === "function"
            ? tryEvaluateCompileTimeNumericExpression(rendered)
            : tryEvaluateConstantExpression(rendered);
        };
        const minValue = evaluateRandomBound(node.args[0]);
        const maxValue = evaluateRandomBound(node.args[1]);
        const retryLabel = makeGeneratedLabel("RandomBetweenRetry");
        const rangeLines = [];
        if (minValue !== null && maxValue !== null) {
          const fullRange = maxValue - minValue + 1;
          if (fullRange === 256) {
            return [
              "    call AMY_RANDOM_U8",
              ...(minValue ? [`    add a,${symbolOrValue(String(minValue & 0xFF))}`] : [])
            ];
          }
          const range = (fullRange & 0xFF);
          rangeLines.push(
            `    ld c,${symbolOrValue(String(minValue & 0xFF))}`,
            `    ld b,${symbolOrValue(String(range))}`
          );
        } else {
          const loadMax = maxValue !== null
            ? [`    ld a,${symbolOrValue(String(maxValue & 0xFF))}`]
            : emitLoadInt8AstIntoA(node.args[1]);
          const loadMin = minValue !== null
            ? [`    ld c,${symbolOrValue(String(minValue & 0xFF))}`]
            : emitLoadInt8AstIntoA(node.args[0]);
          if (!loadMax || !loadMin) return null;
          rangeLines.push(
            ...loadMax,
            ...(maxValue === null ? ["    ld b,a"] : []),
            ...loadMin,
            ...(minValue === null ? ["    ld c,a"] : []),
            ...(maxValue === null ? ["    ld a,b"] : []),
            "    sub c",
            "    inc a",
            "    ld b,a"
          );
        }
        return [
          ...rangeLines,
          `${retryLabel}:`,
          "    call AMY_RANDOM_U8",
          "    cp b",
          `    jr nc,${retryLabel}`,
          "    add a,c"
        ];
      }
      if ((callName === "min" || callName === "max") && node.args.length === 2) {
        const loadLeft = emitLoadInt8AstIntoA(node.args[0]);
        const loadRight = emitLoadInt8AstIntoA(node.args[1]);
        if (!loadLeft || !loadRight) return null;
        const doneLabel = makeGeneratedLabel(callName === "min" ? "MinDone" : "MaxDone");
        const keepLeftBranches = callName === "min"
          ? [`    jr c,${doneLabel}`, `    jr z,${doneLabel}`]
          : [`    jr nc,${doneLabel}`];
        return [
          ...loadLeft,
          "    push af",
          ...loadRight,
          "    ld b,a",
          "    pop af",
          "    cp b",
          ...keepLeftBranches,
          "    ld a,b",
          `${doneLabel}:`
        ];
      }
      if (callName === "absdiff" && node.args.length === 2) {
        const leftType = resolveExpressionAstComputationType(node.args[0]);
        const rightType = resolveExpressionAstComputationType(node.args[1]);
        if (leftType?.runtimeType !== "int8" || rightType?.runtimeType !== "int8") return null;
        const domains = resolveAbsdiffDomains(node.args[0], node.args[1], leftType, rightType);
        if (!domains) return null;
        if (domains.constantMagnitude !== undefined) {
          if (domains.constantMagnitude > 0xFF) return null;
          return [`    ld a,${symbolOrValue(String(domains.constantMagnitude))}`];
        }
        if (domains.leftSigned || domains.rightSigned) return null;
        const loadLeft = emitLoadInt8AstIntoA(node.args[0]);
        const loadRight = emitLoadInt8AstIntoA(node.args[1]);
        if (!loadLeft || !loadRight) return null;
        const leftGreaterOrEqualLabel = makeGeneratedLabel("AbsDiff8LeftGE");
        const doneLabel = makeGeneratedLabel("AbsDiff8Done");
        return [
          ...loadLeft,
          "    push af",
          ...loadRight,
          "    ld b,a",
          "    pop af",
          "    cp b",
          `    jr nc,${leftGreaterOrEqualLabel}`,
          "    ld c,a",
          "    ld a,b",
          "    sub c",
          `    jr ${doneLabel}`,
          `${leftGreaterOrEqualLabel}:`,
          "    sub b",
          `${doneLabel}:`
        ];
      }
      if (callName === "abs" && node.args.length === 1) {
        const loadArg = emitLoadInt8AstIntoA(node.args[0]);
        if (!loadArg) return null;
        const positiveLabel = makeGeneratedLabel("AbsPositive");
        return [
          ...loadArg,
          "    bit 7,a",
          `    jr z,${positiveLabel}`,
          "    neg",
          `${positiveLabel}:`
        ];
      }
      return emitLoadInt8Into("a", renderExpressionAst(node));
    }
    if (node.kind === "index") return emitLoadInt8Into("a", `${node.name}[${renderExpressionAst(node.index)}]`);
    if (node.kind === "member") return emitLoadInt8Into("a", renderExpressionAst(node));
    if (node.kind === "unary") {
      if (node.op === "+") return emitLoadInt8AstIntoA(node.expr);
      const loadExpr = emitLoadInt8AstIntoA(node.expr);
      if (!loadExpr) return null;
      if (node.op === "~") return [...loadExpr, "    cpl"];
      return [...loadExpr, "    neg"];
    }
    if (node.kind === "binary") {
      if (node.op === "+" || node.op === "-" || node.op === "&" || node.op === "|" || node.op === "^") {
        const leftValue = tryEvaluateConstantExpression(renderExpressionAst(node.left));
        const rightValue = tryEvaluateConstantExpression(renderExpressionAst(node.right));
        const immediate = (value) => symbolOrValue(String(value & 0xFF));
        if (rightValue !== null) {
          const loadLeft = emitLoadInt8AstIntoA(node.left);
          if (!loadLeft) return null;
          const opInstr = node.op === "+" ? `add a,${immediate(rightValue)}`
            : node.op === "-" ? `sub ${immediate(rightValue)}`
            : node.op === "&" ? `and ${immediate(rightValue)}`
            : node.op === "|" ? `or ${immediate(rightValue)}`
            : `xor ${immediate(rightValue)}`;
          return [...loadLeft, `    ${opInstr}`];
        }
        if (leftValue !== null && (node.op === "+" || node.op === "&" || node.op === "|" || node.op === "^")) {
          const loadRight = emitLoadInt8AstIntoA(node.right);
          if (!loadRight) return null;
          const opInstr = node.op === "+" ? `add a,${immediate(leftValue)}`
            : node.op === "&" ? `and ${immediate(leftValue)}`
            : node.op === "|" ? `or ${immediate(leftValue)}`
            : `xor ${immediate(leftValue)}`;
          return [...loadRight, `    ${opInstr}`];
        }
        if (leftValue !== null && node.op === "-") {
          const loadRight = emitLoadInt8AstIntoA(node.right);
          if (!loadRight) return null;
          return [...loadRight, "    ld b,a", `    ld a,${immediate(leftValue)}`, "    sub b"];
        }
        const loadLeft = emitLoadInt8AstIntoA(node.left);
        const loadRight = emitLoadInt8AstIntoA(node.right);
        if (!loadLeft || !loadRight) return null;
        const opInstr = node.op === "+" ? "add a,b"
          : node.op === "-" ? "sub b"
          : node.op === "&" ? "and b"
          : node.op === "|" ? "or b"
          : "xor b";
        return [...loadLeft, "    push af", ...loadRight, "    ld b,a", "    pop af", `    ${opInstr}`];
      }
      if (node.op === "*") {
        const leftValue = tryEvaluateConstantExpression(renderExpressionAst(node.left));
        const rightValue = tryEvaluateConstantExpression(renderExpressionAst(node.right));
        if (leftValue !== null && rightValue !== null) {
          return [`    ld a,${symbolOrValue(String((leftValue * rightValue) & 0xFF))}`];
        }
        if (leftValue !== null) {
          const loadRight = emitLoadInt8AstIntoA(node.right);
          const scale = emitScaleAByConst(leftValue);
          if (!loadRight || !scale) return null;
          return [...loadRight, ...scale];
        }
        if (rightValue !== null) {
          const loadLeft = emitLoadInt8AstIntoA(node.left);
          const scale = emitScaleAByConst(rightValue);
          if (!loadLeft || !scale) return null;
          return [...loadLeft, ...scale];
        }
      }
      if (node.op === "%") {
        const rightValue = tryEvaluateConstantExpression(renderExpressionAst(node.right));
        if (Number.isInteger(rightValue) && rightValue > 0 && rightValue <= 256 && (rightValue & (rightValue - 1)) === 0) {
          const leftDeclaredType = resolveDeclaredValueType(renderExpressionAst(node.left));
          if (!isSignedDeclaredType(leftDeclaredType)) {
            const loadLeft = emitLoadInt8AstIntoA(node.left);
            if (!loadLeft) return null;
            const mask = `$${((rightValue - 1) & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
            return [...loadLeft, `    and ${mask}`];
          }
        }
        const lines = emitLoadModulo16AstIntoHL(node, resolveDeclaredValueType(renderExpressionAst(node)) || null);
        if (!lines) return null;
        return [...lines, "    ld a,l"];
      }
      if (node.op === "<<" || node.op === ">>") {
        const shiftCount = tryEvaluateConstantExpression(renderExpressionAst(node.right));
        if (shiftCount === null || shiftCount < 0 || shiftCount > 7) return null;
        const loadLeft = emitLoadInt8AstIntoA(node.left);
        if (!loadLeft) return null;
        const declaredType = resolveDeclaredValueType(renderExpressionAst(node.left));
        const shiftInstr = node.op === "<<"
          ? "add a,a"
          : (isSignedDeclaredType(declaredType) ? "sra a" : "srl a");
        const shiftLines = [];
        for (let i = 0; i < shiftCount; i += 1) shiftLines.push(`    ${shiftInstr}`);
        return [...loadLeft, ...shiftLines];
      }
      return null;
    }
    return null;
  }

  function emitLoadInt16AstIntoHL(node, preferredDeclaredType = null) {
    if (!node) return null;
    if (node.kind === "number") {
      if (isAnyFixedDeclaredType(preferredDeclaredType)) {
        const fixedLiteral = parseFixedPointLiteral(node.value);
        if (fixedLiteral !== null) return [`    ld hl,${formatFixedPointLiteral16(fixedLiteral)}`];
      }
      return emitLoadInt16ValueIntoHL(node.value);
    }
    if (node.kind === "identifier") {
      const declaredType = resolveDeclaredValueType(node.name);
      const type = resolveValueType(node.name);
      if (isAnyFixedDeclaredType(preferredDeclaredType) && !isAnyFixedDeclaredType(declaredType) && type === "int8") {
        const loadByte = emitLoadInt8Into("a", node.name);
        if (!loadByte) return null;
        return [...loadByte, "    ld h,a", "    ld l,0"];
      }
      if (type === "int8") {
        const loadByte = emitLoadInt8Into("a", node.name);
        if (!loadByte) return null;
        if (isSignedDeclaredType(declaredType)) {
          return [...loadByte, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a"];
        }
        return [...loadByte, "    ld l,a", "    ld h,0"];
      }
      return emitLoadInt16ValueIntoHL(node.name);
    }
    if (node.kind === "call") {
      const callName = String(node.name || "").toLowerCase();
      if (callName === "absdiff" && node.args.length === 2) {
        const leftType = resolveExpressionAstComputationType(node.args[0]);
        const rightType = resolveExpressionAstComputationType(node.args[1]);
        const domains = resolveAbsdiffDomains(node.args[0], node.args[1], leftType, rightType);
        if (!domains) return null;
        if (domains.constantMagnitude !== undefined) {
          return [`    ld hl,${symbolOrValue(String(domains.constantMagnitude))}`];
        }
        const signedCompare = domains.leftSigned || domains.rightSigned;
        const loadLeft = emitLoadInt16AstIntoHL(node.args[0], preferredDeclaredType);
        const loadRight = emitLoadInt16AstIntoHL(node.args[1], preferredDeclaredType);
        if (!loadLeft || !loadRight) return null;
        const leftGreaterOrEqualLabel = makeGeneratedLabel("AbsDiff16LeftGE");
        const sameSignLabel = makeGeneratedLabel("AbsDiff16SameSign");
        const subtractLabel = makeGeneratedLabel("AbsDiff16Subtract");
        return [
          ...loadLeft,
          "    push hl",
          ...loadRight,
          "    ex de,hl",
          "    pop hl",
          ...(signedCompare
            ? [
                "    bit 7,h",
                `    jr z,${sameSignLabel}_LEFT_NONNEG`,
                "    bit 7,d",
                `    jr z,${subtractLabel}`,
                `    jr ${sameSignLabel}`,
                `${sameSignLabel}_LEFT_NONNEG:`,
                "    bit 7,d",
                `    jr nz,${leftGreaterOrEqualLabel}`,
                `${sameSignLabel}:`,
                "    push hl",
                "    or a",
                "    sbc hl,de",
                "    pop hl",
                `    jr nc,${leftGreaterOrEqualLabel}`
              ]
            : [
                "    push hl",
                "    or a",
                "    sbc hl,de",
                "    pop hl",
                `    jr nc,${leftGreaterOrEqualLabel}`
              ]),
          `${subtractLabel}:`,
          "    ex de,hl",
          "    or a",
          "    sbc hl,de",
          `    jr ${leftGreaterOrEqualLabel}_DONE`,
          `${leftGreaterOrEqualLabel}:`,
          "    or a",
          "    sbc hl,de",
          `${leftGreaterOrEqualLabel}_DONE:`
        ];
      }
      if (callName === "abs" && node.args.length === 1) {
        const loadArg = emitLoadInt16AstIntoHL(node.args[0], preferredDeclaredType);
        if (!loadArg) return null;
        const positiveLabel = makeGeneratedLabel("Abs16Positive");
        return [
          ...loadArg,
          "    bit 7,h",
          `    jr z,${positiveLabel}`,
          "    xor a",
          "    sub l",
          "    ld l,a",
          "    sbc a,a",
          "    sub h",
          "    ld h,a",
          `${positiveLabel}:`
        ];
      }
      if ((callName === "min" || callName === "max") && node.args.length === 2) {
        const loadLeft = emitLoadInt16AstIntoHL(node.args[0], preferredDeclaredType);
        const loadRight = emitLoadInt16AstIntoHL(node.args[1], preferredDeclaredType);
        if (!loadLeft || !loadRight) return null;
        const keepLeftLabel = makeGeneratedLabel(callName === "min" ? "MinKeepLeft" : "MaxKeepLeft");
        const doneLabel = makeGeneratedLabel(callName === "min" ? "MinDone" : "MaxDone");
        const keepLeftBranches = callName === "min"
          ? [`    jr c,${keepLeftLabel}`, `    jr z,${keepLeftLabel}`]
          : [`    jr nc,${keepLeftLabel}`];
        return [
          ...loadLeft,
          "    push hl",
          ...loadRight,
          "    ex de,hl",
          "    pop hl",
          "    push hl",
          "    or a",
          "    sbc hl,de",
          ...keepLeftBranches,
          "    pop hl",
          "    ld h,d",
          "    ld l,e",
          `    jr ${doneLabel}`,
          `${keepLeftLabel}:`,
          "    pop hl",
          `${doneLabel}:`
        ];
      }
      const rendered = renderExpressionAst(node);
      const callType = resolveValueType(rendered);
      const declaredType = resolveDeclaredValueType(rendered);
      if (isAnyFixedDeclaredType(preferredDeclaredType) && !isAnyFixedDeclaredType(declaredType) && callType === "int8") {
        const loadByte = emitLoadInt8Into("a", rendered);
        if (!loadByte) return null;
        return [...loadByte, "    ld h,a", "    ld l,0"];
      }
      if (callType === "int8") {
        const loadByte = emitLoadInt8Into("a", rendered);
        if (!loadByte) return null;
        if (isSignedDeclaredType(declaredType)) {
          return [...loadByte, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a"];
        }
        return [...loadByte, "    ld l,a", "    ld h,0"];
      }
      return emitLoadInt16ValueIntoHL(rendered);
    }
    if (node.kind === "index") {
      const rendered = `${node.name}[${renderExpressionAst(node.index)}]`;
      const indexType = resolveValueType(rendered);
      const declaredType = resolveDeclaredValueType(rendered);
      if (isAnyFixedDeclaredType(preferredDeclaredType) && !isAnyFixedDeclaredType(declaredType) && indexType === "int8") {
        const loadByte = emitLoadInt8Into("a", rendered);
        if (!loadByte) return null;
        return [...loadByte, "    ld h,a", "    ld l,0"];
      }
      if (indexType === "int8") {
        const loadByte = emitLoadInt8Into("a", rendered);
        if (!loadByte) return null;
        if (isSignedDeclaredType(declaredType)) {
          return [...loadByte, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a"];
        }
        return [...loadByte, "    ld l,a", "    ld h,0"];
      }
      return emitLoadInt16ValueIntoHL(rendered);
    }
    if (node.kind === "member") {
      const rendered = renderExpressionAst(node);
      const memberType = resolveValueType(rendered);
      const declaredType = resolveDeclaredValueType(rendered);
      if (isAnyFixedDeclaredType(preferredDeclaredType) && !isAnyFixedDeclaredType(declaredType) && memberType === "int8") {
        const loadByte = emitLoadInt8Into("a", rendered);
        if (!loadByte) return null;
        return [...loadByte, "    ld h,a", "    ld l,0"];
      }
      if (memberType === "int8") {
        const loadByte = emitLoadInt8Into("a", rendered);
        if (!loadByte) return null;
        if (isSignedDeclaredType(declaredType)) {
          return [...loadByte, "    ld l,a", "    add a,a", "    sbc a,a", "    ld h,a"];
        }
        return [...loadByte, "    ld l,a", "    ld h,0"];
      }
      return emitLoadInt16ValueIntoHL(rendered);
    }
    if (node.kind === "unary") {
      if (node.op === "+") return emitLoadInt16AstIntoHL(node.expr, preferredDeclaredType);
      if (node.op === "~") {
        const loadExpr = emitLoadInt16AstIntoHL(node.expr, preferredDeclaredType);
        if (!loadExpr) return null;
        return [...loadExpr, "    ld a,h", "    cpl", "    ld h,a", "    ld a,l", "    cpl", "    ld l,a"];
      }
      if (isAnyFixedDeclaredType(preferredDeclaredType)) {
        const fixedLiteral = parseFixedPointLiteral(renderExpressionAst(node));
        if (fixedLiteral !== null) return [`    ld hl,${formatFixedPointLiteral16(fixedLiteral)}`];
      }
      const constantValue = tryEvaluateConstantExpression(renderExpressionAst(node));
      if (constantValue !== null) return emitLoadInt16ValueIntoHL(String(constantValue));
      return null;
    }
    if (node.kind === "binary") {
      if (node.op === "&" || node.op === "|" || node.op === "^") {
        const loadLeft = emitLoadInt16AstIntoHL(node.left, preferredDeclaredType);
        const loadRight = emitLoadInt16AstIntoHL(node.right, preferredDeclaredType);
        if (!loadLeft || !loadRight) return null;
        const opInstr = node.op === "&" ? "and" : node.op === "|" ? "or" : "xor";
        return [
          ...loadLeft,
          "    push hl",
          ...loadRight,
          "    ex de,hl",
          "    pop hl",
          "    ld a,l",
          `    ${opInstr} e`,
          "    ld l,a",
          "    ld a,h",
          `    ${opInstr} d`,
          "    ld h,a"
        ];
      }
      if (node.op === "<<" || node.op === ">>") {
        const shiftCount = tryEvaluateConstantExpression(renderExpressionAst(node.right));
        if (shiftCount === null || shiftCount < 0 || shiftCount > 15) return null;
        const loadLeft = emitLoadInt16AstIntoHL(node.left, preferredDeclaredType);
        if (!loadLeft) return null;
        const declaredType = resolveDeclaredValueType(renderExpressionAst(node.left));
        const shiftLines = [];
        for (let i = 0; i < shiftCount; i += 1) {
          if (node.op === "<<") shiftLines.push("    add hl,hl");
          else if (isSignedDeclaredType(declaredType)) shiftLines.push("    sra h", "    rr l");
          else shiftLines.push("    srl h", "    rr l");
        }
        return [...loadLeft, ...shiftLines];
      }
      if (node.op !== "+" && node.op !== "-") {
        if (node.op === "%") {
          return emitLoadModulo16AstIntoHL(node, preferredDeclaredType);
        }
        if (isAnyFixedDeclaredType(preferredDeclaredType)) {
          const fixedLiteral = parseFixedPointLiteral(renderExpressionAst(node));
          if (fixedLiteral !== null) return [`    ld hl,${formatFixedPointLiteral16(fixedLiteral)}`];
        }
        const constantValue = tryEvaluateConstantExpression(renderExpressionAst(node));
        if (constantValue !== null) return emitLoadInt16ValueIntoHL(String(constantValue));
        return null;
      }
      const arithmeticContext = isAnyFixedDeclaredType(preferredDeclaredType)
        ? normalizeDeclaredType(preferredDeclaredType)
        : resolveDeclaredValueType(renderExpressionAst(node));
      const loadLeft = emitLoadInt16AstIntoHL(node.left, arithmeticContext);
      const loadRight = emitLoadInt16AstIntoHL(node.right, arithmeticContext);
      if (!loadLeft || !loadRight) return null;
      return [...loadLeft, "    push hl", ...loadRight, "    ex de,hl", "    pop hl", node.op === "+" ? "    add hl,de" : "    or a", ...(node.op === "-" ? ["    sbc hl,de"] : [])];
    }
    return null;
  }

  return {
    emitComputeExpressionAst,
    emitStoreComputedExpression,
    emitStoreComputedToScratch32,
    coerceComputedExpressionForCompare,
    emitLoadInt8AstIntoA,
    emitLoadInt16AstIntoHL
  };
}
