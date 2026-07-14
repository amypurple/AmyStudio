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

const FIXED_DEMO = `const MaxWhole = 160
const MinWhole = 16
ufixed XInit = 8
ufixed X = 0
ufixed UfixedX = 2.25
fixed V = -2.25
fixed Acc = 0
fixed Neg = 0
u8 S = 0
i8 D = 0
u8 Frac = 0
u8 Code = 0
u8 R = 0
u8 Counter = 3

S = XInit
X = 1.5
S = X
D = V
set sprite 0 x to X
print at whole X,5,"A"
set sprite 0 x to whole X
if whole X > 5 then Code = 1
if X > S then Code = 3
Frac = fraction X
if X > 8 then Code = 2
if X > MaxWhole then Code = 16
if X < MinWhole then Code = 17
if V < 0 then Code = 4
if V > 0 then Code = 5
if V <= 0 then Code = 10
if V >= 0 then Code = 11
if V == 0 then Code = 12
if V != 0 then Code = 13
if V < -4 then Code = 6
if V > 8 then Code = 7
if signed D < 0 then Code = 8
if signed D >= 0 then Code = 14
Acc += V
Neg = 0 - V
Code = Code & $F7
if Code != 0 then Frac = 2
if Code != Frac then R = 2
if joypad(1).left then Code = 9
R = random(1, 6)
Counter -= 1
if Counter != 0 goto CounterLoop
Code = 15
CounterLoop:
loop forever
`;

const result = transpileAmy(FIXED_DEMO);

check("fixed byte-context demo transpiles", () => {
  assert.equal(result.ok, true, result.log || "transpile failed");
});

const asm = String(result?.asmBody || "");
if (process.env.DUMP_ASM) console.log(asm);

check("fixed declaration literals are encoded as 8.8 values", () => {
  assert.match(asm, /AMY_INIT_RAM:[\s\S]*ld a,\$08\s*\n\s*ld \(\$[0-9A-Fa-f]+\),a/, "ufixed XInit = 8 should initialize high byte $08 after RAM clear");
});

check("decimal fixed assignment stores $0180", () => {
  assert.match(asm, /ld hl,\$0180\s*\n\s*ld \(AMY_UVAR_X\),hl/, "X = 1.5 should store $0180 as one word");
  assert.doesNotMatch(asm, /ld a,\$80\s*\n\s*ld \(AMY_UVAR_X\+0\),a\s*\n\s*ld a,\$01\s*\n\s*ld \(AMY_UVAR_X\+1\),a/, "X = 1.5 should not use two byte stores");
});

check("ufixed to u8 stores the integer high byte", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,h\s*\n\s*ld \(AMY_UVAR_S\),a/, "S = X should use high byte");
});

check("set sprite x with ufixed uses high byte, not fraction", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,h\s*\n\s*ld \(AMY_SPRITE_TABLE\+1\),a/, "set sprite 0 x to X should use high byte");
  assert.doesNotMatch(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,l\s*\n\s*ld \(AMY_SPRITE_TABLE\+1\),a/, "sprite X must not use fraction byte");
});

check("whole works in print coordinates", () => {
  assert.match(asm, /ld d,5\s*\n\s*ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,h\s*\n\s*ld e,a/, "print at whole X,5 should load X high byte into E");
});

check("whole works in sprite field setters", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,h\s*\n\s*ld \(AMY_SPRITE_TABLE\+1\),a/, "set sprite 0 x to whole X should use high byte");
});

check("whole works in 8-bit comparisons", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,h\s*\n\s*cp 5/, "if whole X > 5 should compile as an 8-bit compare against 6");
});

check("ufixed compared to u8 uses implicit whole byte compare", () => {
  assert.match(asm, /ld a,\(AMY_UVAR_S\)\s*\n\s*ld b,a\s*\n\s*ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,h\s*\n\s*cp b/, "if X > S should compare whole X against byte S without saving AF");
  assert.doesNotMatch(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,h\s*\n\s*push af\s*\n\s*ld a,\(AMY_UVAR_S\)/, "if X > S should not push AF around the byte operand load");
  assert.doesNotMatch(asm, /AMY_CMP_LEFT32[\s\S]*if X > S/, "if X > S should not require scratch32 compare");
});

