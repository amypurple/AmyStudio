function assetAliasesFromSource(sourceText) {
  const assets = [];
  const re = /^asset\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+"([^"]+)"(?:\s+codec\s+([A-Za-z0-9_]+))?/gim;
  let match;
  while ((match = re.exec(sourceText || ""))) {
    assets.push({ alias: match[1], path: match[2], codec: (match[3] || "raw").toLowerCase() });
  }
  return assets;
}

function node(id, label, type, detail = "") {
  return { id, label, type, detail };
}

function edge(from, to, label = "") {
  return { from, to, label };
}

function graphLayer(id) {
  if (id.startsWith("lib:") || id.startsWith("compression:") || id.startsWith("asset:")) return 1;
  if (id === "source") return 0;
  if (id === "transpile") return 2;
  if (id === "asm") return 3;
  if (id === "assemble") return 4;
  if (id === "rom") return 5;
  return 0;
}

function nodeColor(type) {
  return {
    source: "#7dd3fc",
    tool: "#a78bfa",
    lib: "#60a5fa",
    compression: "#fbbf24",
    asset: "#fb7185",
    artifact: "#9db0c3",
    ok: "#34d399"
  }[type] || "#9db0c3";
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function appendText(svg, text, x, y, className, maxChars = 28) {
  const el = svgEl("text", { x, y, class: className });
  el.textContent = text.length > maxChars ? `${text.slice(0, maxChars - 1)}...` : text;
  svg.appendChild(el);
  return el;
}

function layoutGraph(nodes) {
  const layers = new Map();
  for (const n of nodes) {
    const layer = graphLayer(n.id);
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer).push(n);
  }

  for (const group of layers.values()) {
    group.sort((a, b) => a.label.localeCompare(b.label));
  }

  const nodeW = 220;
  const nodeH = 82;
  const colGap = 80;
  const rowGap = 34;
  const margin = 36;
  const positions = new Map();
  let maxRows = 1;

  for (const [layer, group] of layers.entries()) {
    maxRows = Math.max(maxRows, group.length);
    group.forEach((n, row) => {
      positions.set(n.id, {
        x: margin + layer * (nodeW + colGap),
        y: margin + row * (nodeH + rowGap),
        w: nodeW,
        h: nodeH
      });
    });
  }

  return {
    positions,
    width: margin * 2 + 6 * nodeW + 5 * colGap,
    height: margin * 2 + maxRows * nodeH + Math.max(0, maxRows - 1) * rowGap
  };
}

export function buildProjectGraph(project, manifest, buildState = {}) {
  const sourceAssets = assetAliasesFromSource(project.sourceText);
  const nodes = [
    node("source", `${project.sourceLang || "source"} source`, "source", project.projectName || "unnamed"),
    node("transpile", "ALEXIS transpiler", "tool", "pseudo/code -> Z80 ASM body"),
    node("asm", "Generated Z80 ASM", "artifact", project.generatedAsm ? `${project.generatedAsm.length} chars` : "not generated"),
    node("assemble", "AmysCVAssembly core", "tool", "Z80 ASM -> ColecoVision binary"),
    node("rom", "ColecoVision ROM", buildState.romBytes ? "ok" : "artifact", buildState.romBytes ? `${buildState.romBytes} bytes` : "not compiled")
  ];

  const edges = [
    edge("source", "transpile", "parse"),
    edge("transpile", "asm", "emit"),
    edge("asm", "assemble", "compile"),
    edge("assemble", "rom", "output")
  ];

  for (const libPath of project.selectedLibs || []) {
    const item = manifest.libs.find((lib) => lib.id === libPath);
    const id = `lib:${libPath}`;
    nodes.push(node(id, item?.label || libPath, "lib", libPath));
    edges.push(edge(id, "asm", "include"));
  }

  for (const compPath of project.selectedCompression || []) {
    const item = manifest.compression.find((comp) => comp.id === compPath);
    const id = `compression:${compPath}`;
    nodes.push(node(id, item?.label || compPath, "compression", compPath));
    edges.push(edge(id, "asm", "include"));
  }

  const assetPaths = new Set(project.selectedAssets || []);
  for (const asset of sourceAssets) assetPaths.add(asset.path);
  for (const assetPath of assetPaths) {
    const item = manifest.assets.find((asset) => asset.id === assetPath);
    const sourceAsset = sourceAssets.find((asset) => asset.path === assetPath);
    const id = `asset:${assetPath}`;
    const label = sourceAsset ? `${sourceAsset.alias} (${sourceAsset.codec.toUpperCase()})` : item?.label || assetPath;
    nodes.push(node(id, label, "asset", assetPath));
    edges.push(edge(id, "asm", sourceAsset ? "incbin + symbol" : "selected"));
  }

  return { nodes, edges };
}

export function renderProjectGraph(container, graph) {
  container.textContent = "";
  const { positions, width, height } = layoutGraph(graph.nodes);
  const svg = svgEl("svg", {
    class: "project-graph__svg",
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "ALEXIS project build graph"
  });

  const defs = svgEl("defs");
  const marker = svgEl("marker", {
    id: "arrow",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "8",
    markerHeight: "8",
    orient: "auto-start-reverse"
  });
  marker.appendChild(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "graph-edge__arrow" }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  for (const e of graph.edges) {
    const from = positions.get(e.from);
    const to = positions.get(e.to);
    if (!from || !to) continue;

    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;
    const mid = Math.max(x1 + 32, (x1 + x2) / 2);
    const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2 - 8} ${y2}`;
    svg.appendChild(svgEl("path", { d: path, class: "graph-edge", "marker-end": "url(#arrow)" }));

    if (e.label) {
      appendText(svg, e.label, (x1 + x2) / 2 - 18, (y1 + y2) / 2 - 6, "graph-edge__label", 18);
    }
  }

  for (const n of graph.nodes) {
    const p = positions.get(n.id);
    if (!p) continue;
    const group = svgEl("g", { class: `graph-svg-node graph-svg-node--${n.type}` });
    group.appendChild(svgEl("rect", {
      x: p.x,
      y: p.y,
      width: p.w,
      height: p.h,
      rx: 12,
      class: "graph-svg-node__box"
    }));
    group.appendChild(svgEl("rect", {
      x: p.x,
      y: p.y,
      width: 5,
      height: p.h,
      rx: 3,
      fill: nodeColor(n.type)
    }));
    appendText(group, n.label, p.x + 14, p.y + 26, "graph-svg-node__title", 26);
    appendText(group, n.detail || n.id, p.x + 14, p.y + 50, "graph-svg-node__meta", 32);
    appendText(group, n.type.toUpperCase(), p.x + 14, p.y + 68, "graph-svg-node__type", 22);
    svg.appendChild(group);
  }

  container.appendChild(svg);
}
