#!/usr/bin/env node
// Codegen tests for indexable ROM word tables: `data Levels words / @Level0, ... / end data`
// used as `decompress mdkrle Levels[N] to vram.name` and `put Levels[N] frame ...`.
// Verifies: dw emission, constant-index folding to the entry label, the minimal
// variable-index dereference sequence, and loud failures for invalid forms.
import assert from "node:assert/strict";

import { getRamLayout } from "../studio/ramLayouts.js";
import {
  inferAmyMemoryCapabilities,
  parseCartridgeDirective as parseCartridgeDirectiveCore,
  parseExpressionAst as parseExpressionAstCore,
  renderExpressionAst as renderExpressionAstCore,
  rewriteImmediateByteTempCoordinateUses as rewriteImmediateByteTempCoordinateUsesCore
} from "../studio/core/compilerFrontend.js";
import { emitSafeCall as emitSafeCallCore } from "../studio/core/compiler/runtimeCallHelpers.js";
import { createBcdHelpers } from "../studio/core/compiler/bcdHelpers.js";
import { createAddressHelpers } from "../studio/core/compiler/addressHelpers.js";
import { handleArrayBulkStatement } from "../studio/core/compiler/arrayBulkStatementHelpers.js";
import { createAssignmentArithmeticHelpers } from "../studio/core/compiler/assignmentArithmeticHelpers.js";
import { createFx16Helpers } from "../studio/core/compiler/fx16Helpers.js";
import { createByteLoadHelpers } from "../studio/core/compiler/byteLoadHelpers.js";
import { createCompareLiteralHelpers } from "../studio/core/compiler/compareLiteralHelpers.js";
import { createCompilerShellHelpers } from "../studio/core/compiler/compilerShellHelpers.js";
import { createDataHelpers } from "../studio/core/compiler/dataHelpers.js";
import { handleDataMetaStatement } from "../studio/core/compiler/dataMetaStatementHelpers.js";
import { handleDataCursorStatement } from "../studio/core/compiler/dataCursorStatementHelpers.js";
import { handleDeclarationStatement } from "../studio/core/compiler/declarationStatementHelpers.js";
import { createControlFlowHelpers } from "../studio/core/compiler/controlFlowHelpers.js";
import { createExpressionComputeHelpers } from "../studio/core/compiler/expressionComputeHelpers.js";
import { scanAmyFirstPass } from "../studio/core/compiler/firstPassScanHelpers.js";
import { handleDisplayGraphicsSpriteStatement } from "../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";
import { handleForStatement } from "../studio/core/compiler/forStatementHelpers.js";
import { handleIfStatement } from "../studio/core/compiler/ifStatementHelpers.js";
import { createInlineStatementCompiler } from "../studio/core/compiler/inlineStatementHelpers.js";
import { createLoadStoreHelpers } from "../studio/core/compiler/loadStoreHelpers.js";
import { handleDoStatement, handleWhileStatement } from "../studio/core/compiler/loopStatementHelpers.js";
import { handleMathBitStatement } from "../studio/core/compiler/mathBitStatementHelpers.js";
import { handleMutateStatement } from "../studio/core/compiler/mutateStatementHelpers.js";
import { createPrintHelpers } from "../studio/core/compiler/printHelpers.js";
import { handlePrintFormatStatement } from "../studio/core/compiler/printFormatStatementHelpers.js";
import { createProcHelpers } from "../studio/core/compiler/procHelpers.js";
import { handleProcFunctionStatement } from "../studio/core/compiler/procFunctionStatementHelpers.js";
import { handleDispatchLabelStatement } from "../studio/core/compiler/dispatchLabelStatementHelpers.js";
import { handleRandomBounceStatement } from "../studio/core/compiler/randomBounceStatementHelpers.js";
import { handleRoutineStatement } from "../studio/core/compiler/routineStatementHelpers.js";
import { handleSpecialIfGotoStatement } from "../studio/core/compiler/specialIfGotoStatementHelpers.js";
import { createRuntimeValueHelpers } from "../studio/core/compiler/runtimeValueHelpers.js";
import { handleSelectCaseStatement } from "../studio/core/compiler/selectCaseStatementHelpers.js";
import { createSimpleArithmeticHelpers } from "../studio/core/compiler/simpleArithmeticHelpers.js";
import { handleSoundSpinnerStatement } from "../studio/core/compiler/soundSpinnerStatementHelpers.js";
import { createTypeSymbolHelpers } from "../studio/core/compiler/typeSymbolHelpers.js";
import { createU32Helpers } from "../studio/core/compiler/u32Helpers.js";
import { createValueParseHelpers } from "../studio/core/compiler/valueParseHelpers.js";
import { finalizeAmyTranspile } from "../studio/core/compiler/transpileFinalizationHelpers.js";
import { handleVramTextStatement } from "../studio/core/compiler/vramTextStatementHelpers.js";
import { handleVramPixelInputStatement } from "../studio/core/compiler/vramPixelInputStatementHelpers.js";
import { transpileAmyCore } from "../studio/core/compiler/transpileAmyCore.js";
import { sourceHintsTinySound, getOptimizationProfile } from "../studio/core/optimization.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

