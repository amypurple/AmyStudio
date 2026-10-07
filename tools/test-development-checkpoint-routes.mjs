import assert from "node:assert/strict";
import {
  compressRouteInputs,
  createDevelopmentRouteStore,
  expandRouteInputs
} from "../studio/core/developmentCheckpointRoutes.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const inputs = [
  { controllerMasks: [0, 0], spinnerDeltas: [0, 0] },
  { controllerMasks: [0, 0], spinnerDeltas: [0, 0] },
  { controllerMasks: [16, 0], spinnerDeltas: [0, 0] },
  { controllerMasks: [16, 0], spinnerDeltas: [2, -1] }
];
const compressed = compressRouteInputs(inputs);
assert.equal(compressed.length, 3);
assert.deepEqual(expandRouteInputs(compressed), inputs);

const storage = new MemoryStorage();
const routes = createDevelopmentRouteStore(storage, { prefix: "test-routes" });
const success = routes.save("laser strike", {
  id: "success",
  name: "Wave 5 with three lives",
  checkpoint: "wave_5",
  checkpointBank: 2,
  inputs
});
routes.save("laser strike", {
  id: "failure",
  name: "Wave 5 damaged",
  checkpoint: "wave_5",
  inputs: inputs.slice(0, 2)
});

assert.equal(success.frameCount, 4);
assert.equal(success.checkpointBank, 2);
assert.equal(routes.list("laser strike").length, 2, "multiple routes may target one checkpoint");
assert.deepEqual(expandRouteInputs(routes.get("laser strike", "success").inputRuns), inputs);
assert.equal(routes.setAutoRouteId("laser strike", "success"), "success");
assert.equal(routes.getAutoRouteId("laser strike"), "success");
routes.remove("laser strike", "success");
assert.equal(routes.getAutoRouteId("laser strike"), "", "deleting the automatic route clears it");
assert.equal(routes.list("laser strike").length, 1);

const legacy = routes.save("laser strike", {
  id: "legacy",
  checkpoint: "wave_5",
  inputs: []
});
assert.equal(legacy.checkpointBank, null, "old unbanked routes remain valid");

console.log("Development checkpoint routes PASS");
