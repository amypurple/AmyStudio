import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile, normalizeOptimizationLevel } from "../studio/core/optimization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function printUsage() {
  console.log(`Usage:
  node --experimental-default-type=module tools/compare-z80-optimizer.js --asm <file> [options]

Options:
  --asm <file>            Main ASM file to assemble.
  --level <name>          Built-in optimizer level: off|safe|balanced|aggressive|experimental|auto.
                          Default: balanced
  --external-asm <file>   Externally optimized ASM file to assemble for comparison.
  --run-external          Run the configured external optimizer automatically.
  --expanded-out <file>   Write fully expanded ASM for feeding into external tools.
  --builtin-out <file>    Write final built-in optimized ASM tokens used by Pass 3.
  --json                  Print machine-readable JSON summary.
  --help                  Show this help.

Notes:
  - Run through the provided PowerShell wrapper if you do not want to type the
    Node flag manually.
  - External optimizer output is assembled with built-in optimization OFF so
    the comparison reflects the external pass itself.`);
}

function parseArgs(argv) {
  const options = {
    level: "balanced",
    json: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--asm":
        options.asm = argv[++i];
        break;
      case "--level":
        options.level = normalizeOptimizationLevel(argv[++i] || "balanced");
        break;
      case "--external-asm":
        options.externalAsm = argv[++i];
        break;
      case "--run-external":
        options.runExternal = true;
        break;
      case "--expanded-out":
        options.expandedOut = argv[++i];
        break;
      case "--builtin-out":
        options.builtinOut = argv[++i];
        break;
      case "--json":
        options.json = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function normalizeRepoPath(inputPath) {
  return inputPath.replace(/\\/g, "/");
}

function toRepoAbsolute(inputPath) {
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(repoRoot, inputPath);
}

function toMainKey(absolutePath) {
  const relative = path.relative(repoRoot, absolutePath);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return normalizeRepoPath(relative);
  }
  return normalizeRepoPath(path.basename(absolutePath));
}

function extractReferencedPaths(asmText) {
  const paths = new Set();
  const re = /^\s*(?:include|incbin)\s+"([^"]+)"/gim;
  let match;
  while ((match = re.exec(asmText))) {
    paths.add(normalizeRepoPath(match[1]));
  }
  return [...paths];
}

async function readWorkspaceFile(repoRelativePath, { projectRoot = null } = {}) {
  let absolutePath = null;
  if (projectRoot && normalizeRepoPath(repoRelativePath).startsWith("@project/")) {
    absolutePath = path.resolve(projectRoot, repoRelativePath.slice("@project/".length));
  } else {
    absolutePath = toRepoAbsolute(repoRelativePath);
  }
  return fs.readFile(absolutePath);
}

async function loadExternalOptimizerConfig() {
  const localPath = path.join(repoRoot, "tools", "optimizer-config.local.json");
  try {
    const text = await fs.readFile(localPath, "utf8");
    return { path: localPath, config: JSON.parse(text) };
  } catch (error) {
    if (error && error.code === "ENOENT") return { path: localPath, config: null };
    throw error;
  }
}

async function buildFileMap(mainAsmPath, { projectRoot = null } = {}) {
  const absoluteMain = toRepoAbsolute(mainAsmPath);
  const mainKey = toMainKey(absoluteMain);
  const files = new Map();

  files.set(mainKey, await fs.readFile(absoluteMain));

  const pending = [...extractReferencedPaths((await fs.readFile(absoluteMain, "utf8")))];
  const seen = new Set(pending);

  while (pending.length) {
    const includePath = pending.pop();
    const bytes = await readWorkspaceFile(includePath, { projectRoot });
    files.set(includePath, bytes);
    const lower = includePath.toLowerCase();
    if (lower.endsWith(".asm") || lower.endsWith(".inc") || lower.endsWith(".s") || lower.endsWith(".z80")) {
      const text = bytes.toString("utf8");
      for (const nested of extractReferencedPaths(text)) {
        if (files.has(nested) || seen.has(nested)) continue;
        seen.add(nested);
        pending.push(nested);
      }
    }
  }

  return { mainKey, files: Object.fromEntries(files) };
}