function stripAmyInlineComment(rawLine) {
  const text = String(rawLine || "");
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "\"") {
      if (inString && text[index + 1] === "\"") { index += 1; continue; }
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "'" || ch === ";") return text.slice(0, index).trimEnd();
    if ((ch === "r" || ch === "R") && text.slice(index, index + 3).toLowerCase() === "rem") {
      const prev = index === 0 ? "" : text[index - 1];
      const next = index + 3 >= text.length ? "" : text[index + 3];
      if ((!prev || /\s/.test(prev)) && (!next || /\s/.test(next))) return text.slice(0, index).trimEnd();
    }
  }
  return text;
}

const DEPS = {
  rewriteImmediateByteTempCoordinateUsesCore,
  inferAmyMemoryCapabilities,
  sourceHintsTinySound,
  getRamLayout,
  emitSafeCallCore,
  parseCartridgeDirectiveCore,
  parseExpressionAstCore,
  renderExpressionAstCore,
  createTypeSymbolHelpers,
  createProcHelpers,
  createValueParseHelpers,
  createExpressionComputeHelpers,
  createRuntimeValueHelpers,
  createCompareLiteralHelpers,
  createPrintHelpers,
  createBcdHelpers,
  createControlFlowHelpers,
  createCompilerShellHelpers,
  createDataHelpers,
  createLoadStoreHelpers,
  createByteLoadHelpers,
  createAddressHelpers,
  createU32Helpers,
  createFx16Helpers,
  createSimpleArithmeticHelpers,
  createAssignmentArithmeticHelpers,
  scanAmyFirstPass,
  handleDataMetaStatement,
  handleDeclarationStatement,
  handleProcFunctionStatement,
  handleDisplayGraphicsSpriteStatement,
  handleSoundSpinnerStatement,
  handleVramTextStatement,
  handlePrintFormatStatement,
  handleVramPixelInputStatement,
  handleDataCursorStatement,
  handleWhileStatement,
  handleDoStatement,
  handleIfStatement,
  handleSelectCaseStatement,
  handleForStatement,
  handleRandomBounceStatement,
  handleSpecialIfGotoStatement,
  handleDispatchLabelStatement,
  handleRoutineStatement,
  handleMutateStatement,
  handleMathBitStatement,
  handleArrayBulkStatement,
  createInlineStatementCompiler,
  finalizeAmyTranspile,
  stripAmyInlineComment
};

function transpileAmy(sourceText) {
  return transpileAmyCore(sourceText, DEPS);
}

const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}\n     ${error.message}`);
  }
}

const TABLE_DEMO = `data Level0 bytes $01,$02,$03
data Level1 bytes $04,$05
data Level2 bytes $06

data Levels words
  @Level0, @Level1
  @Level2
end data

data Extras words = @Level2, $8000
data Friction words = $0000, $0050, $0140

