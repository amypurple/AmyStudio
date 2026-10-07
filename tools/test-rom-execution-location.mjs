import assert from "node:assert/strict";
import {
  assertExecutionLocation,
  captureExecutionLocation,
  executionLocationMatches
} from "../studio/core/romExecutionLocation.js";

const standard = {
  getPc: () => 0xC123,
  isMegaCart: () => false,
  getRomBank: () => 0
};
assert.deepEqual(captureExecutionLocation(standard), {
  address: 0xC123,
  bank: null,
  physicalBank: null
});

let pc = 0x8123;
let physicalBank = 7;
const megaCart = {
  getPc: () => pc,
  isMegaCart: () => true,
  getRomBank: () => physicalBank
};
assert.deepEqual(captureExecutionLocation(megaCart), {
  address: 0x8123,
  bank: 0,
  physicalBank: 7
});
pc = 0xC010;
physicalBank = 2;
const banked = captureExecutionLocation(megaCart);
assert.deepEqual(banked, { address: 0xC010, bank: 3, physicalBank: 2 });
assert.equal(executionLocationMatches(banked, { ...banked }), true);
assert.equal(executionLocationMatches(banked, { ...banked, bank: 2 }), false);
assert.deepEqual(assertExecutionLocation(megaCart, banked), banked);
physicalBank = 1;
assert.throws(() => assertExecutionLocation(megaCart, banked, "Keyframe 12"), /Keyframe 12 restored/);

console.log("ROM execution location metadata PASS");
