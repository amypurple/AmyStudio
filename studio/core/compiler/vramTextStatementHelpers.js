const colecoColorNames = new Map([
  ["transparent", 0],
  ["black", 1],
  ["medium green", 2],
  ["green", 2],
  ["light green", 3],
  ["dark blue", 4],
  ["blue", 4],
  ["light blue", 5],
  ["sky blue", 5],
  ["dark red", 6],
  ["cyan", 7],
  ["turquoise", 7],
  ["medium red", 8],
  ["red", 8],
  ["light red", 9],
  ["dark yellow", 10],
  ["brown", 10],
  ["light yellow", 11],
  ["yellow", 11],
  ["dark green", 12],
  ["magenta", 13],
  ["gray", 14],
  ["grey", 14],
  ["white", 15]
]);

import { checkVramCharReadDeprecation, checkVramPutReorderDeprecation } from "./deprecations.js";
import { emitLoadRoutineByteInputsFromTokens } from "./routineRegisterLoadHelpers.js";

export function handleVramTextStatement({
  line,
  rawLine,
  addCompilerWarning,
  normalizeExpression,
  tryEvaluateConstantExpression,
  resolveAddressSymbol,
  emitLoadVramAddressIntoHL,
  emitLoadVramAddressIntoDE,
  emitLoadSourceAddressIntoHL,
  assets,
  getRuntimeInfo,
  getByteArrayBufferInfo,
  emitLoadArrayAddressIntoHL,
  emitLoadCountIntoBC,
  isDefinitelyByteSizedCount,
  runtimeTypeSize,
  symbolOrValue,
  dataLengths,
  precomputedSprite16Lengths,
  emitDefineCharsToPattern,
  emitDefineColorsToPattern,
  emitLoadInt8ValueInto,
  emitLoadInt8ValueIntoPreserving,
  emitLoadInt16IntoHL,
  parseRecordFieldRef,
  emitLoadRecordFieldAddressIntoHL,
  emitStoreExtended32,
  emitLoadCountIntoDE,
  parseArrayRef,
  emitStoreInt8FromA,
  currentGraphicsMode,
  getTileTypeInfo,
  makeGeneratedLabel
}) {
  const _depVramPut = checkVramPutReorderDeprecation(line, rawLine);
  if (_depVramPut.handled) return _depVramPut;
  const _depVramRead = checkVramCharReadDeprecation(line, rawLine);
  if (_depVramRead.handled) return _depVramRead;


  function parseColecoColorNibble(token) {
    const normalized = String(token || "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
    if (colecoColorNames.has(normalized)) return colecoColorNames.get(normalized);
    const value = tryEvaluateConstantExpression?.(token);
    if (Number.isInteger(value) && value >= 0 && value <= 15) return value;
    return null;
  }

  function isKnownDataSource(sourceExpr, minimumLength = 1) {
    const name = String(sourceExpr || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return false;
    const length = dataLengths?.get(name);
    return typeof length === "number" && length >= minimumLength;
  }

  function getKnownByteSourceLength(sourceExpr) {
    const name = String(sourceExpr || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;
    const dataLength = dataLengths?.get(name);
    if (typeof dataLength === "number") return dataLength;
    const info = getRuntimeInfo(name);
    if (info?.kind === "array" && info.elementType === "int8" && typeof info.length === "number") {
      return info.length;
    }
    return null;
  }

  function emitPutCountLines(sourceName, count, xToken, yToken, errorLabel) {
    if (!Number.isInteger(count) || count < 1 || count > 255) {
      return { ok: false, log: `${errorLabel} requires a known byte source length from 1 to 255: ${rawLine}` };
    }
    const loadSource = emitLoadSourceAddressIntoHL(sourceName);
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_PUT_AT",
      values: { d: yToken, e: xToken, b: String(count) },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs || !loadSource) {
      return { ok: false, log: `${errorLabel} requires a byte source plus byte-sized coordinates: ${rawLine}` };
    }
    return { ok: true, lines: [...loadSource, ...loadInputs, "    call AMY_PUT_AT"] };
  }

  function emitLoadPixelTileCoord(register, token) {
    const load = emitLoadInt8ValueInto("a", token);
    if (!load) return null;
    const lines = [
      ...load,
      "    srl a",
      "    srl a",
      "    srl a"
    ];
    if (register.toLowerCase() !== "a") lines.push(`    ld ${register},a`);
    return lines;
  }

  function emitLoadPixelTileBoxBounds(coordToken, sizeToken, startOffset, endOffset, emptyLabel) {
    const loadCoord = emitLoadInt8ValueInto("a", coordToken);
    const loadSize = emitLoadInt8ValueInto("b", sizeToken);
    if (!loadCoord || !loadSize) return null;
    return [
      ...loadCoord,
      "    ld (AMY_BUFFER32+5),a",
      "    srl a",
      "    srl a",
      "    srl a",
      `    ld (AMY_BUFFER32+${startOffset}),a`,
      ...loadSize,
      "    ld a,b",
      "    or a",
      `    jp z,${emptyLabel}`,
      "    ld a,(AMY_BUFFER32+5)",
      "    add a,b",
      "    sub 1",
      "    srl a",
      "    srl a",
      "    srl a",
      `    ld (AMY_BUFFER32+${endOffset}),a`
    ];
  }

  function emitJumpOnTileTypeInA(typeName, jumpLabel) {
    const typeInfo = getTileTypeInfo?.(typeName);
    if (!typeInfo || !typeInfo.values?.length) return null;
    const lines = [];
    for (const value of typeInfo.values) {
      lines.push(`    cp $${value.toString(16).toUpperCase().padStart(2, "0")}`);
      lines.push(`    jp z,${jumpLabel}`);
    }
    return lines;
  }

  function emitRejectWrappedTileBounds(doneLabel) {
    return [
      "    ld a,(AMY_BUFFER32+0)",
      "    ld b,a",
      "    ld a,(AMY_BUFFER32+1)",
      "    cp b",
      `    jp c,${doneLabel}`,
      "    ld a,(AMY_BUFFER32+2)",
      "    ld b,a",
      "    ld a,(AMY_BUFFER32+3)",
      "    cp b",
      `    jp c,${doneLabel}`
    ];
  }

  const decompInferred = line.match(/^decompress\s+([A-Za-z_][A-Za-z0-9_]*)\s+to\s+vram\.(pattern|color|name|spr_pat|spr_attr)$/i);
  if (decompInferred) {
    const sourceName = decompInferred[1];
    const target = decompInferred[2].toLowerCase();
    const declaredAsset = assets.find((asset) => asset.name === sourceName);
    if (!declaredAsset?.codec) {
      return {
        ok: false,
        handled: true,
        log: `decompress ${sourceName} to vram.${target} needs a declared asset codec; use "decompress codec ${sourceName} to vram.${target}" for raw data labels.`
      };
    }
    const codec = declaredAsset.codec.toLowerCase() === "rle" ? "mdkrle" : declaredAsset.codec.toLowerCase();
    if (codec === "raw") {
      return {
        ok: false,
        handled: true,
        log: `decompress ${sourceName} to vram.${target} cannot use a raw asset; use copy ${sourceName} count N to vram.${target}.`
      };
    }
    const targetLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME", spr_pat: "VRAM_SPR_PAT", spr_attr: "VRAM_SPR_ATTR" }[target];
    return {
      ok: true,
      handled: true,
      lines: [`    ld hl,Asset_${sourceName}`, `    ld de,${targetLabel}`, `    call ${codec}_decompress`]
    };
  }

  const decomp = line.match(/^decompress\s+(zx0|zx7|dan1|dan2|dan3|mdkrle|pletter|lzf|bitbuster|nibble|rle)\s+([A-Za-z_][A-Za-z0-9_]*)\s+to\s+vram\.(pattern|color|name|spr_pat|spr_attr)$/i);
  if (decomp) {
    const codec = decomp[1].toLowerCase() === "rle" ? "mdkrle" : decomp[1].toLowerCase();
    const sourceName = decomp[2];
    const target = decomp[3].toLowerCase();
    const targetLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME", spr_pat: "VRAM_SPR_PAT", spr_attr: "VRAM_SPR_ATTR" }[target];
    const declaredAsset = assets.find((asset) => asset.name === sourceName);
    return {
      ok: true,
      handled: true,
      lines: [`    ld hl,${declaredAsset ? `Asset_${sourceName}` : resolveAddressSymbol(sourceName)}`, `    ld de,${targetLabel}`, `    call ${codec}_decompress`]
    };
  }

  const backdrop = line.match(/^backdrop(?:\s+color)?\s+(.+)$/i);
  if (backdrop) {
    const color = parseColecoColorNibble(backdrop[1]);
    if (color === null) {
      return { ok: false, handled: true, log: `backdrop expects a Coleco color name or value 0..15: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [`    ld bc,$07${color.toString(16).toUpperCase().padStart(2, "0")}`, "    call WRITE_REGISTER"] };
  }

  const setScreenPages = line.match(/^set\s+screen\s+pages\s+(.+)\s+and\s+(.+)$/i);
  if (setScreenPages) {
    const viewCode = emitLoadVramAddressIntoHL(setScreenPages[1]);
    const editCode = emitLoadVramAddressIntoDE(setScreenPages[2]);
    if (!viewCode || !editCode) {
      return { ok: false, handled: true, log: `Unsupported screen page destination: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...viewCode, ...editCode, "    call AMY_SET_SCREEN_PAGES"] };
  }

  if (/^swap\s+screens$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SWAP_SCREEN_PAGES"] };
  }
  if (/^wipe\s+screen\s+up$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_WIPE_SCREEN_UP"] };
  }
  if (/^wipe\s+screen\s+down$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_WIPE_SCREEN_DOWN"] };
  }
  if (/^wipe\s+bitmap\s+up$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_WIPE_BITMAP_UP"] };
  }
  if (/^wipe\s+bitmap\s+down$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_WIPE_BITMAP_DOWN"] };
  }

  const mergeVram = line.match(/^merge\s+([A-Za-z_][A-Za-z0-9_]*(?:\s*\+\s*.+?)?)\s+count\s+(.+?)\s+to\s+(.+?)\s+mask\s+(.+?)\s+xor\s+(.+)$/i);
  if (mergeVram) {
    const sourceCode = emitLoadSourceAddressIntoHL(mergeVram[1]);
    const countCode = emitLoadCountIntoBC(mergeVram[2]);
    const targetCode = emitLoadVramAddressIntoDE(mergeVram[3]);
    const maskCode = emitLoadInt8ValueInto("d", mergeVram[4]);
    const xorCode = emitLoadInt8ValueInto("e", mergeVram[5]);
    if (!sourceCode || !countCode || !targetCode || !maskCode || !xorCode) {
      return { ok: false, handled: true, log: `merge Source count N to vram.* mask M xor X requires a source, VRAM target, byte count, and byte masks: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...targetCode,
        "    ld a,e",
        "    out (VDP_CTRL_PORT),a",
        "    ld a,d",
        "    or $40",
        "    out (VDP_CTRL_PORT),a",
        ...sourceCode,
        ...countCode,
        ...maskCode,
        ...xorCode,
        "    call AMY_MERGE_BYTES_TO_VRAM"
      ]
    };
  }

  const psetMode3 = line.match(/^pset\s+(?:mode\s*3|multicolor)\s+(.+?)\s*,\s*(.+?)\s+colou?r\s+(.+)$/i);
  if (psetMode3) {
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_MODE3_PSET",
      values: { b: psetMode3[1], c: psetMode3[2], a: psetMode3[3] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs) {
      return { ok: false, handled: true, log: `pset multicolor requires byte-sized X, Y, and color: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_MODE3_PSET"] };
  }

  const pgetMode3 = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*pget\s+(?:mode\s*3|multicolor)\s+(.+?)\s*,\s*(.+)$/i);
  if (pgetMode3) {
    const targetInfo = getRuntimeInfo(pgetMode3[1]);
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_MODE3_PGET",
      values: { b: pgetMode3[2], c: pgetMode3[3] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!targetInfo || targetInfo.type !== "int8" || !loadInputs) {
      return { ok: false, handled: true, log: `Color = pget multicolor X,Y requires a byte target and byte-sized coordinates: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_MODE3_PGET", ...emitStoreInt8FromA(pgetMode3[1])] };
  }

  // Plain pget X,Y — dispatches to Mode 3 based on currentGraphicsMode.
  const plainPget = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*pget\s+(.+?)\s*,\s*(.+)$/i);
  if (plainPget) {
    if (currentGraphicsMode !== "multicolor") {
      return { ok: false, handled: true, log: `pget without qualifier requires 'graphics mode 3 multicolor' to be active (last graphics statement seen was '${currentGraphicsMode ?? "none"}'): ${rawLine}` };
    }
    const targetInfo = getRuntimeInfo(plainPget[1]);
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_MODE3_PGET",
      values: { b: plainPget[2], c: plainPget[3] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!targetInfo || targetInfo.type !== "int8" || !loadInputs) {
      return { ok: false, handled: true, log: `pget target must be a u8/i8 variable and X,Y must be byte-sized: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_MODE3_PGET", ...emitStoreInt8FromA(plainPget[1])] };
  }

  const reflectPattern = line.match(/^reflect\s+pattern\s+(.+?)\s+to\s+(.+?)\s+count\s+(.+?)\s+(vertical|horizontal)$/i);
  if (reflectPattern) {
    const loadSource = emitLoadInt16IntoHL(reflectPattern[1]);
    const loadDest = emitLoadInt16IntoHL(reflectPattern[2]);
    const loadCount = emitLoadCountIntoBC(reflectPattern[3]);
    if (!loadSource || !loadDest || !loadCount) {
      return { ok: false, handled: true, log: `reflect pattern Source to Dest count N vertical|horizontal requires word-sized pattern indexes and count: ${rawLine}` };
    }
    const routine = reflectPattern[4].toLowerCase() === "vertical"
      ? "AMY_REFLECT_PATTERN_VERTICAL"
      : "AMY_REFLECT_PATTERN_HORIZONTAL";
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadSource,
        "    ex de,hl",
        ...loadDest,
        ...loadCount,
        `    call ${routine}`
      ]
    };
  }

  const rotatePattern = line.match(/^rotate\s+pattern\s+(.+?)\s+to\s+(.+?)\s+count\s+(.+?)\s+90$/i);
  if (rotatePattern) {
    const loadSource = emitLoadInt16IntoHL(rotatePattern[1]);
    const loadDest = emitLoadInt16IntoHL(rotatePattern[2]);
    const loadCount = emitLoadCountIntoBC(rotatePattern[3]);
    if (!loadSource || !loadDest || !loadCount) {
      return { ok: false, handled: true, log: `rotate pattern Source to Dest count N 90 requires word-sized pattern indexes and count: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadSource,
        "    ex de,hl",
        ...loadDest,
        ...loadCount,
        "    call AMY_ROTATE_PATTERN_90"
      ]
    };
  }

  const defineSprites = line.match(/^define\s+sprites?\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+(.+)$/i);
  if (defineSprites) {
    const sourceName = defineSprites[1];
    const startPattern = normalizeExpression(defineSprites[2].trim());
    const byteCount = dataLengths.get(sourceName) || precomputedSprite16Lengths?.get(sourceName);
    if (!byteCount) {
      return { ok: false, handled: true, log: `define sprites needs a sprite16 data block with a known length: ${rawLine}` };
    }
    const startValue = tryEvaluateConstantExpression?.(startPattern);
    const targetCode = Number.isInteger(startValue)
      ? [`    ld de,VRAM_SPR_PAT + ${startValue * 32}`]
      : emitLoadVramAddressIntoDE(`vram.spr_pat + (${symbolOrValue(startPattern)}) * 32`);
    const sourceCode = emitLoadSourceAddressIntoHL(sourceName);
    if (!targetCode || !sourceCode) {
      return { ok: false, handled: true, log: `define sprites could not resolve source or target: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        "    ld bc,$0607",
        "    call WRITE_REGISTER",
        ...targetCode,
        "    push de",
        ...sourceCode,
        "    pop de",
        `    ld bc,${byteCount}`,
        `    call ${isDefinitelyByteSizedCount(String(byteCount)) ? "WRITE_VRAM" : "AMY_COPY_BYTES_TO_VRAM"}`
      ]
    };
  }

  const setDefaultNameTable = line.match(/^set\s+default\s+name\s+table\s+(.+)$/i);
  if (setDefaultNameTable) {
    const loadNameTable = emitLoadVramAddressIntoHL(setDefaultNameTable[1]);
    if (!loadNameTable) {
      return { ok: false, handled: true, log: `Unsupported NAME table target: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadNameTable, "    call AMY_SET_DEFAULT_NAME_TABLE"] };
  }

  const copyScalarBytes = line.match(/^copy\s+bytes\s+of\s+(.+?)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (copyScalarBytes) {
    const sourceExpr = normalizeExpression(copyScalarBytes[1].trim());
    const targetName = copyScalarBytes[2];
    const targetInfo = getByteArrayBufferInfo(targetName, 1);
    if (!targetInfo) {
      return { ok: false, handled: true, log: `copy bytes of requires a u8 array destination: ${rawLine}` };
    }

    const sourceInfo = getRuntimeInfo(sourceExpr);
    if (!sourceInfo || sourceInfo.kind === "array") {
      return { ok: false, handled: true, log: `copy bytes of currently requires a scalar RAM value: ${rawLine}` };
    }

    if (sourceInfo.type === "int8") {
      if (targetInfo.length < 1) {
        return { ok: false, handled: true, log: `copy bytes of needs a destination buffer of at least 1 byte: ${rawLine}` };
      }
      const loadSource = emitLoadInt8ValueInto("a", sourceExpr);
      const loadTarget = emitLoadArrayAddressIntoHL(targetName, "0");
      if (!loadSource || !loadTarget) {
        return { ok: false, handled: true, log: `copy bytes of could not resolve source/destination: ${rawLine}` };
      }
      return { ok: true, handled: true, lines: [...loadSource, ...loadTarget, "    ld (hl),a"] };
    }

    if (sourceInfo.type === "int16") {
      if (targetInfo.length < 2) {
        return { ok: false, handled: true, log: `copy bytes of needs a destination buffer of at least 2 bytes: ${rawLine}` };
      }
      const loadSource = emitLoadInt16IntoHL(sourceExpr);
      const loadTarget = emitLoadArrayAddressIntoHL(targetName, "0");
      if (!loadSource || !loadTarget) {
        return { ok: false, handled: true, log: `copy bytes of could not resolve source/destination: ${rawLine}` };
      }
      return {
        ok: true,
        handled: true,
        lines: [
          ...loadSource,
          "    push hl",
          ...loadTarget,
          "    pop de",
          "    ld (hl),e",
          "    inc hl",
          "    ld (hl),d"
        ]
      };
    }

    if (sourceInfo.type === "i32" || sourceInfo.kind === "u32" || sourceInfo.kind === "i32" || sourceInfo.kind === "fix16_16") {
      if (targetInfo.length < 4) {
        return { ok: false, handled: true, log: `copy bytes of needs a destination buffer of at least 4 bytes: ${rawLine}` };
      }
      const loadTarget = emitLoadArrayAddressIntoHL(targetName, "0");
      if (!loadTarget) {
        return { ok: false, handled: true, log: `copy bytes of could not resolve source/destination: ${rawLine}` };
      }
      if (sourceInfo.storage === "stack") {
        return { ok: false, handled: true, log: `copy bytes of for local stack-backed 32-bit values is not implemented yet: ${rawLine}` };
      }
      return {
        ok: true,
        handled: true,
        lines: [
          ...loadTarget,
          "    ex de,hl",
          `    ld hl,${sourceInfo.asmName}`,
          "    ld bc,4",
          "    ldir"
        ]
      };
    }

    if (sourceInfo.type === "fp5" || sourceInfo.kind === "fp5") {
      if (targetInfo.length < 5) {
        return { ok: false, handled: true, log: `copy bytes of needs a destination buffer of at least 5 bytes: ${rawLine}` };
      }
      const loadTarget = emitLoadArrayAddressIntoHL(targetName, "0");
      if (!loadTarget) {
        return { ok: false, handled: true, log: `copy bytes of could not resolve source/destination: ${rawLine}` };
      }
      if (sourceInfo.storage === "stack") {
        return {
          ok: true,
          handled: true,
          lines: [
            ...loadTarget,
            "    ld a,(ix" + (sourceInfo.offset < 0 ? sourceInfo.offset : `+${sourceInfo.offset}`) + ")",
            "    ld (hl),a",
            "    inc hl",
            "    ld a,(ix" + (sourceInfo.offset + 1 < 0 ? sourceInfo.offset + 1 : `+${sourceInfo.offset + 1}`) + ")",
            "    ld (hl),a",
            "    inc hl",
            "    ld a,(ix" + (sourceInfo.offset + 2 < 0 ? sourceInfo.offset + 2 : `+${sourceInfo.offset + 2}`) + ")",
            "    ld (hl),a",
            "    inc hl",
            "    ld a,(ix" + (sourceInfo.offset + 3 < 0 ? sourceInfo.offset + 3 : `+${sourceInfo.offset + 3}`) + ")",
            "    ld (hl),a",
            "    inc hl",
            "    ld a,(ix" + (sourceInfo.offset + 4 < 0 ? sourceInfo.offset + 4 : `+${sourceInfo.offset + 4}`) + ")",
            "    ld (hl),a"
          ]
        };
      }
      return {
        ok: true,
        handled: true,
        lines: [
          ...loadTarget,
          "    ex de,hl",
          `    ld hl,${sourceInfo.asmName}`,
          "    ld bc,5",
          "    ldir"
        ]
      };
    }

    return { ok: false, handled: true, log: `copy bytes of does not yet support this source type: ${rawLine}` };
  }

  const copyTransfer = line.match(/^copy\s+(.+?)(?:\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?\s+to\s+(.+?)(?:\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (copyTransfer && !/^copy\s+(?:bytes|bcd)\b/i.test(line)) {
    const sourceExpr = normalizeExpression(copyTransfer[1].trim());
    const countBeforeTo = copyTransfer[2];
    const targetExpr = copyTransfer[3].trim();
    const countAfterTo = copyTransfer[4];
    if (countBeforeTo && countAfterTo) {
      return { ok: false, handled: true, log: `copy count may appear before or after TO, but not both: ${rawLine}` };
    }
    const countToken = countBeforeTo || countAfterTo;
    const sourceVram = emitLoadVramAddressIntoDE(sourceExpr);
    const targetVram = emitLoadVramAddressIntoDE(targetExpr);
    const sourceInfo = getRuntimeInfo(sourceExpr);
    const targetInfo = getRuntimeInfo(targetExpr);

    if (targetVram) {
      const sourceCode = emitLoadSourceAddressIntoHL(sourceExpr);
      if (sourceCode) {
        let resolvedCountToken = countToken;
        if (!resolvedCountToken) {
          const knownLength = /^[A-Za-z_][A-Za-z0-9_]*$/.test(sourceExpr) ? dataLengths.get(sourceExpr) : null;
          if (knownLength) resolvedCountToken = knownLength.toString(10);
          else if (sourceInfo?.kind === "array" && sourceInfo.elementType === "int8" && typeof sourceInfo.length === "number") {
            resolvedCountToken = String(sourceInfo.length);
          }
        }
        if (!resolvedCountToken) {
          return { ok: false, handled: true, log: `copy to VRAM needs an explicit count for non-data or offset source ${sourceExpr}: ${rawLine}` };
        }
        const useDirectWriteVram = isDefinitelyByteSizedCount(resolvedCountToken);
        const targetIsDirectDeLoad = targetVram.length === 1 && /^\s*ld de,/.test(targetVram[0]);
        return {
          ok: true,
          handled: true,
          lines: targetIsDirectDeLoad
            ? [
                ...sourceCode,
                ...targetVram,
                ...emitLoadCountIntoBC(resolvedCountToken),
                `    call ${useDirectWriteVram ? "WRITE_VRAM" : "AMY_COPY_BYTES_TO_VRAM"}`
              ]
            : [
                ...targetVram,
                "    push de",
                ...sourceCode,
                "    pop de",
                ...emitLoadCountIntoBC(resolvedCountToken),
                `    call ${useDirectWriteVram ? "WRITE_VRAM" : "AMY_COPY_BYTES_TO_VRAM"}`
              ]
        };
      }
    }

    if (sourceVram) {
      const targetBufferInfo = getByteArrayBufferInfo(targetExpr, 1);
      const targetCode = targetBufferInfo ? emitLoadArrayAddressIntoHL(targetExpr, "0") : null;
      if (targetCode) {
        let resolvedCountToken = countToken;
        if (!resolvedCountToken && typeof targetBufferInfo.length === "number") {
          resolvedCountToken = String(targetBufferInfo.length);
        }
        if (!resolvedCountToken) {
          return { ok: false, handled: true, log: `copy from VRAM needs an explicit count when the target buffer length is unknown: ${rawLine}` };
        }
        const countCode = emitLoadCountIntoBC(resolvedCountToken);
        if (!countCode) {
          return { ok: false, handled: true, log: `copy from VRAM requires a valid byte count: ${rawLine}` };
        }
        const useDirectReadVram = isDefinitelyByteSizedCount(resolvedCountToken);
        return {
          ok: true,
          handled: true,
          lines: [
            ...sourceVram,
            ...targetCode,
            ...countCode,
            `    call ${useDirectReadVram ? "READ_VRAM" : "AMY_GET_VRAM"}`
          ]
        };
      }
    }

    if (targetInfo?.kind === "array") {
      if (sourceInfo?.kind === "array") {
        if (targetInfo.elementType !== sourceInfo.elementType) {
          return { ok: false, handled: true, log: `copy requires arrays of the same element type: ${rawLine}` };
        }
        if (countToken && getRuntimeInfo(countToken)) {
          return { ok: false, handled: true, log: `copy array count must be a constant, not a RAM variable: ${rawLine}` };
        }
        const elemSize = runtimeTypeSize(targetInfo.elementType);
        const byteCount = countToken
          ? (elemSize === 1 ? symbolOrValue(countToken) : `${symbolOrValue(countToken)}*${elemSize}`)
          : targetInfo.length * elemSize;
        const loadSrc = emitLoadArrayAddressIntoHL(sourceExpr, "0");
        const loadDst = emitLoadArrayAddressIntoHL(targetExpr, "0");
        if (!loadSrc || !loadDst) {
          return { ok: false, handled: true, log: `copy array: cannot resolve array base: ${rawLine}` };
        }
        return { ok: true, handled: true, lines: [...loadSrc, "    push hl", ...loadDst, "    ex de,hl", "    pop hl", `    ld bc,${byteCount}`, "    ldir"] };
      }

      const targetBufferInfo = getByteArrayBufferInfo(targetExpr, 1);
      const sourceCode = targetBufferInfo ? emitLoadSourceAddressIntoHL(sourceExpr) : null;
      const targetCode = targetBufferInfo ? emitLoadArrayAddressIntoHL(targetExpr, "0") : null;
      if (sourceCode && targetCode) {
        let resolvedCountToken = countToken;
        if (!resolvedCountToken) {
          const knownLength = /^[A-Za-z_][A-Za-z0-9_]*$/.test(sourceExpr) ? dataLengths.get(sourceExpr) : null;
          if (knownLength) resolvedCountToken = knownLength.toString(10);
          else if (sourceInfo?.kind === "array" && sourceInfo.elementType === "int8" && typeof sourceInfo.length === "number") {
            resolvedCountToken = String(sourceInfo.length);
          } else if (typeof targetBufferInfo.length === "number") {
            resolvedCountToken = String(targetBufferInfo.length);
          }
        }
        if (!resolvedCountToken) {
          return { ok: false, handled: true, log: `copy to byte buffer needs an explicit count for non-data or offset source ${sourceExpr}: ${rawLine}` };
        }
        return { ok: true, handled: true, lines: [...sourceCode, "    push hl", ...targetCode, "    ex de,hl", "    pop hl", ...emitLoadCountIntoBC(resolvedCountToken), "    ldir"] };
      }
    }
  }

  const copyBytes = line.match(/^copy\s+bytes\s+(.+?)(?:\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?\s+to\s+(.+)$/i);
  if (copyBytes) {
    const sourceExpr = normalizeExpression(copyBytes[1].trim());
    const countToken = copyBytes[2];
    const targetCode = emitLoadVramAddressIntoDE(copyBytes[3]);
    if (!targetCode) {
      return { ok: false, handled: true, log: `Unsupported VRAM destination for copy bytes: ${rawLine}` };
    }
    const sourceCode = emitLoadSourceAddressIntoHL(sourceExpr);
    if (!sourceCode) {
      return { ok: false, handled: true, log: `Unsupported ROM/RAM source for copy bytes: ${rawLine}` };
    }
    let resolvedCountToken = countToken;
    if (!resolvedCountToken) {
      const knownLength = /^[A-Za-z_][A-Za-z0-9_]*$/.test(sourceExpr) ? dataLengths.get(sourceExpr) : null;
      if (!knownLength) {
        return { ok: false, handled: true, log: `copy bytes needs an explicit count for non-data or offset source ${sourceExpr}: ${rawLine}` };
      }
      resolvedCountToken = knownLength.toString(10);
    }
    const useDirectWriteVram = isDefinitelyByteSizedCount(resolvedCountToken);
    const targetIsDirectDeLoad = targetCode.length === 1 && /^\s*ld de,/.test(targetCode[0]);
    return {
      ok: true,
      handled: true,
      lines: targetIsDirectDeLoad
        ? [
            ...sourceCode,
            ...targetCode,
            ...emitLoadCountIntoBC(resolvedCountToken),
            `    call ${useDirectWriteVram ? "WRITE_VRAM" : "AMY_COPY_BYTES_TO_VRAM"}`
          ]
        : [
            ...targetCode,
            "    push de",
            ...sourceCode,
            "    pop de",
            ...emitLoadCountIntoBC(resolvedCountToken),
            `    call ${useDirectWriteVram ? "WRITE_VRAM" : "AMY_COPY_BYTES_TO_VRAM"}`
          ]
    };
  }

  const readVram = line.match(/^read\s+vram\s+(.+?)\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (readVram) {
    const sourceCode = emitLoadVramAddressIntoDE(readVram[1]);
    const targetInfo = getByteArrayBufferInfo(readVram[3], 1);
    const targetCode = targetInfo ? emitLoadArrayAddressIntoHL(readVram[3], "0") : null;
    const countCode = emitLoadCountIntoBC(readVram[2]);
    if (!sourceCode || !targetCode || !countCode) {
      return { ok: false, handled: true, log: `read vram requires a valid VRAM source, count, and byte-array target: ${rawLine}` };
    }
    const useDirectReadVram = isDefinitelyByteSizedCount(readVram[2]);
    return {
      ok: true,
      handled: true,
      lines: [...sourceCode, ...targetCode, ...countCode, `    call ${useDirectReadVram ? "READ_VRAM" : "AMY_GET_VRAM"}`]
    };
  }

  const defineChars = line.match(/^define\s+chars?\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+(.+?)(?:\s+count\s+(.+))?$/i);
  if (defineChars) {
    const expanded = emitDefineCharsToPattern(defineChars[1], defineChars[2], defineChars[3], rawLine);
    if (!expanded.ok) return { ok: false, handled: true, log: expanded.log };
    return { ok: true, handled: true, lines: expanded.asmLines };
  }

  const defineColors = line.match(/^define\s+colors?\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+(.+?)(?:\s+count\s+(.+))?$/i);
  if (defineColors) {
    const expanded = emitDefineColorsToPattern(defineColors[1], defineColors[2], defineColors[3], rawLine);
    if (!expanded.ok) return { ok: false, handled: true, log: expanded.log };
    return { ok: true, handled: true, lines: expanded.asmLines };
  }

  const putChars = line.match(/^put\s+chars\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+(.+?)\s*,\s*(.+?)\s+count\s+(.+)$/i);
  if (putChars) {
    const loadY = emitLoadInt8ValueInto("d", putChars[3]);
    const loadX = emitLoadInt8ValueInto("e", putChars[2]);
    const loadCountBC = emitLoadCountIntoBC(putChars[4]);
    const loadSource = emitLoadSourceAddressIntoHL(putChars[1]);
    if (!loadY || !loadX || !loadCountBC || !loadSource) {
      return { ok: false, handled: true, log: `put chars requires byte-sized coordinates and count: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadY,
        ...loadX,
        "    call CALC_OFFSET",
        "    push de",
        "    ld hl,($73F6)",
        "    pop de",
        "    add hl,de",
        "    ex de,hl",
        "    push de",
        ...loadSource,
        "    pop de",
        ...loadCountBC,
        "    call WRITE_VRAM"
      ]
    };
  }

  const putCountAt = line.match(/^put\s+([A-Za-z_][A-Za-z0-9_]*)\s+count\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (putCountAt) {
    const loadSource = emitLoadSourceAddressIntoHL(putCountAt[1]);
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_PUT_AT",
      values: { d: putCountAt[4], e: putCountAt[3], b: putCountAt[2] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs || !loadSource) {
      return { ok: false, handled: true, log: `put Buffer count N at X,Y requires a byte buffer, byte-sized coordinates, and a byte-sized count: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadSource, ...loadInputs, "    call AMY_PUT_AT"] };
  }

  const putImplicitCentered = line.match(/^put\s+([A-Za-z_][A-Za-z0-9_]*)\s+centered\s+at\s+(.+)$/i);
  if (putImplicitCentered) {
    const length = getKnownByteSourceLength(putImplicitCentered[1]);
    const x = Number.isInteger(length) ? Math.ceil((32 - length) / 2) : null;
    if (!Number.isInteger(x) || x < 0) {
      return { ok: false, handled: true, log: `put centered requires a known source length from 1 to 32: ${rawLine}` };
    }
    const emitted = emitPutCountLines(putImplicitCentered[1], length, String(x), putImplicitCentered[2], "put centered");
    if (!emitted.ok) return { ok: false, handled: true, log: emitted.log };
    return { ok: true, handled: true, lines: emitted.lines };
  }

  const putImplicitAt = line.match(/^put\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (putImplicitAt) {
    const length = getKnownByteSourceLength(putImplicitAt[1]);
    const emitted = emitPutCountLines(putImplicitAt[1], length, putImplicitAt[2], putImplicitAt[3], "put without count");
    if (!emitted.ok) return { ok: false, handled: true, log: emitted.log };
    return { ok: true, handled: true, lines: emitted.lines };
  }

  const putFrameAt = line.match(/^put\s+([A-Za-z_][A-Za-z0-9_]*)\s+frame\s+size\s+(.+?)\s*,\s*(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (putFrameAt) {
    const loadSource = emitLoadSourceAddressIntoHL(putFrameAt[1]);
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "PUT_FRAME",
      values: { b: putFrameAt[3], c: putFrameAt[2], d: putFrameAt[5], e: putFrameAt[4] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    const sourceInfo = getByteArrayBufferInfo(putFrameAt[1], 1);
    const sourceIsData = isKnownDataSource(putFrameAt[1], 1);
    if (!loadSource || !loadInputs || (!sourceInfo && !sourceIsData)) {
      return { ok: false, handled: true, log: `put Buffer frame size W,H at X,Y requires a u8 buffer or data block plus byte-sized width, height, and coordinates: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadSource,
        ...loadInputs,
        "    push ix",
        "    push iy",
        "    call PUT_FRAME",
        "    pop iy",
        "    pop ix"
      ]
    };
  }

  const putAt = line.match(/^put\s+at\s+(.+?)\s*,\s*(.+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s+count\s+(.+)$/i);
  if (putAt) {
    addCompilerWarning?.(`Prefer "put ${putAt[3]} count ${putAt[4]} at ${putAt[1]},${putAt[2]}" instead of "${rawLine}".`);
    const loadSource = emitLoadSourceAddressIntoHL(putAt[3]);
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_PUT_AT",
      values: { d: putAt[2], e: putAt[1], b: putAt[4] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs || !loadSource) {
      return { ok: false, handled: true, log: `put at requires byte-sized coordinates and count: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadSource, ...loadInputs, "    call AMY_PUT_AT"] };
  }

  const fillCountAt = line.match(/^fill\s+(.+?)\s+count\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (fillCountAt) {
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_FILL_AT",
      values: { d: fillCountAt[4], e: fillCountAt[3], a: fillCountAt[1], b: fillCountAt[2] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs) {
      return { ok: false, handled: true, log: `fill Value count N at X,Y requires byte-sized coordinates, tile, and count: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_FILL_AT"] };
  }

  const fillAt = line.match(/^fill\s+at\s+(.+?)\s*,\s*(.+?)\s+(.+?)\s+count\s+(.+)$/i);
  if (fillAt) {
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_FILL_AT",
      values: { d: fillAt[2], e: fillAt[1], a: fillAt[3], b: fillAt[4] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs) {
      return { ok: false, handled: true, log: `fill at requires byte-sized coordinates, tile, and count: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_FILL_AT"] };
  }

  const setTextColors = line.match(/^set\s+text\s+colou?rs?\s+(.+?)(?:\s+on\s+(.+?))?(?:\s+at\s+(.+?))?(?:\s+count\s+(.+))?$/i);
  if (setTextColors) {
    const foreground = parseColecoColorNibble(setTextColors[1]);
    const background = setTextColors[2] ? parseColecoColorNibble(setTextColors[2]) : 0;
    if (foreground === null || background === null) {
      return { ok: false, handled: true, log: `set text colors expects Coleco color names or values 0..15: ${rawLine}` };
    }
    const offsetToken = setTextColors[3] ? normalizeExpression(setTextColors[3]) : null;
    const countToken = setTextColors[4] ? normalizeExpression(setTextColors[4]) : "32";
    const offsetValue = offsetToken ? tryEvaluateConstantExpression?.(offsetToken) : 0;
    const loadTarget = Number.isInteger(offsetValue)
      ? [`    ld hl,VRAM_COLOR + ${offsetValue}`]
      : emitLoadVramAddressIntoHL(`vram.color + ${offsetToken}`);
    const loadCount = emitLoadCountIntoDE(countToken);
    if (!loadTarget || !loadCount) {
      return { ok: false, handled: true, log: `set text colors could not resolve offset or count: ${rawLine}` };
    }
    const colorByte = (foreground << 4) | background;
    return {
      ok: true,
      handled: true,
      lines: [...loadTarget, ...loadCount, `    ld a,$${colorByte.toString(16).toUpperCase().padStart(2, "0")}`, "    call FILL_VRAM"]
    };
  }

  const fillToVram = line.match(/^fill\s+(.+?)\s+count\s+(.+?)\s+to\s+(.+)$/i);
  if (fillToVram) {
    const targetCode = emitLoadVramAddressIntoHL(fillToVram[3].trim());
    const countCode = emitLoadCountIntoDE(fillToVram[2].trim());
    const loadValue = emitLoadInt8ValueInto("a", fillToVram[1].trim());
    if (!targetCode) return { ok: false, handled: true, log: `fill to VRAM requires a valid VRAM target: ${rawLine}` };
    if (!countCode) return { ok: false, handled: true, log: `fill to VRAM count must be a valid byte count: ${rawLine}` };
    if (!loadValue) return { ok: false, handled: true, log: `fill to VRAM value must be a byte value: ${rawLine}` };
    return { ok: true, handled: true, lines: [...targetCode, ...countCode, ...loadValue, "    call FILL_VRAM"] };
  }

  const fill = line.match(/^fill\s+vram\.(pattern|color|name|spr_pat|spr_attr)\s+with\s+(.+?)\s+count\s+(.+)$/i);
  if (fill) {
    const targetLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME", spr_pat: "VRAM_SPR_PAT", spr_attr: "VRAM_SPR_ATTR" }[fill[1].toLowerCase()];
    const loadValue = emitLoadInt8ValueInto("a", fill[2]);
    if (!loadValue) return { ok: false, handled: true, log: `VRAM fill value must be a byte value: ${rawLine}` };
    return { ok: true, handled: true, lines: [`    ld hl,${targetLabel}`, ...emitLoadCountIntoDE(fill[3]), ...loadValue, "    call FILL_VRAM"] };
  }

  const findTileBox = line.match(/^find\s+tile\s+([A-Za-z_][A-Za-z0-9_]*)\s+under\s+box\s+(.+?)\s*,\s*(.+?)\s+size\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (findTileBox) {
    const [, typeName, xToken, yToken, widthToken, heightToken, outX, outY] = findTileBox;
    const outXInfo = getRuntimeInfo(outX);
    const outYInfo = getRuntimeInfo(outY);
    const typeInfo = getTileTypeInfo?.(typeName);
    const storeOutX = emitStoreInt8FromA(outX);
    const storeOutY = emitStoreInt8FromA(outY);
    const yLoop = makeGeneratedLabel("FindTileYLoop");
    const xLoop = makeGeneratedLabel("FindTileXLoop");
    const rowDone = makeGeneratedLabel("FindTileRowDone");
    const found = makeGeneratedLabel("FindTileFound");
    const done = makeGeneratedLabel("FindTileDone");
    const typeTest = emitJumpOnTileTypeInA(typeName, found);
    const boundsX = emitLoadPixelTileBoxBounds(xToken, widthToken, 0, 1, done);
    const boundsY = emitLoadPixelTileBoxBounds(yToken, heightToken, 2, 3, done);
    if (!typeInfo || !typeInfo.values?.length || !outXInfo || outXInfo.type !== "int8" || !outYInfo || outYInfo.type !== "int8" || !boundsX || !boundsY || !storeOutX || !storeOutY) {
      return { ok: false, handled: true, log: `find tile requires a declared tile type, byte pixel box, and two byte output variables: ${rawLine}` };
    }
    if (!typeTest) {
      return { ok: false, handled: true, log: `find tile requires a declared tile type, byte pixel box, and two byte output variables: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        "    ld a,255",
        ...storeOutX,
        "    ld a,255",
        ...storeOutY,
        ...boundsX,
        ...boundsY,
        ...emitRejectWrappedTileBounds(done),
        `${yLoop}:`,
        "    ld a,(AMY_BUFFER32+0)",
        "    ld (AMY_BUFFER32+4),a",
        `${xLoop}:`,
        "    ld a,(AMY_BUFFER32+2)",
        "    ld d,a",
        "    ld a,(AMY_BUFFER32+4)",
        "    ld e,a",
        "    call AMY_GET_CHAR_AT",
        ...typeTest,
        "    ld a,(AMY_BUFFER32+4)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+1)",
        "    cp b",
        `    jp z,${rowDone}`,
        "    ld hl,AMY_BUFFER32+4",
        "    inc (hl)",
        `    jp ${xLoop}`,
        `${rowDone}:`,
        "    ld a,(AMY_BUFFER32+2)",
        "    ld b,a",
        "    ld a,(AMY_BUFFER32+3)",
        "    cp b",
        `    jp z,${done}`,
        "    ld hl,AMY_BUFFER32+2",
        "    inc (hl)",
        `    jp ${yLoop}`,
        `${found}:`,
        "    ld a,(AMY_BUFFER32+4)",
        ...storeOutX,
        "    ld a,(AMY_BUFFER32+2)",
        ...storeOutY,
        `${done}:`
      ]
    };
  }

  const sequence = line.match(/^fill\s+vram\.name\s+with\s+sequence\s+\$?00\.\.\$?ff\s+repeat\s+([A-Za-z_][A-Za-z0-9_]*|[0-9]+)/i);
  if (sequence) {
    const repeatValue = symbolOrValue(sequence[1]);
    const repeatCount = Number(repeatValue);
    if (!Number.isNaN(repeatCount) && (repeatCount < 1 || repeatCount > 255)) {
      return { ok: false, handled: true, log: "NAME table sequence repeat must be between 1 and 255." };
    }
    return { ok: true, handled: true, lines: [`    ld d,${repeatValue}`, "    call AMY_LOAD_SEQUENTIAL_NAME_TABLE"] };
  }

  function emitPutCharFromSameRecordArray(tileToken, xToken, yToken) {
    if (typeof parseRecordFieldRef !== "function" || typeof emitLoadArrayAddressIntoHL !== "function") return null;
    const refs = [
      { reg: "a", ref: parseRecordFieldRef(tileToken) },
      { reg: "e", ref: parseRecordFieldRef(xToken) },
      { reg: "d", ref: parseRecordFieldRef(yToken) }
    ];
    if (refs.some(({ ref }) => !ref || ref.baseKind !== "array" || ref.fieldInfo?.type !== "int8")) return null;
    const [first] = refs;
    const sameElement = refs.every(({ ref }) =>
      ref.name === first.ref.name && normalizeExpression(ref.index) === normalizeExpression(first.ref.index)
    );
    if (!sameElement) return null;
    const loadBase = emitLoadArrayAddressIntoHL(first.ref.name, first.ref.index);
    if (!loadBase) return null;
    const reads = refs
      .map(({ reg, ref }) => ({ reg, offset: ref.totalOffset }))
      .sort((left, right) => left.offset - right.offset);
    const lines = [...loadBase];
    let cursorOffset = 0;
    for (const { reg, offset } of reads) {
      if (!Number.isInteger(offset) || offset < cursorOffset) return null;
      for (let i = cursorOffset; i < offset; i += 1) lines.push("    inc hl");
      cursorOffset = offset;
      lines.push("    ld " + reg + ",(hl)");
    }
    return lines;
  }

  const putChar = line.match(/^put\s+(?:char|tile)\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (putChar) {
    const sharedRecordLoad = emitPutCharFromSameRecordArray(putChar[1], putChar[2], putChar[3]);
    if (sharedRecordLoad) return { ok: true, handled: true, lines: [...sharedRecordLoad, "    call AMY_PUT_CHAR_AT"] };
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_PUT_CHAR_AT",
      values: { d: putChar[3], e: putChar[2], a: putChar[1] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs) {
      return { ok: false, handled: true, log: `put char requires byte-sized coordinates and tile value: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_PUT_CHAR_AT"] };
  }

  const getChar = line.match(/^get\s+(?:char|tile)\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i)
    || line.match(/^read\s+(?:char|tile)\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (getChar) {
    addCompilerWarning?.(`Prefer "${getChar[3]} = get char at ${getChar[1]},${getChar[2]}" instead of "${rawLine}".`);
    const targetInfo = getRuntimeInfo(getChar[3]);
    if (!targetInfo || targetInfo.type !== "int8") {
      return { ok: false, handled: true, log: `get char target must be a byte RAM variable: ${rawLine}` };
    }
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_GET_CHAR_AT",
      values: { e: getChar[1], d: getChar[2] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs) {
      return { ok: false, handled: true, log: `get char requires byte-sized screen coordinates: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_GET_CHAR_AT", ...emitStoreInt8FromA(getChar[3])] };
  }

  const getCharAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:get|read)\s+(?:char|tile)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (getCharAssign) {
    const targetInfo = getRuntimeInfo(getCharAssign[1]);
    if (!targetInfo || targetInfo.type !== "int8") {
      return { ok: false, handled: true, log: `get char assignment target must be a byte RAM variable: ${rawLine}` };
    }
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_GET_CHAR_AT",
      values: { e: getCharAssign[2], d: getCharAssign[3] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadInputs) {
      return { ok: false, handled: true, log: `get char assignment requires byte-sized screen coordinates: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadInputs, "    call AMY_GET_CHAR_AT", ...emitStoreInt8FromA(getCharAssign[1])] };
  }

  const getCountInto = line.match(/^(?:get|read)\s+count\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (getCountInto) {
    addCompilerWarning?.(`Prefer "${getCountInto[4]} = get count ${getCountInto[1]} at ${getCountInto[2]},${getCountInto[3]}" instead of "${rawLine}".`);
    const targetInfo = getByteArrayBufferInfo(getCountInto[4], 1);
    const loadCount = emitLoadCountIntoBC(getCountInto[1]);
    const loadX = emitLoadInt8ValueInto("e", getCountInto[2]);
    const loadY = emitLoadInt8ValueInto("d", getCountInto[3]);
    const loadTarget = emitLoadArrayAddressIntoHL(getCountInto[4], "0");
    if (!targetInfo || !loadCount || !loadX || !loadY || !loadTarget) {
      return { ok: false, handled: true, log: `get count N at X,Y into Buffer requires a u8 buffer, byte-sized coordinates, and a valid count: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadY,
        ...loadX,
        "    call CALC_OFFSET",
        "    push de",
        "    ld hl,($73F6)",
        "    pop de",
        "    add hl,de",
        "    ex de,hl",
        ...loadTarget,
        ...loadCount,
        `    call ${isDefinitelyByteSizedCount(getCountInto[1]) ? "READ_VRAM" : "AMY_GET_VRAM"}`
      ]
    };
  }

  const getCountAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:get|read)\s+count\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (getCountAssign) {
    const targetInfo = getByteArrayBufferInfo(getCountAssign[1], 1);
    const loadCount = emitLoadCountIntoBC(getCountAssign[2]);
    const loadX = emitLoadInt8ValueInto("e", getCountAssign[3]);
    const loadY = emitLoadInt8ValueInto("d", getCountAssign[4]);
    const loadTarget = emitLoadArrayAddressIntoHL(getCountAssign[1], "0");
    if (!targetInfo || !loadCount || !loadX || !loadY || !loadTarget) {
      return { ok: false, handled: true, log: `Buffer = get count N at X,Y requires a u8 buffer, byte-sized coordinates, and a valid count: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadY,
        ...loadX,
        "    call CALC_OFFSET",
        "    push de",
        "    ld hl,($73F6)",
        "    pop de",
        "    add hl,de",
        "    ex de,hl",
        ...loadTarget,
        ...loadCount,
        `    call ${isDefinitelyByteSizedCount(getCountAssign[2]) ? "READ_VRAM" : "AMY_GET_VRAM"}`
      ]
    };
  }

  const getFrameInto = line.match(/^(?:get|read)\s+frame\s+size\s+(.+?)\s*,\s*(.+?)\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (getFrameInto) {
    addCompilerWarning?.(`Prefer "${getFrameInto[5]} = get frame size ${getFrameInto[1]},${getFrameInto[2]} at ${getFrameInto[3]},${getFrameInto[4]}" instead of "${rawLine}".`);
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "GET_BKGRND",
      values: { b: getFrameInto[2], c: getFrameInto[1], d: getFrameInto[4], e: getFrameInto[3] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    const loadTarget = emitLoadArrayAddressIntoHL(getFrameInto[5], "0");
    const targetInfo = getByteArrayBufferInfo(getFrameInto[5], 1);
    if (!loadInputs || !loadTarget || !targetInfo) {
      return { ok: false, handled: true, log: `get frame size W,H at X,Y into Buffer requires a u8 buffer plus byte-sized width, height, and coordinates: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadTarget,
        ...loadInputs,
        "    push ix",
        "    push iy",
        "    call GET_BKGRND",
        "    pop iy",
        "    pop ix"
      ]
    };
  }

  const getFrameAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:get|read)\s+frame\s+size\s+(.+?)\s*,\s*(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i);
  if (getFrameAssign) {
    const loadInputs = emitLoadRoutineByteInputsFromTokens({
      routineName: "GET_BKGRND",
      values: { b: getFrameAssign[3], c: getFrameAssign[2], d: getFrameAssign[5], e: getFrameAssign[4] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    const loadTarget = emitLoadArrayAddressIntoHL(getFrameAssign[1], "0");
    const targetInfo = getByteArrayBufferInfo(getFrameAssign[1], 1);
    if (!loadInputs || !loadTarget || !targetInfo) {
      return { ok: false, handled: true, log: `Buffer = get frame size W,H at X,Y requires a u8 buffer plus byte-sized width, height, and coordinates: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadTarget,
        ...loadInputs,
        "    push ix",
        "    push iy",
        "    call GET_BKGRND",
        "    pop iy",
        "    pop ix"
      ]
    };
  }

  const fillRow = line.match(/^fill\s+row\s+(.+?)\s+from\s+(.+?)\s+count\s+(.+?)\s+with\s+(.+)$/i);
  if (fillRow) {
    const loadY = emitLoadInt8ValueInto("d", fillRow[1]);
    const loadX = emitLoadInt8ValueInto("e", fillRow[2]);
    const loadValue = emitLoadInt8ValueInto("a", fillRow[4]);
    if (!loadY || !loadX || !loadValue) {
      return { ok: false, handled: true, log: `fill row requires byte-sized coordinates and fill value: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadY,
        ...loadX,
        "    call CALC_OFFSET",
        "    push de",
        "    ld hl,($73F6)",
        "    pop de",
        "    add hl,de",
        ...emitLoadCountIntoDE(fillRow[3]),
        "    push de",
        ...loadValue,
        "    pop de",
        "    call FILL_VRAM"
      ]
    };
  }

  return { handled: false };
}
