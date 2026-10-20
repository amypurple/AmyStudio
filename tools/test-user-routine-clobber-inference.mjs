#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { inferGeneratedUserRoutineClobbers, optimizeGeneratedMemoryLoads } from "../studio/core/compiler/transpileFinalizationHelpers.js";

const fixture = [
  "Start:", "    ret",
  "AMY_UPROC_Preserve:", "    ld b,1", "    ret",
  "AMY_UPROC_Transitive:", "    call AMY_UPROC_Preserve", "    ret",
  "AMY_UPROC_ChangeHl:", "    ld hl,OtherValue", "    ret",
  "AMY_UPROC_Unknown:", "    call EXTERNAL_UNKNOWN", "    ret",
  "AMY_UPROC_RecurA:", "    call AMY_UPROC_RecurB", "    ret",
  "AMY_UPROC_RecurB:", "    call AMY_UPROC_RecurA", "    ret",
];

const clobbers = inferGeneratedUserRoutineClobbers(fixture);
assert.deepEqual([...clobbers.get("AMY_UPROC_PRESERVE")].sort(), ["bc"]);
assert.deepEqual([...clobbers.get("AMY_UPROC_TRANSITIVE")].sort(), ["bc"]);
assert.equal(clobbers.get("AMY_UPROC_CHANGEHL").has("hl"), true);
assert.equal(clobbers.get("AMY_UPROC_CHANGEHL").has("af"), false);
for (const family of ["af", "bc", "de", "hl", "ix", "iy"]) {
  assert.equal(clobbers.get("AMY_UPROC_UNKNOWN").has(family), true);
  assert.equal(clobbers.get("AMY_UPROC_RECURA").has(family), true);
  assert.equal(clobbers.get("AMY_UPROC_RECURB").has(family), true);
}

const preserved = optimizeGeneratedMemoryLoads([
  "    ld hl,TrackedValue", "    ld a,(hl)", "    call AMY_UPROC_Transitive", "    ld a,(TrackedValue)",
], clobbers);
assert.deepEqual(preserved, [
  "    ld hl,TrackedValue", "    ld a,(hl)", "    call AMY_UPROC_Transitive", "    ld a,(hl)",
]);

for (const call of ["AMY_UPROC_ChangeHl", "AMY_UPROC_Unknown"]) {
  const blocked = optimizeGeneratedMemoryLoads([
    "    ld hl,TrackedValue", "    ld a,(hl)", `    call ${call}`, "    ld a,(TrackedValue)",
  ], clobbers);
  assert.match(blocked.join("\n"), new RegExp(`call ${call}\\s+ld a,\\(TrackedValue\\)`, "i"));
}

const repeatedAddress = optimizeGeneratedMemoryLoads([
  "    ld hl,Counter", "    inc (hl)", "    ld hl,Counter", "    dec (hl)", "    ld hl,Counter", "    srl (hl)",
]);
assert.equal(repeatedAddress.filter((line) => /ld hl,Counter/i.test(line)).length, 1);

for (const barrier of [
  "    call UNKNOWN_ROUTINE", "BarrierLabel:", "    jp BarrierLabel", "    inc hl", "    ld l,3", "    ldir", "    cpir", "    otir",
]) {
  const blocked = optimizeGeneratedMemoryLoads(["    ld hl,Counter", barrier, "    ld hl,Counter"]);
  assert.equal(blocked.filter((line) => /ld hl,Counter/i.test(line)).length, 2, `${barrier.trim()} must retain the reload`);
}

async function assemble(lines, name) {
  const result = await assembleAmysCVAssembly({ "main.asm": lines.join("\n") }, "main.asm", {
    outputFilename: `${name}.bin`, outputMode: "binary", targetPlatform: "raw", optimizerEnabled: false,
  });
  assert.equal(result.ok, true, result.log || `${name} must assemble`);
  return result.binary;
}

function execute(binary) {
  const memory = new Uint8Array(65536);
  memory.set(binary, 0x9000);
  const state = { a: 0, b: 0, h: 0, l: 0, pc: 0x9000, sp: 0xa000, storedValue: null };
  const read16 = (address) => memory[address] | (memory[(address + 1) & 0xffff] << 8);
  const push16 = (value) => { state.sp = (state.sp - 1) & 0xffff; memory[state.sp] = value >> 8; state.sp = (state.sp - 1) & 0xffff; memory[state.sp] = value & 0xff; };
  const pop16 = () => { const value = read16(state.sp); state.sp = (state.sp + 2) & 0xffff; return value; };
  for (let steps = 0; steps < 40; steps += 1) {
    const opcode = memory[state.pc++];
    switch (opcode) {
      case 0x06: state.b = memory[state.pc++]; break;
      case 0x21: { const value = read16(state.pc); state.pc += 2; state.h = value >> 8; state.l = value & 0xff; break; }
      case 0x32: { const address = read16(state.pc); state.pc += 2; memory[address] = state.a; state.storedValue = state.a; break; }
      case 0x3a: { const address = read16(state.pc); state.pc += 2; state.a = memory[address]; break; }
      case 0x7e: state.a = memory[(state.h << 8) | state.l]; break;
      case 0x76: return { ...state, hlValue: memory[(state.h << 8) | state.l] };
      case 0xc9: state.pc = pop16(); break;
      case 0xcd: { const target = read16(state.pc); state.pc += 2; push16(state.pc); state.pc = target; break; }
      default: throw new Error(`unsupported opcode $${opcode.toString(16)}`);
    }
  }
  throw new Error("fixture did not halt");
}

const executable = [
  "org $9000", "Start:", "    ld hl,Value", "    ld a,(hl)", "    call AMY_UPROC_Preserve",
  "    ld a,(Value)", "    ld (Result),a", "    halt", "Value: db $42", "Result: db 0",
  "AMY_UPROC_Preserve:", "    ld b,1", "    ret",
];
const executableOptimized = optimizeGeneratedMemoryLoads(executable, inferGeneratedUserRoutineClobbers(executable));
const beforeBinary = await assemble(executable, "clobber-before");
const afterBinary = await assemble(executableOptimized, "clobber-after");
assert.equal(beforeBinary.length - afterBinary.length, 2);
const beforeState = execute(beforeBinary);
const afterState = execute(afterBinary);
assert.deepEqual(
  { a: afterState.a, b: afterState.b, hlValue: afterState.hlValue, sp: afterState.sp, storedValue: afterState.storedValue },
  { a: beforeState.a, b: beforeState.b, hlValue: beforeState.hlValue, sp: beforeState.sp, storedValue: beforeState.storedValue },
);
assert.equal(afterState.a, 0x42);
console.log("User-routine clobber inference: static barriers and binary before/after equivalence passed (2-byte synthetic gain).");
