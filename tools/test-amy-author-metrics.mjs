#!/usr/bin/env node
import assert from "node:assert/strict";
import { evaluateMetrics } from "./amy-author-metrics.mjs";

const pondHopper = evaluateMetrics({
  metrics: { durationSeconds: 94, idleScore: 0, reachedLevel: 4 }
}, {
  durationSeconds: { min: 120, max: 480, severity: "FAIL" },
  idleScore: { max: 0, severity: "FAIL" },
  reachedLevel: { min: 3, severity: "WARN" }
});

assert.equal(pondHopper.verdict, "FAIL", "a value below its declared minimum must not pass");
assert.equal(pondHopper.results.find((item) => item.metric === "durationSeconds").state, "FAIL");
assert.equal(pondHopper.results.find((item) => item.metric === "idleScore").state, "PASS");

const warning = evaluateMetrics({ loop: { frames: 239 } }, {
  "loop.frames": { min: 240, severity: "WARN" }
});
assert.equal(warning.verdict, "WARN");

const missing = evaluateMetrics({}, { score: { min: 1 } });
assert.equal(missing.verdict, "FAIL", "missing required metrics must fail");

const exact = evaluateMetrics({ soundStopped: true, framePasses: 240 }, {
  soundStopped: { equals: true }, framePasses: { equals: 240 }
});
assert.equal(exact.verdict, "PASS", "equals must support boolean and numeric evidence");
assert.equal(evaluateMetrics({ soundStopped: false }, { soundStopped: { equals: true } }).verdict, "FAIL");

console.log("Amy author metrics: PASS (thresholds, warnings, nested metrics, missing values)");
