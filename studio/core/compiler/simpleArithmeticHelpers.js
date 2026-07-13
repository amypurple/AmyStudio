export function createSimpleArithmeticHelpers({
  emitLoadInt8Into,
  emitStoreInt8FromA,
  resolveValueType,
  symbolOrValue,
  getRuntimeInfo,
  resolveDeclaredValueType,
  isAnyFixedDeclaredType,
  isSignedDeclaredType,
  parseFixedPointLiteral,
  formatFixedPointLiteral16,
  parseNumericLiteral,
  emitLoadInt16IntoHL,
  emitStoreInt16FromHL,
  parseArrayRef,
  normalizeDeclaredType,
  scopedRuntimeName,
  formatIxOffset
}) {
  function emitArithInt8Op(target, valueToken, op) {
    const loadTarget = emitLoadInt8Into("a", target);
    const storeTarget = emitStoreInt8FromA(target);
    if (!loadTarget || !storeTarget) return null;
    const valueType = resolveValueType(valueToken);
    if (valueType) {
      if (valueType !== "int8") return null;
      const loadValue = emitLoadInt8Into("b", valueToken);
      if (!loadValue) return null;
      const opInstr = { add: "    add a,b", sub: "    sub b", and: "    and b", or: "    or b", xor: "    xor b" }[op];
      if (!opInstr) return null;
      return [...loadValue, ...loadTarget, opInstr, ...storeTarget];
    }
    const norm = symbolOrValue(valueToken);
    const opInstr = { add: `    add a,${norm}`, sub: `    sub ${norm}`, and: `    and ${norm}`, or: `    or ${norm}`, xor: `    xor ${norm}` }[op];
    if (!opInstr) return null;
    return [...loadTarget, opInstr, ...storeTarget];
  }

  function emitLoadInt16ArithSourceIntoDE(valueToken, preferredDeclaredType = null) {
    const valueInfo = getRuntimeInfo(valueToken);
    const declaredType = resolveDeclaredValueType(valueToken);
    if (valueInfo) {
      if (valueInfo.kind === "array") return null;
      if (isAnyFixedDeclaredType(preferredDeclaredType) && valueInfo.type === "int8") {
        const loadValue = emitLoadInt8Into("a", valueToken);
        if (!loadValue) return null;
        return [...loadValue, "    ld d,a", "    ld e,0"];
      }
      if (valueInfo.type === "int16") {
        if (valueInfo.storage !== "stack" && valueInfo.asmName) {
          return [`    ld de,(${valueInfo.asmName})`];
        }
        const loadValue = emitLoadInt16IntoHL(valueToken, preferredDeclaredType);
        if (!loadValue) return null;
        return [...loadValue, "    ex de,hl"];
      }
      if (valueInfo.type === "int8") {
        const loadValue = emitLoadInt8Into("a", valueToken);
        if (!loadValue) return null;
        if (isSignedDeclaredType(declaredType)) {
          return [...loadValue, "    ld e,a", "    add a,a", "    sbc a,a", "    ld d,a"];
        }
        return [...loadValue, "    ld e,a", "    ld d,0"];
      }
      return null;
    }
    if (isAnyFixedDeclaredType(preferredDeclaredType)) {
      const fixedLiteral = parseFixedPointLiteral(valueToken);
      if (fixedLiteral !== null) return [`    ld de,${formatFixedPointLiteral16(fixedLiteral)}`];
    }
    const numeric = parseNumericLiteral(valueToken);
    if (numeric !== null) {
      return [`    ld de,${numeric}`];
    }
    return [`    ld de,${symbolOrValue(valueToken)}`];
  }

  function emitArithInt16Op(target, valueToken, op) {
    const targetDeclared = resolveDeclaredValueType(target);
    const loadTarget = emitLoadInt16IntoHL(target);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadTarget || !storeTarget) return null;
    const valueInfo = getRuntimeInfo(valueToken);
    let loadValue = null;
    if (valueInfo && valueInfo.kind !== "array" && valueInfo.type === "int16") {
      if (valueInfo.storage !== "stack" && valueInfo.asmName) {
        loadValue = [`    ld de,(${valueInfo.asmName})`];
      } else {
        const loadSource = emitLoadInt16IntoHL(valueToken, targetDeclared);
        if (!loadSource) return null;
        loadValue = ["    push hl", ...loadSource, "    ex de,hl", "    pop hl"];
      }
    } else {
      loadValue = emitLoadInt16ArithSourceIntoDE(valueToken, targetDeclared);
      if (!loadValue) return null;
    }
    if (op === "add") return [...loadTarget, ...loadValue, "    add hl,de", ...storeTarget];
    if (op === "sub") return [...loadTarget, ...loadValue, "    or a", "    sbc hl,de", ...storeTarget];
    return null;
  }

  function emitShiftVar(target, direction) {
    const info = getRuntimeInfo(target);
    if (!info || info.kind === "array") return null;
    if (info.isRef && info.refTargetType === "int8") {
      const instr = direction === "left" ? "sla" : "srl";
      return [
        `    ld l,(${formatIxOffset(info.offset)})`,
        `    ld h,(${formatIxOffset(info.offset + 1)})`,
        `    ${instr} (hl)`
      ];
    }
    if (info.type === "int8") {
      const instr = direction === "left" ? "sla" : "srl";
      if (info.storage === "stack") return [`    ${instr} (${formatIxOffset(info.offset)})`];
      const resolvedTarget = scopedRuntimeName(target);
      return [`    ld hl,${resolvedTarget}`, `    ${instr} (hl)`];
    }
    const loadTarget = emitLoadInt16IntoHL(target);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadTarget || !storeTarget) return null;
    if (direction === "left") return [...loadTarget, "    add hl,hl", ...storeTarget];
    return [...loadTarget, "    srl h", "    rr l", ...storeTarget];
  }

  function emitShiftVarByN(target, direction, n) {
    if (n < 1 || n > 7) return null;
    const info = getRuntimeInfo(target);
    if (!info || info.kind === "array") return null;
    if (info.isRef && info.refTargetType === "int8") {
      const instr = direction === "left" ? "sla" : "srl";
      return [
        `    ld l,(${formatIxOffset(info.offset)})`,
        `    ld h,(${formatIxOffset(info.offset + 1)})`,
        ...Array.from({ length: n }, () => `    ${instr} (hl)`)
      ];
    }
    if (info.type === "int8") {
      const instr = direction === "left" ? "sla" : "srl";
      if (info.storage === "stack") {
        return Array.from({ length: n }, () => `    ${instr} (${formatIxOffset(info.offset)})`);
      }
      const resolvedTarget = scopedRuntimeName(target);
      const lines = [`    ld hl,${resolvedTarget}`];
      for (let i = 0; i < n; i += 1) lines.push(`    ${instr} (hl)`);
      return lines;
    }
    const loadTarget = emitLoadInt16IntoHL(target);
    const storeTarget = emitStoreInt16FromHL(target);
    if (!loadTarget || !storeTarget) return null;
    if (direction === "left") {
      return [...loadTarget, ...Array.from({ length: n }, () => "    add hl,hl"), ...storeTarget];
    }
    const shiftLines = [];
    for (let i = 0; i < n; i += 1) {
      shiftLines.push("    srl h");
      shiftLines.push("    rr l");
    }
    return [...loadTarget, ...shiftLines, ...storeTarget];
  }

  return {
    emitArithInt8Op,
    emitLoadInt16ArithSourceIntoDE,
    emitArithInt16Op,
    emitShiftVar,
    emitShiftVarByN
  };
}
