import { checkArrayBulkDeprecation } from "./deprecations.js";

export function handleArrayBulkStatement({
  line,
  rawLine,
  getRuntimeInfo,
  runtimeTypeSize,
  symbolOrValue,
  emitLoadInt8Into,
  emitLoadInt8ValueInto,
  emitLoadArrayAddressIntoHL,
  getByteArrayBufferInfo,
  emitStoreInt8FromA,
  resolveValueType,
  makeGeneratedLabel,
  getTileTypeInfo,
  getRecordTypeInfo
}) {
  const _dep = checkArrayBulkDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  function emitJumpOnTileMatchInA(matchToken, jumpLabel) {
    const typeInfo = getTileTypeInfo?.(matchToken);
    if (typeInfo?.values?.length) {
      const lines = [];
      for (const value of typeInfo.values) {
        lines.push(`    cp $${value.toString(16).toUpperCase().padStart(2, "0")}`);
        lines.push(`    jp z,${jumpLabel}`);
      }
      return lines;
    }
    const loadValue = emitLoadInt8ValueInto?.("e", matchToken);
    if (!loadValue) return null;
    return [
      "    ld d,a",
      ...loadValue,
      "    ld a,d",
      "    cp e",
      `    jp z,${jumpLabel}`
    ];
  }

  const qualifiedByteTarget = "[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?(?:\\.[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?)*";
  const replaceInFrame = line.match(new RegExp(`^replace\\s+(.+?)\\s+with\\s+(.+?)\\s+in\\s+(${qualifiedByteTarget})\\s+frame\\s+size\\s+(.+?)\\s*,\\s*(.+?)(?:\\s+into\\s+(${qualifiedByteTarget}))?$`, "i"));
  if (replaceInFrame) {
    const [, matchTokenRaw, replacementToken, bufferName, widthToken, heightToken, countTarget] = replaceInFrame;
    const matchToken = matchTokenRaw.trim();
    const bufferInfo = getByteArrayBufferInfo?.(bufferName, 1) || getRuntimeInfo(bufferName);
    if (!bufferInfo || !["array", "array_field"].includes(bufferInfo.kind) || bufferInfo.elementType !== "int8") {
      return { ok: false, handled: true, log: `replace ... in Buffer frame requires a byte array buffer: ${rawLine}` };
    }
    const countType = countTarget ? resolveValueType?.(countTarget) : null;
    const storeCount = countTarget ? emitStoreInt8FromA(countTarget) : null;
    if (countTarget && (countType !== "int8" || !storeCount)) {
      return { ok: false, handled: true, log: `replace ... frame into Count requires a byte variable: ${rawLine}` };
    }
    const loadBuffer = emitLoadArrayAddressIntoHL(bufferName, "0");
    const loadWidth = emitLoadInt8ValueInto?.("a", widthToken);
    const loadHeight = emitLoadInt8ValueInto?.("a", heightToken);
    const loadReplacement = emitLoadInt8ValueInto?.("a", replacementToken);
    if (!loadBuffer || !loadWidth || !loadHeight || !loadReplacement) {
      return { ok: false, handled: true, log: `replace ... frame requires byte-sized width, height, and replacement: ${rawLine}` };
    }
    const rowLoop = makeGeneratedLabel("ReplaceFrameRow");
    const colLoop = makeGeneratedLabel("ReplaceFrameCol");
    const matched = makeGeneratedLabel("ReplaceFrameMatch");
    const next = makeGeneratedLabel("ReplaceFrameNext");
    const matchJump = emitJumpOnTileMatchInA(matchToken, matched);
    if (!matchJump) {
      return { ok: false, handled: true, log: `replace ... frame match must be a byte value or tile type: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadBuffer,
        ...loadWidth,
        "    ld (AMY_BUFFER32+0),a",
        ...loadHeight,
        "    ld b,a",
        ...loadReplacement,
        "    ld (AMY_BUFFER32+1),a",
        ...(countTarget ? ["    xor a", "    ld (AMY_BUFFER32+2),a"] : []),
        `${rowLoop}:`,
        "    push bc",
        "    ld a,(AMY_BUFFER32+0)",
        "    ld b,a",
        `${colLoop}:`,
        "    ld a,(hl)",
        ...matchJump,
        `    jp ${next}`,
        `${matched}:`,
        "    ld a,(AMY_BUFFER32+1)",
        "    ld (hl),a",
        ...(countTarget ? ["    ld a,(AMY_BUFFER32+2)", "    inc a", "    ld (AMY_BUFFER32+2),a"] : []),
        `${next}:`,
        "    inc hl",
        "    djnz " + colLoop,
        "    pop bc",
        "    djnz " + rowLoop,
        ...(countTarget ? ["    ld a,(AMY_BUFFER32+2)", ...storeCount] : [])
      ]
    };
  }

  const fillRecordField = line.match(/^fill\s+record\s+array\s+([A-Za-z_][A-Za-z0-9_]*)\s+field\s+([A-Za-z_][A-Za-z0-9_]*)\s+with\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)$/i);
  if (fillRecordField) {
    const [, arrayName, fieldName, valueToken] = fillRecordField;
    const arrayInfo = getRuntimeInfo(arrayName);
    if (!arrayInfo || arrayInfo.kind !== "record_array" || !Number.isInteger(arrayInfo.length) || arrayInfo.length < 1 || arrayInfo.length > 255) {
      return { ok: false, handled: true, log: `fill record array requires a fixed record array of 1..255 elements: ${rawLine}` };
    }
    const recordInfo = getRecordTypeInfo?.(arrayInfo.recordTypeName);
    const fieldInfo = recordInfo?.orderedFields?.find((field) => field.name.toLowerCase() === fieldName.toLowerCase());
    if (!fieldInfo || fieldInfo.type !== "int8" || fieldInfo.size !== 1) {
      return { ok: false, handled: true, log: `fill record array currently requires a u8, i8, or bool field: ${rawLine}` };
    }
    const loadValue = emitLoadInt8Into("a", valueToken);
    const loadAddress = Number.isInteger(arrayInfo.address)
      ? [`    ld hl,${arrayInfo.address + fieldInfo.offset}`]
      : null;
    if (!loadValue || !loadAddress) {
      return { ok: false, handled: true, log: `fill record array cannot resolve its value or base address: ${rawLine}` };
    }
    const loop = makeGeneratedLabel("FillRecordFieldLoop");
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadValue,
        ...loadAddress,
        `    ld de,${arrayInfo.recordSize}`,
        `    ld b,${arrayInfo.length}`,
        `${loop}:`,
        "    ld (hl),a",
        "    add hl,de",
        `    djnz ${loop}`
      ]
    };
  }
  const fillArray = line.match(new RegExp(`^fill\\s+array\\s+(${qualifiedByteTarget})\\s+with\\s+([A-Za-z_][A-Za-z0-9_]*|\\$[0-9A-Fa-f]+|[0-9]+)(?:\\s+count\\s+([A-Za-z_][A-Za-z0-9_]*|\\$[0-9A-Fa-f]+|[0-9]+))?$`, "i"));
  if (fillArray) {
    const arrName = fillArray[1];
    const arrInfo = getByteArrayBufferInfo?.(arrName, 1) || getRuntimeInfo(arrName);
    if (!arrInfo || !["array", "array_field"].includes(arrInfo.kind) || arrInfo.elementType !== "int8") {
      return { ok: false, handled: true, log: `fill array requires a byte array variable: ${rawLine}` };
    }
    const countToken = fillArray[3];
    if (countToken && getRuntimeInfo(countToken)) {
      return { ok: false, handled: true, log: `fill array count must be a constant, not a RAM variable: ${rawLine}` };
    }
    const loadValue = emitLoadInt8Into("a", fillArray[2]);
    if (!loadValue) return { ok: false, handled: true, log: `fill array: invalid fill value: ${rawLine}` };
    const baseAddress = emitLoadArrayAddressIntoHL(arrName, "0");
    if (!baseAddress) return { ok: false, handled: true, log: `fill array: cannot resolve array base: ${rawLine}` };
    const fillLoop = makeGeneratedLabel("FillArrayLoop");
    const fillDone = makeGeneratedLabel("FillArrayDone");
    const countVal = countToken ? symbolOrValue(countToken) : arrInfo.length;
    const fixedCountText = String(countVal).trim();
    const fixedCount = /^\$[0-9A-Fa-f]+$/.test(fixedCountText)
      ? parseInt(fixedCountText.slice(1), 16)
      : (/^[0-9]+$/.test(fixedCountText) ? parseInt(fixedCountText, 10) : null);
    if (Number.isInteger(fixedCount) && fixedCount >= 1 && fixedCount <= 255) {
      const byteLoop = makeGeneratedLabel("FillArrayByteLoop");
      const fixedValueText = String(fillArray[2]).trim();
      const fixedValue = /^\$[0-9A-Fa-f]+$/.test(fixedValueText) || /^[0-9]+$/.test(fixedValueText);
      const loadFillValue = fixedValue
        ? ["    ld d," + symbolOrValue(fixedValueText)]
        : [...loadValue, "    ld d,a"];
      return {
        ok: true,
        handled: true,
        lines: [
          ...loadFillValue,
          ...baseAddress,
          "    ld b," + symbolOrValue(fixedCount),
          byteLoop + ":",
          "    ld (hl),d",
          "    inc hl",
          "    djnz " + byteLoop
        ]
      };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadValue,
        "    ld d,a",
        ...baseAddress,
        `    ld bc,${countVal}`,
        `${fillLoop}:`,
        "    ld a,b",
        "    or c",
        `    jr z,${fillDone}`,
        "    ld (hl),d",
        "    inc hl",
        "    dec bc",
        `    jr ${fillLoop}`,
        `${fillDone}:`
      ]
    };
  }

  const copyArray = line.match(/^copy\s+array\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (copyArray) {
    const dstName = copyArray[1];
    const srcName = copyArray[2];
    const dstInfo = getRuntimeInfo(dstName);
    const srcInfo = getRuntimeInfo(srcName);
    if (!dstInfo || dstInfo.kind !== "array" || !srcInfo || srcInfo.kind !== "array") {
      return { ok: false, handled: true, log: `copy array requires two array variables: ${rawLine}` };
    }
    if (dstInfo.elementType !== srcInfo.elementType) {
      return { ok: false, handled: true, log: `copy array requires arrays of the same element type: ${rawLine}` };
    }
    const elemSize = runtimeTypeSize(dstInfo.elementType);
    const countToken = copyArray[3];
    if (countToken && getRuntimeInfo(countToken)) {
      return { ok: false, handled: true, log: `copy array count must be a constant, not a RAM variable: ${rawLine}` };
    }
    const byteCount = countToken
      ? (elemSize === 1 ? symbolOrValue(countToken) : `${symbolOrValue(countToken)}*${elemSize}`)
      : dstInfo.length * elemSize;
    const loadSrc = emitLoadArrayAddressIntoHL(srcName, "0");
    const loadDst = emitLoadArrayAddressIntoHL(dstName, "0");
    if (!loadSrc || !loadDst) return { ok: false, handled: true, log: `copy array: cannot resolve array base: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadSrc,
        "    push hl",
        ...loadDst,
        "    ex de,hl",
        "    pop hl",
        `    ld bc,${byteCount}`,
        "    ldir"
      ]
    };
  }

  const fillRepeating = line.match(/^fill\s+array\s+([A-Za-z_][A-Za-z0-9_]*)\s+repeating\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (fillRepeating) {
    const dstName = fillRepeating[1];
    const srcName = fillRepeating[2];
    const dstInfo = getRuntimeInfo(dstName);
    const srcInfo = getRuntimeInfo(srcName);
    if (!dstInfo || dstInfo.kind !== "array" || dstInfo.elementType !== "int8") {
      return { ok: false, handled: true, log: `fill array repeating requires a byte destination array: ${rawLine}` };
    }
    if (!srcInfo || srcInfo.kind !== "array" || srcInfo.elementType !== "int8") {
      return { ok: false, handled: true, log: `fill array repeating requires a byte source (pattern) array: ${rawLine}` };
    }
    const countToken = fillRepeating[3];
    if (countToken && getRuntimeInfo(countToken)) {
      return { ok: false, handled: true, log: `fill array repeating count must be a constant: ${rawLine}` };
    }
    const totalBytes = countToken ? Number(symbolOrValue(countToken)) : dstInfo.length;
    const srcLen = srcInfo.length;
    if (srcLen >= totalBytes) {
      return { ok: false, handled: true, log: `fill array repeating: pattern length must be less than fill count: ${rawLine}` };
    }
    const loadSrc = emitLoadArrayAddressIntoHL(srcName, "0");
    const loadDst = emitLoadArrayAddressIntoHL(dstName, "0");
    if (!loadSrc || !loadDst) return { ok: false, handled: true, log: `fill array repeating: cannot resolve array base: ${rawLine}` };
    const loadDstBase = emitLoadArrayAddressIntoHL(dstName, "0");
    const loadDstShifted = emitLoadArrayAddressIntoHL(dstName, String(srcLen));
    if (!loadDstBase || !loadDstShifted) return { ok: false, handled: true, log: `fill array repeating: cannot resolve destination offsets: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadSrc,
        "    push hl",
        ...loadDst,
        "    ex de,hl",
        "    pop hl",
        `    ld bc,${srcLen}`,
        "    ldir",
        ...loadDstBase,
        "    push hl",
        ...loadDstShifted,
        "    ex de,hl",
        "    pop hl",
        `    ld bc,${totalBytes - srcLen}`,
        "    ldir"
      ]
    };
  }

  const reverseArray = line.match(/^reverse\s+array\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+from\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (reverseArray) {
    const arrName = reverseArray[1];
    const info = getRuntimeInfo(arrName);
    if (!info || info.kind !== "array" || info.elementType !== "int8") {
      return { ok: false, handled: true, log: `reverse array requires a byte array variable: ${rawLine}` };
    }
    const fromToken = reverseArray[2];
    const countToken = reverseArray[3];
    if ((fromToken && getRuntimeInfo(fromToken)) || (countToken && getRuntimeInfo(countToken))) {
      return { ok: false, handled: true, log: `reverse array from/count must be constants: ${rawLine}` };
    }
    const fromIdx = fromToken ? Number(symbolOrValue(fromToken)) : 0;
    const count = countToken ? Number(symbolOrValue(countToken)) : info.length;
    if (count < 2) return { ok: true, handled: true, lines: [] };
    const revLoop = makeGeneratedLabel("RevLoop");
    const loadFront = emitLoadArrayAddressIntoHL(arrName, String(fromIdx));
    const loadBack = emitLoadArrayAddressIntoHL(arrName, String(fromIdx + count - 1));
    if (!loadFront || !loadBack) return { ok: false, handled: true, log: `reverse array: cannot resolve array slice: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadFront,
        "    push hl",
        ...loadBack,
        "    ex de,hl",
        "    pop hl",
        `    ld b,${Math.floor(count / 2)}`,
        `${revLoop}:`,
        "    ld a,(hl)",
        "    ld c,a",
        "    ld a,(de)",
        "    ld (hl),a",
        "    ld a,c",
        "    ld (de),a",
        "    inc hl",
        "    dec de",
        `    djnz ${revLoop}`
      ]
    };
  }

  return { handled: false };
}
