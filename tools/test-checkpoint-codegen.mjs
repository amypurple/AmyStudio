import assert from "node:assert/strict";
import { handleDispatchLabelStatement } from "../studio/core/compiler/dispatchLabelStatementHelpers.js";

function compile(line) {
  return handleDispatchLabelStatement({
    line,
    rawLine: line,
    ensureLabelAsmSymbol: (name) => `AMY_ULBL_${name}`
  });
}

const valid = compile('test checkpoint "player_over_cat"');
assert.equal(valid.ok, true);
assert.equal(valid.handled, true);
assert.deepEqual(valid.lines, ["AMY_ULBL_TEST_player_over_cat:", "    nop"]);

const second = compile('test checkpoint "after_animation"');
assert.deepEqual(second.lines, ["AMY_ULBL_TEST_after_animation:", "    nop"]);
assert.notEqual(valid.lines[0], second.lines[0]);

for (const source of [
  'test checkpoint "player-over-cat"',
  'test checkpoint "two words"',
  'test checkpoint "2early"',
  "test checkpoint player"
]) {
  const result = compile(source);
  assert.equal(result.handled, true, source);
  assert.equal(result.ok, false, source);
  assert.match(result.log, /quoted identifier/, source);
}


console.log("checkpoint codegen self-test: PASS");