check("fraction works in byte assignment", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld a,l\s*\n\s*ld \(AMY_UVAR_Frac\),a/, "Frac = fraction X should use low byte");
});

check("signed fixed and byte comparisons against literals avoid scratch32", () => {
  assert.doesNotMatch(asm, /AMY_CMP_LEFT32|AMY_CMP_RIGHT32/, "signed fixed/byte literal compares in this demo should not allocate scratch32 compare RAM");
  assert.match(asm, /ld a,\(AMY_UVAR_D\)\s*\n\s*or a\s*\n\s*jp m,/, "signed D < 0 should use sign-bit test, not general signed compare");
  assert.match(asm, /ld a,\(AMY_UVAR_D\)\s*\n\s*or a\s*\n\s*jp p,/, "signed D >= 0 should use sign-bit test, not general signed compare");
  assert.match(asm, /ld hl,\(AMY_UVAR_V\)\s*\n\s*ld a,h\s*\n\s*or a\s*\n\s*jp m,/, "V < 0 should use high-byte sign test");
  assert.match(asm, /ld hl,\(AMY_UVAR_V\)\s*\n\s*ld a,h\s*\n\s*or a\s*\n\s*jp p,/, "V >= 0 should use high-byte sign test");
  assert.match(asm, /ld hl,\(AMY_UVAR_V\)\s*\n\s*ld a,h\s*\n\s*or l\s*\n\s*jp z,/, "V == 0 should use hl zero test");
  assert.match(asm, /ld hl,\(AMY_UVAR_V\)\s*\n\s*ld a,h\s*\n\s*or l\s*\n\s*jp nz,/, "V != 0 should use hl zero test");
  assert.match(asm, /ld hl,\(AMY_UVAR_V\)\s*\n\s*ld de,-1024\s*\n[\s\S]*?ld a,h\s*\n\s*xor \$80/, "V < -4 should compare against raw $FC00/-1024 as signed 16-bit");
  assert.match(asm, /ld hl,\(AMY_UVAR_V\)\s*\n\s*ld de,2048\s*\n[\s\S]*?ld a,h\s*\n\s*xor \$80/, "V > 8 should compare against $0800 as signed 16-bit");
});

check("full fixed comparison against integer stays 8.8", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld de,2048\s*\n\s*or a\s*\n\s*sbc hl,de/, "if X > 8 should compare against $0800");
});

check("full fixed comparison against named constants stays 8.8", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld de,40960\s*\n\s*or a\s*\n\s*sbc hl,de/, "if X > MaxWhole should compare against 160.0/$A000, not raw 160");
  assert.match(asm, /ld hl,\(AMY_UVAR_X\)\s*\n\s*ld de,4096\s*\n\s*or a\s*\n\s*sbc hl,de/, "if X < MinWhole should compare against 16.0/$1000, not raw 16");
});

check("fixed += fixed global source loads DE directly", () => {
  assert.match(asm, /ld hl,\(AMY_UVAR_Acc\)\s*\n\s*ld de,\(AMY_UVAR_V\)\s*\n\s*add hl,de/, "Acc += V should use ld de,(V), not push/ex/pop");
  assert.doesNotMatch(asm, /ld hl,\(AMY_UVAR_Acc\)\s*\n\s*push hl\s*\n\s*ld hl,\(AMY_UVAR_V\)/, "Acc += V should not spill the target through the stack");
});

check("fixed 0-minus global source negates without stack spill", () => {
  assert.match(asm, new RegExp("ld de,\\(AMY_UVAR_V\\)\\s*\\n\\s*ld hl,0\\s*\\n\\s*or a\\s*\\n\\s*sbc hl,de\\s*\\n\\s*ld \\(AMY_UVAR_Neg\\),hl"), "Neg = 0 - V should use direct DE load and 16-bit subtract");
  assert.doesNotMatch(asm, new RegExp("ld hl,0\\s*\\n\\s*push hl\\s*\\n\\s*ld hl,\\(AMY_UVAR_V\\)"), "Neg = 0 - V should not use the generic push/ex/pop subtraction path");
});

