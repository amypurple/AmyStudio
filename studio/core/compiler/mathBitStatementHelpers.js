import { checkArithmeticDeprecation } from "./deprecations.js";

export function handleMathBitStatement({
  line,
  rawLine,
  resolveValueType,
  emitMultiplyInt8Op,
  emitMultiplyInt16Op,
  emitDivideInt8Op,
  getRuntimeInfo,
  makeGeneratedLabel,
  emitLoadInt8Into,
  emitStoreInt8FromA,
  emitLoadInt16IntoHL,
  emitStoreInt16FromHL,
  formatIxOffset,
  scopedRuntimeName,
  runtimeTypeSize
}) {
  const _dep = checkArithmeticDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const multiplyByVar = line.match(/^(?:multiply|mul)\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+by\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?|\$[0-9A-Fa-f]+|[0-9]+)$/i);
  if (multiplyByVar) {
    const targetType = resolveValueType(multiplyByVar[1]);
    if (targetType !== "int8" && targetType !== "int16") return { ok: false, handled: true, log: `multiply requires a byte or word RAM variable: ${rawLine}` };
    const code = targetType === "int8"
      ? emitMultiplyInt8Op(multiplyByVar[1], multiplyByVar[2])
      : emitMultiplyInt16Op(multiplyByVar[1], multiplyByVar[2]);
    if (!code) return { ok: false, handled: true, log: `Invalid multiply operands: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const divideByVar = line.match(/^(?:divide|div)\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+by\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?|\$[0-9A-Fa-f]+|[0-9]+)$/i);
  if (divideByVar) {
    if (resolveValueType(divideByVar[1]) !== "int8") return { ok: false, handled: true, log: `divide requires a byte RAM variable: ${rawLine}` };
    const code = emitDivideInt8Op(divideByVar[1], divideByVar[2]);
    if (!code) return { ok: false, handled: true, log: `Invalid divide operands: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const clampVar = line.match(/^clamp\s+([A-Za-z_][A-Za-z0-9_]*)\s+between\s+(.+?)\s+and\s+(.+)$/i);
  if (clampVar) {
    const info = getRuntimeInfo(clampVar[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) return { ok: false, handled: true, log: `clamp requires a scalar byte/word RAM variable: ${rawLine}` };
    const clampNotLow = makeGeneratedLabel("ClampNotLow");
    const clampStore = makeGeneratedLabel("ClampStore");
    if (info.type === "int8") {
      const loadTarget = emitLoadInt8Into("a", clampVar[1]);
      const storeTarget = emitStoreInt8FromA(clampVar[1]);
      if (!loadTarget || !storeTarget) return { ok: false, handled: true, log: `clamp: cannot load/store variable: ${rawLine}` };
      const minLoad = emitLoadInt8Into("b", clampVar[2]);
      const maxLoad = emitLoadInt8Into("b", clampVar[3]);
      if (!minLoad) return { ok: false, handled: true, log: `clamp min must be a byte value: ${rawLine}` };
      if (!maxLoad) return { ok: false, handled: true, log: `clamp max must be a byte value: ${rawLine}` };
      return {
        ok: true,
        handled: true,
        lines: [
          ...minLoad,
          ...loadTarget,
          "    cp b",
          `    jr nc,${clampNotLow}`,
          "    ld a,b",
          `    jr ${clampStore}`,
          `${clampNotLow}:`,
          ...maxLoad,
          ...loadTarget,
          "    cp b",
          `    jr c,${clampStore}`,
          `    jr z,${clampStore}`,
          "    ld a,b",
          `${clampStore}:`,
          ...storeTarget
        ]
      };
    }
    const minLoad = emitLoadInt16IntoHL(clampVar[2]);
    const maxLoad = emitLoadInt16IntoHL(clampVar[3]);
    if (!minLoad) return { ok: false, handled: true, log: `clamp min must be a word value: ${rawLine}` };
    if (!maxLoad) return { ok: false, handled: true, log: `clamp max must be a word value: ${rawLine}` };
    const clampKeep = makeGeneratedLabel("ClampKeep");
    return {
      ok: true,
      handled: true,
      lines: [
        ...minLoad,
        "    ex de,hl",
        ...emitLoadInt16IntoHL(clampVar[1]),
        "    or a",
        "    sbc hl,de",
        `    jr nc,${clampNotLow}`,
        "    ld h,d",
        "    ld l,e",
        `    jr ${clampStore}`,
        `${clampNotLow}:`,
        ...maxLoad,
        "    ex de,hl",
        ...emitLoadInt16IntoHL(clampVar[1]),
        "    or a",
        "    sbc hl,de",
        `    jr c,${clampKeep}`,
        `    jr z,${clampKeep}`,
        "    ld h,d",
        "    ld l,e",
        `    jr ${clampStore}`,
        `${clampKeep}:`,
        ...emitLoadInt16IntoHL(clampVar[1]),
        `${clampStore}:`,
        ...emitStoreInt16FromHL(clampVar[1])
      ]
    };
  }

  const swapVars = line.match(/^swap\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+with\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)$/i);
  if (swapVars) {
    const typeA = resolveValueType(swapVars[1]);
    const typeB = resolveValueType(swapVars[2]);
    if (!typeA || !typeB) return { ok: false, handled: true, log: `swap: both operands must be RAM variables or array elements: ${rawLine}` };
    if (typeA !== typeB) return { ok: false, handled: true, log: `swap requires both operands to be the same type: ${rawLine}` };
    if (typeA === "int8") {
      const loadA = emitLoadInt8Into("a", swapVars[1]);
      const loadB = emitLoadInt8Into("a", swapVars[2]);
      const storeA = emitStoreInt8FromA(swapVars[1]);
      const storeB = emitStoreInt8FromA(swapVars[2]);
      if (!loadA || !loadB || !storeA || !storeB) return { ok: false, handled: true, log: `swap: cannot load/store operands: ${rawLine}` };
      return { ok: true, handled: true, lines: [...loadA, "    ld c,a", ...loadB, ...storeA, "    ld a,c", ...storeB] };
    }
    const loadA = emitLoadInt16IntoHL(swapVars[1]);
    const loadB = emitLoadInt16IntoHL(swapVars[2]);
    const storeA = emitStoreInt16FromHL(swapVars[1]);
    const storeB = emitStoreInt16FromHL(swapVars[2]);
    if (!loadA || !loadB || !storeA || !storeB) return { ok: false, handled: true, log: `swap: cannot load/store operands: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadA, "    push hl", ...loadB, ...storeA, "    pop hl", ...storeB] };
  }

  const setBit = line.match(/^set\s+bit\s+([0-7])\s+of\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (setBit) {
    const info = getRuntimeInfo(setBit[2]);
    const setBitIsRef = !!(info?.isRef && info.refTargetType === "int8");
    if (!info || info.kind === "array" || (!setBitIsRef && info.type !== "int8")) return { ok: false, handled: true, log: `set bit requires a byte RAM variable: ${rawLine}` };
    const n = setBit[1];
    const lines = setBitIsRef
      ? [`    ld l,(${formatIxOffset(info.offset)})`, `    ld h,(${formatIxOffset(info.offset + 1)})`, `    set ${n},(hl)`]
      : info.storage === "stack"
        ? [`    set ${n},(${formatIxOffset(info.offset)})`]
        : [`    ld hl,${scopedRuntimeName(setBit[2])}`, `    set ${n},(hl)`];
    return { ok: true, handled: true, lines };
  }

  const clearBit = line.match(/^(?:clear|reset)\s+bit\s+([0-7])\s+of\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (clearBit) {
    const info = getRuntimeInfo(clearBit[2]);
    const clearBitIsRef = !!(info?.isRef && info.refTargetType === "int8");
    if (!info || info.kind === "array" || (!clearBitIsRef && info.type !== "int8")) return { ok: false, handled: true, log: `clear bit requires a byte RAM variable: ${rawLine}` };
    const n = clearBit[1];
    const lines = clearBitIsRef
      ? [`    ld l,(${formatIxOffset(info.offset)})`, `    ld h,(${formatIxOffset(info.offset + 1)})`, `    res ${n},(hl)`]
      : info.storage === "stack"
        ? [`    res ${n},(${formatIxOffset(info.offset)})`]
        : [`    ld hl,${scopedRuntimeName(clearBit[2])}`, `    res ${n},(hl)`];
    return { ok: true, handled: true, lines };
  }

  const minWithVar = line.match(/^min\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:with|to)\s+(.+)$/i);
  if (minWithVar) {
    const info = getRuntimeInfo(minWithVar[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) return { ok: false, handled: true, log: `min requires a scalar byte/word RAM variable: ${rawLine}` };
    const minDone = makeGeneratedLabel("MinDone");
    const minKeep = makeGeneratedLabel("MinKeep");
    if (info.type === "int8") {
      const loadTarget = emitLoadInt8Into("a", minWithVar[1]);
      const storeTarget = emitStoreInt8FromA(minWithVar[1]);
      if (!loadTarget || !storeTarget) return { ok: false, handled: true, log: `min: cannot load/store variable: ${rawLine}` };
      const rhsLoad = emitLoadInt8Into("b", minWithVar[2]);
      if (!rhsLoad) return { ok: false, handled: true, log: `min: right-hand side must be a byte value: ${rawLine}` };
      return {
        ok: true,
        handled: true,
        lines: [...rhsLoad, ...loadTarget, "    cp b", `    jr c,${minDone}`, `    jr z,${minDone}`, "    ld a,b", `${minDone}:`, ...storeTarget]
      };
    }
    const rhsLoad = emitLoadInt16IntoHL(minWithVar[2]);
    if (!rhsLoad) return { ok: false, handled: true, log: `min: right-hand side must be a word value: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [
        ...rhsLoad,
        "    ex de,hl",
        ...emitLoadInt16IntoHL(minWithVar[1]),
        "    or a",
        "    sbc hl,de",
        `    jr c,${minKeep}`,
        `    jr z,${minKeep}`,
        "    ld h,d",
        "    ld l,e",
        `    jr ${minDone}`,
        `${minKeep}:`,
        ...emitLoadInt16IntoHL(minWithVar[1]),
        `${minDone}:`,
        ...emitStoreInt16FromHL(minWithVar[1])
      ]
    };
  }

  const maxWithVar = line.match(/^max\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:with|to)\s+(.+)$/i);
  if (maxWithVar) {
    const info = getRuntimeInfo(maxWithVar[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) return { ok: false, handled: true, log: `max requires a scalar byte/word RAM variable: ${rawLine}` };
    const maxDone = makeGeneratedLabel("MaxDone");
    const maxKeep = makeGeneratedLabel("MaxKeep");
    if (info.type === "int8") {
      const loadTarget = emitLoadInt8Into("a", maxWithVar[1]);
      const storeTarget = emitStoreInt8FromA(maxWithVar[1]);
      if (!loadTarget || !storeTarget) return { ok: false, handled: true, log: `max: cannot load/store variable: ${rawLine}` };
      const rhsLoad = emitLoadInt8Into("b", maxWithVar[2]);
      if (!rhsLoad) return { ok: false, handled: true, log: `max: right-hand side must be a byte value: ${rawLine}` };
      return {
        ok: true,
        handled: true,
        lines: [...rhsLoad, ...loadTarget, "    cp b", `    jr nc,${maxDone}`, "    ld a,b", `${maxDone}:`, ...storeTarget]
      };
    }
    const rhsLoad = emitLoadInt16IntoHL(maxWithVar[2]);
    if (!rhsLoad) return { ok: false, handled: true, log: `max: right-hand side must be a word value: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [
        ...rhsLoad,
        "    ex de,hl",
        ...emitLoadInt16IntoHL(maxWithVar[1]),
        "    or a",
        "    sbc hl,de",
        `    jr nc,${maxKeep}`,
        "    ld h,d",
        "    ld l,e",
        `    jr ${maxDone}`,
        `${maxKeep}:`,
        ...emitLoadInt16IntoHL(maxWithVar[1]),
        `${maxDone}:`,
        ...emitStoreInt16FromHL(maxWithVar[1])
      ]
    };
  }

  const shiftArray = line.match(/^shift\s+array\s+([A-Za-z_][A-Za-z0-9_]*)\s+(down|up)\s+([0-9]+)$/i);
  if (shiftArray) {
    const arrName = shiftArray[1];
    const direction = shiftArray[2].toLowerCase();
    const count = Number.parseInt(shiftArray[3], 10);
    const info = getRuntimeInfo(arrName);
    if (!info || info.kind !== "array") {
      return { ok: false, handled: true, log: `shift array requires an array variable: ${rawLine}` };
    }
    if (!Number.isInteger(count) || count < 1 || count >= info.length) {
      return { ok: false, handled: true, log: `shift array count must be between 1 and array length-1: ${rawLine}` };
    }
    const elemSize = runtimeTypeSize(info.elementType);
    const byteCount = (info.length - count) * elemSize;
    const byteShift = count * elemSize;
    const arrAsmName = info.asmName;
    const lines = direction === "down"
      ? [
          `    ld hl,${arrAsmName} + ${byteCount - 1}`,
          `    ld de,${arrAsmName} + ${byteCount + byteShift - 1}`,
          `    ld bc,${byteCount}`,
          "    lddr"
        ]
      : [
          `    ld hl,${arrAsmName} + ${byteShift}`,
          `    ld de,${arrAsmName}`,
          `    ld bc,${byteCount}`,
          "    ldir"
        ];
    return { ok: true, handled: true, lines };
  }

  return { handled: false };
}
