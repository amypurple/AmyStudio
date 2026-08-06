import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { manifest } from "../studio/manifest.js";
import { exampleCatalog } from "../studio/examples.js";
import { getRamLayout } from "../studio/ramLayouts.js";
import { lexZ80Source, summarizeTokens } from "../studio/core/amyscvassembly.js";
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
import { transpileAmySource } from "../studio/core/amyCompiler.js";
import { getOptimizationProfile, sourceHintsTinySound } from "../studio/core/optimization.js";
import { generateAsm } from "../studio/core/project.js";
import { transpileAmyCore } from "../studio/core/compiler/transpileAmyCore.js";
import { defaultSourceText, newProject, buildProjectFromExample } from "../studio/core/projectLifecycle.js";
import { normalizeProjectFiles } from "../studio/core/utils/projectFiles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    outDir: "build/mdl-audit/examples",
    manifestOut: "build/mdl-audit/examples-manifest.json"
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--out-dir":
        options.outDir = argv[++i];
        break;
      case "--manifest-out":
        options.manifestOut = argv[++i];
        break;
      case "--only":
        options.only = (argv[++i] || "").split(",").map((item) => item.trim()).filter(Boolean);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function makeNewProject() {
  return newProject({
    manifestDefaults: manifest.defaults,
    sourceLang: manifest.defaults.sourceLang,
    memoryProfile: manifest.defaults.memoryProfile,
    defaultSourceTextValue: defaultSourceText()
  });
}

function stripAmyInlineComment(rawLine) {
  const text = String(rawLine || "");
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "\"") {
      if (inString && text[index + 1] === "\"") {
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "'" || ch === ";") return text.slice(0, index).trimEnd();
    if ((ch === "r" || ch === "R") && text.slice(index, index + 3).toLowerCase() === "rem") {
      const prev = index === 0 ? "" : text[index - 1];
      const next = index + 3 >= text.length ? "" : text[index + 3];
      const prevOk = !prev || /\s/.test(prev);
      const nextOk = !next || /\s/.test(next);
      if (prevOk && nextOk) return text.slice(0, index).trimEnd();
    }
  }
  return text;
}

function transpileAmy(sourceText) {
  return transpileAmyCore(sourceText, {
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
    finalizeAmyTranspile
    ,
    stripAmyInlineComment
  });
}

function transpileSource(sourceLang, sourceText) {
  return transpileAmySource({
    sourceLang,
    sourceText,
    transpileAmy,
    lexZ80Source,
    summarizeTokens
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(repoRoot, options.outDir);
  const manifestOut = path.resolve(repoRoot, options.manifestOut);
  const projectFilesOutRoot = path.resolve(path.dirname(manifestOut), "project-files");
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(path.dirname(manifestOut), { recursive: true });
  await fs.mkdir(projectFilesOutRoot, { recursive: true });

  const onlySet = options.only?.length ? new Set(options.only) : null;
  const results = [];

  for (const example of exampleCatalog) {
    if (onlySet && !onlySet.has(example.id)) continue;

    const result = {
      id: example.id,
      label: example.label,
      projectName: example.projectName,
      sourceLang: example.sourceLang || manifest.defaults.sourceLang,
      status: "pending",
      asmPath: null,
      error: null
    };

    try {
      const project = buildProjectFromExample(example, { newProjectFn: makeNewProject });
      project.projectName = example.projectName || project.projectName;
      project.sourceLang = example.sourceLang || project.sourceLang;
      const transpiled = transpileSource(project.sourceLang, project.sourceText);
      if (!transpiled?.ok) {
        throw new Error(transpiled?.log || `Transpile failed for ${example.id}`);
      }
      project.generatedAsm = generateAsm(project, transpiled.asmBody, transpiled.assets || [], transpiled.metadata || {});

      const asmFilename = `${example.id}.asm`;
      const asmAbsolutePath = path.join(outDir, asmFilename);
      await fs.writeFile(asmAbsolutePath, project.generatedAsm, "utf8");

      const normalizedProjectFiles = normalizeProjectFiles(project.projectFiles || []);
      if (normalizedProjectFiles.length) {
        const projectFileRoot = path.join(projectFilesOutRoot, example.id);
        await fs.mkdir(projectFileRoot, { recursive: true });
        for (const entry of normalizedProjectFiles) {
          const relativePath = String(entry.path || "").replace(/^@project[\\/]+/i, "");
          if (!relativePath) continue;
          const absolutePath = path.join(projectFileRoot, relativePath);
          await fs.mkdir(path.dirname(absolutePath), { recursive: true });
          const content = entry.base64
            ? Buffer.from(entry.base64, "base64")
            : Buffer.from(String(entry.content || ""), "utf8");
          await fs.writeFile(absolutePath, content);
        }
      }

      result.status = "ok";
      result.asmPath = path.relative(repoRoot, asmAbsolutePath).replace(/\\/g, "/");
      result.projectName = project.projectName;
      result.sourceLength = project.sourceText.length;
    } catch (error) {
      result.status = "failed";
      result.error = error?.stack || error?.message || String(error);
    }

    results.push(result);
  }

  await fs.writeFile(manifestOut, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: results.length,
    examples: results
  }, null, 2));

  const okCount = results.filter((item) => item.status === "ok").length;
  const failedCount = results.length - okCount;
  console.log(JSON.stringify({
    count: results.length,
    ok: okCount,
    failed: failedCount,
    manifest: path.relative(repoRoot, manifestOut).replace(/\\/g, "/")
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
