#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleVramTextStatement } from "../studio/core/compiler/vramTextStatementHelpers.js";

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
assert.equal((runtime.match(/ld c,\$01\s+ld b,7[^\r\n]*\s+call WRITE_REGISTER/g) ?? []).length, 2,
  "both timed blank paths must set R7 to black");
assert.equal((runtime.match(/ld a,\(AMY_VDP_R7_SHADOW\)\s+ld c,a\s+ld b,7/g) ?? []).length, 2,
  "both wake paths must restore the tracked R7 backdrop");
assert.ok(runtime.indexOf("ld c,$01") > runtime.indexOf("AMY_PAUSE_VBLANK_TICK:"),
  "the pause path must not set black before entering its timeout handler");

console.log("CRT-safe pause backdrop: PASS");