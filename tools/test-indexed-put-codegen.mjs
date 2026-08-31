#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleVramTextStatement } from "../studio/core/compiler/vramTextStatementHelpers.js";

let sourceExpression = null;
const result = handleVramTextStatement({
  line: "put Messages + Offset count 25 at 4,22",
  rawLine: "put Messages + Offset count 25 at 4,22",
  addCompilerWarning: () => {},
  normalizeExpression: (value) => String(value).trim(),
  tryEvaluateConstantExpression: () => null,
  resolveAddressSymbol: (name) => name,
  getByteArrayBufferInfo: () => null,
  emitLoadSourceAddressIntoHL: (source) => {
    sourceExpression = source;
    return ["    ld hl,Messages", "    ld a,(Offset)", "    ld e,a", "    ld d,0", "    add hl,de"];
  },
  emitLoadInt8ValueInto: (register, value) => [`    ld ${register},${value}`],
  emitLoadInt8ValueIntoPreserving: (register, value) => [`    ld ${register},${value}`],
  dataLengths: new Map(),
  precomputedSprite16Lengths: new Map()
});

assert.equal(result.ok, true, result.log);
assert.equal(result.handled, true);
assert.equal(sourceExpression, "Messages + Offset");
assert.deepEqual(result.lines, [
  "    ld hl,Messages",
  "    ld a,(Offset)",
  "    ld e,a",
  "    ld d,0",
  "    add hl,de",
  "    ld d,22",
  "    ld e,4",
  "    ld b,25",
  "    call AMY_PUT_AT"
]);
console.log("indexed put codegen: PASS");