async function expandAsmText(mainAsmPath, { projectRoot = null } = {}) {
  const absoluteMain = toRepoAbsolute(mainAsmPath);
  const seen = new Set();

  async function expandText(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
      const match = line.match(/^\s*include\s+"([^"]+)"\s*$/i);
      if (!match) {
        out.push(line);
        continue;
      }
      const includePath = normalizeRepoPath(match[1]);
      if (seen.has(includePath)) {
        out.push(`; --- include skipped (already expanded): ${includePath} ---`);
        continue;
      }
      seen.add(includePath);
      const includeText = await readWorkspaceFile(includePath, { projectRoot }).then((bytes) => bytes.toString("utf8"));
      out.push(`; --- begin include: ${includePath} ---`);
      out.push(await expandText(includeText));
      out.push(`; --- end include: ${includePath} ---`);
    }
    return out.join("\n");
  }

  return expandText(await fs.readFile(absoluteMain, "utf8"));
}

async function assembleVariant(fileMap, mainKey, { optimizerEnabled, optimizerConfig, label }) {
  const result = await assembleAmysCVAssembly(fileMap, mainKey, {
    outputFilename: mainKey.replace(/\.(asm|z80|s)$/i, ".col"),
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled,
    optimizerConfig
  });
  if (!result.ok) {
    const error = new Error(`${label} assembly failed`);
    error.result = result;
    throw error;
  }
  return result;
}

function substituteArgs(args, replacements) {
  return (args || []).map((arg) => {
    let next = String(arg);
    for (const [key, value] of Object.entries(replacements)) {
      next = next.replaceAll(`{${key}}`, value);
    }
    return next;
  });
}

async function runExternalOptimizer(config, inputAsmPath, outputAsmPath) {
  const executable = config?.externalOptimizerPath || "java";
  const args = substituteArgs(
    config?.externalOptimizerArgs || ["-jar", "{jar}", "{input}", "-po", "-asm", "{output}"],
    {
      input: inputAsmPath,
      output: outputAsmPath,
      jar: config?.mdlJarPath || ""
    }
  );

  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr, executable, args });
        return;
      }
      const error = new Error(`External optimizer failed with exit code ${code}`);
      error.stdout = stdout;
      error.stderr = stderr;
      error.executable = executable;
      error.args = args;
      reject(error);
    });
  });
}

function summarizeVariant(name, result) {
  return {
    name,
    romSize: result.binary?.length ?? 0,
    symbols: result.stats?.symbolCount ?? Object.keys(result.symbols || {}).length,
    optimizer: result.stats?.optimizer || null
  };
}

