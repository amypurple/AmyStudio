#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const matrix = JSON.parse(readFileSync(resolve(root, "docs/agent-kit/tool-equivalence.json"), "utf8"));
const allowed = new Set(["READY", "PARTIAL", "MISSING"]);
const ids = new Set();
for (const check of matrix.checks) {
  assert.ok(check.id && !ids.has(check.id), `duplicate or missing check id: ${check.id}`);
  ids.add(check.id);
  assert.ok(allowed.has(check.status), `${check.id}: invalid status ${check.status}`);
  for (const path of check.amy || []) assert.ok(existsSync(resolve(root, path)), `${check.id}: missing Amy equivalent ${path}`);
  if (check.status !== "READY") assert.ok(check.gap, `${check.id}: ${check.status} needs an explicit gap`);
}
for (const required of ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "deliver"]) {
  assert.ok(ids.has(required), `missing Claude-equivalent row ${required}`);
}
for (const required of ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11"]) {
  assert.ok(ids.has(required), `missing production-quality row ${required}`);
}
const counts = Object.fromEntries([...allowed].map((status) => [status, matrix.checks.filter((item) => item.status === status).length]));
console.log(`Amy/Claude toolbox equivalence: PASS (${counts.READY} ready, ${counts.PARTIAL} partial, ${counts.MISSING} missing)`);
for (const item of matrix.checks.filter((check) => check.status !== "READY")) console.log(`${item.status.padEnd(7)} ${item.id}: ${item.gap}`);
