#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const entryPath = resolve(root, "docs/agent-kit/README.md");
const soundSkillPath = resolve(root, "docs/agent-kit/skills/tiny-sound.md");
const graphicsSkillPath = resolve(root, "docs/agent-kit/skills/graphics-crt-zx0.md");
const comparisonPath = resolve(root, "docs/agent-kit/claude-toolbox-comparison-2026-11-08.md");
const lessonsPath = resolve(root, "docs/agent-kit/claude-toolbox-lessons-2026-11-08.md");
const zaiAuditPath = resolve(root, "docs/agent-kit/zai-small-model-audit-2026-11-08.md");
const cheatsheetPath = resolve(root, "docs/agent-kit/CHEATSHEET.md");
const manifestPath = resolve(root, "docs/agent-kit/manifest.json");

assert.ok(existsSync(entryPath), "missing agent-kit entry point");
assert.ok(existsSync(soundSkillPath), "missing Tiny Sound skill");
assert.ok(existsSync(graphicsSkillPath), "missing graphics/CRT/ZX0 skill");
assert.ok(existsSync(comparisonPath), "missing Claude toolbox comparison");
assert.ok(existsSync(lessonsPath), "missing deeper Claude toolbox lessons");
assert.ok(existsSync(zaiAuditPath), "missing Z.AI small-model audit");
assert.ok(existsSync(cheatsheetPath), "missing generated agent cheatsheet");
assert.ok(existsSync(manifestPath), "missing machine-readable agent-kit manifest");

