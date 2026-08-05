export const NTSC_CYCLES_PER_FRAME = 228 * 262;
export const PAL_CYCLES_PER_FRAME = 228 * 313;

export function resolveProfileTarget(symbols, nameOrAddress) {
  const text = String(nameOrAddress || "").trim();
  const numeric = text.match(/^\$([0-9a-f]{1,4})$/i) || text.match(/^0x([0-9a-f]{1,4})$/i);
  const address = numeric ? Number.parseInt(numeric[1], 16) & 0xFFFF : null;
  const matching = address == null
    ? (symbols || []).find((symbol) => {
      const name = symbol.name.toLowerCase();
      return name === text.toLowerCase() || name.replace(/^amy_uproc_/i, "") === text.toLowerCase();
    })
    : (symbols || []).find((symbol) => symbol.address === address);
  const start = matching?.address ?? address;
  if (start == null) throw new Error(`Unknown routine or address '${text}'.`);
  const boundarySymbols = matching && /^AMY_UPROC_/i.test(matching.name)
    ? (symbols || []).filter((symbol) => /^AMY_UPROC_/i.test(symbol.name))
    : (symbols || []);
  const next = boundarySymbols
    .map((symbol) => symbol.address)
    .filter((candidate) => candidate > start)
    .sort((left, right) => left - right)[0] ?? 0x10000;
  return {
    name: matching?.name || `$${start.toString(16).toUpperCase().padStart(4, "0")}`,
    start,
    end: next
  };
}

export function createRoutineProfileSession({
  target,
  entrySp,
  returnAddress,
  startCycles,
  frameCycles = NTSC_CYCLES_PER_FRAME
}) {
  if (!target || !Number.isInteger(target.start) || !Number.isInteger(target.end)) {
    throw new TypeError("A resolved routine target is required.");
  }
  if (!Number.isInteger(returnAddress)) {
    throw new TypeError("The routine return address is required.");
  }
  const state = {
    target,
    entrySp: entrySp & 0xFFFF,
    returnAddress: returnAddress & 0xFFFF,
    startCycles: Number(startCycles),
    frameCycles: Number(frameCycles) || NTSC_CYCLES_PER_FRAME,
    inclusiveCycles: 0,
    inRangeCycles: 0,
    interruptCycles: 0,
    nmiCycles: 0,
    irqCycles: 0,
    instructions: 0,
    interruptStack: [],
    complete: false
  };

  return {
    get state() {
      return { ...state, interruptStack: state.interruptStack.map((entry) => ({ ...entry })) };
    },
    record({ pc, pcAfter, spBefore, spAfter, cyclesBefore, cyclesAfter, interruptType = 0 }) {
      if (state.complete) return this.result();
      const before = Number(cyclesBefore);
      const after = Number(cyclesAfter);
      if (!Number.isFinite(before) || !Number.isFinite(after) || after < before) {
        throw new Error("Profiler clock discontinuity detected; sample discarded.");
      }
      const delta = after - before;
      const address = pc & 0xFFFF;
      const nextAddress = pcAfter & 0xFFFF;
      const nextSp = spAfter & 0xFFFF;
      state.instructions += 1;
      state.inclusiveCycles += delta;
      if (address >= target.start && address < target.end) state.inRangeCycles += delta;

      if (interruptType === 1 || interruptType === 2) {
        state.interruptStack.push({
          type: interruptType,
          entrySp: nextSp,
          returnAddress: address
        });
      }
      const activeInterrupt = state.interruptStack.at(-1);
      if (activeInterrupt) {
        state.interruptCycles += delta;
        if (activeInterrupt.type === 1) state.nmiCycles += delta;
        else state.irqCycles += delta;
        if (
          nextSp === ((activeInterrupt.entrySp + 2) & 0xFFFF) &&
          nextAddress === activeInterrupt.returnAddress
        ) {
          state.interruptStack.pop();
        }
      }

      if (
        state.interruptStack.length === 0 &&
        nextSp === ((state.entrySp + 2) & 0xFFFF) &&
        nextAddress === state.returnAddress
      ) {
        state.complete = true;
      }
      return this.result();
    },
    result() {
      return {
        target: { ...target },
        complete: state.complete,
        instructions: state.instructions,
        inclusiveCycles: state.inclusiveCycles,
        inRangeCycles: state.inRangeCycles,
        interruptCycles: state.interruptCycles,
        nmiCycles: state.nmiCycles,
        irqCycles: state.irqCycles,
        withoutInterruptCycles: Math.max(0, state.inclusiveCycles - state.interruptCycles),
        framePercent: state.inclusiveCycles * 100 / state.frameCycles,
        startCycles: state.startCycles,
        endCycles: state.startCycles + state.inclusiveCycles
      };
    }
  };
}

export function appendRoutineProfileSample(previous, sample) {
  const count = (previous?.count || 0) + 1;
  const total = (previous?.total || 0) + sample.inclusiveCycles;
  const samples = [...(previous?.samples || []), sample.inclusiveCycles]
    .sort((left, right) => left - right);
  const middle = Math.floor(samples.length / 2);
  const median = samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2;
  return {
    count,
    total,
    last: sample.inclusiveCycles,
    min: Math.min(previous?.min ?? Infinity, sample.inclusiveCycles),
    max: Math.max(previous?.max ?? 0, sample.inclusiveCycles),
    average: total / count,
    median,
    samples,
    lastInRange: sample.inRangeCycles,
    lastInterrupt: sample.interruptCycles,
    lastNmi: sample.nmiCycles,
    lastIrq: sample.irqCycles,
    lastWithoutInterrupt: sample.withoutInterruptCycles,
    lastInstructions: sample.instructions,
    lastCompletionKind: sample.completionKind || "",
    framePercent: sample.framePercent
  };
}
