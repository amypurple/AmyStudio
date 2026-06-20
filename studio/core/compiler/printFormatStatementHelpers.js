import { checkMathIntoDeprecation } from "./deprecations.js";

export function handlePrintFormatStatement({
  line,
  rawLine,
  body,
  addCompilerWarning,
  splitTopLevelArgs,
  normalizeExpression,
  resolveDeclaredValueType,
  emitPrintAtDense,
  emitTextExpressionIntoBuffer,
  emitPrintLiteralAt,
  emitPrintAutoAt,
  emitPrintHexAt,
  emitPrintI8At,
  emitFormatAutoIntoBuffer,
  emitFormatHexIntoBuffer,
  emitFormatFp5FriendlyIntoBuffer,
  emitFormatBcdIntoBuffer,
  emitFormatI8IntoBuffer,
  emitFormatU32IntoBuffer,
  emitFormatI32IntoBuffer,
  emitPrintI16At,
  emitPrintU32At,
  emitPrintI32At,
  emitFormatI16IntoBuffer,
  emitPrintFix8_8At,
  emitFormatFix8_8IntoBuffer,
  emitSqrtInt16Into,
  emitSqrtFx16Into,
  emitSqrtFp5Into,
  emitLogFp5Into,
  emitExpFp5Into,
  emitAbsFx16Into,
  emitAbsFp5Into,
  emitSgnFx16Into,
  emitSgnInt16LikeInto,
  emitSgnFp5Into,
  emitIntFp5Into,
  emitU32Zero,
  emitU32Copy,
  emitU32Add,
  emitU32Inc,
  emitU32Sub,
  emitBcdAdd,
  emitBcdSub,
  emitClearValue,
  emitBcdClear,
  emitBcdCopy,
  emitBcdPrint
}) {
  const _depMath = checkMathIntoDeprecation(line, rawLine);
  if (_depMath.handled) return _depMath;

  function isFp5DeclaredType(type) {
    const lowered = String(type || "").trim().toLowerCase();
    return lowered === "float" || lowered === "fp5";
  }

  function getFloatDigitsError(valueToken, modeToken, digitsToken, context) {
    const mode = String(modeToken || "").toLowerCase();
    if (mode !== "digits") return null;
    const digits = Number.parseInt(String(digitsToken || ""), 10);
    if (!Number.isInteger(digits) || digits === 16) return null;
    const declaredType = resolveDeclaredValueType(valueToken);
    if (!isFp5DeclaredType(declaredType)) return null;
    return `fp5 formatting currently supports only digits 16. Offending line: ${context}`;
  }

  function warnLegacyInto(preferred) {
    addCompilerWarning?.(`Prefer "${preferred}" instead of "${rawLine}".`);
  }

  const printCenteredLiteral = rawLine.match(/^\s*print\s+centered\s+at\s+(.+?)\s*,\s*"([^"]*)"\s*$/i);
  if (printCenteredLiteral) {
    const yToken = printCenteredLiteral[1].trim();
    const literalText = printCenteredLiteral[2];
    if (literalText.length > 32) {
      return { handled: true, ok: false, log: `print centered literal is ${literalText.length} chars; maximum line width is 32: ${rawLine}` };
    }
    const x = Math.ceil((32 - literalText.length) / 2);
    const printed = emitPrintLiteralAt(literalText, String(x), yToken);
    if (!printed) {
      return { handled: true, ok: false, log: `print centered requires a byte-sized Y coordinate and a string literal: ${rawLine}` };
    }
    body.push(...printed.lines);
    return { handled: true, ok: true };
  }

  if (/^print\s+at\s+/i.test(line)) {
    const argText = line.replace(/^print\s+at\s+/i, "");
    const parts = splitTopLevelArgs(argText).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) {
      return { handled: true, ok: false, log: `print at requires X, Y, and at least one item: ${rawLine}` };
    }
    const code = emitPrintAtDense(parts[0], parts[1], parts.slice(2));
    if (!code) {
      return {
        handled: true,
        ok: false,
        log: `print at requires byte-sized coordinates plus string literals or supported typed values: ${rawLine}`
      };
    }
    body.push(...code);
    return { handled: true, ok: true };
  }

  const textAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i);
  if (textAssign) {
    const textCode = emitTextExpressionIntoBuffer(textAssign[2], textAssign[1]);
    if (textCode) {
      body.push(...textCode.lines);
      return { handled: true, ok: true };
    }
  }

  const printAt = rawLine.match(/^\s*print\s+"([^"]*)"\s+at\s+(.+?)\s*,\s*(.+?)\s*$/i);
  if (printAt) {
    const printed = emitPrintLiteralAt(printAt[1], printAt[2], printAt[3]);
    if (!printed) {
      return { handled: true, ok: false, log: `print requires u8-sized screen coordinates or constant expressions: ${rawLine}` };
    }
    body.push(...printed.lines);
    return { handled: true, ok: true };
  }

  const printHexAt = line.match(/^print\s+hex\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+?)$/i);
  if (printHexAt) {
    const code = emitPrintHexAt(normalizeExpression(printHexAt[1]), printHexAt[2], printHexAt[3]);
    if (!code) {
      return {
        handled: true,
        ok: false,
        log: `print hex requires a supported scalar value and u8 coordinates: ${rawLine}`
      };
    }
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printAutoAt = line.match(/^print\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+?)(?:\s+(digits|width)\s+([0-9]+))?$/i);
  if (printAutoAt) {
    const floatDigitsError = getFloatDigitsError(normalizeExpression(printAutoAt[1]), printAutoAt[4], printAutoAt[5], rawLine);
    if (floatDigitsError) {
      return { handled: true, ok: false, log: floatDigitsError };
    }
    const mode = (printAutoAt[4] || "").toLowerCase();
    const code = emitPrintAutoAt(normalizeExpression(printAutoAt[1]), printAutoAt[2], printAutoAt[3], printAutoAt[5] || null, mode === "width");
    if (!code) {
      return {
        handled: true,
        ok: false,
        log: `print requires a supported typed value, u8 coordinates, and valid optional digits/width: ${rawLine}`
      };
    }
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printByteAt = line.match(/^print\s+byte\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)(?:\s+digits\s+([123]))?$/i);
  if (printByteAt) {
    return { handled: true, ok: false, log: `Legacy 'print byte' is no longer supported. Use canonical declarations plus 'print Value at X,Y digits N'. Offending line: ${rawLine}` };
  }

  const printWordAt = line.match(/^print\s+word\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)(?:\s+digits\s+([1-5]))?$/i);
  if (printWordAt) {
    return { handled: true, ok: false, log: `Legacy 'print word' is no longer supported. Use canonical declarations plus 'print Value at X,Y digits N'. Offending line: ${rawLine}` };
  }

  const printI8At = line.match(/^print\s+i8\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)(?:\s+digits\s+([2-4]))?$/i);
  if (printI8At) {
    const code = emitPrintI8At(printI8At[1], printI8At[2], printI8At[3], printI8At[4] || "4");
    if (!code) return { handled: true, ok: false, log: `print i8 requires an i8 variable, u8 coordinates, and digits 2-4: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatHex = line.match(/^format\s+hex\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (formatHex) {
    const code = emitFormatHexIntoBuffer(normalizeExpression(formatHex[1]), formatHex[2]);
    if (!code) {
      return {
        handled: true,
        ok: false,
        log: `format hex requires a supported scalar value and a large enough u8 buffer: ${rawLine}`
      };
    }
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatAuto = line.match(/^format\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(digits|width)\s+([0-9]+))?$/i);
  if (formatAuto) {
    const floatDigitsError = getFloatDigitsError(normalizeExpression(formatAuto[1]), formatAuto[3], formatAuto[4], rawLine);
    if (floatDigitsError) {
      return { handled: true, ok: false, log: floatDigitsError };
    }
    const mode = (formatAuto[3] || "").toLowerCase();
    const code = emitFormatAutoIntoBuffer(normalizeExpression(formatAuto[1]), formatAuto[2], formatAuto[4] || null, mode === "width");
    if (!code) {
      return {
        handled: true,
        ok: false,
        log: `format requires a supported typed value, a u8 buffer, and valid optional digits/width: ${rawLine}`
      };
    }
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatWord = line.match(/^format\s+word\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)\s+digits\s+([1-5])$/i);
  if (formatWord) {
    return { handled: true, ok: false, log: `Legacy 'format word' is no longer supported. Use canonical declarations plus 'format Value into Buffer digits N'. Offending line: ${rawLine}` };
  }

  const formatBcd = line.match(/^format\s+bcd\s+([A-Za-z_][A-Za-z0-9_]*)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (formatBcd) {
    const code = emitFormatBcdIntoBuffer(formatBcd[1], formatBcd[2]);
    if (!code) return { handled: true, ok: false, log: `legacy format bcd requires a BCD variable and a u8 buffer of matching digit length. Prefer 'format Value into Buffer': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatI8 = line.match(/^format\s+i8\s+([A-Za-z_][A-Za-z0-9_]*)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)\s+digits\s+([2-4])$/i);
  if (formatI8) {
    const code = emitFormatI8IntoBuffer(formatI8[1], formatI8[2], formatI8[3]);
    if (!code) return { handled: true, ok: false, log: `legacy format i8 requires an i8 variable, a u8 buffer, and digits 2-4. Prefer 'format Value into Buffer digits N': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatU32 = line.match(/^format\s+u32\s+([A-Za-z_][A-Za-z0-9_]*)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (formatU32) {
    const code = emitFormatU32IntoBuffer(formatU32[1], formatU32[2]);
    if (!code) return { handled: true, ok: false, log: `legacy format u32 requires a u32 value or 4-u8 array source and a 10-u8 buffer. Prefer 'format Value into Buffer': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatI32 = line.match(/^format\s+i32\s+([A-Za-z_][A-Za-z0-9_]*)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)\s+digits\s+([2-9]|10|11)$/i);
  if (formatI32) {
    const code = emitFormatI32IntoBuffer(formatI32[1], formatI32[2], formatI32[3]);
    if (!code) return { handled: true, ok: false, log: `legacy format i32 requires an i32 variable, a u8 buffer, and digits 2-11. Prefer 'format Value into Buffer digits N': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printI16At = line.match(/^print\s+i16\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)(?:\s+digits\s+([2-6]))?$/i);
  if (printI16At) {
    const code = emitPrintI16At(printI16At[1], printI16At[2], printI16At[3], printI16At[4] || "6");
    if (!code) return { handled: true, ok: false, log: `print i16 requires an i16 variable, u8 coordinates, and digits 2-6: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printU32At = line.match(/^print\s+u32\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)$/i);
  if (printU32At) {
    const code = emitPrintU32At(printU32At[1], printU32At[2], printU32At[3]);
    if (!code) return { handled: true, ok: false, log: `print u32 requires a u32 value or 4-u8 array and u8 coordinates: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printI32At = line.match(/^print\s+i32\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)(?:\s+digits\s+([2-9]|10|11))?$/i);
  if (printI32At) {
    const code = emitPrintI32At(printI32At[1], printI32At[2], printI32At[3], printI32At[4] || "11");
    if (!code) return { handled: true, ok: false, log: `print i32 requires an i32 variable, u8 coordinates, and digits 2-11: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatI16 = line.match(/^format\s+i16\s+([A-Za-z_][A-Za-z0-9_]*)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)\s+digits\s+([2-6])$/i);
  if (formatI16) {
    const code = emitFormatI16IntoBuffer(formatI16[1], formatI16[2], formatI16[3]);
    if (!code) return { handled: true, ok: false, log: `format i16 requires an i16 variable, a u8 buffer, and digits 2-6: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printFixAt = line.match(/^print\s+(?:fixed|ufixed)\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)$/i);
  if (printFixAt) {
    const code = emitPrintFix8_8At(printFixAt[1], printFixAt[2], printFixAt[3]);
    if (!code) return { handled: true, ok: false, log: `print fixed requires a fixed or ufixed variable and u8 coordinates: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const formatFix = line.match(/^format\s+(?:fixed|ufixed)\s+([A-Za-z_][A-Za-z0-9_]*)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (formatFix) {
    const code = emitFormatFix8_8IntoBuffer(formatFix[1], formatFix[2]);
    if (!code) return { handled: true, ok: false, log: `format fixed requires a fixed or ufixed variable and a 7-u8 buffer for fixed or 6-u8 buffer for ufixed: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sqrtWord = line.match(/^sqrt\s+word\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (sqrtWord) {
    return { handled: true, ok: false, log: `Legacy 'sqrt word' is no longer supported. Use 'sqrt Value into Var' with canonical types. Offending line: ${rawLine}` };
  }

  const sqrtAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*sqrt\s*\(\s*(.+?)\s*\)$/i);
  if (sqrtAssign) {
    const sqrtValue = normalizeExpression(sqrtAssign[2]);
    const code = emitSqrtInt16Into(sqrtValue, sqrtAssign[1]) || emitSqrtFx16Into(sqrtValue, sqrtAssign[1]) || emitSqrtFp5Into(sqrtValue, sqrtAssign[1]);
    if (!code) return { handled: true, ok: false, log: `sqrt(...) currently requires either an unsigned 8/16-bit source with a u16 target, a fixed32-capable source with a fixed32 target, or an fp5 target with an fp5/integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sqrtAuto = line.match(/^sqrt\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (sqrtAuto) {
    warnLegacyInto(`${sqrtAuto[2]} = sqrt(${sqrtAuto[1]})`);
    const sqrtValue = normalizeExpression(sqrtAuto[1]);
    const code = emitSqrtInt16Into(sqrtValue, sqrtAuto[2]) || emitSqrtFx16Into(sqrtValue, sqrtAuto[2]) || emitSqrtFp5Into(sqrtValue, sqrtAuto[2]);
    if (!code) return { handled: true, ok: false, log: `sqrt currently requires either an unsigned 8/16-bit source with a u16 target, a fixed32-capable source with a fixed32 target, or an fp5 target with an fp5/integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sqrAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*sqr\s*\(\s*(.+?)\s*\)$/i);
  if (sqrAssign) {
    const sqrtValue = normalizeExpression(sqrAssign[2]);
    const code = emitSqrtInt16Into(sqrtValue, sqrAssign[1]) || emitSqrtFx16Into(sqrtValue, sqrAssign[1]) || emitSqrtFp5Into(sqrtValue, sqrAssign[1]);
    if (!code) return { handled: true, ok: false, log: `sqr(...) currently requires either an unsigned 8/16-bit source with a u16 target, a fixed32-capable source with a fixed32 target, or an fp5 target with an fp5/integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sqrAuto = line.match(/^sqr\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (sqrAuto) {
    warnLegacyInto(`${sqrAuto[2]} = sqr(${sqrAuto[1]})`);
    const sqrtValue = normalizeExpression(sqrAuto[1]);
    const code = emitSqrtInt16Into(sqrtValue, sqrAuto[2]) || emitSqrtFx16Into(sqrtValue, sqrAuto[2]) || emitSqrtFp5Into(sqrtValue, sqrAuto[2]);
    if (!code) return { handled: true, ok: false, log: `sqr currently requires either an unsigned 8/16-bit source with a u16 target, a fixed32-capable source with a fixed32 target, or an fp5 target with an fp5/integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const logAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*log\s*\(\s*(.+?)\s*\)$/i);
  if (logAssign) {
    const logValue = normalizeExpression(logAssign[2]);
    const code = emitLogFp5Into(logValue, logAssign[1]);
    if (!code) return { handled: true, ok: false, log: `log(...) currently requires an fp5 target with an fp5 or integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const logAuto = line.match(/^log\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (logAuto) {
    warnLegacyInto(`${logAuto[2]} = log(${logAuto[1]})`);
    const logValue = normalizeExpression(logAuto[1]);
    const code = emitLogFp5Into(logValue, logAuto[2]);
    if (!code) return { handled: true, ok: false, log: `log currently requires an fp5 target with an fp5 or integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const expAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*exp\s*\(\s*(.+?)\s*\)$/i);
  if (expAssign) {
    const expValue = normalizeExpression(expAssign[2]);
    const code = emitExpFp5Into(expValue, expAssign[1]);
    if (!code) return { handled: true, ok: false, log: `exp(...) currently requires an fp5 target with an fp5 or integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const expAuto = line.match(/^exp\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (expAuto) {
    warnLegacyInto(`${expAuto[2]} = exp(${expAuto[1]})`);
    const expValue = normalizeExpression(expAuto[1]);
    const code = emitExpFp5Into(expValue, expAuto[2]);
    if (!code) return { handled: true, ok: false, log: `exp currently requires an fp5 target with an fp5 or integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const absAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*abs\s*\(\s*(.+?)\s*\)$/i);
  if (absAssign) {
    const absValue = normalizeExpression(absAssign[2]);
    const code = emitAbsFx16Into(absValue, absAssign[1]) || emitAbsFp5Into(absValue, absAssign[1]);
    if (!code) return { handled: false };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const absAuto = line.match(/^abs\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (absAuto) {
    warnLegacyInto(`${absAuto[2]} = abs(${absAuto[1]})`);
    const absValue = normalizeExpression(absAuto[1]);
    const code = emitAbsFx16Into(absValue, absAuto[2]) || emitAbsFp5Into(absValue, absAuto[2]);
    if (!code) return { handled: true, ok: false, log: `abs currently requires either a fixed32-capable source/target pair or an fp5 target with an fp5 or integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sgnAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*sgn\s*\(\s*(.+?)\s*\)$/i);
  if (sgnAssign) {
    const sgnValue = normalizeExpression(sgnAssign[2]);
    const code = emitSgnInt16LikeInto(sgnValue, sgnAssign[1]) || emitSgnFx16Into(sgnValue, sgnAssign[1]) || emitSgnFp5Into(sgnValue, sgnAssign[1]);
    if (!code) return { handled: true, ok: false, log: `sgn(...) currently requires an fp5, integer, fixed, or fixed32 source and an i8/u8/i16/u16/fixed/fixed32/fp5 target compatible with numeric sign helpers: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sgnAuto = line.match(/^sgn\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (sgnAuto) {
    warnLegacyInto(`${sgnAuto[2]} = sgn(${sgnAuto[1]})`);
    const sgnValue = normalizeExpression(sgnAuto[1]);
    const code = emitSgnInt16LikeInto(sgnValue, sgnAuto[2]) || emitSgnFx16Into(sgnValue, sgnAuto[2]) || emitSgnFp5Into(sgnValue, sgnAuto[2]);
    if (!code) return { handled: true, ok: false, log: `sgn currently requires an fp5, integer, fixed, or fixed32 source and an i8/u8/i16/u16/fixed/fixed32/fp5 target compatible with numeric sign helpers: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const intAssign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*int\s*\(\s*(.+?)\s*\)$/i);
  if (intAssign) {
    const intValue = normalizeExpression(intAssign[2]);
    const code = emitIntFp5Into(intValue, intAssign[1]);
    if (!code) return { handled: true, ok: false, log: `int(...) currently requires an fp5 source and an fp5, fixed32, byte, or word target: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const intAuto = line.match(/^int\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (intAuto) {
    warnLegacyInto(`${intAuto[2]} = int(${intAuto[1]})`);
    const intValue = normalizeExpression(intAuto[1]);
    const code = emitIntFp5Into(intValue, intAuto[2]);
    if (!code) return { handled: true, ok: false, log: `int currently requires an fp5 source and an fp5, fixed32, byte, or word target: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const strAuto = line.match(/^str\$\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+digits\s+([0-9]+))?$/i);
  if (strAuto) {
    warnLegacyInto(`${strAuto[2]} = str$(${strAuto[1]})`);
    const floatDigitsError = getFloatDigitsError(normalizeExpression(strAuto[1]), "digits", strAuto[3], rawLine);
    if (floatDigitsError) {
      return { handled: true, ok: false, log: floatDigitsError };
    }
    const normalizedValue = normalizeExpression(strAuto[1]);
    const code = emitFormatFp5FriendlyIntoBuffer(normalizedValue, strAuto[2], strAuto[3] || null)
      || emitFormatAutoIntoBuffer(normalizedValue, strAuto[2], strAuto[3] || null);
    if (!code) return { handled: true, ok: false, log: `str$ requires a supported numeric value and a compatible u8 buffer: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const u32Zero = line.match(/^u32\s+zero\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (u32Zero) {
    const code = emitU32Zero(u32Zero[1]);
    if (!code) return { handled: true, ok: false, log: `legacy u32 zero requires a u32 value or 4-byte byte-array target. Prefer 'clear Value': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const u32Copy = line.match(/^u32\s+copy\s+([A-Za-z_][A-Za-z0-9_]*)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (u32Copy) {
    const code = emitU32Copy(u32Copy[1], u32Copy[2]);
    if (!code) return { handled: true, ok: false, log: `legacy u32 copy requires u32 values or 4-byte byte-array operands. Prefer 'Target = Source' or 'copy Source to Target': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const u32Add = line.match(/^u32\s+add\s+([A-Za-z_][A-Za-z0-9_]*)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (u32Add) {
    const code = emitU32Add(u32Add[1], u32Add[2]);
    if (!code) return { handled: true, ok: false, log: `legacy u32 add requires u32 values or 4-byte byte-array operands. Prefer 'add Target by Value': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const u32Inc = line.match(/^u32\s+inc\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (u32Inc) {
    const code = emitU32Inc(u32Inc[1]);
    if (!code) return { handled: true, ok: false, log: `legacy u32 inc requires a u32 value or 4-byte byte-array target. Prefer 'inc Value': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const u32Sub = line.match(/^u32\s+sub\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (u32Sub) {
    const code = emitU32Sub(u32Sub[1], u32Sub[2]);
    if (!code) return { handled: true, ok: false, log: `legacy u32 sub requires u32 values or 4-byte byte-array operands. Prefer 'sub Target by Value': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const addBcd = line.match(/^add\s+bcd\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+([A-Za-z_][A-Za-z0-9_]*|[0-9]+)$/i);
  if (addBcd) {
    const code = emitBcdAdd(addBcd[1], addBcd[2]);
    if (!code) return { handled: true, ok: false, log: `add bcd requires a BCD variable and a decimal literal, u8/i8 variable, or same-size BCD variable: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const subBcd = line.match(/^sub\s+bcd\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+([A-Za-z_][A-Za-z0-9_]*|[0-9]+)$/i);
  if (subBcd) {
    const code = emitBcdSub(subBcd[1], subBcd[2]);
    if (!code) return { handled: true, ok: false, log: `sub bcd requires a BCD variable and a decimal literal, u8/i8 variable, or same-size BCD variable: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const clearValue = line.match(/^clear\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (clearValue) {
    const code = emitClearValue(clearValue[1]);
    if (!code) return { handled: true, ok: false, log: `clear requires a scalar numeric or BCD RAM/local variable: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const clearBcd = line.match(/^clear\s+bcd\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (clearBcd) {
    const code = emitBcdClear(clearBcd[1]);
    if (!code) return { handled: true, ok: false, log: `legacy clear bcd requires a BCD variable. Prefer 'clear Value': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const copyBcd = line.match(/^copy\s+bcd\s+([A-Za-z_][A-Za-z0-9_]*)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (copyBcd) {
    const code = emitBcdCopy(copyBcd[1], copyBcd[2]);
    if (!code) return { handled: true, ok: false, log: `legacy copy bcd requires two same-size BCD variables. Prefer 'Target = Source': ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printBcd = line.match(/^print\s+bcd\s+([A-Za-z_][A-Za-z0-9_]*)\s+at\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)(?:\s+tiles\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (printBcd) {
    const code = emitBcdPrint(printBcd[1], printBcd[2], printBcd[3], printBcd[4] || null);
    if (!code) return { handled: true, ok: false, log: `print bcd requires a BCD variable and byte coordinates: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  return { handled: false };
}