check("byte expression with hex literal uses immediate op", () => {
  assert.match(asm, new RegExp("ld a,\\(AMY_UVAR_Code\\)\\s*\\n\\s*and (?:\\$F7|247)\\s*\\n\\s*ld \\(AMY_UVAR_Code\\),a"), "Code = Code & $F7 should use and $F7 directly");
  assert.doesNotMatch(asm, new RegExp("ld a,\\(AMY_UVAR_Code\\)\\s*\\n\\s*push af\\s*\\n\\s*ld a,\\$F7\\s*\\n\\s*ld b,a\\s*\\n\\s*pop af\\s*\\n\\s*and b"), "Code = Code & $F7 should not materialize $F7 through B");
});


check("byte comparison against zero uses or a", () => {
  assert.match(asm, /ld a,\(AMY_UVAR_Code\)\s*\n\s*or a\s*\n\s*jp z,/, "if Code != 0 should test A with or a when skipping the true branch");
  assert.doesNotMatch(asm, /ld a,\(AMY_UVAR_Code\)\s*\n\s*cp 0\s*\n\s*jp z,/, "if Code != 0 should not emit cp 0");
});

check("byte variable comparison loads right side into B without AF spill", () => {
  assert.match(asm, /ld a,\(AMY_UVAR_Frac\)\s*\n\s*ld b,a\s*\n\s*ld a,\(AMY_UVAR_Code\)\s*\n\s*cp b\s*\n\s*jp z,AMY_IF_FALSE_/, "if Code != Frac should compare byte variables without push/pop AF");
  assert.doesNotMatch(asm, /ld a,\(AMY_UVAR_Code\)\s*\n\s*push af\s*\n\s*ld a,\(AMY_UVAR_Frac\)/, "if Code != Frac should not push AF around the right operand load");
});
check("joypad bit if condition branches directly", () => {
  assert.match(asm, /ld a,\(JOYPAD_1\)\s*\n\s*bit 3,a\s*\n\s*jp z,/, "if joypad(1).left then should branch directly on bit 3 when skipping false branch");
  assert.doesNotMatch(asm, /AMY_INPUT_FALSE|AMY_INPUT_DONE/, "direct joypad if should not materialize a boolean byte");
});

