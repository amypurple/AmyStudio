#!/usr/bin/env node
import assert from "node:assert/strict";

import { handleDisplayGraphicsSpriteStatement } from "../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";

function loadBytePreserving(register, token, liveRegs = []) {
  if (!liveRegs.length || register === "a") return [
    `    ld ${register},(${token})`
  ];
  return [
    "    push hl",
    `    ld hl,${token}`,
    `    ld ${register},(hl)`,
    "    pop hl"
  ];
}

const result = handleDisplayGraphicsSpriteStatement({
  line: "set sprite I to Y, X, P, C",
  rawLine: "set sprite I to Y, X, P, C",
  preferScreenOnNoNmi: false,
  currentGraphicsMode: null,
  emitLoadInt8Into: (register, token) => [`    ld ${register},(${token})`],
  emitLoadInt8ValueInto: (register, token) => [`    ld ${register},(${token})`],
  emitLoadInt8ValueIntoPreserving: loadBytePreserving,
  tryEvaluateConstantExpression: () => null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`
});

assert.equal(result.ok, true);
assert.equal(result.handled, true);

const asm = result.lines.join("\n");
assert.match(asm, /ld b,\(Y\)/);
assert.match(asm, /ld hl,X\n    ld c,\(hl\)/);
assert.match(asm, /ld hl,P\n    ld d,\(hl\)/);
assert.match(asm, /ld hl,C\n    ld e,\(hl\)/);
assert.match(asm, /ld a,\(I\)/);
assert.match(asm, /call AMY_SET_SPRITE/);
assert.doesNotMatch(asm, /ld [bcde],l/);


const multiFieldResult = handleDisplayGraphicsSpriteStatement({
  line: "set sprites 0,1,2,3 x to PlayerX",
  rawLine: "set sprites 0,1,2,3 x to PlayerX",
  preferScreenOnNoNmi: false,
  currentGraphicsMode: null,
  emitLoadInt8Into: (register, token) => [`    ld ${register},(${token})`],
  emitLoadInt8ValueInto: (register, token) => [`    ld ${register},(${token})`],
  emitLoadInt8ValueIntoPreserving: loadBytePreserving,
  tryEvaluateConstantExpression: (expr) => /^\d+$/.test(String(expr).trim()) ? Number(String(expr).trim()) : null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`
});

assert.equal(multiFieldResult.ok, true);
assert.equal(multiFieldResult.handled, true);
assert.deepEqual(multiFieldResult.lines, [
  "    ld a,(PlayerX)",
  "    ld (AMY_SPRITE_TABLE+1),a",
  "    ld (AMY_SPRITE_TABLE+5),a",
  "    ld (AMY_SPRITE_TABLE+9),a",
  "    ld (AMY_SPRITE_TABLE+13),a"
]);

console.log("set sprite dynamic argument codegen: PASS");
