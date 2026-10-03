#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleSoundSpinnerStatement } from "../studio/core/compiler/soundSpinnerStatementHelpers.js";

const variables = new Set(["Register", "Value", "Result"]);
let labelId = 0;

function compile(line, capabilities = ["os7", "sgm", "sgm-ay"]) {
  return handleSoundSpinnerStatement({
    line,
    rawLine: line,
    buildContext: { capabilities },
    emitLoadInt8Into(register, expression) {
      const token = expression.trim();
      if (/^\$[0-9a-f]+$|^\d+$/i.test(token)) return [`    ld ${register},${token}`];
      if (variables.has(token)) return [`    ld a,(AMY_UVAR_${token})`, ...(register === "a" ? [] : [`    ld ${register},a`])];
      return null;
    },
    emitStoreInt8FromA(destination) {
      return variables.has(destination) ? [`    ld (AMY_UVAR_${destination}),a`] : null;
    },
    makeGeneratedLabel(prefix) {
      labelId += 1;
      return `AMY_${prefix}_${labelId}`;
    }
  });
}

const write = compile("ay write Register, Value");
assert.equal(write.ok, true);
assert.match(write.lines.join("\n"), /out \(SGM_AY_REG_PORT\),a/);
assert.match(write.lines.join("\n"), /out \(SGM_AY_WRITE_PORT\),a/);

const read = compile("ay read $0E, Result");
assert.equal(read.ok, true);
assert.match(read.lines.join("\n"), /in a,\(SGM_AY_READ_PORT\)/);
assert.match(read.lines.join("\n"), /AMY_UVAR_Result/);

const mute1 = compile("ay mute");
const mute2 = compile("ay mute");
assert.equal(mute1.ok, true);
assert.notEqual(mute1.lines[3], mute2.lines[3], "each inline mute loop needs a unique label");

const rejected = compile("ay write 7, $38", ["os7"]);
assert.equal(rejected.ok, false);
assert.match(rejected.log, /sgm-ay/);

const adamEnhancerWrite = compile("ay write Register, Value", ["adam", "eos", "sgm-ay"]);
assert.equal(adamEnhancerWrite.ok, true);
assert.match(adamEnhancerWrite.lines.join("\n"), /out \(SGM_AY_REG_PORT\),a/);
assert.match(adamEnhancerWrite.lines.join("\n"), /out \(SGM_AY_WRITE_PORT\),a/);

console.log("SGM AY syntax tests passed.");
