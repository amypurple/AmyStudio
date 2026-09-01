import assert from "node:assert/strict";
import {
  checkVramCharReadDeprecation,
  checkVramPutReorderDeprecation
} from "../studio/core/compiler/deprecations.js";

const removedForms = [
  [checkVramCharReadDeprecation, "get char at 1,2 into Value", "Value = get char at 1,2"],
  [checkVramCharReadDeprecation, "get tile at 1,2 into Shared.Game.Items[1].X", "Shared.Game.Items[1].X = get char at 1,2"],
  [checkVramCharReadDeprecation, "Shared.Game.Items[1].X = read tile at 1,2", "Shared.Game.Items[1].X = get char at 1,2"],
  [checkVramPutReorderDeprecation, "put chars Row at 1,2 count 8", "put Row count 8 at 1,2"],
  [checkVramPutReorderDeprecation, "put at 1,2 Row count 8", "put Row count 8 at 1,2"],
  [checkVramPutReorderDeprecation, "put tile $41 at 1,2", "put char $41 at 1,2"]
];

for (const [check, source, canonical] of removedForms) {
  const result = check(source, source);
  assert.equal(result.handled, true, `${source} must be recognized as removed`);
  assert.equal(result.ok, false, `${source} must fail closed`);
  assert.match(result.log, new RegExp(canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

assert.equal(checkVramCharReadDeprecation("Value = get char at 1,2", "Value = get char at 1,2").handled, false);
assert.equal(checkVramPutReorderDeprecation("put char $41 at 1,2", "put char $41 at 1,2").handled, false);

console.log("Removed VRAM forms PASS.");