u8 LevelNum = 0
u16 P = 0
u8 Code = 0
u16 W = 0
u8 B = 7
ufixed UPos = 96.5
fixed SVel = -2.25
u8 PixelX = 0
i8 PixelV = 0
ufixed UAssign = 0
fixed SAssign = 0
fixed F = 0

P = Levels[LevelNum]
Code = peek(P)
P += 1
Code = peek(P)
W = B << 8
PixelX = UPos
PixelV = SVel
UAssign = B
UAssign = 1.5
SAssign = -2.25
F = raw Friction[LevelNum]
if UAssign > 8 then Code = 1
decompress mdkrle Levels[1] to vram.name
decompress mdkrle Levels[LevelNum] to vram.name
put Levels[LevelNum] frame size 4,4 at 10,5
loop forever
`;

const result = transpileAmy(TABLE_DEMO);

check("word table demo transpiles", () => {
  assert.equal(result.ok, true, result.log || "transpile failed");
});

const asm = String(result?.asmBody || "");
if (process.env.DUMP_ASM) console.log(asm);

check("table emits dw entries with resolved labels", () => {
  assert.match(asm, /AMY_UDATA_Levels:\s*\n\s*dw AMY_UDATA_Level0,AMY_UDATA_Level1,AMY_UDATA_Level2/, "expected a dw line with the three entry labels");
});

check("inline word table with a raw word value", () => {
  assert.match(asm, /AMY_UDATA_Extras:\s*\n\s*dw AMY_UDATA_Level2,\$8000/, "expected inline table with label + $8000");
});

check("constant index folds to the entry label", () => {
  assert.match(asm, /ld hl,AMY_UDATA_Level1\s*\n(?:.*\n)?\s*ld de,VRAM_NAME\s*\n\s*call mdkrle_decompress/, "Levels[1] should load Level1 directly, no table walk");
});

check("variable index emits the minimal dereference sequence", () => {
  assert.match(
    asm,
    /ld a,\(AMY_UVAR_LevelNum\)\s*\n\s*add a,a\s*\n\s*ld e,a\s*\n\s*ld d,0\s*\n\s*ld hl,AMY_UDATA_Levels\s*\n\s*add hl,de\s*\n\s*ld e,\(hl\)\s*\n\s*inc hl\s*\n\s*ld d,\(hl\)\s*\n\s*ex de,hl/,
    "expected the canonical table dereference sequence"
  );
});

check("put frame accepts a table entry as source", () => {
  assert.match(asm, /ex de,hl\s*\n(?:\s*ld [bcde],.*\n)+(?:.*\n)*?\s*call PUT_FRAME/, "PUT_FRAME should be fed by the dereferenced HL");
});

check("word table entry can be assigned to a u16 pointer variable", () => {
  const expected = [
    "    ld a,(AMY_UVAR_LevelNum)",
    "    add a,a",
    "    ld e,a",
    "    ld d,0",
    "    ld hl,AMY_UDATA_Levels",
    "    add hl,de",
    "    ld e,(hl)",
    "    inc hl",
    "    ld d,(hl)",
    "    ex de,hl",
    "    ld (AMY_UVAR_P),hl"
  ].join("\n");
  assert.ok(asm.includes(expected), "P = Levels[LevelNum] should store the dereferenced ROM address directly");
});

check("peek(P) reads one byte from the ROM pointer in HL", () => {
  const expected = [
    "    ld hl,(AMY_UVAR_P)",
    "    ld a,(hl)",
    "    ld (AMY_UVAR_Code),a"
  ].join("\n");
  assert.ok(asm.includes(expected), "Code = peek(P) should compile to ld hl,(P) / ld a,(hl) / store");
});

check("u16 = u8 << 8 stores the byte directly as a 16-bit word", () => {
  const expected = [
    "    ld a,(AMY_UVAR_B)",
    "    ld h,a",
    "    ld l,0",
    "    ld (AMY_UVAR_W),hl"
  ].join("\n");
  assert.ok(asm.includes(expected), "W = B << 8 should build HL and store the word directly");
  assert.doesNotMatch(asm, /ld \(AMY_UVAR_W\+1\),a\s*\n\s*xor a\s*\n\s*ld \(AMY_UVAR_W\+0\),a/, "W = B << 8 should not use two byte stores");
});

check("ufixed to u8 stores the 8.8 integer byte", () => {
  const expected = [
    "    ld hl,(AMY_UVAR_UPos)",
    "    ld a,h",
    "    ld (AMY_UVAR_PixelX),a"
  ].join("\n");
  assert.ok(asm.includes(expected), "PixelX = UPos should compile to a high-byte store only");
});

check("fixed to i8 stores the signed 8.8 integer byte", () => {
  const expected = [
    "    ld hl,(AMY_UVAR_SVel)",
    "    ld a,h",
    "    ld (AMY_UVAR_PixelV),a"
  ].join("\n");
  assert.ok(asm.includes(expected), "PixelV = SVel should compile to a signed high-byte store only");
});


check("u8 to ufixed stores the byte as one 8.8 word", () => {
  const expected = [
    "    ld a,(AMY_UVAR_B)",
    "    ld h,a",
    "    ld l,0",
    "    ld (AMY_UVAR_UAssign),hl"
  ].join("\n");
  assert.ok(asm.includes(expected), "UAssign = B should build HL and store the 8.8 word directly");
  assert.doesNotMatch(asm, /ld \(AMY_UVAR_UAssign\+1\),a\s*\n\s*xor a\s*\n\s*ld \(AMY_UVAR_UAssign\+0\),a/, "UAssign = B should not use two byte stores");
});

check("decimal fixed literals are encoded as 8.8 values", () => {
  assert.match(asm, /ld hl,\$0180\s*\n\s*ld \(AMY_UVAR_UAssign\),hl/, "UAssign = 1.5 should store $0180 as one word");
  assert.match(asm, /ld hl,\$FDC0\s*\n\s*ld \(AMY_UVAR_SAssign\),hl/, "SAssign = -2.25 should store $FDC0 as one word");
});

check("raw word table entry can be assigned to fixed without scaling", () => {
  const expected = [
    "    ld a,(AMY_UVAR_LevelNum)",
    "    add a,a",
    "    ld e,a",
    "    ld d,0",
    "    ld hl,AMY_UDATA_Friction",
    "    add hl,de",
    "    ld e,(hl)",
    "    inc hl",
    "    ld d,(hl)",
    "    ex de,hl",
    "    ld (AMY_UVAR_F),hl"
  ].join("\n");
  assert.ok(asm.includes(expected), "F = raw Friction[LevelNum] should store the raw table word, not a scaled fixed literal or invalid ASM");
});

check("fixed comparisons against plain numbers compare full 8.8 values", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_UAssign\)\s*\n\s*ld de,2048\s*\n\s*or a\s*\n\s*sbc hl,de/, "UAssign > 8 should compare against $0800, not raw byte 8");
});
const inlineDataClosure = transpileAmy(`data Bytes bytes = 1,2
text screen
data Payload bytes = 3
data Pointers words = @Payload
screen on
loop forever
`);

check("inline byte and word data close before the next statement", () => {
  assert.equal(inlineDataClosure.ok, true, inlineDataClosure.log || "transpile failed");
  const inlineAsm = String(inlineDataClosure.asmBody || "");
  assert.match(inlineAsm, /AMY_UDATA_Bytes:\s*\n\s*db \$01,\$02/, "inline byte data should contain only its declared values");
  assert.match(inlineAsm, /AMY_UDATA_Pointers:\s*\n\s*dw AMY_UDATA_Payload/, "inline word data should contain only its declared entries");
  assert.doesNotMatch(inlineAsm, /\bdb\s+[^\n]*(?:text|screen)/i, "the following Amy statement must not be swallowed as data");
});

check("mixed signedness fixed-byte cast is rejected", () => {
  const bad = transpileAmy("fixed SVel = -1.5\nu8 Pixel = 0\nPixel = SVel\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /Cannot compile assignment|assignment/i);
});

check("constant index out of range is a clear error", () => {
  const bad = transpileAmy("data L0 bytes $01\n\ndata Levels words = @L0\n\ndecompress mdkrle Levels[3] to vram.name\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /word table|out-of-range/i);
});

check("word table assignment constant index out of range is a clear error", () => {
  const bad = transpileAmy("data L0 bytes $01\n\ndata Levels words = @L0\n\nu16 Address = 0\nAddress = Levels[9]\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /Word table Levels index 9 is out-of-range/);
});
check("bare identifier entry without @ is rejected", () => {
  const bad = transpileAmy("data L0 bytes $01\n\ndata Levels words = L0\n\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /Invalid word table entry/i);
});

check("empty word table is rejected", () => {
  const bad = transpileAmy("data Levels words\nend data\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /empty/i);
});

const DISPATCH_DEMO = `u8 State = 0
u16 WideState = 0

