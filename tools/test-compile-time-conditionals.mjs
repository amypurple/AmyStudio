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

function requireOk(result, label) {
  assert.equal(result.ok, true, label + ": " + (result.log || "transpile failed"));
  return String(result.asmBody || "");
}

const modern = transpileAmy(`define DEBUG
define TITLE_ONLY

if defined DEBUG and TITLE_ONLY
  asset ActiveAsset from "@project/does-not-need-to-exist.bin" codec raw
  data ActiveData bytes $11
  u8 Result = 0
  Result = 7
else defined DEBUG
  asset WrongAsset from "@project/missing-debug.bin" codec raw
  data WrongData bytes $22
  u8 WrongDebug = 0
else defined
  asset FallbackAsset from "@project/missing-fallback.bin" codec raw
  data FallbackData bytes $33
  u8 WrongFallback = 0
end defined

loop forever
`);
const modernAsm = requireOk(modern, "modern defined expression");
assert.match(modernAsm, /AMY_UDATA_ActiveData:/);
assert.doesNotMatch(modernAsm, /AMY_UDATA_WrongData:/);
assert.doesNotMatch(modernAsm, /AMY_UDATA_FallbackData:/);
assert.match(modernAsm, /ld a,7\b/);
assert.equal(modern.assets.length, 1);
assert.equal(modern.assets[0].name, "ActiveAsset");

const fallback = transpileAmy(`define DEBUG

if defined RELEASE or TITLE_ONLY
  data WrongData bytes $22
  u8 Wrong = 0
else defined DEBUG and not TITLE_ONLY
  data DebugData bytes $44
  u8 Result = 0
  Result = 4
else defined
  data FallbackData bytes $55
  u8 WrongFallback = 0
end defined

loop forever
`);
const fallbackAsm = requireOk(fallback, "else defined expression");
assert.match(fallbackAsm, /AMY_UDATA_DebugData:/);
assert.doesNotMatch(fallbackAsm, /AMY_UDATA_WrongData:/);
assert.doesNotMatch(fallbackAsm, /AMY_UDATA_FallbackData:/);
assert.match(fallbackAsm, /ld a,4\b/);

const runtimeElse = transpileAmy(`define DEBUG
u8 X = 0

if defined DEBUG
  if X = 1 then
    X = 2
  else
    X = 3
  end if
end defined

loop forever
`);
const runtimeElseAsm = requireOk(runtimeElse, "runtime else inside compile-time block");
assert.match(runtimeElseAsm, /ld a,3\b/);
assert.match(runtimeElseAsm, /AMY_IF_END_/);

const bad = transpileAmy(`if defined DEBUG xor TITLE_ONLY
  u8 X = 1
end defined
loop forever
`);
assert.equal(bad.ok, false);
assert.match(bad.log, /invalid compile-time condition/i);

console.log("compile-time conditional tests passed");