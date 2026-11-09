#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateAuthorMetadata } from "./amy-author-project-check.mjs";

const valid = {
  source: "main.alexis",
  target: "colecovision-cartridge",
  optimization: "balanced",
  output: "build/game.rom",
  provenance: { classification: "original", author: "Test Author" },
  publication: {
    titleFlow: ["START", "HOW TO", "CREDITS"],
    titleMusic: "required-if-audio",
    verifySoundLifecycle: true
  },
  quality: {
    audiovisualIdentity: true,
    illustratedHowTo: true,
    animatedStateChange: true,
    gameplayVariation: true,
    humanPacedBot: true,
    cheapStrategyBots: true,
    frameBudgetProof: true,
    controlModel: "edge-triggered"
  },
  qa: {
    bot: { script: "bot.mjs", report: "metrics.json", expectations: "expectations.json", humanPolicy: "human-policy.mjs", rulesModel: "rules-model.mjs", args: ["--quick"] },
    visual: { config: "visual.json", humanReviewRequired: true }
  }
};
assert.equal(validateAuthorMetadata(valid).verdict, "PASS");
assert.equal(validateAuthorMetadata({ ...valid, target: "unknown" }).verdict, "FAIL");
assert.equal(validateAuthorMetadata({ ...valid, qa: { bot: { script: "bot.mjs", report: "metrics.json" } } }).verdict, "FAIL");
assert.equal(validateAuthorMetadata({ ...valid, provenance: { classification: "original", author: "REPLACE WITH AUTHOR" } }).verdict, "WARN");
console.log("Amy author project metadata: PASS (target, profile, provenance, bot metrics, visual review)");
