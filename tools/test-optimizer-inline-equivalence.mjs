#!/usr/bin/env node
import assert from "node:assert/strict";
import { getOptimizationProfile } from "../studio/core/optimization.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const inlineConfig = {
  peephole: false,
  deadCode: true,
  branchShortening: false,
  localValueReuse: false,
  blockCopyBcZeroReuse: false,
  deadCp0Removal: false,
  deadOrARemoval: false,
  aZeroToXor: false,
  flagLivenessPeepholes: false,
  rstVectors: false,
  speculativeValueReuse: false,
  hazardousValueReuse: false,
  inlineRoutines: true,
  stripIxFrames: false
};

assert.equal(getOptimizationProfile("off", "").optimizerConfig, null,
  "off must not configure the optimizer");
for (const level of ["safe", "balanced", "aggressive"]) {
  assert.equal(getOptimizationProfile(level, "").optimizerConfig.inlineMaxBodyBytes, 8,
    `${level} must retain the conservative inline budget`);
}
assert.equal(getOptimizationProfile("experimental", "").optimizerConfig.inlineMaxBodyBytes, 24,
  "experimental alone may use the guarded twenty-four-byte inline budget");

async function assemble(source, inline, inlineMaxBodyBytes = 8) {
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: `inline-equivalence-${inline ? "on" : "off"}.bin`,
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: inline,
    optimizerConfig: inline ? { ...inlineConfig, inlineMaxBodyBytes } : null
  });
  assert.equal(result.ok, true, result.log || "fixture should assemble");
  return result;
}

function execute(binary) {
  const memory = new Uint8Array(65536);
  memory.set(binary, 0x9000);
  const state = { a: 0, b: 0, f: 0, pc: 0x9000, sp: 0xa000, branches: [] };
  const read16 = (address) => memory[address] | (memory[(address + 1) & 0xffff] << 8);
  const push16 = (value) => {
    state.sp = (state.sp - 1) & 0xffff;
    memory[state.sp] = value >> 8;
    state.sp = (state.sp - 1) & 0xffff;
    memory[state.sp] = value & 0xff;
  };
  const pop16 = () => {
    const value = memory[state.sp] | (memory[(state.sp + 1) & 0xffff] << 8);
    state.sp = (state.sp + 2) & 0xffff;
    return value;
  };
  const signed = (value) => value < 0x80 ? value : value - 0x100;

  for (let steps = 0; steps < 200; steps++) {
    const pc = state.pc;
    const opcode = memory[state.pc++];
    switch (opcode) {
      case 0x00: break; // NOP
      case 0x06: state.b = memory[state.pc++]; break; // LD B,n
      case 0x18: state.pc = (state.pc + signed(memory[state.pc])) & 0xffff; state.pc++; break;
      case 0x20: { // JR NZ,e
        const offset = signed(memory[state.pc++]);
        const taken = (state.f & 0x40) === 0;
        state.branches.push({ pc, condition: "nz", taken });
        if (taken) state.pc = (state.pc + offset) & 0xffff;
        break;
      }
      case 0x37: state.f |= 0x01; break; // SCF
      case 0x3c: { // INC A
        state.a = (state.a + 1) & 0xff;
        state.f = (state.f & 0x01) | (state.a === 0 ? 0x40 : 0);
        break;
      }
      case 0x3e: state.a = memory[state.pc++]; break; // LD A,n
      case 0x3f: state.f ^= 0x01; break; // CCF
      case 0x76: return state; // HALT
      case 0xc9: state.pc = pop16(); break; // RET
      case 0xcd: { // CALL nn
        const target = read16(state.pc);
        state.pc += 2;
        push16(state.pc);
        state.pc = target;
        break;
      }
      case 0xfe: { // CP n
        const value = memory[state.pc++];
        state.f = (state.f & 0x01) | (state.a === value ? 0x40 : 0);
        break;
      }
      default: throw new Error(`unsupported opcode $${opcode.toString(16)} at $${pc.toString(16)}`);
    }
  }
  throw new Error("fixture did not halt");
}

const eligible = `org $9000
Start:
  ld a,3
  call Tiny
  cp 4
  jr nz,Wrong
  ld b,17
  jr Done
Wrong:
  ld b,99
Done:
  halt
Tiny:
  inc a
  scf
  ccf
  nop
  nop
  nop
  nop
  ret
`;

const baseline = await assemble(eligible, false);
const optimized = await assemble(eligible, true);
assert.match(baseline.optimizedAsm, /call Tiny/i, "baseline keeps the call");
assert.doesNotMatch(optimized.optimizedAsm, /call Tiny/i, "seven one-byte operations may be inlined");
assert.equal(baseline.binary.length - optimized.binary.length, 4, "one-call inlining saves CALL plus RET");

