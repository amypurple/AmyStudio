#!/usr/bin/env node
// Compile every Amy example through the Amy transpiler.
// Modes:
//   (no args)              run + report pass/fail
//   --snapshot [file]      run + save asmBody hashes to JSON  (default: tools/examples-baseline.json)
//   --compare  [file]      run + diff against saved snapshot
//   --compare-forms        compile legacy/canonical form pairs; report ASM differences
//   --assemble             also assemble every passing example into a balanced ROM
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SNAPSHOT = resolve(__dir, "examples-baseline.json");

const args = process.argv.slice(2);
const options = { only: null, assemble: false };
let mode = "run";
let snapshotFile = DEFAULT_SNAPSHOT;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--snapshot") {
    mode = "snapshot";
    if (args[index + 1] && !args[index + 1].startsWith("--")) snapshotFile = args[++index];
  } else if (arg === "--compare") {
    mode = "compare";
    if (args[index + 1] && !args[index + 1].startsWith("--")) snapshotFile = args[++index];
  } else if (arg === "--compare-forms") {
    mode = "compare-forms";
  } else if (arg === "--test-types") {
    mode = "test-types";
  } else if (arg === "--assemble") {
    options.assemble = true;
  } else if (arg === "--only") {
    const value = args[++index] || "";
    options.only = new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(2);
  }
}

import { getRamLayout } from "../studio/ramLayouts.js";
import { exampleCatalog } from "../studio/examples.js";
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
import { getOptimizationProfile, sourceHintsTinySound } from "../studio/core/optimization.js";
import { generateAsm } from "../studio/core/project.js";
import { newProject, defaultSourceText } from "../studio/core/projectLifecycle.js";
import { manifest } from "../studio/manifest.js";
import { alexisLibrarySources } from "../studio/core/alexisLibrarySources.generated.js";
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

