import { checkBcdStatementDeprecation, checkMathIntoDeprecation, checkTypedPrintFormatDeprecation, checkU32StatementDeprecation } from "./deprecations.js";

export function handlePrintFormatStatement({
  line,
  rawLine,
  body,
  splitTopLevelArgs,
  normalizeExpression,
  resolveDeclaredValueType,
  emitPrintAtDense,
  emitTextExpressionIntoBuffer,
  emitPrintLiteralAt,
  emitPrintAutoAt,
  emitPrintHexAt,
  emitFormatAutoIntoBuffer,
  emitFormatHexIntoBuffer,
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
  emitClearValue,
  emitBcdPrint,
  tryEvaluateCompileTimeNumericExpression
}) {
  const numericTargetPattern = "([A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?(?:\\.[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?)*)";
  const _depMath = checkMathIntoDeprecation(line, rawLine);
  if (_depMath.handled) return _depMath;
  const _depU32 = checkU32StatementDeprecation(line, rawLine);
  if (_depU32.handled) return _depU32;
  const _depBcd = checkBcdStatementDeprecation(line, rawLine);
  if (_depBcd.handled) return _depBcd;
  const _depTypedPrint = checkTypedPrintFormatDeprecation(line, rawLine);
  if (_depTypedPrint.handled) return _depTypedPrint;

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

  function resolveFormatSize(token, context) {
    if (token == null) return { ok: true, token: null };
    const value = tryEvaluateCompileTimeNumericExpression(token);
    if (!Number.isInteger(value) || value < 1 || value > 255) {
      return { ok: false, log: `digits/width requires a compile-time constant from 1 to 255: ${context}` };
    }
    return { ok: true, token: String(value) };
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
    let parts = splitTopLevelArgs(argText).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const relaxedItems = /^([\s\S]+?)\s+("[\s\S]*)$/.exec(parts[1]);
      if (relaxedItems) {
        parts = [
          parts[0],
          relaxedItems[1].trim(),
          ...splitTopLevelArgs(relaxedItems[2]).map((part) => part.trim()).filter(Boolean),
          ...parts.slice(2)
        ];
      }
    }
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

  const printBcdTiles = line.match(new RegExp(`^print\\s+${numericTargetPattern}\\s+at\\s+(.+?)\\s*,\\s*(.+?)\\s+tiles\\s+(.+)$`, "i"));
  if (printBcdTiles) {
    const code = emitBcdPrint(printBcdTiles[1], printBcdTiles[2], printBcdTiles[3], printBcdTiles[4]);
    if (!code) return { handled: true, ok: false, log: `print ... tiles requires a BCD value, byte coordinates, and a byte tile offset: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const printAutoAt = line.match(/^print\s+(.+?)\s+at\s+(.+?)\s*,\s*(.+?)(?:\s+(digits|width)\s+(\d+|\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*))?$/i);
  if (printAutoAt) {
    const size = resolveFormatSize(printAutoAt[5], rawLine);
    if (!size.ok) return { handled: true, ok: false, log: size.log };
    const floatDigitsError = getFloatDigitsError(normalizeExpression(printAutoAt[1]), printAutoAt[4], size.token, rawLine);
    if (floatDigitsError) {
      return { handled: true, ok: false, log: floatDigitsError };
    }
    const mode = (printAutoAt[4] || "").toLowerCase();
    const code = emitPrintAutoAt(normalizeExpression(printAutoAt[1]), printAutoAt[2], printAutoAt[3], size.token, mode === "width");
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

  const formatHex = line.match(new RegExp(`^format\\s+hex\\s+(.+?)\\s+into\\s+${numericTargetPattern}$`, "i"));
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

  const formatAuto = line.match(new RegExp(`^format\\s+(.+?)\\s+into\\s+${numericTargetPattern}(?:\\s+(digits|width)\\s+(\\d+|\\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*))?$`, "i"));
  if (formatAuto) {
    const size = resolveFormatSize(formatAuto[4], rawLine);
    if (!size.ok) return { handled: true, ok: false, log: size.log };
    const floatDigitsError = getFloatDigitsError(normalizeExpression(formatAuto[1]), formatAuto[3], size.token, rawLine);
    if (floatDigitsError) {
      return { handled: true, ok: false, log: floatDigitsError };
    }
    const mode = (formatAuto[3] || "").toLowerCase();
    const code = emitFormatAutoIntoBuffer(normalizeExpression(formatAuto[1]), formatAuto[2], size.token, mode === "width");
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

  const sqrtWord = line.match(/^sqrt\s+word\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (sqrtWord) {
    return { handled: true, ok: false, log: `Legacy 'sqrt word' is no longer supported. Use 'Var = sqrt(Value)' with canonical types. Offending line: ${rawLine}` };
  }

  const sqrtAssign = line.match(new RegExp(`^${numericTargetPattern}\\s*=\\s*sqrt\\s*\\(\\s*(.+?)\\s*\\)$`, "i"));
  if (sqrtAssign) {
    const sqrtValue = normalizeExpression(sqrtAssign[2]);
    const code = emitSqrtInt16Into(sqrtValue, sqrtAssign[1]) || emitSqrtFx16Into(sqrtValue, sqrtAssign[1]) || emitSqrtFp5Into(sqrtValue, sqrtAssign[1]);
    if (!code) return { handled: true, ok: false, log: `sqrt(...) currently requires either an unsigned 8/16-bit source with a u16 target, a fixed32-capable source with a fixed32 target, or an fp5 target with an fp5/integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sqrAssign = line.match(new RegExp(`^${numericTargetPattern}\\s*=\\s*sqr\\s*\\(\\s*(.+?)\\s*\\)$`, "i"));
  if (sqrAssign) {
    const sqrtValue = normalizeExpression(sqrAssign[2]);
    const code = emitSqrtInt16Into(sqrtValue, sqrAssign[1]) || emitSqrtFx16Into(sqrtValue, sqrAssign[1]) || emitSqrtFp5Into(sqrtValue, sqrAssign[1]);
    if (!code) return { handled: true, ok: false, log: `sqr(...) currently requires either an unsigned 8/16-bit source with a u16 target, a fixed32-capable source with a fixed32 target, or an fp5 target with an fp5/integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const logAssign = line.match(new RegExp(`^${numericTargetPattern}\\s*=\\s*log\\s*\\(\\s*(.+?)\\s*\\)$`, "i"));
  if (logAssign) {
    const logValue = normalizeExpression(logAssign[2]);
    const code = emitLogFp5Into(logValue, logAssign[1]);
    if (!code) return { handled: true, ok: false, log: `log(...) currently requires an fp5 target with an fp5 or integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const expAssign = line.match(new RegExp(`^${numericTargetPattern}\\s*=\\s*exp\\s*\\(\\s*(.+?)\\s*\\)$`, "i"));
  if (expAssign) {
    const expValue = normalizeExpression(expAssign[2]);
    const code = emitExpFp5Into(expValue, expAssign[1]);
    if (!code) return { handled: true, ok: false, log: `exp(...) currently requires an fp5 target with an fp5 or integer source: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const absAssign = line.match(new RegExp(`^${numericTargetPattern}\\s*=\\s*abs\\s*\\(\\s*(.+?)\\s*\\)$`, "i"));
  if (absAssign) {
    const absValue = normalizeExpression(absAssign[2]);
    const code = emitAbsFx16Into(absValue, absAssign[1]) || emitAbsFp5Into(absValue, absAssign[1]);
    if (!code) return { handled: false };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const sgnAssign = line.match(new RegExp(`^${numericTargetPattern}\\s*=\\s*sgn\\s*\\(\\s*(.+?)\\s*\\)$`, "i"));
  if (sgnAssign) {
    const sgnValue = normalizeExpression(sgnAssign[2]);
    const code = emitSgnInt16LikeInto(sgnValue, sgnAssign[1]) || emitSgnFx16Into(sgnValue, sgnAssign[1]) || emitSgnFp5Into(sgnValue, sgnAssign[1]);
    if (!code) return { handled: true, ok: false, log: `sgn(...) currently requires an fp5, integer, fixed, or fixed32 source and an i8/u8/i16/u16/fixed/fixed32/fp5 target compatible with numeric sign helpers: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const intAssign = line.match(new RegExp(`^${numericTargetPattern}\\s*=\\s*int\\s*\\(\\s*(.+?)\\s*\\)$`, "i"));
  if (intAssign) {
    const intValue = normalizeExpression(intAssign[2]);
    const code = emitIntFp5Into(intValue, intAssign[1]);
    if (!code) return { handled: true, ok: false, log: `int(...) currently requires an fp5 source and an fp5, fixed32, byte, or word target: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  const qualifiedValue = String.raw`([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?(?:\.[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)*)`;
  const clearValue = line.match(new RegExp(`^clear\\s+${qualifiedValue}$`, "i"));
  if (clearValue) {
    const code = emitClearValue(clearValue[1]);
    if (!code) return { handled: true, ok: false, log: `clear requires a scalar numeric or BCD RAM/local variable: ${rawLine}` };
    body.push(...code);
    return { handled: true, ok: true };
  }

  return { handled: false };
}
