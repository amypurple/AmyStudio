#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

function usage() {
  console.error("usage: node tools/amyz80.mjs <input.asm> [output.bin|-o output.bin] [--gasm80] [--opt]");
}

function parseArgs(argv) {
  const result = { input: null, output: null, gasm80: false, optimize: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--gasm80") result.gasm80 = true;
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
    gasm80Compatibility: options.gasm80,
  });
  if (!result.ok) {
    console.error(result.log || "Assembly failed.");
    process.exit(1);
  }
  const binary = result.binary || result.bytes || new Uint8Array();
  writeFileSync(outputPath, binary);
  console.log(`${outputPath}: ${binary.length} bytes${options.gasm80 ? " (gasm80 compatibility)" : ""}${options.optimize ? " (optimized)" : ""}`);
}

main().catch(error => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
