export function createU32Helpers({
  parseArrayRef,
  getRuntimeInfo,
  emitLoadArrayAddressIntoHL,
  formatIxOffset,
  emitFunctionInvocation,
  resolveValueType,
  resolveDeclaredValueType,
  isSignedDeclaredType,
  parseNumericLiteral,
  emitStoreImmediate32,
  emitLoadInt8Into,
  emitLoadInt16IntoHL,
  emitStoreComputedToScratch32,
  makeGeneratedLabel,
  reserveRam,
  runtimeDeclarations,
  formatHex16,
  compareScratchState
}) {
  function getU32Info(name) {
    const info = getRuntimeInfo(name);
    if (!info) return null;
    if (info.kind === "u32") return info;
    if (info.storage === "stack") return null;
    if (info.kind !== "array" || info.elementType !== "int8") return null;
    if (typeof info.length !== "number" || info.length < 4) return null;
    return info;
  }

  function getI32Info(name) {
    const info = getRuntimeInfo(name);
    if (!info || (info.kind !== "i32" && info.kind !== "fix16_16")) return null;
    return info;
  }

  function parseRawIntegerLiteral(token) {
    const match = String(token).trim().match(/^raw\s+(\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+)$/i);
    if (!match) return null;
    const digits = match[1].startsWith("$") ? match[1].slice(1) : match[1].slice(2);
    const value = Number.parseInt(digits, 16);
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFFFFFF) return null;
    return value >>> 0;
  }

  function ensureCompareScratch32() {
    if (compareScratchState.get()) return compareScratchState.get();
    const leftLabel = "AMY_CMP_LEFT32";
    const rightLabel = "AMY_CMP_RIGHT32";
    const leftAddress = reserveRam(leftLabel, 4, "internal compare scratch left");
    const rightAddress = reserveRam(rightLabel, 4, "internal compare scratch right");
    runtimeDeclarations.push(`${leftLabel} EQU ${formatHex16(leftAddress)}`);
    runtimeDeclarations.push(`${rightLabel} EQU ${formatHex16(rightAddress)}`);
    const value = { leftLabel, rightLabel };
    compareScratchState.set(value);
    return value;
  }

  function emitStoreMemory32ToTarget(baseLabel, targetToken) {
    const targetArrayRef = parseArrayRef(targetToken);
    if (targetArrayRef) {
      const arrayInfo = getRuntimeInfo(targetArrayRef.name);
      if (!arrayInfo || arrayInfo.kind !== "array" || (arrayInfo.elementType !== "u32" && arrayInfo.elementType !== "i32")) return null;
      const loadAddress = emitLoadArrayAddressIntoHL(targetArrayRef.name, targetArrayRef.index);
      if (!loadAddress) return null;
      return [
        ...loadAddress,
        `    ld a,(${baseLabel}+0)`,
        "    ld (hl),a",
        "    inc hl",
        `    ld a,(${baseLabel}+1)`,
        "    ld (hl),a",
        "    inc hl",
        `    ld a,(${baseLabel}+2)`,
        "    ld (hl),a",
        "    inc hl",
        `    ld a,(${baseLabel}+3)`,
        "    ld (hl),a"
      ];
    }
    const info = getRuntimeInfo(targetToken);
    if (!info) return null;
    if (info.storage === "stack") {
      if (info.kind !== "u32" && info.kind !== "i32" && info.kind !== "fix16_16") return null;
      return [
        `    ld a,(${baseLabel}+0)`,
        `    ld (${formatIxOffset(info.offset + 0)}),a`,
        `    ld a,(${baseLabel}+1)`,
        `    ld (${formatIxOffset(info.offset + 1)}),a`,
        `    ld a,(${baseLabel}+2)`,
        `    ld (${formatIxOffset(info.offset + 2)}),a`,
        `    ld a,(${baseLabel}+3)`,
        `    ld (${formatIxOffset(info.offset + 3)}),a`
      ];
    }
    const targetInfo = (info.kind === "u32" || info.kind === "i32" || info.kind === "fix16_16") ? info : getU32Info(targetToken);
    if (!targetInfo || !targetInfo.asmName) return null;
    return [
      `    ld hl,${baseLabel}`,
      `    ld de,${targetInfo.asmName}`,
      "    ld bc,4",
      "    ldir"
    ];
  }

  function emitPrepareU32Source(valueToken, scratchLabel) {
    const arrayRef = parseArrayRef(valueToken);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info || info.kind !== "array" || info.elementType !== "u32") return null;
      const copyToScratch = emitStoreExtended32(valueToken, scratchLabel);
      if (!copyToScratch) return null;
      return { lines: copyToScratch, pointer: scratchLabel };
    }
    const valueInfo = getU32Info(valueToken);
    if (!valueInfo) return null;
    if (valueInfo.storage === "stack") {
      const copyToScratch = emitStoreExtended32(valueToken, scratchLabel);
      if (!copyToScratch) return null;
      return { lines: copyToScratch, pointer: scratchLabel };
    }
    return { lines: [], pointer: valueInfo.asmName };
  }

  function emitPrepareI32Source(valueToken, scratchLabel) {
    const arrayRef = parseArrayRef(valueToken);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info || info.kind !== "array" || info.elementType !== "i32") return null;
      const copyToScratch = emitStoreExtended32(valueToken, scratchLabel);
      if (!copyToScratch) return null;
      return { lines: copyToScratch, pointer: scratchLabel };
    }
    const valueInfo = getI32Info(valueToken);
    if (!valueInfo) return null;
    if (valueInfo.storage === "stack") {
      const copyToScratch = emitStoreExtended32(valueToken, scratchLabel);
      if (!copyToScratch) return null;
      return { lines: copyToScratch, pointer: scratchLabel };
    }
    return { lines: [], pointer: valueInfo.asmName };
  }

  function emitStoreExtended32(token, baseLabel, allowSignExtend = true) {
    const arrayRef = parseArrayRef(token);
    if (arrayRef) {
      const arrayInfo = getRuntimeInfo(arrayRef.name);
      if (!arrayInfo || arrayInfo.kind !== "array" || (arrayInfo.elementType !== "u32" && arrayInfo.elementType !== "i32")) return null;
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      return [
        ...loadAddress,
        "    ld a,(hl)",
        `    ld (${baseLabel}+0),a`,
        "    inc hl",
        "    ld a,(hl)",
        `    ld (${baseLabel}+1),a`,
        "    inc hl",
        "    ld a,(hl)",
        `    ld (${baseLabel}+2),a`,
        "    inc hl",
        "    ld a,(hl)",
        `    ld (${baseLabel}+3),a`
      ];
    }
    const functionCall = emitFunctionInvocation(token);
    if (functionCall) {
      if (functionCall.returnType !== "u32" && functionCall.returnType !== "i32") return null;
      if (baseLabel === "AMY_CMP_LEFT32") return [...functionCall.lines];
      return [
        ...functionCall.lines,
        "    ld hl,AMY_CMP_LEFT32",
        `    ld de,${baseLabel}`,
        "    ld bc,4",
        "    ldir"
      ];
    }
    const valueType = resolveValueType(token);
    const declaredType = resolveDeclaredValueType(token);
    const signExtend = allowSignExtend && isSignedDeclaredType(declaredType);
    if (!valueType) {
      const raw = parseRawIntegerLiteral(token);
      const numeric = raw !== null ? raw : parseNumericLiteral(token);
      if (numeric === null) return null;
      return emitStoreImmediate32(baseLabel, numeric);
    }
    if (valueType === "int8") {
      const load = emitLoadInt8Into("a", token);
      if (!load) return null;
      const lines = [...load, `    ld (${baseLabel}+0),a`];
      if (signExtend) {
        lines.push("    add a,a");
        lines.push("    sbc a,a");
        lines.push(`    ld (${baseLabel}+1),a`);
        lines.push(`    ld (${baseLabel}+2),a`);
        lines.push(`    ld (${baseLabel}+3),a`);
      } else {
        lines.push("    xor a");
        lines.push(`    ld (${baseLabel}+1),a`);
        lines.push(`    ld (${baseLabel}+2),a`);
        lines.push(`    ld (${baseLabel}+3),a`);
      }
      return lines;
    }
    if (valueType === "int16") {
      const load = emitLoadInt16IntoHL(token);
      if (!load) return null;
      const lines = [
        ...load,
        "    ld a,l",
        `    ld (${baseLabel}+0),a`,
        "    ld a,h",
        `    ld (${baseLabel}+1),a`
      ];
      if (signExtend) {
        lines.push("    add a,a");
        lines.push("    sbc a,a");
        lines.push(`    ld (${baseLabel}+2),a`);
        lines.push(`    ld (${baseLabel}+3),a`);
      } else {
        lines.push("    xor a");
        lines.push(`    ld (${baseLabel}+2),a`);
        lines.push(`    ld (${baseLabel}+3),a`);
      }
      return lines;
    }
    if (valueType === "u32" || valueType === "i32") {
      const info = getRuntimeInfo(token);
      if (!info || (info.kind !== "u32" && info.kind !== "i32" && info.kind !== "fix16_16")) return null;
      if (info.storage === "stack") {
        return [
          `    ld a,(${formatIxOffset(info.offset + 0)})`,
          `    ld (${baseLabel}+0),a`,
          `    ld a,(${formatIxOffset(info.offset + 1)})`,
          `    ld (${baseLabel}+1),a`,
          `    ld a,(${formatIxOffset(info.offset + 2)})`,
          `    ld (${baseLabel}+2),a`,
          `    ld a,(${formatIxOffset(info.offset + 3)})`,
          `    ld (${baseLabel}+3),a`
        ];
      }
      return [
        `    ld hl,${info.asmName}`,
        `    ld de,${baseLabel}`,
        "    ld bc,4",
        "    ldir"
      ];
    }
    return null;
  }

  function emitLoadDwordInt16ComponentIntoHL(token, component) {
    const declaredType = resolveDeclaredValueType(token);
    if (declaredType !== "u32" && declaredType !== "i32") return null;
    const scratch = ensureCompareScratch32();
    const storeValue = emitStoreExtended32(token, scratch.leftLabel);
    if (!storeValue) return null;
    const lowOffset = component === "highword" ? 2 : 0;
    return [
      ...storeValue,
      `    ld a,(${scratch.leftLabel}+${lowOffset})`,
      "    ld l,a",
      `    ld a,(${scratch.leftLabel}+${lowOffset + 1})`,
      "    ld h,a"
    ];
  }

  function emitU32Inc(name) {
    const arrayRef = parseArrayRef(name);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info || info.kind !== "array" || (info.elementType !== "u32" && info.elementType !== "i32")) return null;
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      return [...loadAddress, "    call AMY_U32_INC"];
    }
    const info = getU32Info(name);
    if (!info) return null;
    if (info.storage === "stack") {
      const scratch = ensureCompareScratch32();
      const storeValue = emitStoreExtended32(name, scratch.leftLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
      if (!storeValue || !storeTarget) return null;
      return [...storeValue, `    ld hl,${scratch.leftLabel}`, "    call AMY_U32_INC", ...storeTarget];
    }
    return [`    ld hl,${info.asmName}`, "    call AMY_U32_INC"];
  }

  function emitU32Dec(name) {
    const arrayRef = parseArrayRef(name);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info || info.kind !== "array" || (info.elementType !== "u32" && info.elementType !== "i32")) return null;
      const scratch = ensureCompareScratch32();
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      return [
        ...loadAddress,
        `    ld de,${scratch.rightLabel}`,
        "    call AMY_U32_ZERO",
        "    ld a,$01",
        `    ld (${scratch.rightLabel}+0),a`,
        "    call AMY_U32_SUB"
      ];
    }
    const info = getU32Info(name);
    if (!info) return null;
    const scratch = ensureCompareScratch32();
    if (info.storage === "stack") {
      const storeValue = emitStoreExtended32(name, scratch.leftLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
      if (!storeValue || !storeTarget) return null;
      return [
        ...storeValue,
        `    ld hl,${scratch.leftLabel}`,
        `    ld de,${scratch.rightLabel}`,
        "    call AMY_U32_ZERO",
        "    ld a,$01",
        `    ld (${scratch.rightLabel}+0),a`,
        "    call AMY_U32_SUB",
        ...storeTarget
      ];
    }
    return [
      `    ld hl,${info.asmName}`,
      `    ld de,${scratch.rightLabel}`,
      "    call AMY_U32_ZERO",
      "    ld a,$01",
      `    ld (${scratch.rightLabel}+0),a`,
      "    call AMY_U32_SUB"
    ];
  }

  function emitCompareScratch32Goto(leftToken, operator, rightToken, label, signedCompare) {
    const scratch = ensureCompareScratch32();
    const leftStore = emitStoreExtended32(leftToken, scratch.leftLabel, signedCompare);
    const rightStore = emitStoreExtended32(rightToken, scratch.rightLabel, signedCompare);
    if (!leftStore || !rightStore) return null;
    const lessLabel = makeGeneratedLabel("CmpLess");
    const greaterLabel = makeGeneratedLabel("CmpGreater");
    const doneLabel = makeGeneratedLabel("CmpDone");
    const lines = [...leftStore, ...rightStore];
    for (let i = 3; i >= 0; i -= 1) {
      lines.push(`    ld a,(${scratch.rightLabel}+${i})`);
      if (signedCompare && i === 3) lines.push("    xor $80");
      lines.push("    ld c,a");
      lines.push(`    ld a,(${scratch.leftLabel}+${i})`);
      if (signedCompare && i === 3) lines.push("    xor $80");
      lines.push("    cp c");
      lines.push(`    jp c,${lessLabel}`);
      lines.push(`    jp nz,${greaterLabel}`);
    }
    if (operator === "==" || operator === "<=" || operator === ">=") lines.push(`    jp ${label}`);
    lines.push(`    jp ${doneLabel}`);
    lines.push(`${lessLabel}:`);
    if (operator === "<" || operator === "<=" || operator === "!=") lines.push(`    jp ${label}`);
    else lines.push(`    jp ${doneLabel}`);
    lines.push(`${greaterLabel}:`);
    if (operator === ">" || operator === ">=" || operator === "!=") lines.push(`    jp ${label}`);
    lines.push(`${doneLabel}:`);
    return lines;
  }

  function emitComputedCompareGoto(leftComputed, operator, rightComputed, label, signedCompare) {
    const scratch = ensureCompareScratch32();
    const leftStore = emitStoreComputedToScratch32(scratch.leftLabel, leftComputed, isSignedDeclaredType(leftComputed?.declaredType));
    const rightStore = emitStoreComputedToScratch32(scratch.rightLabel, rightComputed, isSignedDeclaredType(rightComputed?.declaredType));
    if (!leftStore || !rightStore) return null;
    const lessLabel = makeGeneratedLabel("CmpLess");
    const greaterLabel = makeGeneratedLabel("CmpGreater");
    const doneLabel = makeGeneratedLabel("CmpDone");
    const lines = [...leftStore, ...rightStore];
    for (let i = 3; i >= 0; i -= 1) {
      lines.push(`    ld a,(${scratch.rightLabel}+${i})`);
      if (signedCompare && i === 3) lines.push("    xor $80");
      lines.push("    ld c,a");
      lines.push(`    ld a,(${scratch.leftLabel}+${i})`);
      if (signedCompare && i === 3) lines.push("    xor $80");
      lines.push("    cp c");
      lines.push(`    jp c,${lessLabel}`);
      lines.push(`    jp nz,${greaterLabel}`);
    }
    if (operator === "==" || operator === "<=" || operator === ">=") lines.push(`    jp ${label}`);
    lines.push(`    jp ${doneLabel}`);
    lines.push(`${lessLabel}:`);
    if (operator === "<" || operator === "<=" || operator === "!=") lines.push(`    jp ${label}`);
    else lines.push(`    jp ${doneLabel}`);
    lines.push(`${greaterLabel}:`);
    if (operator === ">" || operator === ">=" || operator === "!=") lines.push(`    jp ${label}`);
    lines.push(`${doneLabel}:`);
    return lines;
  }

  function emitU32ArrayCompareGoto(leftToken, operator, rightToken, label, signedCompare = false) {
    const leftInfo = getU32Info(leftToken);
    const rightInfo = getU32Info(rightToken);
    if (!leftInfo || !rightInfo) return null;
    const compareCall = signedCompare ? "AMY_CMP_S32_MEM" : "AMY_CMP_U32_MEM";
    const lines = [
      `    ld hl,${leftInfo.asmName}`,
      `    ld de,${rightInfo.asmName}`,
      `    call ${compareCall}`
    ];
    if (operator === "==") lines.push(`    jp z,${label}`);
    else if (operator === "!=") lines.push(`    jp nz,${label}`);
    else if (operator === "<") lines.push(`    jp c,${label}`);
    else if (operator === ">=") lines.push(`    jp nc,${label}`);
    else if (operator === "<=") {
      lines.push(`    jp c,${label}`);
      lines.push(`    jp z,${label}`);
    } else if (operator === ">") {
      const doneLabel = makeGeneratedLabel("U32CompareDone");
      lines.push(`    jp z,${doneLabel}`);
      lines.push(`    jp nc,${label}`);
      lines.push(`${doneLabel}:`);
    } else return null;
    return lines;
  }

  return {
    ensureCompareScratch32,
    emitStoreMemory32ToTarget,
    emitPrepareU32Source,
    emitPrepareI32Source,
    emitStoreExtended32,
    emitLoadDwordInt16ComponentIntoHL,
    emitCompareScratch32Goto,
    emitComputedCompareGoto,
    getU32Info,
    getI32Info,
    emitU32Inc,
    emitU32Dec,
    emitU32ArrayCompareGoto
  };
}
