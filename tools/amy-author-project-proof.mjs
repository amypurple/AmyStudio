#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cartridgeLimit = 32768;

function filesIn(path) {
  return readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => resolve(path, entry.name));
}

export function identifyProject(inputPath) {
  const absolute = resolve(inputPath);
  if (!existsSync(absolute)) throw new Error(`Project not found: ${absolute}`);
  const projectDir = statSync(absolute).isDirectory() ? absolute : dirname(absolute);
  const sidecarPath = statSync(absolute).isFile()
    ? resolve(projectDir, `${basename(absolute, extname(absolute))}.amy-author.json`)
    : null;
  const metadataPath = sidecarPath && existsSync(sidecarPath) ? sidecarPath : resolve(projectDir, "amy-author.json");
  const metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, "utf8")) : {};
  let source = statSync(absolute).isFile() ? absolute : null;
  if (metadata.source) source = resolve(projectDir, metadata.source);
  if (!source) {
    const candidates = filesIn(projectDir).filter((path) => [".alexis", ".amy"].includes(extname(path).toLowerCase()));
    if (candidates.length !== 1) throw new Error(`Expected one Amy source or amy-author.json source; found ${candidates.length}.`);
    [source] = candidates;
  }
  if (!existsSync(source)) throw new Error(`Declared source not found: ${source}`);
  const target = metadata.target || "colecovision-cartridge";
  const shippedOutput = metadata.output
    ? resolve(projectDir, metadata.output)
    : resolve(projectDir, `${basename(source, extname(source))}${target.startsWith("adam-") ? ".bin" : ".rom"}`);
  return { projectDir, metadataPath: existsSync(metadataPath) ? metadataPath : null, metadata, source, target, shippedOutput };
}

export function evaluateProof(project, builtOutput, buildReport) {
  const results = [];
  const size = statSync(builtOutput).size;
  results.push({ state: "PASS", id: "compile", message: `Compiled ${basename(project.source)} (${size} bytes, ${project.target}).` });
  if (project.target === "colecovision-cartridge") {
    results.push(size <= cartridgeLimit
      ? { state: "PASS", id: "size", message: `ROM fits the 32K cartridge window (${size}/${cartridgeLimit}).` }
      : { state: "FAIL", id: "size", message: `ROM exceeds the 32K cartridge window (${size}/${cartridgeLimit}).` });
  } else {
    results.push({ state: "SKIP", id: "size", message: `32K cartridge limit does not apply to ${project.target}.` });
  }
  if (!existsSync(project.shippedOutput)) {
    results.push({ state: "SKIP", id: "byte-identity", message: `No shipped output to compare: ${project.shippedOutput}` });
  } else {
    const built = readFileSync(builtOutput);
    const shipped = readFileSync(project.shippedOutput);
    results.push(Buffer.compare(built, shipped) === 0
      ? { state: "PASS", id: "byte-identity", message: "Fresh output is byte-identical to the shipped output." }
      : { state: "FAIL", id: "byte-identity", message: `Fresh output differs from ${basename(project.shippedOutput)}.` });
  }
  if (buildReport?.ramUsage) {
    const used = Number(buildReport.ramUsage.usedBytes || 0) + Number(buildReport.ramUsage.staticAbi?.totalBytes || 0);
    results.push({ state: "PASS", id: "ram-report", message: `Compiler reported ${used} RAM bytes in use.` });
  }
  return results;
}

export function runProjectProof(inputPath, options = {}) {
  const project = identifyProject(inputPath);
  const optimization = options.optimization || project.metadata.optimization || "balanced";
  const temp = mkdtempSync(join(tmpdir(), "amy-author-proof-"));
  const output = resolve(temp, project.target.startsWith("adam-") ? "proof.bin" : "proof.rom");
  const asm = resolve(temp, "proof.asm");
  const reportPath = resolve(temp, "proof.json");
  const args = [
    "tools/amyc.mjs", project.source,
    "--project-dir", project.projectDir,
    "--output", output,
    "--asm", asm,
    "--report-json", reportPath,
    "--opt", optimization,
    "--target", project.target
  ];
  if (project.metadata.medium) args.push("--medium", project.metadata.medium);
  for (const hardware of project.metadata.hardware || []) args.push("--hardware", hardware);
  for (const define of project.metadata.defines || []) args.push("--define", define);
  const runner = options.runner || ((command, commandArgs) => spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    timeout: options.timeoutMs || 5 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024
  }));
  try {
    const run = runner(process.execPath, args, { project, output, asm, reportPath });
    if (run.error) return { ok: false, project, optimization, results: [{ state: ["EPERM", "EACCES"].includes(run.error.code) ? "SKIP" : "FAIL", id: "compile", message: run.error.message }] };
    if (run.status !== 0 || !existsSync(output)) {
      const detail = `${run.stdout || ""}${run.stderr || ""}`.trim().split(/\r?\n/).slice(-4).join(" | ");
      return { ok: false, project, optimization, results: [{ state: "FAIL", id: "compile", message: detail || `Compiler exited ${run.status}.` }] };
    }
    const buildReport = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
    const results = evaluateProof(project, output, buildReport);
    return { ok: !results.some((item) => item.state === "FAIL"), project, optimization, results };
  } finally {
    if (options.keepTemp) console.log(`Kept proof directory: ${temp}`);
    else rmSync(temp, { recursive: true, force: true });
  }
}

function main() {
  const input = process.argv[2];
  if (!input || ["-h", "--help"].includes(input)) {
    console.log("Usage: node tools/amy-author-project-proof.mjs <source-or-project> [--opt balanced] [--json report.json]");
    return input ? 0 : 2;
  }
  const optIndex = process.argv.indexOf("--opt");
  const result = runProjectProof(input, { optimization: optIndex >= 0 ? process.argv[optIndex + 1] : undefined });
  for (const item of result.results) console.log(`${item.state.padEnd(4)} ${item.id}: ${item.message}`);
  const jsonIndex = process.argv.indexOf("--json");
  if (jsonIndex >= 0 && process.argv[jsonIndex + 1]) {
    const serializable = { ...result, project: { ...result.project, metadata: result.project.metadata } };
    writeFileSync(resolve(process.argv[jsonIndex + 1]), `${JSON.stringify(serializable, null, 2)}\n`);
  }
  return result.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exit(main());
