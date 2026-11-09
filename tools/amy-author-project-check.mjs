#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const targets = new Set(["colecovision-cartridge", "colecovision-megacart", "adam-dsk", "adam-ddp", "adam-native"]);
const optimizations = new Set(["off", "safe", "balanced", "aggressive", "experimental"]);
const classifications = new Set(["faithful-port", "expanded-port", "reimagined-adaptation", "inspired", "original", "non-game"]);

export function validateAuthorMetadata(metadata) {
  const errors = [], warnings = [];
  if (typeof metadata?.source !== "string" || !metadata.source.trim()) errors.push("source must name the entry Amy file.");
  if (!targets.has(metadata?.target)) errors.push(`target must be one of: ${[...targets].join(", ")}.`);
  if (!optimizations.has(metadata?.optimization)) errors.push(`optimization must be one of: ${[...optimizations].join(", ")}.`);
  if (typeof metadata?.output !== "string" || !metadata.output.trim()) errors.push("output must name the shipped artifact.");
  if (!metadata?.provenance || typeof metadata.provenance !== "object") warnings.push("provenance is missing.");
  else {
    if (!classifications.has(metadata.provenance.classification)) errors.push(`provenance.classification must be one of: ${[...classifications].join(", ")}.`);
    if (typeof metadata.provenance.author !== "string" || !metadata.provenance.author.trim()) errors.push("provenance.author must be non-empty.");
    if (metadata.provenance.author === "REPLACE WITH AUTHOR") warnings.push("replace the scaffold author before publication.");
  }
  const bot = metadata?.qa?.bot;
  if (bot) {
    if (typeof bot.script !== "string" || !bot.script.trim()) errors.push("qa.bot.script must name the bot.");
    if (Boolean(bot.report) !== Boolean(bot.expectations)) errors.push("qa.bot.report and qa.bot.expectations must be declared together.");
    if (bot.args && !Array.isArray(bot.args)) errors.push("qa.bot.args must be an array.");
    if (typeof bot.humanPolicy !== "string" || !bot.humanPolicy.trim()) errors.push("qa.bot.humanPolicy must name a pure screen-only policy module.");
    if (typeof bot.rulesModel !== "string" || !bot.rulesModel.trim()) errors.push("qa.bot.rulesModel must name an independent rules model.");
  }
  const visual = metadata?.qa?.visual;
  if (visual) {
    if (typeof visual.config !== "string" || !visual.config.trim()) errors.push("qa.visual.config must name the visual checkpoint file.");
    if (visual.humanReviewRequired !== true) errors.push("qa.visual.humanReviewRequired must be true.");
  }
  const publication = metadata?.publication;
  if (!publication) warnings.push("publication contract is missing.");
  else {
    const flow = publication.titleFlow;
    if (!Array.isArray(flow) || !["START", "HOW TO", "CREDITS"].every((entry) => flow.includes(entry))) {
      errors.push("publication.titleFlow must include START, HOW TO, and CREDITS, or the project must document an explicit omission.");
    }
    if (!["required", "required-if-audio", "documented-omission"].includes(publication.titleMusic)) {
      errors.push("publication.titleMusic must be required, required-if-audio, or documented-omission.");
    }
    if (publication.verifySoundLifecycle !== true) errors.push("publication.verifySoundLifecycle must be true.");
  }
  const quality = metadata?.quality;
  const qualityClaims = ["audiovisualIdentity", "illustratedHowTo", "animatedStateChange", "gameplayVariation", "humanPacedBot", "cheapStrategyBots", "frameBudgetProof"];
  if (!quality) warnings.push("production quality contract is missing.");
  else for (const claim of qualityClaims) {
    if (quality[claim] !== true) errors.push(`quality.${claim} must be true for a publishable game.`);
  }
  if (quality && !["edge-triggered", "delayed-repeat", "continuous"].includes(quality.controlModel)) {
    errors.push("quality.controlModel must be edge-triggered, delayed-repeat, or continuous.");
  }
  return { verdict: errors.length ? "FAIL" : warnings.length ? "WARN" : "PASS", errors, warnings };
}

function main() {
  const path = process.argv[2];
  if (!path) { console.log("Usage: node tools/amy-author-project-check.mjs <amy-author.json>"); return 2; }
  let metadata;
  try { metadata = JSON.parse(readFileSync(resolve(path), "utf8")); }
  catch (error) { console.error(`FAIL invalid author metadata JSON: ${error.message}`); return 1; }
  const report = validateAuthorMetadata(metadata);
  for (const message of report.errors) console.log(`FAIL ${message}`);
  for (const message of report.warnings) console.log(`WARN ${message}`);
  console.log(`Amy author project metadata: ${report.verdict}`);
  return report.verdict === "FAIL" ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exitCode = main();
