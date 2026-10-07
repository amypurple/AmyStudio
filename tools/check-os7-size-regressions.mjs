#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const root = resolve(import.meta.dirname, "..");
const auditPath = resolve(root, option("--audit", "build/audits/completion-plan-current.json"));
const baselinePath = resolve(root, option("--baseline", "tools/os7-size-baseline.json"));
const reportOption = option("--report", "");
const reportPath = reportOption ? resolve(root, reportOption) : null;
const audit = JSON.parse(readFileSync(auditPath, "utf8"));
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const measured = new Map((audit.examples || []).map((entry) => [entry.id, entry]));
const rows = [];
let failures = 0;

for (const [id, expected] of Object.entries(baseline.examples || {})) {
  const actual = measured.get(id);
  let status = "PASS";
  let bytes = null;
  let delta = null;
  if (!actual || actual.delegated || !Number.isInteger(actual.romBytes)) {
    status = "MISSING";
    failures += 1;
  } else {
    bytes = actual.romBytes;
    delta = bytes - expected.maxRomBytes;
    if (delta > 0) {
      status = "GROWTH";
      failures += 1;
    } else if (delta < 0) status = "SMALLER";
  }
  rows.push({ id, role: expected.role || "", maximum: expected.maxRomBytes, bytes, delta, status });
}

const lines = [
  "# OS7 Size Regression Report",
  "",
  `Optimization: ${audit.optimization || "unknown"}`,
  `Baseline: ${baselinePath}`,
  `Audit: ${auditPath}`,
  "",
  "| Example | Role | Maximum | Current | Delta | Status |",
  "|---|---|---:|---:|---:|---|",
  ...rows.map((row) => `| ${row.id} | ${row.role} | ${row.maximum} | ${row.bytes ?? "-"} | ${row.delta == null ? "-" : (row.delta > 0 ? `+${row.delta}` : row.delta)} | ${row.status} |`),
  "",
  failures ? `FAIL: ${failures} OS7 size regression(s).` : "PASS: no OS7 size regressions."
];
const report = `${lines.join("\n")}\n`;
if (reportPath) writeFileSync(reportPath, report, "utf8");
process.stdout.write(report);
process.exit(failures ? 1 : 0);
