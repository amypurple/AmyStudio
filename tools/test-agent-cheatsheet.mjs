#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderCheatsheet } from "./generate-agent-cheatsheet.mjs";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "docs/agent-kit/manifest.json"), "utf8"));
const current = readFileSync(resolve(root, "docs/agent-kit/CHEATSHEET.md"), "utf8");
assert.equal(current, renderCheatsheet(manifest), "CHEATSHEET.md is stale; regenerate it from the manifest");
assert.match(current, /metric outside a declared threshold.*never `PASS`/i);
assert.match(current, /generated screenshot is not human visual approval/i);
assert.match(current, /one-shot title cue/i);
assert.match(current, /project-focused checks/i);
assert.match(current, /production polish evidence/i);
assert.ok(current.split(/\r?\n/).length < 80, "small-model cheatsheet must stay compact");
console.log("Amy agent cheatsheet: PASS (generated, current, compact)");
