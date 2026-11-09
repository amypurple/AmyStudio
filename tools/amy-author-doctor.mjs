#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function row(state, id, message) {
  return { state, id, message };
}

function hashFiles(paths) {
  const hash = createHash("sha256");
  for (const path of paths) hash.update(readFileSync(path));
  return hash.digest("hex");
}

export function inspectEnvironment(base = root) {
  const results = [];
  let compilerFingerprint = null;
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  results.push(nodeMajor >= 20
    ? row("PASS", "D01", `Node ${process.versions.node}.`)
    : row("FAIL", "D01", `Node 20+ required; found ${process.versions.node}.`));

  const manifestPath = resolve(base, "docs/agent-kit/manifest.json");
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    results.push(row("PASS", "D02", `Agent manifest schema ${manifest.schemaVersion}, kit ${manifest.kitVersion}.`));
  } catch (error) {
    results.push(row("FAIL", "D02", `Agent manifest unavailable or invalid: ${error.message}`));
  }

  const compilerFiles = [
    resolve(base, "tools/amyc.mjs"),
    resolve(base, "studio/core/compilerFrontend.js"),
    resolve(base, "studio/vendor/amyscvassembly/compilerCore.js"),
    resolve(base, "studio/vendor/amyscvassembly/optimizerCore.js")
  ];
  const missingCompiler = compilerFiles.filter((path) => !existsSync(path));
  if (!missingCompiler.length) compilerFingerprint = hashFiles(compilerFiles);
  results.push(missingCompiler.length
    ? row("FAIL", "D03", `Compiler files missing: ${missingCompiler.join(", ")}`)
    : row("PASS", "D03", `Compiler fingerprint ${compilerFingerprint.slice(0, 16)}.`));

  const bios = process.env.AMY_COLECO_BIOS || resolve(base, "studio/bios/colecovision.rom");
  if (!existsSync(bios)) results.push(row("WARN", "D04", "ColecoVision BIOS unavailable; BIOS-dependent runtime checks will be skipped."));
  else if (statSync(bios).size !== 8192) results.push(row("FAIL", "D04", `ColecoVision BIOS must be 8192 bytes; found ${statSync(bios).size}.`));
  else results.push(row("PASS", "D04", `ColecoVision BIOS available (${bios}).`));

  const gearFiles = [
    resolve(base, "studio/vendor/gearcoleco-test-core/gearcoleco-test-core.js"),
    resolve(base, "studio/vendor/gearcoleco-test-core/gearcoleco-test-core.wasm"),
    resolve(base, "studio/core/gearcolecoTestCore.js")
  ];
  const missingGear = gearFiles.filter((path) => !existsSync(path));
  results.push(missingGear.length
    ? row("FAIL", "D05", `GearColeco test core incomplete: ${missingGear.join(", ")}`)
    : row("PASS", "D05", "GearColeco JS, WASM, and Amy wrapper are available."));

  const authorTools = [
    "tools/amy-author-check.mjs",
    "tools/amy-author-project-proof.mjs",
    "tools/test-agent-kit.mjs",
    "tools/test-amy-author-check.mjs",
    "tools/test-amy-author-project-proof.mjs",
    "tools/validate-sound-table.mjs",
    "tools/amy-author-safe-area.mjs",
    "tools/amy-author-visual-proof.mjs",
    "tools/amy-author-build.mjs",
    "tools/amy-author-deliver.mjs"
  ];
  const missingTools = authorTools.filter((path) => !existsSync(resolve(base, path)));
  results.push(missingTools.length
    ? row("FAIL", "D06", `Authoring tools missing: ${missingTools.join(", ")}`)
    : row("PASS", "D06", `${authorTools.length} authoring checks available.`));

  const verdict = results.some((item) => item.state === "FAIL") ? "FAIL"
    : results.some((item) => item.state === "WARN") ? "WARN" : "PASS";
  return { kind: "amy-author-doctor", version: 1, verdict, compilerFingerprint, results };
}

function main() {
  const report = inspectEnvironment();
  console.log(`Amy author doctor: ${report.verdict}`);
  for (const item of report.results) console.log(`${item.state.padEnd(4)} ${item.id}: ${item.message}`);
  const jsonIndex = process.argv.indexOf("--json");
  if (jsonIndex >= 0 && process.argv[jsonIndex + 1]) writeFileSync(resolve(process.argv[jsonIndex + 1]), `${JSON.stringify(report, null, 2)}\n`);
  return report.verdict === "FAIL" ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exit(main());
