#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleSoundSpinnerStatement } from "../studio/core/compiler/soundSpinnerStatementHelpers.js";

let labelCounter = 0;
const result = handleSoundSpinnerStatement({
  line: "play dsound VoiceData step 6",
  rawLine: "play dsound VoiceData step 6",
  emitLoadInt8Into: () => null,
  emitLoadInt8ValueInto: () => null,
  emitLoadInt16IntoHL: () => null,
  tryEvaluateCompileTimeNumericExpression: () => null,
  normalizeExpression: (value) => String(value),
  makeGeneratedLabel: (prefix) => `AMY_${prefix}_${labelCounter++}`,
  resolveAddressSymbol: (name) => `AMY_UDATA_${name}`
});

assert.equal(result.ok, true);
assert.equal(result.handled, true);
const asm = result.lines.join("\n");
assert.match(asm, /ld \(NO_NMI\),a/);
assert.match(asm, /ld a,\(\$73C4\)/);
assert.match(asm, /and \$DF/);
assert.match(asm, /call WRITE_REGISTER/);
assert.match(asm, /call READ_REGISTER/);
assert.match(asm, /ld hl,AMY_UDATA_VoiceData/);
assert.match(asm, /ld c,6/);
assert.match(asm, /call AMY_PLAY_DSOUND/);
assert.match(asm, /pop af\n    ld \(\$73C4\),a/);
assert.match(asm, /and \$20\n    jp z,AMY_DsoundNmiWasOff_0/);
assert.match(asm, /ei/);
assert.match(asm, /AMY_DsoundDone_1:/);

const playIndex = asm.indexOf("call AMY_PLAY_DSOUND");
assert.ok(asm.indexOf("and $DF") < playIndex, "NMI disable must happen before playback");
assert.ok(asm.indexOf("pop af", playIndex) > playIndex, "NMI state restore must happen after playback");

console.log("dsound NMI wrapper codegen: PASS");
