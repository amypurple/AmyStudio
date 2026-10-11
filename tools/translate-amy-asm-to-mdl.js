import fs from "node:fs/promises";
import path from "node:path";

function printUsage() {
  console.log(`Usage:
  node --experimental-default-type=module tools/translate-amy-asm-to-mdl.js --in <input.asm> --out <output.asm> [--target mdl|copt]

Notes:
  - This is a one-way translator for feeding Amy/TASM-style ASM into MDL.
  - The same translator is also used to prepare ASM for text-filter oracles such
    as z88dk copt before MDL assembles their output.
  - It is intentionally conservative and only rewrites syntax we have observed in
    generated Amy assembler.
  - Main current rewrite: $FFFF-style hex -> #FFFF outside comments and strings.`);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--in":
        options.input = argv[++i];
        break;
      case "--out":
        options.output = argv[++i];
        break;
      case "--target":
        options.target = argv[++i];
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

function splitComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") {
      inString = !inString;
      continue;
    }
    if (ch === ";" && !inString) {
      return {
        code: line.slice(0, i),
        comment: line.slice(i)
      };
    }
  }
  return { code: line, comment: "" };
}

function translateCodeSegment(code) {
  let out = code;

  // MDL does not need explicit CPU selection here, and some included music
  // sources emit a bare "cpu z80" directive that MDL treats poorly.
  if (/^\s*cpu\s+z80\s*$/i.test(out)) {
    return "";
  }

  // Normalize dotted data directives used by some imported asm assets.
  out = out.replace(/^(\s*)\.(db|dw|dd|ds)\b/i, "$1$2");

  // Amy/TASM-style hex literals: $1234 -> #1234
  // Keep this conservative by only rewriting obvious numeric tokens.
  out = out.replace(/\$([0-9A-Fa-f]+)/g, "#$1");

  // Normalize C-style hex bytes from imported asm/music assets.
  out = out.replace(/\b0x([0-9A-Fa-f]+)\b/g, "#$1");

  return out;
}

async function resolveIncbinPath(specifier, inputPath, { projectRoot = null } = {}) {
  const candidate = String(specifier || "").trim();
  if (!candidate) return null;
  if (projectRoot && candidate.replace(/\\/g, "/").startsWith("@project/")) {
    return path.resolve(projectRoot, candidate.replace(/\\/g, "/").slice("@project/".length));
  }
  if (path.isAbsolute(candidate)) return candidate;
  const nearInput = path.resolve(path.dirname(inputPath), candidate);
  try {
    await fs.access(nearInput);
    return nearInput;
  } catch {}
  const fromCwd = path.resolve(candidate);
  try {
    await fs.access(fromCwd);
    return fromCwd;
  } catch {}
  return nearInput;
}

function formatDbLines(bytes, indent = "") {
  const lines = [];
  const chunkSize = 16;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.slice(offset, offset + chunkSize);
    const payload = Array.from(chunk, (byte) => `#${byte.toString(16).toUpperCase().padStart(2, "0")}`).join(",");
    lines.push(`${indent}db ${payload}`);
  }
  if (!lines.length) {
    lines.push(`${indent}db`);
  }
  return lines;
}

async function translateAmyAsm(text, inputPath, { projectRoot = null, target = "mdl" } = {}) {
  if (!["mdl", "copt"].includes(target)) {
    throw new Error(`Unsupported translation target: ${target}`);
  }
  const translatedLines = [];
  for (const line of text.split(/\r?\n/)) {
    const { code, comment } = splitComment(line);
    const incbinMatch = code.match(/^(\s*)incbin\s+"([^"]+)"\s*$/i);
    if (incbinMatch) {
      const indent = incbinMatch[1] || "";
      const assetPath = await resolveIncbinPath(incbinMatch[2], inputPath, { projectRoot });
      const assetBytes = await fs.readFile(assetPath);
      translatedLines.push(`${indent}; inlined from incbin "${incbinMatch[2]}"${comment ? ` ${comment.trim()}` : ""}`);
      translatedLines.push(...formatDbLines(assetBytes, indent));
      continue;
    }
    translatedLines.push(`${translateCodeSegment(code)}${comment}`);
  }
  return translatedLines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.input || !options.output) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  const inputStem = path.basename(inputPath)
    .replace(/(?:\.expanded|\.builtin|\.mdl-input)?\.(asm|z80|s)$/i, "")
    .replace(/\.builtin$/i, "");
  const candidateProjectRoot = path.resolve(path.dirname(inputPath), "..", "project-files", inputStem);
  const projectRoot = await fs.access(candidateProjectRoot).then(() => candidateProjectRoot).catch(() => null);
  const text = await fs.readFile(inputPath, "utf8");
  const translated = await translateAmyAsm(text, inputPath, { projectRoot, target: options.target || "mdl" });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, translated, "utf8");

  console.log(`Translated ${inputPath} -> ${outputPath}`);
}

main().catch((error) => {
  console.error(String(error?.stack || error));
  process.exit(1);
});
