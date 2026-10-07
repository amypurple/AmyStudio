import assert from "node:assert/strict";
import {
  amyLogicalBank,
  normalizeGearcolecoTraceLog,
  parseGearcolecoCpuTraceLine
} from "../studio/core/romInstructionTrace.js";

assert.equal(amyLogicalBank(0x8123, 7), 0, "fixed MegaCart window is logical bank zero");
assert.equal(amyLogicalBank(0xC000, 0), 1);
assert.equal(amyLogicalBank(0xFFBF, 3), 4);
assert.equal(amyLogicalBank(0xC000, null), null);

const parsed = parseGearcolecoCpuTraceLine(
  "[CPU] 001:C010  AF:1234 BC:0000 Draw                     CD 00 C0"
);
assert.equal(parsed.bank, 2);
assert.equal(parsed.physicalBank, 1);
assert.equal(parsed.address, 0xC010);

const legacy = normalizeGearcolecoTraceLog({
  lines: [
    "[CPU] 007:8123  AF:0000 fixed",
    "[VDP] DATA_WRITE",
    "[CPU] 002:C020  AF:0000 banked"
  ]
});
assert.deepEqual(legacy.entries.map(({ bank, physicalBank, address }) => ({ bank, physicalBank, address })), [
  { bank: 0, physicalBank: 7, address: 0x8123 },
  { bank: 3, physicalBank: 2, address: 0xC020 }
]);

const structured = normalizeGearcolecoTraceLog({
  entries: [{ type: "CPU", pc: "C100", bank: "03", cycle: 42 }]
});
assert.equal(structured.entries[0].bank, 4);
assert.equal(structured.entries[0].physicalBank, 3);
assert.equal(structured.entries[0].address, 0xC100);
assert.equal(structured.entries[0].cycle, 42);

console.log("ROM instruction trace bank normalization PASS");
