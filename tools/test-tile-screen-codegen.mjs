#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleDisplayGraphicsSpriteStatement } from "../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";

const result = handleDisplayGraphicsSpriteStatement({
  line: "tile screen", rawLine: "tile screen", preferScreenOnNoNmi: false, currentGraphicsMode: null,
  emitLoadInt8Into: () => null, emitLoadInt8ValueInto: () => null,
  tryEvaluateConstantExpression: () => null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`
});
assert.equal(result.ok, true);
assert.equal(result.handled, true);
assert.deepEqual(result.lines, [
  "    call AMY_SET_GRAPHICS_MODE2_TEXT", "    call LOAD_ASCII", "    call AMY_DUPLICATE_PATTERN_THIRDS",
  "    ld hl,VRAM_COLOR", "    ld de,$0800", "    ld a,$F0", "    call FILL_VRAM",
  "    ld hl,($73F6)", "    ld de,$0300", "    ld a,$20", "    call FILL_VRAM"
]);
console.log("tile screen codegen: PASS");
