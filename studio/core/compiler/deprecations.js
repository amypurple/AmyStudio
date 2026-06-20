// Tier-1 statement deprecations.
// Each entry: { pattern, rewriteTemplate?, rewrite(match)->string, error(match, rawLine)->string }
// rewriteTemplate: JS replace()-compatible string ($1/$2 groups) for simple linear rewrites.
// rewrite(match): function producing the canonical replacement line.

const V = String.raw`[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?`;
const N = String.raw`[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?|\$[0-9A-Fa-f]+|[0-9]+`;

// ── Arithmetic statement forms ───────────────────────────────────────────────

export const ARITHMETIC_STATEMENT_DEPRECATIONS = [
  // add X by N  →  X += N
  {
    pattern: new RegExp(`^add\\s+(${V})\\s+by\\s+(.+)$`, "i"),
    rewriteTemplate: "$1 += $2",
    rewrite: (m) => `${m[1]} += ${m[2]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} += ${m[2]}'`
  },
  // add N to X  →  X += N
  {
    pattern: new RegExp(`^add\\s+(.+)\\s+to\\s+(${V})$`, "i"),
    rewriteTemplate: "$2 += $1",
    rewrite: (m) => `${m[2]} += ${m[1]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} += ${m[1]}'`
  },
  // sub X by N  →  X -= N
  {
    pattern: new RegExp(`^sub\\s+(${V})\\s+by\\s+(.+)$`, "i"),
    rewriteTemplate: "$1 -= $2",
    rewrite: (m) => `${m[1]} -= ${m[2]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} -= ${m[2]}'`
  },
  // subtract N from X  →  X -= N
  {
    pattern: new RegExp(`^subtract\\s+(.+)\\s+from\\s+(${V})$`, "i"),
    rewriteTemplate: "$2 -= $1",
    rewrite: (m) => `${m[2]} -= ${m[1]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} -= ${m[1]}'`
  },
  // multiply/mul X by N  →  X *= N
  {
    pattern: new RegExp(`^(?:multiply|mul)\\s+(${V})\\s+by\\s+(${N})$`, "i"),
    rewriteTemplate: "$1 *= $2",
    rewrite: (m) => `${m[1]} *= ${m[2]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} *= ${m[2]}'`
  },
  // divide/div X by N  →  X /= N
  {
    pattern: new RegExp(`^(?:divide|div)\\s+(${V})\\s+by\\s+(${N})$`, "i"),
    rewriteTemplate: "$1 /= $2",
    rewrite: (m) => `${m[1]} /= ${m[2]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} /= ${m[2]}'`
  },
];

// ── Shift statement forms ────────────────────────────────────────────────────

export const SHIFT_DEPRECATIONS = [
  // shl/shift left X  →  X <<= 1
  {
    pattern: /^(?:shift\s+left|shl)\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewriteTemplate: "$1 <<= 1",
    rewrite: (m) => `${m[1]} <<= 1`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} <<= 1'`
  },
  // shr/shift right X  →  X >>= 1
  {
    pattern: /^(?:shift\s+right|shr)\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewriteTemplate: "$1 >>= 1",
    rewrite: (m) => `${m[1]} >>= 1`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} >>= 1'`
  },
  // shl/shift left X by N  →  X <<= N
  {
    pattern: /^(?:shift\s+left|shl)\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+([1-7])$/i,
    rewriteTemplate: "$1 <<= $2",
    rewrite: (m) => `${m[1]} <<= ${m[2]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} <<= ${m[2]}'`
  },
  // shr/shift right X by N  →  X >>= N
  {
    pattern: /^(?:shift\s+right|shr)\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+([1-7])$/i,
    rewriteTemplate: "$1 >>= $2",
    rewrite: (m) => `${m[1]} >>= ${m[2]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} >>= ${m[2]}'`
  },
];

// ── Declaration forms ────────────────────────────────────────────────────────

