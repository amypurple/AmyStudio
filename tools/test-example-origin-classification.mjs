import assert from "node:assert/strict";
import { exampleManifest as generatedManifest, exampleOriginLabels } from "../studio/examples-index.generated.js";
import { exampleManifest as browserManifest } from "../studio/examples.js";

const expectedOrigins = new Map([
  ["stronghold", "reimagined-adaptation"],
  ["microchip-golf", "reimagined-adaptation"],
  ["stars-and-signs", "reimagined-adaptation"],
  ["avalanche-run", "inspired"],
  ["casino", "adaptation-collection"],
  ["lamplighter", "original"],
  ["laser-chess", "faithful-adaptation"]
]);

const generatedById = new Map(generatedManifest.map((item) => [item.id, item]));
const browserById = new Map(browserManifest.map((item) => [item.id, item]));

for (const [id, expected] of expectedOrigins) {
  assert.equal(generatedById.get(id)?.originKind, expected, `${id} generated origin`);
  assert.equal(browserById.get(id)?.originKind, expected, `${id} browser origin`);
}

for (const item of generatedManifest) {
  if (!item.originKind) continue;
  assert.equal(item.originLabel, exampleOriginLabels[item.originKind], `${item.id} origin label`);
  assert.equal(browserById.get(item.id)?.originLabel, item.originLabel, `${item.id} browser label`);
}

console.log(`Example origin classification passed for ${generatedManifest.length} examples.`);
