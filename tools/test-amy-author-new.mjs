#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createAuthorProject, parseCliArgs } from "./amy-author-new.mjs";

const temporary = mkdtempSync(resolve(tmpdir(), "amy-author-new-"));
const destination = resolve(temporary, "small-game");
const result = createAuthorProject({ name: "small-game", title: "Small Game", destination, year: 2026 });
for (const file of result.files) assert.ok(existsSync(resolve(destination, file)), `missing scaffold file: ${file}`);
const source = readFileSync(resolve(destination, "main.alexis"), "utf8");
assert.match(source, /choose menu 1 to 3/);
assert.match(source, /HOW TO/);
assert.match(source, /CREDITS/);
assert.match(source, /pause until press and release sleep after 10 seconds/);
const metadata = JSON.parse(readFileSync(resolve(destination, "amy-author.json"), "utf8"));
assert.equal(metadata.target, "colecovision-cartridge");
assert.equal(metadata.qa.visual.humanReviewRequired, true);
assert.equal(metadata.qa.bot.script, "bot.mjs");
assert.equal(metadata.qa.bot.humanPolicy, "human-policy.mjs");
assert.equal(metadata.qa.bot.rulesModel, "rules-model.mjs");
assert.deepEqual(metadata.publication.titleFlow, ["START", "HOW TO", "CREDITS"]);
assert.equal(metadata.publication.titleMusic, "required");
assert.equal(metadata.publication.verifySoundLifecycle, true);
assert.equal(metadata.quality.humanPacedBot, true);
assert.equal(metadata.quality.cheapStrategyBots, true);
assert.equal(metadata.quality.controlModel, "edge-triggered");
const expectations = JSON.parse(readFileSync(resolve(destination, "bot-expectations.json"), "utf8"));
assert.equal(expectations.cheapStrategiesDefeated.min, 3);
assert.equal(expectations.soundLifecycleVerified.equals, true);
assert.equal(expectations.humanInputHoldVerified.equals, true);
assert.equal(expectations.minimumDecisionFrames.min, 12);
assert.match(readFileSync(resolve(destination, "research-notes.md"), "utf8"), /Confirmed rules/);
assert.match(readFileSync(resolve(destination, "quality-plan.md"), "utf8"), /Human-paced reaction delay/);
assert.equal(JSON.parse(readFileSync(resolve(destination, "visual-review.json"), "utf8")).approved, false);
assert.match(readFileSync(resolve(destination, "human-policy.mjs"), "utf8"), /screen-only player policy/);
assert.match(readFileSync(resolve(destination, "bot.mjs"), "utf8"), /TODO/);
assert.deepEqual(parseCliArgs(["sample", "--output", "somewhere", "--title", "Sample"]), {
  name: "sample", title: "Sample", destination: "somewhere"
});
assert.throws(() => parseCliArgs(["sample", "--unknown", "x"]), /unknown option/);
assert.throws(() => parseCliArgs(["sample", "--dest", "a", "--output", "b"]), /only one/);
assert.throws(() => createAuthorProject({ name: "small-game", destination }), /refusing to overwrite/);
assert.throws(() => createAuthorProject({ name: "Bad Name", destination: resolve(temporary, "bad") }), /name must/);
console.log("Amy author new: PASS (safe scaffold, metadata, visual review, no overwrite)");
