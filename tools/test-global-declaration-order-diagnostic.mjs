#!/usr/bin/env node
import assert from "node:assert/strict";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const lateGlobal = transpileAmyForTest(`
u8 Result = 0
ReadValue()
loop forever
sub ReadValue
  Result = Later
end sub
u8 Later = 7
`);

assert.equal(lateGlobal.ok, false);
assert.match(lateGlobal.log, /Global variable 'Later' is used before its declaration on line 8/i);
assert.match(lateGlobal.log, /declare globals before main code and sub\/function bodies/i);

const ordinaryInvalid = transpileAmyForTest(`
u8 Result = 0
Result = Missing + 1
`);

assert.equal(ordinaryInvalid.ok, false);
assert.match(ordinaryInvalid.log, /Invalid runtime assignment/i);
assert.doesNotMatch(ordinaryInvalid.log, /used before its declaration/i);

console.log("Global declaration-order diagnostic: PASS");
