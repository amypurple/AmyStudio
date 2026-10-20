#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

function usage() {
  console.error("usage: node tools/amyz80.mjs <input.asm> [output.bin|-o output.bin] [--gasm80|--tasm] [--opt]");
}

export function parseArgs(argv) {
  const result = { input: null, output: null, dialect: "native", optimize: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--gasm80" || arg === "--tasm") {
      const dialect = arg.slice(2);
      if (result.dialect !== "native" && result.dialect !== dialect) {
        throw new Error("--gasm80 and --tasm are mutually exclusive");
      }
      result.dialect = dialect;
    }
    else if (arg === "--opt") result.optimize = true;
    else if (arg === "-o" || arg === "--output") result.output = argv[++index] || null;
    else if (!result.input) result.input = arg;
    else if (!result.output) result.output = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return result;
}

function collectAssemblyFiles(entryPath) {
  const files = {};
  const visited = new Set();
  const visit = (absolutePath, key) => {
    const normalizedPath = path.resolve(absolutePath);
    if (visited.has(normalizedPath)) return;
    if (!existsSync(normalizedPath)) throw new Error(`Include not found: ${normalizedPath}`);
    visited.add(normalizedPath);
    const source = readFileSync(normalizedPath, "utf8");
    files[key] = source;
    const includePattern = /^\s*include\s+["']([^"']+)["']/gim;
    for (const match of source.matchAll(includePattern)) {
      const includeKey = match[1].replace(/\\/g, "/");
      visit(path.resolve(path.dirname(normalizedPath), match[1]), includeKey);
    }
  };
  visit(entryPath, "main.asm");
  return files;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.input) {
    usage();
    process.exit(2);
  }
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output || inputPath.replace(/\.[^.]+$/, ".bin"));
  const result = await assembleAmysCVAssembly(collectAssemblyFiles(inputPath), "main.asm", {
    outputFilename: path.basename(outputPath),
    outputMode: "binary",
    targetPlatform: "raw",
    optimizerEnabled: options.optimize,
    gasm80Compatibility: options.dialect === "gasm80",
    tasmCompatibility: options.dialect === "tasm",
  });
  if (!result.ok) {
    console.error(result.log || "Assembly failed.");
    process.exit(1);
  }
  const binary = result.binary || result.bytes || new Uint8Array();
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, binary);
  const dialect = options.dialect === "native" ? "" : ` (${options.dialect} compatibility)`;
  console.log(`${outputPath}: ${binary.length} bytes${dialect}${options.optimize ? " (optimized)" : ""}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    console.error(error?.stack || String(error));
    process.exit(1);
  });
}
