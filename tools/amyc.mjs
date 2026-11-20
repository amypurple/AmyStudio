#!/usr/bin/env node
// amyc — compile a single standalone Amy (.alexis) file to Z80 ASM and/or a ROM.
//
//   node tools/amyc.mjs path/to/program.alexis            # transpile + assemble, report size
//   node tools/amyc.mjs prog.alexis --asm [out.asm]       # also write the generated ASM
//   node tools/amyc.mjs prog.alexis --output [out.rom]    # also write the ROM/binary
//   node tools/amyc.mjs prog.alexis --symbols [out.sym]   # write debugger symbols
//   node tools/amyc.mjs prog.alexis --optimized-asm out   # write post-optimizer ASM
//   node tools/amyc.mjs prog.alexis --opt balanced        # optimization level (default: balanced)
//   node tools/amyc.mjs prog.alexis --project-dir dir     # resolve @project/... includes from dir
//   node tools/amyc.mjs prog.alexis --hardware sgm1       # enable optional target hardware
//   node tools/amyc.mjs prog.alexis --define FEATURE      # add a compile-time symbol
//   node tools/amyc.mjs prog.alexis --report-json out     # write machine-readable build results
//
// Reuses the exact Studio compiler wiring, so it matches what the browser builds.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
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
import { buildMegaCartImage } from "../studio/core/megaCartImage.js";
import { buildMegaCartProject } from "../studio/core/megaCartProjectBuild.js";
import { buildMegaCartImportTrampolines } from "../studio/core/megaCartTrampolines.js";
import { buildFujiNetAppBankImage, buildFujiNetImage } from "../studio/core/fujiNetImage.js";
import { buildFujiNetAppBankProject } from "../studio/core/fujiNetAppBankProjectBuild.js";
import { formatMegaCartDebuggerSymbols } from "../studio/core/megaCartLinkMap.js";
import { emitSafeCall as emitSafeCallCore } from "../studio/core/compiler/runtimeCallHelpers.js";
import { createBcdHelpers } from "../studio/core/compiler/bcdHelpers.js";
import { createAddressHelpers } from "../studio/core/compiler/addressHelpers.js";
import { handleArrayBulkStatement } from "../studio/core/compiler/arrayBulkStatementHelpers.js";
import { handleAdamStatement } from "../studio/core/compiler/adamStatementHelpers.js";
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
import { getOptimizationProfile, optimizationUsesRecordIx, sourceHintsTinySound } from "../studio/core/optimization.js";
import { lexZ80Source, summarizeTokens } from "../studio/core/amyscvassembly.js";
import { generateAsm } from "../studio/core/project.js";
import { getBuildContextDefines, resolveAmyBuildContext } from "../studio/core/projectTargets.js";
import { newProject, defaultSourceText } from "../studio/core/projectLifecycle.js";
import { manifest } from "../studio/manifest.js";
import { alexisLibrarySources } from "../studio/core/alexisLibrarySources.generated.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function makePortableOptimizedAssembly(source) {
  // Inline-ASM source anchors are internal debugger metadata. Exporting them as
  // labels can confuse downstream tools that merge or relocate the listing.
  return String(source || "").replace(/^\s*\.AMY_USER_ASM_LINE_\d+:\s*\r?\n/gmi, "");
}

const CLI_VALUES = Object.freeze({
  optimization: ["auto", "off", "safe", "balanced", "aggressive", "experimental"],
  target: ["colecovision-cartridge", "colecovision-megacart", "colecovision-fujinet", "colecovision-fujinet-appbank", "adam-native-program", "adam-disk", "adam-data-pack"],
  medium: ["dsk", "ddp"],
  memoryProfile: ["colecovision-cartridge", "colecovision-megacart", "colecovision-fujinet", "colecovision-fujinet-appbank", "colecovision_legacy_sdcc", "adam-eos-application", "adam-os7-eos-drivers"],
  hardware: ["sgm", "sgm1", "adam-sound-enhancer", "adamlink", "eve-serial", "orphanware-serial", "micro-serial", "microinnovations-serial"]
});

