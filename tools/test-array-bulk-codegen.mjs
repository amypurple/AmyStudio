#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleArrayBulkStatement } from "../studio/core/compiler/arrayBulkStatementHelpers.js";

let labelId = 0;
const runtime = new Map([
  ["Bytes", { kind: "array", elementType: "int8", length: 4, address: 0x7100 }],
  ["Count", { kind: "scalar", type: "int8", address: 0x7104 }],
  ["Ghosts", { kind: "record_array", recordTypeName: "Ghost", recordSize: 13, length: 4, address: 0x7200 }]
]);
const ghostRecord = {
  orderedFields: [
    { name: "X", type: "int8", size: 1, offset: 0 },
    { name: "Vulnerable", type: "int8", size: 1, offset: 6 }
  ]
};
const base = {
  rawLine: "test",
  getRuntimeInfo: (name) => runtime.get(name) || null,
  runtimeTypeSize: () => 1,
  symbolOrValue: (value) => String(value),
  emitLoadInt8Into: (register, value) => [`    ld ${register},${value}`],
  emitLoadInt8ValueInto: (register, value) => [`    ld ${register},${value}`],
  emitLoadArrayAddressIntoHL: (name) => [`    ld hl,${runtime.get(name).address}`],
  emitStoreInt8FromA: () => null,
  makeGeneratedLabel: (name) => `TEST_${name.toUpperCase()}_${labelId++}`,
  getTileTypeInfo: () => null,
  getRecordTypeInfo: (name) => name === "Ghost" ? ghostRecord : null
};

const bytes = handleArrayBulkStatement({ ...base, line: "fill array Bytes with 1 count 4" });
assert.equal(bytes.ok, true);
assert(bytes.lines.includes("    ld b,4"));
assert(bytes.lines.some((line) => line.startsWith("    djnz TEST_FILLARRAYBYTELOOP_")));
assert(!bytes.lines.some((line) => line.startsWith("    ld bc,")));
assert(!bytes.lines.includes("    dec bc"));

const variableCount = handleArrayBulkStatement({ ...base, line: "fill array Bytes with 9 count Count" });
assert.equal(variableCount.handled, true);
assert.equal(variableCount.ok, false);
assert.match(variableCount.log, /count must be a constant, not a RAM variable/i);

const field = handleArrayBulkStatement({ ...base, line: "fill record array Ghosts field Vulnerable with 0" });
assert.equal(field.ok, true);
assert(field.lines.includes(`    ld hl,${0x7200 + 6}`));
assert(field.lines.includes("    ld de,13"));
assert(field.lines.includes("    ld b,4"));
assert(field.lines.includes("    ld (hl),a"));
assert(field.lines.includes("    add hl,de"));
assert(!field.lines.includes("    ld hl,29184"));

console.log("array bulk codegen self-test: PASS");
