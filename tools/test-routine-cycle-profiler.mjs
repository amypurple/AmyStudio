import assert from "node:assert/strict";
import {
  appendRoutineProfileSample,
  createRoutineProfileSession,
  NTSC_CYCLES_PER_FRAME,
  PAL_CYCLES_PER_FRAME,
  resolveProfileTarget
} from "../studio/core/routineCycleProfiler.js";

const symbols = [
  { name: "AMY_UPROC_Test", address: 0x8000 },
  { name: "AMY_IF_INTERNAL", address: 0x8004 },
  { name: "AMY_UPROC_Next", address: 0x8100 }
];
const target = resolveProfileTarget(symbols, "Test");
assert.deepEqual(target, {
  name: "AMY_UPROC_Test",
  start: 0x8000,
  end: 0x8100
});

const session = createRoutineProfileSession({
  target,
  entrySp: 0x7FFE,
  returnAddress: 0x8123,
  startCycles: 1000
});
let cycles = 1000;
const record = ({ pc, pcAfter, spBefore, spAfter, delta, interruptType = 0 }) => {
  const before = cycles;
  cycles += delta;
  return session.record({
    pc,
    pcAfter,
    spBefore,
    spAfter,
    cyclesBefore: before,
    cyclesAfter: cycles,
    interruptType
  });
};

assert.equal(record({ pc: 0x8000, pcAfter: 0x8001, spBefore: 0x7FFE, spAfter: 0x7FFE, delta: 10 }).complete, false);
assert.equal(record({ pc: 0x8001, pcAfter: 0x0066, spBefore: 0x7FFE, spAfter: 0x7FFC, delta: 11, interruptType: 1 }).complete, false);
assert.equal(record({ pc: 0x0066, pcAfter: 0x0067, spBefore: 0x7FFC, spAfter: 0x7FFC, delta: 5 }).complete, false);
assert.equal(record({ pc: 0x0070, pcAfter: 0x8001, spBefore: 0x7FFC, spAfter: 0x7FFE, delta: 10 }).complete, false);
assert.equal(record({ pc: 0x8008, pcAfter: 0x9000, spBefore: 0x7FFE, spAfter: 0x8000, delta: 7 }).complete, false);
assert.equal(record({ pc: 0x8009, pcAfter: 0x8123, spBefore: 0x7FFE, spAfter: 0x8000, delta: 10 }).complete, true);

const result = session.result();
assert.equal(result.inclusiveCycles, 53);
assert.equal(result.inRangeCycles, 38);
assert.equal(result.interruptCycles, 26);
assert.equal(result.nmiCycles, 26);
assert.equal(result.irqCycles, 0);
assert.equal(result.withoutInterruptCycles, 27);
assert.equal(result.instructions, 6);
assert.equal(result.framePercent, 53 * 100 / NTSC_CYCLES_PER_FRAME);

const irq = createRoutineProfileSession({
  target,
  entrySp: 0x7000,
  returnAddress: 0x9000,
  startCycles: 0,
  frameCycles: PAL_CYCLES_PER_FRAME
});
irq.record({ pc: 0x8000, pcAfter: 0x0038, spBefore: 0x7000, spAfter: 0x6FFE, cyclesBefore: 0, cyclesAfter: 13, interruptType: 2 });
irq.record({ pc: 0x0040, pcAfter: 0x8000, spBefore: 0x6FFE, spAfter: 0x7000, cyclesBefore: 13, cyclesAfter: 23 });
irq.record({ pc: 0x8000, pcAfter: 0x9000, spBefore: 0x7000, spAfter: 0x7002, cyclesBefore: 23, cyclesAfter: 33 });
assert.equal(irq.result().irqCycles, 23);
assert.equal(irq.result().framePercent, 33 * 100 / PAL_CYCLES_PER_FRAME);

const discontinuity = createRoutineProfileSession({
  target,
  entrySp: 0x7000,
  returnAddress: 0x9000,
  startCycles: 100
});
assert.throws(() => discontinuity.record({
  pc: 0x8000,
  pcAfter: 0x8001,
  spBefore: 0x7000,
  spAfter: 0x7000,
  cyclesBefore: 100,
  cyclesAfter: 99
}), /clock discontinuity/i);

const first = appendRoutineProfileSample(null, result);
const second = appendRoutineProfileSample(first, { ...result, inclusiveCycles: 57, framePercent: 57 * 100 / NTSC_CYCLES_PER_FRAME });
assert.equal(second.count, 2);
assert.equal(second.min, 53);
assert.equal(second.max, 57);
assert.equal(second.average, 55);
assert.equal(second.median, 55);
assert.deepEqual(second.samples, [53, 57]);

console.log("Routine cycle profiler: PASS");