function formatSaved(delta, baselineLabel) {
  if (delta === null || delta === undefined) return `n/a vs ${baselineLabel}`;
  if (delta === 0) return `unchanged vs ${baselineLabel}`;
  if (delta > 0) return `saved ${delta} vs ${baselineLabel}`;
  return `grew ${Math.abs(delta)} vs ${baselineLabel}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.asm) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  const sourceText = await fs.readFile(toRepoAbsolute(options.asm), "utf8");
  const profile = getOptimizationProfile(options.level, sourceText);
  const asmAbsolutePath = toRepoAbsolute(options.asm);
  const asmBaseName = path.basename(asmAbsolutePath).replace(/\.(asm|z80|s)$/i, "");
  const candidateProjectRoot = path.resolve(path.dirname(asmAbsolutePath), "..", "project-files", asmBaseName);
  const projectRoot = await fs.access(candidateProjectRoot).then(() => candidateProjectRoot).catch(() => null);
  const { mainKey, files } = await buildFileMap(options.asm, { projectRoot });
  const externalConfigData = await loadExternalOptimizerConfig();

  let expandedOutputPath = options.expandedOut ? path.resolve(repoRoot, options.expandedOut) : null;
  if (options.expandedOut || options.runExternal) {
    const expanded = await expandAsmText(options.asm, { projectRoot });
    if (!expandedOutputPath) {
      expandedOutputPath = path.resolve(repoRoot, "build", `${path.basename(options.asm).replace(/\.(asm|z80|s)$/i, "")}.expanded.asm`);
    }
    await fs.mkdir(path.dirname(expandedOutputPath), { recursive: true });
    await fs.writeFile(expandedOutputPath, expanded, "utf8");
  }

  const raw = await assembleVariant(files, mainKey, {
    optimizerEnabled: false,
    optimizerConfig: null,
    label: "Raw"
  });

  const builtin = await assembleVariant(files, mainKey, {
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig,
    label: "Built-in"
  });

  let builtinOutputPath = options.builtinOut ? path.resolve(repoRoot, options.builtinOut) : null;
  if (builtinOutputPath) {
    await fs.mkdir(path.dirname(builtinOutputPath), { recursive: true });
    await fs.writeFile(builtinOutputPath, builtin.optimizedAsm || "", "utf8");
  }

  let external = null;
  let externalAsmPath = options.externalAsm ? toRepoAbsolute(options.externalAsm) : null;
  let externalRun = null;
  if (options.runExternal) {
    if (!externalConfigData.config) {
      throw new Error(`Missing external optimizer config: ${path.relative(repoRoot, externalConfigData.path)}`);
    }
    if (!expandedOutputPath) {
      throw new Error("Expanded ASM path was not created for external optimizer run");
    }
    if (!externalAsmPath) {
      externalAsmPath = path.resolve(repoRoot, "build", `${path.basename(options.asm).replace(/\.(asm|z80|s)$/i, "")}.external.asm`);
    }
    await fs.mkdir(path.dirname(externalAsmPath), { recursive: true });
    externalRun = await runExternalOptimizer(externalConfigData.config, expandedOutputPath, externalAsmPath);
  }

  if (externalAsmPath) {
    const externalBundle = await buildFileMap(externalAsmPath, { projectRoot });
    external = await assembleVariant(externalBundle.files, externalBundle.mainKey, {
      optimizerEnabled: false,
      optimizerConfig: null,
      label: "External"
    });
  }

  const summary = {
    asm: normalizeRepoPath(options.asm),
    profile: {
      requestedLevel: options.level,
      effectiveLevel: profile.effectiveLevel,
      note: profile.note
    },
    expandedOut: expandedOutputPath ? normalizeRepoPath(path.relative(repoRoot, expandedOutputPath)) : null,
    builtinOut: builtinOutputPath ? normalizeRepoPath(path.relative(repoRoot, builtinOutputPath)) : null,
    externalRun: externalRun ? {
      executable: externalRun.executable,
      args: externalRun.args,
      stdout: externalRun.stdout,
      stderr: externalRun.stderr
    } : null,
    raw: summarizeVariant("raw", raw),
    builtin: summarizeVariant("builtin", builtin),
    external: external ? summarizeVariant("external", external) : null,
    deltas: {
      builtinVsRaw: raw.binary.length - builtin.binary.length,
      externalVsRaw: external ? raw.binary.length - external.binary.length : null,
      externalVsBuiltin: external ? builtin.binary.length - external.binary.length : null
    }
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`ASM: ${summary.asm}`);
  console.log(`Built-in profile: ${profile.note}`);
  if (summary.expandedOut) console.log(`Expanded ASM: ${summary.expandedOut}`);
  if (options.runExternal) {
    console.log(`External run: ${summary.externalRun?.executable || "configured tool"}`);
  }
  console.log("");
  console.log(`Raw ROM:      ${summary.raw.romSize} bytes`);
  console.log(`Built-in ROM: ${summary.builtin.romSize} bytes (${formatSaved(summary.deltas.builtinVsRaw, "raw")})`);
  if (summary.external) {
    console.log(`External ROM: ${summary.external.romSize} bytes (${formatSaved(summary.deltas.externalVsRaw, "raw")}, ${formatSaved(summary.deltas.externalVsBuiltin, "built-in")})`);
  }
  if (summary.builtin.optimizer) {
    const opt = summary.builtin.optimizer;
    console.log("");
    console.log(`Built-in optimizer estimates: peephole=${opt.peepholeOpts || 0}, dead=${opt.deadCodeRemoved || 0}, JP→JR=${opt.jpToJr || 0}, local bytes=${opt.bytesSaved || 0}`);
  }
}

main().catch((error) => {
  if (error?.result?.log) {
    console.error(error.result.log);
  } else {
    console.error(String(error?.stack || error));
  }
  process.exit(1);
});
