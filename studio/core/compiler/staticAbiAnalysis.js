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

export function analyzeStaticAbiEligibility(sourceLines) {
  const lines = Array.isArray(sourceLines) ? sourceLines : String(sourceLines || "").split(/\r?\n/);
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
        if (/\b(?:call|jp)\s*\((?:hl|ix|iy)\)/i.test(text)) opaqueAsm = true;
        if (/^\s*(?:call|jp)\s+AMY_UPROC_[A-Za-z_][A-Za-z0-9_]*\b/i.test(text)) opaqueAsm = true;
        continue;
      }
      if (/^include\s+asm\b|^call\s+asm\b/i.test(text)) opaqueAsm = true;
      continue;
    }
    if (/^asm\s*\{$/i.test(text)) { inAsm = true; continue; }
    if (inAsm) {
      if (text === "}") { inAsm = false; continue; }
      current.asm.push(text);
      if (/\b(?:call|jp)\s*\((?:hl|ix|iy)\)/i.test(text)) opaqueAsm = true;
      continue;
    }
    if (/^include\s+asm\b|^call\s+asm\b/i.test(text)) opaqueAsm = true;
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
      const direct = asmLine.match(/^\s*(?:call|jp)\s+(?:AMY_UPROC_)?([A-Za-z_][A-Za-z0-9_]*)\b/i);
      if (!direct) continue;
      const target = lower(direct[1]);
      if (routines.has(target)) graph.get(routine.key).add(target);
    }
  }

  const recursive = new Set();
  for (const start of routines.keys()) {
    const seen = new Set();
    const visit = (node) => {
      for (const next of graph.get(node) || []) {
        if (next === start) return true;
        if (!seen.has(next)) { seen.add(next); if (visit(next)) return true; }
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
      const scalarParams = routine.params.every((param) => !param.invalid && !param.isRef && /^(?:u8|i8|u16|i16)$/.test(param.type));
      const hasAggregateLocal = routine.body.some((line) => /^(?:local\s+)?(?:u8|i8|u16|i16|bool|boolean|u32|i32|fixed|ufixed|fix8_8|ufix8_8|fix16_16|fp5|float|bcd)\s+[A-Za-z_][A-Za-z0-9_]*\s*\[/i.test(line));
      const hasUnsupportedLocal = routine.body.some((line) => /^(?:local\s+)?(?:bool|boolean|u32|i32|fixed|ufixed|fix8_8|ufix8_8|fix16_16|fp5|float|bcd)\b/i.test(line));
      const callsRefRoutine = [...(graph.get(routine.key) || [])].some((target) => routines.get(target)?.params.some((param) => param.isRef));
      if (routine.key !== "start" && scalarParams && !hasAggregateLocal && !hasUnsupportedLocal && !callsRefRoutine && !recursive.has(routine.key) && !nmiReachable.has(routine.key)) {
        eligible.add(routine.key);
      }
    }
  }

  return { routines, graph, recursive, nmiRoots, nmiReachable, eligible, opaqueAsm };
}
