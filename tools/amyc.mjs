#!/usr/bin/env node
// amyc — compile a single standalone Amy (.alexis) file to Z80 ASM and/or a ROM.
//
//   node tools/amyc.mjs path/to/program.alexis            # transpile + assemble, report size
//   node tools/amyc.mjs prog.alexis --asm [out.asm]       # also write the generated ASM
//   node tools/amyc.mjs prog.alexis --rom [out.rom]       # also write the ROM binary
//   node tools/amyc.mjs prog.alexis --opt balanced        # optimization level (default: balanced)
//   node tools/amyc.mjs prog.alexis --project-dir dir     # resolve @project/... includes from dir
//
// Reuses the exact Studio compiler wiring, so it matches what the browser builds.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getRamLayout } from "../studio/ramLayouts.js";
import {
  inferAmyMemoryCapabilities,
  parseCartridgeDirective as parseCartridgeDirectiveCore,
  parseExpressionAst as parseExpressionAstCore,
  renderExpressionAst as renderExpressionAstCore,
  rewriteImmediateByteTempCoordinateUses as rewriteImmediateByteTempCoordinateUsesCore
} from "../studio/core/compilerFrontend.js";
import { transpileAmySource } from "../studio/core/amyCompiler.js";
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
import { getOptimizationProfile, sourceHintsTinySound } from "../studio/core/optimization.js";
import { lexZ80Source, summarizeTokens } from "../studio/core/amyscvassembly.js";
import { generateAsm } from "../studio/core/project.js";
import { newProject, defaultSourceText } from "../studio/core/projectLifecycle.js";
import { manifest } from "../studio/manifest.js";
import { alexisLibrarySources } from "../studio/core/alexisLibrarySources.generated.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function stripAmyInlineComment(rawLine) {
  const text = String(rawLine || "");
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "\"") { if (inString && text[index + 1] === "\"") { index += 1; continue; } inString = !inString; continue; }
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
  rewriteImmediateByteTempCoordinateUsesCore, inferAmyMemoryCapabilities, sourceHintsTinySound, getRamLayout,
  emitSafeCallCore, parseCartridgeDirectiveCore, parseExpressionAstCore, renderExpressionAstCore,
  createTypeSymbolHelpers, createProcHelpers, createValueParseHelpers, createExpressionComputeHelpers,
  createRuntimeValueHelpers, createCompareLiteralHelpers, createPrintHelpers, createBcdHelpers,
  createControlFlowHelpers, createCompilerShellHelpers, createDataHelpers, createLoadStoreHelpers,
  createByteLoadHelpers, createAddressHelpers, createU32Helpers, createFx16Helpers, createSimpleArithmeticHelpers,
  createAssignmentArithmeticHelpers, scanAmyFirstPass, handleDataMetaStatement, handleDeclarationStatement,
  handleProcFunctionStatement, handleDisplayGraphicsSpriteStatement, handleSoundSpinnerStatement,
  handleVramTextStatement, handlePrintFormatStatement, handleVramPixelInputStatement, handleDataCursorStatement,
  handleWhileStatement, handleDoStatement, handleIfStatement, handleSelectCaseStatement, handleForStatement,
  handleRandomBounceStatement, handleSpecialIfGotoStatement, handleDispatchLabelStatement, handleRoutineStatement,
  handleMutateStatement, handleMathBitStatement, handleArrayBulkStatement, createInlineStatementCompiler,
  finalizeAmyTranspile, stripAmyInlineComment
};

function parseArgs(argv) {
  const opts = { file: null, asm: undefined, rom: undefined, opt: "balanced", projectDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--asm") opts.asm = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
    else if (a === "--rom") opts.rom = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
    else if (a === "--opt") opts.opt = argv[++i] || "balanced";
    else if (a === "--project-dir") opts.projectDir = argv[++i] || null;
    else if (!opts.file && !a.startsWith("--")) opts.file = a;
  }
  return opts;
}

// Resolve every `include "path"` in the ASM: embedded lib sources, repo files
// (src/compression/*.asm, …), then an optional --project-dir for @project/... .
function addProjectDirFiles(files, projectDir) {
  if (!projectDir || !existsSync(projectDir)) return;
  const visit = (dir, prefix = "") => {
    for (const entry of readdirSync(dir)) {
      const abs = path.join(dir, entry);
      const rel = prefix ? prefix + "/" + entry : entry;
      const st = statSync(abs);
      if (st.isDirectory()) visit(abs, rel);
      else files["@project/" + rel.replace(/\\/g, "/")] = new Uint8Array(readFileSync(abs));
    }
  };
  visit(projectDir);
}

