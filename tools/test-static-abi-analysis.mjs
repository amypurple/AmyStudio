import assert from "node:assert/strict";
import { analyzeStaticAbiEligibility } from "../studio/core/compiler/staticAbiAnalysis.js";

const analyze = (source) => analyzeStaticAbiEligibility(source.trim().split(/\r?\n/));

const plain = analyze(`
function Leaf(u8 A, i16 B) as i16
  i16 Total = 0
  Total = A + B
  return Total
`);
assert(plain.eligible.has("leaf"), "scalar leaf should be eligible");

const cycles = analyze(`
function Direct(u8 N) as u8
  if N > 0 then return Direct(N - 1)
  return 0
function Left(u8 N) as u8
  return Right(N)
function Right(u8 N) as u8
  return Left(N)
`);
assert(cycles.recursive.has("direct"), "direct recursion was not detected");
assert(cycles.recursive.has("left") && cycles.recursive.has("right"), "mutual recursion was not detected");
assert(!cycles.eligible.has("direct") && !cycles.eligible.has("left"), "recursive functions must be excluded");

const nestedCycle = analyze(`
function Leaf(u16 A, u16 B) as u16
  return A + B
function NestedRecursive(u8 N, u16 Value) as u16
  if N = 0 then
    return Leaf(Value,1)
  end if
  return Leaf(NestedRecursive(N - 1,Value),1)
`);
assert(nestedCycle.recursive.has("nestedrecursive"), "recursion after an early return was not detected");
assert(!nestedCycle.eligible.has("nestedrecursive"), "nested recursive function must retain the stack ABI");

const nmi = analyze(`
on vblank Tick
sub Tick:
  Animate
end sub
sub Animate:
  u8 Phase = 0
end sub
sub MainLeaf:
  u8 Value = 0
end sub
`);
assert(nmi.nmiReachable.has("tick") && nmi.nmiReachable.has("animate"), "NMI descendants were not marked");
assert(!nmi.eligible.has("animate") && nmi.eligible.has("mainleaf"), "NMI eligibility fence is wrong");

const asmEdge = analyze(`
on frame Tick
sub Tick:
  asm {
    call AMY_UPROC_Leaf
  }
end sub
sub Leaf:
  u8 Value = 0
end sub
`);
assert(asmEdge.nmiReachable.has("leaf"), "direct inline-ASM edge was not included");
assert(!asmEdge.eligible.has("leaf"), "ASM-reachable NMI leaf must be excluded");

const asmParameterizedEntry = analyze(`
sub Caller:
  asm {
    call AMY_UPROC_Target
  }
end sub
function Target(u8 Value) as u8
  return Value
function ParameterlessTarget() as u8
  return 1
sub SafeCaller:
  asm {
    call AMY_UPROC_ParameterlessTarget
  }
end sub
`);
assert(asmParameterizedEntry.asmEntryTargets.has("target"), "parameterized ASM entry was not recorded");
assert(!asmParameterizedEntry.eligible.has("target"), "ASM-called parameterized routine must retain the stack ABI");
assert(asmParameterizedEntry.eligible.has("parameterlesstarget"), "parameterless ASM target may remain frameless");

const opaque = analyze(`
sub Leaf(u8 A):
  u8 Value = 0
end sub
asm {
  jp (hl)
}
`);
assert(opaque.opaqueAsm, "indirect ASM transfer must make exposure opaque");
assert.equal(opaque.eligible.size, 0, "opaque ASM must conservatively disable the static ABI");

const aggregate = analyze(`
function Aggregate(u8 A) as u8
  u8 Scratch[4]
  return A
`);
assert(!aggregate.eligible.has("aggregate"), "local arrays must be excluded in v1");

const conditionCodes = ["nz", "z", "nc", "c", "po", "pe", "p", "m"];
for (const op of ["call", "jp"]) {
  for (const cc of conditionCodes) {
    const result = analyze(`
function Conditional(u8 N) as u8
  asm {
    ${op} ${cc},AMY_UPROC_Conditional
  }
  return N
`);
    assert(result.recursive.has("conditional"), `${op} ${cc} self-edge was not detected`);
    assert(!result.eligible.has("conditional"), `${op} ${cc} recursive function must be excluded`);
  }
}

for (const instruction of ["jr AMY_UPROC_Branchy", "jr nz,AMY_UPROC_Branchy", "djnz AMY_UPROC_Branchy"]) {
  const result = analyze(`
function Branchy(u8 N) as u8
  asm {
    ${instruction}
  }
  return N
`);
  assert(result.recursive.has("branchy"), `${instruction} self-edge was not detected`);
  assert(!result.eligible.has("branchy"), `${instruction} recursive function must be excluded`);
}

const includeSource = `
include "@project/hook.asm"
function IncludedLeaf(u8 A) as u8
  return A
`;
const dataInclude = analyzeStaticAbiEligibility(includeSource, {
  resolveInclude: (path) => path === "@project/hook.asm" ? "SoundTable:\n  db $90,$90" : null
});
assert(!dataInclude.opaqueAsm && dataInclude.eligible.has("includedleaf"), "readable data-only include should preserve eligibility");

const codeInclude = analyzeStaticAbiEligibility(includeSource, {
  resolveInclude: () => "Hook:\n  call AMY_UPROC_IncludedLeaf\n  ret"
});
assert(codeInclude.opaqueAsm && codeInclude.eligible.size === 0, "code-bearing include must fail closed");

const missingInclude = analyzeStaticAbiEligibility(includeSource, { resolveInclude: () => null });
assert(missingInclude.opaqueAsm && missingInclude.eligible.size === 0, "unresolved include must fail closed");

const macroInclude = analyzeStaticAbiEligibility(includeSource, { resolveInclude: () => "HIDDEN_CALL_MACRO" });
assert(macroInclude.opaqueAsm && macroInclude.eligible.size === 0, "unknown include syntax must not be classified as data-only");

for (const declaration of [
  "Actor Value",
  "Piece Value",
  "Tiny Value",
  "u32 Value",
  "fixed Value",
  "u8 Values[2]",
  "u8 A = 0, Values[2]"
]) {
  const result = analyze(`
record Actor:
  u8 X
end record
enum Piece:
  Empty = 0
end enum
define Tiny as u8
function TypedLocal(u8 A) as u8
  ${declaration}
  return A
`);
  assert(!result.eligible.has("typedlocal"), `${declaration} local must be excluded`);
}

console.log("test-static-abi-analysis: PASS");
