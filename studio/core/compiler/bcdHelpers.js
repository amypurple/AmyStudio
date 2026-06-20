export function createBcdHelpers(ctx) {
  const {
    getRuntimeInfo,
    formatIxOffset,
    scopedRuntimeName,
    parseNumericLiteral,
    makeGeneratedLabel,
    emitLoadInt8Into,
    isSignedDeclaredType,
    resolveDeclaredValueType,
    emitLoadArrayAddressIntoHL,
    emitLoadInt8ValueInto,
    symbolOrValue,
    tryEvaluateCompileTimeNumericExpression
  } = ctx;

  function decimalToBcdBytes(n, byteCount) {
    const bytes = [];
    let remaining = Math.floor(n);
    for (let i = 0; i < byteCount; i++) {
      const twoDigits = remaining % 100;
      bytes.push((Math.floor(twoDigits / 10) << 4) | (twoDigits % 10));
      remaining = Math.floor(remaining / 100);
    }
    return bytes;
  }

  function getBcdDigitCount(info) {
    if (!info || info.kind !== "bcd") return null;
    return Number.isInteger(info.digitCount) ? info.digitCount : info.byteCount * 2;
  }

  function doesDecimalFitBcdDigits(value, digitCount) {
    if (!Number.isFinite(value) || value < 0) return false;
    if (!Number.isInteger(digitCount) || digitCount < 1) return false;
    return String(Math.floor(value)).length <= digitCount;
  }

  function emitLoadBcdInt8IntoA(varName, byteIndex) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    if (info.storage === "stack") return [`    ld a,(${formatIxOffset(info.offset + byteIndex)})`];
    const resolvedName = scopedRuntimeName(varName);
    const src = byteIndex === 0 ? resolvedName : `${resolvedName}+${byteIndex}`;
    return [`    ld a,(${src})`];
  }

  function emitStoreAToBcdInt8(varName, byteIndex) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    if (info.storage === "stack") return [`    ld (${formatIxOffset(info.offset + byteIndex)}),a`];
    const resolvedName = scopedRuntimeName(varName);
    const dst = byteIndex === 0 ? resolvedName : `${resolvedName}+${byteIndex}`;
    return [`    ld (${dst}),a`];
  }

  function emitBcdNormalize(varName) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const digitCount = getBcdDigitCount(info);
    if (digitCount % 2 === 0) return [];
    const msbIndex = info.byteCount - 1;
    const loadMsb = emitLoadBcdInt8IntoA(varName, msbIndex);
    const storeMsb = emitStoreAToBcdInt8(varName, msbIndex);
    if (!loadMsb || !storeMsb) return null;
    return [...loadMsb, "    and $0F", ...storeMsb];
  }

  function emitBcdAddOne(varName) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const lines = ["    or a"];
    for (let i = 0; i < info.byteCount; i++) {
      const loadDst = emitLoadBcdInt8IntoA(varName, i);
      const storeDst = emitStoreAToBcdInt8(varName, i);
      if (!loadDst || !storeDst) return null;
      lines.push(...loadDst);
      lines.push(`    ${i === 0 ? "add a,$01" : "adc a,$00"}`);
      lines.push("    daa");
      lines.push(...storeDst);
    }
    const normalize = emitBcdNormalize(varName);
    if (!normalize) return null;
    lines.push(...normalize);
    return lines;
  }

  function emitBcdSubOne(varName) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const lines = ["    or a"];
    for (let i = 0; i < info.byteCount; i++) {
      const loadDst = emitLoadBcdInt8IntoA(varName, i);
      const storeDst = emitStoreAToBcdInt8(varName, i);
      if (!loadDst || !storeDst) return null;
      lines.push(...loadDst);
      lines.push(`    ${i === 0 ? "sub $01" : "sbc a,$00"}`);
      lines.push("    daa");
      lines.push(...storeDst);
    }
    const subDone = makeGeneratedLabel("BcdSubDone");
    lines.push(`    jr nc,${subDone}`);
    lines.push("    xor a");
    for (let i = 0; i < info.byteCount; i++) {
      const storeDst = emitStoreAToBcdInt8(varName, i);
      if (!storeDst) return null;
      lines.push(...storeDst);
    }
    lines.push(`${subDone}:`);
    const normalize = emitBcdNormalize(varName);
    if (!normalize) return null;
    lines.push(...normalize);
    return lines;
  }

  function emitBcdAdjustByInt8(varName, valueToken, op) {
    const valueInfo = getRuntimeInfo(valueToken);
    if (!valueInfo || valueInfo.kind === "array" || valueInfo.type !== "int8") return null;
    const loadCount = emitLoadInt8Into("a", valueToken);
    if (!loadCount) return null;
    const signedValue = isSignedDeclaredType(resolveDeclaredValueType(valueToken));
    const positiveLoop = makeGeneratedLabel("BcdAdjPosLoop");
    const negativeLoop = makeGeneratedLabel("BcdAdjNegLoop");
    const positiveStart = makeGeneratedLabel("BcdAdjPos");
    const done = makeGeneratedLabel("BcdAdjDone");
    const positiveBody = op === "add" ? emitBcdAddOne(varName) : emitBcdSubOne(varName);
    const negativeBody = op === "add" ? emitBcdSubOne(varName) : emitBcdAddOne(varName);
    if (!positiveBody || !negativeBody) return null;
    const lines = [...loadCount, "    ld b,a", "    ld a,b", "    or a", `    jr z,${done}`];
    if (signedValue) {
      lines.push("    bit 7,a", `    jr z,${positiveStart}`, "    neg", "    ld b,a");
      lines.push(`${negativeLoop}:`, ...negativeBody, `    djnz ${negativeLoop}`, `    jr ${done}`);
    }
    lines.push(`${positiveStart}:`, `${positiveLoop}:`, ...positiveBody, `    djnz ${positiveLoop}`);
    lines.push(`${done}:`);
    return lines;
  }

  function emitBcdAdd(varName, valueToken) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const { byteCount } = info;
    const digitCount = getBcdDigitCount(info);
    const valueInfo = getRuntimeInfo(valueToken);
    if (valueInfo) {
      if (valueInfo.kind !== "array" && valueInfo.type === "int8") {
        return emitBcdAdjustByInt8(varName, valueToken, "add");
      }
      if (valueInfo.kind !== "bcd" || getBcdDigitCount(valueInfo) !== digitCount) return null;
      const lines = ["    or a"];
      for (let i = 0; i < byteCount; i++) {
        const loadSrc = emitLoadBcdInt8IntoA(valueToken, i);
        const loadDst = emitLoadBcdInt8IntoA(varName, i);
        const storeDst = emitStoreAToBcdInt8(varName, i);
        if (!loadSrc || !loadDst || !storeDst) return null;
        lines.push(...loadSrc);
        lines.push("    ld b,a");
        lines.push(...loadDst);
        lines.push(`    ${i === 0 ? "add a,b" : "adc a,b"}`);
        lines.push("    daa");
        lines.push(...storeDst);
      }
      const normalize = emitBcdNormalize(varName);
      if (!normalize) return null;
      lines.push(...normalize);
      return lines;
    }
    const numeric = parseNumericLiteral(valueToken) ?? tryEvaluateCompileTimeNumericExpression?.(valueToken);
    if (numeric === null || numeric === undefined) return null;
    if (numeric < 0) return emitBcdSub(varName, String(Math.abs(numeric)));
    if (!doesDecimalFitBcdDigits(numeric, digitCount)) return null;
    const bcdBytes = decimalToBcdBytes(numeric, byteCount);
    const lines = ["    or a"];
    for (let i = 0; i < byteCount; i++) {
      const loadDst = emitLoadBcdInt8IntoA(varName, i);
      const storeDst = emitStoreAToBcdInt8(varName, i);
      if (!loadDst || !storeDst) return null;
      const bv = `$${bcdBytes[i].toString(16).toUpperCase().padStart(2, "0")}`;
      lines.push(...loadDst);
      lines.push(`    ${i === 0 ? `add a,${bv}` : `adc a,${bv}`}`);
      lines.push("    daa");
      lines.push(...storeDst);
    }
    const normalize = emitBcdNormalize(varName);
    if (!normalize) return null;
    lines.push(...normalize);
    return lines;
  }

  function emitBcdSub(varName, valueToken) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const { byteCount } = info;
    const digitCount = getBcdDigitCount(info);
    const valueInfo = getRuntimeInfo(valueToken);
    let lines = null;
    if (valueInfo) {
      if (valueInfo.kind !== "array" && valueInfo.type === "int8") {
        return emitBcdAdjustByInt8(varName, valueToken, "sub");
      }
      lines = ["    or a"];
      if (valueInfo.kind !== "bcd" || getBcdDigitCount(valueInfo) !== digitCount) return null;
      for (let i = 0; i < byteCount; i++) {
        const loadSrc = emitLoadBcdInt8IntoA(valueToken, i);
        const loadDst = emitLoadBcdInt8IntoA(varName, i);
        const storeDst = emitStoreAToBcdInt8(varName, i);
        if (!loadSrc || !loadDst || !storeDst) return null;
        lines.push(...loadSrc);
        lines.push("    ld b,a");
        lines.push(...loadDst);
        lines.push(`    ${i === 0 ? "sub b" : "sbc a,b"}`);
        lines.push("    daa");
        lines.push(...storeDst);
      }
    } else {
      const numeric = parseNumericLiteral(valueToken) ?? tryEvaluateCompileTimeNumericExpression?.(valueToken);
      if (numeric === null || numeric === undefined) return null;
      if (numeric < 0) return emitBcdAdd(varName, String(Math.abs(numeric)));
      if (!doesDecimalFitBcdDigits(numeric, digitCount)) return null;
      const bcdBytes = decimalToBcdBytes(numeric, byteCount);
      lines = ["    or a"];
      for (let i = 0; i < byteCount; i++) {
        const loadDst = emitLoadBcdInt8IntoA(varName, i);
        const storeDst = emitStoreAToBcdInt8(varName, i);
        if (!loadDst || !storeDst) return null;
        const bv = `$${bcdBytes[i].toString(16).toUpperCase().padStart(2, "0")}`;
        lines.push(...loadDst);
        lines.push(`    ${i === 0 ? `sub ${bv}` : `sbc a,${bv}`}`);
        lines.push("    daa");
        lines.push(...storeDst);
      }
    }
    const subDone = makeGeneratedLabel("BcdSubDone");
    lines.push(`    jr nc,${subDone}`);
    lines.push("    xor a");
    for (let i = 0; i < byteCount; i++) {
      const storeDst = emitStoreAToBcdInt8(varName, i);
      if (!storeDst) return null;
      lines.push(...storeDst);
    }
    lines.push(`${subDone}:`);
    const normalize = emitBcdNormalize(varName);
    if (!normalize) return null;
    lines.push(...normalize);
    return lines;
  }

  function emitBcdClear(varName) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const { byteCount } = info;
    const lines = ["    xor a"];
    for (let i = 0; i < byteCount; i++) {
      const storeDst = emitStoreAToBcdInt8(varName, i);
      if (!storeDst) return null;
      lines.push(...storeDst);
    }
    return lines;
  }

  function emitBcdPrint(varName, xToken, yToken, tileOffsetToken) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const { byteCount } = info;
    const digitCount = getBcdDigitCount(info);
    const oddDigits = digitCount % 2 === 1;
    const loadY = emitLoadInt8Into("d", yToken);
    const loadX = emitLoadInt8Into("e", xToken);
    if (!loadY || !loadX) return null;
    const offset = tileOffsetToken ? symbolOrValue(tileOffsetToken) : "$30";
    const lines = [];
    let col = 0;
    for (let i = byteCount - 1; i >= 0; i--) {
      const loadSrc = emitLoadBcdInt8IntoA(varName, i);
      if (!loadSrc) return null;
      if (!(oddDigits && i === byteCount - 1)) {
        lines.push(...loadY, ...loadX);
        for (let j = 0; j < col; j++) lines.push("    inc e");
        lines.push(...loadSrc);
        lines.push("    rrca", "    rrca", "    rrca", "    rrca", "    and $0F");
        lines.push(`    add a,${offset}`);
        lines.push("    call AMY_PUT_CHAR_AT");
        col += 1;
      }
      lines.push(...loadY, ...loadX);
      for (let j = 0; j < col; j++) lines.push("    inc e");
      lines.push(...loadSrc);
      lines.push("    and $0F");
      lines.push(`    add a,${offset}`);
      lines.push("    call AMY_PUT_CHAR_AT");
      col += 1;
    }
    return lines;
  }

  function emitFormatBcdIntoBuffer(varName, bufferToken) {
    const info = getRuntimeInfo(varName);
    if (!info || info.kind !== "bcd") return null;
    const digits = getBcdDigitCount(info);
    const oddDigits = digits % 2 === 1;
    const bufferInfo = ctx.getByteArrayBufferInfo(bufferToken, digits);
    if (!bufferInfo) return null;
    const loadDest = emitLoadArrayAddressIntoHL(bufferToken, "0");
    if (!loadDest) return null;
    const lines = [...loadDest];
    for (let i = info.byteCount - 1; i >= 0; i--) {
      const loadSrc = emitLoadBcdInt8IntoA(varName, i);
      if (!loadSrc) return null;
      if (!(oddDigits && i === info.byteCount - 1)) {
        lines.push(...loadSrc);
        lines.push("    rrca", "    rrca", "    rrca", "    rrca", "    and $0F");
        lines.push("    add a,$30");
        lines.push("    ld (hl),a");
        lines.push("    inc hl");
      }
      lines.push(...loadSrc);
      lines.push("    and $0F");
      lines.push("    add a,$30");
      lines.push("    ld (hl),a");
      lines.push("    inc hl");
    }
    return lines;
  }

  function emitBcdCopy(sourceName, targetName) {
    const sourceInfo = getRuntimeInfo(sourceName);
    const targetInfo = getRuntimeInfo(targetName);
    if (!sourceInfo || !targetInfo || sourceInfo.kind !== "bcd" || targetInfo.kind !== "bcd") return null;
    if (getBcdDigitCount(sourceInfo) !== getBcdDigitCount(targetInfo)) return null;
    const lines = [];
    for (let i = 0; i < sourceInfo.byteCount; i++) {
      const loadSrc = emitLoadBcdInt8IntoA(sourceName, i);
      const storeDst = emitStoreAToBcdInt8(targetName, i);
      if (!loadSrc || !storeDst) return null;
      lines.push(...loadSrc, ...storeDst);
    }
    const normalize = emitBcdNormalize(targetName);
    if (!normalize) return null;
    lines.push(...normalize);
    return lines;
  }

  function emitBcdStore(targetName, valueToken) {
    const targetInfo = getRuntimeInfo(targetName);
    if (!targetInfo || targetInfo.kind !== "bcd") return null;

    const sourceInfo = getRuntimeInfo(valueToken);
    if (sourceInfo?.kind === "bcd") {
      if (getBcdDigitCount(sourceInfo) !== getBcdDigitCount(targetInfo)) return null;
      return emitBcdCopy(valueToken, targetName);
    }

    if (sourceInfo && sourceInfo.kind !== "array" && sourceInfo.type === "int8") {
      const lines = emitBcdClear(targetName);
      const addLines = emitBcdAdjustByInt8(targetName, valueToken, "add");
      if (!lines || !addLines) return null;
      return [...lines, ...addLines];
    }

    const constantValue = /^[0-9]+$/.test(valueToken)
      ? Number.parseInt(valueToken, 10)
      : (tryEvaluateCompileTimeNumericExpression ? tryEvaluateCompileTimeNumericExpression(valueToken) : null);
    if (!Number.isInteger(constantValue) || constantValue < 0) return null;
    if (!doesDecimalFitBcdDigits(constantValue, getBcdDigitCount(targetInfo))) return null;
    const bcdBytes = decimalToBcdBytes(constantValue, targetInfo.byteCount);
    const lines = [];
    for (let i = 0; i < targetInfo.byteCount; i++) {
      const storeDst = emitStoreAToBcdInt8(targetName, i);
      if (!storeDst) return null;
      const bv = `$${bcdBytes[i].toString(16).toUpperCase().padStart(2, "0")}`;
      lines.push(`    ld a,${bv}`);
      lines.push(...storeDst);
    }
    const normalize = emitBcdNormalize(targetName);
    if (!normalize) return null;
    lines.push(...normalize);
    return lines;
  }

  function emitBcdCompareGoto(leftToken, operator, rightToken, asmLabel) {
    const flipOperator = (op) => {
      switch (op) {
        case "<": return ">";
        case "<=": return ">=";
        case ">": return "<";
        case ">=": return "<=";
        default: return op;
      }
    };
    const leftInfo = getRuntimeInfo(leftToken);
    const rightInfo = getRuntimeInfo(rightToken);
    if (leftInfo?.kind !== "bcd" && rightInfo?.kind !== "bcd") return null;
    if (leftInfo?.kind !== "bcd" && rightInfo?.kind === "bcd" && /^[0-9]+$/.test(leftToken)) {
      return emitBcdCompareGoto(rightToken, flipOperator(operator), leftToken, asmLabel);
    }
    if (!leftInfo || leftInfo.kind !== "bcd") return null;
    const byteCount = leftInfo.byteCount;
    const digitCount = getBcdDigitCount(leftInfo);
    const oddDigits = digitCount % 2 === 1;
    let rightAsm = null;
    let rightLiteralBytes = null;
    if (rightInfo?.kind === "bcd") {
      if (getBcdDigitCount(rightInfo) !== digitCount) return null;
      rightAsm = rightToken;
    } else if (/^[0-9]+$/.test(rightToken)) {
      if (!doesDecimalFitBcdDigits(Number.parseInt(rightToken, 10), digitCount)) return null;
      rightLiteralBytes = decimalToBcdBytes(Number.parseInt(rightToken, 10), byteCount);
    } else {
      const resolved = tryEvaluateCompileTimeNumericExpression?.(rightToken);
      if (resolved === null || resolved === undefined) return null;
      if (!doesDecimalFitBcdDigits(resolved, digitCount)) return null;
      rightLiteralBytes = decimalToBcdBytes(resolved, byteCount);
    }
    if (!rightAsm && rightLiteralBytes.every((byte) => byte === 0)) {
      if (operator === ">=") return [`    jp ${asmLabel}`];
      if (operator === "<") return [];
      const lines = [];
      const branchOnNonZero = operator === ">" || operator === "!=";
      const doneLabel = branchOnNonZero ? null : makeGeneratedLabel("BcdZeroDone");
      for (let i = byteCount - 1; i >= 0; i--) {
        const loadLeft = emitLoadBcdInt8IntoA(leftToken, i);
        if (!loadLeft) return null;
        lines.push(...loadLeft);
        if (oddDigits && i === byteCount - 1) lines.push("    and $0F");
        else lines.push("    or a");
        lines.push(`    jp nz,${branchOnNonZero ? asmLabel : doneLabel}`);
      }
      if (!branchOnNonZero) {
        lines.push(`    jp ${asmLabel}`);
        lines.push(`${doneLabel}:`);
      }
      return lines;
    }
    const lessLabel = makeGeneratedLabel("BcdLess");
    const greaterLabel = makeGeneratedLabel("BcdGreater");
    const equalLabel = makeGeneratedLabel("BcdEqual");
    const doneLabel = makeGeneratedLabel("BcdDone");
    const lines = [];
    for (let i = byteCount - 1; i >= 0; i--) {
      const loadLeft = emitLoadBcdInt8IntoA(leftToken, i);
      if (!loadLeft) return null;
      lines.push(...loadLeft);
      if (oddDigits && i === byteCount - 1) lines.push("    and $0F");
      if (rightAsm) {
        const loadRight = emitLoadBcdInt8IntoA(rightAsm, i);
        if (!loadRight) return null;
        lines.push("    ld c,a");
        lines.push(...loadRight);
        if (oddDigits && i === byteCount - 1) lines.push("    and $0F");
        lines.push("    ld b,a");
        lines.push("    ld a,c");
        lines.push("    cp b");
      } else {
        const lit = `$${rightLiteralBytes[i].toString(16).toUpperCase().padStart(2, "0")}`;
        lines.push(`    cp ${lit}`);
      }
      lines.push(`    jp c,${lessLabel}`);
      lines.push(`    jp nz,${greaterLabel}`);
    }
    lines.push(`    jp ${equalLabel}`);
    lines.push(`${lessLabel}:`);
    if (operator === "<" || operator === "<=" || operator === "!=") lines.push(`    jp ${asmLabel}`);
    lines.push(`    jp ${doneLabel}`);
    lines.push(`${greaterLabel}:`);
    if (operator === ">" || operator === ">=" || operator === "!=") lines.push(`    jp ${asmLabel}`);
    lines.push(`    jp ${doneLabel}`);
    lines.push(`${equalLabel}:`);
    if (operator === "==" || operator === "<=" || operator === ">=") lines.push(`    jp ${asmLabel}`);
    lines.push(`${doneLabel}:`);
    return lines;
  }

  return {
    decimalToBcdBytes,
    getBcdDigitCount,
    doesDecimalFitBcdDigits,
    emitLoadBcdInt8IntoA,
    emitStoreAToBcdInt8,
    emitBcdNormalize,
    emitBcdAddOne,
    emitBcdSubOne,
    emitBcdAdjustByInt8,
    emitBcdAdd,
    emitBcdSub,
    emitBcdClear,
    emitBcdPrint,
    emitFormatBcdIntoBuffer,
    emitBcdCopy,
    emitBcdStore,
    emitBcdCompareGoto
  };
}
