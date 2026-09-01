import assert from "node:assert/strict";
import { checkU32StatementDeprecation } from "../studio/core/compiler/deprecations.js";

const removedForms = [
  ["u32 zero Counter", "clear Counter"],
  ["u32 copy Source to Target", "Target = Source"],
  ["u32 add Value to Total", "Total += Value"],
  ["u32 inc Counter", "inc Counter"],
  ["u32 sub Value from Total", "Total -= Value"]
];

for (const [source, canonical] of removedForms) {
  const result = checkU32StatementDeprecation(source, source);
  assert.equal(result.handled, true, `${source} must be recognized as removed`);
  assert.equal(result.ok, false, `${source} must fail closed`);
  assert.ok(result.log.includes(`use '${canonical}'`), `${source} must suggest ${canonical}`);
}

for (const source of ["clear Counter", "Target = Source", "Total += Value", "inc Counter", "Total -= Value"]) {
  assert.equal(checkU32StatementDeprecation(source, source).handled, false, `${source} is canonical`);
}

console.log("Removed u32 forms PASS.");
