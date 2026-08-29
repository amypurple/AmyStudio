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

const breakpoint = compile('debug breakpoint "game_loop"');
const sourceMarker = compile("debug source marker 42");
assert.equal(sourceMarker.ok, true);
assert.deepEqual(sourceMarker.lines, ["; @amy-source-line 42"]);

assert.equal(breakpoint.ok, true);
assert.deepEqual(breakpoint.lines, ["AMY_ULBL_BREAK_game_loop:", "    nop"]);
const invalidBreakpoint = compile('debug breakpoint "two words"');
assert.equal(invalidBreakpoint.handled, true);
assert.equal(invalidBreakpoint.ok, false);
assert.match(invalidBreakpoint.log, /quoted identifier/);

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
