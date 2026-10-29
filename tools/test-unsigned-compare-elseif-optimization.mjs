#!/usr/bin/env node
import assert from "node:assert/strict";

import { createCompilerShellHelpers } from "../studio/core/compiler/compilerShellHelpers.js";

let nextLabel = 0;
const helpers = createCompilerShellHelpers({
  state: {
    getNextGeneratedLabel: () => nextLabel,
    bumpNextGeneratedLabel: () => { nextLabel += 1; },
    getRamLayout: () => null,
    getNextRamAddress: () => 0,
    setNextRamAddress: () => {}
  },
  formatHex16: value => `$${value.toString(16).padStart(4, "0")}`
});

const commonPrefix = [
  "    ld A,(AMY_UVAR_Target)",
  "    ld B,A",
  "    ld A,(ix+0)",
  "    cp B",
  "    jr NC,AMY_IF_FALSE_1",
  "    inc (ix+0)",
  "    jr AMY_IF_END_2",
  "AMY_IF_FALSE_1:"
];
const repeatedTail = [
  "    ld A,(AMY_UVAR_Target)",
  "    ld B,A",
  "    ld A,(ix+0)",
  "    cp B",
  "    jr C,AMY_IF_FALSE_3",
  "    jr Z,AMY_IF_FALSE_3",
  "    dec (ix+0)",
  "AMY_IF_FALSE_3:",
  "AMY_IF_END_2:"
];

const optimized = helpers.optimizeUnsignedCompareElseIfTails([...commonPrefix, ...repeatedTail]);
assert.deepEqual(optimized, [
  ...commonPrefix,
  "    jr Z,AMY_IF_FALSE_3",
  "    dec (ix+0)",
  "AMY_IF_FALSE_3:",
  "AMY_IF_END_2:"
], "identical unsigned < / > comparisons should reuse CP flags");

const differentOperands = [...commonPrefix, ...repeatedTail];
differentOperands[9] = "    ld A,(AMY_UVAR_OtherTarget)";
assert.deepEqual(
  helpers.optimizeUnsignedCompareElseIfTails(differentOperands),
  differentOperands,
  "different operands must keep the second comparison"
);

const clobberedFlags = [...commonPrefix, "    or A", ...repeatedTail];
assert.deepEqual(
  helpers.optimizeUnsignedCompareElseIfTails(clobberedFlags),
  clobberedFlags,
  "instructions between the false label and repeated comparison must disable reuse"
);

const standaloneIfPrefix = commonPrefix.filter((line) => line !== "    jr AMY_IF_END_2");
const standaloneIfs = [...standaloneIfPrefix, ...repeatedTail.slice(0, -1)];
assert.deepEqual(
  helpers.optimizeUnsignedCompareElseIfTails(standaloneIfs),
  standaloneIfs,
  "independent adjacent IF statements must recompute their comparison flags"
);

const differentTargets = [...commonPrefix, ...repeatedTail];
differentTargets[13] = "    jr C,AMY_IF_FALSE_4";
assert.deepEqual(
  helpers.optimizeUnsignedCompareElseIfTails(differentTargets),
  differentTargets,
  "carry and zero branches with different targets must not be combined"
);

console.log("unsigned compare elseif optimization tests passed");
