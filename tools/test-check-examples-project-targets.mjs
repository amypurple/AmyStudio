#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const result = spawnSync(process.execPath, [
  resolve(root, "tools", "check-examples.mjs"),
  "--only", "megacart-bank-demo",
  "--assemble"
], { cwd: root, encoding: "utf8" });

assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /Results: 1 passed, 0 failed out of 1 examples\./);
assert.match(result.stdout, /ROMs: 0 assembled, 0 total bytes/);
assert.match(result.stdout, /Projects: 1 delegated to target-specific build\/runtime validators\./);
assert.doesNotMatch(result.stdout, /Invalid expression|ROM assembly failed/);

console.log("PASS project-form examples are not misassembled as flat ROMs");
