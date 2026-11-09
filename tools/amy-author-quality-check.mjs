#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

const requiredClaims = [
  "audiovisualIdentity", "illustratedHowTo", "animatedStateChange",
  "gameplayVariation", "humanPacedBot", "cheapStrategyBots", "frameBudgetProof"
];
const requiredMetrics = [
  "humanPacedRuns", "cheapStrategiesDefeated", "frameBudgetVerified",
  "runtimeGameplayVariantsObserved", "titleMusicLifecycleVerified", "soundLifecycleVerified",
  "humanInputHoldVerified", "minimumDecisionFrames"
];
const requiredFrames = ["title", "how", "gameplay", "ending"];

function filesBelow(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    return filesBelow(resolve(path, entry.name));
  });
}

function projectInfo(input) {
  const path = resolve(input);
  const directory = statSync(path).isDirectory() ? path : dirname(path);
  const metadataPath = statSync(path).isDirectory() ? resolve(path, "amy-author.json") : path;
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  const source = readFileSync(resolve(directory, metadata.source), "utf8");
  const expectationsPath = metadata?.qa?.bot?.expectations ? resolve(directory, metadata.qa.bot.expectations) : "";
  const expectations = expectationsPath && existsSync(expectationsPath) ? readFileSync(expectationsPath, "utf8") : "";
  const reportPath = metadata?.qa?.bot?.report ? resolve(directory, metadata.qa.bot.report) : "";
  const report = reportPath && existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
  return { directory, metadata, source, expectations, report, files: filesBelow(directory) };
}

export function checkQuality(input) {
  const p = projectInfo(input);
  const failures = [], warnings = [], passes = [];
  const substantial = p.metadata?.provenance?.classification !== "non-game";
  const quality = p.metadata.quality || {};
  if (substantial) {
    for (const claim of requiredClaims) {
      if (quality[claim] !== true) failures.push(`quality.${claim} must be true for a publishable game.`);
      else passes.push(`quality.${claim}`);
    }
    if (!["edge-triggered", "delayed-repeat", "continuous"].includes(quality.controlModel)) {
      failures.push("quality.controlModel must declare edge-triggered, delayed-repeat, or continuous input.");
    }
    if (p.metadata?.publication?.titleMusic !== "required") {
      failures.push("publication.titleMusic must be required; an omission does not prove the audio authoring path.");
    }
    if (!/\bplay song\s+[^\r\n]+\s+once\b/i.test(p.source)) failures.push("source has no one-shot title song.");
    for (const metric of requiredMetrics) {
      if (!new RegExp(`\\b${metric}\\b`).test(p.expectations)) failures.push(`bot expectations do not enforce ${metric}.`);
      else passes.push(`metric.${metric}`);
    }
    const runtimeVariants = p.report?.runtimeVariantSequences;
    const uniqueRuntimeVariants = Array.isArray(runtimeVariants)
      ? new Set(runtimeVariants.map((entry) => JSON.stringify(entry?.sequence ?? entry))).size
      : 0;
    if (!p.report) failures.push("qa.bot.report is missing or unreadable; production claims need executed ROM metrics.");
    else if (p.report.runtimeGameplayVariantsObserved < 3 || uniqueRuntimeVariants < 3) {
      failures.push("gameplay variation must contain at least three distinct sequences observed from separate ROM executions; rules-model scenarios do not count.");
    } else passes.push("runtime-gameplay-variation");
    const policyName = p.metadata?.qa?.bot?.humanPolicy;
    const modelName = p.metadata?.qa?.bot?.rulesModel;
    if (!policyName || !existsSync(resolve(p.directory, policyName))) failures.push("a separate qa.bot.humanPolicy module is required.");
    else {
      const policy = readFileSync(resolve(p.directory, policyName), "utf8");
      if (/\breadRam\b|AMY_UVAR_|gearcoleco|compiler symbol/i.test(policy)) failures.push("human policy accesses hidden emulator/compiler state; it must consume visible observations only.");
      else passes.push("screen-only-human-policy");
    }
    if (!modelName || !existsSync(resolve(p.directory, modelName))) failures.push("an independent qa.bot.rulesModel module is required.");
    else passes.push("independent-rules-model");
    const pngNames = p.files.filter((path) => extname(path).toLowerCase() === ".png").map((path) => basename(path).toLowerCase());
    for (const frame of requiredFrames) {
      if (!pngNames.some((name) => name.includes(frame))) warnings.push(`no ${frame} PNG evidence was found.`);
      else passes.push(`frame.${frame}`);
    }
    const reviewPath = p.files.find((path) => basename(path).toLowerCase() === "visual-review.json");
    if (!reviewPath) warnings.push("visual-review.json is missing.");
    else {
      const review = JSON.parse(readFileSync(reviewPath, "utf8"));
      if (review.approved !== true || !Array.isArray(review.strengths) || !Array.isArray(review.defectsConsidered)) {
        failures.push("visual review must declare approved, strengths[], and defectsConsidered[].");
      } else passes.push("visual-review");
    }
    const visualReportPath = p.files.find((path) => basename(path).toLowerCase() === "visual-report.json");
    if (!visualReportPath) warnings.push("generated visual-report.json is missing.");
    else {
      const visualReport = JSON.parse(readFileSync(visualReportPath, "utf8"));
      if (visualReport.verdict === "FAIL") failures.push("generated visual proof failed.");
      else if (visualReport.verdict === "WARN") warnings.push("generated visual proof still contains warnings requiring reviewer disposition.");
      else passes.push("generated-visual-proof");
    }
  }
  return { verdict: failures.length ? "FAIL" : warnings.length ? "WARN" : "PASS", failures, warnings, passes };
}

function main() {
  const input = process.argv[2];
  if (!input) { console.log("Usage: node tools/amy-author-quality-check.mjs <project-or-amy-author.json>"); return 2; }
  try {
    const report = checkQuality(input);
    for (const message of report.failures) console.log(`FAIL ${message}`);
    for (const message of report.warnings) console.log(`WARN ${message}`);
    console.log(`Amy author production quality: ${report.verdict}`);
    return report.verdict === "FAIL" ? 1 : 0;
  } catch (error) {
    console.error(`Amy author production quality: FAIL (${error.message})`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exitCode = main();
