#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleVramPixelInputStatement } from "../studio/core/compiler/vramPixelInputStatementHelpers.js";

function compile(line, { nmiKnownOff = false } = {}) {
  const body = [];
  const result = handleVramPixelInputStatement({
    line,
    rawLine: line,
    body,
    emitLoadVramAddressIntoHL: () => null,
    emitLoadInt8ValueInto: (register, token) => ["    ld " + register + "," + token],
    emitLoadInt16IntoHL: () => null,
    emitStoreInt8FromA: (name) => ["    ld (" + name + "),a"],
    resolveValueType: () => null,
    emitLoadInt8ValueIntoPreserving: () => null,
    getRuntimeInfo: (name) => name === "Choice" ? { type: "int8" } : null,
    emitStoreInt16FromHL: () => null,
    makeGeneratedLabel: () => "unused",
    currentGraphicsMode: null,
    nmiKnownOff
  });
  return { ...result, body };
}

assert.deepEqual(compile(
  "choose keypad KeyReplay to KeyMenu into Choice on keypad 2 blank after 5 seconds"
), {
  handled: true,
  ok: true,
  body: [
    "    ld b,KeyReplay",
    "    ld c,KeyMenu",
    "    ld hl,300",
    "    ld de,250",
    "    ld a,2",
    "    call AMY_CHOICE_KEYPAD_RANGE_BLANK",
    "    ld (Choice),a"
  ]
});

assert.deepEqual(compile("choose keypad 10 to 11 into Choice blank after 3 seconds").body, [
  "    ld b,10",
  "    ld c,11",
  "    ld hl,180",
  "    ld de,150",
  "    ld a,0",
  "    call AMY_CHOICE_KEYPAD_RANGE_BLANK",
  "    ld (Choice),a"
]);

assert.match(
  compile("choose keypad 10 to 11 into Choice blank after 5 seconds", { nmiKnownOff: true }).log,
  /requires NMI enabled/
);
assert.match(
  compile("choose keypad 10 to 11 into Choice blank after 0 seconds").log,
  /1 to 1092 seconds/
);
assert.deepEqual(compile("choose keypad 1 to 3 into Choice").body, [
  "    ld b,1",
  "    ld c,3",
  "    call AMY_CHOICE_KEYPAD_RANGE",
  "    ld (Choice),a"
]);

console.log("CRT-safe keypad choice codegen PASS");