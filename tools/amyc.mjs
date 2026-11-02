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

const CLI_VALUES = Object.freeze({
  optimization: ["auto", "off", "safe", "balanced", "aggressive", "experimental"],
  target: ["colecovision-cartridge", "colecovision-megacart", "adam-native-program", "adam-disk", "adam-data-pack"],
  medium: ["dsk", "ddp"],
  memoryProfile: ["colecovision-cartridge", "colecovision-megacart", "colecovision_legacy_sdcc", "adam-eos-application", "adam-os7-eos-drivers"],
  hardware: ["sgm", "sgm1", "adam-sound-enhancer", "adamlink", "eve-serial", "orphanware-serial", "micro-serial", "microinnovations-serial"]
});

const HELP_TEXT = `Amy compiler command line

Usage:
  node tools/amyc.mjs <file.alexis> [options]

Outputs (not written unless requested):
  --output [path]          Write the compiled .rom or ADAM .bin (--rom is an alias)
  --asm [path]             Write generated assembly
  --optimized-asm [path]   Write assembly after optimizer passes
  --symbols [path]         Write debugger symbols
  --report-json <path>     Write a machine-readable build report

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
Full ADAM .dsk/.ddp project packaging is performed by Amy Studio, not this
single-source compiler; those targets compile their program payload here.

Examples:
  node tools/amyc.mjs game.alexis --output --asm --opt balanced
  node tools/amyc.mjs game.alexis --output build/game.rom --symbols build/game.sym
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
  const opts = { file: null, help: false, asm: undefined, optimizedAsm: undefined, rom: undefined, symbols: undefined, reportJson: null, opt: "balanced", projectDir: null, target: "colecovision-cartridge", medium: null, memoryProfile: null, hardware: [], defines: [], disabledOptimizerPasses: [], experimentalRecordIx: false };
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
    else if (a === "--opt") opts.opt = requiredValue(i++, a).toLowerCase();
    else if (a === "--project-dir") opts.projectDir = requiredValue(i++, a);
    else if (a === "--target") opts.target = requiredValue(i++, a).toLowerCase();
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
  const sourceText = readFileSync(srcPath, "utf8");
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
  const sourceMemoryProfile = sourceText.match(/^\s*memory\s+["']([^"']+)["']/im)?.[1] || null;
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
  transpiled.metadata = { ...(transpiled.metadata || {}), buildTarget: buildContext };
  const staticAbiRam = transpiled.ramUsage?.staticAbi;
  if (staticAbiRam?.routineCount > 0) {
    console.log(`ABI  ${staticAbiRam.totalBytes} RAM bytes (${staticAbiRam.parameterBytes} params + ${staticAbiRam.localBytes} locals) across ${staticAbiRam.routineCount} frameless routine(s)`);
  }
  if (transpiled.ramUsage?.overlays?.length) {
    console.log(`RAM  ${transpiled.ramUsage.usedBytes} physical bytes; overlays save ${transpiled.ramUsage.overlaySavedBytes} bytes (${transpiled.ramUsage.overlayLogicalBytes} logical in ${transpiled.ramUsage.overlayPhysicalBytes} physical)`);
  }
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
    const err = String(assembled.log || "").split("\n").filter((l) => /error/i.test(l)).slice(0, 3).join(" | ");
    writeBuildReport(opts, { ok: false, source: srcPath, stage: "assemble", diagnostics: [diagnosticFromLog(srcPath, "assemble", err || assembled.log)] });
    console.error("Assemble failed (" + opts.opt + "): " + (err || "see assembler log"));
    process.exit(1);
  }
  const rom = assembled.binary || assembled.bytes || new Uint8Array();
  if (opts.optimizedAsm !== undefined) {
    const optimizedAsmPath = typeof opts.optimizedAsm === "string" ? path.resolve(opts.optimizedAsm) : base + ".optimized.asm";
    writeOutputFile(optimizedAsmPath, assembled.optimizedAsm || generatedAsm, "utf8");
    console.log("OPT  -> " + optimizedAsmPath + " (" + (assembled.optimizedAsm || generatedAsm).length + " chars)");
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
    artifacts: {
      asm: opts.asm !== undefined ? (typeof opts.asm === "string" ? path.resolve(opts.asm) : base + ".asm") : null,
      optimizedAsm: opts.optimizedAsm !== undefined ? (typeof opts.optimizedAsm === "string" ? path.resolve(opts.optimizedAsm) : base + ".optimized.asm") : null,
      rom: opts.rom !== undefined ? (typeof opts.rom === "string" ? path.resolve(opts.rom) : defaultBinaryPath) : null,
      symbols: opts.symbols !== undefined ? (typeof opts.symbols === "string" ? path.resolve(opts.symbols) : base + ".sym") : null
    }
  });
}

main().catch((error) => { console.error(error?.stack || String(error)); process.exit(1); });
