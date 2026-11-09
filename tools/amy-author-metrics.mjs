#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function valueAt(object, path) {
  return String(path).split(".").reduce((value, key) => value?.[key], object);
}

export function evaluateMetrics(report, expectations) {
  const metrics = report.metrics || report;
  const results = [];
  for (const [metric, rule] of Object.entries(expectations || {})) {
    const value = valueAt(metrics, metric);
    const severity = String(rule.severity || "FAIL").toUpperCase();
    if (value === undefined || value === null) {
      results.push({ state: severity, metric, value, message: `${metric} is missing.` });
      continue;
    }
    const failures = [];
    if (Object.hasOwn(rule, "equals") && value !== rule.equals) failures.push(`not equal to ${JSON.stringify(rule.equals)}`);
    if ((Number.isFinite(rule.min) || Number.isFinite(rule.max)) && !Number.isFinite(value)) failures.push("not numeric");
    if (Number.isFinite(rule.min) && value < rule.min) failures.push(`below ${rule.min}`);
    if (Number.isFinite(rule.max) && value > rule.max) failures.push(`above ${rule.max}`);
    if (Array.isArray(rule.oneOf) && !rule.oneOf.includes(value)) failures.push(`not one of ${rule.oneOf.join(", ")}`);
    results.push({
      state: failures.length ? severity : "PASS",
      metric,
      value,
      message: failures.length ? `${metric}=${value} is ${failures.join(" and ")}.` : `${metric}=${value} meets its expectation.`
    });
  }
  const rank = { PASS: 0, WARN: 1, FAIL: 2 };
  const verdict = results.reduce((worst, item) => rank[item.state] > rank[worst] ? item.state : worst, "PASS");
  return { verdict, results };
}

function main() {
  const reportPath = resolve(option("--report"));
  const expectationsPath = resolve(option("--expectations"));
  if (!option("--report") || !option("--expectations")) {
    console.error("Usage: node tools/amy-author-metrics.mjs --report metrics.json --expectations expectations.json");
    return 2;
  }
  if (!existsSync(reportPath) || !existsSync(expectationsPath)) {
    console.error(`FAIL metrics input missing: ${!existsSync(reportPath) ? reportPath : expectationsPath}`);
    return 2;
  }
  const evaluation = evaluateMetrics(
    JSON.parse(readFileSync(reportPath, "utf8")),
    JSON.parse(readFileSync(expectationsPath, "utf8"))
  );
  for (const item of evaluation.results) console.log(`${item.state.padEnd(4)} ${item.message}`);
  console.log(`Amy author metrics: ${evaluation.verdict}`);
  return evaluation.verdict === "FAIL" ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exitCode = main();
