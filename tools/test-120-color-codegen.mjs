#!/usr/bin/env node
import assert from "node:assert/strict";

import { handleDisplayGraphicsSpriteStatement } from "../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";
import { generateAsm } from "../studio/core/project.js";

function compileLine(line) {
  return handleDisplayGraphicsSpriteStatement({
    line,
    rawLine: line,
    preferScreenOnNoNmi: false,
    currentGraphicsMode: null,
    emitLoadInt8Into: () => null,
    emitLoadInt8ValueInto: () => null,
    emitLoadInt8ValueIntoPreserving: () => null,
    tryEvaluateConstantExpression: () => null,
    formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`,
    makeGeneratedLabel: (prefix) => `${prefix}_0`
  });
}

function makeProject(sourceText) {
  return {
    sourceText,
    projectName: "120-color selftest",
    memoryProfile: "colecovision_legacy_sdcc",
    selectedLibs: [],
    selectedBundles: [],
    selectedCompression: [],
    selectedAssets: [],
    projectFiles: []
  };
}

assert.deepEqual(compileLine("120 colors on").lines, ["    call AMY_120C_ON"]);
assert.deepEqual(compileLine("120 colors off").lines, ["    call AMY_120C_OFF"]);

const asm = generateAsm(
  makeProject("120 colors on\n120 colors off"),
  "AMY_START:\n    call AMY_120C_ON\n    call AMY_120C_OFF\nAMY_FOREVER:\n    jp AMY_FOREVER"
);
assert.match(asm, /AMY_120C_ON:/);
assert.match(asm, /AMY_120C_OFF:/);
assert.match(asm, /AMY_120C_UPDATE:/);
assert.match(asm, /AMY_120C_ENABLED EQU \$[0-9A-F]{4}/);
assert.match(asm, /AMY_120C_PHASE\s+EQU \$[0-9A-F]{4}/);
assert.equal((asm.match(/^AMY_120C_ENABLED EQU /gm) || []).length, 1);
assert.equal((asm.match(/^AMY_120C_PHASE\s+EQU /gm) || []).length, 1);
assert.match(asm, /ld bc,\$037F[\s\S]*ld bc,\$0404/);
assert.match(asm, /AMY_120C_PHASE_ZERO:[\s\S]*ld bc,\$03FF[\s\S]*ld bc,\$0400/);
assert.match(asm, /AMY_120C_OFF:[\s\S]*ld bc,\$03FF[\s\S]*ld bc,\$0403/);

const saveAlternate = asm.indexOf("        exx\n        push bc\n        push de\n        push hl");
const updateCall = asm.indexOf("        call AMY_120C_UPDATE", saveAlternate);
assert.ok(saveAlternate >= 0 && updateCall > saveAlternate, "120C update must run after the full NMI register save");

const ordinaryAsm = generateAsm(
  makeProject("screen on"),
  "AMY_START:\n    call AMY_SCREEN_ON_NMI\nAMY_FOREVER:\n    jp AMY_FOREVER"
);
assert.doesNotMatch(ordinaryAsm, /AMY_120C_(?:ON|OFF|UPDATE|ENABLED|PHASE)/);

console.log("120-color codegen: PASS");