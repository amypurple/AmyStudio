#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "docs/agent-kit/manifest.json");
// A skipped check is visible evidence, not a project failure or warning.
const resultOrder = { PASS: 0, SKIP: 0, WARN: 1, FAIL: 2 };

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function has(name) {
  return process.argv.includes(name);
}

function result(state, id, message, detail = {}) {
  return { state, id, message, ...detail };
}

function quoteArg(value) {
  const text = String(value);
  return /\s/.test(text) ? `"${text.replaceAll('"', '\\"')}"` : text;
}

function listFiles(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  const files = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if ([".git", "build", "node_modules"].includes(entry.name)) continue;
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(child));
    else files.push(child);
  }
  return files;
}

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

export function inferTags(files, text) {
  const tags = new Set();
  const lower = text.toLowerCase();
  if (/\b(play song|play sound|sound table|tiny sound|dsound)\b/.test(lower)) tags.add("sound");
  if (/\b(graphics screen|mode 2 screen|tile screen|zx0|compressed)\b/.test(lower)) tags.add("graphics-ii");
  if (/\b(set sprite|sprite count|metasprite)\b/.test(lower)) tags.add("sprites");
  if (/\b(wait nmi|nmi|vblank|interrupt)\b/.test(lower)) tags.add("nmi-timing");
  if (/\b(bcd|digits\$|width\$)\b/.test(lower)) tags.add("bcd");
  if (/\b(eos|adam|dsk|ddp)\b/.test(lower)) tags.add("adam-eos");
  if (/\b(asm\s*\{|call asm|inline asm)\b/.test(lower)) tags.add("optimizer-sensitive-asm");
  if (/\b(zx0|dan[123]|pletter|aplib|exomizer|compress)\b/.test(lower)) tags.add("codecs");
  if (files.some((path) => basename(path).toLowerCase() === "editors.json")) tags.add("editors-json");
  return tags;
}

export function inspectProject(projectPath) {
  if (!projectPath) return { files: [], text: "", tags: new Set(), results: [] };
  const absolute = resolve(process.cwd(), projectPath);
  if (!existsSync(absolute)) {
    return { files: [], text: "", tags: new Set(), results: [result("FAIL", "project.exists", `Project not found: ${absolute}`)] };
  }

  const files = listFiles(absolute);
  if (statSync(absolute).isFile()) {
    const sidecar = resolve(dirname(absolute), `${basename(absolute, extname(absolute))}.amy-author.json`);
    if (existsSync(sidecar)) files.push(sidecar);
    const editors = resolve(dirname(absolute), `${basename(absolute, extname(absolute))}.editors.json`);
    if (existsSync(editors)) files.push(editors);
  }
  const sourceFiles = files.filter((path) => [".alexis", ".amy"].includes(extname(path).toLowerCase()) || path.endsWith(".amy.json"));
  const sourceText = sourceFiles.map(readText).join("\n");
  const results = [result("PASS", "project.exists", `Inspected ${sourceFiles.length} Amy source file(s).`, { path: absolute })];
  if (!sourceFiles.length) results.push(result("FAIL", "project.sources", "No .alexis, .amy, or .amy.json source was found."));

  const sourceSidecarName = statSync(absolute).isFile() ? `${basename(absolute, extname(absolute))}.amy-author.json`.toLowerCase() : null;
  const metadataFile = files.find((path) => {
    const name = basename(path).toLowerCase();
    return name === "amy-author.json" || name === sourceSidecarName;
  });
  let authorMetadata = {};
  if (metadataFile) {
    try {
      authorMetadata = JSON.parse(readFileSync(metadataFile, "utf8"));
      results.push(result("PASS", "project.author-metadata", `Valid ${basename(metadataFile)} project metadata.`));
    } catch (error) {
      results.push(result("FAIL", "project.author-metadata", `Invalid amy-author.json: ${error.message}`));
    }
  } else {
    results.push(result("SKIP", "project.author-metadata", "No amy-author.json; simple-project defaults apply."));
  }

  const editorFiles = files.filter((path) => basename(path).toLowerCase() === "editors.json" || path.endsWith(".editors.json"));
  if (!editorFiles.length) {
    results.push(result("SKIP", "project.editors", "No editors.json is declared for this project."));
  } else {
    for (const path of editorFiles) {
      try {
        JSON.parse(readFileSync(path, "utf8"));
        results.push(result("PASS", "project.editors", `Valid editor metadata: ${basename(path)}`));
      } catch (error) {
        results.push(result("FAIL", "project.editors", `Invalid ${basename(path)}: ${error.message}`));
      }
    }
  }

  const provenanceText = `${sourceText}\n${JSON.stringify(authorMetadata)}`;
  const hasProvenance = /\b(original|adapted|adaptation|port|reimag|inspired|compute!|gazette|ahoy!|author|published)\b/i.test(provenanceText);
  results.push(hasProvenance
    ? result("PASS", "project.provenance", "Source contains provenance or adaptation classification.")
    : result("WARN", "project.provenance", "No provenance or adaptation classification was detected in source comments."));

  const publication = authorMetadata.publication;
  if (publication) {
    for (const label of publication.titleFlow || []) {
      results.push(new RegExp(`\\b${label.split(/\\s+/).join("\\s+")}\\b`, "i").test(sourceText)
        ? result("PASS", `project.title-flow.${label.toLowerCase().replaceAll(" ", "-")}`, `${label} is present in the source.`)
        : result("WARN", `project.title-flow.${label.toLowerCase().replaceAll(" ", "-")}`, `${label} is declared by the publication contract but was not found in source text.`));
    }
    const usesAudio = /\b(play song|play sound|sound table|tiny sound|dsound)\b/i.test(sourceText);
    const requiresTitleMusic = publication.titleMusic === "required" || (publication.titleMusic === "required-if-audio" && usesAudio);
    if (requiresTitleMusic) {
      results.push(/\bplay song\s+[^\r\n]+\s+once\b/i.test(sourceText)
        ? result("PASS", "project.title-music-once", "A one-shot title song is present.")
        : result("WARN", "project.title-music-once", "Audio is used but no `play song ... once` title cue was detected."));
    }
    const expectationsPath = authorMetadata?.qa?.bot?.expectations;
    if (usesAudio && publication.verifySoundLifecycle === true && expectationsPath) {
      const projectBase = statSync(absolute).isDirectory() ? absolute : dirname(absolute);
      const expectations = readText(resolve(projectBase, expectationsPath));
      for (const metric of ["titleMusicLifecycleVerified", "soundLifecycleVerified"]) {
        results.push(new RegExp(`\\b${metric}\\b`).test(expectations)
          ? result("PASS", `project.audio-metric.${metric}`, `Bot expectations require ${metric}.`)
          : result("WARN", `project.audio-metric.${metric}`, `Bot expectations do not require ${metric}.`));
      }
    }
  } else {
    results.push(result("WARN", "project.publication", "No publication contract declares title flow, title music policy, or sound lifecycle proof."));
  }

  const roms = files.filter((path) => extname(path).toLowerCase() === ".rom");
  if (!roms.length || !sourceFiles.length) {
    results.push(result("SKIP", "project.stale-rom", "No source/ROM pair is available for stale-output comparison."));
  } else {
    const newestSource = Math.max(...sourceFiles.map((path) => statSync(path).mtimeMs));
    const stale = roms.filter((path) => statSync(path).mtimeMs < newestSource);
    results.push(stale.length
      ? result("WARN", "project.stale-rom", `${stale.length} ROM file(s) predate the newest source; rebuild before delivery.`)
      : result("PASS", "project.stale-rom", "ROM timestamps do not predate project sources."));
  }

  return { path: absolute, files, text: sourceText, tags: inferTags(files, sourceText), results, authorMetadata, metadataFile };
}

export function validateManifest(manifest) {
  const results = [];
  const requiredStates = ["PASS", "WARN", "FAIL", "SKIP"];
  results.push(JSON.stringify(manifest.resultStates) === JSON.stringify(requiredStates)
    ? result("PASS", "kit.result-states", "Author-check result states are complete.")
    : result("FAIL", "kit.result-states", "Manifest must declare PASS, WARN, FAIL, and SKIP in order."));
  for (const skill of manifest.skills || []) {
    const references = [skill.document, ...(skill.canonicalExamples || []), ...(skill.focusedChecks || [])];
    const missing = references.filter((path) => !existsSync(resolve(root, path)));
    results.push(missing.length
      ? result("FAIL", `skill.${skill.id}`, `Missing ${missing.join(", ")}`)
      : result("PASS", `skill.${skill.id}`, `Skill references are available (${references.length}).`));
  }
  return results;
}

export function selectProfiles(manifest, explicit, tags, projectProvided) {
  if (explicit.length) return explicit;
  const selected = new Set(projectProvided ? ["focused-codegen"] : ["metadata-only"]);
  if (["sound", "nmi-timing", "adam-eos"].some((tag) => tags.has(tag))) selected.add("runtime-abi");
  if (tags.has("optimizer-sensitive-asm")) selected.add("optimizer");
  if (/\b(adapted|adaptation|port|published|compute!|gazette|ahoy!)\b/i.test(projectProvided?.text || "")) selected.add("historical-port");
  return [...selected];
}

export function buildPlan(manifest, profileIds, tags) {
  const profiles = new Map((manifest.qaProfiles || []).map((profile) => [profile.id, profile]));
  const results = [];
  const evidence = new Set();
  for (const id of profileIds) {
    const profile = profiles.get(id);
    if (!profile) {
      results.push(result("FAIL", `profile.${id}`, `Unknown QA profile: ${id}`));
      continue;
    }
    for (const item of profile.requiredEvidence || []) evidence.add(item);
    results.push(result("PASS", `profile.${id}`, `Selected QA profile: ${id}.`));
  }

  return { results, evidence: [...evidence] };
}

export function buildAdapters(profileIds, tags, project) {
  const adapters = [{
    id: "doctor",
    label: "Amy authoring environment",
    command: process.execPath,
    args: ["tools/amy-author-doctor.mjs"],
    evidence: "machine-approved"
  }, {
    id: "agent-kit",
    label: "Agent-kit manifest and references",
    command: process.execPath,
    args: ["tools/test-agent-kit.mjs"],
    evidence: "machine-approved"
  }];
  if (project.path) {
    const hasCompilableSource = project.files?.some((path) => [".alexis", ".amy"].includes(extname(path).toLowerCase()));
    adapters.push(hasCompilableSource ? {
      id: "project-proof",
      label: "Fresh project build, size, RAM report, and shipped-output identity",
      command: process.execPath,
      args: ["tools/amy-author-project-proof.mjs", project.path, "--opt", project.authorMetadata?.optimization || "balanced"],
      evidence: "machine-approved"
    } : {
      id: "project-proof",
      label: "Fresh project build",
      skip: "No directly compilable .alexis/.amy source; project packaging adapter required."
    });
    const staticSource = project.files?.find((path) => [".alexis", ".amy"].includes(extname(path).toLowerCase()));
    if (staticSource) adapters.push({
      id: "static-safe-area",
      label: "Literal essential text and sprite CRT safe area",
      command: process.execPath,
      args: ["tools/amy-author-safe-area.mjs", staticSource],
      evidence: "machine-approved"
    });
    if (project.metadataFile) adapters.push({
      id: "project-metadata-schema",
      label: "Amy author project metadata contract",
      command: process.execPath,
      args: ["tools/amy-author-project-check.mjs", project.metadataFile],
      evidence: "machine-approved",
      warningPattern: "(^|\\n)WARN "
    });
    if (project.metadataFile) adapters.push({
      id: "production-quality",
      label: "Audiovisual identity, human play, variation, and publication evidence",
      command: process.execPath,
      args: ["tools/amy-author-quality-check.mjs", project.path],
      evidence: "machine-approved",
      warningPattern: "Amy author production quality: WARN"
    });
    const editorFiles = project.files?.filter((path) => basename(path).toLowerCase() === "editors.json" || path.endsWith(".editors.json")) || [];
    for (const [index, editorFile] of editorFiles.entries()) adapters.push({
      id: `editors-schema-${index + 1}`,
      label: `Graphics editor ownership schema: ${basename(editorFile)}`,
      command: process.execPath,
      args: ["tools/amy-author-editors-check.mjs", editorFile],
      evidence: "machine-approved",
      warningPattern: "(^|\\n)WARN "
    });
  }
  if (profileIds.some((id) => ["runtime-abi", "promotion"].includes(id))) {
    adapters.push({
      id: "amy-qa-quick",
      label: "Representative compiler/runtime/ABI gate",
      command: process.execPath,
      args: ["tools/amy-qa.mjs", "quick"],
      evidence: "machine-approved"
    });
  }
  if (profileIds.includes("promotion")) {
    adapters.push({
      id: "balanced-corpus",
      label: "Balanced full example compilation",
      command: process.execPath,
      args: ["tools/check-examples.mjs", "--assemble", "--optimization", "balanced"],
      evidence: "machine-approved"
    });
  }
  if (tags.has("codecs")) {
    adapters.push({
      id: "zx0-vram",
      label: "ZX0 direct-to-VRAM long literal",
      command: process.execPath,
      args: ["tools/test-zx0-vram-long-literal.mjs"],
      evidence: "machine-approved",
      needs: ["coleco-bios"]
    });
  }
  if (tags.has("graphics-ii")) {
    adapters.push({
      id: "bitmap-equivalence",
      label: "TMS9918 bitmap visual equivalence",
      command: process.execPath,
      args: ["tools/test-tms9918-bitmap-optimization.mjs"],
      evidence: "machine-approved"
    });
  }
  if (tags.has("sound")) {
    const soundAsm = project.files?.find((path) => extname(path).toLowerCase() === ".asm" && /(?:^|\n)\s*_snd_table\s*:/i.test(readText(path)));
    adapters.push(soundAsm ? {
      id: "sound-table",
      label: "OS7 sound-table area layout",
      command: process.execPath,
      args: ["tools/validate-sound-table.mjs", "--file", soundAsm],
      evidence: "machine-approved"
    } : {
      id: "sound-table",
      label: "OS7 sound-table area layout",
      skip: "No generated .asm containing _snd_table is available; compile the project first."
    });
  }
  const bot = project.authorMetadata?.qa?.bot;
  const projectBase = project.path && statSync(project.path).isDirectory() ? project.path : dirname(project.path);
  if (bot?.script) {
    const script = resolve(projectBase, bot.script);
    adapters.push(existsSync(script) ? {
      id: "project-bot",
      label: "Project-declared gameplay bot",
      command: process.execPath,
      args: [script, ...(bot.args || [])],
      evidence: "machine-approved"
    } : {
      id: "project-bot",
      label: "Project-declared gameplay bot",
      skip: `Declared bot not found: ${script}`
    });
    if (bot.report || bot.expectations) {
      const report = resolve(projectBase, bot.report || "");
      const expectations = resolve(projectBase, bot.expectations || "");
      adapters.push(bot.report && bot.expectations ? {
        id: "project-bot-metrics",
        label: "Project gameplay metric thresholds",
        command: process.execPath,
        args: ["tools/amy-author-metrics.mjs", "--report", report, "--expectations", expectations],
        evidence: "machine-approved",
        warningPattern: "Amy author metrics: WARN"
      } : {
        id: "project-bot-metrics",
        label: "Project gameplay metric thresholds",
        skip: "Both qa.bot.report and qa.bot.expectations are required for metric validation."
      });
    }
  }
  const visual = project.authorMetadata?.qa?.visual;
  if (visual?.config && project.authorMetadata?.output) {
    const rom = resolve(projectBase, project.authorMetadata.output);
    const config = resolve(projectBase, visual.config);
    const output = resolve(projectBase, visual.output || "visual-evidence");
    adapters.push(existsSync(rom) && existsSync(config) ? {
      id: "visual-proof",
      label: "Runtime checkpoints, CRT edges, transient pixels, and text areas",
      command: process.execPath,
      args: ["tools/amy-author-visual-proof.mjs", "--rom", rom, "--config", config, "--output", output],
      evidence: "generated-needs-human-review",
      warningPattern: "Amy visual proof: WARN"
    } : {
      id: "visual-proof",
      label: "Runtime visual proof",
      skip: `Visual proof needs ROM and config (${rom}, ${config}).`
    });
  }
  return adapters;
}

export function executeAdapters(adapters, options = {}) {
  const runner = options.runner || ((command, args) => spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: options.timeoutMs || 15 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024
  }));
  return adapters.map((adapter) => {
    if (adapter.skip) return { ...adapter, state: "SKIP", message: adapter.skip };
    if (adapter.needs?.includes("coleco-bios")) {
      const bios = process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom");
      if (!existsSync(bios)) return { ...adapter, state: "SKIP", message: "ColecoVision BIOS unavailable." };
    }
    const run = runner(adapter.command, adapter.args, adapter);
    if (run.error) {
      const blocked = ["EPERM", "EACCES"].includes(run.error.code);
      return {
        ...adapter,
        state: blocked ? "SKIP" : "FAIL",
        message: blocked
          ? `Environment blocked the child process (${run.error.code}); run the suggested command directly.`
          : run.error.message
      };
    }
    const output = `${run.stdout || ""}${run.stderr || ""}`.trim();
    const state = run.status !== 0 ? "FAIL"
      : adapter.warningPattern && new RegExp(adapter.warningPattern, "m").test(output) ? "WARN" : "PASS";
    return {
      ...adapter,
      state,
      message: output.split(/\r?\n/).filter(Boolean).slice(-3).join(" | ") || `exit ${run.status}`,
      exitCode: run.status
    };
  });
}

