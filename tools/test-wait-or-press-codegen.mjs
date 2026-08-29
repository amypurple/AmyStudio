#!/usr/bin/env node
import assert from "node:assert/strict";

import { handleVramPixelInputStatement } from "../studio/core/compiler/vramPixelInputStatementHelpers.js";

let labelId = 0;

function compile(line, { nmiKnownOff = false } = {}) {
  labelId = 0;
  const body = [];
  const result = handleVramPixelInputStatement({
    line,
    rawLine: line,
    body,
    emitLoadVramAddressIntoHL: () => null,
    emitLoadInt8ValueInto: () => null,
    emitLoadInt16IntoHL: (token) => [`    ld hl,${token}`],
    emitStoreInt8FromA: () => null,
    resolveValueType: () => null,
    emitLoadInt8ValueIntoPreserving: () => null,
    getRuntimeInfo: () => null,
    emitStoreInt16FromHL: () => null,
    makeGeneratedLabel: (prefix) => `AMY_${prefix}_${++labelId}`,
    currentGraphicsMode: null,
    tryEvaluateConstantExpression: (token) => /^\d+$/.test(token) ? Number.parseInt(token, 10) : null,
    nmiKnownOff
  });
  assert.equal(result.ok, true);
  assert.equal(result.handled, true);
  return body;
}

assert.deepEqual(compile("wait 800 frames or press"), [
  "    ld hl,800",
  "    ld a,h",
  "    or l",
  "    jr z,AMY_WaitOrPressDone_2",
  "AMY_WaitOrPress_1:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    ld d,a",
  "    ld a,(JOYPAD_2)",
  "    and $F0",
  "    or d",
  "    jr nz,AMY_WaitOrPressDone_2",
  "    dec hl",
  "    ld a,h",
  "    or l",
  "    jr nz,AMY_WaitOrPress_1",
  "AMY_WaitOrPressDone_2:"
]);

assert.deepEqual(compile("wait Count frames or press on joypad 2"), [
  "    ld hl,Count",
  "    ld a,h",
  "    or l",
  "    jr z,AMY_WaitOrPressDone_2",
  "AMY_WaitOrPress_1:",
  "    halt",
  "    ld a,(JOYPAD_2)",
  "    and $F0",
  "    jr nz,AMY_WaitOrPressDone_2",
  "    dec hl",
  "    ld a,h",
  "    or l",
  "    jr nz,AMY_WaitOrPress_1",
  "AMY_WaitOrPressDone_2:"
]);

assert.deepEqual(compile("pause until press on joypad 1"), [
  "AMY_PauseRelease_1:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    jr nz,AMY_PauseRelease_1",
  "AMY_PausePress_2:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    jr z,AMY_PausePress_2"
]);

assert.deepEqual(compile("pause until press"), [
  "AMY_PauseRelease_1:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    ld d,a",
  "    ld a,(JOYPAD_2)",
  "    and $F0",
  "    or d",
  "    jr nz,AMY_PauseRelease_1",
  "AMY_PausePress_2:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    ld d,a",
  "    ld a,(JOYPAD_2)",
  "    and $F0",
  "    or d",
  "    jr z,AMY_PausePress_2"
]);

assert.deepEqual(compile("wait fire"), [
  "AMY_WaitFire_1:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    ld d,a",
  "    ld a,(JOYPAD_2)",
  "    and $F0",
  "    or d",
  "    jr z,AMY_WaitFire_1"
]);

assert.deepEqual(compile("wait no fire on joypad 2"), [
  "AMY_WaitFire_1:",
  "    halt",
  "    ld a,(JOYPAD_2)",
  "    and $F0",
  "    jr nz,AMY_WaitFire_1"
]);

assert.deepEqual(compile("pause until press and release on joypad 1"), [
  "AMY_PauseRelease_1:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    jr nz,AMY_PauseRelease_1",
  "AMY_PausePress_2:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    jr z,AMY_PausePress_2",
  "AMY_PauseFinalRelease_3:",
  "    halt",
  "    ld a,(JOYPAD_1)",
  "    and $F0",
  "    jr nz,AMY_PauseFinalRelease_3"
]);
assert.deepEqual(compile("pause until press and release sleep after 5 seconds"), [
  "    ld hl,300",
  "    ld de,250",
  "    ld a,0",
  "    call AMY_PAUSE_PRESS_RELEASE_BLANK"
]);

assert.deepEqual(compile("pause until press and release on joypad 2 sleep after 30 seconds"), [
  "    ld hl,1800",
  "    ld de,1500",
  "    ld a,2",
  "    call AMY_PAUSE_PRESS_RELEASE_BLANK"
]);

assert.deepEqual(compile("sleep after 5 seconds"), [
  "    ld hl,300",
  "    ld de,250",
  "    ld a,0",
  "    call AMY_SLEEP_SERVICE"
]);
assert.deepEqual(compile("sleep after 1 second"), [
  "    ld hl,60",
  "    ld de,50",
  "    ld a,0",
  "    call AMY_SLEEP_SERVICE"
]);
assert.deepEqual(compile("sleep after 100 seconds on joypad 1"), [
  "    ld hl,6000",
  "    ld de,5000",
  "    ld a,1",
  "    call AMY_SLEEP_SERVICE"
]);

{
  const body = [];
  const line = "pause until press and release sleep after 5 seconds";
  const result = handleVramPixelInputStatement({
    line,
    rawLine: line,
    body,
    makeGeneratedLabel: () => "unused",
    currentGraphicsMode: null,
    tryEvaluateConstantExpression: (token) => /^\d+$/.test(token) ? Number.parseInt(token, 10) : null,
    nmiKnownOff: true
  });
  assert.equal(result.handled, true);
  assert.equal(result.ok, false);
  assert.match(result.log, /requires NMI enabled/i);
  assert.deepEqual(body, []);
}
console.log("wait-or-press codegen: PASS");
