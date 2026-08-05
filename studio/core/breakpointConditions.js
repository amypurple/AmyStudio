import { formatHex } from "./romDebuggerModel.js";

function parseConditionNumber(value) {
  const source = String(value || "").trim();
  if (/^-?\$[0-9a-f]+$/i.test(source)) {
    const negative = source.startsWith("-");
    return (negative ? -1 : 1) * Number.parseInt(source.replace(/^-?\$/, ""), 16);
  }
  if (/^-?0x[0-9a-f]+$/i.test(source)) return Number.parseInt(source, 16);
  if (/^-?\d+$/.test(source)) return Number.parseInt(source, 10);
  throw new Error(`Invalid breakpoint value "${source}".`);
}

export function parseBreakpointCondition(value) {
  const source = String(value || "").trim();
  if (!source) return null;
  const match = source.match(/^([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]{1,4}|0x[0-9A-Fa-f]{1,4})\s*(<=|>=|<>|!=|=|<|>)\s*(-?(?:\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+|\d+))$/);
  if (!match) throw new Error('Use Score >= 10, Lives = 0, or $712F <> 3.');
  return { operand: match[1], operator: match[2], expected: parseConditionNumber(match[3]) };
}

export function inferAmyScalarTypes(sourceText) {
  const types = new Map();
  for (const rawLine of String(sourceText || "").split(/\r?\n/)) {
    const match = rawLine.replace(/'.*$/, "").trim().match(/^(u8|i8|u16|i16)\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (match) types.set(match[2].toLowerCase(), match[1].toLowerCase());
  }
  return types;
}

function resolveOperand(operand, symbols) {
  if (/^(?:\$|0x)/i.test(operand)) return parseConditionNumber(operand) & 0xFFFF;
  const needle = operand.toLowerCase();
  const exactNames = new Set([needle, `amy_uvar_${needle}`]);
  const exact = symbols.find((entry) => exactNames.has(entry.name.toLowerCase()));
  if (exact) return exact.address;
  const suffixMatches = symbols.filter((entry) => entry.name.toLowerCase().endsWith(`_${needle}`));
  if (suffixMatches.length === 1) return suffixMatches[0].address;
  if (suffixMatches.length > 1) throw new Error(`Variable "${operand}" is ambiguous; use its full memory-map symbol.`);
  throw new Error(`Variable "${operand}" has no addressable RAM symbol.`);
}

function compare(actual, operator, expected) {
  if (operator === "=") return actual === expected;
  if (operator === "<>" || operator === "!=") return actual !== expected;
  if (operator === "<") return actual < expected;
  if (operator === "<=") return actual <= expected;
  if (operator === ">") return actual > expected;
  return operator === ">=" && actual >= expected;
}

export function evaluateBreakpointCondition({ condition, valueType = "auto", symbols = [], sourceText = "", readMemory }) {
  const parsed = parseBreakpointCondition(condition);
  if (!parsed) return { matched: true, unconditional: true };
  if (typeof readMemory !== "function") throw new Error("Conditional breakpoint memory reader is unavailable.");
  const operandName = /^[A-Za-z_]/.test(parsed.operand) ? parsed.operand.toLowerCase() : "";
  const resolvedType = valueType === "auto" ? (inferAmyScalarTypes(sourceText).get(operandName) || "u8") : valueType;
  if (!/^[ui](?:8|16)$/.test(resolvedType)) throw new Error(`Unsupported breakpoint type "${resolvedType}".`);
  const width = resolvedType.endsWith("16") ? 2 : 1;
  const address = resolveOperand(parsed.operand, symbols);
  const bytes = readMemory(address, width);
  if (!(bytes instanceof Uint8Array) || bytes.length < width) throw new Error(`Cannot read ${formatHex(address)}.`);
  let actual = width === 2 ? bytes[0] | (bytes[1] << 8) : bytes[0];
  if (resolvedType.startsWith("i")) {
    const sign = width === 2 ? 0x8000 : 0x80;
    if (actual & sign) actual -= width === 2 ? 0x10000 : 0x100;
  }
  return {
    matched: compare(actual, parsed.operator, parsed.expected),
    actual,
    expected: parsed.expected,
    operator: parsed.operator,
    address,
    valueType: resolvedType
  };
}