function printReport(report) {
  console.log(`Amy author check: ${report.verdict}`);
  if (report.project) console.log(`Project: ${report.project}`);
  console.log(`Profiles: ${report.profiles.join(", ") || "none"}`);
  console.log(`Tags: ${report.tags.join(", ") || "none detected"}`);
  for (const item of report.results) console.log(`${item.state.padEnd(4)} ${item.id}: ${item.message}`);
  console.log("\nRequired evidence:");
  for (const item of report.requiredEvidence) console.log(`- ${item}`);
  if (report.executions?.length) {
    console.log("\nExecuted adapters:");
    for (const item of report.executions) console.log(`${item.state.padEnd(4)} ${item.id}: ${item.message}`);
  } else {
    console.log("\nSuggested commands (not executed; add --execute):");
    for (const command of report.suggestedCommands) console.log(`- ${command}`);
  }
}

export function createReport(manifest, project, profileIds, executions = []) {
  const plan = buildPlan(manifest, profileIds, project.tags);
  const executionResults = executions.map((item) => result(item.state, `adapter.${item.id}`, item.message, { evidence: item.evidence || null }));
  const results = [...validateManifest(manifest), ...project.results, ...plan.results, ...executionResults];
  const verdict = results.reduce((worst, item) => resultOrder[item.state] > resultOrder[worst] ? item.state : worst, "PASS");
  const adapters = buildAdapters(profileIds, project.tags, project);
  return {
    kind: "amy-author-check",
    version: 1,
    verdict,
    project: project.path || null,
    profiles: profileIds,
    tags: [...project.tags].sort(),
    results,
    requiredEvidence: plan.evidence,
    suggestedCommands: adapters.filter((item) => !item.skip).map((item) => [quoteArg(item.command), ...item.args.map(quoteArg)].join(" ")),
    executions
  };
}