sub start:
  on State goto StateOne, StateTwo, StateThree
  on WideState gosub StateOne, StateTwo, StateThree
  loop forever
end sub

sub StateOne:
  return
end sub
sub StateTwo:
  return
end sub
sub StateThree:
  return
end sub
`;
const dispatchResult = transpileAmy(DISPATCH_DEMO);
const dispatchAsm = String(dispatchResult?.asmBody || "");

check("indexed dispatch demo transpiles", () => {
  assert.equal(dispatchResult.ok, true, dispatchResult.log || "transpile failed");
});

check("on goto emits a bounded ROM address table", () => {
  assert.match(dispatchAsm, /dec a\s*\n\s*cp 3\s*\n\s*jp nc,[^\n]+\s*\n\s*ld l,a\s*\n\s*ld h,0\s*\n\s*add hl,hl/);
  assert.match(dispatchAsm, /dw AMY_UPROC_StateOne,AMY_UPROC_StateTwo,AMY_UPROC_StateThree/);
  assert.match(dispatchAsm, /jp \(hl\)/);
  assert.doesNotMatch(dispatchAsm, /cp 1\s*\n\s*jp nz/);
});

check("on gosub uses an indirect-call trampoline", () => {
  assert.match(dispatchAsm, /call AMY_ON_DISPATCH_CALL_[^\n]+\s*\n\s*jp AMY_ON_DISPATCH_DONE_[^\n]+\s*\nAMY_ON_DISPATCH_CALL_[^:]+:\s*\n\s*jp \(hl\)/);
});

check("word selector rejects a nonzero high byte before table indexing", () => {
  assert.match(dispatchAsm, /ld hl,\(AMY_UVAR_WideState\)\s*\n\s*ld a,h\s*\n\s*or a\s*\n\s*jp nz,AMY_ON_DISPATCH_DONE_/);
});

const MANY_TARGETS = Array.from({ length: 130 }, (_, index) => `S${index + 1}`);
const manyDispatch = transpileAmy(`u8 State = 0\non State goto ${MANY_TARGETS.join(", ")}\nloop forever\n${MANY_TARGETS.map((name) => `${name}:\n  loop forever`).join("\n")}\n`);
const manyDispatchAsm = String(manyDispatch?.asmBody || "");
check("large dispatch tables widen the selector before doubling", () => {
  assert.equal(manyDispatch.ok, true, manyDispatch.log || "transpile failed");
  assert.match(manyDispatchAsm, /cp 130\s*\n\s*jp nc,[^\n]+\s*\n\s*ld l,a\s*\n\s*ld h,0\s*\n\s*add hl,hl/);
  assert.doesNotMatch(manyDispatchAsm, /add a,a/);
});
const FOR_EACH_DEMO = `record Actor:
  u8 X
  i8 DX
