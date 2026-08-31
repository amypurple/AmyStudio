#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleVramTextStatement } from "../studio/core/compiler/vramTextStatementHelpers.js";

function unwrapProtectedUpload(lines) {
  const start = lines.findIndex((line) => line === "    call AMY_VRAM_BEGIN");
  const end = lines.findIndex((line, index) => index > start && line === "    call AMY_VRAM_END");
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return lines.slice(start + 1, end);
}
function compile(line) {
  return handleVramTextStatement({
    line, rawLine: line, addCompilerWarning: () => {}, normalizeExpression: (value) => String(value).trim(),
    tryEvaluateConstantExpression: (token) => {
      const text = String(token ?? "").trim();
      if (/^\$[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(1), 16);
      if (/^[0-9]+$/.test(text)) return Number.parseInt(text, 10);
      return null;
    },
    resolveAddressSymbol: (name) => name,
    emitLoadVramAddressIntoHL: (target) => {
      const match = String(target).trim().match(/^vram\.(pattern|color|name)\s*\+\s*(.+)$/i);
      if (match) return [`    ld hl,${{ pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME" }[match[1].toLowerCase()]} + ${match[2]}`];
      return [`    ld hl,${target}`];
    },
    emitLoadVramAddressIntoDE: (target) => [`    ld de,${target}`], emitLoadSourceAddressIntoHL: (target) => [`    ld hl,${target}`],
    assets: [{ name: "TestPattern", codec: "zx0" }], getRuntimeInfo: () => null, getByteArrayBufferInfo: () => null,
    emitLoadArrayAddressIntoHL: () => null, emitLoadCountIntoBC: (count) => [`    ld bc,${count}`],
    isDefinitelyByteSizedCount: () => true, runtimeTypeSize: () => 1, symbolOrValue: (value) => value,
    dataLengths: new Map(), precomputedSprite16Lengths: new Map(), emitDefineCharsToPattern: () => null,
    emitDefineColorsToPattern: () => null, emitLoadInt8ValueInto: (register, value) => [`    ld ${register},${value}`],
    emitLoadInt8ValueIntoPreserving: (register, value) => [`    ld ${register},${value}`], emitLoadInt16IntoHL: (value) => [`    ld hl,${value}`],
    emitStoreExtended32: () => null, emitLoadCountIntoDE: (count) => [`    ld de,${count}`], parseArrayRef: () => null,
    emitStoreInt8FromA: () => null, currentGraphicsMode: "mode1_text",
    makeGeneratedLabel: (() => { let id = 0; return (prefix) => `AMY_${prefix}_${id++}`; })()
  });
}
assert.deepEqual(compile("set text colors light green count 32").lines, ["    ld hl,VRAM_COLOR + 0", "    ld de,32", "    ld a,$30", "    call FILL_VRAM"]);
assert.deepEqual(compile("set text colors cyan at 6 count 2").lines, ["    ld hl,VRAM_COLOR + 6", "    ld de,2", "    ld a,$70", "    call FILL_VRAM"]);
assert.deepEqual(compile("set text colors cyan on dark blue at 6 count 2").lines, ["    ld hl,VRAM_COLOR + 6", "    ld de,2", "    ld a,$74", "    call FILL_VRAM"]);
assert.deepEqual(unwrapProtectedUpload(compile("fill $20 count 8 to vram.name + $00EC").lines), ["    ld hl,VRAM_NAME + $00EC", "    ld de,8", "    ld a,$20", "    call FILL_VRAM"]);
assert.deepEqual(compile("fill $20 count 10 at 5,8").lines, ["    ld d,8", "    ld e,5", "    ld b,10", "    ld a,$20", "    call AMY_FILL_AT"]);
assert.deepEqual(compile("backdrop sky blue").lines, ["    ld a,$05", "    ld (AMY_VDP_R7_SHADOW),a", "    ld c,a", "    ld b,7", "    call WRITE_REGISTER"]);
assert.deepEqual(unwrapProtectedUpload(compile("decompress TestPattern to vram.pattern").lines), ["    ld de,vram.pattern", "    push de", "    ld hl,Asset_TestPattern", "    pop de", "    call zx0_decompress"]);
assert.equal(compile("paper black").handled, false);
console.log("text color codegen: PASS");
