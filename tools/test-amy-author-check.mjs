#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const { buildAdapters, buildPlan, createReport, executeAdapters, inspectProject, selectProfiles } = await import("./amy-author-check.mjs");
const manifest = JSON.parse(readFileSync(resolve(root, "docs/agent-kit/manifest.json"), "utf8"));
const fixture = mkdtempSync(resolve(tmpdir(), "amy-author-check-"));
mkdirSync(resolve(fixture, "project"));
writeFileSync(resolve(fixture, "project", "main.alexis"), `' Original game by Test Author\ntile screen\nprint "START"\nprint "HOW TO"\nprint "CREDITS"\nplay song Theme once\nset sprite 0 at 20,20 pattern 1 color 15\n`, "utf8");
writeFileSync(resolve(fixture, "project", "editors.json"), `${JSON.stringify({ version: 1 })}\n`, "utf8");
writeFileSync(resolve(fixture, "project", "amy-author.json"), `${JSON.stringify({
  source: "main.alexis",
  optimization: "balanced",
  publication: { titleFlow: ["START", "HOW TO", "CREDITS"], titleMusic: "required-if-audio", verifySoundLifecycle: true },
  qa: { bot: { script: "bot.mjs", args: ["--quick"], report: "bot-metrics.json", expectations: "bot-expectations.json", humanPolicy: "human-policy.mjs", rulesModel: "rules-model.mjs" } }
})}\n`, "utf8");
writeFileSync(resolve(fixture, "project", "bot.mjs"), "console.log('bot pass');\n", "utf8");
writeFileSync(resolve(fixture, "project", "human-policy.mjs"), "export const chooseHumanInput = observation => observation.input || 0;\n", "utf8");
writeFileSync(resolve(fixture, "project", "rules-model.mjs"), "export const model = {};\n", "utf8");
writeFileSync(resolve(fixture, "project", "bot-metrics.json"), `${JSON.stringify({ metrics: { durationSeconds: 180 } })}\n`, "utf8");
writeFileSync(resolve(fixture, "project", "bot-expectations.json"), `${JSON.stringify({ durationSeconds: { min: 120, max: 480 }, titleMusicLifecycleVerified: { equals: true }, soundLifecycleVerified: { equals: true } })}\n`, "utf8");
const project = inspectProject(resolve(fixture, "project"));
const profiles = selectProfiles(manifest, [], project.tags, project);
const report = createReport(manifest, project, profiles);
assert.equal(report.kind, "amy-author-check");
assert.equal(report.verdict, "PASS");
assert.ok(report.tags.includes("sound"));
assert.ok(report.tags.includes("sprites"));
assert.ok(report.profiles.includes("runtime-abi"));
assert.ok(report.requiredEvidence.includes("focused-runtime-state"));
assert.ok(report.suggestedCommands.some((command) => command.includes("tools/amy-qa.mjs quick")));
assert.ok(report.results.some((item) => item.id === "project.editors" && item.state === "PASS"));

const adapters = buildAdapters(profiles, project.tags, project);
assert.ok(adapters.some((adapter) => adapter.id === "doctor"));
assert.ok(adapters.some((adapter) => adapter.id === "amy-qa-quick"));
assert.ok(adapters.some((adapter) => adapter.id === "project-proof" && !adapter.skip));
assert.ok(adapters.some((adapter) => adapter.id === "project-bot" && !adapter.skip));
assert.ok(adapters.some((adapter) => adapter.id === "project-metadata-schema" && !adapter.skip));
assert.ok(adapters.some((adapter) => adapter.id === "production-quality" && !adapter.skip));
assert.ok(adapters.some((adapter) => adapter.id === "editors-schema-1" && !adapter.skip));
assert.ok(adapters.some((adapter) => adapter.id === "project-bot-metrics" && !adapter.skip));
assert.ok(adapters.findIndex((adapter) => adapter.id === "project-bot-metrics") > adapters.findIndex((adapter) => adapter.id === "project-bot"));
assert.ok(adapters.some((adapter) => adapter.id === "sound-table" && adapter.skip));
const executions = executeAdapters(adapters, {
  runner(command, args, adapter) {
    return { status: 0, stdout: `${adapter.id} passed\n`, stderr: "" };
  }
});
assert.ok(executions.some((item) => item.id === "agent-kit" && item.state === "PASS"));
assert.ok(executions.some((item) => item.id === "sound-table" && item.state === "SKIP"));
const executedReport = createReport(manifest, project, profiles, executions);
assert.equal(executedReport.verdict, "PASS");
assert.ok(executedReport.results.some((item) => item.id === "adapter.amy-qa-quick" && item.evidence === "machine-approved"));

const blocked = executeAdapters([adapters[0]], {
  runner() {
    const error = new Error("blocked");
    error.code = "EPERM";
    return { status: null, error, stdout: "", stderr: "" };
  }
});
assert.equal(blocked[0].state, "SKIP");
assert.match(blocked[0].message, /run the suggested command directly/i);

const warned = executeAdapters([{ id: "warning", command: "test", args: [], warningPattern: "WARN value" }], {
  runner() { return { status: 0, stdout: "WARN value outside preference\n", stderr: "" }; }
});
assert.equal(warned[0].state, "WARN", "successful adapters must preserve declared warning output");

const invalid = buildPlan(manifest, ["not-a-profile"], new Set());
assert.ok(invalid.results.some((item) => item.id === "profile.not-a-profile" && item.state === "FAIL"));

console.log("Amy author check: PASS (risk routing, project inspection, JSON evidence plan)");