function transpileAmy(sourceText, projectFiles = []) {
  const files = new Map(projectFiles.map((file) => [
    String(file?.path || "").replace(/\\/g, "/").replace(/^@project\//i, "").toLowerCase(),
    file
  ]));
  const resolveStaticAbiInclude = (includePath) => {
    const key = String(includePath || "").replace(/\\/g, "/").replace(/^@project\//i, "").toLowerCase();
    const file = files.get(key);
    return file?.base64 ? Buffer.from(file.base64, "base64").toString("utf8") : null;
  };
  return transpileAmyCore(sourceText, { ...DEPS, resolveStaticAbiInclude });
}

function buildExampleAssemblyFiles(ex, generatedAsm) {
  const files = { "main.asm": generatedAsm, ...alexisLibrarySources };
  for (const file of ex.projectFiles || []) {
    const normalizedPath = String(file?.path || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalizedPath || !file?.base64) continue;
    const barePath = normalizedPath.replace(/^@project\//i, "");
    const bytes = new Uint8Array(Buffer.from(file.base64, "base64"));
    files[barePath] = bytes;
    files[`@project/${barePath}`] = bytes;
  }
  const includeRe = /include\s+"([^"]+)"/g;
  let match;
  while ((match = includeRe.exec(generatedAsm))) {
    const includePath = match[1].replace(/\\/g, "/");
    if (files[includePath] != null || includePath.startsWith("@project/")) continue;
    const absolutePath = join(resolve(__dir, ".."), includePath);
    if (existsSync(absolutePath)) files[includePath] = readFileSync(absolutePath, "utf8");
  }
  return files;
}

async function assembleExampleRom(ex, result) {
  const project = newProject({
    manifestDefaults: manifest.defaults,
    sourceLang: "amy",
    memoryProfile: manifest.defaults.memoryProfile,
    defaultSourceTextValue: defaultSourceText()
  });
  project.sourceText = ex.sourceText;
  project.projectName = ex.label || ex.id;
  project.projectFiles = ex.projectFiles || [];
  const generatedAsm = generateAsm(project, result.asmBody, result.assets || [], result.metadata || {});
  const profile = getOptimizationProfile("balanced", generatedAsm);
  const assembled = await assembleAmysCVAssembly(buildExampleAssemblyFiles(ex, generatedAsm), "main.asm", {
    outputFilename: `${ex.id}.rom`,
    outputMode: "binary",
    targetPlatform: "coleco",
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig
  });
  if (!assembled.ok) {
    const errors = String(assembled.log || "")
      .split("\n")
      .filter((line) => /error/i.test(line))
      .slice(0, 4)
      .join(" | ");
    return { ok: false, log: errors || assembled.log || "assembler failed" };
  }
  const rom = assembled.binary || assembled.bytes || new Uint8Array();
  return { ok: true, size: rom.length };
}

function validateExampleAsm(ex, result) {
  const issues = [];
  if (!result?.ok) return issues;
  const asm = String(result.asmBody || "");
  if (ex.id === "amy-conditional-compile-lab") {
    const checks = [
      { ok: /ld a,42\b/.test(asm), message: "active DEBUG_BUILD branch did not emit Result = 42" },
      { ok: !/ld a,99\b/.test(asm), message: "inactive release branch emitted Result = 99" },
      { ok: !/INACTIVE RELEASE CODE/.test(asm), message: "inactive release branch text leaked into ASM" },
      { ok: !/INACTIVE HOOK/.test(asm), message: "inactive duplicate-hook branch text leaked into ASM" },
      { ok: (asm.match(/^AMY_UPROC_SameNameDebugHook:/gm) || []).length <= 1, message: "conditional duplicate sub emitted more than one SameNameDebugHook label" }
    ];
    for (const check of checks) {
      if (!check.ok) issues.push(check.message);
    }
  }
  if (ex.id === "amy-conditional-cstyle-lab") {
    const checks = [
      { ok: /ld a,7\b/.test(asm), message: "active #ifdef branch did not emit Result = 7" },
      { ok: !/ld a,88\b/.test(asm), message: "inactive #else branch emitted Result = 88" },
      { ok: !/INACTIVE ELSE CODE/.test(asm), message: "inactive #else text leaked into ASM" },
      { ok: !/INACTIVE LEAK SYMBOL/.test(asm), message: "inactive define leaked into later ifdef branch" },
      { ok: (asm.match(/^AMY_UPROC_LeakCheck:/gm) || []).length <= 1, message: "conditional duplicate sub emitted more than one LeakCheck label" }
    ];
    for (const check of checks) {
      if (!check.ok) issues.push(check.message);
    }
  }
  if (ex.id === "amy-on-frame-lab") {
    const hook = result.metadata?.onFrameHook;
    const checks = [
      { ok: hook?.name === "TickFrame", message: "on frame metadata did not record TickFrame" },
      { ok: hook?.asmLabel === "AMY_UPROC_TickFrame", message: "on frame metadata has wrong ASM label" },
      { ok: /^AMY_UPROC_TickFrame:/m.test(asm), message: "TickFrame sub label missing from emitted Amy body" }
    ];
    for (const check of checks) {
      if (!check.ok) issues.push(check.message);
    }
  }  if (ex.id === "title-screens-pletter-slideshow") {
    const mazePattern = "Asset_TitleMazeManiacPletter_pattern";
    const firstMazePattern = asm.indexOf(mazePattern);
    const secondMazePattern = asm.indexOf(mazePattern, firstMazePattern + 1);
    const cleanUploadStart = asm.lastIndexOf("call AMY_DISABLE_NMI", secondMazePattern);
    const cleanUploadEnd = asm.indexOf("call AMY_ENABLE_NMI", secondMazePattern);
    const timedPrefix = firstMazePattern >= 0 ? asm.slice(Math.max(0, firstMazePattern - 120), firstMazePattern) : "";
    const cleanSegment = cleanUploadStart >= 0 && cleanUploadEnd > cleanUploadStart
      ? asm.slice(cleanUploadStart, cleanUploadEnd)
      : "";
    const checks = [
      { ok: firstMazePattern >= 0 && secondMazePattern > firstMazePattern, message: "Pletter slideshow did not emit both timed and clean Maze Maniac uploads" },
      { ok: !/NO_NMI/.test(timedPrefix), message: "upload picture ... with nmi was incorrectly guarded by NO_NMI before the timed upload" },
      { ok: cleanUploadStart >= 0 && cleanUploadStart < secondMazePattern, message: "clean Maze Maniac upload did not preserve explicit nmi off before upload" },
      { ok: /ld a,1\s+ld \(NO_NMI\),a/.test(cleanSegment), message: "clean Maze Maniac upload did not raise NO_NMI before owning VDP" },
      { ok: /xor a\s+ld \(NO_NMI\),a/.test(cleanSegment), message: "clean Maze Maniac upload did not clear NO_NMI after VDP upload" },
      { ok: !/call WRITE_REGISTER|call READ_REGISTER/.test(cleanSegment), message: "clean Maze Maniac upload used the heavy VDP wrapper instead of the nmi-off ownership wrapper" }
    ];
    for (const check of checks) {
      if (!check.ok) issues.push(check.message);
    }
  }
  return issues;
}
function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

// ── mode: compare-forms ──────────────────────────────────────────────────────

function runCompareForms() {
  // Each pair: { label, type, legacy, canonical }
  // Uses N=3 (non-special) and N=1 (triggers inc/dec optimisation in canonical).
  const PAIRS = [
    // u8 add
    { label: "u8  add X by 3",       type: "u8",  legacy: "u8 X = 10\nadd X by 3",       canonical: "u8 X = 10\nX += 3" },
    { label: "u8  add 3 to X",        type: "u8",  legacy: "u8 X = 10\nadd 3 to X",        canonical: "u8 X = 10\nX += 3" },
    { label: "u8  add X by 1",        type: "u8",  legacy: "u8 X = 10\nadd X by 1",        canonical: "u8 X = 10\nX += 1" },
    // u8 sub
    { label: "u8  sub X by 3",        type: "u8",  legacy: "u8 X = 10\nsub X by 3",        canonical: "u8 X = 10\nX -= 3" },
    { label: "u8  subtract 3 from X", type: "u8",  legacy: "u8 X = 10\nsubtract 3 from X", canonical: "u8 X = 10\nX -= 3" },
    { label: "u8  sub X by 1",        type: "u8",  legacy: "u8 X = 10\nsub X by 1",        canonical: "u8 X = 10\nX -= 1" },
    // u8 mul/div
    { label: "u8  multiply X by 3",   type: "u8",  legacy: "u8 X = 10\nmultiply X by 3",   canonical: "u8 X = 10\nX *= 3" },
    { label: "u8  mul X by 3",        type: "u8",  legacy: "u8 X = 10\nmul X by 3",        canonical: "u8 X = 10\nX *= 3" },
    { label: "u8  multiply X by 2",   type: "u8",  legacy: "u8 X = 10\nmultiply X by 2",   canonical: "u8 X = 10\nX *= 2" },
    { label: "u8  divide X by 3",     type: "u8",  legacy: "u8 X = 10\ndivide X by 3",     canonical: "u8 X = 10\nX /= 3" },
    { label: "u8  div X by 3",        type: "u8",  legacy: "u8 X = 10\ndiv X by 3",        canonical: "u8 X = 10\nX /= 3" },
    // u16 add/sub
    { label: "u16 add X by 3",        type: "u16", legacy: "u16 X = 10\nadd X by 3",       canonical: "u16 X = 10\nX += 3" },
    { label: "u16 add X by 1",        type: "u16", legacy: "u16 X = 10\nadd X by 1",       canonical: "u16 X = 10\nX += 1" },
    { label: "u16 sub X by 3",        type: "u16", legacy: "u16 X = 10\nsub X by 3",       canonical: "u16 X = 10\nX -= 3" },
    { label: "u16 sub X by 1",        type: "u16", legacy: "u16 X = 10\nsub X by 1",       canonical: "u16 X = 10\nX -= 1" },
    // bcd add/sub
    { label: "bcd add X by 3",        type: "bcd", legacy: "bcd digits 4 X\nadd X by 3",   canonical: "bcd digits 4 X\nX += 3" },
    { label: "bcd sub X by 3",        type: "bcd", legacy: "bcd digits 4 X\nsub X by 3",   canonical: "bcd digits 4 X\nX -= 3" },
    // u32 add/sub
    { label: "u32 add X by 3",        type: "u32", legacy: "u32 X = 0\nadd X by 3",        canonical: "u32 X = 0\nX += 3" },
    { label: "u32 add X by 1",        type: "u32", legacy: "u32 X = 0\nadd X by 1",        canonical: "u32 X = 0\nX += 1" },
    { label: "u32 sub X by 3",        type: "u32", legacy: "u32 X = 0\nsub X by 3",        canonical: "u32 X = 0\nX -= 3" },
  ];

  let identical = 0;
  let different = 0;
  console.log("\n── Form comparison (legacy vs canonical) ──────────────────────────────────");
  console.log(`${"Form".padEnd(34)} ${"Type".padEnd(6)} Match?`);
  console.log("-".repeat(60));
  for (const { label, legacy, canonical } of PAIRS) {
    const rLeg = transpileAmy(legacy);
    const rCan = transpileAmy(canonical);
    if (!rLeg.ok) { console.log(`  ${label.padEnd(34)} ERROR (legacy): ${rLeg.log}`); continue; }
    if (!rCan.ok) { console.log(`  ${label.padEnd(34)} ERROR (canonical): ${rCan.log}`); continue; }
    const same = rLeg.asmBody === rCan.asmBody;
    if (same) {
      identical += 1;
      console.log(`  ${label.padEnd(34)} identical`);
    } else {
      different += 1;
      console.log(`  ${label.padEnd(34)} DIFFERENT`);
      // Show first differing line
      const legLines = rLeg.asmBody.split("\n");
      const canLines = rCan.asmBody.split("\n");
      const maxLen = Math.max(legLines.length, canLines.length);
      for (let i = 0; i < maxLen; i += 1) {
        if (legLines[i] !== canLines[i]) {
          console.log(`    legacy:    ${(legLines[i] ?? "(missing)").trim()}`);
          console.log(`    canonical: ${(canLines[i] ?? "(missing)").trim()}`);
          // show run of differing lines (up to 4)
          let shown = 1;
          for (let j = i + 1; j < maxLen && shown < 4; j += 1) {
            if (legLines[j] !== canLines[j]) {
              console.log(`    legacy:    ${(legLines[j] ?? "(missing)").trim()}`);
              console.log(`    canonical: ${(canLines[j] ?? "(missing)").trim()}`);
              shown += 1;
            }
          }
          break;
        }
      }
    }
  }
  console.log("-".repeat(60));
  console.log(`${identical} identical, ${different} different\n`);
}

// ── mode: test-types ────────────────────────────────────────────────────────

function runTestTypes() {
  const TYPES = [
    { name: "u8",      decl: "u8 X = 0" },
    { name: "u16",     decl: "u16 X = 0" },
    { name: "i8",      decl: "i8 X = 0" },
    { name: "i16",     decl: "i16 X = 0" },
    { name: "bcd",     decl: "bcd digits 4 X" },
    { name: "u32",     decl: "u32 X = 0" },
    { name: "fixed32", decl: "fixed32 X = 0.0" },
    { name: "fp5",     decl: "fp5 X = 0.0" },
    { name: "fixed",   decl: "fixed X = 0.0" },
  ];
  const OPS = ["+=", "-=", "*=", "/="];
  const N = "3";

  console.log("\n── Compound assignment type × operator coverage ────────────────────────────");
  console.log(`${"Type".padEnd(10)} ${"+=".padEnd(7)} ${"-=".padEnd(7)} ${"*=".padEnd(7)} ${"/=".padEnd(7)}`);
  console.log("-".repeat(42));
  for (const { name, decl } of TYPES) {
    const cols = [name.padEnd(10)];
    for (const op of OPS) {
      const r = transpileAmy(`${decl}\nX ${op} ${N}`);
      cols.push((r.ok ? "pass" : "FAIL").padEnd(7));
    }
    console.log(cols.join(" "));
  }
  console.log();

  let hasNotes = false;
  for (const { name, decl } of TYPES) {
    for (const op of OPS) {
      const r = transpileAmy(`${decl}\nX ${op} ${N}`);
      if (!r.ok) {
        if (!hasNotes) { console.log("Failure notes:"); hasNotes = true; }
        console.log(`  ${name} ${op}: ${r.log}`);
      }
    }
  }
  if (hasNotes) console.log();
}

// ── mode: run / snapshot / compare ──────────────────────────────────────────

const amyExamples = exampleCatalog.filter((ex) => ex.sourceLang === "amy" && (!options.only || options.only.has(ex.id)));
if (options.only) {
  const found = new Set(amyExamples.map((example) => example.id));
  const missing = [...options.only].filter((id) => !found.has(id));
  if (missing.length) {
    console.error(`Unknown or non-Amy example id(s): ${missing.join(", ")}`);
    process.exit(2);
  }
}

if (mode === "compare-forms") {
  runCompareForms();
  process.exit(0);
}

if (mode === "test-types") {
  runTestTypes();
  process.exit(0);
}

let passed = 0;
let failed = 0;
let assembledCount = 0;
let assembledBytes = 0;
const failures = [];
const hashes = {};

for (const ex of amyExamples) {
  const result = transpileAmy(ex.sourceText, ex.projectFiles);
  if (result.ok) {
    const validationIssues = validateExampleAsm(ex, result);
    if (validationIssues.length) {
      failed += 1;
      hashes[ex.id] = null;
      failures.push({ id: ex.id, log: validationIssues.join("; ") });
    } else if (options.assemble) {
      const assembled = await assembleExampleRom(ex, result);
      if (!assembled.ok) {
        failed += 1;
        hashes[ex.id] = null;
        failures.push({ id: ex.id, log: `ROM assembly failed: ${assembled.log}` });
      } else {
        passed += 1;
        assembledCount += 1;
        assembledBytes += assembled.size;
        hashes[ex.id] = sha256(result.asmBody);
      }
    } else {
      passed += 1;
      hashes[ex.id] = sha256(result.asmBody);
    }
  } else {
    failed += 1;
    hashes[ex.id] = null;
    failures.push({ id: ex.id, log: result.log });
  }
}

if (mode === "snapshot") {
  const snapshot = { generated: new Date().toISOString(), examples: hashes };
  writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot saved to ${snapshotFile}`);
}

if (mode === "compare") {
  if (!existsSync(snapshotFile)) {
    console.error(`Snapshot file not found: ${snapshotFile}`);
    process.exit(2);
  }
  const baseline = JSON.parse(readFileSync(snapshotFile, "utf8"));
  const baseHashes = baseline.examples || {};
  let changed = 0;
  let newFails = 0;
  let fixed = 0;
  console.log("\n── Snapshot comparison ─────────────────────────────────────────────────────");
  for (const id of Object.keys({ ...baseHashes, ...hashes })) {
    const was = baseHashes[id] ?? "(new)";
    const now = hashes[id] ?? "(failed)";
    if (was !== now) {
      if (now === "(failed)") {
        newFails += 1;
        console.log(`  NEWLY BROKEN  [${id}]`);
        const f = failures.find((x) => x.id === id);
        if (f) console.log(`    ${f.log}`);
      } else if (was === "(failed)" || was === "(new)") {
        fixed += 1;
        console.log(`  FIXED/NEW     [${id}]`);
      } else {
        changed += 1;
        console.log(`  ASM CHANGED   [${id}]`);
      }
    }
  }
  if (changed + newFails + fixed === 0) {
    console.log("  No changes from baseline.");
  }
  console.log(`\nBaseline: ${Object.keys(baseHashes).length} examples  |  New: ${newFails} broken, ${fixed} fixed, ${changed} ASM-changed\n`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${amyExamples.length} examples.`);
if (options.assemble) console.log(`ROMs: ${assembledCount} assembled, ${assembledBytes} total bytes (balanced).`);
console.log();
if (failures.length > 0) {
  console.log("FAILURES:");
  for (const { id, log } of failures) {
    console.log(`\n  [${id}]\n    ${log}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
