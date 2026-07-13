import { checkArithmeticDeprecation, checkShiftDeprecation } from "./deprecations.js";

export function handleMutateStatement({
  line,
  rawLine,
  parseArrayRef,
  getRuntimeInfo,
  resolveValueType,
  scopedRuntimeName,
  emitLoadArrayAddressIntoHL,
  ensureCompareScratch32,
  emitStoreExtended32,
  emitStoreMemory32ToTarget,
  makeGeneratedLabel,
  formatIxOffset,
  emitU32Inc,
  emitArith32Op,
  emitFx16ArithOp,
  emitLoadInt16IntoHL,
  emitStoreInt16FromHL,
  normalizeExpression,
  emitBcdAdd,
  emitBcdSub,
  emitArithInt8Op,
  emitArithInt16Op,
  emitShiftVar,
  emitShiftVarByN,
  emitLoadInt8Into,
  emitStoreInt8FromA
}) {
  const _dep = checkArithmeticDeprecation(line, rawLine);
  if (_dep.handled) return _dep;
  const _depShift = checkShiftDeprecation(line, rawLine);
  if (_depShift.handled) return _depShift;

  const incDecVar = line.match(/^(inc|dec)\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)$/i);
  if (incDecVar) {
    const op = incDecVar[1].toLowerCase();
    const name = incDecVar[2];
    const arrayRef = parseArrayRef(name);
    const info = arrayRef ? getRuntimeInfo(arrayRef.name) : getRuntimeInfo(name);
    if (!info) return { ok: false, handled: true, log: `Unknown runtime variable: ${name}` };
    const valueType = resolveValueType(name);
    const resolvedName = scopedRuntimeName(name);
    if (arrayRef) {
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return { ok: false, handled: true, log: `Invalid array index expression: ${rawLine}` };
      if (valueType === "int8") {
        return { ok: true, handled: true, lines: [...loadAddress, `    ${op} (hl)`] };
      }
      if (valueType === "u32" || valueType === "i32") {
        const scratch = ensureCompareScratch32();
        const storeValue = emitStoreExtended32(name, scratch.leftLabel);
        const bumpValue = op === "inc"
          ? [`    ld hl,${scratch.leftLabel}`, "    call AMY_U32_INC"]
          : [`    ld hl,${scratch.leftLabel}`, `    ld de,${scratch.rightLabel}`, "    call AMY_U32_ZERO", "    ld a,$01", `    ld (${scratch.rightLabel}+0),a`, "    call AMY_U32_SUB"];
        const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
        if (!storeValue || !storeTarget) return { ok: false, handled: true, log: `Invalid ${op} target: ${rawLine}` };
        return { ok: true, handled: true, lines: [...storeValue, ...bumpValue, ...storeTarget] };
      }
      const doneLabel = makeGeneratedLabel("ArrayWordDone");
      const lines = [...loadAddress];
      if (op === "inc") {
        lines.push("    inc (hl)", `    jr nz,${doneLabel}`, "    inc hl", "    inc (hl)");
      } else {
        lines.push("    ld a,(hl)", "    dec (hl)", "    cp 0", `    jr nz,${doneLabel}`, "    inc hl", "    dec (hl)");
      }
      lines.push(`${doneLabel}:`);
      return { ok: true, handled: true, lines };
    }
    if (info.isRef && info.refTargetType === "int8") {
      const lines = [
        `    ld l,(${formatIxOffset(info.offset)})`,
        `    ld h,(${formatIxOffset(info.offset + 1)})`,
        `    ${op} (hl)`
      ];
      return { ok: true, handled: true, lines };
    }
    if (info.isRef && info.refTargetType === "int16") {
      const doneLabel = makeGeneratedLabel("RefWordDone");
      const lines = [
        `    ld l,(${formatIxOffset(info.offset)})`,
        `    ld h,(${formatIxOffset(info.offset + 1)})`
      ];
      if (op === "inc") {
        lines.push("    inc (hl)", `    jr nz,${doneLabel}`, "    inc hl", "    inc (hl)");
      } else {
        lines.push("    ld a,(hl)", "    dec (hl)", "    cp 0", `    jr nz,${doneLabel}`, "    inc hl", "    dec (hl)");
      }
      lines.push(`${doneLabel}:`);
      return { ok: true, handled: true, lines };
    }
    if (info.type === "int8") {
      const lines = info.storage === "stack"
        ? [`    ${op} (${formatIxOffset(info.offset)})`]
        : [`    ld hl,${resolvedName}`, `    ${op} (hl)`];
      return { ok: true, handled: true, lines };
    }
    if (valueType === "u32" || valueType === "i32") {
      const fx16 = getRuntimeInfo(name);
      if (fx16?.kind === "fix16_16") {
        // inc/dec by 1.0 = 0x00010000 in 16.16
        const code = emitFx16ArithOp(name, "1", op === "inc" ? "add" : "sub");
        if (!code) return { ok: false, handled: true, log: `Invalid ${op} target: ${rawLine}` };
        return { ok: true, handled: true, lines: code };
      }
      const code = op === "inc" ? emitU32Inc(name) : emitArith32Op(name, "1", "sub");
      if (!code) return { ok: false, handled: true, log: `Invalid ${op} target: ${rawLine}` };
      return { ok: true, handled: true, lines: code };
    }
    const loadWord = emitLoadInt16IntoHL(name);
    const storeWord = emitStoreInt16FromHL(name);
    if (!loadWord || !storeWord) return { ok: false, handled: true, log: `Invalid ${op} target: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadWord, `    ${op} hl`, ...storeWord] };
  }

  const addByVar = line.match(/^add\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+by\s+(.+)$/i);
  const addToVar = !addByVar && line.match(/^add\s+(.+)\s+to\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)$/i);
  if (addByVar || addToVar) {
    const target = addByVar ? addByVar[1] : addToVar[2];
    const valueToken = normalizeExpression(addByVar ? addByVar[2] : addToVar[1]);
    const targetType = resolveValueType(target);
    if (!targetType) return { ok: false, handled: true, log: `add target must be a RAM variable: ${rawLine}` };
    let code = null;
    if (targetType === "bcd") code = emitBcdAdd(target, valueToken);
    else if (targetType === "u32" || targetType === "i32") code = emitArith32Op(target, valueToken, "add");
    else code = targetType === "int8" ? emitArithInt8Op(target, valueToken, "add") : emitArithInt16Op(target, valueToken, "add");
    if (!code) return { ok: false, handled: true, log: `Invalid add operands: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const subByVar = line.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+by\s+(.+)$/i);
  const subFromVar = !subByVar && line.match(/^subtract\s+(.+)\s+from\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)$/i);
  if (subByVar || subFromVar) {
    const target = subByVar ? subByVar[1] : subFromVar[2];
    const valueToken = normalizeExpression(subByVar ? subByVar[2] : subFromVar[1]);
    const targetType = resolveValueType(target);
    if (!targetType) return { ok: false, handled: true, log: `sub target must be a RAM variable: ${rawLine}` };
    let code = null;
    if (targetType === "bcd") code = emitBcdSub(target, valueToken);
    else if (targetType === "u32" || targetType === "i32") code = emitArith32Op(target, valueToken, "sub");
    else code = targetType === "int8" ? emitArithInt8Op(target, valueToken, "sub") : emitArithInt16Op(target, valueToken, "sub");
    if (!code) return { ok: false, handled: true, log: `Invalid sub operands: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const andWithVar = line.match(/^and\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+with\s+(.+)$/i);
  if (andWithVar) {
    if (resolveValueType(andWithVar[1]) !== "int8") return { ok: false, handled: true, log: `and with requires a byte RAM variable: ${rawLine}` };
    const code = emitArithInt8Op(andWithVar[1], normalizeExpression(andWithVar[2]), "and");
    if (!code) return { ok: false, handled: true, log: `Invalid and operands: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const orWithVar = line.match(/^or\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+with\s+(.+)$/i);
  if (orWithVar) {
    if (resolveValueType(orWithVar[1]) !== "int8") return { ok: false, handled: true, log: `or with requires a byte RAM variable: ${rawLine}` };
    const code = emitArithInt8Op(orWithVar[1], normalizeExpression(orWithVar[2]), "or");
    if (!code) return { ok: false, handled: true, log: `Invalid or operands: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const xorWithVar = line.match(/^xor\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+with\s+(.+)$/i);
  if (xorWithVar) {
    if (resolveValueType(xorWithVar[1]) !== "int8") return { ok: false, handled: true, log: `xor with requires a byte RAM variable: ${rawLine}` };
    const code = emitArithInt8Op(xorWithVar[1], normalizeExpression(xorWithVar[2]), "xor");
    if (!code) return { ok: false, handled: true, log: `Invalid xor operands: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const shiftLeftVar = line.match(/^(?:shift\s+left|shl)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (shiftLeftVar) {
    const code = emitShiftVar(shiftLeftVar[1], "left");
    if (!code) return { ok: false, handled: true, log: `shift left requires a scalar RAM variable: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const shiftRightVar = line.match(/^(?:shift\s+right|shr)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (shiftRightVar) {
    const code = emitShiftVar(shiftRightVar[1], "right");
    if (!code) return { ok: false, handled: true, log: `shift right requires a scalar RAM variable: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const shiftLeftByN = line.match(/^(?:shift\s+left|shl)\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+([1-7])$/i);
  if (shiftLeftByN) {
    const code = emitShiftVarByN(shiftLeftByN[1], "left", parseInt(shiftLeftByN[2], 10));
    if (!code) return { ok: false, handled: true, log: `shift left by N requires a scalar RAM variable: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const shiftRightByN = line.match(/^(?:shift\s+right|shr)\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+([1-7])$/i);
  if (shiftRightByN) {
    const code = emitShiftVarByN(shiftRightByN[1], "right", parseInt(shiftRightByN[2], 10));
    if (!code) return { ok: false, handled: true, log: `shift right by N requires a scalar RAM variable: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const shiftAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(<<=|>>=)\s*([1-7])$/);
  if (shiftAssign) {
    const direction = shiftAssign[2] === "<<=" ? "left" : "right";
    const code = emitShiftVarByN(shiftAssign[1], direction, parseInt(shiftAssign[3], 10));
    if (!code) return { ok: false, handled: true, log: `${shiftAssign[2]} requires a scalar RAM variable: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const negateVar = line.match(/^negate\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (negateVar) {
    const info = getRuntimeInfo(negateVar[1]);
    if (!info || info.kind === "array" || info.type !== "int8") return { ok: false, handled: true, log: `negate requires a byte RAM variable: ${rawLine}` };
    const loadTarget = emitLoadInt8Into("a", negateVar[1]);
    const storeTarget = emitStoreInt8FromA(negateVar[1]);
    if (!loadTarget || !storeTarget) return { ok: false, handled: true, log: `negate: cannot load/store variable: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadTarget, "    neg", ...storeTarget] };
  }

  const notVar = line.match(/^not\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (notVar) {
    const info = getRuntimeInfo(notVar[1]);
    if (!info || info.kind === "array" || info.type !== "int8") return { ok: false, handled: true, log: `not requires a byte RAM variable: ${rawLine}` };
    const loadTarget = emitLoadInt8Into("a", notVar[1]);
    const storeTarget = emitStoreInt8FromA(notVar[1]);
    if (!loadTarget || !storeTarget) return { ok: false, handled: true, log: `not: cannot load/store variable: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadTarget, "    cpl", ...storeTarget] };
  }

  const toggleVar = line.match(/^toggle\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (toggleVar) {
    const info = getRuntimeInfo(toggleVar[1]);
    if (!info || info.kind === "array") return { ok: false, handled: true, log: `toggle requires a scalar RAM variable: ${rawLine}` };
    if (info.kind === "packed_bool") {
      const maskHex = `$${(1 << info.bit).toString(16).toUpperCase().padStart(2, "0")}`;
      if (info.storage === "stack") {
        const ref = formatIxOffset(info.packOffset ?? info.offset);
        return {
          ok: true,
          handled: true,
          lines: [`    ld a,(${ref})`, `    xor ${maskHex}`, `    ld (${ref}),a`]
        };
      }
      return {
        ok: true,
        handled: true,
        lines: [`    ld hl,${info.packLabel}`, "    ld a,(hl)", `    xor ${maskHex}`, "    ld (hl),a"]
      };
    }
    if (info.type === "int8") {
      const loadTarget = emitLoadInt8Into("a", toggleVar[1]);
      const storeTarget = emitStoreInt8FromA(toggleVar[1]);
      if (!loadTarget || !storeTarget) return { ok: false, handled: true, log: `toggle: cannot load/store variable: ${rawLine}` };
      const setFalseLabel = makeGeneratedLabel("ToggleFalse");
      const doneLabel = makeGeneratedLabel("ToggleDone");
      return {
        ok: true,
        handled: true,
        lines: [
          ...loadTarget,
          "    or a",
          `    jr nz,${setFalseLabel}`,
          "    ld a,1",
          `    jr ${doneLabel}`,
          `${setFalseLabel}:`,
          "    xor a",
          `${doneLabel}:`,
          ...storeTarget
        ]
      };
    }
    return { ok: false, handled: true, log: `toggle requires a byte or boolean variable: ${rawLine}` };
  }

  return { handled: false };
}
