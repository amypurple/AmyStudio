#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createExamplePickerHelpers } from "../studio/core/examplePicker.js";

const root = resolve(import.meta.dirname, "..");
const index = JSON.parse(readFileSync(resolve(root, "studio/examples-src/index.json"), "utf8"));
const ahoy = index.filter((entry) => (entry.tags || []).some((tag) => tag === "ahoy" || tag === "ahoy!"));

assert.ok(ahoy.length > 0, "expected at least one Ahoy! project");
for (const entry of ahoy) {
  assert.match(entry.detail || "", /Ahoy!/i, `${entry.id}: detail must identify Ahoy!`);
  assert.match(entry.label || "", /19\d{2}/, `${entry.id}: label must expose its publication date`);
}

const generated = await import("../studio/examples-index.generated.js?ahoy-metadata-test");
const generatedAhoy = generated.exampleManifest.filter((entry) => (entry.tags || []).includes("ahoy!"));
assert.equal(generatedAhoy.length, ahoy.length, "generated Ahoy! directory must match index.json");
assert.ok(generatedAhoy.every((entry) => entry.originLabel), "every Ahoy! entry must expose its origin classification");
assert.equal(generated.exampleManifest.filter((entry) => (entry.tags || []).includes("ahoy")).length, 0,
  "legacy ahoy tag must normalize to ahoy!");

const detail = { textContent: "" };
const meta = { textContent: "" };
const picker = createExamplePickerHelpers({
  els: { exampleDetail: detail, exampleMeta: meta, currentExampleSummary: { textContent: "" } },
  exampleManifest: generated.exampleManifest,
  getActiveExampleId: () => generatedAhoy[0].id,
  getManifestLabels: () => [],
  getExampleManifestById: (id) => generated.exampleManifest.find((entry) => entry.id === id),
  getExampleCategoryFilter: () => "all",
  getExampleTagFilter: () => "all",
  getExampleSearchFilter: () => ""
});
picker.renderExampleMeta(generatedAhoy[0].id);
assert.match(meta.textContent, /Publication: Ahoy!/);
assert.doesNotMatch(meta.textContent, /Tags:.*ahoy/i);

console.log(`Ahoy example-browser metadata: PASS (${ahoy.length} projects)`);
