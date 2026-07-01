function pruneDeadInitRecords(records, runtimeVars, body) {
  if (!records.length) return records;

  const SCALAR_KINDS = new Set(["int8", "int16", "u32", "i32"]);
  const TYPE_SIZES = { int8: 1, int16: 2, u32: 4, i32: 4 };

  const EXCLUDED_KINDS = new Set(["bcd", "fp5", "array", "packed_bool", "fix16_16", "fix8_8", "ufix8_8"]);

  const addressToVar = new Map();
  for (const [, info] of runtimeVars) {
    if (info.scope !== "global") continue;
    if (!info.asmName || typeof info.address !== "number") continue;
    if (info.kind !== undefined && EXCLUDED_KINDS.has(info.kind)) continue;
    if (!SCALAR_KINDS.has(info.type)) continue;
    addressToVar.set(info.address, { asmName: info.asmName, typeSize: TYPE_SIZES[info.type] });
  }
  if (!addressToVar.size) return records;

  const procLabelRe = /^(Start|AMY_UPROC_[A-Za-z0-9_]+):$/;
  const procBlocks = [];
  for (let i = 0; i < body.length; i++) {
    const t = String(body[i] || "").trim();
    const m = t.match(procLabelRe);
    if (m) procBlocks.push({ label: m[1], start: i });
  }
  for (let i = 0; i < procBlocks.length; i++) {
    procBlocks[i].end = procBlocks[i + 1]?.start ?? body.length;
  }

  function containingProc(idx) {
    for (let i = procBlocks.length - 1; i >= 0; i--) {
      if (idx >= procBlocks[i].start && idx < procBlocks[i].end) return procBlocks[i];
    }
    return null;
  }

  const labelRe = /^[A-Za-z_][A-Za-z0-9_]*:$/;
  const topLevelRegionLabelRe = /^(Start|Nmi|AMY_UPROC_[A-Za-z0-9_]+|AMY_ULBL_[A-Za-z0-9_]+):$/;
  const internalAmyLabelRe = /^AMY_(?!ULBL_|UPROC_)[A-Za-z0-9_]+:$/;

  function hasWriteBefore(lineIdx, nameLower) {
    const writePat = `(${nameLower}),`;
    for (let i = lineIdx - 1; i >= 0; i--) {
      const t = String(body[i] || "").trim();
      if (!t) continue;
      if (labelRe.test(t)) break;
      const tl = t.toLowerCase();
      if (tl.startsWith("ld (") && tl.includes(writePat)) return true;
    }
    return false;
  }

  function parseDirectAccessKind(line, nameLower) {
    const text = String(line || "").trim().toLowerCase();
    if (!text.includes(nameLower)) return null;
    if (/^ld\s+\([a-z0-9_]+\),/.test(text) && text.includes(`(${nameLower}),`)) return "write";
    if (/^ld\s+[a-z]{1,2}\s*,/.test(text) && text.includes(`(${nameLower})`) && !text.includes(`(${nameLower}),`)) return "read";
    if (/^ld\s+(hl|de|bc|ix|iy)\s*,/.test(text) && new RegExp(`\\b${nameLower}\\b`).test(text)) return "read";
    return "other";
  }

  function parseJumpTarget(line) {
    const text = String(line || "").trim();
    const match = text.match(/^(jp|jr|call|djnz)\s+(.+)$/i);
    if (!match) return null;
    const operand = match[2].split(",").pop()?.trim();
    if (!operand) return null;
    if (/^\(.*\)$/.test(operand)) return null;
    return operand.replace(/:$/, "");
  }

  const regions = [];
  for (let i = 0; i < body.length; i++) {
    const t = String(body[i] || "").trim();
    const match = t.match(topLevelRegionLabelRe);
    if (match) regions.push({ label: match[1], start: i });
  }
  for (let i = 0; i < regions.length; i++) {
    regions[i].end = regions[i + 1]?.start ?? body.length;
  }

  function containingRegion(idx) {
    for (let i = regions.length - 1; i >= 0; i--) {
      if (idx >= regions[i].start && idx < regions[i].end) return regions[i];
    }
    return null;
  }

  function isDeadRecordV2(asmName) {
    const nameLower = asmName.toLowerCase();
    const refs = [];

    for (let i = 0; i < body.length; i++) {
      const kind = parseDirectAccessKind(body[i], nameLower);
      if (!kind) continue;
      if (kind === "other") return false;
      refs.push({ index: i, kind, region: containingRegion(i) });
    }

    if (!refs.length) return true;

    const reads = refs.filter(ref => ref.kind === "read");
    if (!reads.length) return true;

    for (const ref of refs) {
      if (!ref.region) return false;
      if (ref.region.label === "Start" || ref.region.label === "Nmi") return false;
      if (!ref.region.label.startsWith("AMY_ULBL_")) return false;
    }

    const regionMap = new Map();
    for (const ref of refs) {
      if (!regionMap.has(ref.region.label)) regionMap.set(ref.region.label, ref.region);
    }

    for (const region of regionMap.values()) {
      const regionRefs = refs.filter(ref => ref.region.label === region.label);
      if (!regionRefs.some(ref => ref.kind === "read")) continue;

      let seenWrite = false;
      for (let i = region.start + 1; i < region.end; i++) {
        const t = String(body[i] || "").trim();
        if (!t) continue;
        if (i === regionRefs[0].index) {
          if (regionRefs[0].kind !== "write") return false;
        }
        if (!seenWrite && /^(jp|jr|call|djnz)\b/i.test(t)) return false;
        const kind = parseDirectAccessKind(t, nameLower);
        if (!kind) continue;
        if (kind === "other") return false;
        if (kind === "read" && !seenWrite) return false;
        if (kind === "write" && !seenWrite) seenWrite = true;
      }
      if (!seenWrite) return false;

      const internalLabels = [];
      for (let i = region.start + 1; i < region.end; i++) {
        const t = String(body[i] || "").trim();
        if (internalAmyLabelRe.test(t)) internalLabels.push(t.slice(0, -1));
      }

      for (const label of internalLabels) {
        for (let i = 0; i < body.length; i++) {
          const target = parseJumpTarget(body[i]);
          if (!target || target.toLowerCase() !== label.toLowerCase()) continue;
          if (i < region.start || i >= region.end) return false;
        }
      }
    }

    return true;
  }

  function isDeadRecord(asmName) {
    const nameLower = asmName.toLowerCase();
    const readPat = `(${nameLower})`;
    const writePat = `(${nameLower}),`;

    const readIdxs = [];
    for (let i = 0; i < body.length; i++) {
      const t = String(body[i] || "").trim().toLowerCase();
      if (t.includes(writePat)) continue;
      if (t.includes(readPat) && /^ld\s+[a-z]{1,2}\s*,/.test(t)) {
        readIdxs.push(i);
        continue;
      }
      if (t.includes(nameLower) && /^ld\s+(hl|de|bc|ix|iy)\s*,/.test(t) && new RegExp(`\\b${nameLower}\\b`).test(t)) {
        readIdxs.push(i);
      }
    }

    if (!readIdxs.length) return true;

    for (const readIdx of readIdxs) {
      const proc = containingProc(readIdx);
      if (!proc) return false;

      if (proc.label === "Start" || !proc.label.startsWith("AMY_UPROC_")) {
        if (!hasWriteBefore(readIdx, nameLower)) return false;
        continue;
      }

      const callTarget = `call ${proc.label}`.toLowerCase();
      let foundCall = false;
      for (let i = 0; i < body.length; i++) {
        const t = String(body[i] || "").trim().toLowerCase();
        if (t !== callTarget) continue;
        foundCall = true;
        if (!hasWriteBefore(i, nameLower)) return false;
      }
      if (!foundCall) return false;
    }

    return true;
  }

  return records.filter(record => {
    const varInfo = addressToVar.get(record.address);
    if (!varInfo) return true;
    if (record.bytes.length !== varInfo.typeSize) return true;
    const matchingRecords = records.filter(candidate => candidate.address === record.address);
    if (matchingRecords.length !== 1) return true;
    if (isDeadRecord(varInfo.asmName)) return false;
    return !isDeadRecordV2(varInfo.asmName);
  });
}

