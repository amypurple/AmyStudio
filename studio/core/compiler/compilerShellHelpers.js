export function createCompilerShellHelpers({
  state,
  formatHex16,
  parseNumericLiteral = null,
  parseFixedPointLiteral32 = null
}) {
  function makeGeneratedLabel(prefix) {
    const snake = prefix.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
    const label = `AMY_${snake}_${state.getNextGeneratedLabel()}`;
    state.bumpNextGeneratedLabel();
    return label;
  }

  function optimizeTransientDrawCoordinateTemps(lines) {
    const optimized = [];
    const loadConstA = /^\s*ld\s+a,([A-Za-z0-9_$]+)\s*$/i;
    const storeAToMem = /^\s*ld\s+\(([^)]+)\),a\s*$/i;
    const loadAMem = /^\s*ld\s+a,\(([^)]+)\)\s*$/i;
    const loadBFromA = /^\s*ld\s+b,a\s*$/i;
    const addAB = /^\s*add\s+a,b\s*$/i;
    const loadRegFromA = /^\s*ld\s+([de]),a\s*$/i;

    for (let i = 0; i < lines.length; i += 1) {
      const seq = lines.slice(i, i + 18);
      if (seq.length >= 18) {
        const c1 = seq[0].match(loadConstA);
        const s2 = seq[1].match(storeAToMem);
        const l3 = seq[2].match(loadAMem);
        const b4 = loadBFromA.test(seq[3] || "");
        const l5 = seq[4].match(loadAMem);
        const a6 = addAB.test(seq[5] || "");
        const s7 = seq[6].match(storeAToMem);
        const c8 = seq[7].match(loadConstA);
        const s9 = seq[8].match(storeAToMem);
        const l10 = seq[9].match(loadAMem);
        const b11 = loadBFromA.test(seq[10] || "");
        const l12 = seq[11].match(loadAMem);
        const a13 = addAB.test(seq[12] || "");
        const s14 = seq[13].match(storeAToMem);
        const l15 = seq[14].match(loadAMem);
        const r16 = seq[15].match(loadRegFromA);
        const l17 = seq[16].match(loadAMem);
        const r18 = seq[17].match(loadRegFromA);
        if (
          c1 && s2 && l3 && b4 && l5 && a6 && s7 &&
          c8 && s9 && l10 && b11 && l12 && a13 && s14 &&
          l15 && r16 && l17 && r18 &&
          s2[1] === l5[1] && s2[1] === s7[1] &&
          s9[1] === l12[1] && s9[1] === s14[1] &&
          l15[1] === s9[1] && l17[1] === s2[1] &&
          r16[1].toLowerCase() === "d" &&
          r18[1].toLowerCase() === "e"
        ) {
          optimized.push(`    ld a,(${l10[1]})`);
          optimized.push(`    add a,${c8[1]}`);
          optimized.push("    ld d,a");
          optimized.push(`    ld a,(${l3[1]})`);
          optimized.push(`    add a,${c1[1]}`);
          optimized.push("    ld e,a");
          i += 17;
          continue;
        }
      }
      optimized.push(lines[i]);
    }

    return optimized;
  }

  function optimizeSharedRecordPutCharLoads(lines) {
    const optimized = [];
    const parseChunk = (start) => {
      const loadIndex = String(lines[start] || "").match(/^\s*ld\s+a,\(([^)]+)\)\s*$/i);
      if (!loadIndex) return null;
      if (!/^\s*ld\s+e,a\s*$/i.test(lines[start + 1] || "")) return null;
      if (!/^\s*ld\s+d,0\s*$/i.test(lines[start + 2] || "")) return null;
      if (!/^\s*ld\s+hl,0\s*$/i.test(lines[start + 3] || "")) return null;
      let cursor = start + 4;
      let scaleAdds = 0;
      while (/^\s*add\s+hl,de\s*$/i.test(lines[cursor] || "")) {
        scaleAdds += 1;
        cursor += 1;
      }
      if (scaleAdds < 1) return null;
      if (!/^\s*ex\s+de,hl\s*$/i.test(lines[cursor] || "")) return null;
      cursor += 1;
      const loadBase = String(lines[cursor] || "").match(/^\s*ld\s+hl,([^\s;]+)\s*$/i);
      if (!loadBase) return null;
      cursor += 1;
      if (!/^\s*add\s+hl,de\s*$/i.test(lines[cursor] || "")) return null;
      cursor += 1;
      let offset = 0;
      const loadOffset = String(lines[cursor] || "").match(/^\s*ld\s+de,([^\s;]+)\s*$/i);
      if (loadOffset) {
        const numericOffset = parseNumericLiteral ? parseNumericLiteral(loadOffset[1]) : Number.NaN;
        if (!Number.isInteger(numericOffset) || numericOffset < 0) return null;
        offset = numericOffset;
        cursor += 1;
        if (!/^\s*add\s+hl,de\s*$/i.test(lines[cursor] || "")) return null;
        cursor += 1;
      }
      if (!/^\s*ld\s+a,\(hl\)\s*$/i.test(lines[cursor] || "")) return null;
      cursor += 1;
      let targetReg = "a";
      const moveFromA = String(lines[cursor] || "").match(/^\s*ld\s+([de]),a\s*$/i);
      if (moveFromA) {
        targetReg = moveFromA[1].toLowerCase();
        cursor += 1;
      }
      return {
        nextIndex: cursor,
        indexVar: loadIndex[1],
        scaleAdds,
        base: loadBase[1],
        offset,
        targetReg
      };
    };

    for (let i = 0; i < lines.length; i += 1) {
      const first = parseChunk(i);
      if (!first) {
        optimized.push(lines[i]);
        continue;
      }
      const second = parseChunk(first.nextIndex);
      const third = second ? parseChunk(second.nextIndex) : null;
      const callLine = third ? String(lines[third.nextIndex] || "") : "";
      if (
        !second ||
        !third ||
        !/^\s*call\s+AMY_PUT_CHAR_AT\s*$/i.test(callLine) ||
        ![second, third].every((entry) => entry.indexVar === first.indexVar && entry.scaleAdds === first.scaleAdds && entry.base === first.base) ||
        new Set([first.targetReg, second.targetReg, third.targetReg]).size !== 3 ||
        !["a", "d", "e"].every((reg) => [first.targetReg, second.targetReg, third.targetReg].includes(reg))
      ) {
        optimized.push(lines[i]);
        continue;
      }

      optimized.push(`    ld a,(${first.indexVar})`);
      optimized.push("    ld e,a");
      optimized.push("    ld d,0");
      optimized.push("    ld hl,0");
      for (let step = 0; step < first.scaleAdds; step += 1) optimized.push("    add hl,de");
      optimized.push("    ex de,hl");
      optimized.push(`    ld hl,${first.base}`);
      optimized.push("    add hl,de");
      const ordered = [first, second, third].sort((left, right) => left.offset - right.offset);
      let currentOffset = 0;
      for (const entry of ordered) {
        for (let step = currentOffset; step < entry.offset; step += 1) optimized.push("    inc hl");
        optimized.push(`    ld ${entry.targetReg},(hl)`);
        currentOffset = entry.offset;
      }
      optimized.push(lines[third.nextIndex]);
      i = third.nextIndex;
    }

    return optimized;
  }

  function optimizeSequentialAbsoluteByteStores(lines) {
    const optimized = [];
    const parseImmediateByte = (token) => {
      const value = parseNumericLiteral ? parseNumericLiteral(token) : Number.NaN;
      if (!Number.isInteger(value)) return null;
      if (value < 0 || value > 0xFF) return null;
      return value;
    };

    const parseStoreChunk = (start) => {
      const loadValue = String(lines[start] || "").match(/^\s*ld\s+a,([^\s;]+)\s*$/i);
      if (!loadValue) return null;
      if (!/^\s*push\s+af\s*$/i.test(lines[start + 1] || "")) return null;
      const loadBase = String(lines[start + 2] || "").match(/^\s*ld\s+hl,([^\s;]+)\s*$/i);
      if (!loadBase) return null;
      let cursor = start + 3;
      let address = parseNumericLiteral ? parseNumericLiteral(loadBase[1]) : Number.NaN;
      if (!Number.isInteger(address)) return null;
      const loadOffset = String(lines[cursor] || "").match(/^\s*ld\s+de,([^\s;]+)\s*$/i);
      if (loadOffset) {
        const offset = parseNumericLiteral ? parseNumericLiteral(loadOffset[1]) : Number.NaN;
        if (!Number.isInteger(offset) || offset < 0) return null;
        if (!/^\s*add\s+hl,de\s*$/i.test(lines[cursor + 1] || "")) return null;
        address += offset;
        cursor += 2;
      }
      if (!/^\s*pop\s+af\s*$/i.test(lines[cursor] || "")) return null;
      if (!/^\s*ld\s+\(hl\),a\s*$/i.test(lines[cursor + 1] || "")) return null;
      return {
        nextIndex: cursor + 2,
        valueToken: loadValue[1],
        address
      };
    };

    for (let i = 0; i < lines.length; i += 1) {
      const first = parseStoreChunk(i);
      if (!first) {
        optimized.push(lines[i]);
        continue;
      }

      const group = [first];
      let cursor = first.nextIndex;
      while (true) {
        const next = parseStoreChunk(cursor);
        if (!next) break;
        if (next.address !== group[group.length - 1].address + 1) break;
        group.push(next);
        cursor = next.nextIndex;
      }

      if (group.length < 2) {
        optimized.push(lines[i]);
        continue;
      }

      optimized.push(`    ld hl,${formatHex16(group[0].address)}`);
      let loadedAToken = null;
      for (let index = 0; index < group.length; index += 1) {
        if (index > 0) optimized.push("    inc hl");
        const token = group[index].valueToken;
        const immediateByte = parseImmediateByte(token);
        if (immediateByte !== null) {
          if (loadedAToken && loadedAToken.toLowerCase() === token.toLowerCase()) {
            optimized.push("    ld (hl),a");
          } else {
            optimized.push(`    ld (hl),${token}`);
            loadedAToken = null;
          }
          continue;
        }
        if (!loadedAToken || loadedAToken.toLowerCase() !== token.toLowerCase()) {
          optimized.push(`    ld a,${token}`);
          loadedAToken = token;
        }
        optimized.push("    ld (hl),a");
      }
      i = group[group.length - 1].nextIndex - 1;
    }

    return optimized;
  }

  function reserveRam(name, size, rawLine) {
    const limit = state.getRamLayout()?.userRamEndExclusive ?? 0x7400;
    if (state.getNextRamAddress() + size > limit) {
      const startLabel = state.getRamLayout() ? formatHex16(state.getRamLayout().userRamStart) : "$7100";
      const endLabel = state.getRamLayout() ? formatHex16(limit - 1) : "$73FF";
      throw new Error(`Out of user RAM while allocating ${name} from ${rawLine}. User RAM window is ${startLabel}-${endLabel}.`);
    }
    const address = state.getNextRamAddress();
    state.setNextRamAddress(address + size);
    return address;
  }

  function isZeroInitializer(expr) {
    const text = String(expr || "").trim();
    if (/^(?:0+|\$0+)$/i.test(text)) return true;
    if (parseNumericLiteral) {
      const numeric = parseNumericLiteral(text);
      if (numeric === 0) return true;
    }
    if (parseFixedPointLiteral32) {
      const fixed32 = parseFixedPointLiteral32(text);
      if (fixed32 === 0) return true;
    }
    return false;
  }

  function optimizeRedundantImmediateLoads(lines) {
    const optimized = [];
    const knownRegs = new Map();
    const immediateLoad = /^\s*ld\s+([abcdehl]),\s*([^\s;]+)\s*$/i;
    const copyLoad = /^\s*ld\s+([abcdehl]),\s*([abcdehl])\s*$/i;
    const memLoadA = /^\s*ld\s+a,\s*\([^)]+\)\s*$/i;
    const memStore = /^\s*ld\s+\([^)]+\),\s*([abcdehl])\s*$/i;
    const retOrCall = /^\s*(?:ret|reti|retn|call)\b/i;
    const jump = /^\s*(?:jp|jr|djnz)\b/i;
    const label = /^[A-Za-z_][A-Za-z0-9_]*:\s*$/;
    const hlMutation = /^\s*(?:inc|dec)\s+hl\b/i;
    const deMutation = /^\s*(?:inc|dec)\s+de\b/i;
    const bcMutation = /^\s*(?:inc|dec)\s+bc\b/i;
    const regMutation = /^\s*(?:inc|dec|add|adc|sub|sbc|and|or|xor|cp|cpl|neg|rl|rr|rlc|rrc|sla|sra|srl)\s+([abcdehl])\b/i;
    const pushPop = /^\s*(?:push|pop)\s+(af|bc|de|hl)\b/i;

    const clearKnown = (...regs) => {
      for (const reg of regs) knownRegs.delete(reg);
    };

    for (const line of lines) {
      const trimmed = String(line || "").trim();
      if (!trimmed) {
        optimized.push(line);
        continue;
      }
      if (label.test(trimmed)) {
        knownRegs.clear();
        optimized.push(line);
        continue;
      }
      const immMatch = trimmed.match(immediateLoad);
      if (immMatch) {
        const reg = immMatch[1].toLowerCase();
        const value = immMatch[2].toLowerCase();
        if (/^[abcdehl]$/i.test(value)) {
          if (reg === value) continue;
          const srcKnown = knownRegs.get(value);
          if (srcKnown !== undefined) knownRegs.set(reg, srcKnown);
          else knownRegs.delete(reg);
          optimized.push(line);
          continue;
        }
        if (value.includes("(") || value.includes(")")) {
          clearKnown(reg);
          optimized.push(line);
          continue;
        }
        if (knownRegs.get(reg) === value) {
          continue;
        }
        knownRegs.set(reg, value);
        optimized.push(line);
        continue;
      }
      const copyMatch = trimmed.match(copyLoad);
      if (copyMatch) {
        const dst = copyMatch[1].toLowerCase();
        const src = copyMatch[2].toLowerCase();
        if (dst === src) continue;
        const srcKnown = knownRegs.get(src);
        if (srcKnown !== undefined) knownRegs.set(dst, srcKnown);
        else knownRegs.delete(dst);
        optimized.push(line);
        continue;
      }
      if (memStore.test(trimmed)) {
        optimized.push(line);
        continue;
      }
      if (memLoadA.test(trimmed)) {
        clearKnown("a");
        optimized.push(line);
        continue;
      }
      if (retOrCall.test(trimmed) || jump.test(trimmed)) {
        knownRegs.clear();
        optimized.push(line);
        continue;
      }
      if (hlMutation.test(trimmed)) {
        clearKnown("h", "l");
        optimized.push(line);
        continue;
      }
      if (deMutation.test(trimmed)) {
        clearKnown("d", "e");
        optimized.push(line);
        continue;
      }
      if (bcMutation.test(trimmed)) {
        clearKnown("b", "c");
        optimized.push(line);
        continue;
      }
      const regMutationMatch = trimmed.match(regMutation);
      if (regMutationMatch) {
        clearKnown(regMutationMatch[1].toLowerCase());
        optimized.push(line);
        continue;
      }
      const pushPopMatch = trimmed.match(pushPop);
      if (pushPopMatch) {
        const pair = pushPopMatch[1].toLowerCase();
        if (pair === "af") clearKnown("a");
        else if (pair === "bc") clearKnown("b", "c");
        else if (pair === "de") clearKnown("d", "e");
        else if (pair === "hl") clearKnown("h", "l");
        optimized.push(line);
        continue;
      }
      knownRegs.clear();
      optimized.push(line);
    }

    return optimized;
  }

  function formatIxOffset(offset) {
    return `ix${offset < 0 ? offset : `+${offset}`}`;
  }

  return {
    makeGeneratedLabel,
    optimizeTransientDrawCoordinateTemps,
    optimizeSharedRecordPutCharLoads,
    optimizeSequentialAbsoluteByteStores,
    optimizeRedundantImmediateLoads,
    reserveRam,
    isZeroInitializer,
    formatIxOffset
  };
}
