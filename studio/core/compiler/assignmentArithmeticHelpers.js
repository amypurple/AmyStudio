export function createAssignmentArithmeticHelpers({
  getRuntimeInfo,
  tryEvaluateCompileTimeNumericExpression,
  resolveDeclaredValueType,
  normalizeDeclaredType,
  isAnyFixedDeclaredType,
  isFix16_16DeclaredType,
  emitFx16ArithOp,
  emitFp5ArithOp,
  emitFx16MultiplyOp,
  emitFx16DivideOp,
  emitFp5MultiplyOp,
  emitFp5DivideOp,
  emitRuntimeStore,
  emitLoadInt8Into,
  emitStoreInt8FromA,
  makeGeneratedLabel,
  symbolOrValue,
  emitLoadInt16IntoHL,
  emitStoreInt16FromHL,
  parseNumericLiteral,
  isSignedDeclaredType,
  formatHex16,
  resolveValueType,
  emitArithInt8Op,
  emitArithInt16Op,
  parseArrayRef,
  emitLoadArrayAddressIntoHL,
  emitU32Inc,
  emitU32Dec,
  ensureCompareScratch32,
  emitStoreExtended32,
  emitStoreMemory32ToTarget,
  emitBcdAdd,
  emitBcdSub
}) {
  function emitLoadUnsignedInt16ValueIntoBC(token) {
    const valueType = resolveValueType(token);
    const declaredType = resolveDeclaredValueType(token);
    if (!valueType) {
      const numeric = parseNumericLiteral(token);
      if (numeric === null || numeric < 0 || numeric > 0xFFFF) return null;
      return [`    ld bc,${formatHex16(numeric)}`];
    }
    if (valueType === "int8") {
      if (isSignedDeclaredType(declaredType)) return null;
      const loadA = emitLoadInt8Into("a", token);
      if (!loadA) return null;
      return [...loadA, "    ld c,a", "    ld b,0"];
    }
    if (valueType === "int16") {
      const lowered = normalizeDeclaredType(declaredType || "word");
      if (lowered === "i16" || isAnyFixedDeclaredType(lowered)) return null;
      const loadHL = emitLoadInt16IntoHL(token);
      if (!loadHL) return null;
      return [...loadHL, "    ld b,h", "    ld c,l"];
    }
    return null;
  }

  function emitLoadInt16ValueIntoBC(token, preferredDeclaredType = null) {
    const loadHL = emitLoadInt16IntoHL(token, preferredDeclaredType);
    if (!loadHL) return null;
    return [...loadHL, "    ld b,h", "    ld c,l"];
  }

  function emitU32Add(srcName, dstName) {
    const srcInfo = getRuntimeInfo(srcName);
    const dstInfo = getRuntimeInfo(dstName);
    if (!srcInfo || !dstInfo) return null;
    if (srcInfo.storage === "stack" || dstInfo.storage === "stack") {
      const scratch = ensureCompareScratch32();
      const storeDst = emitStoreExtended32(dstName, scratch.leftLabel);
      const storeSrc = emitStoreExtended32(srcName, scratch.rightLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, dstName);
      if (!storeDst || !storeSrc || !storeTarget) return null;
      return [...storeDst, ...storeSrc, `    ld hl,${scratch.leftLabel}`, `    ld de,${scratch.rightLabel}`, "    call AMY_U32_ADD", ...storeTarget];
    }
    const srcAsm = srcInfo.asmName;
    const dstAsm = dstInfo.asmName;
    if (!srcAsm || !dstAsm) return null;
    return [
      `    ld hl,${dstAsm}`,
      `    ld de,${srcAsm}`,
      "    call AMY_U32_ADD"
    ];
  }

  function emitU32Sub(srcName, dstName) {
    const srcInfo = getRuntimeInfo(srcName);
    const dstInfo = getRuntimeInfo(dstName);
    if (!srcInfo || !dstInfo) return null;
    if (srcInfo.storage === "stack" || dstInfo.storage === "stack") {
      const scratch = ensureCompareScratch32();
      const storeDst = emitStoreExtended32(dstName, scratch.leftLabel);
      const storeSrc = emitStoreExtended32(srcName, scratch.rightLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, dstName);
      if (!storeDst || !storeSrc || !storeTarget) return null;
      return [...storeDst, ...storeSrc, `    ld hl,${scratch.leftLabel}`, `    ld de,${scratch.rightLabel}`, "    call AMY_U32_SUB", ...storeTarget];
    }
    const srcAsm = srcInfo.asmName;
    const dstAsm = dstInfo.asmName;
    if (!srcAsm || !dstAsm) return null;
    return [
      `    ld hl,${dstAsm}`,
      `    ld de,${srcAsm}`,
      "    call AMY_U32_SUB"
    ];
  }

  function emitU32Mul(srcName, dstName) {
    const srcInfo = getRuntimeInfo(srcName);
    const dstInfo = getRuntimeInfo(dstName);
    if (!srcInfo || !dstInfo) return null;
    if (srcInfo.storage === "stack" || dstInfo.storage === "stack") {
      const scratch = ensureCompareScratch32();
      const storeDst = emitStoreExtended32(dstName, scratch.leftLabel);
      const storeSrc = emitStoreExtended32(srcName, scratch.rightLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, dstName);
      if (!storeDst || !storeSrc || !storeTarget) return null;
      return [...storeDst, ...storeSrc, `    ld hl,${scratch.leftLabel}`, `    ld de,${scratch.rightLabel}`, "    call AMY_U32_MUL", ...storeTarget];
    }
    const srcAsm = srcInfo.asmName;
    const dstAsm = dstInfo.asmName;
    if (!srcAsm || !dstAsm) return null;
    return [
      `    ld hl,${dstAsm}`,
      `    ld de,${srcAsm}`,
      "    call AMY_U32_MUL"
    ];
  }

  function emitU32Div(srcName, dstName) {
    const srcInfo = getRuntimeInfo(srcName);
    const dstInfo = getRuntimeInfo(dstName);
    if (!srcInfo || !dstInfo) return null;
    if (srcInfo.storage === "stack" || dstInfo.storage === "stack") {
      const scratch = ensureCompareScratch32();
      const storeDst = emitStoreExtended32(dstName, scratch.leftLabel);
      const storeSrc = emitStoreExtended32(srcName, scratch.rightLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, dstName);
      if (!storeDst || !storeSrc || !storeTarget) return null;
      return [...storeDst, ...storeSrc, `    ld hl,${scratch.leftLabel}`, `    ld de,${scratch.rightLabel}`, "    call AMY_U32_DIV", ...storeTarget];
    }
    const srcAsm = srcInfo.asmName;
    const dstAsm = dstInfo.asmName;
    if (!srcAsm || !dstAsm) return null;
    return [
      `    ld hl,${dstAsm}`,
      `    ld de,${srcAsm}`,
      "    call AMY_U32_DIV"
    ];
  }

  function emitArith32Op(target, valueToken, op) {
    const targetArrayRef = parseArrayRef(target);
    const info = targetArrayRef ? getRuntimeInfo(targetArrayRef.name) : getRuntimeInfo(target);
    if (!info) return null;
    if (!targetArrayRef && info.kind === "fix16_16") {
      return emitFx16ArithOp(target, valueToken, op);
    }
    if (targetArrayRef) {
      if (info.kind !== "array" || (info.elementType !== "u32" && info.elementType !== "i32")) return null;
    } else if (info.kind === "array" || (info.kind !== "u32" && info.kind !== "i32")) {
      return null;
    }
    const valueInfo = getRuntimeInfo(valueToken);
    if (
      valueInfo &&
      valueInfo.storage !== "stack" &&
      info.storage !== "stack" &&
      !targetArrayRef &&
      (valueInfo.kind === "u32" || valueInfo.kind === "i32")
    ) {
      if (op === "add") return emitU32Add(valueToken, target);
      if (op === "sub") return emitU32Sub(valueToken, target);
      if (op === "mul") return emitU32Mul(valueToken, target);
      if (op === "div") return emitU32Div(valueToken, target);
    }
    const scratch = ensureCompareScratch32();
    const storeDst = emitStoreExtended32(target, scratch.leftLabel);
    const storeSrc = emitStoreExtended32(valueToken, scratch.rightLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
    if (!storeDst || !storeSrc || !storeTarget) return null;
    if (op === "add") {
      return [
        ...storeDst,
        ...storeSrc,
        `    ld hl,${scratch.leftLabel}`,
        `    ld de,${scratch.rightLabel}`,
        "    call AMY_U32_ADD",
        ...storeTarget
      ];
    }
    if (op === "sub") {
      return [
        ...storeDst,
        ...storeSrc,
        `    ld hl,${scratch.leftLabel}`,
        `    ld de,${scratch.rightLabel}`,
        "    call AMY_U32_SUB",
        ...storeTarget
      ];
    }
    if (op === "mul") {
      return [
        ...storeDst,
        ...storeSrc,
        `    ld hl,${scratch.leftLabel}`,
        `    ld de,${scratch.rightLabel}`,
        "    call AMY_U32_MUL",
        ...storeTarget
      ];
    }
    if (op === "div") {
      return [
        ...storeDst,
        ...storeSrc,
        `    ld hl,${scratch.leftLabel}`,
        `    ld de,${scratch.rightLabel}`,
        "    call AMY_U32_DIV",
        ...storeTarget
      ];
    }
    return null;
  }

  function emitMultiplyInt8Op(target, valueToken) {
    const info = getRuntimeInfo(target);
    if (!info || info.kind === "array" || info.type !== "int8") return null;
    const loadTarget = emitLoadInt8Into("a", target);
    const storeTarget = emitStoreInt8FromA(target);
    if (!loadTarget || !storeTarget) return null;
    const valueInfo = getRuntimeInfo(valueToken);
    const mulLoop = makeGeneratedLabel("MulLoop");
    const mulDone = makeGeneratedLabel("MulDone");
    const lines = [];
    if (valueInfo) {
      if (valueInfo.kind === "array" || valueInfo.type !== "int8") return null;
      lines.push(...emitLoadInt8Into("b", target));
      lines.push(...emitLoadInt8Into("c", valueToken));
    } else {
      lines.push(...loadTarget);
      lines.push("    ld b,a");
      lines.push(`    ld c,${symbolOrValue(valueToken)}`);
    }
    lines.push("    ld a,c");
    lines.push("    or a");
    lines.push(`    jr z,${mulDone}`);
    lines.push("    xor a");
    lines.push(`${mulLoop}:`);
    lines.push("    add a,b");
    lines.push("    dec c");
    lines.push(`    jr nz,${mulLoop}`);
    lines.push(`${mulDone}:`);
    lines.push(...storeTarget);
    return lines;
  }

  function emitMultiplyInt16Op(target, valueToken) {
    const info = getRuntimeInfo(target);
    const declaredType = resolveDeclaredValueType(target);
    const loweredTarget = normalizeDeclaredType(declaredType || "word");
    if (!info || info.kind === "array" || info.type !== "int16") return null;
    // i16 is intentionally included: the low 16 bits of a multiply are identical for
    // signed and unsigned operands (two's complement); only the discarded upper half differs.
    if (isAnyFixedDeclaredType(loweredTarget)) return null;
    const loadTarget = emitLoadInt16IntoHL(target);
    const loadCount = emitLoadUnsignedInt16ValueIntoBC(valueToken);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadTarget || !loadCount || !storeTarget) return null;
    const mulLoop = makeGeneratedLabel("Mul16Loop");
    const mulDone = makeGeneratedLabel("Mul16Done");
    return [
      ...loadTarget,
      "    ex de,hl",
      ...loadCount,
      "    ld hl,0",
      `${mulLoop}:`,
      "    ld a,b",
      "    or c",
      `    jr z,${mulDone}`,
      "    add hl,de",
      "    dec bc",
      `    jr ${mulLoop}`,
      `${mulDone}:`,
      ...storeTarget
    ];
  }

  function emitDivideInt8Op(target, valueToken) {
    const info = getRuntimeInfo(target);
    if (!info || info.kind === "array" || info.type !== "int8") return null;
    const loadTarget = emitLoadInt8Into("a", target);
    const storeTarget = emitStoreInt8FromA(target);
    if (!loadTarget || !storeTarget) return null;
    const divLoop = makeGeneratedLabel("DivLoop");
    const divDone = makeGeneratedLabel("DivDone");
    const divNonZero = makeGeneratedLabel("DivNonZero");
    const divFinish = makeGeneratedLabel("DivFinish");
    const lines = [];
    const valueInfo = getRuntimeInfo(valueToken);
    if (valueInfo) {
      if (valueInfo.kind === "array" || valueInfo.type !== "int8") return null;
      const loadValue = emitLoadInt8Into("b", valueToken);
      if (!loadValue) return null;
      lines.push(...loadValue);
      lines.push("    ld a,b");
      lines.push("    or a");
      lines.push(`    jr nz,${divNonZero}`);
      lines.push("    xor a");
      lines.push(...storeTarget);
      lines.push(`    jr ${divFinish}`);
      lines.push(`${divNonZero}:`);
    } else {
      const numeric = parseNumericLiteral(valueToken);
      if (numeric !== null) {
        if (numeric < 0 || numeric > 255) return null;
        if (numeric === 0) return null;
      }
      lines.push(`    ld b,${symbolOrValue(valueToken)}`);
    }
    lines.push(...loadTarget);
    lines.push("    ld c,0");
    lines.push(`${divLoop}:`);
    lines.push("    cp b");
    lines.push(`    jr c,${divDone}`);
    lines.push("    sub b");
    lines.push("    inc c");
    lines.push(`    jr ${divLoop}`);
    lines.push(`${divDone}:`);
    lines.push("    ld a,c");
    lines.push(...storeTarget);
    lines.push(`${divFinish}:`);
    return lines;
  }

  function emitDivideInt16Op(target, valueToken) {
    const info = getRuntimeInfo(target);
    const targetDeclared = normalizeDeclaredType(resolveDeclaredValueType(target) || "word");
    if (!info || info.kind === "array" || info.type !== "int16") return null;
    if (isAnyFixedDeclaredType(targetDeclared)) return null;
    const loadTarget = emitLoadInt16IntoHL(target);
    const loadValue = targetDeclared === "i16"
      ? emitLoadInt16ValueIntoBC(valueToken)
      : emitLoadUnsignedInt16ValueIntoBC(valueToken);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadTarget || !loadValue || !storeTarget) return null;
    return [
      ...loadTarget,
      "    push hl",
      ...loadValue,
      "    pop hl",
      `    call ${targetDeclared === "i16" ? "AMY_I16_DIV" : "AMY_U16_DIV"}`,
      ...storeTarget
    ];
  }

  function emitFixed8_8MultiplyOp(target, valueToken) {
    const targetDeclared = normalizeDeclaredType(resolveDeclaredValueType(target) || "fixed");
    const loadTarget = emitLoadInt16IntoHL(target, targetDeclared);
    const loadValue = emitLoadInt16ValueIntoBC(valueToken, targetDeclared);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadTarget || !loadValue || !storeTarget) return null;
    return [
      ...loadTarget,
      "    push hl",
      ...loadValue,
      "    ld d,b",
      "    ld e,c",
      "    pop hl",
      "    call AMY_FX8_8_MUL",
      ...storeTarget
    ];
  }

  function emitFixed8_8DivideOp(target, valueToken) {
    const targetDeclared = normalizeDeclaredType(resolveDeclaredValueType(target) || "fixed");
    const loadTarget = emitLoadInt16IntoHL(target, targetDeclared);
    const loadValue = emitLoadInt16ValueIntoBC(valueToken, targetDeclared);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadTarget || !loadValue || !storeTarget) return null;
    return [
      ...loadTarget,
      "    push hl",
      ...loadValue,
      "    ld d,b",
      "    ld e,c",
      "    pop hl",
      "    call AMY_FX8_8_DIV",
      ...storeTarget
    ];
  }

  function emitAdjustByOne(target, op) {
    const arrayRef = parseArrayRef(target);
    const info = arrayRef ? getRuntimeInfo(arrayRef.name) : getRuntimeInfo(target);
    if (!info) return null;
    const targetType = resolveValueType(target);
    if (targetType === "int8") {
      if (arrayRef) {
        if (info.kind !== "array" || info.elementType !== "int8") return null;
        const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
        if (!loadAddress) return null;
        return [...loadAddress, `    ${op} (hl)`];
      }
      if (info.kind === "packed_bool") return null;
      if (info.storage === "stack") {
        return [`    ${op} (ix${info.offset < 0 ? info.offset : `+${info.offset}`})`];
      }
      return [`    ld hl,${info.asmName}`, `    ${op} (hl)`];
    }
    if (targetType === "int16") {
      const declaredType = normalizeDeclaredType(resolveDeclaredValueType(target) || "word");
      if (isAnyFixedDeclaredType(declaredType)) return null;
      if (arrayRef) {
        if (info.kind !== "array" || info.elementType !== "int16") return null;
        const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
        if (!loadAddress) return null;
        const doneLabel = makeGeneratedLabel("ArrayWordDone");
        if (op === "inc") {
          return [
            ...loadAddress,
            "    inc (hl)",
            `    jr nz,${doneLabel}`,
            "    inc hl",
            "    inc (hl)",
            `${doneLabel}:`
          ];
        }
        return [
          ...loadAddress,
          "    ld a,(hl)",
          "    dec (hl)",
          "    cp 0",
          `    jr nz,${doneLabel}`,
          "    inc hl",
          "    dec (hl)",
          `${doneLabel}:`
        ];
      }
      if (info.storage === "stack") {
        const lowOffset = info.offset;
        const highOffset = info.offset + 1;
        const doneLabel = makeGeneratedLabel("WordDone");
        if (op === "inc") {
          return [
            `    inc (ix${lowOffset < 0 ? lowOffset : `+${lowOffset}`})`,
            `    jr nz,${doneLabel}`,
            `    inc (ix${highOffset < 0 ? highOffset : `+${highOffset}`})`,
            `${doneLabel}:`
          ];
        }
        return [
          `    ld a,(ix${lowOffset < 0 ? lowOffset : `+${lowOffset}`})`,
          `    dec (ix${lowOffset < 0 ? lowOffset : `+${lowOffset}`})`,
          "    cp 0",
          `    jr nz,${doneLabel}`,
          `    dec (ix${highOffset < 0 ? highOffset : `+${highOffset}`})`,
          `${doneLabel}:`
        ];
      }
      const doneLabel = makeGeneratedLabel("WordDone");
      if (op === "inc") {
        return [
          `    ld hl,${info.asmName}`,
          "    inc (hl)",
          `    jr nz,${doneLabel}`,
          "    inc hl",
          "    inc (hl)",
          `${doneLabel}:`
        ];
      }
      return [
        `    ld hl,${info.asmName}`,
        "    ld a,(hl)",
        "    dec (hl)",
        "    cp 0",
        `    jr nz,${doneLabel}`,
        "    inc hl",
        "    dec (hl)",
        `${doneLabel}:`
      ];
    }
    return null;
  }

  function emitMultiplyByPowerOfTwo(target, shiftCount) {
    const arrayRef = parseArrayRef(target);
    const info = arrayRef ? getRuntimeInfo(arrayRef.name) : getRuntimeInfo(target);
    if (!info || !Number.isInteger(shiftCount) || shiftCount < 1) return null;
    const targetType = resolveValueType(target);
    if (targetType === "int8") {
      if (arrayRef) {
        if (info.kind !== "array" || info.elementType !== "int8") return null;
        const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
        if (!loadAddress) return null;
        return [...loadAddress, ...Array.from({ length: shiftCount }, () => "    sla (hl)")];
      }
      if (info.kind === "packed_bool") return null;
      if (info.storage === "stack") {
        return Array.from({ length: shiftCount }, () => `    sla (ix${info.offset < 0 ? info.offset : `+${info.offset}`})`);
      }
      return [`    ld hl,${info.asmName}`, ...Array.from({ length: shiftCount }, () => "    sla (hl)")];
    }
    if (targetType === "int16") {
      const declaredType = normalizeDeclaredType(resolveDeclaredValueType(target) || "word");
      if (isAnyFixedDeclaredType(declaredType)) return null;
      if (arrayRef) {
        if (info.kind !== "array" || info.elementType !== "int16") return null;
        const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
        if (!loadAddress) return null;
        const lines = [...loadAddress];
        for (let index = 0; index < shiftCount; index += 1) {
          lines.push("    sla (hl)", "    inc hl", "    rl (hl)", "    dec hl");
        }
        return lines;
      }
      if (info.storage === "stack") {
        const lowOffset = info.offset;
        const highOffset = info.offset + 1;
        const lines = [];
        for (let index = 0; index < shiftCount; index += 1) {
          lines.push(
            `    sla (ix${lowOffset < 0 ? lowOffset : `+${lowOffset}`})`,
            `    rl (ix${highOffset < 0 ? highOffset : `+${highOffset}`})`
          );
        }
        return lines;
      }
      const lines = [`    ld hl,${info.asmName}`];
      for (let index = 0; index < shiftCount; index += 1) {
        lines.push("    sla (hl)", "    inc hl", "    rl (hl)", "    dec hl");
      }
      return lines;
    }
    return null;
  }

  function emitFormulaAssignment(target, opToken, valueToken) {
    if (opToken === "=") return emitRuntimeStore(target, valueToken);
    if (opToken === "%=") return emitRuntimeStore(target, `${target} % (${valueToken})`);
    const targetType = resolveValueType(target);
    const targetDeclaredType = normalizeDeclaredType(resolveDeclaredValueType(target));
    const constantNumeric =
      typeof tryEvaluateCompileTimeNumericExpression === "function"
        ? tryEvaluateCompileTimeNumericExpression(valueToken)
        : null;
    const isZero = constantNumeric !== null && constantNumeric === 0;
    const isOne = constantNumeric !== null && constantNumeric === 1;
    const isTwo = constantNumeric !== null && constantNumeric === 2;
    const isFour = constantNumeric !== null && constantNumeric === 4;
    const isEight = constantNumeric !== null && constantNumeric === 8;
    if (constantNumeric !== null && constantNumeric < 0 && (opToken === "+=" || opToken === "-=")) {
      const normalizedOp = opToken === "+=" ? "-=" : "+=";
      return emitFormulaAssignment(target, normalizedOp, String(Math.abs(constantNumeric)));
    }
    const valueTokenReferencesRuntimeValue = (() => {
      if (resolveValueType(valueToken)) return false;
      const identifiers = String(valueToken || "").match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
      return identifiers.some((identifier) => !!getRuntimeInfo(identifier));
    })();
    const emitCompoundExpressionStore = (operator) => emitRuntimeStore(target, `${target} ${operator} (${valueToken})`);
    if (!targetType) return null;
    if (targetType === "bcd") {
      if (opToken === "+=") return emitBcdAdd(target, valueToken);
      if (opToken === "-=") return emitBcdSub(target, valueToken);
      return null;
    }
    if (targetType === "u32" || targetType === "i32") {
      if ((opToken === "+=" || opToken === "-=") && isZero) return [];
      if (getRuntimeInfo(target)?.kind !== "fix16_16" && opToken === "+=" && isOne) return emitU32Inc(target);
      if (getRuntimeInfo(target)?.kind !== "fix16_16" && opToken === "-=" && isOne) return emitU32Dec(target);
      if (getRuntimeInfo(target)?.kind === "fix16_16" && opToken === "*=" && isOne) return [];
      if (getRuntimeInfo(target)?.kind === "fix16_16" && opToken === "*=" && isZero) return emitRuntimeStore(target, "0");
      if (getRuntimeInfo(target)?.kind === "fix16_16" && opToken === "/=" && isOne) return [];
      if (opToken === "+=") return emitArith32Op(target, valueToken, "add");
      if (opToken === "-=") return emitArith32Op(target, valueToken, "sub");
      if (getRuntimeInfo(target)?.kind !== "fix16_16" && targetType === "u32" && opToken === "*=") return emitArith32Op(target, valueToken, "mul");
      if (getRuntimeInfo(target)?.kind !== "fix16_16" && targetType === "u32" && opToken === "/=") return emitArith32Op(target, valueToken, "div");
      if (getRuntimeInfo(target)?.kind === "fix16_16" && opToken === "*=") return emitFx16MultiplyOp(target, valueToken);
      if (getRuntimeInfo(target)?.kind === "fix16_16" && opToken === "/=") return emitFx16DivideOp(target, valueToken);
      if (getRuntimeInfo(target)?.kind === "fix16_16" && opToken === "^=") {
        const exponent = constantNumeric ?? parseNumericLiteral(valueToken);
        if (exponent === 1) return [];
        if (exponent !== 2) return null;
        return emitFx16MultiplyOp(target, target);
      }
      return null;
    }
    if (targetType === "fp5") {
      if ((opToken === "+=" || opToken === "-=") && isZero) return [];
      if (opToken === "*=" && isOne) return [];
      if (opToken === "*=" && isZero) return emitRuntimeStore(target, "0");
      if (opToken === "/=" && isOne) return [];
      if (opToken === "+=") return emitFp5ArithOp(target, valueToken, "add");
      if (opToken === "-=") return emitFp5ArithOp(target, valueToken, "sub");
      if (opToken === "*=") return emitFp5MultiplyOp(target, valueToken);
      if (opToken === "/=") return emitFp5DivideOp(target, valueToken);
      if (opToken === "^=") {
        const exponent = constantNumeric ?? parseNumericLiteral(valueToken);
        if (exponent === 1) return [];
        if (exponent !== 2) return null;
        return emitFp5MultiplyOp(target, target);
      }
      return null;
    }
    if (targetType === "int8") {
      const isRecordFieldTarget = String(target).includes(".");
      if ((opToken === "+=" || opToken === "-=") && isZero) return [];
      if (!isRecordFieldTarget && opToken === "+=" && isOne) return emitAdjustByOne(target, "inc");
      if (!isRecordFieldTarget && opToken === "-=" && isOne) return emitAdjustByOne(target, "dec");
      if (opToken === "*=" && isOne) return [];
      if (opToken === "*=" && isZero) return emitRuntimeStore(target, "0");
      if (opToken === "*=" && isTwo) return emitMultiplyByPowerOfTwo(target, 1);
      if (opToken === "*=" && isFour) return emitMultiplyByPowerOfTwo(target, 2);
      if (opToken === "*=" && isEight) return emitMultiplyByPowerOfTwo(target, 3);
      if (opToken === "/=" && isOne) return [];
      if (valueTokenReferencesRuntimeValue && opToken === "+=") return emitCompoundExpressionStore("+");
      if (valueTokenReferencesRuntimeValue && opToken === "-=") return emitCompoundExpressionStore("-");
      if (opToken === "+=") return emitArithInt8Op(target, valueToken, "add");
      if (opToken === "-=") return emitArithInt8Op(target, valueToken, "sub");
      if (opToken === "*=") return emitMultiplyInt8Op(target, valueToken);
      if (opToken === "/=") return emitDivideInt8Op(target, valueToken);
      return null;
    }
    if (targetType === "int16") {
      const isRecordFieldTarget = String(target).includes(".");
      const isFixedTarget = isAnyFixedDeclaredType(targetDeclaredType);
      if ((opToken === "+=" || opToken === "-=") && isZero) return [];
      if (!isRecordFieldTarget && !isFixedTarget && opToken === "+=" && isOne) return emitAdjustByOne(target, "inc");
      if (!isRecordFieldTarget && !isFixedTarget && opToken === "-=" && isOne) return emitAdjustByOne(target, "dec");
      if (opToken === "*=" && isOne) return [];
      if (opToken === "*=" && isZero) return emitRuntimeStore(target, "0");
      if (!isFixedTarget && opToken === "*=" && isTwo) return emitMultiplyByPowerOfTwo(target, 1);
      if (!isFixedTarget && opToken === "*=" && isFour) return emitMultiplyByPowerOfTwo(target, 2);
      if (!isFixedTarget && opToken === "*=" && isEight) return emitMultiplyByPowerOfTwo(target, 3);
      if (valueTokenReferencesRuntimeValue && opToken === "+=") return emitCompoundExpressionStore("+");
      if (valueTokenReferencesRuntimeValue && opToken === "-=") return emitCompoundExpressionStore("-");
      if (opToken === "+=") return emitArithInt16Op(target, valueToken, "add");
      if (opToken === "-=") return emitArithInt16Op(target, valueToken, "sub");
      if (isFixedTarget && opToken === "*=") return emitFixed8_8MultiplyOp(target, valueToken);
      if (isFixedTarget && opToken === "/=") return emitFixed8_8DivideOp(target, valueToken);
      if (isFixedTarget) return null;
      if (opToken === "*=") return emitMultiplyInt16Op(target, valueToken);
      if (opToken === "/=") return emitDivideInt16Op(target, valueToken);
      return null;
    }
    return null;
  }

  return {
    emitLoadUnsignedInt16ValueIntoBC,
    emitU32Add,
    emitU32Sub,
    emitU32Mul,
    emitU32Div,
    emitArith32Op,
    emitFormulaAssignment,
    emitMultiplyInt8Op,
    emitMultiplyInt16Op,
    emitDivideInt8Op,
    emitDivideInt16Op
  };
}
