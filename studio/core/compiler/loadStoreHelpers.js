export function createLoadStoreHelpers(ctx) {
  const {
    parseArrayRef,
    parseRecordFieldRef,
    getRuntimeInfo,
    normalizeExpression,
    resolveValueType,
    runtimeTypeSize,
    isIndexedByteReadable,
    formatHex16,
    formatIxOffset,
    scopedRuntimeName,
    symbolOrValue,
    emitLoadInt8Into,
    makeGeneratedLabel
  } = ctx;

  function emitScaleUnsignedByteAIntoDE(scale) {
    if (!Number.isInteger(scale) || scale < 1) return null;
    if (scale === 1) return ["    ld e,a", "    ld d,0"];
    if (scale === 2) return ["    add a,a", "    ld e,a", "    ld d,0"];
    return [
      "    ld e,a",
      "    ld d,0",
      "    ld l,d",
      "    ld h,d",
      ...Array.from({ length: scale }, () => "    add hl,de"),
      "    ex de,hl"
    ];
  }

  function emitLoadArrayAddressIntoHL(name, indexToken) {
    const info = getRuntimeInfo(name);
    if (!info || (!isIndexedByteReadable(info) && info.kind !== "array" && info.kind !== "record_array")) return null;
    const normalizedIndex = normalizeExpression(indexToken);
    const indexInfo = getRuntimeInfo(normalizedIndex);
    const stride = info.kind === "array"
      ? runtimeTypeSize(info.elementType)
      : info.kind === "record_array"
        ? info.recordSize
        : 1;
    const usesStackBase = info.storage === "stack";
    const base = usesStackBase ? null : info.address;
    if (!indexInfo) {
      if (/^[0-9]+$/.test(normalizedIndex)) {
        const numericIndex = Number.parseInt(normalizedIndex, 10);
        if (!Number.isInteger(numericIndex) || numericIndex < 0) return null;
        if (typeof info.length === "number" && numericIndex >= info.length) return null;
        if (usesStackBase) {
          const offset = info.offset + numericIndex * stride;
          if (offset === 0) return ["    push ix", "    pop hl"];
          return ["    push ix", "    pop hl", `    ld de,${offset}`, "    add hl,de"];
        }
        return [`    ld hl,${formatHex16(base + numericIndex * stride)}`];
      }
      if (/^\$[0-9A-F]+$/i.test(normalizedIndex)) {
        const numericIndex = Number.parseInt(normalizedIndex.slice(1), 16);
        if (typeof info.length === "number" && numericIndex >= info.length) return null;
        if (usesStackBase) {
          const offset = info.offset + numericIndex * stride;
          if (offset === 0) return ["    push ix", "    pop hl"];
          return ["    push ix", "    pop hl", `    ld de,${offset}`, "    add hl,de"];
        }
        return [`    ld hl,${formatHex16(base + numericIndex * stride)}`];
      }
      const indexType = resolveValueType(normalizedIndex);
      if (indexType !== "int8") return null;
      const lines = emitLoadInt8Into("a", normalizedIndex);
      if (!lines) return null;
      const scaleLines = emitScaleUnsignedByteAIntoDE(stride);
      if (!scaleLines) return null;
      lines.push(...scaleLines);
      if (usesStackBase) {
        lines.push("    push ix");
        lines.push("    pop hl");
        if (info.offset !== 0) {
          lines.push(`    ld bc,${info.offset}`);
          lines.push("    add hl,bc");
        }
      } else {
        lines.push(`    ld hl,${formatHex16(base)}`);
      }
      lines.push("    add hl,de");
      return lines;
    }
    if (indexInfo.kind === "array" || indexInfo.type !== "int8") return null;
    const lines = [...emitLoadInt8Into("a", normalizedIndex)];
    const scaleLines = emitScaleUnsignedByteAIntoDE(stride);
    if (!scaleLines) return null;
    lines.push(...scaleLines);
    if (usesStackBase) {
      lines.push("    push ix");
      lines.push("    pop hl");
      if (info.offset !== 0) {
        lines.push(`    ld bc,${info.offset}`);
        lines.push("    add hl,bc");
      }
    } else {
      lines.push(`    ld hl,${formatHex16(base)}`);
    }
    lines.push("    add hl,de");
    return lines;
  }

  function emitLoadRecordFieldAddressIntoHL(token) {
    const fieldRef = parseRecordFieldRef(token);
    if (!fieldRef) return null;
    if (fieldRef.baseKind === "scalar") {
      const info = getRuntimeInfo(fieldRef.name);
      if (!info || info.kind !== "record") return null;
      if (info.storage === "stack") {
        const offset = info.offset + fieldRef.totalOffset;
        if (offset === 0) return ["    push ix", "    pop hl"];
        return ["    push ix", "    pop hl", `    ld de,${offset}`, "    add hl,de"];
      }
      return [`    ld hl,${formatHex16(info.address + fieldRef.totalOffset)}`];
    }
    const info = getRuntimeInfo(fieldRef.name);
    if (!info || info.kind !== "record_array") return null;
    const loadElementAddress = emitLoadArrayAddressIntoHL(fieldRef.name, fieldRef.index);
    if (!loadElementAddress) return null;
    if (!fieldRef.totalOffset) return loadElementAddress;
    return [...loadElementAddress, `    ld de,${fieldRef.totalOffset}`, "    add hl,de"];
  }

  function getDirectRecordFieldAddress(token) {
    const fieldRef = parseRecordFieldRef(token);
    if (!fieldRef) return null;
    const info = getRuntimeInfo(fieldRef.name);
    if (!info || info.storage === "stack") return null;
    if (fieldRef.baseKind === "scalar") {
      if (info.kind !== "record") return null;
      return formatHex16(info.address + fieldRef.totalOffset);
    }
    if (info.kind !== "record_array") return null;
    const normalizedIndex = normalizeExpression(fieldRef.index);
    let numericIndex = null;
    if (/^[0-9]+$/.test(normalizedIndex)) {
      numericIndex = Number.parseInt(normalizedIndex, 10);
    } else if (/^\$[0-9A-F]+$/i.test(normalizedIndex)) {
      numericIndex = Number.parseInt(normalizedIndex.slice(1), 16);
    }
    if (!Number.isInteger(numericIndex) || numericIndex < 0) return null;
    if (typeof info.length === "number" && numericIndex >= info.length) return null;
    return formatHex16(info.address + numericIndex * info.recordSize + fieldRef.totalOffset);
  }

  function getByteArrayBufferInfo(bufferToken, minimumLength) {
    const info = getRuntimeInfo(bufferToken);
    if (!info || info.kind !== "array" || info.elementType !== "int8") return null;
    if (typeof info.length === "number" && info.length < minimumLength) return null;
    return info;
  }

  function addressLoadClobbersA(lines) {
    const clobberRe = /^\s*(?:ld\s+a\s*,|pop\s+af\b|ex\s+af\b|xor\s+a\b|add\s+a\b|adc\s+a\b|sub\b|sbc\s+a\b|and\b|or\b|cp\b|inc\s+a\b|dec\s+a\b|neg\b)/i;
    return (lines || []).some((line) => clobberRe.test(line));
  }
  function emitStoreInt8FromA(target) {
    const recordField = parseRecordFieldRef(target);
    if (recordField) {
      if (recordField.fieldInfo.type !== "int8") return null;
      const directAddress = getDirectRecordFieldAddress(target);
      if (directAddress) return [`    ld (${directAddress}),a`];
      const loadAddress = emitLoadRecordFieldAddressIntoHL(target);
      if (!loadAddress) return null;
      if (!addressLoadClobbersA(loadAddress)) return [...loadAddress, "    ld (hl),a"];
      return ["    push af", ...loadAddress, "    pop af", "    ld (hl),a"];
    }
    const arrayRef = parseArrayRef(target);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info || info.kind !== "array" || info.elementType !== "int8") return null;
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      if (!addressLoadClobbersA(loadAddress)) return [...loadAddress, "    ld (hl),a"];
      return ["    push af", ...loadAddress, "    pop af", "    ld (hl),a"];
    }
    const resolvedTarget = scopedRuntimeName(target);
    const info = getRuntimeInfo(target);
    if (!info || info.type !== "int8") return null;
    if (info.kind === "packed_bool") {
      const clearLabel = makeGeneratedLabel("BoolClear");
      const doneLabel = makeGeneratedLabel("BoolDone");
      const targetRef = info.storage === "stack" ? formatIxOffset(info.packOffset ?? info.offset) : info.packLabel;
      return [
        "    or a",
        `    jr z,${clearLabel}`,
        ...(info.storage === "stack" ? [`    set ${info.bit},(${targetRef})`] : [`    ld hl,${targetRef}`, `    set ${info.bit},(hl)`]),
        `    jr ${doneLabel}`,
        `${clearLabel}:`,
        ...(info.storage === "stack" ? [`    res ${info.bit},(${targetRef})`] : [`    ld hl,${targetRef}`, `    res ${info.bit},(hl)`]),
        `${doneLabel}:`
      ];
    }
    if (info.storage === "stack") return [`    ld (${formatIxOffset(info.offset)}),a`];
    return [`    ld (${resolvedTarget}),a`];
  }

  function emitStoreInt16FromHL(target) {
    const recordField = parseRecordFieldRef(target);
    if (recordField) {
      if (recordField.fieldInfo.type !== "int16") return null;
      const directAddress = getDirectRecordFieldAddress(target);
      if (directAddress) {
        return [
          "    ld a,l",
          `    ld (${directAddress}+0),a`,
          "    ld a,h",
          `    ld (${directAddress}+1),a`
        ];
      }
      const loadAddress = emitLoadRecordFieldAddressIntoHL(target);
      if (!loadAddress) return null;
      return ["    push hl", ...loadAddress, "    pop de", "    ld (hl),e", "    inc hl", "    ld (hl),d"];
    }
    const arrayRef = parseArrayRef(target);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info || info.kind !== "array" || info.elementType !== "int16") return null;
      const loadAddress = emitLoadArrayAddressIntoHL(arrayRef.name, arrayRef.index);
      if (!loadAddress) return null;
      return ["    push hl", ...loadAddress, "    pop de", "    ld (hl),e", "    inc hl", "    ld (hl),d"];
    }
    const resolvedTarget = scopedRuntimeName(target);
    const info = getRuntimeInfo(target);
    if (!info || info.type !== "int16") return null;
    if (info.storage === "stack") {
      return [
        "    ld a,l",
        `    ld (${formatIxOffset(info.offset)}),a`,
        "    ld a,h",
        `    ld (${formatIxOffset(info.offset + 1)}),a`
      ];
    }
    return [
      "    ld a,l",
      `    ld (${resolvedTarget}+0),a`,
      "    ld a,h",
      `    ld (${resolvedTarget}+1),a`
    ];
  }

  return {
    emitLoadArrayAddressIntoHL,
    emitLoadRecordFieldAddressIntoHL,
    getDirectRecordFieldAddress,
    getByteArrayBufferInfo,
    emitStoreInt8FromA,
    emitStoreInt16FromHL
  };
}
