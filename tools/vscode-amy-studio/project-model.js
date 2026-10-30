"use strict";
const fs = require("node:fs");
const path = require("node:path");
const MANIFEST = "amy.project.json";
const VALID_PROFILES = new Set(["off", "safe", "balanced", "aggressive", "experimental"]);

function findManifest(startPath, workspaceRoots = []) {
  let current = startPath && fs.existsSync(startPath) && fs.statSync(startPath).isDirectory() ? path.resolve(startPath) : path.dirname(path.resolve(startPath || "."));
  const roots = workspaceRoots.map((root) => path.resolve(root));
  while (true) {
    const candidate = path.join(current, MANIFEST);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current || (roots.length && !roots.some((root) => current === root || current.startsWith(root + path.sep)))) break;
    current = parent;
  }
  for (const root of roots) {
    const candidate = path.join(root, MANIFEST);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function readProject(manifestPath) {
  const root = path.dirname(path.resolve(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest.entry || typeof manifest.entry !== "string") throw new Error('amy.project.json requires a string "entry".');
  const entry = path.resolve(root, manifest.entry);
  if (!entry.startsWith(root + path.sep) && entry !== root) throw new Error("Project entry must stay inside the project folder.");
  if (!fs.existsSync(entry)) throw new Error("Project entry does not exist: " + manifest.entry);
  const optimization = VALID_PROFILES.has(manifest.optimization) ? manifest.optimization : "balanced";
  return { root, manifestPath: path.resolve(manifestPath), manifest, entry, optimization };
}

function standaloneProject(sourcePath, optimization = "balanced") {
  const entry = path.resolve(sourcePath);
  return {
    root: path.dirname(entry),
    manifestPath: null,
    manifest: { name: path.basename(entry, path.extname(entry)), entry: path.basename(entry), optimization },
    entry,
    optimization: VALID_PROFILES.has(optimization) ? optimization : "balanced"
  };
}

function buildArguments(project, compilerPath, buildDir, profile = project.optimization) {
  const stem = path.basename(project.entry, path.extname(project.entry));
  const target = project.manifest.target || "colecovision-cartridge";
  const args = [
    compilerPath, project.entry, "--project-dir", project.root, "--target", target,
    "--opt", VALID_PROFILES.has(profile) ? profile : "balanced",
    "--asm", path.join(buildDir, stem + ".asm"),
    "--optimized-asm", path.join(buildDir, stem + ".optimized.asm"),
    "--rom", path.join(buildDir, target.includes("adam") ? stem + ".bin" : stem + ".rom"),
    "--symbols", path.join(buildDir, stem + ".sym"),
    "--report-json", path.join(buildDir, stem + ".report.json")
  ];
  if (project.manifest.medium) args.push("--medium", String(project.manifest.medium));
  if (project.manifest.memoryProfile) args.push("--memory-profile", String(project.manifest.memoryProfile));
  for (const hardware of project.manifest.hardware || []) args.push("--hardware", String(hardware));
  for (const define of project.manifest.defines || []) args.push("--define", String(define));
  return args;
}

function sourceDiagnostics(source, file = "") {
  const lines = String(source || "").split(/\r?\n/);
  const code = lines.map((line) => {
    let inString = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (inString && line[index + 1] === '"') { index += 1; continue; }
        inString = !inString;
      } else if (!inString && (character === "'" || character === ";")) {
        return line.slice(0, index);
      }
    }
    return line;
  });
  const hasShadowWrites = code.some((line) => /^\s*set\s+sprite\s+(?!count\b)/i.test(line));
  const firstFullUpload = code.findIndex((line) => /^\s*update\s+sprites\s*$/i.test(line));
  const establishesCount = code.some((line) => /^\s*(?:set\s+sprite\s+count\b|clear\s+sprites\b)/i.test(line));
  if (!hasShadowWrites || firstFullUpload < 0 || establishesCount) return [];
  return [{
    file,
    line: firstFullUpload + 1,
    column: Math.max(1, (lines[firstFullUpload].search(/\S/) + 1) || 1),
    severity: "warning",
    code: "sprite-count-not-established",
    message: "Sprite entries are uploaded without set sprite count or clear sprites. The SAT may continue through uninitialized RAM."
  }];
}

module.exports = { MANIFEST, VALID_PROFILES, findManifest, readProject, standaloneProject, buildArguments, sourceDiagnostics };