check("random between call is lowered before assembly", () => {
  assert.match(asm, /AMY_RANDOM_U8/, "R = random(1, 6) should call the random byte helper");
  assert.match(asm, /ld c,1\s*\n\s*ld b,6/, "R = random(1, 6) should materialize min and inclusive range, not leave a text expression");
  assert.doesNotMatch(asm, /random\s*\(/i, "random(min,max) must not leak into generated assembly");
});


check("dec byte followed by nonzero goto reuses dec flags", () => {
  assert.match(asm, /ld hl,AMY_UVAR_Counter\s*\n\s*dec \(hl\)\s*\n\s*jp nz,AMY_ULBL_CounterLoop/, "Counter -= 1 followed by if Counter != 0 goto should branch from dec flags");
  assert.doesNotMatch(asm, /ld hl,AMY_UVAR_Counter\s*\n\s*dec \(hl\)\s*\n\s*ld a,\(AMY_UVAR_Counter\)\s*\n\s*or a\s*\n\s*jp nz,AMY_ULBL_CounterLoop/, "Counter loop should not reload the byte just to test zero");
});

check("mixed signedness fixed-byte cast is rejected", () => {
  const bad = transpileAmy("ufixed UfixedX = 1.5\ni8 D = 0\nD = UfixedX\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /Cannot compile assignment|assignment/i);
});

check("fixed for-loop variable is rejected", () => {
  const bad = transpileAmy("fixed F = 0\nfor F = 0 to 5\nnext\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /for loop variable cannot be fixed\/ufixed/i);
});

check("fixed for-loop bound is rejected", () => {
  const bad = transpileAmy("u8 I = 0\nufixed X = 5\nfor I = 0 to X\nnext\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /for loop bound cannot be fixed\/ufixed/i);
});

check("whole fixed for-loop bound is accepted", () => {
  const ok = transpileAmy("u8 I = 0\nufixed X = 5\nfor I = 0 to whole X\nnext\nloop forever\n");
  assert.equal(ok.ok, true, ok.log || "whole bound should compile");
});

const RECORD_FIXED_DEMO = `record Ship:
  ufixed X
  ufixed Y
  fixed VX
  fixed VY
  u8 Orient
end record

const MaxShipY = 160
const MinShipY = 16
Ship Ships[2]
u8 ScreenX = 0
u8 Pattern = 0

Ships[0].X = 16
Ships[0].Y = 24
Ships[0].VX = -1.5
Ships[1].X = Ships[0].X
Ships[1].Y += Ships[0].Y
ScreenX = Ships[0].X
set sprite 0 x to Ships[0].X
set sprite 0 y to Ships[0].Y
Pattern = Ships[0].Orient
if Ships[0].Y > MaxShipY then Pattern = 1
if Ships[0].Y < MinShipY then Pattern = 2
loop forever
`;

const recordFixedResult = transpileAmy(RECORD_FIXED_DEMO);
const recordFixedAsm = String(recordFixedResult?.asmBody || "");
if (process.env.DUMP_RECORD_ASM) console.log(recordFixedAsm);

check("record fixed-field demo transpiles", () => {
  assert.equal(recordFixedResult.ok, true, recordFixedResult.log || "record fixed fields should compile");
});

check("record fixed-field literals store raw 8.8 words", () => {
  assert.match(recordFixedAsm, /ld hl,\$1000\s*\n\s*ld \(\$[0-9A-F]{4}\),hl/i, "Ships[0].X = 16 should store $1000 directly");
  assert.match(recordFixedAsm, /ld hl,\$FE80\s*\n\s*ld \(\$[0-9A-F]{4}\),hl/i, "Ships[0].VX = -1.5 should store $FE80 directly");
});

check("record fixed fields cast to byte contexts with the whole byte", () => {
  assert.match(
    recordFixedAsm,
    /ld a,\(\$[0-9A-F]{4}\+0\)\s*\n\s*ld l,a\s*\n\s*ld a,\(\$[0-9A-F]{4}\+1\)\s*\n\s*ld h,a\s*\n\s*ld a,h\s*\n\s*ld \(AMY_UVAR_ScreenX\),a/i,
    "ScreenX = Ships[0].X should use high byte"
  );
  assert.match(
    recordFixedAsm,
    /ld a,\(\$[0-9A-F]{4}\+0\)\s*\n\s*ld l,a\s*\n\s*ld a,\(\$[0-9A-F]{4}\+1\)\s*\n\s*ld h,a\s*\n\s*ld a,h\s*\n\s*ld \(AMY_SPRITE_TABLE\+1\),a/i,
    "set sprite x to Ships[0].X should use high byte"
  );
});

check("record fixed-field arithmetic does not emit fake indexed labels", () => {
  assert.doesNotMatch(recordFixedAsm, /AMY_UVAR_Ships\[[^\]]+\]\./, "record fixed arithmetic must not emit impossible indexed ASM symbols");
  assert.match(recordFixedAsm, /ex de,hl[\s\S]*?add hl,de/i, "record fixed += source should load through HL then move source to DE");
});

check("record fixed-field += preserves the target while loading an indexed source", () => {
  assert.match(
    recordFixedAsm,
    /ld a,\(\$[0-9A-F]{4}\+0\)\s*\n\s*ld l,a\s*\n\s*ld a,\(\$[0-9A-F]{4}\+1\)\s*\n\s*ld h,a\s*\n\s*push hl\s*\n\s*ld a,\(\$[0-9A-F]{4}\+0\)\s*\n\s*ld l,a\s*\n\s*ld a,\(\$[0-9A-F]{4}\+1\)\s*\n\s*ld h,a\s*\n\s*ex de,hl\s*\n\s*pop hl\s*\n\s*add hl,de\s*\n\s*ld \(\$[0-9A-F]{4}\),hl/i,
    "Ships[1].Y += Ships[0].Y must preserve target HL while loading the indexed source"
  );
  assert.doesNotMatch(
    recordFixedAsm,
    /ld a,\(\$[0-9A-F]{4}\+0\)\s*\n\s*ld l,a\s*\n\s*ld a,\(\$[0-9A-F]{4}\+1\)\s*\n\s*ld h,a\s*\n\s*ld a,\(\$[0-9A-F]{4}\+0\)\s*\n\s*ld l,a\s*\n\s*ld a,\(\$[0-9A-F]{4}\+1\)\s*\n\s*ld h,a\s*\n\s*ex de,hl\s*\n\s*add hl,de/i,
    "record fixed += must not overwrite target HL with the source before add"
  );
});

check("record fixed-field comparisons against named constants stay 8.8", () => {
  assert.match(recordFixedAsm, /ld de,40960/i, "Ships[0].Y > MaxShipY should compare against 160.0/$A000");
  assert.match(recordFixedAsm, /ld de,4096/i, "Ships[0].Y < MinShipY should compare against 16.0/$1000");
  assert.doesNotMatch(recordFixedAsm, /ld hl,AMY_UCONST_MaxShipY/i, "fixed compare must not use raw const symbol MaxShipY as $00A0");
  assert.doesNotMatch(recordFixedAsm, /ld hl,AMY_UCONST_MinShipY/i, "fixed compare must not use raw const symbol MinShipY as $0010");
});
const RAW_ASM_AFTER_SUB_DEMO = `sub start:
  set sound table RawSoundTable areas 1
  loop forever
end sub

asm {
RawSoundTable:
    dw RawSound,$702B
RawSound:
    db $50
}
`;
const rawAsmAfterSubResult = transpileAmy(RAW_ASM_AFTER_SUB_DEMO);
const rawAsmAfterSubAsm = String(rawAsmAfterSubResult?.asmBody || "");

check("top-level asm block after end sub is preserved", () => {
  assert.equal(rawAsmAfterSubResult.ok, true, rawAsmAfterSubResult.log || "raw asm after sub should compile");
  assert.match(rawAsmAfterSubAsm, /^RawSoundTable:/m, "raw ASM sound table label should survive pruning");
  assert.match(rawAsmAfterSubAsm, /ld hl,RawSoundTable/i, "set sound table should still refer to the raw ASM label");
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
  "WRITE_VRAM EQU $1FDF",
  "CALC_OFFSET EQU $9200",
  "AMY_SPRITE_TABLE EQU $7100",
  "JOYPAD_1 EQU $73EE",
  "AMY_UPDATE_SPRITES EQU $9000",
  "AMY_RANDOM_U8:",
  "    ret",
  ""
].join("\n");
const assembled = await assembleAmysCVAssembly({ "main.asm": BIOS_STUBS + asm }, "main.asm", {
  outputFilename: "fixed-byte-context-demo.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: false
});

check("fixed byte-context demo assembles to raw binary", () => {
  assert.equal(assembled.ok, true, assembled.log || "assembly failed");
  const size = assembled.binary?.length ?? assembled.bytes?.length ?? 0;
  assert.ok(size > 0, "empty binary");
  console.log(`     fixed byte-context demo code size: ${size} bytes (unoptimized, raw)`);
});

const balancedProfile = getOptimizationProfile("balanced", BIOS_STUBS + asm);
const optimized = await assembleAmysCVAssembly({ "main.asm": BIOS_STUBS + asm }, "main.asm", {
  outputFilename: "fixed-byte-context-demo-opt.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: balancedProfile.optimizerEnabled,
  optimizerConfig: balancedProfile.optimizerConfig
});

check("fixed byte-context demo survives the balanced optimizer", () => {
  assert.equal(optimized.ok, true, optimized.log || "optimized assembly failed");
  const size = optimized.binary?.length ?? optimized.bytes?.length ?? 0;
  console.log(`     fixed byte-context demo code size: ${size} bytes (balanced optimizer)`);
});

if (failures.length) {
  console.error(`\n${failures.length} test(s) failed`);
  process.exit(1);
}
console.log("\nAll fixed byte-context codegen tests passed");
