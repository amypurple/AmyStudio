#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const missingExecutable = resolve(root, "build", "missing-node-for-feature-matrix.exe");
const result = spawnSync(process.execPath, [
  resolve(root, "tools", "amy-feature-matrix.mjs"),
  "--only",
  "test-expression-fail-closed.mjs"
], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, AMY_TEST_NODE: missingExecutable }
});

assert.notEqual(result.status, 0, "a child launch failure must fail the feature matrix");
assert.match(result.stderr, /could not start:/, "the launch failure must be identified explicitly");
assert.doesNotMatch(result.stdout, /"passed": true/, "a failed launch must not produce a passing summary");

console.log("PASS feature matrix reports child launch failures and exits nonzero");