end record
Actor Actors[3]
u8 I = 0
u8 J = 0
u8 Sum = 0
sub start:
  for each Actor, I in Actors
    for J = 0 to 1
      Sum += Actor.X
    next J
    Actor.X += 1
    Sum += Actor.X
  next
  loop forever
end sub
`;
const forEachResult = transpileAmy(FOR_EACH_DEMO);
const forEachAsm = String(forEachResult?.asmBody || "");
check("for each aliases a global record-array element through an explicit index", () => {
  assert.equal(forEachResult.ok, true, forEachResult.log || "transpile failed");
  assert.match(forEachAsm, /AMY_UVAR_Actors[\s\S]*AMY_UVAR_I/);
  assert.doesNotMatch(forEachAsm, /Actor\.X/);
});
const forEachMissingIndex = transpileAmy(`u8 Values[2]\nfor each Value in Values\n  Value += 1\nnext\nloop forever\n`);
check("for each survives a nested counted loop without losing its alias", () => {
  const actorAddressLoads = forEachAsm.match(/ld hl,\$7020/g) || [];
  assert.ok(actorAddressLoads.length >= 2, `expected repeated Actors[I] accesses, got ${actorAddressLoads.length}`);
});
check("for each rejects an omitted index without allocating hidden RAM", () => {
  assert.equal(forEachMissingIndex.ok, false);
  assert.match(String(forEachMissingIndex.log || ""), /requires an explicit u8 index/i);
});
const RECORD_DATA_COPY_DEMO = `record Actor:
  u8 X
  u8 Y
  i8 DX
  i8 DY
  u8 State
