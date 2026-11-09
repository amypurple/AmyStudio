#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkQuality } from "./amy-author-quality-check.mjs";

const dir = mkdtempSync(resolve(tmpdir(), "amy-quality-"));
mkdirSync(resolve(dir, "build"));
writeFileSync(resolve(dir, "main.alexis"), "play song Theme once\n", "utf8");
const metrics = Object.fromEntries([
  "humanPacedRuns", "cheapStrategiesDefeated", "frameBudgetVerified",
  "runtimeGameplayVariantsObserved", "titleMusicLifecycleVerified", "soundLifecycleVerified",
  "humanInputHoldVerified", "minimumDecisionFrames"
].map((name) => [name, { min: 1 }]));
writeFileSync(resolve(dir, "expectations.json"), JSON.stringify(metrics), "utf8");
writeFileSync(resolve(dir, "visual-review.json"), JSON.stringify({ approved: true, strengths: ["coherent"], defectsConsidered: ["empty space"] }), "utf8");
writeFileSync(resolve(dir, "build", "visual-report.json"), JSON.stringify({ verdict: "PASS" }), "utf8");
writeFileSync(resolve(dir, "human-policy.mjs"), "export const chooseHumanInput = observation => observation.input || 0;", "utf8");
writeFileSync(resolve(dir, "rules-model.mjs"), "export const model = {};", "utf8");
writeFileSync(resolve(dir, "report.json"), JSON.stringify({
  runtimeGameplayVariantsObserved: 3,
  runtimeVariantSequences: [[0, 1, 2], [2, 1, 0], [1, 2, 1]]
}), "utf8");
for (const name of ["title", "how", "gameplay", "ending"]) writeFileSync(resolve(dir, "build", `${name}.png`), "x", "utf8");
const metadata = {
  source: "main.alexis", provenance: { classification: "original" },
  publication: { titleMusic: "required" },
  quality: Object.fromEntries([
    "audiovisualIdentity", "illustratedHowTo", "animatedStateChange",
    "gameplayVariation", "humanPacedBot", "cheapStrategyBots", "frameBudgetProof"
  ].map((name) => [name, true])),
  qa: { bot: { report: "report.json", expectations: "expectations.json", humanPolicy: "human-policy.mjs", rulesModel: "rules-model.mjs" } }
};
metadata.quality.controlModel = "edge-triggered";
writeFileSync(resolve(dir, "amy-author.json"), JSON.stringify(metadata), "utf8");
assert.equal(checkQuality(dir).verdict, "PASS");
metadata.publication.titleMusic = "documented-omission";
writeFileSync(resolve(dir, "amy-author.json"), JSON.stringify(metadata), "utf8");
assert.equal(checkQuality(dir).verdict, "FAIL");
metadata.publication.titleMusic = "required";
writeFileSync(resolve(dir, "report.json"), JSON.stringify({
  runtimeGameplayVariantsObserved: 3,
  runtimeVariantSequences: [[0, 1], [0, 1], [0, 1]]
}), "utf8");
writeFileSync(resolve(dir, "amy-author.json"), JSON.stringify(metadata), "utf8");
assert.equal(checkQuality(dir).verdict, "FAIL");
console.log("Amy author production quality: PASS (claims, metrics, audio, visual evidence)");