function optimizeGeneratedControlFlow(lines) {
  const invertCondition = {
    z: "nz",
    nz: "z",
    c: "nc",
    nc: "c",
    m: "p",
    p: "m",
    pe: "po",
    po: "pe"
  };
  const labelLineFor = (label) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:$`, "i");
  const isUnconditionalJumpTo = (line) => String(line || "").trim().match(/^(jp|jr)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  const isConditionalJumpTo = (line) => String(line || "").trim().match(/^(jp|jr)\s+([a-z]{1,2})\s*,\s*([A-Za-z_][A-Za-z0-9_]*)$/i);

  function foldJumpPairs(sourceLines) {
    const optimized = [];
    for (let index = 0; index < sourceLines.length; index += 1) {
      const conditional = isConditionalJumpTo(sourceLines[index]);
      const unconditional = isUnconditionalJumpTo(sourceLines[index + 1]);
      const falseLabel = conditional?.[3];
      const inverted = invertCondition[String(conditional?.[2] || "").toLowerCase()];
      if (
        conditional &&
        unconditional &&
        inverted &&
        falseLabel &&
        labelLineFor(falseLabel).test(String(sourceLines[index + 2] || "").trim())
      ) {
        optimized.push(`    ${conditional[1].toLowerCase()} ${inverted},${unconditional[2]}`);
        index += 1;
        continue;
      }

      const jump = isUnconditionalJumpTo(sourceLines[index]);
      if (jump && labelLineFor(jump[2]).test(String(sourceLines[index + 1] || "").trim())) {
        continue;
      }

      optimized.push(sourceLines[index]);
    }
    return optimized;
  }

  function removeDeadGeneratedIfLabels(sourceLines) {
    const referencedLabels = new Set();
    for (const line of sourceLines) {
      const text = String(line || "").trim();
      const branch = text.match(/^(?:jp|jr|call|djnz)\s+(?:[a-z]{1,2}\s*,\s*)?([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (branch) {
        referencedLabels.add(branch[1].toLowerCase());
        continue;
      }
      const dataWords = text.match(/^(?:dw|\.dw)\s+(.+)$/i);
      if (dataWords) {
        for (const token of dataWords[1].split(",")) {
          const label = token.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
          if (label) referencedLabels.add(label[1].toLowerCase());
        }
      }
    }

    return sourceLines.filter((line) => {
      const label = String(line || "").trim().match(/^(AMY_IF_(?:FALSE|END)_[0-9]+):$/i);
      return !label || referencedLabels.has(label[1].toLowerCase());
    });
  }

  let current = lines;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = removeDeadGeneratedIfLabels(foldJumpPairs(current));
    if (next.length === current.length && next.every((line, index) => line === current[index])) return next;
    current = next;
  }
  return current;
}

function optimizeGeneratedMemoryLoads(lines) {
  const directLoadA = /^\s*ld\s+a,\s*\(([A-Za-z_][A-Za-z0-9_]*)\)\s*$/i;
  const directLoadHL = /^\s*ld\s+hl,\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/i;
  const anyLoadHL = /^\s*ld\s+hl\s*,/i;
  const loadAFromHL = /^\s*ld\s+a,\s*\(hl\)\s*$/i;
  const directStore = /^\s*ld\s+\(([A-Za-z_][A-Za-z0-9_]*)\)\s*,/i;
  const label = /^[A-Za-z_][A-Za-z0-9_]*:\s*$/;
  const branch = /^\s*(?:jr|jp|djnz)\b/i;
  const conditionalBranch = /^\s*(?:jr|jp)\s+[a-z]{1,2}\s*,/i;
  const hardBarrier = /^\s*(?:call|ret|reti|retn)\b/i;
  const hlClobber = /^\s*(?:ld\s+hl,|inc\s+hl|dec\s+hl|add\s+hl,|adc\s+hl,|sbc\s+hl,|pop\s+hl|ex\s+de\s*,\s*hl|ex\s+\(sp\)\s*,\s*hl)\b/i;
  const aClobber = /^\s*(?:ld\s+a,|add\s+a,|adc\s+a,|sub\b|sbc\s+a,|and\b|or\b|xor\b|in\s+a,|pop\s+af|neg|cpl|rlca|rla|rrca|rra)\b/i;
  const memoryAtHlMutation = /^\s*(?:inc|dec)\s+\(hl\)\s*$/i;

  function findKnownHlSymbolBefore(sourceLines, startIndex) {
    for (let index = startIndex; index >= 0; index -= 1) {
      const text = String(sourceLines[index] || "").trim();
      if (!text) continue;
      const loadHL = text.match(directLoadHL);
      if (loadHL) return loadHL[1].toLowerCase();
      if (label.test(text) || hardBarrier.test(text) || (branch.test(text) && !conditionalBranch.test(text)) || hlClobber.test(text)) return null;
    }
    return null;
  }

  function removeReloadsAfterCompareBranches(sourceLines) {
    return sourceLines.filter((line, index) => {
      const loadA = String(line || "").trim().match(directLoadA);
      if (!loadA || !/^\s*cp\b/i.test(String(sourceLines[index + 1] || "").trim())) return true;
      const symbol = loadA[1].toLowerCase();
      const previousLoad = String(sourceLines[index - 3] || "").trim();
      const previousCompare = String(sourceLines[index - 2] || "").trim();
      const previousBranch = String(sourceLines[index - 1] || "").trim();
      if (!/^\s*cp\b/i.test(previousCompare) || !conditionalBranch.test(previousBranch)) return true;

      const previousDirectLoad = previousLoad.match(directLoadA);
      if (previousDirectLoad && previousDirectLoad[1].toLowerCase() === symbol) return false;

      if (loadAFromHL.test(previousLoad) && findKnownHlSymbolBefore(sourceLines, index - 3) === symbol) return false;

      return true;
    });
  }

  const optimized = [];
  let knownHL = null;
  let knownA = null;

  function clearAIfSymbol(symbol) {
    if (knownA && knownA === String(symbol || "").toLowerCase()) knownA = null;
  }

  for (const line of lines) {
    const text = String(line || "").trim();
    if (!text) {
      optimized.push(line);
      continue;
    }
    if (label.test(text) || hardBarrier.test(text)) {
      knownHL = null;
      knownA = null;
      optimized.push(line);
      continue;
    }

    if (anyLoadHL.test(text)) {
      const loadHL = text.match(directLoadHL);
      knownHL = loadHL ? loadHL[1].toLowerCase() : null;
      knownA = null;
      optimized.push(line);
      continue;
    }

    const loadA = text.match(directLoadA);
    if (loadA) {
      const symbol = loadA[1].toLowerCase();
      if (knownA === symbol) {
        continue;
      }
      if (knownHL === symbol) {
        knownA = symbol;
        optimized.push("    ld a,(hl)");
        continue;
      }
      knownA = symbol;
      optimized.push(line);
      continue;
    }

    if (loadAFromHL.test(text)) {
      knownA = knownHL;
      optimized.push(line);
      continue;
    }

    if (memoryAtHlMutation.test(text)) {
      clearAIfSymbol(knownHL);
      optimized.push(line);
      continue;
    }

    const store = text.match(directStore);
    if (store) {
      clearAIfSymbol(store[1]);
      optimized.push(line);
      continue;
    }

    if (/^\s*cp\b/i.test(text) || conditionalBranch.test(text)) {
      optimized.push(line);
      continue;
    }

    if (hlClobber.test(text)) knownHL = null;
    if (aClobber.test(text)) knownA = null;
    if (branch.test(text) && !conditionalBranch.test(text)) {
      knownHL = null;
      knownA = null;
    }
    optimized.push(line);
  }

  return removeReloadsAfterCompareBranches(optimized);
}

function optimizeGeneratedTailCalls(lines) {
  const optimized = [];
  for (let index = 0; index < lines.length; index += 1) {
    const call = String(lines[index] || "").trim().match(/^call\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (call && /^ret$/i.test(String(lines[index + 1] || "").trim())) {
      optimized.push(`    jp ${call[1]}`);
      index += 1;
      continue;
    }
    optimized.push(lines[index]);
  }
  return optimized;
}

export function finalizeAmyTranspile({
  state,
  helpers
}) {
  const {
    inAsm,
    whileStack,
    doStack,
    forStack,
    selectStack,
    ifStack,
    currentFunction,
    currentProc,
    dataCursorName,
    sawExplicitRestore,
    dataBlocks,
    procFrames,
    boolPackInits,
    hasRuntimeInit,
    startRuntimeInitInsertIndex,
    runtimeInit,
    runtimeInitRecords,
    declarations,
    runtimeDeclarations,
    body,
    textData,
    romData,
    assets,
    cartridgeMeta,
    nextRamAddress,
    ramLayout,
    runtimeVars,
    boolPackCount,
    needsNumericPostprocessHelpers,
    needsNumericPostprocessWidthHelper,
    needsFp5FriendlyFormatHelper,
    numericPadCharName,
    numericDigitBaseName,
    fp5FriendlyFirstIntName,
    fp5FriendlyDotName,
    fp5FriendlyLastFracName,
    compilerWarnings
  } = state;

  const {
    emitCurrentProcReturnLines,
    bodyAlreadyEndsWith,
    emitCurrentProcReturnLinesIfNeeded,
    flushDataBlock,
    resolveAddressSymbol,
    formatHex16,
    openStartProc,
    inlineSingleCallUserProcedures,
    simplifyStartTailForeverGoto,
    removeDeadReturnsAfterJumps,
    optimizeTransientDrawCoordinateTemps,
    optimizeSharedRecordPutCharLoads,
    optimizeSequentialAbsoluteByteStores,
    optimizeRedundantImmediateLoads,
    optimizeRepeatedBitTestLoads
  } = helpers;

  if (inAsm) {
    return { ok: false, asmBody: "", log: "Unclosed inline ASM block." };
  }
  if (whileStack.length) {
    return { ok: false, asmBody: "", log: "Unclosed while block." };
  }
  if (doStack.length) {
    return { ok: false, asmBody: "", log: "Unclosed do/loop block." };
  }
  if (forStack.length) {
    return { ok: false, asmBody: "", log: "Unclosed for block." };
  }
  if (selectStack.length) {
    return { ok: false, asmBody: "", log: "Unclosed select case block." };
  }
  if (ifStack.length) {
    return { ok: false, asmBody: "", log: "Unclosed if block." };
  }
  if (currentFunction) {
    const returnLines = emitCurrentProcReturnLines();
    if (!bodyAlreadyEndsWith(returnLines)) {
      return { ok: false, asmBody: "", log: `Function '${currentProc}' must end with 'return Value'.` };
    }
    state.currentProc = null;
    state.currentFunction = null;
  } else if (currentProc) {
    emitCurrentProcReturnLinesIfNeeded();
    state.currentProc = null;
    state.currentFunction = null;
  }
  try {
    flushDataBlock();
  } catch (error) {
    return { ok: false, asmBody: "", log: String(error.message || error) };
  }
  if (dataCursorName && !sawExplicitRestore && dataBlocks.size) {
    const firstBlock = [...dataBlocks.keys()][0];
    runtimeInit.unshift(`    ld hl,${resolveAddressSymbol(firstBlock)}`, `    ld (${dataCursorName}),hl`);
  }

  const stackFrames = [...procFrames.entries()]
    .filter(([, frame]) => frame.usesIxFrame || frame.size > 0)
    .sort((a, b) => b[1].insertIndex - a[1].insertIndex);
  for (const [, frame] of stackFrames) {
    const prologue = [
      "    push ix",
      "    ld ix,0",
      "    add ix,sp"
    ];
    if (frame.size > 0) {
      prologue.push(`    ld hl,-${frame.size}`);
      prologue.push("    add hl,sp");
      prologue.push("    ld sp,hl");
    }
    prologue.push(...frame.init);
    body.splice(frame.insertIndex, 0, ...prologue);
  }

  for (const [packLabel, bitmask] of boolPackInits) {
    if (!bitmask) continue;
    runtimeInit.unshift(`    ld (${packLabel}),a`);
    runtimeInit.unshift(`    ld a,$${bitmask.toString(16).toUpperCase().padStart(2, "0")}`);
  }
  const safeInitRecords = pruneDeadInitRecords(runtimeInitRecords, runtimeVars, body);
  const effectiveHasRuntimeInit = hasRuntimeInit && (safeInitRecords.length > 0 || runtimeInit.length > 0);

  if (effectiveHasRuntimeInit && startRuntimeInitInsertIndex >= 0 && body[startRuntimeInitInsertIndex] !== "    call AMY_INIT_RAM") {
    body.splice(startRuntimeInitInsertIndex, 0, "    call AMY_INIT_RAM");
    for (const [, frame] of procFrames.entries()) {
      if (frame.insertIndex >= startRuntimeInitInsertIndex) frame.insertIndex += 1;
    }
  } else if (!effectiveHasRuntimeInit && startRuntimeInitInsertIndex >= 0 && body[startRuntimeInitInsertIndex] === "    call AMY_INIT_RAM") {
    body.splice(startRuntimeInitInsertIndex, 1);
  }

  function buildRuntimeInitBlocks(records) {
    const normalized = (records || [])
      .filter((record) => Number.isInteger(record?.address) && Array.isArray(record?.bytes) && record.bytes.length)
      .map((record) => ({
        address: record.address,
        bytes: record.bytes.map((byte) => byte & 0xFF)
      }))
      .sort((left, right) => left.address - right.address);
    if (!normalized.length) return [];

    const spans = [];
    let currentSpan = null;
    for (const record of normalized) {
      const recordEnd = record.address + record.bytes.length;
      if (!currentSpan) {
        currentSpan = { start: record.address, bytes: [...record.bytes] };
        continue;
      }
      const currentEnd = currentSpan.start + currentSpan.bytes.length;
      if (record.address >= currentEnd) {
        currentSpan.bytes.push(...Array(record.address - currentEnd).fill(0));
        currentSpan.bytes.push(...record.bytes);
        continue;
      }
      const overlapOffset = record.address - currentSpan.start;
      for (let index = 0; index < record.bytes.length; index += 1) {
        currentSpan.bytes[overlapOffset + index] = record.bytes[index];
      }
      if (recordEnd > currentEnd) {
        currentSpan.bytes.push(...record.bytes.slice(currentEnd - record.address));
      }
    }
    if (currentSpan) spans.push(currentSpan);

    const result = [];
    const DIRECT_1_COST = 5;
    const DIRECT_2_COST = 6;
    const LDIR_BASE_COST = 11;

    for (const span of spans) {
      const bytes = span.bytes;
      const length = bytes.length;
      const dp = Array(length + 1).fill(Infinity);
      const next = Array(length + 1).fill(null);
      dp[length] = 0;
      for (let index = length - 1; index >= 0; index -= 1) {
        if (bytes[index] === 0) {
          let zeroEnd = index + 1;
          while (zeroEnd < length && bytes[zeroEnd] === 0) zeroEnd += 1;
          if (dp[zeroEnd] < dp[index]) {
            dp[index] = dp[zeroEnd];
            next[index] = { mode: "skip", end: zeroEnd };
          }
        }
        if (bytes[index] !== 0 && index + 1 <= length) {
          const cost = DIRECT_1_COST + dp[index + 1];
          if (cost < dp[index]) {
            dp[index] = cost;
            next[index] = { mode: "direct1", end: index + 1 };
          }
        }
        if (index + 2 <= length && (bytes[index] !== 0 || bytes[index + 1] !== 0)) {
          const cost = DIRECT_2_COST + dp[index + 2];
          if (cost < dp[index]) {
            dp[index] = cost;
            next[index] = { mode: "direct2", end: index + 2 };
          }
        }
        for (let end = index + 3; end <= length; end += 1) {
          const cost = LDIR_BASE_COST + (end - index) + dp[end];
          if (cost < dp[index]) {
            dp[index] = cost;
            next[index] = { mode: "ldir", end };
          }
        }
      }

      let index = 0;
      while (index < length) {
        const choice = next[index];
        if (!choice) break;
        if (choice.mode !== "skip") {
          result.push({
            mode: choice.mode,
            address: span.start + index,
            bytes: bytes.slice(index, choice.end)
          });
        }
        index = choice.end;
      }
    }
    return result;
  }

  const runtimeInitBlocks = buildRuntimeInitBlocks(safeInitRecords);
  const runtimeInitLines = [];
  const runtimeInitData = [];
  let lastInitAByte = null;
  for (let index = 0; index < runtimeInitBlocks.length; index += 1) {
    const block = runtimeInitBlocks[index];
    const label = `AMY_INIT_RAM_DATA_${index}`;
    if (block.mode === "direct1" || block.bytes.length === 1) {
      const byteValue = block.bytes[0] & 0xFF;
      if (lastInitAByte !== byteValue) {
        runtimeInitLines.push(
          `    ld a,$${byteValue.toString(16).toUpperCase().padStart(2, "0")}`
        );
        lastInitAByte = byteValue;
      }
      runtimeInitLines.push(`    ld (${formatHex16(block.address)}),a`);
    } else if (block.mode === "direct2" || block.bytes.length === 2) {
      const low = block.bytes[0] & 0xFF;
      const high = block.bytes[1] & 0xFF;
      runtimeInitLines.push(
        `    ld hl,$${high.toString(16).toUpperCase().padStart(2, "0")}${low.toString(16).toUpperCase().padStart(2, "0")}`,
        `    ld (${formatHex16(block.address)}),hl`
      );
    } else {
      runtimeInitLines.push(
        `    ld hl,${label}`,
        `    ld de,${formatHex16(block.address)}`,
        `    ld bc,${formatHex16(block.bytes.length)}`,
        "    ldir"
      );
      runtimeInitData.push(`${label}:`);
      for (let offset = 0; offset < block.bytes.length; offset += 16) {
        const chunk = block.bytes
          .slice(offset, offset + 16)
          .map((byte) => `$${byte.toString(16).toUpperCase().padStart(2, "0")}`)
          .join(",");
        runtimeInitData.push(`    db ${chunk}`);
      }
    }
  }

  const initRoutine = effectiveHasRuntimeInit
    ? [
        "",
        "; --- Amy runtime RAM init ---",
        "AMY_INIT_RAM:",
        ...runtimeInitLines,
        ...runtimeInit,
        "    ret",
        ...(runtimeInitData.length ? ["", ...runtimeInitData] : [])
      ].join("\n")
    : "";

  const numericHelperBlock = needsNumericPostprocessHelpers
    ? [
        "",
        "; --- Amy numeric glyph remap helpers ---",
        "AMY_NUMERIC_POSTPROCESS:",
        "    ld a,b",
        "    or a",
        "    ret z",
        "AMY_NUMERIC_POSTPROCESS_LOOP:",
        "    ld a,(hl)",
        "    cp $20",
        "    jr nz,AMY_NUMERIC_POSTPROCESS_NOT_SPACE",
        `    ld a,(${numericPadCharName})`,
        "    ld (hl),a",
        "    jr AMY_NUMERIC_POSTPROCESS_NEXT",
        "AMY_NUMERIC_POSTPROCESS_NOT_SPACE:",
        "    cp $30",
        "    jr c,AMY_NUMERIC_POSTPROCESS_NEXT",
        "    cp $3A",
        "    jr nc,AMY_NUMERIC_POSTPROCESS_NEXT",
        "    sub $30",
        "    ld e,a",
        `    ld a,(${numericDigitBaseName})`,
        "    add a,e",
        "    ld (hl),a",
        "AMY_NUMERIC_POSTPROCESS_NEXT:",
        "    inc hl",
        "    djnz AMY_NUMERIC_POSTPROCESS_LOOP",
        "    ret",
        ...(needsNumericPostprocessWidthHelper
          ? [
              "",
              "AMY_NUMERIC_POSTPROCESS_WIDTH:",
              "    ld a,b",
              "    or a",
              "    ret z",
              "    push hl",
              "    push bc",
              "    ld a,(hl)",
              "    cp $2D",
              "    jr nz,AMY_NUMERIC_POSTPROCESS_WIDTH_LEADING",
              "    inc hl",
              "    dec b",
              "AMY_NUMERIC_POSTPROCESS_WIDTH_LEADING:",
              "    ld a,b",
              "    dec a",
              "    jr z,AMY_NUMERIC_POSTPROCESS_WIDTH_DONE_LEADING",
              "    ld a,(hl)",
              "    cp $30",
              "    jr nz,AMY_NUMERIC_POSTPROCESS_WIDTH_DONE_LEADING",
              `    ld a,(${numericPadCharName})`,
              "    ld (hl),a",
              "    inc hl",
              "    djnz AMY_NUMERIC_POSTPROCESS_WIDTH_LEADING",
              "AMY_NUMERIC_POSTPROCESS_WIDTH_DONE_LEADING:",
              "    pop bc",
              "    pop hl",
              "    jp AMY_NUMERIC_POSTPROCESS"
            ]
          : [])
      ].join("\n")
    : "";

  const fp5FriendlyHelperBlock = needsFp5FriendlyFormatHelper
    ? [
        "",
        "; --- Amy friendly fp5 string helper ---",
        "; Input: HL = exact 16-char fp5 text buffer",
        ";        DE = destination 16-byte buffer",
        "; Output: writes a left-aligned friendly decimal string padded with spaces",
        "AMY_FP5_TO_FRIENDLY_ASCII16:",
        "    xor a",
        `    ld (${fp5FriendlyFirstIntName}),a`,
        `    ld (${fp5FriendlyDotName}),a`,
        `    ld (${fp5FriendlyLastFracName}),a`,
        "    push hl",
        "    ld b,16",
        "    ld c,0",
        "AMY_FP5_TO_FRIENDLY_FIND_DOT:",
        "    ld a,(hl)",
        "    cp $2E",
        "    jr z,AMY_FP5_TO_FRIENDLY_STORE_DOT",
        "    inc hl",
        "    inc c",
        "    djnz AMY_FP5_TO_FRIENDLY_FIND_DOT",
        "    pop hl",
        "    ret",
        "AMY_FP5_TO_FRIENDLY_STORE_DOT:",
        "    ld a,c",
        `    ld (${fp5FriendlyDotName}),a`,
        "    pop hl",
        "    push hl",
        "    inc hl",
        `    ld a,(${fp5FriendlyDotName})`,
        "    dec a",
        "    ld b,a",
        "    ld c,1",
        "AMY_FP5_TO_FRIENDLY_FIND_INT:",
        "    ld a,b",
        "    or a",
        "    jr z,AMY_FP5_TO_FRIENDLY_DONE_INT",
        "    ld a,(hl)",
        "    cp $30",
        "    jr nz,AMY_FP5_TO_FRIENDLY_STORE_INT",
        "    inc hl",
        "    dec b",
        "    inc c",
        "    jr AMY_FP5_TO_FRIENDLY_FIND_INT",
        "AMY_FP5_TO_FRIENDLY_STORE_INT:",
        "    ld a,c",
        `    ld (${fp5FriendlyFirstIntName}),a`,
        "AMY_FP5_TO_FRIENDLY_DONE_INT:",
        "    pop hl",
        "    push hl",
        "    ld bc,15",
        "    add hl,bc",
        `    ld a,(${fp5FriendlyDotName})`,
        "    ld c,a",
        "    ld a,15",
        "    sub c",
        "    ld b,a",
        "    ld c,15",
        "AMY_FP5_TO_FRIENDLY_FIND_FRAC:",
        "    ld a,b",
        "    or a",
        "    jr z,AMY_FP5_TO_FRIENDLY_DONE_FRAC",
        "    ld a,(hl)",
        "    cp $30",
        "    jr nz,AMY_FP5_TO_FRIENDLY_STORE_FRAC",
        "    dec hl",
        "    dec c",
        "    dec b",
        "    jr AMY_FP5_TO_FRIENDLY_FIND_FRAC",
        "AMY_FP5_TO_FRIENDLY_STORE_FRAC:",
        "    ld a,c",
        `    ld (${fp5FriendlyLastFracName}),a`,
        "AMY_FP5_TO_FRIENDLY_DONE_FRAC:",
        "    pop hl",
        "    ld b,16",
        `    ld a,(${fp5FriendlyFirstIntName})`,
        "    or a",
        "    jr nz,AMY_FP5_TO_FRIENDLY_NONZERO",
        `    ld a,(${fp5FriendlyLastFracName})`,
        "    or a",
        "    jr nz,AMY_FP5_TO_FRIENDLY_NONZERO",
        "    ld a,$30",
        "    ld (de),a",
        "    inc de",
        "    dec b",
        "    jr AMY_FP5_TO_FRIENDLY_PAD",
        "AMY_FP5_TO_FRIENDLY_NONZERO:",
        "    ld a,(hl)",
        "    cp $2D",
        "    jr nz,AMY_FP5_TO_FRIENDLY_WRITE_INT",
        "    ld (de),a",
        "    inc de",
        "    dec b",
        "AMY_FP5_TO_FRIENDLY_WRITE_INT:",
        `    ld a,(${fp5FriendlyFirstIntName})`,
        "    or a",
        "    jr nz,AMY_FP5_TO_FRIENDLY_COPY_INT",
        "    ld a,$30",
        "    ld (de),a",
        "    inc de",
        "    dec b",
        "    jr AMY_FP5_TO_FRIENDLY_AFTER_INT",
        "AMY_FP5_TO_FRIENDLY_COPY_INT:",
        "    push hl",
        "    push bc",
        `    ld a,(${fp5FriendlyFirstIntName})`,
        "    ld c,a",
        "    ld b,0",
        "    add hl,bc",
        `    ld a,(${fp5FriendlyDotName})`,
        "    sub c",
        "    pop bc",
        "    ld c,a",
        "AMY_FP5_TO_FRIENDLY_COPY_INT_LOOP:",
        "    ld a,(hl)",
        "    ld (de),a",
        "    inc hl",
        "    inc de",
        "    dec b",
        "    dec c",
        "    jr nz,AMY_FP5_TO_FRIENDLY_COPY_INT_LOOP",
        "    pop hl",
        "AMY_FP5_TO_FRIENDLY_AFTER_INT:",
        `    ld a,(${fp5FriendlyLastFracName})`,
        "    or a",
        "    jr z,AMY_FP5_TO_FRIENDLY_PAD",
        "    ld a,$2E",
        "    ld (de),a",
        "    inc de",
        "    dec b",
        "    push hl",
        "    push bc",
        `    ld a,(${fp5FriendlyDotName})`,
        "    ld c,a",
        "    ld b,0",
        "    add hl,bc",
        "    inc hl",
        "    pop bc",
        `    ld a,(${fp5FriendlyDotName})`,
        "    ld c,a",
        `    ld a,(${fp5FriendlyLastFracName})`,
        "    sub c",
        "    ld c,a",
        "AMY_FP5_TO_FRIENDLY_COPY_FRAC_LOOP:",
        "    ld a,(hl)",
        "    ld (de),a",
        "    inc hl",
        "    inc de",
        "    dec b",
        "    dec c",
        "    jr nz,AMY_FP5_TO_FRIENDLY_COPY_FRAC_LOOP",
        "    pop hl",
        "AMY_FP5_TO_FRIENDLY_PAD:",
        "    ld a,b",
        "    or a",
        "    ret z",
        "    ld a,$20",
        "AMY_FP5_TO_FRIENDLY_PAD_LOOP:",
        "    ld (de),a",
        "    inc de",
        "    djnz AMY_FP5_TO_FRIENDLY_PAD_LOOP",
        "    ret"
      ].join("\n")
    : "";

  const textDataBlock = textData.length
    ? ["", "; --- Amy text literals ---", ...textData].join("\n")
    : "";
  const romDataBlock = romData.length
    ? ["", "; --- Amy ROM data ---", ...romData].join("\n")
    : "";

  const headerBlocks = [];
  if (declarations.length) headerBlocks.push(declarations.join("\n"));
  if (runtimeDeclarations.length) {
    const layoutLines = ["; --- Amy runtime RAM variables ---"];
    if (ramLayout) {
      layoutLines.push(`; User RAM window: ${formatHex16(ramLayout.userRamStart)}-${formatHex16(ramLayout.userRamEndExclusive - 1)}`);
      layoutLines.push(`AMY_RAM_BASE EQU ${formatHex16(ramLayout.userRamStart)}`);
      layoutLines.push(`AMY_RAM_LIMIT EQU ${formatHex16(ramLayout.userRamEndExclusive)}`);
    } else {
      layoutLines.push("AMY_RAM_BASE EQU $7100");
    }
    layoutLines.push(...runtimeDeclarations);
    headerBlocks.push(layoutLines.join("\n"));
  }

  if (!body.includes("Start:")) {
    openStartProc();
  }
  if (state.currentProc === "Start") {
    emitCurrentProcReturnLinesIfNeeded();
  }

  const generatedBody = inlineSingleCallUserProcedures(
    simplifyStartTailForeverGoto(
      removeDeadReturnsAfterJumps(
        optimizeRedundantImmediateLoads(
          optimizeSequentialAbsoluteByteStores(
            optimizeSharedRecordPutCharLoads(
              optimizeTransientDrawCoordinateTemps(optimizeRepeatedBitTestLoads(body))
            )
          )
        )
      )
    )
  );
  const optimizedBody = optimizeGeneratedMemoryLoads(
    optimizeGeneratedControlFlow(
      optimizeGeneratedTailCalls(
        optimizeGeneratedMemoryLoads(generatedBody)
      )
    )
  );
  const needsFrameCounter = optimizedBody.some((line) => /\bAMY_FRAME_COUNTER\b/.test(String(line || "")));
  const runtimeMarkers = needsFrameCounter
    ? ["; AMY runtime requirement: AMY_FRAME_COUNTER"]
    : [];
  const asmBody = [headerBlocks.join("\n\n"), runtimeMarkers.join("\n"), optimizedBody.join("\n"), initRoutine, numericHelperBlock, fp5FriendlyHelperBlock, textDataBlock, romDataBlock].filter(Boolean).join("\n\n");
  const summaryLog = `Amy transpiler generated ${declarations.length} constant(s), ${runtimeVars.size} RAM variable(s), ${body.length} ASM lines and ${assets.length} asset block(s).`;
  const warningLog = Array.isArray(compilerWarnings) && compilerWarnings.length
    ? `\n\nWarnings:\n${compilerWarnings.map((warning) => `- ${warning}`).join("\n")}`
    : "";

  return {
    ok: true,
    asmBody,
    assets,
    warnings: Array.isArray(compilerWarnings) ? [...compilerWarnings] : [],
    metadata: {
      cartridge: cartridgeMeta,
      needsFrameCounter
    },
    ramUsage: {
      usedBytes: Math.max(0, nextRamAddress - (ramLayout?.userRamStart ?? 0x7100)),
      variableCount: runtimeVars.size,
      booleanPackCount: boolPackCount
    },
    log: `${summaryLog}${warningLog}`
  };
}