export const DECLARATION_DEPRECATIONS = [
  // let/var Name = Expr  →  const Name = Expr
  {
    pattern: /^(let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i,
    rewriteTemplate: "const $2 = $3",
    rewrite: (m) => `const ${m[2]} = ${m[3]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use 'const ${m[2]} = ${m[3].trim()}'`
  },
  // dim/ram/local Type ...  →  Type ...
  {
    pattern: /^(dim|ram|local)\s+(.+)$/i,
    rewriteTemplate: "$2",
    rewrite: (m) => m[2],
    error:   (m, raw) => `'${m[1]}' prefix was removed; use '${m[2].trim()}'`
  },
  // boolean Type usage  →  bool
  {
    pattern: /^boolean\s+(.+)$/i,
    rewriteTemplate: "bool $1",
    rewrite: (m) => `bool ${m[1]}`,
    error:   (m, raw) => `'boolean' was removed; use 'bool ${m[1].trim()}'`
  },
  // bcd N Name (byte-count form, no 'digits' keyword)  →  bcd digits (N*2) Name
  {
    pattern: /^bcd\s+(?!digits\b)([1-9]|1[012])\s+(.+)$/i,
    rewrite: (m) => `bcd digits ${parseInt(m[1], 10) * 2} ${m[2]}`,
    error:   (m, raw) => `'${raw.trim()}' was removed; use 'bcd digits ${parseInt(m[1], 10) * 2} ${m[2].trim()}'`
  },
];

// ── Array bulk forms ─────────────────────────────────────────────────────────

export const ARRAY_BULK_DEPRECATIONS = [
  // copy array Dst from Src [count N]  →  copy Src [count N] to Dst
  {
    pattern: /^copy\s+array\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+count\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?$/i,
    rewrite: (m) => m[3] ? `copy ${m[2]} count ${m[3]} to ${m[1]}` : `copy ${m[2]} to ${m[1]}`,
    error:   (m, raw) => {
      const canonical = m[3] ? `copy ${m[2]} count ${m[3]} to ${m[1]}` : `copy ${m[2]} to ${m[1]}`;
      return `'${raw.trim()}' was removed; use '${canonical}'`;
    }
  },
];

// ── Generic dispatcher ───────────────────────────────────────────────────────

function checkDeprecationTable(table, line, rawLine) {
  for (const dep of table) {
    const m = line.match(dep.pattern);
    if (m) return { handled: true, ok: false, log: dep.error(m, rawLine) };
  }
  return { handled: false };
}

export function checkArithmeticDeprecation(line, rawLine) {
  return checkDeprecationTable(ARITHMETIC_STATEMENT_DEPRECATIONS, line, rawLine);
}

export function checkShiftDeprecation(line, rawLine) {
  return checkDeprecationTable(SHIFT_DEPRECATIONS, line, rawLine);
}

export function checkDeclarationDeprecation(line, rawLine) {
  return checkDeprecationTable(DECLARATION_DEPRECATIONS, line, rawLine);
}

export function checkArrayBulkDeprecation(line, rawLine) {
  return checkDeprecationTable(ARRAY_BULK_DEPRECATIONS, line, rawLine);
}

// ── Control-flow closers and aliases ─────────────────────────────────────────

export const IF_DEPRECATIONS = [
  // endif → end if
  {
    pattern: /^endif$/i,
    rewriteTemplate: "end if",
    rewrite: () => "end if",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'end if'`
  },
];

export const WHILE_DEPRECATIONS = [
  // wend → end while
  {
    pattern: /^wend$/i,
    rewriteTemplate: "end while",
    rewrite: () => "end while",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'end while'`
  },
];

export const FOR_DEPRECATIONS = [
  // end for → next
  {
    pattern: /^end\s+for$/i,
    rewriteTemplate: "next",
    rewrite: () => "next",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'next'`
  },
  // for I from A to B → for I = A to B
  {
    pattern: /^(for\s+[A-Za-z_][A-Za-z0-9_]*)\s+from\s+(.+\sto\s.+)$/i,
    rewriteTemplate: "$1 = $2",
    rewrite: (m) => `${m[1]} = ${m[2]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} = ${m[2]}'`
  },
];

export const DO_DEPRECATIONS = [
  // end do → loop
  {
    pattern: /^end\s+do$/i,
    rewriteTemplate: "loop",
    rewrite: () => "loop",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'loop'`
  },
];

export const FUNCTION_CLOSER_DEPRECATIONS = [
  // end function → remove it; function ends with return Value
  {
    pattern: /^end\s+function$/i,
    rewriteTemplate: "",
    rewrite: () => "",
    error: (m, raw) => `'${raw.trim()}' was removed; end functions with 'return Value'`
  },
];

export const SELECT_DEPRECATIONS = [
  // endselect → end select
  {
    pattern: /^endselect$/i,
    rewriteTemplate: "end select",
    rewrite: () => "end select",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'end select'`
  },
  // case default → case else
  {
    pattern: /^case\s+default\s*:?\s*$/i,
    rewriteTemplate: "case else",
    rewrite: () => "case else",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'case else'`
  },
  // default → case else
  {
    pattern: /^default\s*:?\s*$/i,
    rewriteTemplate: "case else",
    rewrite: () => "case else",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'case else'`
  },
];

export const DATA_DEPRECATIONS = [
  // enddata → end data
  {
    pattern: /^enddata$/i,
    rewriteTemplate: "end data",
    rewrite: () => "end data",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'end data'`
  },
];

export const LABEL_DEPRECATIONS = [
  // label Name: → Name:
  {
    pattern: /^label\s+([A-Za-z_][A-Za-z0-9_]*):?$/i,
    rewriteTemplate: "$1:",
    rewrite: (m) => `${m[1]}:`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]}:'`
  },
];

export const VRAM_PIXEL_DEPRECATIONS = [
  // plot X,Y [color C] → pset X,Y [color C]
  {
    pattern: /^plot\s+(.+?)\s*,\s*(.+?)(?:\s+color\s+(.+))?$/i,
    rewrite: (m) => m[3] ? `pset ${m[1]},${m[2]} color ${m[3]}` : `pset ${m[1]},${m[2]}`,
    error: (m, raw) => {
      const canonical = m[3] ? `pset ${m[1]},${m[2]} color ${m[3]}` : `pset ${m[1]},${m[2]}`;
      return `'${raw.trim()}' was removed; use '${canonical}'`;
    }
  },
];

export const DISPLAY_GRAPHICS_DEPRECATIONS = [
  // graphics mode1 (no-space, no qualifier) → bitmap screen
  {
    pattern: /^graphics\s+mode1$/i,
    rewriteTemplate: "bitmap screen",
    rewrite: () => "bitmap screen",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'bitmap screen'`
  },
  // graphics bitmap (no mode number) → picture screen
  {
    pattern: /^graphics\s+bitmap$/i,
    rewriteTemplate: "picture screen",
    rewrite: () => "picture screen",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'picture screen'`
  },
  // graphics mode bitmap (with 'mode', no number) → picture screen
  {
    pattern: /^graphics\s+mode\s+bitmap$/i,
    rewriteTemplate: "picture screen",
    rewrite: () => "picture screen",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'picture screen'`
  },
  // disable nmi → nmi off
  {
    pattern: /^disable\s+nmi$/i,
    rewriteTemplate: "nmi off",
    rewrite: () => "nmi off",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'nmi off'`
  },
  // enable nmi → nmi on
  {
    pattern: /^enable\s+nmi$/i,
    rewriteTemplate: "nmi on",
    rewrite: () => "nmi on",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'nmi on'`
  },
  // initialize mode 2 text color with X → fill mode 2 text color with X
  {
    pattern: /^initialize\s+mode\s*2\s+text\s+color\s+with\s+(.+)$/i,
    rewrite: (m) => `fill mode 2 text color with ${m[1]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use 'fill mode 2 text color with ${m[1].trim()}'`
  },
  // fill mode2 text color (no space around 2) → fill mode 2 text color with X
  {
    pattern: /^fill\s+mode2\s+text\s+color\s+with\s+(.+)$/i,
    rewrite: (m) => `fill mode 2 text color with ${m[1]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use 'fill mode 2 text color with ${m[1].trim()}'`
  },
  // initialize full mode 2 text color with X → fill full mode 2 text color with X
  {
    pattern: /^initialize\s+full\s+mode\s*2\s+text\s+color\s+with\s+(.+)$/i,
    rewrite: (m) => `fill full mode 2 text color with ${m[1]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use 'fill full mode 2 text color with ${m[1].trim()}'`
  },
  // fill full mode2 text color (no space) → fill full mode 2 text color with X
  {
    pattern: /^fill\s+full\s+mode2\s+text\s+color\s+with\s+(.+)$/i,
    rewrite: (m) => `fill full mode 2 text color with ${m[1]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use 'fill full mode 2 text color with ${m[1].trim()}'`
  },
  // duplicate mode*2 text pattern thirds → duplicate mode 2 text patterns
  {
    pattern: /^duplicate\s+mode\s*2\s+text\s+pattern\s+thirds$/i,
    rewriteTemplate: "duplicate mode 2 text patterns",
    rewrite: () => "duplicate mode 2 text patterns",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'duplicate mode 2 text patterns'`
  },
  // duplicate mode2 text patterns (no space) → duplicate mode 2 text patterns
  {
    pattern: /^duplicate\s+mode2\s+text\s+patterns$/i,
    rewriteTemplate: "duplicate mode 2 text patterns",
    rewrite: () => "duplicate mode 2 text patterns",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'duplicate mode 2 text patterns'`
  },
];

export const SOUND_DEPRECATIONS = [
  // stop all sound → mute all
  {
    pattern: /^stop\s+all\s+sound$/i,
    rewriteTemplate: "mute all",
    rewrite: () => "mute all",
    error: (m, raw) => `'${raw.trim()}' was removed; use 'mute all'`
  },
  // wait vblanks N → wait N frames
  {
    pattern: /^wait\s+vblanks?\s+(.+)$/i,
    rewriteTemplate: "wait $1 frames",
    rewrite: (m) => `wait ${m[1]} frames`,
    error: (m, raw) => `'${raw.trim()}' was removed; use 'wait ${m[1].trim()} frames'`
  },
];

// rem comment → ' comment  (warn-only: warnOnly: true)
export const REM_DEPRECATION = {
  pattern: /^rem(?:\s|$)/i,
  warnOnly: true,
  rewrite: (raw) => {
    const rest = raw.trim().slice(3).trimStart();
    return rest ? `' ${rest}` : `'`;
  },
  error: (raw) => `'rem' was removed; use a single-quote comment (')`
};

export function checkDataDeprecation(line, rawLine) {
  return checkDeprecationTable(DATA_DEPRECATIONS, line, rawLine);
}

export function checkIfDeprecation(line, rawLine) {
  return checkDeprecationTable(IF_DEPRECATIONS, line, rawLine);
}

export function checkWhileDeprecation(line, rawLine) {
  return checkDeprecationTable(WHILE_DEPRECATIONS, line, rawLine);
}

export function checkForDeprecation(line, rawLine) {
  return checkDeprecationTable(FOR_DEPRECATIONS, line, rawLine);
}

export function checkDoDeprecation(line, rawLine) {
  return checkDeprecationTable(DO_DEPRECATIONS, line, rawLine);
}

export function checkSelectDeprecation(line, rawLine) {
  return checkDeprecationTable(SELECT_DEPRECATIONS, line, rawLine);
}

export function checkLabelDeprecation(line, rawLine) {
  return checkDeprecationTable(LABEL_DEPRECATIONS, line, rawLine);
}

export function checkVramPixelDeprecation(line, rawLine) {
  return checkDeprecationTable(VRAM_PIXEL_DEPRECATIONS, line, rawLine);
}

export function checkDisplayGraphicsDeprecation(line, rawLine) {
  return checkDeprecationTable(DISPLAY_GRAPHICS_DEPRECATIONS, line, rawLine);
}

export function checkSoundDeprecation(line, rawLine) {
  return checkDeprecationTable(SOUND_DEPRECATIONS, line, rawLine);
}

// ── Random legacy statement forms ────────────────────────────────────────────

export const RANDOM_STATEMENT_DEPRECATIONS = [
  // random between A and B into Var → Var = random(A, B)
  {
    pattern: /^random\s+between\s+(.+?)\s+and\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[3]} = random(${m[1]}, ${m[2]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[3]} = random(${m[1]}, ${m[2]})'`
  },
  // random fixed32 into Var → Var = random()
  {
    pattern: /^random\s+fixed32\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[1]} = random()`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} = random()'`
  },
  // random fp5 into Var / random float into Var → Var = random()
  {
    pattern: /^random\s+(?:fp5|float)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[1]} = random()`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} = random()'`
  },
  // rnd [fp5|float] into Var → Var = random()
  {
    pattern: /^rnd(?:\s+(?:fp5|float))?\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[1]} = random()`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} = random()'`
  },
];

export function checkRandomStatementDeprecation(line, rawLine) {
  return checkDeprecationTable(RANDOM_STATEMENT_DEPRECATIONS, line, rawLine);
}

// ── Math '... into' statement forms ─────────────────────────────────────────

export const MATH_INTO_DEPRECATIONS = [
  // sqrt V into X  →  X = sqrt(V)
  {
    pattern: /^sqrt\s+(?!word\b)(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[2]} = sqrt(${m[1]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} = sqrt(${m[1]})'`
  },
  // sqr V into X  →  X = sqrt(V)
  {
    pattern: /^sqr\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[2]} = sqrt(${m[1]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} = sqrt(${m[1]})'`
  },
  // abs V into X  →  X = abs(V)
  {
    pattern: /^abs\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[2]} = abs(${m[1]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} = abs(${m[1]})'`
  },
  // sgn V into X  →  X = sgn(V)
  {
    pattern: /^sgn\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[2]} = sgn(${m[1]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} = sgn(${m[1]})'`
  },
  // int V into X  →  X = int(V)
  {
    pattern: /^int\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[2]} = int(${m[1]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} = int(${m[1]})'`
  },
  // log V into X  →  X = log(V)
  {
    pattern: /^log\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[2]} = log(${m[1]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} = log(${m[1]})'`
  },
  // exp V into X  →  X = exp(V)
  {
    pattern: /^exp\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[2]} = exp(${m[1]})`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[2]} = exp(${m[1]})'`
  },
  // str$ V into Buf [digits N]  →  Buf = str$(V[, digits N])
  {
    pattern: /^str\$\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+digits\s+([0-9]+))?$/i,
    rewrite: (m) => m[3] ? `${m[2]} = str$(${m[1]}, digits ${m[3]})` : `${m[2]} = str$(${m[1]})`,
    error: (m, raw) => {
      const canon = m[3] ? `${m[2]} = str$(${m[1]}, digits ${m[3]})` : `${m[2]} = str$(${m[1]})`;
      return `'${raw.trim()}' was removed; use '${canon}'`;
    }
  },
];

export function checkMathIntoDeprecation(line, rawLine) {
  return checkDeprecationTable(MATH_INTO_DEPRECATIONS, line, rawLine);
}

// ── VRAM char read: statement 'into' forms and 'read'/'tile' verb/noun aliases ─

export const VRAM_CHAR_READ_DEPRECATIONS = [
  // get char at X,Y into V  →  V = get char at X,Y
  {
    pattern: /^get\s+char\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[3]} = get char at ${m[1]},${m[2]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[3]} = get char at ${m[1].trim()},${m[2].trim()}'`
  },
  // get tile at X,Y into V  →  V = get char at X,Y
  {
    pattern: /^get\s+tile\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[3]} = get char at ${m[1]},${m[2]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[3]} = get char at ${m[1].trim()},${m[2].trim()}'`
  },
  // read char at X,Y into V  →  V = get char at X,Y
  {
    pattern: /^read\s+char\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[3]} = get char at ${m[1]},${m[2]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[3]} = get char at ${m[1].trim()},${m[2].trim()}'`
  },
  // read tile at X,Y into V  →  V = get char at X,Y
  {
    pattern: /^read\s+tile\s+at\s+(.+?)\s*,\s*(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i,
    rewrite: (m) => `${m[3]} = get char at ${m[1]},${m[2]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[3]} = get char at ${m[1].trim()},${m[2].trim()}'`
  },
  // Var = read char at X,Y  →  Var = get char at X,Y
  {
    pattern: /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*read\s+char\s+at\s+(.+?)\s*,\s*(.+)$/i,
    rewrite: (m) => `${m[1]} = get char at ${m[2]},${m[3]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} = get char at ${m[2].trim()},${m[3].trim()}'`
  },
  // Var = get tile at X,Y  →  Var = get char at X,Y
  {
    pattern: /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*get\s+tile\s+at\s+(.+?)\s*,\s*(.+)$/i,
    rewrite: (m) => `${m[1]} = get char at ${m[2]},${m[3]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} = get char at ${m[2].trim()},${m[3].trim()}'`
  },
  // Var = read tile at X,Y  →  Var = get char at X,Y
  {
    pattern: /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*read\s+tile\s+at\s+(.+?)\s*,\s*(.+)$/i,
    rewrite: (m) => `${m[1]} = get char at ${m[2]},${m[3]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use '${m[1]} = get char at ${m[2].trim()},${m[3].trim()}'`
  },
];

export function checkVramCharReadDeprecation(line, rawLine) {
  return checkDeprecationTable(VRAM_CHAR_READ_DEPRECATIONS, line, rawLine);
}

// ── VRAM put reorder forms ───────────────────────────────────────────────────

export const VRAM_PUT_REORDER_DEPRECATIONS = [
  // put chars Buf at X,Y count N  →  put Buf count N at X,Y
  {
    pattern: /^put\s+chars\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+(.+?)\s*,\s*(.+?)\s+count\s+(.+)$/i,
    rewrite: (m) => `put ${m[1]} count ${m[4]} at ${m[2]},${m[3]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use 'put ${m[1]} count ${m[4].trim()} at ${m[2].trim()},${m[3].trim()}'`
  },
  // put at X,Y Buf count N  →  put Buf count N at X,Y
  {
    pattern: /^put\s+at\s+(.+?)\s*,\s*(.+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s+count\s+(.+)$/i,
    rewrite: (m) => `put ${m[3]} count ${m[4]} at ${m[1]},${m[2]}`,
    error: (m, raw) => `'${raw.trim()}' was removed; use 'put ${m[3]} count ${m[4].trim()} at ${m[1].trim()},${m[2].trim()}'`
  },
  // put tile X at Y,Z  →  put char X at Y,Z
  {
    pattern: /^put\s+tile\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+)$/i,
    rewrite: (m) => `put char ${m[1]} at ${m[2]},${m[3]}`,
    error: (m, raw) => `'put tile' was removed; use 'put char ${m[1].trim()} at ${m[2].trim()},${m[3].trim()}'`
  },
];

export function checkVramPutReorderDeprecation(line, rawLine) {
  return checkDeprecationTable(VRAM_PUT_REORDER_DEPRECATIONS, line, rawLine);
}