end record
Actor Actors[3]
const Flying = 1
data Wave records Actor
  40,48,6,5,Flying
  200,88,-6,4,Flying
  120,144,5,-6,Flying
end data
copy Wave to Actors
loop forever
`;
const recordDataCopyResult = transpileAmy(RECORD_DATA_COPY_DEMO);
const recordDataCopyAsm = String(recordDataCopyResult?.asmBody || "");
check("typed record data copies an exact ROM template into a RAM record array", () => {
  assert.equal(recordDataCopyResult.ok, true, recordDataCopyResult.log || "transpile failed");
  assert.match(recordDataCopyAsm, /AMY_UDATA_Wave:[\s\S]*db \$28,\$30,\$06,\$05,AMY_UCONST_Flying/i);
  assert.match(recordDataCopyAsm, /ld hl,AMY_UDATA_Wave[\s\S]*ld bc,15\s*\n\s*ldir/i);
});
const RECORD_DATA_STREAM_DEMO = `record Actor:
  u8 X
  u8 Y
  i8 DX
  i8 DY
  u8 State
end record
Actor Flies[3]
u8 I = 0
data WaveStream bytes
  3
  40,48,6,5,1
  200,88,-6,4,1
  120,144,5,-6,1
end data
restore WaveStream
read I
for I = 0 to 2
  read Flies[I].X, Flies[I].Y, Flies[I].DX, Flies[I].DY, Flies[I].State
next
loop forever
`;
const recordDataStreamResult = transpileAmy(RECORD_DATA_STREAM_DEMO);
check("DATA cursor reads can initialize indexed record fields", () => {
  assert.equal(recordDataStreamResult.ok, true, recordDataStreamResult.log || "transpile failed");
});

const recordDataSizeMismatch = transpileAmy(`record P:\n  u8 X\nend record\nP Items[2]\ndata One records P\n  1\nend data\ncopy One to Items\nloop forever\n`);
check("typed record data rejects a destination with a different element count", () => {
  assert.equal(recordDataSizeMismatch.ok, false);
  assert.match(String(recordDataSizeMismatch.log || ""), /record copy size mismatch/i);
});

const SPRITE_INDEX_EXPRESSION_DEMO = `u8 I = 0
u8 V = 0
hitbox H = 0,0 size 8,8
sub start:
  set sprite I + 1 y to 40
  V = sprite I + 1 x
  if sprite I hitbox H collides with sprite I + 1 hitbox H then V = 1
  loop forever
