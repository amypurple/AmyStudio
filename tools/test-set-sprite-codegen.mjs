#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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


const outOfRangeResult = handleDisplayGraphicsSpriteStatement({
  line: "set sprite 40 to 10,20,4,15",
  rawLine: "set sprite 40 to 10,20,4,15",
  preferScreenOnNoNmi: false,
  currentGraphicsMode: null,
  emitLoadInt8Into: (register, token) => [`    ld ${register},${token}`],
  emitLoadInt8ValueInto: (register, token) => [`    ld ${register},${token}`],
  emitLoadInt8ValueIntoPreserving: loadBytePreserving,
  tryEvaluateConstantExpression: (expr) => /^\d+$/.test(String(expr).trim()) ? Number(String(expr).trim()) : null,
  formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`
});
assert.equal(outOfRangeResult.ok, false);
assert.match(outOfRangeResult.log, /between 0 and 31/);
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

const spriteRuntime = fs.readFileSync(
  path.resolve(import.meta.dirname, "..", "src", "alexis_lib", "coleco_sprite_table.asm"),
  "utf8"
);
const updateStart = spriteRuntime.indexOf("AMY_UPDATE_SPRITES:");
const updateEnd = spriteRuntime.indexOf("AMY_SPRITE_FLICKER_ON:", updateStart);
const updateRoutine = spriteRuntime.slice(updateStart, updateEnd);
assert.equal((updateRoutine.match(/^\s*outi\s*$/gmi) || []).length, 3, "sprite upload should use OUTI only for Y/X/pattern");
assert.match(updateRoutine, /and \$8F\s+out \(c\),a/i, "sprite color must remain masked during upload");
assert.match(updateRoutine, /push bc[\s\S]*pop bc/i, "conservative OUTI upload must preserve BC");
assert.doesNotMatch(updateRoutine, /\botir\b/i, "full OTIR is intentionally forbidden while inline ASM may bypass color setters");

console.log("set sprite dynamic argument codegen: PASS");