const entry = readFileSync(entryPath, "utf8");
const soundSkill = readFileSync(soundSkillPath, "utf8");
const graphicsSkill = readFileSync(graphicsSkillPath, "utf8");
const comparison = readFileSync(comparisonPath, "utf8");
const lessons = readFileSync(lessonsPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

assert.match(entry, /skills\/tiny-sound\.md/, "entry point does not link the Tiny Sound skill");
assert.match(entry, /skills\/graphics-crt-zx0\.md/, "entry point does not link the graphics skill");
assert.match(entry, /claude-toolbox-comparison-2026-11-08\.md/, "entry point does not link the toolbox comparison");
assert.match(entry, /claude-toolbox-lessons-2026-11-08\.md/, "entry point does not link the deeper toolbox lessons");
assert.match(entry, /zai-small-model-audit-2026-11-08\.md/, "entry point does not link the Z.AI audit");
assert.match(entry, /CHEATSHEET\.md/, "entry point does not link the generated cheatsheet");
assert.match(entry, /manifest\.json/, "entry point does not link the machine-readable manifest");
assert.ok(entry.split(/\r?\n/).length <= 100, "agent-kit entry point is no longer compact");
assert.ok(soundSkill.split(/\r?\n/).length <= 180, "Tiny Sound skill is too large for focused context");
assert.ok(graphicsSkill.split(/\r?\n/).length <= 180, "graphics skill is too large for focused context");

for (const relativePath of [
  "studio/examples-src/commando-tiny-music-box.alexis",
  "studio/examples-src/lamplighter.alexis",
  "studio/examples-music-project-files.generated.js",
  "docs/audio-workflow.md",
  "tools/validate-sound-table.mjs",
  "examples/vendor/music-bank/commando-music-data.asm",
]) {
  assert.ok(existsSync(resolve(root, relativePath)), `missing canonical Tiny Sound reference: ${relativePath}`);
  assert.ok(soundSkill.includes(relativePath), `Tiny Sound skill no longer names reference: ${relativePath}`);
}

assert.match(soundSkill, /Flynn's Gold/i, "compact four-stream reference is missing");
assert.match(soundSkill, /Hassle Castle/i, "large four-stream integration reference is missing");
assert.match(soundSkill, /Raging Thunder/i, "two-stream counterexample is missing");
assert.match(soundSkill, /two Tiny Sound streams/i, "Raging Thunder channel status must remain explicit");
assert.match(soundSkill, /\$702B.*\$7035.*\$703F.*\$7049/s, "sound-area progression is missing");
assert.match(soundSkill, /real OS7 BIOS/i, "runtime validation must require the real OS7 BIOS");

for (const relativePath of [
  "docs/TMS9918A-CRT-OVERSCAN.md",
  "studio/examples-src/compressed-picture-demo.alexis",
  "studio/examples-src/amy-chess.alexis",
  "studio/examples-src/great-canadian-mystery.alexis",
  "tools/benchmark-bitmap-codec-corpus.mjs",
  "tools/optimize-tms9918-bitmap.mjs",
  "tools/test-zx0-vram-long-literal.mjs",
  "tools/test-tms9918-bitmap-optimization.mjs",
]) {
  assert.ok(existsSync(resolve(root, relativePath)), `missing canonical graphics reference: ${relativePath}`);
  assert.ok(graphicsSkill.includes(relativePath), `graphics skill no longer names reference: ${relativePath}`);
}

for (const relativePath of [
  "tools/amy-author-check.mjs",
  "tools/test-amy-author-check.mjs",
  "tools/amy-author-project-proof.mjs",
  "tools/test-amy-author-project-proof.mjs",
  "tools/amy-author-doctor.mjs",
  "tools/audit-agent-toolbox-equivalence.mjs",
  "tools/amy-author-visual-proof.mjs",
  "tools/amy-author-safe-area.mjs",
  "tools/test-amy-author-safe-area.mjs",
  "tools/amy-author-build.mjs",
  "tools/test-amy-author-build.mjs",
  "tools/amy-author-deliver.mjs",
  "tools/test-amy-author-deliver.mjs",
  "tools/test-amy-author-visual-proof.mjs",
  "tools/amy-author-editors-check.mjs",
  "tools/test-amy-author-editors-check.mjs",
  "tools/amy-author-new.mjs",
  "tools/test-amy-author-new.mjs",
  "tools/amy-author-project-check.mjs",
  "tools/test-amy-author-project-check.mjs",
  "tools/amy-author-metrics.mjs",
  "tools/test-amy-author-metrics.mjs",
  "tools/generate-agent-cheatsheet.mjs",
  "tools/test-agent-cheatsheet.mjs"
  ,"tools/amy-author-quality-check.mjs"
  ,"tools/test-amy-author-quality-check.mjs"
]) {
  assert.ok(existsSync(resolve(root, relativePath)), `missing author-check tool: ${relativePath}`);
}

assert.match(graphicsSkill, /columns 2 through 29/i, "CRT safe-area guidance is missing");
assert.match(graphicsSkill, /49,152 rendered color indexes/i, "pixel-equivalence contract is missing");
assert.match(comparison, /generated from a validated Amy Studio release/i, "toolbox compiler synchronization rule is missing");
assert.match(comparison, /toolbox workflow version.*embedded Amy compiler version.*rules\/skills manifest version/is, "three-version toolbox contract is missing");
assert.match(comparison, /PASS.*,.*WARN.*,.*FAIL.*,.*SKIP/is, "author-check result semantics are missing");
assert.match(lessons, /Hardware contract.*Compiler contract.*Historical workaround/is, "toolbox rules are not classified");
assert.match(lessons, /Human-paced bot.*cheap-strategy bot/is, "gameplay bot contracts are missing");
assert.match(lessons, /Recompiling every game.*promotion gate/is, "risk-selected QA guidance is missing");
assert.match(lessons, /retirement condition/i, "stale workaround retirement is missing");

assert.deepEqual(manifest.resultStates, ["PASS", "WARN", "FAIL", "SKIP"]);
assert.ok(manifest.ruleClasses.includes("historical-workaround"), "manifest cannot classify temporary workarounds");
assert.ok(manifest.qaProfiles.some((profile) => profile.id === "optimizer"), "optimizer QA profile is missing");
assert.ok(manifest.qaProfiles.some((profile) => profile.id === "substantial-game"), "gameplay QA profile is missing");
assert.equal(manifest.toolboxSync.rejectContradictoryWorkarounds, true, "stale toolbox rules are not rejected");
assert.ok(manifest.skills.some((skill) => skill.id === "production-polish"), "production polish skill is missing");

for (const skill of manifest.skills) {
  assert.ok(existsSync(resolve(root, skill.document)), `manifest skill is missing: ${skill.document}`);
  for (const example of skill.canonicalExamples) {
    assert.ok(existsSync(resolve(root, example)), `manifest example is missing: ${example}`);
  }
  for (const check of skill.focusedChecks) {
    assert.ok(existsSync(resolve(root, check)), `manifest check is missing: ${check}`);
  }
}
for (const path of Object.values(manifest.infrastructure || {})) {
  assert.ok(existsSync(resolve(root, path)), `manifest infrastructure is missing: ${path}`);
}

console.log("Amy agent kit: PASS (compact entry point, Tiny Sound, CRT and ZX0 references)");
