import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(extensionRoot, "..", "..");
const stageRoot = join(extensionRoot, "toolchain");
const entry = join(repoRoot, "tools", "amyc.mjs");
const copied = new Set();

mkdirSync(join(extensionRoot, "dist"), { recursive: true });

function assertInsideRepo(path) {
  const rel = relative(repoRoot, path);
  if (rel === "" || rel.startsWith("..") || resolve(repoRoot, rel) !== path) {
    throw new Error(`Refusing to stage a compiler dependency outside the repository: ${path}`);
  }
  return rel;
}

function copyModule(path) {
  const absolute = resolve(path);
  if (copied.has(absolute)) return;
  copied.add(absolute);

  const rel = assertInsideRepo(absolute);
  const destination = join(stageRoot, rel);
  mkdirSync(dirname(destination), { recursive: true });
  const text = readFileSync(absolute, "utf8");
  writeFileSync(destination, text, "utf8");

  const imports = [
    ...text.matchAll(/(?:from\s+|import\s*)["'](\.{1,2}\/[^"']+)["']/g),
    ...text.matchAll(/import\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g),
  ];
  for (const match of imports) {
    const specifier = match[1].replace(/[?#].*$/, "");
    let dependency = resolve(dirname(absolute), specifier);
    if (!existsSync(dependency)) {
      for (const suffix of [".mjs", ".js", ".json"]) {
        if (existsSync(`${dependency}${suffix}`)) {
          dependency += suffix;
          break;
        }
      }
    }
    if (existsSync(dependency)) copyModule(dependency);
  }
}

rmSync(stageRoot, { recursive: true, force: true });
copyModule(entry);
cpSync(join(repoRoot, "src"), join(stageRoot, "src"), { recursive: true });
writeFileSync(join(stageRoot, "package.json"), "{\n  \"type\": \"module\"\n}\n", "utf8");

const hash = createHash("sha256");
for (const path of [...copied].sort()) {
  hash.update(relative(repoRoot, path));
  hash.update(readFileSync(path));
}
hash.update("src-runtime-tree");

writeFileSync(
  join(stageRoot, "VERSION.json"),
  `${JSON.stringify({
    schema: "amy-vscode-toolchain-v1",
    stagedAt: new Date().toISOString(),
    compilerModules: copied.size,
    compilerHash: hash.digest("hex"),
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Staged Amy compiler: ${copied.size} modules plus src runtime.`);
