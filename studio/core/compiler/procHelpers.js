export function createProcHelpers({
  body,
  inferredMemoryCaps,
  hasRuntimeRamDeclarationsRef,
  hasRuntimeInitRef,
  startRuntimeInitInsertIndexRef,
  currentProcRef,
  currentFunctionRef,
  openedImplicitStartRef,
  ensureProcAsmSymbol,
  ensureProcLocalMapStorage,
  procAsmSymbols,
  procFrames,
  runtimeVars,
}) {
  function ensureProcLocalMap(procName) {
    if (!ensureProcLocalMapStorage.has(procName)) ensureProcLocalMapStorage.set(procName, new Map());
    return ensureProcLocalMapStorage.get(procName);
  }

  function ensureProcFrame(procName) {
    if (!procFrames.has(procName)) {
      procFrames.set(procName, {
        size: 0,
        init: [],
        insertIndex: body.length,
        usesIxFrame: false,
        boolPackOffset: null,
        boolPackBits: 0
      });
    }
    return procFrames.get(procName);
  }

  function emitAdjustSpBy(byteCount) {
    if (!byteCount) return [];
    if (byteCount === 2) {
      return ["    pop bc"];
    }
    return [
      `    ld hl,${byteCount}`,
      "    add hl,sp",
      "    ld sp,hl"
    ];
  }

  function emitCurrentProcReturnLines() {
    const currentProc = currentProcRef.get();
    const frame = currentProc ? procFrames.get(currentProc) : null;
    if (currentProc === "Start") {
      return [
        "AMY_START_FOREVER:",
        "    jr AMY_START_FOREVER"
      ];
    }
    const lines = [];
    if (frame && (frame.usesIxFrame || frame.size > 0)) {
      lines.push("    ld sp,ix");
      lines.push("    pop ix");
    }
    lines.push("    ret");
    return lines;
  }

  function bodyAlreadyEndsWith(lines) {
    if (!Array.isArray(lines) || !lines.length || body.length < lines.length) return false;
    for (let index = 0; index < lines.length; index += 1) {
      if (body[body.length - lines.length + index] !== lines[index]) return false;
    }
    return true;
  }

  function emitCurrentProcReturnLinesIfNeeded() {
    const lines = emitCurrentProcReturnLines();
    if (!bodyAlreadyEndsWith(lines)) body.push(...lines);
  }

  function removeDeadReturnsAfterJumps(lines) {
    const optimized = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = String(line || "").trim().toLowerCase();
      optimized.push(line);
      if (!/^(jp|jr)\s+[a-z_][a-z0-9_]*$/i.test(trimmed)) continue;
      const next = lines[index + 1];
      const nextTrimmed = String(next || "").trim().toLowerCase();
      if (/^(ret|reti|retn)$/.test(nextTrimmed)) {
        index += 1;
      }
    }
    return optimized;
  }

  function inlineSingleCallUserProcedures(lines) {
    const procLabels = new Set(["Start", ...procAsmSymbols.values()]);
    const getLabelName = (line) => {
      const match = String(line || "").match(/^([A-Za-z_][A-Za-z0-9_]*):$/);
      return match ? match[1] : null;
    };
    const isInternalLabelLine = (line) => /^[A-Za-z_][A-Za-z0-9_]*:$/.test(String(line || ""));
    const canInlineProcBody = (blockLines) => {
      if (!Array.isArray(blockLines) || blockLines.length < 2) return false;
      const bodyLines = blockLines.slice(1);
      // Internal labels (loop/branch targets) are safe to inline only for small bodies:
      // jr has ±128-byte range; large inlined blocks with back-jumping labels could overflow.
      // Also, labels create optimizer barriers — inlining a large labeled body into the
      // caller degrades basic-block analysis more than it saves.
      const hasInternalLabels = bodyLines.some((line, idx) => idx > 0 && isInternalLabelLine(line));
      if (hasInternalLabels && bodyLines.length > 40) return false;
      if (bodyLines.some((line) => /^\s*(reti|retn)\b/i.test(String(line || "")))) return false;
      if (bodyLines.some((line, idx) => /^\s*ret\b/i.test(String(line || "")) && idx !== bodyLines.length - 1)) return false;
      if (!/^\s*ret\b/i.test(String(bodyLines[bodyLines.length - 1] || ""))) return false;
      if (bodyLines.some((line) => /^\s*(push ix|pop ix|ld sp,ix)\b/i.test(String(line || "")))) return false;
      return true;
    };

    let current = [...lines];
    let changed = false;

    for (;;) {
      const blocks = [];
      for (let index = 0; index < current.length; index += 1) {
        const label = getLabelName(current[index]);
        if (!label || !procLabels.has(label)) continue;
        let end = current.length;
        for (let probe = index + 1; probe < current.length; probe += 1) {
          const nextLabel = getLabelName(current[probe]);
          if (nextLabel && procLabels.has(nextLabel)) {
            end = probe;
            break;
          }
        }
        blocks.push({ label, start: index, end, lines: current.slice(index, end) });
      }

      const references = new Map();
      for (let index = 0; index < current.length; index += 1) {
        const trimmed = String(current[index] || "").trim();
        const callMatch = trimmed.match(/^call\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        if (callMatch) {
          const label = callMatch[1];
          if (!references.has(label)) references.set(label, { calls: [], jumps: [] });
          references.get(label).calls.push(index);
          continue;
        }
        const jumpMatch = trimmed.match(/^(?:jp|jr)\s+(?:[A-Za-z]+,\s*)?([A-Za-z_][A-Za-z0-9_]*)$/i);
        if (jumpMatch) {
          const label = jumpMatch[1];
          if (!references.has(label)) references.set(label, { calls: [], jumps: [] });
          references.get(label).jumps.push(index);
        }
      }

      const candidate = blocks.find((block) => {
        if (block.label === "Start" || !/^AMY_UPROC_/i.test(block.label)) return false;
        const refs = references.get(block.label);
        if (!refs || refs.calls.length !== 1 || refs.jumps.length !== 0) return false;
        return canInlineProcBody(block.lines);
      });
      if (!candidate) break;

      const refs = references.get(candidate.label);
      const callIndex = refs.calls[0];
      const inlinedBody = candidate.lines.slice(1, -1);
      current.splice(callIndex, 1, ...inlinedBody);

      const removedLength = candidate.end - candidate.start;
      const adjustedStart = candidate.start > callIndex
        ? candidate.start + (inlinedBody.length - 1)
        : candidate.start;
      current.splice(adjustedStart, removedLength);
      changed = true;
    }

    return changed ? current : lines;
  }

  function simplifyStartTailForeverGoto(lines) {
    const current = [...lines];
    const getLabelName = (line) => {
      const match = String(line || "").match(/^([A-Za-z_][A-Za-z0-9_]*):$/);
      return match ? match[1] : null;
    };
    const getProcBlocks = () => {
      const blocks = [];
      const procLabels = new Set(["Start", ...procAsmSymbols.values()]);
      for (let index = 0; index < current.length; index += 1) {
        const label = getLabelName(current[index]);
        if (!label || !procLabels.has(label)) continue;
        let end = current.length;
        for (let probe = index + 1; probe < current.length; probe += 1) {
          const nextLabel = getLabelName(current[probe]);
          if (nextLabel && procLabels.has(nextLabel)) {
            end = probe;
            break;
          }
        }
        blocks.push({ label, start: index, end, lines: current.slice(index, end) });
      }
      return blocks;
    };
    const isTrivialForeverProc = (block) => {
      if (!block || block.label === "Start") return false;
      const labelsInBlock = new Set();
      const instructions = [];
      for (const line of block.lines) {
        const label = getLabelName(line);
        if (label) {
          labelsInBlock.add(label);
          continue;
        }
        const trimmed = String(line || "").trim();
        if (!trimmed) continue;
        instructions.push(trimmed);
      }
      if (instructions.length !== 1) return false;
      const jumpMatch = instructions[0].match(/^jr\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      return !!(jumpMatch && labelsInBlock.has(jumpMatch[1]));
    };
    const countReferences = (targetLabel) => {
      let refs = 0;
      const target = String(targetLabel || "").toLowerCase();
      for (const line of current) {
        const trimmed = String(line || "").trim().toLowerCase();
        if (!trimmed) continue;
        const match = trimmed.match(/^(call|jp|jr)\s+(?:[a-z]+,\s*)?([a-z_][a-z0-9_]*)$/);
        if (match && match[2] === target) refs += 1;
      }
      return refs;
    };

    const blocks = getProcBlocks();
    const foreverBlocks = new Map(blocks.filter(isTrivialForeverProc).map((block) => [block.label, block]));
    if (!foreverBlocks.size) return lines;

    const startForeverIndex = current.indexOf("AMY_START_FOREVER:");
    if (startForeverIndex < 1) return lines;
    const tailLine = String(current[startForeverIndex - 1] || "").trim();
    const jumpMatch = tailLine.match(/^(jp|jr)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (!jumpMatch) return lines;
    const targetLabel = jumpMatch[2];
    const foreverBlock = foreverBlocks.get(targetLabel);
    if (!foreverBlock) return lines;

    current.splice(startForeverIndex - 1, 1);

    if (countReferences(targetLabel) === 0) {
      const refreshedBlocks = getProcBlocks();
      const removable = refreshedBlocks.find((block) => block.label === targetLabel);
      if (removable) current.splice(removable.start, removable.end - removable.start);
    }

    return current;
  }

  function openStartProc() {
    currentProcRef.set("Start");
    currentFunctionRef.set(null);
    body.push(`${ensureProcAsmSymbol("Start")}:`);
    if (inferredMemoryCaps.needsNmi) {
      body.push("    im 1");
      body.push("    ei");
    }
    body.push("    call TURN_OFF_SOUND");
    body.push("    call MODE_1");
    if (hasRuntimeRamDeclarationsRef.get()) {
      body.push("    xor a");
      body.push("    ld hl,AMY_RAM_BASE");
      body.push("    ld de,AMY_RAM_BASE+1");
      body.push("    ld bc,AMY_RAM_LIMIT-AMY_RAM_BASE-1");
      body.push("    ld (hl),a");
      body.push("    ldir");
    }
    startRuntimeInitInsertIndexRef.set(body.length);
    if (hasRuntimeInitRef.get()) body.push("    call AMY_INIT_RAM");
    ensureProcFrame(currentProcRef.get()).insertIndex = body.length;
  }

  function ensureImplicitStartForExecutable() {
    if (currentProcRef.get() || currentFunctionRef.get()) return;
    openStartProc();
    openedImplicitStartRef.set(true);
  }

  function getRuntimeInfo(token, scope = currentProcRef.get()) {
    if (scope) {
      const scoped = ensureProcLocalMapStorage.get(scope)?.get(token);
      if (scoped) {
        const scopedInfo = runtimeVars.get(scoped);
        if (scopedInfo) return scopedInfo;
      }
    }
    return runtimeVars.get(token) || null;
  }

  function scopedRuntimeName(token, scope = currentProcRef.get()) {
    const info = getRuntimeInfo(token, scope);
    return info?.asmName || token;
  }

  function runtimeTypeSize(type) {
    if (type === "int8") return 1;
    if (type === "int16") return 2;
    if (type === "u32") return 4;
    if (type === "i32") return 4;
    if (type === "fp5") return 5;
    return 2;
  }

  return {
    ensureProcLocalMap,
    ensureProcFrame,
    emitAdjustSpBy,
    emitCurrentProcReturnLines,
    bodyAlreadyEndsWith,
    emitCurrentProcReturnLinesIfNeeded,
    removeDeadReturnsAfterJumps,
    inlineSingleCallUserProcedures,
    simplifyStartTailForeverGoto,
    openStartProc,
    ensureImplicitStartForExecutable,
    getRuntimeInfo,
    scopedRuntimeName,
    runtimeTypeSize
  };
}
