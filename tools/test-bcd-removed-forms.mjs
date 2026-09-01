import assert from "node:assert/strict";
import { checkBcdStatementDeprecation } from "../studio/core/compiler/deprecations.js";

const removedForms = [
  ["add bcd Score by 25", "Score += 25"],
  ["sub bcd Player.Score by Delta", "Player.Score -= Delta"],
  ["clear bcd State.Game.Score", "clear State.Game.Score"],
  ["copy bcd Score to Best", "Best = Score"]
];

for (const [source, canonical] of removedForms) {
  const result = checkBcdStatementDeprecation(source, source);
  assert.equal(result.handled, true, `${source} must be recognized as removed`);
  assert.equal(result.ok, false, `${source} must fail closed`);
  assert.ok(result.log.includes(`use '${canonical}'`), `${source} must suggest ${canonical}`);
}

for (const source of ["Score += 25", "Player.Score -= Delta", "clear State.Game.Score", "Best = Score"]) {
  assert.equal(checkBcdStatementDeprecation(source, source).handled, false, `${source} is canonical`);
}

console.log("Removed BCD forms PASS.");