end sub
`;
const spriteIndexExpressionResult = transpileAmy(SPRITE_INDEX_EXPRESSION_DEMO);
const spriteIndexExpressionAsm = String(spriteIndexExpressionResult?.asmBody || "");
check("sprite field setters/getters accept runtime index expressions", () => {
  assert.equal(spriteIndexExpressionResult.ok, true, spriteIndexExpressionResult.log || "transpile failed");
  assert.match(spriteIndexExpressionAsm, /add a,1[\s\S]*ld de,AMY_SPRITE_TABLE\+0[\s\S]*ld \(hl\),a/);
  assert.match(spriteIndexExpressionAsm, /add a,1[\s\S]*ld de,AMY_SPRITE_TABLE\+1[\s\S]*ld a,\(hl\)/);
});
check("named hitbox collisions accept runtime sprite index expressions", () => {
  assert.match(spriteIndexExpressionAsm, /add a,1\s*\n\s*ld b,a[\s\S]*call AMY_CHECK_COLLISION_RAW/);
});
const LOGICAL_BOX_COLLISION_DEMO = `u8 PlayerX = 40
u8 PlayerY = 50
u8 BossX = 96
u8 BossY = 64
u8 Hit = 0

sub start:
  if box PlayerX,PlayerY size 15,15 collides with box BossX,BossY size 56,24 then
    Hit = 1
  end if
  if not box PlayerX,PlayerY size 1,1 collides with box BossX,BossY size 1,1 then
    Hit = 2
  end if
  loop forever
end sub
`;
const logicalBoxCollisionResult = transpileAmy(LOGICAL_BOX_COLLISION_DEMO);
const logicalBoxCollisionAsm = String(logicalBoxCollisionResult?.asmBody || "");
check("logical pixel-box collision transpiles", () => {
  assert.equal(logicalBoxCollisionResult.ok, true, logicalBoxCollisionResult.log || "transpile failed");
  assert.match(logicalBoxCollisionAsm, /add a,14/i, "15-pixel constant width should fold to an inclusive +14 edge");
  assert.match(logicalBoxCollisionAsm, /add a,55/i, "56-pixel constant width should fold to an inclusive +55 edge");
  assert.doesNotMatch(logicalBoxCollisionAsm, /GET_BKGRND|GET_VRAM|AMY_CHECK_COLLISION_RAW/i, "logical boxes must not read VRAM or require sprite collision helpers");
});
const BIOS_STUBS = [
  "TURN_OFF_SOUND EQU $1FD6",
  "MODE_1 EQU $1F85",
  "WRITE_REGISTER EQU $1FD9",
  "READ_REGISTER EQU $1FDC",
  "VRAM_PATTERN EQU $0000",
  "VRAM_NAME EQU $1800",
  "VRAM_COLOR EQU $2000",
  "VRAM_SPR_PAT EQU $3800",
  "VRAM_SPR_ATTR EQU $1B00",
  "PUT_FRAME EQU $9000",
  "mdkrle_decompress EQU $9100",
  "AMY_VRAM_BEGIN: ret",
  "AMY_VRAM_END: ret",
  ""
].join("\n");
const assembled = await assembleAmysCVAssembly({ "main.asm": BIOS_STUBS + asm }, "main.asm", {
  outputFilename: "word-table-demo.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: false
});

check("word table demo assembles to raw binary", () => {
  assert.equal(assembled.ok, true, assembled.log || "assembly failed");
  const size = assembled.binary?.length ?? assembled.bytes?.length ?? 0;
  assert.ok(size > 0, "empty binary");
  console.log(`     word table demo code size: ${size} bytes (unoptimized, raw)`);
});

const balancedProfile = getOptimizationProfile("balanced", BIOS_STUBS + asm);
const optimized = await assembleAmysCVAssembly({ "main.asm": BIOS_STUBS + asm }, "main.asm", {
  outputFilename: "word-table-demo-opt.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: balancedProfile.optimizerEnabled,
  optimizerConfig: balancedProfile.optimizerConfig
});

check("word table demo survives the balanced optimizer", () => {
  assert.equal(optimized.ok, true, optimized.log || "optimized assembly failed");
  assert.match(String(optimized.listing || ""), /ex de,hl/i, "table dereference must survive optimization");
  const size = optimized.binary?.length ?? optimized.bytes?.length ?? 0;
  console.log(`     word table demo code size: ${size} bytes (balanced optimizer)`);
});

if (failures.length) {
  console.error(`\n${failures.length} test(s) failed`);
  process.exit(1);
}
console.log("\nAll word table codegen tests passed");
