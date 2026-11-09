#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runDelivery } from "./amy-author-deliver.mjs";

const temp = mkdtempSync(resolve(tmpdir(), "amy-author-deliver-test-"));
const project = resolve(temp, "project");
mkdirSync(project);
mkdirSync(resolve(project, "src"));
writeFileSync(resolve(project, "main.alexis"), "include amy \"@project/src/player.amy\"\ntile screen\n");
writeFileSync(resolve(project, "src", "player.amy"), "u8 PlayerX = 0\n");
writeFileSync(resolve(project, "editors.json"), "{}\n");
writeFileSync(resolve(project, "main.rom"), Buffer.from([0x55, 0xaa]));
writeFileSync(resolve(project, "amy-author.json"), `${JSON.stringify({ source: "main.alexis", output: "main.rom", deliveryFiles: ["editors.json"], provenance: { classification: "original" }, qa: { bot: { script: "bot.mjs" }, visual: { config: "visual.json", output: "visual", humanReviewRequired: true } } })}\n`);
writeFileSync(resolve(project, "bot.mjs"), "console.log('pass')\n");
writeFileSync(resolve(project, "visual.json"), "{}\n");
mkdirSync(resolve(project, "visual"));
writeFileSync(resolve(project, "visual", "title.png"), Buffer.from([1, 2, 3]));
writeFileSync(resolve(project, "visual", "visual-report.json"), "{}\n");
const report = resolve(project, "author-report.json");
writeFileSync(report, `${JSON.stringify({ kind: "amy-author-check", verdict: "PASS", executions: [{ id: "doctor", state: "PASS" }, { id: "project-proof", state: "PASS" }, { id: "production-quality", state: "PASS" }, { id: "project-bot", state: "PASS" }, { id: "project-bot-metrics", state: "PASS" }, { id: "visual-proof", state: "PASS" }] })}\n`);

assert.throws(() => runDelivery(project, { report, output: resolve(temp, "rejected") }), /human approval/);
const delivered = runDelivery(project, { report, output: resolve(temp, "delivery"), approveVisual: true });
assert.equal(delivered.ok, true);
assert.ok(existsSync(resolve(delivered.output, "main.rom")));
assert.ok(existsSync(resolve(delivered.output, "source", "main.alexis")));
assert.ok(existsSync(resolve(delivered.output, "source", "src", "player.amy")));
assert.ok(existsSync(resolve(delivered.output, "source", "editors.json")));
assert.ok(existsSync(resolve(delivered.output, "evidence", "visual", "title.png")));
const manifest = JSON.parse(readFileSync(resolve(delivered.output, "DELIVERY.json"), "utf8"));
assert.equal(manifest.visualHumanApproved, true);
assert.ok(manifest.files.some((item) => item.file === "source/main.alexis" && item.sha256));
console.log("Amy author delivery: PASS (source, ROM, evidence, hashes, human visual approval)");