const before = execute(baseline.binary);
const after = execute(optimized.binary);
assert.deepEqual(
  { a: after.a, b: after.b, f: after.f, sp: after.sp, branches: after.branches.map(x => [x.condition, x.taken]) },
  { a: before.a, b: before.b, f: before.f, sp: before.sp, branches: before.branches.map(x => [x.condition, x.taken]) },
  "inlining must preserve calculations, flags, stack balance, and conditional branch decisions"
);
assert.equal(after.b, 17, "the same branch reaches the expected result");

const retainedFixtures = {
  dataAddress: eligible.replace("  halt\nTiny:", "  halt\nPointer: dw Tiny\nTiny:"),
  loadedAddress: eligible.replace("  ld a,3", "  ld hl,Tiny\n  ld a,3"),
  branchReference: eligible.replace("  ld a,3", "  jr Begin\n  jp Tiny\nBegin:\n  ld a,3"),
  tooLarge: eligible.replace("  nop\n  ret", "  nop\n  nop\n  nop\n  ret"),
  stackSensitive: eligible.replace("  inc a\n  scf", "  push af\n  pop af"),
  ioSensitive: eligible.replace("  inc a\n  scf", "  in a,($fc)\n  nop")
};

for (const [name, source] of Object.entries(retainedFixtures)) {
  const result = await assemble(source, true);
  assert.match(result.optimizedAsm, /call Tiny/i, `${name}: non-exclusive or over-budget routine must not inline`);
}

const sixteenByteRoutine = `org $9000
Start:
  call Medium
  halt
Medium:
  ld a,4
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  ret
`;

const retainedAtEight = await assemble(sixteenByteRoutine, true, 8);
const inlinedAtSixteen = await assemble(sixteenByteRoutine, true, 16);
assert.match(retainedAtEight.optimizedAsm, /call Medium/i, "eight-byte budget must retain a sixteen-byte routine");
assert.doesNotMatch(inlinedAtSixteen.optimizedAsm, /call Medium/i, "sixteen-byte budget may inline a guarded sixteen-byte routine");
assert.equal(retainedAtEight.binary.length - inlinedAtSixteen.binary.length, 4, "larger guarded budget still saves only CALL plus RET");
assert.equal(execute(retainedAtEight.binary).a, execute(inlinedAtSixteen.binary).a, "sixteen-byte inlining preserves execution");

const seventeenByteRoutine = sixteenByteRoutine.replace("  ret\n", "  nop\n  ret\n");
const retainedAtSeventeen = await assemble(seventeenByteRoutine, true, 16);
assert.match(retainedAtSeventeen.optimizedAsm, /call Medium/i, "sixteen-byte budget must retain a seventeen-byte routine");

const twentyFourByteRoutine = sixteenByteRoutine.replace("  ret\n", `${"  nop\n".repeat(8)}  ret\n`);
const retainedAtSixteenForTwentyFour = await assemble(twentyFourByteRoutine, true, 16);
const inlinedAtTwentyFour = await assemble(twentyFourByteRoutine, true, 24);
assert.doesNotMatch(inlinedAtTwentyFour.optimizedAsm, /call Medium/i,
  "twenty-four-byte budget may inline a guarded twenty-four-byte routine");
assert.equal(retainedAtSixteenForTwentyFour.binary.length - inlinedAtTwentyFour.binary.length, 4,
  "twenty-four-byte inlining still saves only CALL plus RET");
assert.equal(execute(inlinedAtTwentyFour.binary).a, execute(retainedAtSixteenForTwentyFour.binary).a,
  "twenty-four-byte inlining preserves execution");

const twentyFiveByteRoutine = twentyFourByteRoutine.replace("  ret\n", "  nop\n  ret\n");
const retainedAtTwentyFive = await assemble(twentyFiveByteRoutine, true, 24);
assert.match(retainedAtTwentyFive.optimizedAsm, /call Medium/i,
  "twenty-four-byte budget must retain a twenty-five-byte routine");

for (const [name, source] of Object.entries({
  mediumDataAddress: sixteenByteRoutine.replace("  halt\nMedium:", "  halt\nPointer: dw Medium\nMedium:"),
  mediumStack: sixteenByteRoutine.replace("  ld a,4", "  push af\n  pop af"),
  mediumIo: sixteenByteRoutine.replace("  ld a,4", "  in a,($fc)"),
  mediumBranch: sixteenByteRoutine.replace("  ld a,4", "  jr MediumDone\nMediumDone:\n  ld a,4")
})) {
  const result = await assemble(source, true, 16);
  assert.match(result.optimizedAsm, /call Medium/i, `${name}: safety barrier must override the larger budget`);
}

console.log("Optimizer encoded-size inlining equivalence: PASS (8/16/24-byte budgets, state, flags, stack, branch, reference barriers)");
