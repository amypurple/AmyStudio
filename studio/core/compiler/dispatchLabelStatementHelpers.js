import { checkLabelDeprecation } from "./deprecations.js";

export function handleDispatchLabelStatement({
  line,
  rawLine,
  ensureNumericFormatVars,
  emitLoadInt8ValueInto,
  normalizeExpression,
  parseRoutineInvocation,
  resolveValueType,
  isSafeExpression,
  emitRuntimeStore,
  splitTopLevelArgs,
  emitOnIndexedJump,
  ensureLabelAsmSymbol,
  resolveSourceJumpTarget,
  formatUnknownJumpTargetLog
}) {
  const _dep = checkLabelDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const setNumberDigits = line.match(/^set\s+number\s+digits\s+(?:tile|tiles|to)\s+(.+)$/i);
  if (setNumberDigits) {
    const vars = ensureNumericFormatVars();
    const loadValue = emitLoadInt8ValueInto("a", setNumberDigits[1]);
    if (!loadValue) return { ok: false, handled: true, log: `set number digits requires a byte tile value: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadValue, `    ld (${vars.digitBaseName}),a`] };
  }

  const setNumberPad = line.match(/^set\s+number\s+pad\s+(?:tile|char|to)\s+(.+)$/i);
  if (setNumberPad) {
    const vars = ensureNumericFormatVars();
    const loadValue = emitLoadInt8ValueInto("a", setNumberPad[1]);
    if (!loadValue) return { ok: false, handled: true, log: `set number pad requires a byte tile value: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadValue, `    ld (${vars.padCharName}),a`] };
  }

  const copyVar = line.match(/^copy\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s+to\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)$/i);
  if (copyVar) {
    const value = normalizeExpression(copyVar[1]);
    const name = copyVar[2];
    const valueInvocation = parseRoutineInvocation(value);
    if (!resolveValueType(name) || (!isSafeExpression(value) && !valueInvocation)) {
      return { ok: false, handled: true, log: `Invalid runtime copy: ${rawLine}` };
    }
    const storeCode = emitRuntimeStore(name, value);
    if (!storeCode) return { ok: false, handled: true, log: `Invalid runtime copy types: ${rawLine}` };
    return { ok: true, handled: true, lines: storeCode };
  }

  const onGoto = line.match(/^on\s+(.+?)\s+goto\s+(.+)$/i);
  if (onGoto) {
    const labels = splitTopLevelArgs(onGoto[2]).map((part) => part.trim()).filter(Boolean);
    if (!labels.length || labels.some((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
      return { ok: false, handled: true, log: `on ... goto requires a comma-separated label list: ${rawLine}` };
    }
    const code = emitOnIndexedJump(normalizeExpression(onGoto[1]), labels, "goto");
    if (!code) return { ok: false, handled: true, log: `on ... goto requires a byte/word selector: ${rawLine}` };
    if (code.error) return { ok: false, handled: true, log: code.error };
    return { ok: true, handled: true, lines: code };
  }

  const onGosub = line.match(/^on\s+(.+?)\s+gosub\s+(.+)$/i);
  if (onGosub) {
    const labels = splitTopLevelArgs(onGosub[2]).map((part) => part.trim()).filter(Boolean);
    if (!labels.length || labels.some((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
      return { ok: false, handled: true, log: `on ... gosub requires a comma-separated label list: ${rawLine}` };
    }
    const code = emitOnIndexedJump(normalizeExpression(onGosub[1]), labels, "gosub");
    if (!code) return { ok: false, handled: true, log: `on ... gosub requires a byte/word selector: ${rawLine}` };
    if (code.error) return { ok: false, handled: true, log: code.error };
    return { ok: true, handled: true, lines: code };
  }

  const labelDecl = line.match(/^label\s+([A-Za-z_][A-Za-z0-9_]*):?$/i);
  if (labelDecl) {
    return { ok: true, handled: true, lines: [`${ensureLabelAsmSymbol(labelDecl[1])}:`] };
  }

  const basicLabelDecl = line.match(/^([A-Za-z_][A-Za-z0-9_]*):$/);
  if (basicLabelDecl) {
    return { ok: true, handled: true, lines: [`${ensureLabelAsmSymbol(basicLabelDecl[1])}:`] };
  }

  const gotoDecl = line.match(/^goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (gotoDecl) {
    const jumpTarget = resolveSourceJumpTarget(gotoDecl[1]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(gotoDecl[1], rawLine) };
    return { ok: true, handled: true, lines: [`    jp ${jumpTarget}`] };
  }

  const removedCallDecl = line.match(/^(call|gosub)\s+/i);
  if (removedCallDecl && !/^call\s+asm(?:\s|$)/i.test(line)) {
    return {
      ok: false,
      handled: true,
      log: `CALL/GOSUB syntax has been removed. Call subroutines directly by name instead. Offending line: ${rawLine}`
    };
  }

  return { handled: false };
}