function main() {
  if (has("--help") || process.argv.length === 2) {
    console.log(`Amy author check\n\n  node tools/amy-author-check.mjs --project <file-or-directory> [--profile <id>] [--tags sound,graphics-ii] [--execute] [--json <report.json>]\n  node tools/amy-author-check.mjs --profile metadata-only\n\nStatic checks are always bounded. Runtime adapters execute only with --execute; a full corpus audit is selected only by the explicit promotion profile.`);
    return 0;
  }

  if (!existsSync(manifestPath)) {
    console.error(`FAIL kit.manifest: Missing ${manifestPath}`);
    return 2;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const project = inspectProject(option("--project"));
  const explicitTags = option("--tags").split(",").map((tag) => tag.trim()).filter(Boolean);
  for (const tag of explicitTags) project.tags.add(tag);
  const explicitProfiles = [];
  for (let index = 0; index < process.argv.length; ++index) {
    if (process.argv[index] === "--profile" && process.argv[index + 1]) explicitProfiles.push(process.argv[index + 1]);
  }
  const profileIds = selectProfiles(manifest, explicitProfiles, project.tags, option("--project") ? project : null);
  const adapters = buildAdapters(profileIds, project.tags, project);
  const executions = has("--execute") ? executeAdapters(adapters) : [];
  const report = createReport(manifest, project, profileIds, executions);
  const jsonPath = option("--json");
  if (jsonPath) writeFileSync(resolve(process.cwd(), jsonPath), `${JSON.stringify(report, null, 2)}\n`);
  printReport(report);
  return report.verdict === "FAIL" ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  process.exit(main());
}
