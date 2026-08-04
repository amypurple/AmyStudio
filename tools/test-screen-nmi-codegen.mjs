#!/usr/bin/env node
import assert from "node:assert/strict";

import { handleDisplayGraphicsSpriteStatement } from "../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";

function compileLine(line, preferScreenOnNoNmi = true) {
  return handleDisplayGraphicsSpriteStatement({
    line,
    rawLine: line,
    preferScreenOnNoNmi,
    currentGraphicsMode: null,
    emitLoadInt8Into: () => null,
    emitLoadInt8ValueInto: () => null,
    emitLoadInt8ValueIntoPreserving: () => null,
    tryEvaluateConstantExpression: () => null,
    formatHex16: (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`,
    makeGeneratedLabel: (prefix) => `${prefix}_0`
  });
}

const screenOn = compileLine("screen on", true);
assert.equal(screenOn.ok, true);
assert.deepEqual(screenOn.lines, ["    call AMY_SCREEN_ON_NMI"]);

const screenOnNoNmi = compileLine("screen on no nmi", false);
assert.equal(screenOnNoNmi.ok, true);
assert.deepEqual(screenOnNoNmi.lines, ["    call AMY_SCREEN_ON_NO_NMI"]);

const screenOff = compileLine("screen off", false);
assert.equal(screenOff.ok, true);
assert.deepEqual(screenOff.lines, ["    call AMY_SCREEN_OFF_NO_NMI"]);

const nmiOn = compileLine("nmi on", false);
assert.equal(nmiOn.ok, true);
assert.deepEqual(nmiOn.lines, ["    call AMY_ENABLE_NMI"]);

const nmiOff = compileLine("nmi off", false);
assert.equal(nmiOff.ok, true);
assert.deepEqual(nmiOff.lines, ["    call AMY_DISABLE_NMI"]);

console.log("screen/NMI codegen: PASS");