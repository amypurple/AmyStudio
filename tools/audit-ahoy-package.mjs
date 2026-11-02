#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const packageRoot = resolve(args[0] || join(root, "artifacts", "ahoy-package-2026-11-01", "ahoy"));
const profileIndex = args.indexOf("--profile");
const profile = profileIndex >= 0 ? args[profileIndex + 1] : "balanced";
const jobsIndex = args.indexOf("--jobs");
const jobs = Math.max(1, Number.parseInt(jobsIndex >= 0 ? args[jobsIndex + 1] : "4", 10));
const outputIndex = args.indexOf("--output");
const outputPath = resolve(outputIndex >= 0
  ? args[outputIndex + 1]
  : join(root, "build", "ahoy-package-audit", `audit-${profile}.json`));
const compilerRootIndex = args.indexOf("--compiler-root");
const compilerRoot = resolve(compilerRootIndex >= 0 ? args[compilerRootIndex + 1] : root);
const buildRoot = join(resolve(outputPath, ".."), "roms");

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function compile(task) {
  const romPath = join(buildRoot, `${task.folder}-${task.kind}.rom`);
  const asmPath = join(buildRoot, `${task.folder}-${task.kind}.asm`);
  return new Promise((done) => {
    let output = "";
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", task.sourcePath,
      "--rom", romPath,
      "--asm", asmPath,
      "--opt", profile
    ], { cwd: compilerRoot, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => done({ ...task, ok: false, error: error.message }));
    child.on("exit", async (code) => {
      if (code !== 0) {
        done({ ...task, ok: false, error: output.trim() });
        return;
      }
      const [built, shipped] = await Promise.all([
        readFile(romPath),
        task.kind === "shipped" ? readFile(task.shippedRomPath) : Promise.resolve(null)
      ]);
      done({
        ...task,
        ok: true,
        occupiedBytes: built.length,
        shippedBytes: shipped?.length ?? null,
        byteIdentical: shipped ? built.equals(shipped) : null,
        romPath
      });
    });
  });
}

await mkdir(buildRoot, { recursive: true });
const entries = (await readdir(packageRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .sort((a, b) => a.name.localeCompare(b.name));
const projects = [];
const tasks = [];
for (const entry of entries) {
  const directory = join(packageRoot, entry.name);
  const files = await readdir(directory);
  const sources = files.filter((file) => file.endsWith(".alexis"));
  const primary = sources.filter((file) => !file.endsWith("-noworkaround.alexis"));
  const natural = sources.filter((file) => file.endsWith("-noworkaround.alexis"));
  const roms = files.filter((file) => file.endsWith(".rom"));
  const screenshots = files.filter((file) => /\.(png|gif|jpe?g)$/i.test(file));
  const readmePath = join(directory, "README.md");
  const readme = await exists(readmePath) ? await readFile(readmePath, "utf8") : "";
  const sourceTexts = await Promise.all(sources.map((file) => readFile(join(directory, file), "utf8")));
  const markers = sourceTexts.flatMap((text, index) =>
    [...text.matchAll(/@@[A-Z0-9_]+@@/g)].map((match) => `${sources[index]}:${match[0]}`));
  projects.push({
    folder: entry.name,
    primarySources: primary,
    naturalSources: natural,
    roms,
    screenshots,
    markers,
    metadata: {
      author: /author|\bby\s+[A-Z]|credit/i.test(readme),
      issue: /issue|volume|published|Ahoy!\s+(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+)?19\d{2}/i.test(readme),
      controls: /controls?|joystick|\bstick\b|button|keypad/i.test(readme),
      changes: /changes|adaptation|colecovision/i.test(readme)
    }
  });
  if (primary.length === 1 && roms.length === 1 && markers.length === 0) {
    tasks.push({
      folder: entry.name,
      kind: "shipped",
      sourcePath: join(directory, primary[0]),
      shippedRomPath: join(directory, roms[0])
    });
  }
  for (const source of natural) {
    tasks.push({ folder: entry.name, kind: "natural", sourcePath: join(directory, source), shippedRomPath: null });
  }
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < tasks.length) {
    const index = cursor++;
    results[index] = await compile(tasks[index]);
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, () => worker()));

const failed = results.filter((item) => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  packageRoot,
  compilerRoot,
  profile,
  projects: projects.length,
  tasks: results.length,
  shipped: {
    attempted: results.filter((item) => item.kind === "shipped").length,
    passed: results.filter((item) => item.kind === "shipped" && item.ok).length,
    byteIdentical: results.filter((item) => item.kind === "shipped" && item.byteIdentical).length
  },
  natural: {
    attempted: results.filter((item) => item.kind === "natural").length,
    passed: results.filter((item) => item.kind === "natural" && item.ok).length
  },
  structuralFailures: projects.filter((item) =>
    item.primarySources.length !== 1 || item.roms.length !== 1 || item.screenshots.length < 1 ||
    item.markers.length > 0 || Object.values(item.metadata).some((value) => !value)),
  failures: failed.map(({ folder, kind, sourcePath, error }) => ({ folder, kind, sourcePath, error })),
  projectsDetail: projects,
  results
};
await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Ahoy package: ${report.projects} projects, ${report.tasks} compile tasks (${profile})`);
console.log(`Shipped: ${report.shipped.passed}/${report.shipped.attempted}; byte-identical: ${report.shipped.byteIdentical}`);
console.log(`Natural: ${report.natural.passed}/${report.natural.attempted}`);
console.log(`Structural warnings: ${report.structuralFailures.length}; compile failures: ${report.failures.length}`);
for (const item of report.failures) console.log(`FAIL ${item.folder}/${item.kind}: ${item.error.split(/\r?\n/)[0]}`);
console.log(outputPath);
