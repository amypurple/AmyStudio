#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleVramTextStatement } from "../studio/core/compiler/vramTextStatementHelpers.js";
import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";
import { buildColecoLegacyRuntimeMap } from "../studio/ramLayouts.js";

const result = handleVramTextStatement({
  line: "backdrop sky blue",
  rawLine: "backdrop sky blue",
  addCompilerWarning: () => {},
  normalizeExpression: (value) => String(value).trim(),
  tryEvaluateConstantExpression: () => null,
  resolveAddressSymbol: (name) => name
});
assert.equal(result.ok, true);
assert.deepEqual(result.lines, [
  "    ld a,$05",
  "    ld (AMY_VDP_R7_SHADOW),a",
  "    ld c,a",
  "    ld b,7",
  "    call WRITE_REGISTER"
]);

const runtime = readFileSync(new URL("../src/alexis_lib/coleco_pause.asm", import.meta.url), "utf8");
assert.equal((runtime.match(/ld c,\$01\s+ld b,7[^\r\n]*\s+call WRITE_REGISTER/g) ?? []).length, 3,
  "pause, menu sleep, and keypad timeout paths must set R7 to black");
assert.equal((runtime.match(/ld a,\(AMY_VDP_R7_SHADOW\)\s+ld c,a\s+ld b,7/g) ?? []).length, 2,
  "shared pause/menu sleep and keypad wake paths must restore the tracked R7 backdrop");
assert.doesNotMatch(runtime.slice(runtime.indexOf("AMY_PAUSE_PRESS_RELEASE_BLANK:"), runtime.indexOf("AMY_SLEEP_SERVICE:")), /ld c,\$01/,
  "the blocking pause must not set black before entering its timeout handler");
assert.match(runtime, /AMY_PAUSE_WAKE_RELEASE:[\s\S]*?jr nz,AMY_PAUSE_WAKE_RELEASE[\s\S]*?jr AMY_PAUSE_FRESH_PRESS/,
  "a wake press must be released and consumed before waiting for confirmation");
assert.match(runtime, /call AMY_PAUSE_RESTORE_DISPLAY\s+AMY_PAUSE_WAKE_RELEASE:/,
  "the display must be restored immediately when the wake press is detected");
assert.match(runtime, /AMY_SLEEP_SERVICE:[\s\S]*?call AMY_SLEEP_READ_INPUTS[\s\S]*?ld \(AMY_SLEEP_IDLE_TICKS\),hl[\s\S]*?AMY_SLEEP_WAIT_INPUT:/,
  "menu sleep must return while awake and blank only after its persistent idle counter expires");
assert.match(runtime, /AMY_SLEEP_READ_INPUTS:[\s\S]*?JOYPAD_1[\s\S]*?KEYPAD_1[\s\S]*?JOYPAD_2[\s\S]*?KEYPAD_2/,
  "menu sleep must recognize directions, actions, and keypad input on both ports");
assert.match(runtime, /call AMY_PAUSE_RESTORE_DISPLAY\s+pop de\s+AMY_SLEEP_WAIT_RELEASE:[\s\S]*?jr nz,AMY_SLEEP_WAIT_RELEASE[\s\S]*?AMY_SLEEP_RESET:/,
  "menu wake must restore the display, consume release, and reset inactivity");

const backdropCaps = inferAmyMemoryCapabilities("backdrop black\nu8 Sentinel = 0", () => false);
assert.equal(backdropCaps.needsBackdropShadow, true,
  "backdrop must reserve the VDP R7 shadow in the transpiler RAM layout");
const backdropLayout = buildColecoLegacyRuntimeMap(backdropCaps);
assert.equal(backdropLayout.addresses.vdp_r7_shadow, 0x7023);
assert.equal(backdropLayout.userRamStart, 0x7024,
  "user RAM must start after the VDP R7 shadow");

const explicitShadowCaps = inferAmyMemoryCapabilities("asm {\n  ld (AMY_VDP_R7_SHADOW),a\n}", () => false);
assert.equal(explicitShadowCaps.needsBackdropShadow, true,
  "explicit ASM shadow references must reserve the VDP R7 shadow");

const sleepCaps = inferAmyMemoryCapabilities("screen on\nsleep after 10 seconds", () => false);
assert.equal(sleepCaps.needsSleepState, true);
assert.equal(sleepCaps.needsControllers, true);
assert.equal(sleepCaps.needsBackdropShadow, true);
const sleepLayout = buildColecoLegacyRuntimeMap(sleepCaps);
assert.equal(sleepLayout.addresses.sleep_idle_ticks, 0x7028);
assert.equal(sleepLayout.userRamStart, 0x702A,
  "sleep must reserve its counter before the four controller bytes");

console.log("CRT-safe pause backdrop: PASS");
