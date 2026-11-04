#!/usr/bin/env node
import assert from "node:assert/strict";

import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";
import { handleDisplayGraphicsSpriteStatement } from "../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";

const inferCaps = (source) => inferAmyMemoryCapabilities(source, () => false);
assert.equal(inferCaps('text screen\nprint "HELLO"').needsCompleteDefaultAscii, false);
assert.equal(inferCaps('text screen\nprint "READY}"').needsCompleteDefaultAscii, true);
assert.equal(inferCaps('text screen\nprint "ABOUT~"').needsCompleteDefaultAscii, true);
assert.equal(inferCaps("' A comment with } and ~\ntext screen").needsCompleteDefaultAscii, false);

const result = handleDisplayGraphicsSpriteStatement({
  line: "tile screen",
  rawLine: "tile screen",
  preferScreenOnNoNmi: false,
  currentGraphicsMode: null,
  emitLoadInt8Into: () => null,
  emitLoadInt8ValueInto: () => null,
  tryEvaluateConstantExpression: () => null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`
});

assert.equal(result.ok, true);
assert.equal(result.handled, true);

assert.deepEqual(result.lines, [
  "    call AMY_SET_GRAPHICS_MODE2_TEXT",
  "    call LOAD_ASCII",
  "    call AMY_DUPLICATE_PATTERN_THIRDS",
  "    ld hl,VRAM_COLOR",
  "    ld de,$0800",
  "    ld a,$F0",
  "    call FILL_VRAM",
  "    ld hl,(VDP_NAME_SHADOW)",
  "    ld de,$0300",
  "    ld a,$20",
  "    call FILL_VRAM"
]);

const rawMode2Result = handleDisplayGraphicsSpriteStatement({
  line: "mode 2 screen",
  rawLine: "mode 2 screen",
  preferScreenOnNoNmi: false,
  currentGraphicsMode: null,
  emitLoadInt8Into: () => null,
  emitLoadInt8ValueInto: () => null,
  tryEvaluateConstantExpression: () => null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`
});
assert.deepEqual(rawMode2Result.lines, ["    call AMY_SET_GRAPHICS_MODE2_RAW"]);

const eosResult = handleDisplayGraphicsSpriteStatement({
  line: "tile screen",
  rawLine: "tile screen",
  preferScreenOnNoNmi: false,
  currentGraphicsMode: null,
  emitLoadInt8Into: () => null,
  emitLoadInt8ValueInto: () => null,
  tryEvaluateConstantExpression: () => null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`,
  supportsColecoBios: false
});

assert.equal(eosResult.lines[1], "    call LOAD_ASCII", "native EOS must use its own LOAD_ASCII vector");

for (const line of ["text screen", "load default ascii"]) {
  const os7Result = handleDisplayGraphicsSpriteStatement({
    line,
    rawLine: line,
    preferScreenOnNoNmi: false,
    currentGraphicsMode: null,
    emitLoadInt8Into: () => null,
    emitLoadInt8ValueInto: () => null,
    tryEvaluateConstantExpression: () => null,
    formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`
  });
  const expectedRoutine = line === "load default ascii" ? "AMY_LOAD_DEFAULT_ASCII" : "LOAD_ASCII";
  assert.ok(os7Result.lines.includes(`    call ${expectedRoutine}`), `${line} must use ${expectedRoutine}`);
}

const completeAsciiResult = handleDisplayGraphicsSpriteStatement({
  line: "text screen",
  rawLine: "text screen",
  preferScreenOnNoNmi: false,
  currentGraphicsMode: null,
  emitLoadInt8Into: () => null,
  emitLoadInt8ValueInto: () => null,
  tryEvaluateConstantExpression: () => null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`,
  needsCompleteDefaultAscii: true
});
assert.ok(completeAsciiResult.lines.includes("    call AMY_LOAD_DEFAULT_ASCII"), "OS7 must complete the font when high glyphs are used");

console.log("tile screen codegen: PASS");
