function lower(value) {
  return String(value || "").toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripComment(line) {
  const text = String(line || "");
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '"') quoted = !quoted;
    if (!quoted && text[i] === "'") return text.slice(0, i);
  }
  return text;
}

function parseParams(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw.split(",").map((part) => {
    const match = part.trim().match(/^(ref\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    return match ? { isRef: !!match[1], type: lower(match[2]), name: match[3] } : { invalid: true };
  });
}

const STATIC_ABI_TYPES = new Set(["u8", "i8", "u16", "i16"]);
const BUILTIN_TYPES = new Set([
  ...STATIC_ABI_TYPES,
  "bool", "boolean", "u32", "i32", "fixed", "ufixed", "fix8_8", "ufix8_8",
  "fix16_16", "fp5", "float", "bcd",
]);
const ASM_CC = "(?:nz|z|nc|c|po|pe|p|m)";

function parseAsmTransfer(line) {
  const text = String(line || "").replace(/;.*$/, "").trim();
  let match = text.match(new RegExp(`^(call|jp|jr)\\s+(?:${ASM_CC}\\s*,\\s*)?(.+?)\\s*$`, "i"));
  if (match) return { op: lower(match[1]), target: match[2].trim() };
  match = text.match(/^djnz\s+(.+?)\s*$/i);
  if (match) return { op: "djnz", target: match[1].trim() };
  match = text.match(/^rst\s+(.+?)\s*$/i);
  if (match) return { op: "rst", target: match[1].trim() };
  if (/^(?:call|jp|jr|djnz|rst)\b/i.test(text)) return { op: "unknown", target: "" };
  return null;
}

function isProvablyDataOnlyAsmLine(line) {
  const text = String(line || "").replace(/;.*$/, "").trim();
  if (!text) return true;
  if (/^[A-Za-z_.$][A-Za-z0-9_.$]*::?$/i.test(text)) return true;
  if (/^(?:\.?d[bsw]|defb|defw|byte|word)\b/i.test(text)) return true;
  if (/^(?:\.(?:module|globl|global|area|section))\b/i.test(text)) return true;
  if (/^(?:\.?equ\b|[A-Za-z_.$][A-Za-z0-9_.$]*\s+(?:equ|=)\s+)/i.test(text)) return true;
  return false;
}

function includeIsProvablyDataOnly(path, resolveInclude) {
  if (typeof resolveInclude !== "function") return false;
  let source = null;
  try {
    source = resolveInclude(path);
  } catch {
    source = null;
  }
  if (typeof source !== "string") return false;
  return source.split(/\r?\n/).every((line) => isProvablyDataOnlyAsmLine(line));
}

function asmTargetRoutine(target, routines) {
  const match = String(target || "").match(/^(?:AMY_UPROC_)?([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (!match) return null;
  const key = lower(match[1]);
  return routines.has(key) ? key : null;
}

function declaredCustomTypes(lines) {
  const types = new Set();
  for (const rawLine of lines) {
    const text = stripComment(rawLine).trim();
    const aggregate = text.match(/^(?:record|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (aggregate) types.add(lower(aggregate[1]));
    const alias = text.match(/^define\s+([A-Za-z_][A-Za-z0-9_]*)\s+as\s+[A-Za-z_][A-Za-z0-9_]*\b/i);
    if (alias) types.add(lower(alias[1]));
  }
  return types;
}

function hasUnsupportedLocal(routine, customTypes) {
  const knownTypes = new Set([...BUILTIN_TYPES, ...customTypes]);
  for (const line of routine.body) {
    const declaration = line.match(/^(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/i);
    if (!declaration) continue;
    const type = lower(declaration[1]);
    if (!knownTypes.has(type)) continue;
    if (!STATIC_ABI_TYPES.has(type) || /\[/.test(declaration[2])) return true;
  }
  return false;
}

export function analyzeStaticAbiEligibility(sourceLines, options = {}) {
  const lines = Array.isArray(sourceLines) ? sourceLines : String(sourceLines || "").split(/\r?\n/);
  const resolveInclude = typeof options.resolveInclude === "function" ? options.resolveInclude : null;
  const customTypes = declaredCustomTypes(lines);
  const routines = new Map();
  const nmiRoots = new Set();
  let current = null;
  let inAsm = false;
  let opaqueAsm = false;

  const finish = () => { current = null; inAsm = false; };
  for (const rawLine of lines) {
    const text = stripComment(rawLine).trim();
    const sub = text.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(([^)]*)\))?\s*:?$/i);
    const fn = text.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(([^)]*)\))?\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?$/i);
    if (!inAsm && (sub || fn)) {
      const match = sub || fn;
      const name = match[1];
      current = { name, key: lower(name), params: parseParams(match[2]), body: [], asm: [] };
      routines.set(current.key, current);
      continue;
    }
    const hook = !current && text.match(/^on\s+(?:vblank|frame)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (hook) nmiRoots.add(lower(hook[1]));
    if (!current) {
      if (/^asm\s*\{$/i.test(text)) { inAsm = true; continue; }
      if (inAsm) {
        if (text === "}") { inAsm = false; continue; }
        if (parseAsmTransfer(text)) opaqueAsm = true;
        continue;
      }
      const include = text.match(/^include(?:\s+asm)?\s+"([^"]+)"$/i);
      if (include && !includeIsProvablyDataOnly(include[1], resolveInclude)) opaqueAsm = true;
      if (/^call\s+asm\b/i.test(text)) opaqueAsm = true;
      continue;
    }
    if (/^asm\s*\{$/i.test(text)) { inAsm = true; continue; }
    if (inAsm) {
      if (text === "}") { inAsm = false; continue; }
      current.asm.push(text);
      continue;
    }
    const include = text.match(/^include(?:\s+asm)?\s+"([^"]+)"$/i);
    if (include && !includeIsProvablyDataOnly(include[1], resolveInclude)) opaqueAsm = true;
    if (/^call\s+asm\b/i.test(text)) opaqueAsm = true;
    if (/^end\s+(?:sub|function)$/i.test(text)) { finish(); continue; }
    current.body.push(text);
  }

  const graph = new Map([...routines.keys()].map((name) => [name, new Set()]));
  for (const routine of routines.values()) {
    const allSource = routine.body.join("\n");
    for (const target of routines.values()) {
      const mention = new RegExp(`\\b${escapeRegExp(target.name)}\\b`, "i");
      if (mention.test(allSource)) graph.get(routine.key).add(target.key);
    }
    for (const asmLine of routine.asm) {
      const transfer = parseAsmTransfer(asmLine);
      if (!transfer) continue;
      const target = asmTargetRoutine(transfer.target, routines);
      if (target) graph.get(routine.key).add(target);
      else opaqueAsm = true;
    }
  }

  const recursive = new Set();
  for (const start of routines.keys()) {
    const seen = new Set();
    const visit = (node) => {
      for (const next of graph.get(node) || []) {
        if (next === start) return true;
        if (!seen.has(next)) {
          seen.add(next);
          if (visit(next)) return true;
        }
      }
      return false;
    };
    if (visit(start)) recursive.add(start);
  }

  const nmiReachable = new Set();
  const markReachable = (node) => {
    if (!routines.has(node) || nmiReachable.has(node)) return;
    nmiReachable.add(node);
    for (const next of graph.get(node) || []) markReachable(next);
  };
  for (const root of nmiRoots) markReachable(root);

  const eligible = new Set();
  if (!opaqueAsm) {
    for (const routine of routines.values()) {
      const scalarParams = routine.params.every((param) => !param.invalid && !param.isRef && STATIC_ABI_TYPES.has(param.type));
      const unsupportedLocal = hasUnsupportedLocal(routine, customTypes);
      const callsRefRoutine = [...(graph.get(routine.key) || [])].some((target) => routines.get(target)?.params.some((param) => param.isRef));
      if (routine.key !== "start" && scalarParams && !unsupportedLocal && !callsRefRoutine && !recursive.has(routine.key) && !nmiReachable.has(routine.key)) {
        eligible.add(routine.key);
      }
    }
  }

  return { routines, graph, recursive, nmiRoots, nmiReachable, eligible, opaqueAsm };
}
