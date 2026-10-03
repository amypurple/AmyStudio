import { normalizeProjectFilePath, projectFileBytes } from "./utils/projectFiles.js";

const INCLUDE_AMY_RE = /^\s*include\s+amy\s+"([^"]+)"\s*(?:'.*)?$/i;

export function bundleAmySource(entryText, projectFiles = [], { entryPath = "@main" } = {}) {
  const files = new Map();
  for (const file of projectFiles || []) {
    const path = normalizeProjectFilePath(file?.path || "");
    if (!path) continue;
    files.set(path.toLowerCase(), {
      path,
      text: new TextDecoder().decode(projectFileBytes(file))
    });
  }

  const included = new Set();
  const sourceMap = [];
  const output = [];

  function expand(text, currentPath, stack) {
    const lines = String(text || "").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const match = lines[index].match(INCLUDE_AMY_RE);
      if (!match) {
        output.push(lines[index]);
        sourceMap.push({ generatedLine: output.length, path: currentPath, line: index + 1 });
        continue;
      }

      const requested = normalizeProjectFilePath(match[1]);
      const key = requested.toLowerCase();
      const file = files.get(key);
      if (!file) throw new Error(`${currentPath}:${index + 1}: Amy source include not found: ${requested}`);
      if (stack.includes(key)) {
        const chain = [...stack, key].map((item) => files.get(item)?.path || item).join(" -> ");
        throw new Error(`${currentPath}:${index + 1}: Circular Amy source include: ${chain}`);
      }
      if (included.has(key)) continue;
      included.add(key);
      expand(file.text, file.path, [...stack, key]);
    }
  }

  expand(entryText, entryPath, []);
  return { sourceText: output.join("\n"), sourceMap, includedFiles: [...included].map((key) => files.get(key).path) };
}

