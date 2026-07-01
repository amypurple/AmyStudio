export function createFx16Helpers({
  getRuntimeInfo,
  emitLoadInt8Into,
  emitLoadInt16IntoHL,
  emitRuntimeStore,
  emitStoreInt8FromA,
  emitStoreInt16FromHL,
  emitStoreExtended32,
  emitStoreMemory32ToTarget,
  emitStoreImmediate32,
  ensureCompareScratch32,
  parseFixedPointLiteral32,
  parseNumericLiteral,
  tryEvaluateCompileTimeNumericExpression,
  resolveDeclaredValueType,
  normalizeDeclaredType,
  formatIxOffset,
  scopedRuntimeName
}) {
  let fp5HelperLabelCounter = 0;
  function nextFp5HelperLabel(prefix) {
    fp5HelperLabelCounter += 1;
    return `AMY_${prefix}_${fp5HelperLabelCounter}`;
  }

  function getFx16Info(name) {
    const info = getRuntimeInfo(name);
    if (!info) return null;
    if (info.kind === "fix16_16") return info;
    return null;
  }

  function getFix8Info(name) {
    const info = getRuntimeInfo(name);
    if (!info) return null;
    const declaredType = normalizeDeclaredType(resolveDeclaredValueType(name));
    if (declaredType === "fix8_8" || declaredType === "ufix8_8") return info;
    return null;
  }

  function getFp5Info(name) {
    const info = getRuntimeInfo(name);
    if (!info) return null;
    if (info.kind === "fp5" || info.type === "fp5") return info;
    return null;
  }

  // Store a fix16_16-typed source value into a 4-byte scratch area.
  // Handles:
  //   - fix16_16 variables (direct 4-byte copy)
  //   - decimal/hex value literals (1.5, $0001) scaled x65536
  //   - raw hex literals (raw $00018000) stored as exact 16.16 bits
  //   - integer literals treated as integer part (1 → 1.0)
  //   - int8 variables promoted to integer part (sign-extended)
  //   - int16 variables promoted to integer part (sign-extended)
  function emitStoreFx16Source(valueToken, baseLabel) {
    const valueInfo = getRuntimeInfo(valueToken);
    if (valueInfo) {
      if (valueInfo.kind === "fix16_16") {
        return emitStoreExtended32(valueToken, baseLabel);
      }
      if (valueInfo.type === "int8") {
        const loadA = emitLoadInt8Into("a", valueToken);
        if (!loadA) return null;
        const declaredType = normalizeDeclaredType(resolveDeclaredValueType(valueToken));
        const isSigned = declaredType === "i8";
        if (valueInfo.storage === "stack") {
          const lines = [
            ...loadA,
            "    ld b,a",
            "    xor a",
            `    ld (${baseLabel}+0),a`,
            `    ld (${baseLabel}+1),a`,
            "    ld a,b",
            `    ld (${baseLabel}+2),a`
          ];
          if (isSigned) {
            lines.push("    add a,a", "    sbc a,a", `    ld (${baseLabel}+3),a`);
          } else {
            lines.push("    xor a", `    ld (${baseLabel}+3),a`);
          }
          return lines;
        }
        const lines = [
          ...loadA,
          "    ld b,a",
          "    xor a",
          `    ld (${baseLabel}+0),a`,
          `    ld (${baseLabel}+1),a`,
          "    ld a,b",
          `    ld (${baseLabel}+2),a`
        ];
        if (isSigned) {
          lines.push("    add a,a", "    sbc a,a", `    ld (${baseLabel}+3),a`);
        } else {
          lines.push("    xor a", `    ld (${baseLabel}+3),a`);
        }
        return lines;
      }
      if (valueInfo.type === "int16") {
        const loadHL = emitLoadInt16IntoHL(valueToken);
        if (!loadHL) return null;
        const lines = [
          ...loadHL,
          "    xor a",
          `    ld (${baseLabel}+0),a`,
          `    ld (${baseLabel}+1),a`,
          "    ld a,l",
          `    ld (${baseLabel}+2),a`,
          "    ld a,h",
          `    ld (${baseLabel}+3),a`
        ];
        return lines;
      }
      return null;
    }
    const fixedLiteral = parseFixedPointLiteral32(valueToken);
    if (fixedLiteral !== null) {
      return emitStoreImmediate32(baseLabel, fixedLiteral);
    }
    return null;
  }

  // Emit fix16_16 += or -= using AMY_FX16_16_ADD / AMY_FX16_16_SUB.
  function emitFx16ArithOp(target, valueToken, op) {
    if (!getFx16Info(target)) return null;
    const scratch = ensureCompareScratch32();
    const storeDst = emitStoreExtended32(target, scratch.leftLabel);
    const storeSrc = emitStoreFx16Source(valueToken, scratch.rightLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
    if (!storeDst || !storeSrc || !storeTarget) return null;
    const asmOp = op === "add" ? "AMY_FX16_16_ADD" : "AMY_FX16_16_SUB";
    return [
      ...storeDst,
      ...storeSrc,
      `    ld hl,${scratch.leftLabel}`,
      `    ld de,${scratch.rightLabel}`,
      `    call ${asmOp}`,
      ...storeTarget
    ];
  }

  function emitFx16MultiplyOp(target, valueToken) {
    if (!getFx16Info(target)) return null;
    const scratch = ensureCompareScratch32();
    const storeDst = emitStoreExtended32(target, scratch.leftLabel);
    const storeSrc = emitStoreFx16Source(valueToken, scratch.rightLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
    if (!storeDst || !storeSrc || !storeTarget) return null;
    return [
      ...storeDst,
      ...storeSrc,
      `    ld hl,${scratch.leftLabel}`,
      `    ld de,${scratch.rightLabel}`,
      "    call AMY_FX16_16_MULT",
      ...storeTarget
    ];
  }

  function emitFx16DivideOp(target, valueToken) {
    if (!getFx16Info(target)) return null;
    const scratch = ensureCompareScratch32();
    const storeDst = emitStoreExtended32(target, scratch.leftLabel);
    const storeSrc = emitStoreFx16Source(valueToken, scratch.rightLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, target);
    if (!storeDst || !storeSrc || !storeTarget) return null;
    return [
      ...storeDst,
      ...storeSrc,
      `    ld hl,${scratch.leftLabel}`,
      `    ld de,${scratch.rightLabel}`,
      "    call AMY_FX16_16_DIV",
      ...storeTarget
    ];
  }

  function emitSqrtFx16Into(valueToken, targetToken) {
    if (!getFx16Info(targetToken)) return null;
    const scratch = ensureCompareScratch32();
    const storeSource = emitStoreFx16Source(valueToken, scratch.leftLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, targetToken);
    if (!storeSource || !storeTarget) return null;
    return [
      ...storeSource,
      `    ld hl,${scratch.leftLabel}`,
      "    call AMY_FX16_16_SQRT",
      ...storeTarget
    ];
  }

  function emitAbsFx16Into(valueToken, targetToken) {
    if (!getFx16Info(targetToken)) return null;
    const scratch = ensureCompareScratch32();
    const storeSource = emitStoreFx16Source(valueToken, scratch.leftLabel);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, targetToken);
    if (!storeSource || !storeTarget) return null;
    return [
      ...storeSource,
      `    ld hl,${scratch.leftLabel}`,
      "    call AMY_FX16_16_ABS",
      ...storeTarget
    ];
  }

  function emitRandomFx16Into(targetToken) {
    if (!getFx16Info(targetToken)) return null;
    const storeTarget = emitStoreMemory32ToTarget("AMY_BUFFER32", targetToken);
    if (!storeTarget) return null;
    return [
      "    call AMY_FX16_16_RND",
      ...storeTarget
    ];
  }

  function emitStoreFix8SignConstant(targetToken, value) {
    const targetInfo = getFix8Info(targetToken);
    if (!targetInfo) return null;
    const wordValue = value < 0 ? -256 : value > 0 ? 256 : 0;
    const lowByte = wordValue & 0xFF;
    const highByte = (wordValue >> 8) & 0xFF;
    const lowHex = `$${lowByte.toString(16).toUpperCase().padStart(2, "0")}`;
    const highHex = `$${highByte.toString(16).toUpperCase().padStart(2, "0")}`;
    if (targetInfo.storage === "stack") {
      return [
        `    ld a,${lowHex}`,
        `    ld (${formatIxOffset(targetInfo.offset)}),a`,
        `    ld a,${highHex}`,
        `    ld (${formatIxOffset(targetInfo.offset + 1)}),a`
      ];
    }
    return [
      `    ld a,${lowHex}`,
      `    ld (${scopedRuntimeName(targetToken)}+0),a`,
      `    ld a,${highHex}`,
      `    ld (${scopedRuntimeName(targetToken)}+1),a`
    ];
  }

  function emitStoreFx16SignConstant(targetToken, value) {
    if (!getFx16Info(targetToken)) return null;
    const scratch = ensureCompareScratch32();
    const rawValue = value < 0 ? -65536 : value > 0 ? 65536 : 0;
    const storeValue = emitStoreImmediate32(scratch.leftLabel, rawValue);
    const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, targetToken);
    if (!storeValue || !storeTarget) return null;
    return [...storeValue, ...storeTarget];
  }

  function emitAbsFp5Into(valueToken, targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const literalValue = parseCompileTimeNumericLiteral(valueToken);
    if (literalValue !== null) {
      const folded = emitStoreCompileTimeNumericToTarget(targetToken, Math.abs(literalValue));
      if (folded) return folded;
    }
    const storeSource = valueToken === targetToken ? [] : emitRuntimeStore(targetToken, valueToken);
    if (!storeSource) return null;
    if (targetInfo.storage === "stack") {
      const signOffset = targetInfo.offset + 3;
      return [
        ...storeSource,
        `    ld a,(ix${signOffset < 0 ? signOffset : `+${signOffset}`})`,
        "    and $7F",
        `    ld (ix${signOffset < 0 ? signOffset : `+${signOffset}`}),a`
      ];
    }
    return [
      ...storeSource,
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_ABS_MEM"
    ];
  }

  function emitRandomFp5Into(targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    if (targetInfo.storage === "stack") {
      return [
        "    call AMY_FP5_RND",
        "    ld a,(AMY_FP5_FPA1+0)",
        `    ld (ix${targetInfo.offset < 0 ? targetInfo.offset : `+${targetInfo.offset}`}),a`,
        "    ld a,(AMY_FP5_FPA1+1)",
        `    ld (ix${targetInfo.offset + 1 < 0 ? targetInfo.offset + 1 : `+${targetInfo.offset + 1}`}),a`,
        "    ld a,(AMY_FP5_FPA1+2)",
        `    ld (ix${targetInfo.offset + 2 < 0 ? targetInfo.offset + 2 : `+${targetInfo.offset + 2}`}),a`,
        "    ld a,(AMY_FP5_FPA1+3)",
        `    ld (ix${targetInfo.offset + 3 < 0 ? targetInfo.offset + 3 : `+${targetInfo.offset + 3}`}),a`,
        "    ld a,(AMY_FP5_FPA1+4)",
        `    ld (ix${targetInfo.offset + 4 < 0 ? targetInfo.offset + 4 : `+${targetInfo.offset + 4}`}),a`
      ];
    }
    return [
      "    call AMY_FP5_RND",
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_STORE_FPA1_TO_MEM"
    ];
  }

  function emitRandomFp5BetweenInto(minToken, maxToken, targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const loadMax = emitLoadFp5SourceToFPA2(maxToken);
    const loadMinForRange = emitLoadFp5SourceToFPA1(minToken);
    const loadMinForOffset = emitLoadFp5SourceToFPA1(minToken);
    const storeTarget = emitStoreFPA2ToFp5Target(targetToken);
    if (!loadMax || !loadMinForRange || !loadMinForOffset || !storeTarget) return null;
    return [
      ...loadMax,
      ...loadMinForRange,
      "    call AMY_FP5_SUB_FPA1_FROM_FPA2",
      "    call AMY_FP5_RND",
      "    call AMY_FP5_MUL_FPA1_FPA2",
      ...loadMinForOffset,
      "    call AMY_FP5_ADD_FPA1_TO_FPA2",
      ...storeTarget
    ];
  }

  function emitLoadFp5SourceToFPA1(valueToken) {
    const valueInfo = getFp5Info(valueToken);
    if (valueInfo) {
      if (valueInfo.storage === "stack") {
        return [
          `    ld a,(ix${valueInfo.offset < 0 ? valueInfo.offset : `+${valueInfo.offset}`})`,
          "    ld (AMY_FP5_FPA1+0),a",
          `    ld a,(ix${valueInfo.offset + 1 < 0 ? valueInfo.offset + 1 : `+${valueInfo.offset + 1}`})`,
          "    ld (AMY_FP5_FPA1+1),a",
          `    ld a,(ix${valueInfo.offset + 2 < 0 ? valueInfo.offset + 2 : `+${valueInfo.offset + 2}`})`,
          "    ld (AMY_FP5_FPA1+2),a",
          `    ld a,(ix${valueInfo.offset + 3 < 0 ? valueInfo.offset + 3 : `+${valueInfo.offset + 3}`})`,
          "    ld (AMY_FP5_FPA1+3),a",
          `    ld a,(ix${valueInfo.offset + 4 < 0 ? valueInfo.offset + 4 : `+${valueInfo.offset + 4}`})`,
          "    ld (AMY_FP5_FPA1+4),a"
        ];
      }
      return [
        `    ld hl,${valueInfo.asmName}`,
        "    call AMY_FP5_LOAD_MEM_TO_FPA1"
      ];
    }
    const sourceInfo = getRuntimeInfo(valueToken);
    const valueType = normalizeDeclaredType(resolveDeclaredValueType(valueToken));
    if (sourceInfo && sourceInfo.type === "int16" && sourceInfo.storage !== "stack") {
      const signed = valueType === "i16";
      return [
        `    ld hl,${sourceInfo.asmName}`,
        `    call ${signed ? "AMY_FP5_LOAD_I16_MEM_TO_FPA1" : "AMY_FP5_LOAD_U16_MEM_TO_FPA1"}`
      ];
    }
    const loadHL = emitLoadInt16IntoHL(valueToken);
    if (!loadHL) return null;
    const signed = valueType === "i8" || valueType === "i16";
    return [
      ...loadHL,
      `    call ${signed ? "AMY_FP5_I16_TO_FPA1" : "AMY_FP5_U16_TO_FPA1"}`
    ];
  }

  function emitLoadFp5SourceToFPA2(valueToken) {
    const valueInfo = getFp5Info(valueToken);
    if (valueInfo) {
      if (valueInfo.storage === "stack") {
        return [
          `    ld a,(ix${valueInfo.offset < 0 ? valueInfo.offset : `+${valueInfo.offset}`})`,
          "    ld (AMY_FP5_FPA2+0),a",
          `    ld a,(ix${valueInfo.offset + 1 < 0 ? valueInfo.offset + 1 : `+${valueInfo.offset + 1}`})`,
          "    ld (AMY_FP5_FPA2+1),a",
          `    ld a,(ix${valueInfo.offset + 2 < 0 ? valueInfo.offset + 2 : `+${valueInfo.offset + 2}`})`,
          "    ld (AMY_FP5_FPA2+2),a",
          `    ld a,(ix${valueInfo.offset + 3 < 0 ? valueInfo.offset + 3 : `+${valueInfo.offset + 3}`})`,
          "    ld (AMY_FP5_FPA2+3),a",
          `    ld a,(ix${valueInfo.offset + 4 < 0 ? valueInfo.offset + 4 : `+${valueInfo.offset + 4}`})`,
          "    ld (AMY_FP5_FPA2+4),a"
        ];
      }
      return [
        `    ld hl,${valueInfo.asmName}`,
        "    call AMY_FP5_LOAD_MEM_TO_FPA2"
      ];
    }
    const sourceInfo = getRuntimeInfo(valueToken);
    const valueType = normalizeDeclaredType(resolveDeclaredValueType(valueToken));
    if (sourceInfo && sourceInfo.type === "int16" && sourceInfo.storage !== "stack") {
      const signed = valueType === "i16";
      return [
        `    ld hl,${sourceInfo.asmName}`,
        `    call ${signed ? "AMY_FP5_LOAD_I16_MEM_TO_FPA2" : "AMY_FP5_LOAD_U16_MEM_TO_FPA2"}`
      ];
    }
    const loadHL = emitLoadInt16IntoHL(valueToken);
    if (!loadHL) return null;
    const signed = valueType === "i8" || valueType === "i16";
    return [
      ...loadHL,
      `    call ${signed ? "AMY_FP5_I16_TO_FPA1" : "AMY_FP5_U16_TO_FPA1"}`,
      "    call AMY_FP5_COPY_FPA1_TO_FPA2"
    ];
  }

  function emitLoadFp5TargetToFPA2(targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    if (targetInfo.storage === "stack") {
      return [
        `    ld a,(ix${targetInfo.offset < 0 ? targetInfo.offset : `+${targetInfo.offset}`})`,
        "    ld (AMY_FP5_FPA2+0),a",
        `    ld a,(ix${targetInfo.offset + 1 < 0 ? targetInfo.offset + 1 : `+${targetInfo.offset + 1}`})`,
        "    ld (AMY_FP5_FPA2+1),a",
        `    ld a,(ix${targetInfo.offset + 2 < 0 ? targetInfo.offset + 2 : `+${targetInfo.offset + 2}`})`,
        "    ld (AMY_FP5_FPA2+2),a",
        `    ld a,(ix${targetInfo.offset + 3 < 0 ? targetInfo.offset + 3 : `+${targetInfo.offset + 3}`})`,
        "    ld (AMY_FP5_FPA2+3),a",
        `    ld a,(ix${targetInfo.offset + 4 < 0 ? targetInfo.offset + 4 : `+${targetInfo.offset + 4}`})`,
        "    ld (AMY_FP5_FPA2+4),a"
      ];
    }
    return [
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_LOAD_MEM_TO_FPA2"
    ];
  }

  function emitStoreFPA2ToFp5Target(targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    if (targetInfo.storage === "stack") {
      return [
        "    ld a,(AMY_FP5_FPA2+0)",
        `    ld (ix${targetInfo.offset < 0 ? targetInfo.offset : `+${targetInfo.offset}`}),a`,
        "    ld a,(AMY_FP5_FPA2+1)",
        `    ld (ix${targetInfo.offset + 1 < 0 ? targetInfo.offset + 1 : `+${targetInfo.offset + 1}`}),a`,
        "    ld a,(AMY_FP5_FPA2+2)",
        `    ld (ix${targetInfo.offset + 2 < 0 ? targetInfo.offset + 2 : `+${targetInfo.offset + 2}`}),a`,
        "    ld a,(AMY_FP5_FPA2+3)",
        `    ld (ix${targetInfo.offset + 3 < 0 ? targetInfo.offset + 3 : `+${targetInfo.offset + 3}`}),a`,
        "    ld a,(AMY_FP5_FPA2+4)",
        `    ld (ix${targetInfo.offset + 4 < 0 ? targetInfo.offset + 4 : `+${targetInfo.offset + 4}`}),a`
      ];
    }
    return [
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_STORE_FPA2_TO_MEM"
    ];
  }

  function emitStoreFPA1ToFp5Target(targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    if (targetInfo.storage === "stack") {
      return [
        "    ld a,(AMY_FP5_FPA1+0)",
        `    ld (ix${targetInfo.offset < 0 ? targetInfo.offset : `+${targetInfo.offset}`}),a`,
        "    ld a,(AMY_FP5_FPA1+1)",
        `    ld (ix${targetInfo.offset + 1 < 0 ? targetInfo.offset + 1 : `+${targetInfo.offset + 1}`}),a`,
        "    ld a,(AMY_FP5_FPA1+2)",
        `    ld (ix${targetInfo.offset + 2 < 0 ? targetInfo.offset + 2 : `+${targetInfo.offset + 2}`}),a`,
        "    ld a,(AMY_FP5_FPA1+3)",
        `    ld (ix${targetInfo.offset + 3 < 0 ? targetInfo.offset + 3 : `+${targetInfo.offset + 3}`}),a`,
        "    ld a,(AMY_FP5_FPA1+4)",
        `    ld (ix${targetInfo.offset + 4 < 0 ? targetInfo.offset + 4 : `+${targetInfo.offset + 4}`}),a`
      ];
    }
    return [
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_STORE_FPA1_TO_MEM"
    ];
  }

  function emitFp5ArithOp(targetToken, valueToken, op) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const loadTarget = emitLoadFp5TargetToFPA2(targetToken);
    const loadSource = emitLoadFp5SourceToFPA1(valueToken);
    const storeTarget = emitStoreFPA2ToFp5Target(targetToken);
    if (!loadTarget || !loadSource || !storeTarget) return null;
    return [
      ...loadTarget,
      ...loadSource,
      `    call ${op === "add" ? "AMY_FP5_ADD_FPA1_TO_FPA2" : "AMY_FP5_SUB_FPA1_FROM_FPA2"}`,
      ...storeTarget
    ];
  }

  function emitCompareFp5Goto(leftToken, operator, rightToken, label) {
    const loadRight = emitLoadFp5SourceToFPA2(rightToken);
    const loadLeft = emitLoadFp5SourceToFPA1(leftToken);
    if (!loadLeft || !loadRight) return null;
    const lines = [
      ...loadRight,
      ...loadLeft,
      "    call AMY_FP5_CMP_FPA1_FPA2"
    ];
    if (operator === "==") lines.push(`    jp z,${label}`);
    else if (operator === "!=") lines.push(`    jp nz,${label}`);
    else if (operator === "<") lines.push(`    jp c,${label}`);
    else if (operator === ">=") lines.push(`    jp nc,${label}`);
    else if (operator === "<=") {
      lines.push(`    jp c,${label}`);
      lines.push(`    jp z,${label}`);
    } else if (operator === ">") {
      const doneLabel = nextFp5HelperLabel("CMP_DONE");
      lines.push(`    jp z,${doneLabel}`);
      lines.push(`    jp nc,${label}`);
      lines.push(`${doneLabel}:`);
    } else return null;
    return lines;
  }

  function emitStoreFp5SourceAsFx16(valueToken, baseLabel) {
    const valueInfo = getFp5Info(valueToken);
    if (valueInfo) {
      if (valueInfo.storage === "stack") {
        return [
          `    ld a,(ix${valueInfo.offset < 0 ? valueInfo.offset : `+${valueInfo.offset}`})`,
          "    ld (AMY_FP5_FPA1+0),a",
          `    ld a,(ix${valueInfo.offset + 1 < 0 ? valueInfo.offset + 1 : `+${valueInfo.offset + 1}`})`,
          "    ld (AMY_FP5_FPA1+1),a",
          `    ld a,(ix${valueInfo.offset + 2 < 0 ? valueInfo.offset + 2 : `+${valueInfo.offset + 2}`})`,
          "    ld (AMY_FP5_FPA1+2),a",
          `    ld a,(ix${valueInfo.offset + 3 < 0 ? valueInfo.offset + 3 : `+${valueInfo.offset + 3}`})`,
          "    ld (AMY_FP5_FPA1+3),a",
          `    ld a,(ix${valueInfo.offset + 4 < 0 ? valueInfo.offset + 4 : `+${valueInfo.offset + 4}`})`,
          "    ld (AMY_FP5_FPA1+4),a",
          "    ld hl,AMY_FP5_FPA1",
          `    ld de,${baseLabel}`,
          "    call AMY_FP5_TO_FX16_16"
        ];
      }
      return [
        `    ld hl,${valueInfo.asmName}`,
        `    ld de,${baseLabel}`,
        "    call AMY_FP5_TO_FX16_16"
      ];
    }
    return emitStoreFx16Source(valueToken, baseLabel);
  }

  function emitStoreFx16MemoryAsFp5(sourceLabel, targetToken, options = {}) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const bridgeRoutine = options.unsigned ? "AMY_UFX16_16_TO_FP5" : "AMY_FX16_16_TO_FP5";
    if (targetInfo.storage === "stack") {
      return [
        `    ld hl,${sourceLabel}`,
        `    call ${bridgeRoutine}`,
        "    ld a,(AMY_FP5_FPA1+0)",
        `    ld (ix${targetInfo.offset < 0 ? targetInfo.offset : `+${targetInfo.offset}`}),a`,
        "    ld a,(AMY_FP5_FPA1+1)",
        `    ld (ix${targetInfo.offset + 1 < 0 ? targetInfo.offset + 1 : `+${targetInfo.offset + 1}`}),a`,
        "    ld a,(AMY_FP5_FPA1+2)",
        `    ld (ix${targetInfo.offset + 2 < 0 ? targetInfo.offset + 2 : `+${targetInfo.offset + 2}`}),a`,
        "    ld a,(AMY_FP5_FPA1+3)",
        `    ld (ix${targetInfo.offset + 3 < 0 ? targetInfo.offset + 3 : `+${targetInfo.offset + 3}`}),a`,
        "    ld a,(AMY_FP5_FPA1+4)",
        `    ld (ix${targetInfo.offset + 4 < 0 ? targetInfo.offset + 4 : `+${targetInfo.offset + 4}`}),a`
      ];
    }
    return [
      `    ld hl,${sourceLabel}`,
      `    call ${bridgeRoutine}`,
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_STORE_FPA1_TO_MEM"
    ];
  }

  function emitFp5MultiplyOp(targetToken, valueToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const loadTarget = emitLoadFp5TargetToFPA2(targetToken);
    const storeTarget = emitStoreFPA2ToFp5Target(targetToken);
    if (!loadTarget || !storeTarget) return null;
    if (targetToken === valueToken) {
      return [
        ...loadTarget,
        "    call AMY_FP5_COPY_FPA2_TO_FPA1",
        "    call AMY_FP5_MUL_FPA1_FPA2",
        ...storeTarget
      ];
    }
    const loadSource = emitLoadFp5SourceToFPA1(valueToken);
    if (!loadSource) return null;
    return [
      ...loadTarget,
      ...loadSource,
      "    call AMY_FP5_MUL_FPA1_FPA2",
      ...storeTarget
    ];
  }

  function emitFp5DivideOp(targetToken, valueToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const loadTarget = emitLoadFp5TargetToFPA2(targetToken);
    const loadSource = emitLoadFp5SourceToFPA1(valueToken);
    const storeTarget = emitStoreFPA2ToFp5Target(targetToken);
    if (!loadTarget || !loadSource || !storeTarget) return null;
    return [
      ...loadTarget,
      ...loadSource,
      "    call AMY_FP5_DIV_FPA1_FPA2",
      ...storeTarget
    ];
  }

  function emitSqrtFp5Into(valueToken, targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const literalValue = parseCompileTimeNumericLiteral(valueToken);
    if (literalValue !== null) {
      const folded = emitStoreCompileTimeNumericToTarget(targetToken, literalValue < 0 ? 0 : Math.sqrt(literalValue));
      if (folded) return folded;
    }
    const storeSource = valueToken === targetToken ? [] : emitRuntimeStore(targetToken, valueToken);
    if (!storeSource) return null;
    if (targetInfo.storage === "stack") {
      return [
        ...storeSource,
        "    push ix",
        "    pop hl",
        `    ld de,${targetInfo.offset}`,
        "    add hl,de",
        "    call AMY_FP5_SQRT_MEM"
      ];
    }
    return [
      ...storeSource,
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_SQRT_MEM"
    ];
  }

  function parseCompileTimeNumericLiteral(token) {
    if (typeof tryEvaluateCompileTimeNumericExpression === "function") {
      const constantValue = tryEvaluateCompileTimeNumericExpression(token);
      if (constantValue !== null) return constantValue;
    }
    const integerValue = parseNumericLiteral(token);
    if (integerValue !== null) return integerValue;
    const text = String(token).trim();
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      const numeric = Number.parseFloat(text);
      if (Number.isFinite(numeric)) return numeric;
    }
    return null;
  }

  function encodeFp5Number(value) {
    if (!Number.isFinite(value)) return null;
    if (value === 0) return [0, 0, 0, 0, 0];
    const negative = value < 0;
    const absValue = Math.abs(value);
    let exponent = Math.floor(Math.log2(absValue)) + 1;
    if (exponent < -127) return [0, 0, 0, 0, 0];
    let significand = absValue / (2 ** (exponent - 1));
    let fraction = Math.round((significand - 1) * 0x80000000);
    if (fraction >= 0x80000000) {
      fraction = 0;
      exponent += 1;
      significand = 1;
    }
    const storedExponent = exponent + 128;
    if (storedExponent <= 0) return [0, 0, 0, 0, 0];
    if (storedExponent >= 256) return null;
    const byte0 = fraction & 0xFF;
    const byte1 = (fraction >>> 8) & 0xFF;
    const byte2 = (fraction >>> 16) & 0xFF;
    const byte3 = ((fraction >>> 24) & 0x7F) | (negative ? 0x80 : 0x00);
    return [byte0, byte1, byte2, byte3, storedExponent & 0xFF];
  }

  function formatByteHex(value) {
    return `$${(value & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
  }

  function emitStoreImmediateBytesToOffset(offset, bytes) {
    return bytes.map((value, index) =>
      `    ld (ix${offset + index < 0 ? offset + index : `+${offset + index}`}),${formatByteHex(value)}`
    );
  }

  function emitStoreImmediateBytesToLabel(label, bytes) {
    return bytes.flatMap((value, index) => [
      `    ld a,${formatByteHex(value)}`,
      `    ld (${label}+${index}),a`
    ]);
  }

  function emitStoreImmediateFp5Bytes(targetToken, bytes) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo || !Array.isArray(bytes) || bytes.length !== 5) return null;
    if (targetInfo.storage === "stack") {
      return emitStoreImmediateBytesToOffset(targetInfo.offset, bytes);
    }
    return emitStoreImmediateBytesToLabel(targetInfo.asmName, bytes);
  }

  function encodeSignedIntegerBytes(value, byteCount) {
    const totalBits = byteCount * 8;
    const maxUnsigned = 2 ** totalBits;
    let wrapped = Math.trunc(value);
    wrapped = ((wrapped % maxUnsigned) + maxUnsigned) % maxUnsigned;
    const bytes = [];
    for (let index = 0; index < byteCount; index += 1) {
      bytes.push((wrapped >> (index * 8)) & 0xFF);
    }
    return bytes;
  }

  function emitStoreImmediateFx16Value(targetToken, value) {
    const targetInfo = getFx16Info(targetToken);
    if (!targetInfo || !Number.isFinite(value)) return null;
    const bytes = encodeSignedIntegerBytes(Math.round(value * 65536), 4);
    if (targetInfo.storage === "stack") return emitStoreImmediateBytesToOffset(targetInfo.offset, bytes);
    return emitStoreImmediateBytesToLabel(targetInfo.asmName, bytes);
  }

  function emitStoreImmediateInt16Value(targetToken, value) {
    const runtimeInfo = getRuntimeInfo(targetToken);
    if (!runtimeInfo || runtimeInfo.kind === "array" || runtimeInfo.type !== "int16" || !Number.isFinite(value)) return null;
    const bytes = encodeSignedIntegerBytes(value, 2);
    if (runtimeInfo.storage === "stack") return emitStoreImmediateBytesToOffset(runtimeInfo.offset, bytes);
    return emitStoreImmediateBytesToLabel(runtimeInfo.asmName, bytes);
  }

  function emitStoreImmediateInt8Value(targetToken, value) {
    const runtimeInfo = getRuntimeInfo(targetToken);
    if (!runtimeInfo || runtimeInfo.kind === "array" || runtimeInfo.type !== "int8" || !Number.isFinite(value)) return null;
    const byteHex = formatByteHex(value);
    if (runtimeInfo.storage === "stack") {
      return [`    ld (ix${runtimeInfo.offset < 0 ? runtimeInfo.offset : `+${runtimeInfo.offset}`}),${byteHex}`];
    }
    return [
      `    ld a,${byteHex}`,
      `    ld (${runtimeInfo.asmName}),a`
    ];
  }

  function emitStoreCompileTimeNumericToTarget(targetToken, value) {
    if (getFp5Info(targetToken)) {
      const encoded = encodeFp5Number(value);
      return encoded ? emitStoreImmediateFp5Bytes(targetToken, encoded) : null;
    }
    if (getFx16Info(targetToken)) return emitStoreImmediateFx16Value(targetToken, value);
    const runtimeInfo = getRuntimeInfo(targetToken);
    if (!runtimeInfo || runtimeInfo.kind === "array") return null;
    if (runtimeInfo.type === "int16") return emitStoreImmediateInt16Value(targetToken, Math.trunc(value));
    if (runtimeInfo.type === "int8") return emitStoreImmediateInt8Value(targetToken, Math.trunc(value));
    return null;
  }

  function emitLogFp5Into(valueToken, targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const literalValue = parseCompileTimeNumericLiteral(valueToken);
    if (literalValue !== null) {
      const encoded = encodeFp5Number(literalValue <= 0 ? 0 : Math.log(literalValue));
      if (encoded) return emitStoreImmediateFp5Bytes(targetToken, encoded);
    }
    const storeSource = valueToken === targetToken ? [] : emitRuntimeStore(targetToken, valueToken);
    if (!storeSource) return null;
    if (targetInfo.storage === "stack") {
      return [
        ...storeSource,
        "    push ix",
        "    pop hl",
        `    ld de,${targetInfo.offset}`,
        "    add hl,de",
        "    call AMY_FP5_LOG_MEM"
      ];
    }
    return [
      ...storeSource,
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_LOG_MEM"
    ];
  }

  function emitExpFp5Into(valueToken, targetToken) {
    const targetInfo = getFp5Info(targetToken);
    if (!targetInfo) return null;
    const literalValue = parseCompileTimeNumericLiteral(valueToken);
    if (literalValue !== null) {
      const encoded = encodeFp5Number(Math.exp(literalValue));
      if (encoded) return emitStoreImmediateFp5Bytes(targetToken, encoded);
    }
    const storeSource = valueToken === targetToken ? [] : emitRuntimeStore(targetToken, valueToken);
    if (!storeSource) return null;
    if (targetInfo.storage === "stack") {
      return [
        ...storeSource,
        "    push ix",
        "    pop hl",
        `    ld de,${targetInfo.offset}`,
        "    add hl,de",
        "    call AMY_FP5_EXP_MEM"
      ];
    }
    return [
      ...storeSource,
      `    ld hl,${targetInfo.asmName}`,
      "    call AMY_FP5_EXP_MEM"
    ];
  }

  function emitSgnInt16LikeInto(valueToken, targetToken) {
    const sourceInfo = getRuntimeInfo(valueToken);
    const sourceDeclaredType = normalizeDeclaredType(resolveDeclaredValueType(valueToken));
    const sourceIsFixed = sourceDeclaredType === "fix8_8" || sourceDeclaredType === "ufix8_8";
    if (sourceInfo && sourceInfo.type !== "int16") return null;
    if (sourceInfo && !["i16", "u16", "fix8_8", "ufix8_8"].includes(sourceDeclaredType)) return null;
    const loadSource = emitLoadInt16IntoHL(valueToken, sourceIsFixed ? sourceDeclaredType : null);
    if (!loadSource) return null;
    const doneLabel = nextFp5HelperLabel("SGN_DONE");
    const nonZeroLabel = nextFp5HelperLabel("SGN_NONZERO");
    const negativeLabel = nextFp5HelperLabel("SGN_NEG");
    const sourceUnsigned = sourceDeclaredType === "u16" || sourceDeclaredType === "ufix8_8";
    const targetDeclaredType = normalizeDeclaredType(resolveDeclaredValueType(targetToken));

    if (getFp5Info(targetToken)) {
      const storeTarget = emitStoreFPA1ToFp5Target(targetToken);
      if (!storeTarget) return null;
      return sourceUnsigned
        ? [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            "    ld hl,0",
            "    call AMY_FP5_U16_TO_FPA1",
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    ld hl,1",
            "    call AMY_FP5_U16_TO_FPA1",
            `${doneLabel}:`,
            ...storeTarget
          ]
        : [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            "    ld hl,0",
            "    call AMY_FP5_U16_TO_FPA1",
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    bit 7,h",
            `    jr nz,${negativeLabel}`,
            "    ld hl,1",
            "    call AMY_FP5_U16_TO_FPA1",
            `    jr ${doneLabel}`,
            `${negativeLabel}:`,
            "    ld hl,-1",
            "    call AMY_FP5_I16_TO_FPA1",
            `${doneLabel}:`,
            ...storeTarget
          ];
    }

    if (targetDeclaredType === "fix16_16") {
      const zeroStore = emitStoreFx16SignConstant(targetToken, 0);
      const posStore = emitStoreFx16SignConstant(targetToken, 1);
      const negStore = emitStoreFx16SignConstant(targetToken, -1);
      if (!zeroStore || !posStore || (!sourceUnsigned && !negStore)) return null;
      return sourceUnsigned
        ? [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            ...zeroStore,
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            ...posStore,
            `${doneLabel}:`
          ]
        : [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            ...zeroStore,
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    bit 7,h",
            `    jr nz,${negativeLabel}`,
            ...posStore,
            `    jr ${doneLabel}`,
            `${negativeLabel}:`,
            ...negStore,
            `${doneLabel}:`
          ];
    }

    if (targetDeclaredType === "fix8_8") {
      const zeroStore = emitStoreFix8SignConstant(targetToken, 0);
      const posStore = emitStoreFix8SignConstant(targetToken, 1);
      const negStore = emitStoreFix8SignConstant(targetToken, -1);
      if (!zeroStore || !posStore || (!sourceUnsigned && !negStore)) return null;
      return sourceUnsigned
        ? [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            ...zeroStore,
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            ...posStore,
            `${doneLabel}:`
          ]
        : [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            ...zeroStore,
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    bit 7,h",
            `    jr nz,${negativeLabel}`,
            ...posStore,
            `    jr ${doneLabel}`,
            `${negativeLabel}:`,
            ...negStore,
            `${doneLabel}:`
          ];
    }

    if (targetDeclaredType === "ufix8_8") return null;
    const runtimeInfo = getRuntimeInfo(targetToken);
    if (!runtimeInfo) return null;

    if (runtimeInfo.type === "int16") {
      const storeTarget = emitStoreInt16FromHL(targetToken);
      if (!storeTarget) return null;
      return sourceUnsigned
        ? [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            "    ld hl,0",
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    ld hl,1",
            `${doneLabel}:`,
            ...storeTarget
          ]
        : [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            "    ld hl,0",
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    bit 7,h",
            `    jr nz,${negativeLabel}`,
            "    ld hl,1",
            `    jr ${doneLabel}`,
            `${negativeLabel}:`,
            "    ld hl,-1",
            `${doneLabel}:`,
            ...storeTarget
          ];
    }

    if (runtimeInfo.type === "int8") {
      const storeTarget = emitStoreInt8FromA(targetToken);
      if (!storeTarget) return null;
      return sourceUnsigned
        ? [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            "    xor a",
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    ld a,1",
            `${doneLabel}:`,
            ...storeTarget
          ]
        : [
            ...loadSource,
            "    ld a,h",
            "    or l",
            `    jr nz,${nonZeroLabel}`,
            "    xor a",
            `    jr ${doneLabel}`,
            `${nonZeroLabel}:`,
            "    bit 7,h",
            `    jr nz,${negativeLabel}`,
            "    ld a,1",
            `    jr ${doneLabel}`,
            `${negativeLabel}:`,
            "    ld a,$FF",
            `${doneLabel}:`,
            ...storeTarget
          ];
    }
    return null;
  }

  function emitSgnFx16Into(valueToken, targetToken) {
    const scratch = ensureCompareScratch32();
    const storeSource = emitStoreFx16Source(valueToken, scratch.leftLabel);
    if (!storeSource) return null;
    const doneLabel = nextFp5HelperLabel("SGN_DONE");
    const nonZeroLabel = nextFp5HelperLabel("SGN_NONZERO");
    const negativeLabel = nextFp5HelperLabel("SGN_NEG");
    const targetDeclaredType = normalizeDeclaredType(resolveDeclaredValueType(targetToken));

    const zeroTestLines = [
      `    ld a,(${scratch.leftLabel}+0)`,
      "    or a",
      `    jr nz,${nonZeroLabel}`,
      `    ld a,(${scratch.leftLabel}+1)`,
      "    or a",
      `    jr nz,${nonZeroLabel}`,
      `    ld a,(${scratch.leftLabel}+2)`,
      "    or a",
      `    jr nz,${nonZeroLabel}`,
      `    ld a,(${scratch.leftLabel}+3)`,
      "    or a",
      `    jr nz,${nonZeroLabel}`
    ];

    if (getFp5Info(targetToken)) {
      const storeTarget = emitStoreFPA1ToFp5Target(targetToken);
      if (!storeTarget) return null;
      return [
        ...storeSource,
        ...zeroTestLines,
        "    ld hl,0",
        "    call AMY_FP5_U16_TO_FPA1",
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        `    ld a,(${scratch.leftLabel}+3)`,
        "    and $80",
        `    jr nz,${negativeLabel}`,
        "    ld hl,1",
        "    call AMY_FP5_U16_TO_FPA1",
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        "    ld hl,-1",
        "    call AMY_FP5_I16_TO_FPA1",
        `${doneLabel}:`,
        ...storeTarget
      ];
    }

    if (targetDeclaredType === "fix16_16") {
      const zeroStore = emitStoreFx16SignConstant(targetToken, 0);
      const posStore = emitStoreFx16SignConstant(targetToken, 1);
      const negStore = emitStoreFx16SignConstant(targetToken, -1);
      if (!zeroStore || !posStore || !negStore) return null;
      return [
        ...storeSource,
        ...zeroTestLines,
        ...zeroStore,
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        `    ld a,(${scratch.leftLabel}+3)`,
        "    and $80",
        `    jr nz,${negativeLabel}`,
        ...posStore,
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        ...negStore,
        `${doneLabel}:`
      ];
    }

    if (targetDeclaredType === "fix8_8") {
      const zeroStore = emitStoreFix8SignConstant(targetToken, 0);
      const posStore = emitStoreFix8SignConstant(targetToken, 1);
      const negStore = emitStoreFix8SignConstant(targetToken, -1);
      if (!zeroStore || !posStore || !negStore) return null;
      return [
        ...storeSource,
        ...zeroTestLines,
        ...zeroStore,
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        `    ld a,(${scratch.leftLabel}+3)`,
        "    and $80",
        `    jr nz,${negativeLabel}`,
        ...posStore,
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        ...negStore,
        `${doneLabel}:`
      ];
    }

    if (targetDeclaredType === "ufix8_8") return null;
    const runtimeInfo = getRuntimeInfo(targetToken);
    if (!runtimeInfo) return null;

    if (runtimeInfo.type === "int16") {
      const storeTarget = emitStoreInt16FromHL(targetToken);
      if (!storeTarget) return null;
      return [
        ...storeSource,
        ...zeroTestLines,
        "    ld hl,0",
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        `    ld a,(${scratch.leftLabel}+3)`,
        "    and $80",
        `    jr nz,${negativeLabel}`,
        "    ld hl,1",
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        "    ld hl,-1",
        `${doneLabel}:`,
        ...storeTarget
      ];
    }

    if (runtimeInfo.type === "int8") {
      const storeTarget = emitStoreInt8FromA(targetToken);
      if (!storeTarget) return null;
      return [
        ...storeSource,
        ...zeroTestLines,
        "    xor a",
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        `    ld a,(${scratch.leftLabel}+3)`,
        "    and $80",
        `    jr nz,${negativeLabel}`,
        "    ld a,1",
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        "    ld a,$FF",
        `${doneLabel}:`,
        ...storeTarget
      ];
    }
    return null;
  }

  function emitSgnFp5Into(valueToken, targetToken) {
    const literalValue = parseCompileTimeNumericLiteral(valueToken);
    if (literalValue !== null) {
      const folded = emitStoreCompileTimeNumericToTarget(
        targetToken,
        literalValue < 0 ? -1 : literalValue > 0 ? 1 : 0
      );
      if (folded) return folded;
    }
    const loadSource = emitLoadFp5SourceToFPA1(valueToken);
    if (!loadSource) return null;
    const doneLabel = nextFp5HelperLabel("SGN_DONE");
    const nonZeroLabel = nextFp5HelperLabel("SGN_NONZERO");
    const negativeLabel = nextFp5HelperLabel("SGN_NEG");
    if (getFp5Info(targetToken)) {
      const storeTarget = emitStoreFPA1ToFp5Target(targetToken);
      if (!storeTarget) return null;
      return [
        ...loadSource,
        "    ld a,(AMY_FP5_FPA1+4)",
        "    or a",
        `    jr nz,${nonZeroLabel}`,
        "    ld hl,0",
        "    call AMY_FP5_U16_TO_FPA1",
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        "    ld a,(AMY_FP5_FPA1+3)",
        "    and $80",
        `    jr nz,${negativeLabel}`,
        "    ld hl,1",
        "    call AMY_FP5_U16_TO_FPA1",
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        "    ld hl,-1",
        "    call AMY_FP5_I16_TO_FPA1",
        `${doneLabel}:`,
        ...storeTarget
      ];
    }
    const runtimeInfo = getRuntimeInfo(targetToken);
    if (!runtimeInfo) return null;
    if (runtimeInfo.type === "int16") {
      const storeTarget = emitStoreInt16FromHL(targetToken);
      if (!storeTarget) return null;
      return [
        ...loadSource,
        "    ld a,(AMY_FP5_FPA1+4)",
        "    or a",
        `    jr nz,${nonZeroLabel}`,
        "    ld hl,0",
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        "    ld a,(AMY_FP5_FPA1+3)",
        "    and $80",
        `    jr nz,${negativeLabel}`,
        "    ld hl,1",
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        "    ld hl,-1",
        `${doneLabel}:`,
        ...storeTarget
      ];
    }
    if (runtimeInfo.type === "int8") {
      const storeTarget = emitStoreInt8FromA(targetToken);
      if (!storeTarget) return null;
      return [
        ...loadSource,
        "    ld a,(AMY_FP5_FPA1+4)",
        "    or a",
        `    jr nz,${nonZeroLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${nonZeroLabel}:`,
        "    ld a,(AMY_FP5_FPA1+3)",
        "    and $80",
        `    jr nz,${negativeLabel}`,
        "    ld a,1",
        `    jr ${doneLabel}`,
        `${negativeLabel}:`,
        "    ld a,$FF",
        `${doneLabel}:`,
        ...storeTarget
      ];
    }
    return null;
  }

  function emitIntFp5Into(valueToken, targetToken) {
    const literalValue = parseCompileTimeNumericLiteral(valueToken);
    if (literalValue !== null) {
      const folded = emitStoreCompileTimeNumericToTarget(targetToken, Math.floor(literalValue));
      if (folded) return folded;
    }
    const scratch = ensureCompareScratch32();
    const storeSource = emitStoreFp5SourceAsFx16(valueToken, scratch.leftLabel);
    if (!storeSource) return null;
    const floorDoneLabel = nextFp5HelperLabel("INT_DONE");
    const floorLines = [
      "    xor a",
      `    ld (${scratch.leftLabel}+0),a`,
      `    ld (${scratch.leftLabel}+1),a`,
      `${floorDoneLabel}:`
    ];
    const fp5Target = getFp5Info(targetToken);
    if (fp5Target) {
      const storeTarget = emitStoreFx16MemoryAsFp5(scratch.leftLabel, targetToken);
      if (!storeTarget) return null;
      return [...storeSource, ...floorLines, ...storeTarget];
    }
    const fx16Target = getFx16Info(targetToken);
    if (fx16Target) {
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, targetToken);
      if (!storeTarget) return null;
      return [...storeSource, ...floorLines, ...storeTarget];
    }
    const runtimeInfo = getRuntimeInfo(targetToken);
    if (!runtimeInfo) return null;
    if (runtimeInfo.type === "int16") {
      const storeTarget = emitStoreInt16FromHL(targetToken);
      if (!storeTarget) return null;
      return [
        ...storeSource,
        ...floorLines,
        `    ld hl,(${scratch.leftLabel}+2)`,
        ...storeTarget
      ];
    }
    if (runtimeInfo.type === "int8") {
      const storeTarget = emitStoreInt8FromA(targetToken);
      if (!storeTarget) return null;
      return [
        ...storeSource,
        ...floorLines,
        `    ld a,(${scratch.leftLabel}+2)`,
        ...storeTarget
      ];
    }
    return null;
  }

  return {
    getFx16Info,
    getFp5Info,
    emitStoreFx16Source,
    emitCompareFp5Goto,
    emitFx16ArithOp,
    emitFx16MultiplyOp,
    emitFx16DivideOp,
    emitSqrtFx16Into,
    emitAbsFx16Into,
    emitRandomFx16Into,
    emitAbsFp5Into,
    emitRandomFp5Into,
    emitRandomFp5BetweenInto,
    emitFp5ArithOp,
    emitFp5MultiplyOp,
    emitFp5DivideOp,
    emitSqrtFp5Into,
    emitLogFp5Into,
    emitExpFp5Into,
    emitSgnFx16Into,
    emitSgnInt16LikeInto,
    emitSgnFp5Into,
    emitIntFp5Into
  };
}