function buildAssemblyFiles(asm, projectDir) {
  const files = { "main.asm": asm, ...alexisLibrarySources };
  addProjectDirFiles(files, projectDir);
  const includeRe = /include\s+"([^"]+)"/g;
  let m;
  while ((m = includeRe.exec(asm))) {
    const p = m[1].replace(/\\/g, "/");
    if (files[p] != null) continue;
    if (p.startsWith("@project/")) {
      if (!projectDir) continue;
      const abs = path.join(projectDir, p.slice("@project/".length));
      if (existsSync(abs)) files[p] = new Uint8Array(readFileSync(abs));
      continue;
    }
    const repoAbs = path.join(REPO, p);
    if (existsSync(repoAbs)) files[p] = readFileSync(repoAbs, "utf8");
  }
  return files;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.file) {
    console.error("usage: node tools/amyc.mjs <file.alexis> [--asm [out]] [--rom [out]] [--opt level] [--project-dir dir]");
    process.exit(2);
  }
  const srcPath = path.resolve(opts.file);
  if (!existsSync(srcPath)) { console.error("File not found: " + srcPath); process.exit(2); }
  const sourceText = readFileSync(srcPath, "utf8");
  const resolveStaticAbiInclude = (includePath) => {
    const normalized = String(includePath || "").replace(/\\/g, "/");
    const abs = normalized.toLowerCase().startsWith("@project/")
      ? (opts.projectDir ? path.join(opts.projectDir, normalized.slice("@project/".length)) : null)
      : path.join(REPO, normalized);
    return abs && existsSync(abs) ? readFileSync(abs, "utf8") : null;
  };
  const base = srcPath.replace(/\.(alexis|amy|txt)$/i, "");

  const project = newProject({
    manifestDefaults: manifest.defaults,
    sourceLang: "amy",
    memoryProfile: manifest.defaults.memoryProfile,
    defaultSourceTextValue: defaultSourceText()
  });
  project.sourceText = sourceText;
  project.projectName = path.basename(base);

  const transpiled = transpileAmySource({ sourceLang: "amy", sourceText, transpileAmy: (s) => transpileAmyCore(s, { ...DEPS, resolveStaticAbiInclude }), lexZ80Source, summarizeTokens });
  if (!transpiled?.ok) { console.error("Transpile failed: " + (transpiled?.log || "unknown error")); process.exit(1); }
  const staticAbiRam = transpiled.ramUsage?.staticAbi;
  if (staticAbiRam?.routineCount > 0) {
    console.log(`ABI  ${staticAbiRam.totalBytes} RAM bytes (${staticAbiRam.parameterBytes} params + ${staticAbiRam.localBytes} locals) across ${staticAbiRam.routineCount} frameless routine(s)`);
  }
  const generatedAsm = generateAsm(project, transpiled.asmBody, transpiled.assets || [], transpiled.metadata || {});

  if (opts.asm !== undefined) {
    const asmPath = typeof opts.asm === "string" ? path.resolve(opts.asm) : base + ".asm";
    writeFileSync(asmPath, generatedAsm, "utf8");
    console.log("ASM  -> " + asmPath + " (" + generatedAsm.length + " chars)");
  }

  const profile = getOptimizationProfile(opts.opt, generatedAsm);
  const files = buildAssemblyFiles(generatedAsm, opts.projectDir);
  const assembled = await assembleAmysCVAssembly(files, "main.asm", {
    outputFilename: path.basename(base) + ".rom", outputMode: "binary", targetPlatform: "coleco",
    optimizerEnabled: profile.optimizerEnabled, optimizerConfig: profile.optimizerConfig
  });
  if (!assembled.ok) {
    const err = String(assembled.log || "").split("\n").filter((l) => /error/i.test(l)).slice(0, 3).join(" | ");
    console.error("Assemble failed (" + opts.opt + "): " + (err || "see assembler log"));
    process.exit(1);
  }
  const rom = assembled.binary || assembled.bytes || new Uint8Array();
  console.log("ROM  " + rom.length + " bytes  (" + opts.opt + " optimizer)");
  if (opts.rom !== undefined) {
    const romPath = typeof opts.rom === "string" ? path.resolve(opts.rom) : base + ".rom";
    writeFileSync(romPath, rom);
    console.log("ROM  -> " + romPath);
  }
}

main().catch((error) => { console.error(error?.stack || String(error)); process.exit(1); });
