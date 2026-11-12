#!/usr/bin/env node
import assert from "node:assert/strict";

import { createTypeSymbolHelpers } from "../studio/core/compiler/typeSymbolHelpers.js";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const maps = {
  constAsmSymbols: new Map([["FACE", "AMY_UCONST_FACE"]]),
  dataAsmSymbols: new Map(),
  assetAsmSymbols: new Map(),
  procAsmSymbols: new Map(),
  labelAsmSymbols: new Map(),
  userVarAsmSymbols: new Map([
    ["Lives", "AMY_UVAR_Lives"],
    ["A", "AMY_UVAR_A"],
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
