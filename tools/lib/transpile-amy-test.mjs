import { getRamLayout } from "../../studio/ramLayouts.js";
import { inferAmyMemoryCapabilities, parseCartridgeDirective as parseCartridgeDirectiveCore, parseExpressionAst as parseExpressionAstCore, renderExpressionAst as renderExpressionAstCore, rewriteImmediateByteTempCoordinateUses as rewriteImmediateByteTempCoordinateUsesCore } from "../../studio/core/compilerFrontend.js";
import { emitSafeCall as emitSafeCallCore } from "../../studio/core/compiler/runtimeCallHelpers.js";
import { createBcdHelpers } from "../../studio/core/compiler/bcdHelpers.js";
import { createAddressHelpers } from "../../studio/core/compiler/addressHelpers.js";
import { handleArrayBulkStatement } from "../../studio/core/compiler/arrayBulkStatementHelpers.js";
import { createAssignmentArithmeticHelpers } from "../../studio/core/compiler/assignmentArithmeticHelpers.js";
import { createFx16Helpers } from "../../studio/core/compiler/fx16Helpers.js";
import { createByteLoadHelpers } from "../../studio/core/compiler/byteLoadHelpers.js";
import { createCompareLiteralHelpers } from "../../studio/core/compiler/compareLiteralHelpers.js";
import { createCompilerShellHelpers } from "../../studio/core/compiler/compilerShellHelpers.js";
import { createDataHelpers } from "../../studio/core/compiler/dataHelpers.js";
import { handleDataMetaStatement } from "../../studio/core/compiler/dataMetaStatementHelpers.js";
import { handleDataCursorStatement } from "../../studio/core/compiler/dataCursorStatementHelpers.js";
import { handleDeclarationStatement } from "../../studio/core/compiler/declarationStatementHelpers.js";
import { createControlFlowHelpers } from "../../studio/core/compiler/controlFlowHelpers.js";
import { createExpressionComputeHelpers } from "../../studio/core/compiler/expressionComputeHelpers.js";
import { scanAmyFirstPass } from "../../studio/core/compiler/firstPassScanHelpers.js";
import { handleDisplayGraphicsSpriteStatement } from "../../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";
import { handleForStatement } from "../../studio/core/compiler/forStatementHelpers.js";
import { handleIfStatement } from "../../studio/core/compiler/ifStatementHelpers.js";
import { createInlineStatementCompiler } from "../../studio/core/compiler/inlineStatementHelpers.js";
import { createLoadStoreHelpers } from "../../studio/core/compiler/loadStoreHelpers.js";
import { handleDoStatement, handleWhileStatement } from "../../studio/core/compiler/loopStatementHelpers.js";
import { handleMathBitStatement } from "../../studio/core/compiler/mathBitStatementHelpers.js";
import { handleMutateStatement } from "../../studio/core/compiler/mutateStatementHelpers.js";
import { createPrintHelpers } from "../../studio/core/compiler/printHelpers.js";
import { handlePrintFormatStatement } from "../../studio/core/compiler/printFormatStatementHelpers.js";
import { createProcHelpers } from "../../studio/core/compiler/procHelpers.js";
import { handleProcFunctionStatement } from "../../studio/core/compiler/procFunctionStatementHelpers.js";
import { handleDispatchLabelStatement } from "../../studio/core/compiler/dispatchLabelStatementHelpers.js";
import { handleRandomBounceStatement } from "../../studio/core/compiler/randomBounceStatementHelpers.js";
import { handleRoutineStatement } from "../../studio/core/compiler/routineStatementHelpers.js";
import { handleSpecialIfGotoStatement } from "../../studio/core/compiler/specialIfGotoStatementHelpers.js";
import { createRuntimeValueHelpers } from "../../studio/core/compiler/runtimeValueHelpers.js";
import { handleSelectCaseStatement } from "../../studio/core/compiler/selectCaseStatementHelpers.js";
import { createSimpleArithmeticHelpers } from "../../studio/core/compiler/simpleArithmeticHelpers.js";
import { handleSoundSpinnerStatement } from "../../studio/core/compiler/soundSpinnerStatementHelpers.js";
import { createTypeSymbolHelpers } from "../../studio/core/compiler/typeSymbolHelpers.js";
import { createU32Helpers } from "../../studio/core/compiler/u32Helpers.js";
import { createValueParseHelpers } from "../../studio/core/compiler/valueParseHelpers.js";
import { finalizeAmyTranspile } from "../../studio/core/compiler/transpileFinalizationHelpers.js";
import { handleVramTextStatement } from "../../studio/core/compiler/vramTextStatementHelpers.js";
import { handleVramPixelInputStatement } from "../../studio/core/compiler/vramPixelInputStatementHelpers.js";
import { transpileAmyCore } from "../../studio/core/compiler/transpileAmyCore.js";
import { sourceHintsTinySound } from "../../studio/core/optimization.js";

function stripAmyInlineComment(rawLine) {
  const text = String(rawLine || "");
  let inString = false;
  for (let index = 0; index < text.length; index++) {
    const ch = text[index];
    if (ch === '"') {
      if (inString && text[index + 1] === '"') { index++; continue; }
      inString = !inString;
    } else if (!inString && (ch === "'" || ch === ";")) return text.slice(0, index).trimEnd();
    else if (!inString && /[rR]/.test(ch) && text.slice(index, index + 3).toLowerCase() === "rem") {
      const prev = index ? text[index - 1] : "";
      const next = text[index + 3] || "";
      if ((!prev || /\s/.test(prev)) && (!next || /\s/.test(next))) return text.slice(0, index).trimEnd();
    }
  }
  return text;
}

const deps = {
  rewriteImmediateByteTempCoordinateUsesCore, inferAmyMemoryCapabilities, sourceHintsTinySound, getRamLayout,
  emitSafeCallCore, parseCartridgeDirectiveCore, parseExpressionAstCore, renderExpressionAstCore,
  createTypeSymbolHelpers, createProcHelpers, createValueParseHelpers, createExpressionComputeHelpers,
  createRuntimeValueHelpers, createCompareLiteralHelpers, createPrintHelpers, createBcdHelpers,
  createControlFlowHelpers, createCompilerShellHelpers, createDataHelpers, createLoadStoreHelpers,
  createByteLoadHelpers, createAddressHelpers, createU32Helpers, createFx16Helpers,
  createSimpleArithmeticHelpers, createAssignmentArithmeticHelpers, scanAmyFirstPass,
  handleDataMetaStatement, handleDeclarationStatement, handleProcFunctionStatement,
  handleDisplayGraphicsSpriteStatement, handleSoundSpinnerStatement, handleVramTextStatement,
  handlePrintFormatStatement, handleVramPixelInputStatement, handleDataCursorStatement,
  handleWhileStatement, handleDoStatement, handleIfStatement, handleSelectCaseStatement,
  handleForStatement, handleRandomBounceStatement, handleSpecialIfGotoStatement,
  handleDispatchLabelStatement, handleRoutineStatement, handleMutateStatement,
  handleMathBitStatement, handleArrayBulkStatement, createInlineStatementCompiler,
  finalizeAmyTranspile, stripAmyInlineComment
};

export function transpileAmyForTest(sourceText, options = {}) {
  return transpileAmyCore(sourceText, { ...deps, ...options });
}

