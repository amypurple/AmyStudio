#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleSoundSpinnerStatement } from "../studio/core/compiler/soundSpinnerStatementHelpers.js";

let labelId = 0;
function compile(line) {
  labelId = 0;
  return handleSoundSpinnerStatement({
    line, rawLine: line,
    emitLoadInt8Into: (register, token) => [`    ld ${register},${token}`],
    emitLoadInt8ValueInto: (register, token) => [`    ld ${register},${token}`],
    emitLoadInt16IntoHL: (token) => [`    ld hl,${token}`],
    tryEvaluateCompileTimeNumericExpression: (token) => {
      const text = String(token ?? "").trim();
      if (/^\$[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(1), 16);
      if (/^[0-9]+$/.test(text)) return Number.parseInt(text, 10);
      return null;
    },
    normalizeExpression: (value) => String(value).trim(),
    makeGeneratedLabel: (prefix) => `AMY_${prefix}_${++labelId}`,
    resolveAddressSymbol: (name) => name
  });
}
assert.deepEqual(compile("wait").lines, ["    ld hl,1", "    call AMY_WAIT_FRAMES_SAFE"]);
assert.deepEqual(compile("wait 1 frame").lines, ["    ld hl,1", "    call AMY_WAIT_FRAMES_SAFE"]);
assert.deepEqual(compile("wait 1 frames").lines, ["    ld hl,1", "    call AMY_WAIT_FRAMES_SAFE"]);
assert.deepEqual(compile("wait 0 frames").lines, []);
assert.deepEqual(compile("wait 300 frames").lines, ["    ld hl,300", "    call AMY_WAIT_FRAMES_SAFE"]);
assert.equal(compile("wait 65536 frames").ok, false);
assert.deepEqual(compile("wait Count frames").lines, ["    ld hl,Count", "    call AMY_WAIT_FRAMES_SAFE"]);
console.log("wait codegen: PASS");
