import assert from "node:assert/strict";
import { checkArithmeticDeprecation } from "../studio/core/compiler/deprecations.js";

const removedForms = [
  ["min Score with Limit", "Score = min(Score, Limit)"],
  ["min Score to 10", "Score = min(Score, 10)"],
  ["max Score with Floor", "Score = max(Score, Floor)"],
  ["max Score to 5", "Score = max(Score, 5)"]
];

for (const [source, canonical] of removedForms) {
  const result = checkArithmeticDeprecation(source, source);
  assert.equal(result.handled, true, `${source} must be recognized as removed`);
  assert.equal(result.ok, false, `${source} must fail closed`);
  assert.ok(result.log.includes(`use '${canonical}'`), `${source} must suggest ${canonical}`);
}

for (const source of ["Score = min(Score, Limit)", "Score = max(Score, Floor)"]) {
  assert.equal(checkArithmeticDeprecation(source, source).handled, false, `${source} is canonical`);
}

console.log("Removed min/max forms PASS.");