const HELP_TEXT = `Amy compiler command line

Usage:
  node tools/amyc.mjs <file.alexis|project.amy.json> [options]

Outputs (not written unless requested):
  --output [path]          Write the compiled .rom or ADAM .bin (--rom is an alias)
  --asm [path]             Write generated assembly
  --optimized-asm [path]   Write assembly after optimizer passes
  --symbols [path]         Write debugger symbols
  --report-json <path>     Write a machine-readable build report
  --report-jr-candidates   List user-ASM JP instructions that can become JR

Build options:
  --opt <level>            auto | off | safe | balanced | aggressive | experimental
                           Default: balanced; legacy alias "on" means aggressive
  --target <platform>      ${CLI_VALUES.target.join(" | ")}
                           Default: colecovision-cartridge
  --medium <medium>        dsk | ddp (ADAM targets only)
  --memory-profile <id>    ${CLI_VALUES.memoryProfile.join(" | ")}
  --project-dir <dir>      Resolve @project/... files and project ASM includes
  --hardware <id>          Enable optional hardware; repeat for multiple devices
                           ${CLI_VALUES.hardware.join(" | ")}
  --define <symbol>        Define a compile-time symbol; repeat as needed

Advanced:
  --disable-opt-pass <id>  Disable one named optimizer pass; repeat as needed
  --experimental-record-ix Enable experimental record-array IX code generation
  -h, --help               Show this reference

If an optional output path is omitted, the file is written beside the source.
The compiler always assembles and reports ROM/RAM use, even with no output flag.
Multifile MegaCart projects use a .amy.json manifest with one Amy fixed-bank
output and Amy, assembly, or binary-asset switchable-bank outputs. The CLI
links exported bank symbols, emits import trampolines, and writes one .rom.
Full ADAM .dsk/.ddp project packaging is performed by Amy Studio, not this CLI;
those targets compile their program payload here.

Examples:
  node tools/amyc.mjs game.alexis --output --asm --opt balanced
  node tools/amyc.mjs game.alexis --output build/game.rom --symbols build/game.sym
  node tools/amyc.mjs project.amy.json --output build/game-megacart.rom --opt balanced
  node tools/amyc.mjs app.alexis --target adam-native-program --medium dsk --output
  node tools/amyc.mjs game.alexis --hardware sgm1 --define DEBUG --output`;

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
  handleProcFunctionStatement, handleDisplayGraphicsSpriteStatement, handleSoundSpinnerStatement, handleAdamStatement,
  handleVramTextStatement, handlePrintFormatStatement, handleVramPixelInputStatement, handleDataCursorStatement,
  handleWhileStatement, handleDoStatement, handleIfStatement, handleSelectCaseStatement, handleForStatement,
  handleRandomBounceStatement, handleSpecialIfGotoStatement, handleDispatchLabelStatement, handleRoutineStatement,
  handleMutateStatement, handleMathBitStatement, handleArrayBulkStatement, createInlineStatementCompiler,
  finalizeAmyTranspile, stripAmyInlineComment
};

function parseArgs(argv) {
  const opts = { file: null, help: false, asm: undefined, optimizedAsm: undefined, rom: undefined, symbols: undefined, reportJson: null, reportJrCandidates: false, opt: "balanced", projectDir: null, target: "colecovision-cartridge", targetExplicit: false, medium: null, memoryProfile: null, hardware: [], defines: [], disabledOptimizerPasses: [], experimentalRecordIx: false };
  const requiredValue = (index, option) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--asm") opts.asm = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
    else if (a === "--optimized-asm") opts.optimizedAsm = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
    else if (a === "--rom" || a === "--output") opts.rom = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
    else if (a === "--symbols") opts.symbols = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
    else if (a === "--report-json") opts.reportJson = requiredValue(i++, a);
    else if (a === "--report-jr-candidates") opts.reportJrCandidates = true;
    else if (a === "--opt") opts.opt = requiredValue(i++, a).toLowerCase();
    else if (a === "--project-dir") opts.projectDir = requiredValue(i++, a);
    else if (a === "--target") { opts.target = requiredValue(i++, a).toLowerCase(); opts.targetExplicit = true; }
    else if (a === "--medium") opts.medium = requiredValue(i++, a).toLowerCase();
    else if (a === "--memory-profile") opts.memoryProfile = requiredValue(i++, a);
    else if (a === "--hardware") opts.hardware.push(requiredValue(i++, a).toLowerCase());
    else if (a === "--define") opts.defines.push(requiredValue(i++, a));
    else if (a === "--disable-opt-pass") opts.disabledOptimizerPasses.push(requiredValue(i++, a));
    else if (a === "--experimental-record-ix") opts.experimentalRecordIx = true;
    else if (a.startsWith("-")) throw new Error(`Unknown option: ${a}`);
    else if (!opts.file) opts.file = a;
    else throw new Error(`Unexpected argument: ${a}`);
  }
  if (opts.opt === "on") opts.opt = "aggressive";
  for (const [key, value, label] of [
    ["optimization", opts.opt, "optimization level"],
    ["target", opts.target, "target"],
    ["medium", opts.medium, "medium"],
    ["memoryProfile", opts.memoryProfile, "memory profile"]
  ]) {
    if (value && !CLI_VALUES[key].includes(value)) throw new Error(`Unknown ${label}: ${value}. Valid values: ${CLI_VALUES[key].join(", ")}.`);
  }
  for (const hardware of opts.hardware) {
    if (!CLI_VALUES.hardware.includes(hardware)) throw new Error(`Unknown hardware: ${hardware}. Valid values: ${CLI_VALUES.hardware.join(", ")}.`);
  }
  if (opts.medium && !opts.target.startsWith("adam-")) throw new Error("--medium is valid only with an ADAM target.");
  return opts;
}

function writeOutputFile(filePath, data, encoding = undefined) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, data, encoding);
}

