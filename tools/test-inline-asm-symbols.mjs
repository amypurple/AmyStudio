#!/usr/bin/env node
import assert from "node:assert/strict";

import { createTypeSymbolHelpers } from "../studio/core/compiler/typeSymbolHelpers.js";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";
import { generateAsm } from "../studio/core/project.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { alexisLibrarySources } from "../studio/core/alexisLibrarySources.generated.js";

const maps = {
  constAsmSymbols: new Map([["FACE", "AMY_UCONST_FACE"]]),
  dataAsmSymbols: new Map(),
  assetAsmSymbols: new Map(),
  procAsmSymbols: new Map(),
  labelAsmSymbols: new Map(),
  userVarAsmSymbols: new Map([
    ["Lives", "AMY_UVAR_Lives"],
    ["A", "AMY_UVAR_A"],
    ["V", "AMY_UVAR_V"],
    ["N", "AMY_UVAR_N"],
    ["HL", "AMY_UVAR_HL"],
  ]),
};

const helpers = createTypeSymbolHelpers({
  lowerName: (name) => String(name).toLowerCase(),
  isValidSymbolName: (name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name),
  isReservedAmyIdentifier: () => false,
  describeGlobalNameCollision: () => null,
  normalizeExpression: (value) => String(value),
  getRuntimeInfo: () => null,
  scopedRuntimeName: (name) => name,
  runtimeTypeSize: () => 1,
  ...maps,
  userAsmNames: new Set(),
  sourceTypeAliases: new Map(),
});

assert.equal(helpers.rewriteUserSymbolsInAsmLine("  ld a,(Lives)"), "  ld a,(AMY_UVAR_Lives)");
assert.equal(helpers.rewriteUserSymbolsInAsmLine("  ld hl,$FACE"), "  ld hl,$FACE");
assert.equal(helpers.rewriteUserSymbolsInAsmLine("  ld hl,FACE"), "  ld hl,AMY_UCONST_FACE");
assert.equal(helpers.rewriteUserSymbolsInAsmLine("  ld a,(amy(A))"), "  ld a,(AMY_UVAR_A)");
assert.equal(helpers.rewriteUserSymbolsInAsmLine("  ld hl,amy(HL)"), "  ld hl,AMY_UVAR_HL");
assert.equal(helpers.rewriteUserSymbolsInAsmLine("  ld a,(amy(Lives)) ; explicit"), "  ld a,(AMY_UVAR_Lives) ; explicit");
assert.equal(helpers.rewriteUserSymbolsInAsmLine('Msg1: db "F/V N",0'), 'Msg1: db "F/V N",0');
assert.equal(helpers.rewriteUserSymbolsInAsmLine("Msg2: db 'V',\"N;V\",0 ; V N"), "Msg2: db 'V',\"N;V\",0 ; V N");
assert.equal(helpers.rewriteUserSymbolsInAsmLine('  ld a,(amy(V)) ; "V N"'), '  ld a,(AMY_UVAR_V) ; "V N"');
assert.equal(
  helpers.rewriteUserSymbolsInAsmLine("  nop ; value in [min(D,E), max(D,E)+1]"),
  "  nop ; value in [min(D,E), max(D,E)+1]"
);
assert.equal(
  helpers.rewriteUserSymbolsInAsmLine("  nop ; amy(Missing) is documentation only"),
  "  nop ; amy(Missing) is documentation only"
);
assert.throws(
  () => helpers.rewriteUserSymbolsInAsmLine("  ld a,(A)"),
  /Ambiguous inline ASM name 'A'.*amy\(A\)/
);
assert.throws(
  () => helpers.rewriteUserSymbolsInAsmLine("  ld hl,amy(Missing)"),
  /Unknown Amy symbol 'Missing'/
);

const explicitProgram = transpileAmyForTest([
  "u8 A = 7",
  "asm {",
  "  ld a,(amy(A))",
  "}",
  "loop forever",
].join("\n"));
assert.equal(explicitProgram.ok, true, explicitProgram.log);
assert.match(explicitProgram.asmBody, /ld a,\(AMY_UVAR_A\)/);
assert.match(explicitProgram.asmBody, /; @amy-source-line 3\s+ld a,\(AMY_UVAR_A\)/);

const bracketCommentProgram = transpileAmyForTest([
  "u8 D = 1",
  "u8 E = 2",
  "asm {",
  "  nop ; value in [min(D,E), max(D,E)+1]",
  "  ld a,(amy(D)) ; amy(Missing) and Fake[Row,Column] are comments",
  "}",
  "loop forever",
].join("\n"));
assert.equal(bracketCommentProgram.ok, true, bracketCommentProgram.log);
assert.match(bracketCommentProgram.asmBody, /nop ; value in \[min\(D,E\), max\(D,E\)\+1\]/);
assert.match(bracketCommentProgram.asmBody, /ld a,\(AMY_UVAR_D\) ; amy\(Missing\) and Fake\[Row,Column\] are comments/);

const quotedStringProgram = transpileAmyForTest([
  "u8 V = 1",
  "u8 N = 2",
  "asm {",
  'Msg1: db "F/V N",0',
  "}",
  "loop forever",
].join("\n"));
assert.equal(quotedStringProgram.ok, true, quotedStringProgram.log);
assert.match(quotedStringProgram.asmBody, /Msg1: db "F\/V N",0/);
assert.doesNotMatch(quotedStringProgram.asmBody, /F\/AMY_UVAR/);
const quotedAsm = generateAsm({
  projectName: "Inline ASM quoted string",
  sourceText: "",
  memoryProfile: "colecovision_legacy_sdcc",
  selectedLibs: [], selectedBundles: [], selectedCompression: [], selectedAssets: [], projectFiles: []
}, quotedStringProgram.asmBody, quotedStringProgram.assets || [], quotedStringProgram.metadata || {});
const quotedRom = await assembleAmysCVAssembly({ "main.asm": quotedAsm, ...alexisLibrarySources }, "main.asm", {
  outputFilename: "inline-asm-quoted-string.rom",
  outputMode: "binary",
  targetPlatform: "coleco",
  optimizerEnabled: false
});
assert.equal(quotedRom.ok, true, quotedRom.log);
const expectedText = [0x46, 0x2F, 0x56, 0x20, 0x4E, 0x00];
assert.ok([...quotedRom.binary].some((_byte, index, bytes) =>
  expectedText.every((expected, offset) => bytes[index + offset] === expected)
), "ROM must preserve the exact bytes for F/V N");

const ambiguousProgram = transpileAmyForTest([
  "u8 A = 7",
  "asm {",
  "  ld a,(A)",
  "}",
  "loop forever",
].join("\n"));
assert.equal(ambiguousProgram.ok, false);
assert.match(ambiguousProgram.log, /Line 3: Ambiguous inline ASM name 'A'/);
assert.match(ambiguousProgram.log, /Use amy\(A\)/);

const unknownExplicitProgram = transpileAmyForTest([
  "asm {",
  "  ld hl,amy(Missing)",
  "}",
].join("\n"));
assert.equal(unknownExplicitProgram.ok, false);
assert.match(unknownExplicitProgram.log, /Line 2: Unknown Amy symbol 'Missing'/);

console.log("inline ASM symbol tests: PASS");
