#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const quickTests = [
  "test-expression-fail-closed.mjs",
  "test-array-store-layout-rom.mjs",
  "test-global-initializers-rom.mjs",
  "test-overlay-layout-rom.mjs",
  "test-controller-backend-selection-rom.mjs",
  "test-optimizer-indexed-immediate-a-liveness.mjs",
  "test-optimizer-djnz-reachability.mjs",
  "test-megalz-codec.mjs",
  "test-megalz-vram-rom.mjs",
  "test-exomizer2-codec.mjs",
  "test-exomizer2-vram-rom.mjs",
  "test-internal-compiler-single-pass.mjs"
];

function fail(message) {
  console.error(message);
  process.exit(2);
}

function run(args) {
  console.log(`\n> node ${args.join(" ")}`);
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function valueAfter(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function readReport(path) {
  const report = JSON.parse(readFileSync(resolve(root, path), "utf8"));
  if (report.kind !== "amy-qa-measurement" || !report.profiles) fail(`Invalid Amy QA report: ${path}`);
  return report;
}

function ramBytes(row) {
  return Number(row?.ramUsage?.usedBytes || 0) + Number(row?.ramUsage?.staticAbi?.totalBytes || 0);
}

function measure() {
  const output = resolve(root, valueAfter("--output", "build/amy-qa-measurement.json"));
  const selected = valueAfter("--profiles", profiles.join(",")).split(",").map((item) => item.trim()).filter(Boolean);
  for (const profile of selected) if (!profiles.includes(profile)) fail(`Unknown optimization profile: ${profile}`);
  mkdirSync(dirname(output), { recursive: true });
  const measured = {};
  for (const profile of selected) {
    const audit = resolve(dirname(output), `.amy-qa-${profile}.json`);
    run(["tools/check-examples.mjs", "--assemble", "--optimization", profile, "--audit-json", audit]);
    const raw = JSON.parse(readFileSync(audit, "utf8"));
    measured[profile] = raw.examples.map(({ id, ok, romBytes, ramUsage, optimizedAsmSha256 }) => ({
      id, ok, romBytes, ramUsage, optimizedAsmSha256
    }));
  }
  writeFileSync(output, `${JSON.stringify({ kind: "amy-qa-measurement", version: 1, profiles: measured }, null, 2)}\n`);
  console.log(`\nDeterministic measurement: ${output}`);
}

function compare() {
  const beforePath = valueAfter("--before");
  const afterPath = valueAfter("--after");
  if (!beforePath || !afterPath) fail("compare requires --before and --after.");
  const before = readReport(beforePath);
  const after = readReport(afterPath);
  let grew = false;
  for (const profile of profiles) {
    if (!before.profiles[profile] || !after.profiles[profile]) continue;
    const oldRows = new Map(before.profiles[profile].map((row) => [row.id, row]));
    const newRows = new Map(after.profiles[profile].map((row) => [row.id, row]));
    const oldTotal = [...oldRows.values()].reduce((sum, row) => sum + row.romBytes, 0);
    const newTotal = [...newRows.values()].reduce((sum, row) => sum + row.romBytes, 0);
    const changed = [...newRows.values()].filter((row) => oldRows.get(row.id)?.optimizedAsmSha256 !== row.optimizedAsmSha256).length;
    const growth = [...newRows.values()].filter((row) => oldRows.has(row.id) && row.romBytes > oldRows.get(row.id).romBytes);
    const ramChanged = [...newRows.values()].filter((row) => oldRows.has(row.id) && ramBytes(row) !== ramBytes(oldRows.get(row.id)));
    const added = [...newRows.keys()].filter((id) => !oldRows.has(id));
    const removed = [...oldRows.keys()].filter((id) => !newRows.has(id));
    grew ||= growth.length > 0;
    console.log(`${profile.padEnd(12)} ${String(newTotal - oldTotal).padStart(7)} bytes; ${changed} ASM; ${ramChanged.length} RAM; ${growth.length} ROMs grew; +${added.length}/-${removed.length} examples`);
    for (const row of growth.slice(0, 10)) console.log(`  +${row.romBytes - oldRows.get(row.id).romBytes} ${row.id}`);
    for (const row of ramChanged.slice(0, 10)) console.log(`  RAM ${ramBytes(oldRows.get(row.id))} -> ${ramBytes(row)} ${row.id}`);
  }
  if (process.argv.includes("--require-no-growth") && grew) process.exit(1);
}

const command = process.argv[2] || "help";
if (command === "quick") {
  run(["tools/check-examples.mjs"]);
  run(["tools/amy-feature-matrix.mjs", "--only", quickTests.join(",")]);
} else if (command === "full") {
  run(["tools/amy-feature-matrix.mjs", "--full"]);
} else if (command === "runtime") {
  run(["tools/run-rom-tests.mjs", "--optimization", valueAfter("--profile", "balanced")]);
} else if (command === "measure") {
  measure();
} else if (command === "compare") {
  compare();
} else if (command === "help") {
  console.log(`Amy deterministic QA\n\n  node tools/amy-qa.mjs quick\n  node tools/amy-qa.mjs full\n  node tools/amy-qa.mjs runtime [--profile balanced]\n  node tools/amy-qa.mjs measure [--profiles balanced,aggressive] [--output build/before.json]\n  node tools/amy-qa.mjs compare --before build/before.json --after build/after.json [--require-no-growth]`);
} else {
  fail(`Unknown Amy QA command: ${command}`);
}