function diagnosticFromLog(file, stage, log, severity = "error", sourceText = "") {
  const message = String(log || "unknown error").trim();
  const location = message.match(/\bline\s+(\d+)(?::(\d+))?/i);
  let inferredLine = 1;
  if (!location && sourceText) {
    const lines = String(sourceText).split(/\r?\n/);
    const reportedSource = message.match(/:\s*([^:\r\n]+)$/)?.[1]?.trim();
    if (reportedSource) {
      const index = lines.findIndex((line) => line.trim() === reportedSource);
      if (index >= 0) inferredLine = index + 1;
    }
  }
  return {
    file,
    line: location ? Number(location[1]) : inferredLine,
    column: location?.[2] ? Number(location[2]) : 1,
    severity,
    stage,
    message
  };
}

function writeBuildReport(opts, payload) {
  if (!opts.reportJson) return;
  const reportPath = path.resolve(opts.reportJson);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify({
    format: "amy-compiler-report-v1",
    compiler: "Amy Studio",
    ...payload
  }, null, 2)}\n`, "utf8");
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

function collectProjectDirAsmFiles(projectDir) {
  const files = [];
  if (!projectDir || !existsSync(projectDir)) return files;
  const visit = (dir, prefix = "") => {
    for (const entry of readdirSync(dir)) {
      const abs = path.join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      const st = statSync(abs);
      if (st.isDirectory()) visit(abs, rel);
      else if (/\.(?:asm|inc)$/i.test(entry)) {
        files.push({ path: rel.replace(/\\/g, "/"), base64: Buffer.from(readFileSync(abs)).toString("base64") });
      }
    }
  };
  visit(projectDir);
  return files;
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

function projectSourceDescriptor(source) {
  return typeof source === "string"
    ? { path: source, kind: /\.(?:asm|inc)$/i.test(source) ? "asm" : "asset" }
    : source || {};
}

function loadMegaCartCliProject(manifestPath) {
  let manifestObject;
  try {
    manifestObject = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read MegaCart project '${manifestPath}': ${error.message || error}`);
  }
  const platform = manifestObject?.target?.platform;
  if (platform !== "colecovision-megacart" && platform !== "colecovision-fujinet-appbank") {
    throw new Error("CLI project JSON must declare a MegaCart or FujiNet APPBANK target.");
  }
  const outputs = Array.isArray(manifestObject.outputs) ? manifestObject.outputs : [];
  if (!outputs.length) throw new Error("MegaCart project JSON has no outputs.");
  const projectDir = path.dirname(manifestPath);
  const projectFiles = Array.isArray(manifestObject.projectFiles)
    ? manifestObject.projectFiles.map((entry) => ({ ...entry }))
    : [];
  const findEmbedded = (filePath) => projectFiles.find((entry) =>
    String(entry.path || "").replace(/\\/g, "/").replace(/^@project\//i, "").toLowerCase() ===
    String(filePath || "").replace(/\\/g, "/").replace(/^@project\//i, "").toLowerCase()
  );
  for (const output of outputs) {
    for (const rawSource of output.sources || []) {
      const source = projectSourceDescriptor(rawSource);
      if (!source.path || findEmbedded(source.path)) continue;
      const absolute = path.resolve(projectDir, String(source.path).replace(/^@project[\\/]/i, ""));
      if (!existsSync(absolute)) {
        if ((output.type === "fixed-bank" || output.type === "appbank-window") && source.kind === "amy" && typeof manifestObject.sourceText === "string") {
          projectFiles.push({ path: source.path, kind: "amy-source", base64: Buffer.from(manifestObject.sourceText, "utf8").toString("base64") });
          continue;
        }
        throw new Error(`MegaCart ${output.name || output.type} cannot find '${source.path}' beside the project manifest.`);
      }
      projectFiles.push({
        path: source.path,
        kind: source.kind === "amy" ? "amy-source" : source.kind === "asm" ? "asm-source" : "asset",
        base64: Buffer.from(readFileSync(absolute)).toString("base64")
      });
    }
  }
  const fixedOutput = outputs.find((output) => output.type === (platform === "colecovision-megacart" ? "fixed-bank" : "appbank-window"));
  const fixedSource = projectSourceDescriptor(fixedOutput?.sources?.[0]);
  if (!fixedOutput || fixedSource.kind !== "amy") throw new Error(`${platform} CLI requires one Amy resident source.`);
  const fixedFile = findEmbedded(fixedSource.path);
  if (!fixedFile?.base64) throw new Error(`MegaCart fixed source '${fixedSource.path}' has no content.`);
  return {
    manifest: { ...manifestObject, outputs },
    project: {
      ...manifestObject,
      projectName: manifestObject.projectName || path.basename(manifestPath, path.extname(manifestPath)),
      sourceLang: "amy",
      memoryProfile: manifestObject.memoryProfile || "colecovision-megacart",
      target: { ...manifestObject.target },
      outputs,
      projectFiles,
      sourceText: Buffer.from(fixedFile.base64, "base64").toString("utf8")
    },
    projectDir
  };
}

async function compileMegaCartCliProject(opts, manifestPath) {
  const loaded = loadMegaCartCliProject(manifestPath);
  const { project, manifest: projectManifest, projectDir } = loaded;
  const buildContext = resolveAmyBuildContext(project, projectManifest);
  const resolveStaticAbiInclude = (includePath) => {
    const normalized = String(includePath || "").replace(/\\/g, "/");
    const embedded = project.projectFiles.find((entry) =>
      String(entry.path || "").replace(/\\/g, "/").replace(/^@project\//i, "").toLowerCase() ===
      normalized.replace(/^@project\//i, "").toLowerCase()
    );
    if (embedded?.base64) return Buffer.from(embedded.base64, "base64").toString("utf8");
    const absolute = normalized.toLowerCase().startsWith("@project/")
      ? path.resolve(projectDir, normalized.slice("@project/".length))
      : path.resolve(REPO, normalized);
    return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
  };
  const transpileSource = (sourceText, context) => transpileAmyCore(sourceText, {
    ...DEPS,
    resolveStaticAbiInclude,
    buildContext: context,
    predefinedSymbols: [...new Set([...getBuildContextDefines(context), ...opts.defines.filter(Boolean)])],
    experimentalRecordIx: opts.experimentalRecordIx || optimizationUsesRecordIx(opts.opt)
  });
  const fixedTranspiled = transpileSource(project.sourceText, buildContext);
  if (!fixedTranspiled.ok) throw new Error(`Fixed bank failed:\n${fixedTranspiled.log}`);
  const fixedAsm = generateAsm(project, fixedTranspiled.asmBody, fixedTranspiled.assets || [], {
    ...(fixedTranspiled.metadata || {}), buildTarget: buildContext
  });
  const profile = getOptimizationProfile(opts.opt, fixedAsm);
  const assemblyFiles = (source, filename) => {
    const files = { [filename]: source, ...alexisLibrarySources };
    for (const entry of project.projectFiles) {
      if (!entry?.base64 || !entry?.path) continue;
      const bytes = new Uint8Array(Buffer.from(entry.base64, "base64"));
      const normalized = String(entry.path).replace(/\\/g, "/").replace(/^@project\//i, "");
      files[normalized] = bytes;
      files[`@project/${normalized}`] = bytes;
    }
    const includes = buildAssemblyFiles(source, projectDir);
    return { ...includes, ...files };
  };
  const assemble = async (source, filename, { optimize = false } = {}) => {
    const assembled = await assembleAmysCVAssembly(assemblyFiles(source, filename), filename, {
      outputFilename: filename.replace(/\.asm$/i, ".bin"),
      outputMode: "binary",
      targetPlatform: optimize ? "coleco" : "raw",
      optimizerEnabled: optimize ? profile.optimizerEnabled : false,
      optimizerConfig: optimize ? profile.optimizerConfig : null
    });
    if (!assembled.ok) throw new Error(`${filename} failed:\n${assembled.log}`);
    return {
      bytes: assembled.binary || assembled.bytes,
      symbols: assembled.symbols,
      symbolsText: assembled.symbolsText || "",
      optimizedAsm: assembled.optimizedAsm || source,
      sourceDebugMap: assembled.sourceDebugMap
    };
  };
  let finalFixedAsm = fixedAsm;
  let finalFixedResult = null;
  let built;
  if (projectManifest.target.platform === "colecovision-fujinet-appbank") {
    finalFixedResult = await assemble(finalFixedAsm, "window.asm", { optimize: true });
    built = await buildFujiNetAppBankProject({
      project,
      manifest: projectManifest,
      windowProgram: finalFixedResult.bytes,
      compileAmyPage: async (source, filename, pageInfo) => {
        const pageContext = {
          platform: "colecovision-fujinet-appbank-page",
          memoryProfile: buildContext.memoryProfile,
          capabilities: ["os7", "fujinet", "fujinet-appbank", "bank-local"],
          page: pageInfo.page
        };
        const transpiled = transpileSource(source, pageContext);
        if (!transpiled.ok) throw new Error(`${filename} failed:\n${transpiled.log}`);
        if (transpiled.assets?.length) throw new Error(`${filename} uses external Amy assets; place them directly in the page output.`);
        return `org $C000\n${transpiled.asmBody}`;
      },
      compileAsm: (source, filename) => assemble(source, filename)
    });
  } else built = await buildMegaCartProject({
    project,
    manifest: projectManifest,
    fixedBank: null,
    buildSignature: `amyc-cli-v1:${buildContext.memoryProfile || ""}`,
    compileAmyBank: async (source, filename, bankInfo) => {
      const bankContext = {
        platform: "colecovision-megacart-bank",
        memoryProfile: buildContext.memoryProfile,
        capabilities: ["os7", "megacart", "bank-local"],
        romSizeKb: buildContext.romSizeKb,
        bank: bankInfo.bank
      };
      const transpiled = transpileSource(source, bankContext);
      if (!transpiled.ok) throw new Error(`${filename} failed:\n${transpiled.log}`);
      if (transpiled.assets?.length) throw new Error(`${filename} uses external Amy assets; place them directly in the bank output.`);
      return `org $C000\n${transpiled.asmBody}`;
    },
    compileAsm: (source, filename) => assemble(source, filename),
    compileFixed: async ({ linkMap }) => {
      const trampolines = buildMegaCartImportTrampolines({
        imports: fixedTranspiled.metadata?.megaCart?.imports || [],
        currentBankLabel: fixedTranspiled.metadata?.megaCart?.currentBankLabel,
        linkMap
      });
      finalFixedAsm = `${fixedAsm}${trampolines}`;
      finalFixedResult = await assemble(finalFixedAsm, "fixed.asm", { optimize: true });
      return finalFixedResult;
    }
  });
  const base = manifestPath.replace(/(?:\.amy)?\.json$/i, "");
  const outputPath = opts.rom === undefined
    ? null
    : typeof opts.rom === "string" ? path.resolve(opts.rom) : `${base}.rom`;
  if (outputPath) {
    writeOutputFile(outputPath, built.image);
    console.log(`ROM  -> ${outputPath}`);
  }
  const asmPath = opts.asm === undefined ? null : typeof opts.asm === "string" ? path.resolve(opts.asm) : `${base}.fixed.asm`;
  const optimizedAsmPath = opts.optimizedAsm === undefined ? null : typeof opts.optimizedAsm === "string" ? path.resolve(opts.optimizedAsm) : `${base}.fixed.optimized.asm`;
  const symbolsPath = opts.symbols === undefined ? null : typeof opts.symbols === "string" ? path.resolve(opts.symbols) : `${base}.sym`;
  if (asmPath) {
    writeOutputFile(asmPath, finalFixedAsm, "utf8");
    console.log(`ASM  -> ${asmPath}`);
  }
  if (optimizedAsmPath) {
    writeOutputFile(optimizedAsmPath, makePortableOptimizedAssembly(finalFixedResult?.optimizedAsm || finalFixedAsm), "utf8");
    console.log(`OPT  -> ${optimizedAsmPath}`);
  }
  if (symbolsPath) {
    const symbolsText = built.linkMap
      ? formatMegaCartDebuggerSymbols(finalFixedResult?.symbolsText || "", built.linkMap)
      : (finalFixedResult?.symbolsText || "");
    writeOutputFile(symbolsPath, symbolsText, "utf8");
    console.log(`SYM  -> ${symbolsPath}`);
  }
  console.log(projectManifest.target.platform === "colecovision-fujinet-appbank"
    ? `ROM  ${built.image.length} bytes (${opts.opt} optimizer, ${built.layout.pageCount} FujiNet APPBANK pages)`
    : `ROM  ${built.image.length} bytes (${opts.opt} optimizer, ${built.layout.bankCount} MegaCart banks)`);
  writeBuildReport(opts, {
    ok: true,
    source: manifestPath,
    target: project.target,
    memoryProfile: project.memoryProfile,
    optimization: opts.opt,
    romBytes: built.image.length,
    diagnostics: [],
    artifacts: { rom: outputPath, asm: asmPath, optimizedAsm: optimizedAsmPath, symbols: symbolsPath }
  });
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`amyc: ${error.message}\nRun "node tools/amyc.mjs --help" for usage.`);
    process.exit(2);
  }
  if (opts.help) {
    console.log(HELP_TEXT);
    return;
  }
  if (!opts.file) {
    console.error('amyc: missing input file. Run "node tools/amyc.mjs --help" for usage.');
    process.exit(2);
  }
  const srcPath = path.resolve(opts.file);
  if (!existsSync(srcPath)) { console.error("File not found: " + srcPath); process.exit(2); }
  if (/\.json$/i.test(srcPath)) {
    try {
      await compileMegaCartCliProject(opts, srcPath);
    } catch (error) {
      const message = error?.message || String(error);
      writeBuildReport(opts, { ok: false, source: srcPath, stage: "project", diagnostics: [diagnosticFromLog(srcPath, "project", message)] });
      console.error(`Compile failed: ${message}`);
      process.exit(1);
    }
    return;
  }
  const sourceText = readFileSync(srcPath, "utf8");
  const sourceMemoryProfile = sourceText.match(/^\s*memory\s+["']([^"']+)["']/im)?.[1] || null;
  const sourceMegaCartSize = Number(sourceText.match(/^\s*bank\s+rom\s+(64|128|256|512|1024)(?:\s*kb)?\s*$/im)?.[1] || 0) || null;
  const sourceRequestsMegaCart = sourceMemoryProfile === "colecovision-megacart" || sourceMegaCartSize != null;
  const sourceRequestsFujiNet = sourceMemoryProfile === "colecovision-fujinet";
  const sourceRequestsFujiNetAppBank = sourceMemoryProfile === "colecovision-fujinet-appbank";
  if (sourceRequestsMegaCart && opts.targetExplicit && opts.target !== "colecovision-megacart") {
    console.error(`Compile failed: source requests a ColecoVision MegaCart, but --target ${opts.target} was selected.`);
    process.exit(1);
  }
  if (sourceRequestsMegaCart) opts.target = "colecovision-megacart";
  if (sourceRequestsFujiNet && opts.targetExplicit && opts.target !== "colecovision-fujinet") {
    console.error(`Compile failed: source requests a ColecoVision FujiNet cartridge, but --target ${opts.target} was selected.`);
    process.exit(1);
  }
  if (sourceRequestsFujiNet) opts.target = "colecovision-fujinet";
  if (sourceRequestsFujiNetAppBank && opts.targetExplicit && opts.target !== "colecovision-fujinet-appbank") {
    console.error(`Compile failed: source requests a ColecoVision FujiNet APPBANK cartridge, but --target ${opts.target} was selected.`);
    process.exit(1);
  }
  if (sourceRequestsFujiNetAppBank) opts.target = "colecovision-fujinet-appbank";
  const resolveStaticAbiInclude = (includePath) => {
    const normalized = String(includePath || "").replace(/\\/g, "/");
    const abs = normalized.toLowerCase().startsWith("@project/")
      ? (opts.projectDir ? path.join(opts.projectDir, normalized.slice("@project/".length)) : null)
      : path.join(REPO, normalized);
    return abs && existsSync(abs) ? readFileSync(abs, "utf8") : null;
  };
  const base = srcPath.replace(/\.(alexis|amy|txt)$/i, "");
  const defaultBinaryPath = base + (opts.target.startsWith("adam-") ? ".bin" : ".rom");

  const project = newProject({
    manifestDefaults: manifest.defaults,
    sourceLang: "amy",
    memoryProfile: manifest.defaults.memoryProfile,
    defaultSourceTextValue: defaultSourceText()
  });
  project.sourceText = sourceText;
  project.projectName = path.basename(base);
  project.projectFiles = collectProjectDirAsmFiles(opts.projectDir);
  project.target = { platform: opts.target, ...(opts.medium ? { medium: opts.medium } : {}), ...(opts.hardware.length ? { hardware: opts.hardware.filter(Boolean) } : {}) };
  const requestedMemoryProfile = opts.memoryProfile || sourceMemoryProfile;
  if (requestedMemoryProfile) project.memoryProfile = requestedMemoryProfile;
  const buildContext = resolveAmyBuildContext(project, {
    target: project.target,
    ...(requestedMemoryProfile ? { memoryProfile: requestedMemoryProfile } : {})
  });
  project.memoryProfile = buildContext.memoryProfile || project.memoryProfile;

  const transpiled = transpileAmySource({
    sourceLang: "amy",
    sourceText,
    options: { buildContext },
    transpileAmy: (s) => transpileAmyCore(s, { ...DEPS, resolveStaticAbiInclude, buildContext, predefinedSymbols: [...new Set([...getBuildContextDefines(buildContext), ...opts.defines.filter(Boolean)])], experimentalRecordIx: opts.experimentalRecordIx || optimizationUsesRecordIx(opts.opt) }),
    lexZ80Source,
    summarizeTokens
  });
  if (!transpiled?.ok) {
    const log = transpiled?.log || "unknown error";
    writeBuildReport(opts, { ok: false, source: srcPath, stage: "transpile", diagnostics: [diagnosticFromLog(srcPath, "transpile", log, "error", sourceText)] });
    console.error("Transpile failed: " + log);
    process.exit(1);
  }
  const standaloneMegaCartImports = transpiled.metadata?.megaCart?.imports || [];
  if (standaloneMegaCartImports.length) {
    const imports = standaloneMegaCartImports
      .map((entry) => `${entry.name} from bank ${entry.bank}`)
      .join(", ");
    const targetHint = opts.target === "colecovision-megacart"
      ? ""
      : ` Select --target colecovision-megacart for fixed-bank-only builds.`;
    const message = `Standalone Amy source cannot resolve MegaCart banked imports (${imports}).${targetHint} ` +
      `Use a multifile MegaCart .amy.json project with switchable-bank outputs and exported symbols.`;
    writeBuildReport(opts, { ok: false, source: srcPath, stage: "transpile", diagnostics: [diagnosticFromLog(srcPath, "transpile", message)] });
    console.error(`Compile failed: ${message}`);
    process.exit(1);
  }
  transpiled.metadata = { ...(transpiled.metadata || {}), buildTarget: buildContext };
  const staticAbiRam = transpiled.ramUsage?.staticAbi;
  if (staticAbiRam?.routineCount > 0) {
    console.log(`ABI  ${staticAbiRam.totalBytes} RAM bytes (${staticAbiRam.parameterBytes} params + ${staticAbiRam.localBytes} locals) across ${staticAbiRam.routineCount} frameless routine(s)`);
  }
  if (transpiled.ramUsage) {
    const capacity = transpiled.ramUsage.capacityBytes ?? transpiled.ramUsage.usedBytes;
    const free = transpiled.ramUsage.freeBytes ?? Math.max(0, capacity - transpiled.ramUsage.usedBytes);
    const headroom = transpiled.ramUsage.stackHeadroomBytes;
    const recommended = transpiled.ramUsage.recommendedStackReserveBytes || 0;
    console.log(`RAM  ${transpiled.ramUsage.usedBytes}/${capacity} bytes used, ${free} free${headroom != null ? `, ${headroom}-byte stack headroom` : ""}${recommended ? ` (${recommended} recommended)` : ""}`);
  }
  if (transpiled.ramUsage?.overlays?.length) {
    console.log(`RAM  overlays save ${transpiled.ramUsage.overlaySavedBytes} bytes (${transpiled.ramUsage.overlayLogicalBytes} logical in ${transpiled.ramUsage.overlayPhysicalBytes} physical)`);
  }
  for (const warning of transpiled.warnings || []) console.warn(`WARN ${warning}`);
  const generatedAsm = generateAsm(project, transpiled.asmBody, transpiled.assets || [], transpiled.metadata || {});

  if (opts.asm !== undefined) {
    const asmPath = typeof opts.asm === "string" ? path.resolve(opts.asm) : base + ".asm";
    writeOutputFile(asmPath, generatedAsm, "utf8");
    console.log("ASM  -> " + asmPath + " (" + generatedAsm.length + " chars)");
  }

  const profile = getOptimizationProfile(opts.opt, generatedAsm);
  if (profile.optimizerConfig && opts.disabledOptimizerPasses.length) {
    profile.optimizerConfig = { ...profile.optimizerConfig };
    for (const pass of opts.disabledOptimizerPasses.filter(Boolean)) {
      if (!(pass in profile.optimizerConfig)) {
        console.error(`Unknown optimizer pass: ${pass}`);
        process.exit(2);
      }
      profile.optimizerConfig[pass] = false;
    }
  }
  const files = buildAssemblyFiles(generatedAsm, opts.projectDir);
  const assembled = await assembleAmysCVAssembly(files, "main.asm", {
    outputFilename: path.basename(base) + (buildContext.machine === "adam" ? ".bin" : ".rom"), outputMode: "binary", targetPlatform: buildContext.machine === "adam" ? "raw" : "coleco",
    optimizerEnabled: profile.optimizerEnabled, optimizerConfig: profile.optimizerConfig
  });
  if (!assembled.ok) {
    let err = String(assembled.log || "").split("\n").filter((l) => /error/i.test(l)).slice(0, 3).join(" | ");
    const generatedLine = Number.parseInt(err.match(/\bLine\s+(\d+)\b/i)?.[1] || "", 10);
    if (Number.isInteger(generatedLine) && generatedLine > 0) {
      const asmLines = generatedAsm.split(/\r?\n/);
      const failedInstruction = err.match(/\bLine\s+\d+:\s*(.+?)\s+-\s+[^|]+/i)?.[1]?.trim();
      const normalizeAsm = (line) => String(line || "").replace(/;.*/, "").replace(/\s+/g, "").toLowerCase();
      const failedNormalized = normalizeAsm(failedInstruction);
      let matchingLines = failedNormalized
        ? asmLines.map((line, index) => normalizeAsm(line) === failedNormalized ? index : -1).filter((index) => index >= 0)
        : [];
      if (matchingLines.length !== 1) {
        const failedMnemonic = failedInstruction?.match(/^([A-Za-z][A-Za-z0-9]*)\b/)?.[1];
        if (failedMnemonic) {
          const mnemonicPattern = new RegExp(`^\\s*(?:[A-Za-z_.$][A-Za-z0-9_.$]*\\s*:\\s*)?${failedMnemonic}\\b`, "i");
          const mnemonicLines = asmLines
            .map((line, index) => mnemonicPattern.test(String(line || "").replace(/;.*/, "")) ? index : -1)
            .filter((index) => index >= 0);
          if (mnemonicLines.length === 1) matchingLines = mnemonicLines;
        }
      }
      const markerStart = matchingLines.length === 1
        ? matchingLines[0]
        : Math.min(generatedLine - 1, asmLines.length - 1);
      for (let index = markerStart; index >= 0; index -= 1) {
        const marker = asmLines[index].match(/^\s*;\s*@amy-source-line\s+(\d+)\s*$/i);
        if (!marker) continue;
        const amyLine = Number.parseInt(marker[1], 10);
        const sourceLine = sourceText.split(/\r?\n/)[amyLine - 1]?.trim() || "";
        const symbolHint = /(?:unknown|undefined)\s+(?:name|symbol)|invalid expression/i.test(err)
          ? " Check the symbol spelling; use amy(Name) when referring to an Amy variable or constant."
          : "";
        err = `Amy line ${amyLine} (inline ASM): ${err}.${symbolHint}${sourceLine ? ` Source: ${sourceLine}` : ""}`;
        break;
      }
    }
    writeBuildReport(opts, { ok: false, source: srcPath, stage: "assemble", diagnostics: [diagnosticFromLog(srcPath, "assemble", err || assembled.log)] });
    console.error("Assemble failed (" + opts.opt + "): " + (err || "see assembler log"));
    process.exit(1);
  }
  const jrCandidates = Array.isArray(assembled.stats?.optimizer?.jrCandidates)
    ? assembled.stats.optimizer.jrCandidates
    : [];
  if (opts.reportJrCandidates) {
    if (!profile.optimizerEnabled) {
      console.warn("JR candidates unavailable with --opt off; use safe or a higher profile.");
    } else if (!jrCandidates.length) {
      console.log("JR candidates: none in user ASM.");
    } else {
      console.log(`JR candidates: ${jrCandidates.length} (${jrCandidates.length} byte${jrCandidates.length === 1 ? "" : "s"} potential)`);
      for (const candidate of jrCandidates) {
        const address = Number.isInteger(candidate.address) ? `$${candidate.address.toString(16).toUpperCase().padStart(4, "0")}` : "$????";
        const state = candidate.timed ? "timed/protected" : (candidate.applied ? "applied by asm relax" : "opaque; programmer decision");
        const source = String(candidate.source || "").trim();
        console.log(`  ASM line ${candidate.line} ${address}: JP${candidate.condition ? ` ${String(candidate.condition).toUpperCase()}` : ""} -> JR, save ${candidate.bytes} byte (${state})${source ? ` | ${source}` : ""}`);
      }
    }
  }
  let rom = assembled.binary || assembled.bytes || new Uint8Array();
  if (opts.target === "colecovision-megacart") {
    try {
      const sizeKb = Number(transpiled.metadata?.megaCart?.romSizeKb || sourceMegaCartSize || 128);
      rom = buildMegaCartImage({ sizeKb, fixedBank: rom }).image;
    } catch (error) {
      const message = error?.message || String(error);
      writeBuildReport(opts, { ok: false, source: srcPath, stage: "package", diagnostics: [diagnosticFromLog(srcPath, "package", message)] });
      console.error(`Compile failed: ${message}`);
      process.exit(1);
    }
  }
  if (opts.target === "colecovision-fujinet") {
    try {
      rom = buildFujiNetImage(rom);
    } catch (error) {
      const message = error?.message || String(error);
      writeBuildReport(opts, { ok: false, source: srcPath, stage: "package", diagnostics: [diagnosticFromLog(srcPath, "package", message)] });
      console.error(`Compile failed: ${message}`);
      process.exit(1);
    }
  }
  if (opts.target === "colecovision-fujinet-appbank") {
    try {
      rom = buildFujiNetAppBankImage(rom);
    } catch (error) {
      const message = error?.message || String(error);
      writeBuildReport(opts, { ok: false, source: srcPath, stage: "package", diagnostics: [diagnosticFromLog(srcPath, "package", message)] });
      console.error(`Compile failed: ${message}`);
      process.exit(1);
    }
  }
  if (opts.target === "colecovision-cartridge" && rom.length > 32 * 1024) {
    const capacity = 32 * 1024;
    const overflow = rom.length - capacity;
    const message = `ColecoVision cartridge exceeds its 32 KiB mapped ROM window: ${rom.length} / ${capacity} bytes (${overflow} bytes over). Optimize the project or select a MegaCart target.`;
    writeBuildReport(opts, { ok: false, source: srcPath, stage: "package", diagnostics: [diagnosticFromLog(srcPath, "package", message)] });
    console.error(`Compile failed: ${message}`);
    process.exit(1);
  }
  if (opts.optimizedAsm !== undefined) {
    const optimizedAsmPath = typeof opts.optimizedAsm === "string" ? path.resolve(opts.optimizedAsm) : base + ".optimized.asm";
    const optimizedAsm = makePortableOptimizedAssembly(assembled.optimizedAsm || generatedAsm);
    writeOutputFile(optimizedAsmPath, optimizedAsm, "utf8");
    console.log("OPT  -> " + optimizedAsmPath + " (" + optimizedAsm.length + " chars)");
  }
  console.log("ROM  " + rom.length + " bytes  (" + opts.opt + " optimizer)");
  if (opts.rom !== undefined) {
    const romPath = typeof opts.rom === "string" ? path.resolve(opts.rom) : defaultBinaryPath;
    writeOutputFile(romPath, rom);
    console.log("ROM  -> " + romPath);
  }
  if (opts.symbols !== undefined) {
    const symbolsPath = typeof opts.symbols === "string" ? path.resolve(opts.symbols) : base + ".sym";
    writeOutputFile(symbolsPath, assembled.symbolsText || "", "utf8");
    console.log("SYM  -> " + symbolsPath);
  }
  writeBuildReport(opts, {
    ok: true,
    source: srcPath,
    target: project.target,
    memoryProfile: project.memoryProfile,
    optimization: opts.opt,
    romBytes: rom.length,
    ramUsage: transpiled.ramUsage || null,
    diagnostics: (transpiled.warnings || transpiled.metadata?.warnings || []).map((warning) => diagnosticFromLog(srcPath, "transpile", warning, "warning", sourceText)),
    jrCandidates,
    artifacts: {
      asm: opts.asm !== undefined ? (typeof opts.asm === "string" ? path.resolve(opts.asm) : base + ".asm") : null,
      optimizedAsm: opts.optimizedAsm !== undefined ? (typeof opts.optimizedAsm === "string" ? path.resolve(opts.optimizedAsm) : base + ".optimized.asm") : null,
      rom: opts.rom !== undefined ? (typeof opts.rom === "string" ? path.resolve(opts.rom) : defaultBinaryPath) : null,
      symbols: opts.symbols !== undefined ? (typeof opts.symbols === "string" ? path.resolve(opts.symbols) : base + ".sym") : null
    }
  });
}

main().catch((error) => { console.error(error?.stack || String(error)); process.exit(1); });
