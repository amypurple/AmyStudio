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
  emitRandomFp5Into,
  emitRandomFp5BetweenInto,
  splitTopLevelArgs,
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
  parseRecordFieldRef,
  emitLoadArrayAddressIntoHL,
  emitU32Inc,
  emitU32Dec,
  ensureCompareScratch32,
  emitStoreExtended32,
  emitStoreMemory32ToTarget,
  emitBcdAdd,
  emitBcdSub
}) {
  function parseRandomCallArgs(valueToken) {
    const match = String(valueToken || "").trim().match(/^random\s*\((.*)\)$/i);
    if (!match) return null;
    const inner = match[1].trim();
    if (!inner) return [];
    return typeof splitTopLevelArgs === "function" ? splitTopLevelArgs(inner) : inner.split(",").map((part) => part.trim());
  }

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

  function stripBalancedOuterParentheses(token) {
    let text = String(token || "").trim();
    while (text.startsWith("(") && text.endsWith(")")) {
      let depth = 0;
      let wrapsWholeExpression = true;
      for (let index = 0; index < text.length; index += 1) {
        if (text[index] === "(") depth += 1;
        else if (text[index] === ")") depth -= 1;
        if (depth === 0 && index < text.length - 1) {
          wrapsWholeExpression = false;
          break;
        }
      }
      if (!wrapsWholeExpression || depth !== 0) break;
      text = text.slice(1, -1).trim();
    }
    return text;
  }

  function splitWideBinaryExpression(valueToken) {
    const text = stripBalancedOuterParentheses(valueToken);
    const candidates = [];
    let depth = 0;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === "(") {
        depth += 1;
        continue;
      }
      if (char === ")") {
        depth -= 1;
        continue;
      }
      if (depth !== 0 || !"+-*/%".includes(char)) continue;
      if ((char === "+" || char === "-") && (index === 0 || "+-*/%(".includes(text[index - 1]))) continue;
      candidates.push({ index, operator: char, precedence: char === "+" || char === "-" ? 1 : 2 });
    }
    if (!candidates.length || depth !== 0) return null;
    const minimumPrecedence = Math.min(...candidates.map((candidate) => candidate.precedence));
    const selected = candidates.filter((candidate) => candidate.precedence === minimumPrecedence).at(-1);
    const left = text.slice(0, selected.index).trim();
    const right = text.slice(selected.index + 1).trim();
    return left && right ? { left, right, operator: selected.operator } : null;
  }

  function emitNegateMemory32(baseLabel) {
    return [
      `    ld hl,${baseLabel}`,
      "    ld a,(hl)",
      "    cpl",
      "    add a,1",
      "    ld (hl),a",
      "    inc hl",
      "    ld a,(hl)",
      "    cpl",
      "    adc a,0",
      "    ld (hl),a",
      "    inc hl",
      "    ld a,(hl)",
      "    cpl",
      "    adc a,0",
      "    ld (hl),a",
      "    inc hl",
      "    ld a,(hl)",
      "    cpl",
      "    adc a,0",
      "    ld (hl),a"
    ];
  }

  function emitCopyU32RemainderToScratch(baseLabel) {
    return [
      "    ld hl,AMY_U32_DIV_REM",
      `    ld de,${baseLabel}`,
      "    ld bc,4",
      "    ldir"
    ];
  }

  function emitZeroMemory32(baseLabel) {
    return [
      "    xor a",
      `    ld (${baseLabel}+0),a`,
      `    ld (${baseLabel}+1),a`,
      `    ld (${baseLabel}+2),a`,
      `    ld (${baseLabel}+3),a`
    ];
  }

  function emitUnsignedModStaged(storeLeft, storeRight, storeTarget) {
    const divide = makeGeneratedLabel("U32ModDivide");
    const done = makeGeneratedLabel("U32ModDone");
    const scratch = ensureCompareScratch32();
    return [
      ...storeLeft,
      ...storeRight,
      `    ld a,(${scratch.rightLabel}+0)`,
      "    ld b,a",
      `    ld a,(${scratch.rightLabel}+1)`,
      "    or b",
      "    ld b,a",
      `    ld a,(${scratch.rightLabel}+2)`,
      "    or b",
      "    ld b,a",
      `    ld a,(${scratch.rightLabel}+3)`,
      "    or b",
      `    jp nz,${divide}`,
      ...emitZeroMemory32(scratch.leftLabel),
      `    jp ${done}`,
      `${divide}:`,
      `    ld hl,${scratch.leftLabel}`,
      `    ld de,${scratch.rightLabel}`,
      "    call AMY_U32_DIV",
      ...emitCopyU32RemainderToScratch(scratch.leftLabel),
      `${done}:`,
      ...storeTarget
    ];
  }

  function emitSignedDivStaged(storeLeft, storeRight, storeTarget, resultKind = "quotient") {
    const leftReady = makeGeneratedLabel("I32DivLeftReady");
    const rightReady = makeGeneratedLabel("I32DivRightReady");
    const done = makeGeneratedLabel("I32DivDone");
    const divide = makeGeneratedLabel("I32DivRun");
    const divided = makeGeneratedLabel("I32DivRan");
    const scratch = ensureCompareScratch32();
    return [
      ...storeLeft,
      ...storeRight,
      `    ld a,(${scratch.leftLabel}+3)`,
      ...(resultKind === "remainder"
        ? ["    and $80"]
        : ["    ld b,a", `    ld a,(${scratch.rightLabel}+3)`, "    xor b", "    and $80"]),
      "    push af",
      `    ld a,(${scratch.leftLabel}+3)`,
      "    or a",
      `    jp p,${leftReady}`,
      ...emitNegateMemory32(scratch.leftLabel),
      `${leftReady}:`,
      `    ld a,(${scratch.rightLabel}+3)`,
      "    or a",
      `    jp p,${rightReady}`,
      ...emitNegateMemory32(scratch.rightLabel),
      `${rightReady}:`,
      ...(resultKind === "remainder" ? [
        `    ld a,(${scratch.rightLabel}+0)`,
        "    ld b,a",
        `    ld a,(${scratch.rightLabel}+1)`,
        "    or b",
        "    ld b,a",
        `    ld a,(${scratch.rightLabel}+2)`,
        "    or b",
        "    ld b,a",
        `    ld a,(${scratch.rightLabel}+3)`,
        "    or b",
        `    jp nz,${divide}`,
        ...emitZeroMemory32(scratch.leftLabel),
        `    jp ${divided}`,
        `${divide}:`
      ] : []),
      `    ld hl,${scratch.leftLabel}`,
      `    ld de,${scratch.rightLabel}`,
      "    call AMY_U32_DIV",
      ...(resultKind === "remainder" ? emitCopyU32RemainderToScratch(scratch.leftLabel) : []),
      ...(resultKind === "remainder" ? [`${divided}:`] : []),
      "    pop af",
      "    or a",
      `    jp z,${done}`,
      ...emitNegateMemory32(scratch.leftLabel),
      `${done}:`,
      ...storeTarget
    ];
  }

  function emitArith32Op(target, valueToken, op) {
    const targetArrayRef = parseArrayRef(target);
    const targetFieldRef = parseRecordFieldRef(target);
    const info = targetArrayRef
      ? getRuntimeInfo(targetArrayRef.name)
      : targetFieldRef
        ? { kind: targetFieldRef.fieldInfo.type, type: targetFieldRef.fieldInfo.type, storage: "qualified" }
        : getRuntimeInfo(target);
    if (!info) return null;
    if (!targetArrayRef && !targetFieldRef && info.kind === "fix16_16") {
      return emitFx16ArithOp(target, valueToken, op);
    }
    if (targetArrayRef) {
      if (info.kind !== "array" || (info.elementType !== "u32" && info.elementType !== "i32")) return null;
    } else if (!targetFieldRef && (info.kind === "array" || (info.kind !== "u32" && info.kind !== "i32"))) {
      return null;
    }
    const valueInfo = getRuntimeInfo(valueToken);
    if (
      valueInfo &&
      valueInfo.storage !== "stack" &&
      info.storage !== "stack" &&
      !targetArrayRef &&
      !targetFieldRef &&
      (valueInfo.kind === "u32" || valueInfo.kind === "i32")
    ) {
      if (op === "add") return emitU32Add(valueToken, target);
      if (op === "sub") return emitU32Sub(valueToken, target);
      if (op === "mul") return emitU32Mul(valueToken, target);
      if (op === "div" && info.kind === "u32") return emitU32Div(valueToken, target);
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
      const wideType = targetArrayRef ? info.elementType : targetFieldRef ? targetFieldRef.fieldInfo.type : info.kind;
      if (wideType === "i32") return emitSignedDivStaged(storeDst, storeSrc, storeTarget);
      return [
        ...storeDst,
        ...storeSrc,
        `    ld hl,${scratch.leftLabel}`,
        `    ld de,${scratch.rightLabel}`,
        "    call AMY_U32_DIV",
        ...storeTarget
      ];
    }
    if (op === "mod") {
      const wideType = targetArrayRef ? info.elementType : targetFieldRef ? targetFieldRef.fieldInfo.type : info.kind;
      if (wideType === "i32") return emitSignedDivStaged(storeDst, storeSrc, storeTarget, "remainder");
      return emitUnsignedModStaged(storeDst, storeSrc, storeTarget);
    }
    if (op === "and" || op === "or" || op === "xor") {
      const instruction = op;
      const lines = [...storeDst, ...storeSrc];
      for (let offset = 0; offset < 4; offset += 1) {
        lines.push(
          `    ld a,(${scratch.rightLabel}+${offset})`,
          "    ld b,a",
          `    ld a,(${scratch.leftLabel}+${offset})`,
          `    ${instruction} b`,
          `    ld (${scratch.leftLabel}+${offset}),a`
        );
      }
      return [...lines, ...storeTarget];
    }
    return null;
  }

  function emitNot32(target, valueToken) {
    const scratch = ensureCompareScratch32();
    const storeValue = emitStoreExtended32(valueToken, scratch.leftLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
    if (!storeValue || !storeTarget) return null;
    const lines = [...storeValue];
    for (let offset = 0; offset < 4; offset += 1) {
      lines.push(
        `    ld a,(${scratch.leftLabel}+${offset})`,
        "    cpl",
        `    ld (${scratch.leftLabel}+${offset}),a`
      );
    }
    return [...lines, ...storeTarget];
  }

  function emitShift32(target, valueToken, countToken, direction, signedRight = false) {
    const countValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(countToken)
      : null;
    if (Number.isInteger(countValue) && (countValue < 0 || countValue > 255)) return null;
    if (countValue === null) {
      const countType = resolveValueType(countToken);
      const countDeclared = normalizeDeclaredType(resolveDeclaredValueType(countToken));
      if (countType !== "int8" || isSignedDeclaredType(countDeclared)) return null;
    }
    const scratch = ensureCompareScratch32();
    const storeValue = emitStoreExtended32(valueToken, scratch.leftLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
    if (!storeValue || !storeTarget) return null;
    const shiftLoop = makeGeneratedLabel("Shift32Loop");
    const countReady = makeGeneratedLabel("Shift32CountReady");
    const done = makeGeneratedLabel("Shift32Done");
    const loadCount = Number.isInteger(countValue)
      ? [`    ld a,${Math.min(countValue, 32)}`]
      : [
          ...emitLoadInt8Into("a", countToken),
          "    cp 33",
          `    jr c,${countReady}`,
          "    ld a,32",
          `${countReady}:`
        ];
    const oneShift = direction === "left"
      ? [
          `    ld hl,${scratch.leftLabel}`,
          "    sla (hl)",
          "    inc hl",
          "    rl (hl)",
          "    inc hl",
          "    rl (hl)",
          "    inc hl",
          "    rl (hl)"
        ]
      : [
          `    ld hl,${scratch.leftLabel}+3`,
          `    ${signedRight ? "sra" : "srl"} (hl)`,
          "    dec hl",
          "    rr (hl)",
          "    dec hl",
          "    rr (hl)",
          "    dec hl",
          "    rr (hl)"
        ];
    return [
      ...storeValue,
      ...loadCount,
      "    or a",
      `    jr z,${done}`,
      "    ld b,a",
      `${shiftLoop}:`,
      ...oneShift,
      `    djnz ${shiftLoop}`,
      `${done}:`,
      ...storeTarget
    ];
  }

  function emitShift16(target, valueToken, countToken, direction, signedRight = false) {
    const countValue = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(countToken)
      : null;
    if (Number.isInteger(countValue)) {
      if (countValue < 0 || countValue > 255) return null;
    } else {
      const countType = resolveValueType(countToken);
      const countDeclared = normalizeDeclaredType(resolveDeclaredValueType(countToken));
      if (countType !== "int8" || isSignedDeclaredType(countDeclared)) return null;
    }
    const loadValue = emitLoadInt16IntoHL(valueToken);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadValue || !storeTarget) return null;
    const shiftLoop = makeGeneratedLabel("Shift16Loop");
    const countReady = makeGeneratedLabel("Shift16CountReady");
    const done = makeGeneratedLabel("Shift16Done");
    const loadCount = Number.isInteger(countValue)
      ? [`    ld a,${Math.min(countValue, 16)}`]
      : [
          ...emitLoadInt8Into("a", countToken),
          "    cp 17",
          `    jr c,${countReady}`,
          "    ld a,16",
          `${countReady}:`
        ];
    const oneShift = direction === "left"
      ? ["    add hl,hl"]
      : signedRight
        ? ["    sra h", "    rr l"]
        : ["    srl h", "    rr l"];
    return [
      ...loadValue,
      "    push hl",
      ...loadCount,
      "    ld b,a",
      "    pop hl",
      "    or a",
      `    jr z,${done}`,
      `${shiftLoop}:`,
      ...oneShift,
      `    djnz ${shiftLoop}`,
      `${done}:`,
      ...storeTarget
    ];
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
      `    call ${targetDeclared === "ufix8_8" ? "AMY_UFX8_8_MUL" : "AMY_FX8_8_MUL"}`,
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
      `    call ${targetDeclared === "ufix8_8" ? "AMY_UFX8_8_DIV" : "AMY_FX8_8_DIV"}`,
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
      if (info.isRef) {
        return [
          `    ld l,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
          `    ld h,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`,
          `    ${op} (hl)`
        ];
      }
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
      if (info.isRef) {
        const doneLabel = makeGeneratedLabel("WordDone");
        const loadPointer = [
          `    ld l,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
          `    ld h,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`
        ];
        if (op === "inc") {
          return [
            ...loadPointer,
            "    inc (hl)",
            `    jr nz,${doneLabel}`,
            "    inc hl",
            "    inc (hl)",
            `${doneLabel}:`
          ];
        }
        return [
          ...loadPointer,
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
      if (info.isRef) {
        return [
          `    ld l,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
          `    ld h,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`,
          ...Array.from({ length: shiftCount }, () => "    sla (hl)")
        ];
      }
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
      if (info.isRef) {
        const lines = [
          `    ld l,(ix${info.offset < 0 ? info.offset : `+${info.offset}`})`,
          `    ld h,(ix${info.offset + 1 < 0 ? info.offset + 1 : `+${info.offset + 1}`})`
        ];
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

  function emitStoreWideExpression(valueToken, destinationLabel, targetType) {
    if (targetType !== "u32" && targetType !== "i32") return null;
    const isCompatibleOperand = (token) => {
      if (resolveValueType(token) === targetType) return true;
      if (resolveValueType(token)) return false;
      const numeric = parseNumericLiteral(token);
      if (!Number.isInteger(numeric)) return false;
      return targetType === "u32"
        ? numeric >= 0 && numeric <= 0xFFFFFFFF
        : numeric >= -0x80000000 && numeric <= 0x7FFFFFFF;
    };
    const binary = splitWideBinaryExpression(valueToken);
    if (!binary) return null;
    const left = stripBalancedOuterParentheses(binary.left);
    const right = stripBalancedOuterParentheses(binary.right);
    const leftIsExpression = !!splitWideBinaryExpression(left);
    const rightIsExpression = !!splitWideBinaryExpression(right);
    if ((!leftIsExpression && !isCompatibleOperand(left)) || (!rightIsExpression && !isCompatibleOperand(right))) return null;
    const scratch = ensureCompareScratch32();
    const storeLeft = leftIsExpression
      ? emitStoreWideExpression(left, scratch.leftLabel, targetType)
      : emitStoreExtended32(left, scratch.leftLabel, true, targetType);
    const storeRight = rightIsExpression
      ? emitStoreWideExpression(right, scratch.rightLabel, targetType)
      : emitStoreExtended32(right, scratch.rightLabel, true, targetType);
    if (!storeLeft || !storeRight) return null;
    const rightClobbersLeft = storeRight.some((line) => String(line).includes(scratch.leftLabel));
    const preserveLeft = rightClobbersLeft ? [
      `    ld hl,(${scratch.leftLabel}+0)`,
      "    push hl",
      `    ld hl,(${scratch.leftLabel}+2)`,
      "    push hl"
    ] : [];
    const restoreLeft = rightClobbersLeft ? [
      "    pop hl",
      `    ld (${scratch.leftLabel}+2),hl`,
      "    pop hl",
      `    ld (${scratch.leftLabel}+0),hl`
    ] : [];
    const storeResult = destinationLabel === scratch.leftLabel
      ? []
      : [
          `    ld hl,${scratch.leftLabel}`,
          `    ld de,${destinationLabel}`,
          "    ld bc,4",
          "    ldir"
        ];
    const stagedLeft = [...storeLeft, ...preserveLeft];
    const stagedRight = [...storeRight, ...restoreLeft];
    if (binary.operator === "/" && targetType === "i32") {
      return emitSignedDivStaged(stagedLeft, stagedRight, storeResult);
    }
    if (binary.operator === "%") {
      if (targetType === "i32") return emitSignedDivStaged(stagedLeft, stagedRight, storeResult, "remainder");
      return emitUnsignedModStaged(stagedLeft, stagedRight, storeResult);
    }
    return [
      ...stagedLeft,
      ...stagedRight,
      `    ld hl,${scratch.leftLabel}`,
      `    ld de,${scratch.rightLabel}`,
      `    call ${binary.operator === "+" ? "AMY_U32_ADD" : binary.operator === "-" ? "AMY_U32_SUB" : binary.operator === "*" ? "AMY_U32_MUL" : "AMY_U32_DIV"}`,
      ...storeResult
    ];
  }

  function emitFormulaAssignment(target, opToken, valueToken) {
    const targetType = resolveValueType(target);
    if (opToken === "=") {
      if (targetType === "int16") {
        const shift = String(valueToken || "").trim().match(/^(.+?)\s*(<<|>>)\s*(.+)$/);
        if (shift) {
          const targetDeclared = normalizeDeclaredType(resolveDeclaredValueType(target));
          const sourceDeclared = normalizeDeclaredType(resolveDeclaredValueType(shift[1].trim()));
          const sourceType = resolveValueType(shift[1].trim());
          const numeric = sourceType ? null : parseNumericLiteral(shift[1].trim());
          const targetSigned = isSignedDeclaredType(targetDeclared);
          const sourceCompatible = sourceType === "int16"
            ? isSignedDeclaredType(sourceDeclared) === targetSigned
            : Number.isInteger(numeric) && (targetSigned
              ? numeric >= -0x8000 && numeric <= 0x7FFF
              : numeric >= 0 && numeric <= 0xFFFF);
          if (sourceCompatible) {
            return emitShift16(target, shift[1].trim(), shift[3].trim(), shift[2] === "<<" ? "left" : "right", targetSigned && shift[2] === ">>");
          }
        }
      }
      if (targetType === "u32" || targetType === "i32") {
        const scratch = ensureCompareScratch32();
        const storeExpression = emitStoreWideExpression(valueToken, scratch.leftLabel, targetType);
        const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
        if (storeExpression && storeTarget) return [...storeExpression, ...storeTarget];
        const isCompatibleWideOperand = (token) => {
          if (resolveValueType(token) === targetType) return true;
          if (resolveValueType(token)) return false;
          const numeric = parseNumericLiteral(token);
          if (!Number.isInteger(numeric)) return false;
          return targetType === "u32"
            ? numeric >= 0 && numeric <= 0xFFFFFFFF
            : numeric >= -0x80000000 && numeric <= 0x7FFFFFFF;
        };
        const wideText = String(valueToken || "").trim();
        const unaryNot = wideText.match(/^~\s*(.+)$/);
        if (unaryNot && isCompatibleWideOperand(unaryNot[1].trim())) {
          return emitNot32(target, unaryNot[1].trim());
        }
        const shift = wideText.match(/^(.+?)\s*(<<|>>)\s*(.+)$/);
        if (shift && isCompatibleWideOperand(shift[1].trim())) {
          return emitShift32(target, shift[1].trim(), shift[3].trim(), shift[2] === "<<" ? "left" : "right", targetType === "i32" && shift[2] === ">>");
        }
        const bitwise = wideText.match(/^(.+?)\s*(&|\||\^)\s*(.+)$/);
        if (bitwise && isCompatibleWideOperand(bitwise[1].trim()) && isCompatibleWideOperand(bitwise[3].trim())) {
          const scratch = ensureCompareScratch32();
          const storeLeft = emitStoreExtended32(bitwise[1].trim(), scratch.leftLabel);
          const storeRight = emitStoreExtended32(bitwise[3].trim(), scratch.rightLabel);
          const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
          if (!storeLeft || !storeRight || !storeTarget) return null;
          const instruction = bitwise[2] === "&" ? "and" : bitwise[2] === "|" ? "or" : "xor";
          const lines = [...storeLeft, ...storeRight];
          for (let offset = 0; offset < 4; offset += 1) {
            lines.push(
              `    ld a,(${scratch.rightLabel}+${offset})`,
              "    ld b,a",
              `    ld a,(${scratch.leftLabel}+${offset})`,
              `    ${instruction} b`,
              `    ld (${scratch.leftLabel}+${offset}),a`
            );
          }
          return [...lines, ...storeTarget];
        }
        const binary = wideText.match(/^(.+?)\s*([+*\/%-])\s*(.+)$/);
        if (binary) {
          const left = binary[1].trim();
          const right = binary[3].trim();
          if (isCompatibleWideOperand(left) && isCompatibleWideOperand(right)) {
            const scratch = ensureCompareScratch32();
            const storeLeft = emitStoreExtended32(left, scratch.leftLabel);
            const storeRight = emitStoreExtended32(right, scratch.rightLabel);
            const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
            if (!storeLeft || !storeRight || !storeTarget) return null;
            if (binary[2] === "/" && targetType === "i32") {
              return emitSignedDivStaged(storeLeft, storeRight, storeTarget);
            }
            if (binary[2] === "%") {
              if (targetType === "i32") return emitSignedDivStaged(storeLeft, storeRight, storeTarget, "remainder");
              return emitUnsignedModStaged(storeLeft, storeRight, storeTarget);
            }
            return [
              ...storeLeft,
              ...storeRight,
              `    ld hl,${scratch.leftLabel}`,
              `    ld de,${scratch.rightLabel}`,
              `    call ${binary[2] === "+" ? "AMY_U32_ADD" : binary[2] === "-" ? "AMY_U32_SUB" : binary[2] === "*" ? "AMY_U32_MUL" : "AMY_U32_DIV"}`,
              ...storeTarget
            ];
          }
        }
      }
      const shiftHighByte = String(valueToken || "").trim().match(/^(.+)\s*<<\s*8$/);
      if (targetType === "int16" && shiftHighByte) {
        const targetInfo = getRuntimeInfo(target);
        const sourceToken = shiftHighByte[1].trim();
        const sourceDeclared = normalizeDeclaredType(resolveDeclaredValueType(sourceToken));
        const targetAsm = targetInfo?.asmName || (targetInfo ? symbolOrValue(target) : null);
        const sourceIsUnsignedByte = sourceDeclared === "u8" || sourceDeclared === "byte" || sourceDeclared === "bool" || sourceDeclared === "boolean";
        if (targetAsm && targetInfo?.type === "int16" && targetInfo.storage !== "stack" && sourceIsUnsignedByte) {
          const loadA = emitLoadInt8Into("a", sourceToken);
          if (loadA) {
            return [
              ...loadA,
              "    ld h,a",
              "    ld l,0",
              `    ld (${targetAsm}),hl`
            ];
          }
        }
      }
      const randomArgs = parseRandomCallArgs(valueToken);
      if (targetType === "fp5" && randomArgs?.length === 0 && typeof emitRandomFp5Into === "function") {
        const randomStore = emitRandomFp5Into(target);
        if (randomStore) return randomStore;
      }
      if (targetType === "fp5" && randomArgs && randomArgs.length === 2 && typeof emitRandomFp5BetweenInto === "function") {
        const randomStore = emitRandomFp5BetweenInto(randomArgs[0], randomArgs[1], target);
        if (randomStore) return randomStore;
      }
      return emitRuntimeStore(target, valueToken);
    }
    if (opToken === "%=") {
      if (targetType === "u32" || targetType === "i32") return emitArith32Op(target, valueToken, "mod");
      return emitRuntimeStore(target, `${target} % (${valueToken})`);
    }
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
      if (parseArrayRef(valueToken)) return true;
      if (resolveValueType(valueToken)) return false;
      const identifiers = String(valueToken || "").match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
      return identifiers.some((identifier) => !!getRuntimeInfo(identifier));
    })();
    const emitCompoundExpressionStore = (operator) => emitRuntimeStore(target, `${target} ${operator} (${valueToken})`);
    if (!targetType) return null;
    if ((opToken === "&=" || opToken === "|=" || opToken === "^=")
      && (targetType === "int8" || targetType === "int16" || targetType === "u32" || targetType === "i32")) {
      const operator = opToken === "&=" ? "and" : opToken === "|=" ? "or" : "xor";
      if (targetType === "int8") return emitArithInt8Op(target, valueToken, operator);
      if (targetType === "int16") return emitRuntimeStore(target, `${target} ${opToken[0]} (${valueToken})`);
      if (targetType === "u32" || targetType === "i32") return emitArith32Op(target, valueToken, operator);
    }
    if (targetType === "int16" && (opToken === "<<=" || opToken === ">>=")) {
      const targetDeclared = normalizeDeclaredType(resolveDeclaredValueType(target));
      return emitShift16(target, target, valueToken, opToken === "<<=" ? "left" : "right", isSignedDeclaredType(targetDeclared) && opToken === ">>=");
    }
    if (targetType === "bcd") {
      if (opToken === "+=") return emitBcdAdd(target, valueToken);
      if (opToken === "-=") return emitBcdSub(target, valueToken);
      return null;
    }
    if (targetType === "u32" || targetType === "i32") {
      const isFixed32Target = targetDeclaredType === "fix16_16";
      if ((opToken === "+=" || opToken === "-=") && isZero) return [];
      if (!isFixed32Target && opToken === "+=" && isOne) return emitU32Inc(target);
      if (isFixed32Target && opToken === "*=" && isOne) return [];
      if (isFixed32Target && opToken === "*=" && isZero) return emitRuntimeStore(target, "0");
      if (isFixed32Target && opToken === "/=" && isOne) return [];
      if (opToken === "+=") return isFixed32Target ? emitFx16ArithOp(target, valueToken, "add") : emitArith32Op(target, valueToken, "add");
      if (opToken === "-=") return isFixed32Target ? emitFx16ArithOp(target, valueToken, "sub") : emitArith32Op(target, valueToken, "sub");
      if (opToken === "<<=" || opToken === ">>=") return emitShift32(target, target, valueToken, opToken === "<<=" ? "left" : "right", targetType === "i32" && opToken === ">>=");
      if (!isFixed32Target && opToken === "*=") return emitArith32Op(target, valueToken, "mul");
      if (!isFixed32Target && opToken === "/=") return emitArith32Op(target, valueToken, "div");
      if (isFixed32Target && opToken === "*=") return emitFx16MultiplyOp(target, valueToken);
      if (isFixed32Target && opToken === "/=") return emitFx16DivideOp(target, valueToken);
      if (isFixed32Target && opToken === "^=") {
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
    emitStoreWideExpression,
    emitFormulaAssignment,
    emitMultiplyInt8Op,
    emitMultiplyInt16Op,
    emitDivideInt8Op,
    emitDivideInt16Op
  };
}
