import { normalizeProjectFilePath, projectFileBytes } from "./utils/projectFiles.js";
import { fingerprintBuildInputs } from "./incrementalBuildCache.js";

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
  const graphNodes = new Map();

  function ensureGraphNode(path, text) {
    const key = path.toLowerCase();
    if (!graphNodes.has(key)) {
      graphNodes.set(key, {
        path,
        text: String(text || ""),
        dependencies: []
      });
    }
    return graphNodes.get(key);
  }

  function expand(text, currentPath, stack) {
    const graphNode = ensureGraphNode(currentPath, text);
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
      if (!graphNode.dependencies.some((path) => path.toLowerCase() === key)) graphNode.dependencies.push(file.path);
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
  const sourceText = output.join("\n");
  const nodeFingerprints = new Map();
  const transitiveFingerprints = new Map();
  for (const [key, node] of graphNodes) {
    nodeFingerprints.set(key, fingerprintBuildInputs("amy-source-v1", node.path, node.text));
  }

  function transitiveFingerprint(key, stack = new Set()) {
    if (transitiveFingerprints.has(key)) return transitiveFingerprints.get(key);
    if (stack.has(key)) return nodeFingerprints.get(key);
    const node = graphNodes.get(key);
    const nextStack = new Set(stack).add(key);
    const dependencyFingerprints = node.dependencies.map((path) => transitiveFingerprint(path.toLowerCase(), nextStack));
    const fingerprint = fingerprintBuildInputs(
      "amy-source-closure-v1",
      nodeFingerprints.get(key),
      ...dependencyFingerprints
    );
    transitiveFingerprints.set(key, fingerprint);
    return fingerprint;
  }

  const nodes = [...graphNodes.entries()].map(([key, node]) => ({
    path: node.path,
    dependencies: [...node.dependencies],
    fingerprint: nodeFingerprints.get(key),
    transitiveFingerprint: transitiveFingerprint(key)
  }));
  const dependencyGraph = {
    entry: entryPath,
    nodes,
    bundleFingerprint: fingerprintBuildInputs("amy-bundle-v1", entryPath, sourceText)
  };
  return {
    sourceText,
    sourceMap,
    includedFiles: [...included].map((key) => files.get(key).path),
    dependencyGraph
  };
}

export function affectedAmySourcePaths(dependencyGraph, changedPaths = []) {
  const nodes = Array.isArray(dependencyGraph?.nodes) ? dependencyGraph.nodes : [];
  const canonicalPaths = new Map(nodes.map((node) => [String(node.path || "").toLowerCase(), node.path]));
  const reverseDependencies = new Map();
  for (const node of nodes) {
    for (const dependency of node.dependencies || []) {
      const key = String(dependency).toLowerCase();
      if (!reverseDependencies.has(key)) reverseDependencies.set(key, []);
      reverseDependencies.get(key).push(node.path);
    }
  }

  const affected = new Set();
  const pending = changedPaths.map((path) => String(path || "").toLowerCase());
  while (pending.length) {
    const key = pending.shift();
    if (!key || affected.has(key)) continue;
    affected.add(key);
    for (const dependent of reverseDependencies.get(key) || []) pending.push(dependent.toLowerCase());
  }
  return nodes
    .map((node) => node.path)
    .filter((path) => affected.has(path.toLowerCase()) && canonicalPaths.has(path.toLowerCase()));
}

