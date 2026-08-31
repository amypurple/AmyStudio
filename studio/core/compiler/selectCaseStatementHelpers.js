import { checkSelectDeprecation } from "./deprecations.js";

export function handleSelectCaseStatement({
  line,
  rawLine,
  selectStack,
  normalizeExpression,
  splitTopLevelArgs,
  makeGeneratedLabel,
  emitCompareGoto,
  getTileTypeInfo,
  emitSelectCaseEqGoto
}) {
  const _dep = checkSelectDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const selectCaseDecl = line.match(/^select\s+case\s+(.+)$/i);
  if (selectCaseDecl) {
    const rawExpression = selectCaseDecl[1].trim();
    const tupleTokens = rawExpression.startsWith("(") && rawExpression.endsWith(")")
      ? splitTopLevelArgs(rawExpression.slice(1, -1)).map((token) => normalizeExpression(token.trim())).filter(Boolean)
      : [];
    const exprTokens = tupleTokens.length > 1 ? tupleTokens : null;
    const exprToken = exprTokens ? null : normalizeExpression(rawExpression);
    const dispatchLabel = makeGeneratedLabel("SelectDispatch");
    const endLabel = makeGeneratedLabel("SelectEnd");
    selectStack.push({
      exprToken,
      exprTokens,
      nextTestLabel: dispatchLabel,
      endLabel,
      hasCase: false,
      hasDefault: false,
      activeBody: false,
      exprPreloaded: false
    });
    return { ok: true, handled: true, lines: [`    jp ${dispatchLabel}`] };
  }

  const caseElseDecl = line.match(/^case\s+else\s*:?\s*$/i);
  if (caseElseDecl) {
    const currentSelect = selectStack[selectStack.length - 1];
    if (!currentSelect) return { ok: false, handled: true, log: `default without matching select case: ${rawLine}` };
    if (currentSelect.hasDefault) return { ok: false, handled: true, log: `Duplicate default branch in select case block: ${rawLine}` };
    const lines = [];
    if (currentSelect.activeBody) lines.push(`    jp ${currentSelect.endLabel}`);
    lines.push(`${currentSelect.nextTestLabel}:`);
    currentSelect.hasDefault = true;
    currentSelect.activeBody = true;
    currentSelect.nextTestLabel = null;
    return { ok: true, handled: true, lines };
  }

  const caseDecl = line.match(/^case\s+(.+?)\s*:?\s*$/i);
  if (caseDecl) {
    const currentSelect = selectStack[selectStack.length - 1];
    if (!currentSelect) return { ok: false, handled: true, log: `case without matching select case: ${rawLine}` };
    if (currentSelect.hasDefault) return { ok: false, handled: true, log: `case cannot appear after default branch: ${rawLine}` };
    if (currentSelect.exprTokens) {
      const rawTuple = caseDecl[1].trim();
      const alternatives = splitTopLevelArgs(rawTuple).map((token) => token.trim()).filter(Boolean);
      if (alternatives.length > 1) {
        const lines = [];
        if (currentSelect.activeBody) lines.push(`    jp ${currentSelect.endLabel}`);
        lines.push(`${currentSelect.nextTestLabel}:`);
        const nextTestLabel = makeGeneratedLabel("CaseNext");
        const bodyLabel = makeGeneratedLabel("CaseBody");
        for (let alternativeIndex = 0; alternativeIndex < alternatives.length; alternativeIndex += 1) {
          const alternative = alternatives[alternativeIndex];
          if (!alternative.startsWith("(") || !alternative.endsWith(")")) {
            return { ok: false, handled: true, log: `Tuple alternatives require (Value1, Value2, ...): ${rawLine}` };
          }
          const tupleValues = splitTopLevelArgs(alternative.slice(1, -1)).map((token) => normalizeExpression(token.trim())).filter(Boolean);
          if (tupleValues.length !== currentSelect.exprTokens.length) {
            return { ok: false, handled: true, log: `Tuple case has ${tupleValues.length} values but select has ${currentSelect.exprTokens.length}: ${rawLine}` };
          }
          const alternativeFailLabel = alternativeIndex === alternatives.length - 1 ? nextTestLabel : makeGeneratedLabel("TupleAlternative");
          for (let index = 0; index < tupleValues.length; index += 1) {
            const valueToken = tupleValues[index];
            const rangeMatch = valueToken.match(/^(.+?)\s+to\s+(.+)$/i);
            if (rangeMatch) {
              const lowToken = normalizeExpression(rangeMatch[1]);
              const highToken = normalizeExpression(rangeMatch[2]);
              const lowFailCode = emitCompareGoto(currentSelect.exprTokens[index], "<", lowToken, alternativeFailLabel);
              const highFailCode = emitCompareGoto(currentSelect.exprTokens[index], ">", highToken, alternativeFailLabel);
              if (!lowToken || !highToken || !lowFailCode || !highFailCode) return { ok: false, handled: true, log: `Unsupported tuple case range: ${rawLine}` };
              lines.push(...lowFailCode, ...highFailCode);
            } else {
              const mismatchCode = emitCompareGoto(currentSelect.exprTokens[index], "!=", valueToken, alternativeFailLabel);
              if (!mismatchCode) return { ok: false, handled: true, log: `Unsupported tuple case value: ${rawLine}` };
              lines.push(...mismatchCode);
            }
          }
          lines.push(`    jp ${bodyLabel}`);
          if (alternativeFailLabel !== nextTestLabel) lines.push(`${alternativeFailLabel}:`);
        }
        lines.push(`    jp ${nextTestLabel}`, `${bodyLabel}:`);
        currentSelect.nextTestLabel = nextTestLabel;
        currentSelect.hasCase = true;
        currentSelect.activeBody = true;
        return { ok: true, handled: true, lines };
      }
      if (!rawTuple.startsWith("(") || !rawTuple.endsWith(")")) {
        return { ok: false, handled: true, log: `Tuple select requires case (Value1, Value2, ...): ${rawLine}` };
      }
      const tupleValues = splitTopLevelArgs(rawTuple.slice(1, -1)).map((token) => normalizeExpression(token.trim())).filter(Boolean);
      if (tupleValues.length !== currentSelect.exprTokens.length) {
        return { ok: false, handled: true, log: `Tuple case has ${tupleValues.length} values but select has ${currentSelect.exprTokens.length}: ${rawLine}` };
      }
      const lines = [];
      if (currentSelect.activeBody) lines.push(`    jp ${currentSelect.endLabel}`);
      lines.push(`${currentSelect.nextTestLabel}:`);
      const nextTestLabel = makeGeneratedLabel("CaseNext");
      for (let index = 0; index < tupleValues.length; index += 1) {
        const valueToken = tupleValues[index];
        const rangeMatch = valueToken.match(/^(.+?)\s+to\s+(.+)$/i);
        if (rangeMatch) {
          const lowToken = normalizeExpression(rangeMatch[1]);
          const highToken = normalizeExpression(rangeMatch[2]);
          const lowFailCode = emitCompareGoto(currentSelect.exprTokens[index], "<", lowToken, nextTestLabel);
          const highFailCode = emitCompareGoto(currentSelect.exprTokens[index], ">", highToken, nextTestLabel);
          if (!lowToken || !highToken || !lowFailCode || !highFailCode) {
            return { ok: false, handled: true, log: `Unsupported tuple case range: ${rawLine}` };
          }
          lines.push(...lowFailCode, ...highFailCode);
        } else {
          const mismatchCode = emitCompareGoto(currentSelect.exprTokens[index], "!=", valueToken, nextTestLabel);
          if (!mismatchCode) return { ok: false, handled: true, log: `Unsupported tuple case value: ${rawLine}` };
          lines.push(...mismatchCode);
        }
      }
      currentSelect.nextTestLabel = nextTestLabel;
      currentSelect.hasCase = true;
      currentSelect.activeBody = true;
      return { ok: true, handled: true, lines };
    }
    const rawValueTokens = splitTopLevelArgs(caseDecl[1]).map((token) => normalizeExpression(token.trim())).filter(Boolean);
    const valueTokens = [];
    for (const token of rawValueTokens) {
      const tileType = getTileTypeInfo?.(token);
      if (tileType?.values?.length) {
        valueTokens.push(...tileType.values.map((value) => `$${value.toString(16).toUpperCase().padStart(2, "0")}`));
      } else {
        valueTokens.push(token);
      }
    }
    if (!valueTokens.length) return { ok: false, handled: true, log: `case requires at least one value: ${rawLine}` };
    const lines = [];
    if (currentSelect.activeBody) lines.push(`    jp ${currentSelect.endLabel}`);
    lines.push(`${currentSelect.nextTestLabel}:`);
    const nextTestLabel = makeGeneratedLabel("CaseNext");

    const isSingleValue = valueTokens.length === 1 && !valueTokens[0].match(/^.+\s+to\s+.+$/i);
    if (isSingleValue && emitSelectCaseEqGoto) {
      // Inverted condition: skip to next case on mismatch, fall through to body on match.
      // Saves jp z,bodyLabel + jp nextTestLabel + bodyLabel: (3 bytes) per case.
      const code = emitSelectCaseEqGoto(currentSelect.exprToken, valueTokens[0], nextTestLabel, currentSelect.exprPreloaded, true);
      if (!code) {
        return { ok: false, handled: true, log: `Unsupported case value in select case block: ${rawLine}` };
      }
      lines.push(...code);
      currentSelect.nextTestLabel = nextTestLabel;
      currentSelect.hasCase = true;
      currentSelect.activeBody = true;
      currentSelect.exprPreloaded = true;
      return { ok: true, handled: true, lines };
    }

    // Multi-value or range: need explicit bodyLabel to collect all passing paths.
    const bodyLabel = makeGeneratedLabel("CaseBody");
    let valuesPreloaded = currentSelect.exprPreloaded;
    for (const valueToken of valueTokens) {
      const rangeMatch = valueToken.match(/^(.+?)\s+to\s+(.+)$/i);
      if (rangeMatch) {
        const lowToken = normalizeExpression(rangeMatch[1]);
        const highToken = normalizeExpression(rangeMatch[2]);
        if (!lowToken || !highToken) {
          return { ok: false, handled: true, log: `Invalid case range in select case block: ${rawLine}` };
        }
        const lowFailCode = emitCompareGoto(currentSelect.exprToken, "<", lowToken, nextTestLabel);
        const highFailCode = emitCompareGoto(currentSelect.exprToken, ">", highToken, nextTestLabel);
        if (!lowFailCode || !highFailCode) {
          return { ok: false, handled: true, log: `Unsupported case range in select case block: ${rawLine}` };
        }
        lines.push(...lowFailCode);
        lines.push(...highFailCode);
        lines.push(`    jp ${bodyLabel}`);
        valuesPreloaded = true;
        continue;
      }
      const code = emitSelectCaseEqGoto
        ? emitSelectCaseEqGoto(currentSelect.exprToken, valueToken, bodyLabel, valuesPreloaded)
        : emitCompareGoto(currentSelect.exprToken, "==", valueToken, bodyLabel);
      if (!code) {
        return { ok: false, handled: true, log: `Unsupported case value in select case block: ${rawLine}` };
      }
      lines.push(...code);
      valuesPreloaded = true;
    }
    lines.push(`    jp ${nextTestLabel}`);
    lines.push(`${bodyLabel}:`);
    currentSelect.nextTestLabel = nextTestLabel;
    currentSelect.hasCase = true;
    currentSelect.activeBody = true;
    currentSelect.exprPreloaded = valuesPreloaded;
    return { ok: true, handled: true, lines };
  }

  if (/^end\s+select$/i.test(line)) {
    const currentSelect = selectStack.pop();
    if (!currentSelect) return { ok: false, handled: true, log: `end select without matching select case: ${rawLine}` };
    if (!currentSelect.hasCase && !currentSelect.hasDefault) {
      return { ok: false, handled: true, log: `select case block must contain at least one case: ${rawLine}` };
    }
    const lines = [];
    if (currentSelect.nextTestLabel) lines.push(`${currentSelect.nextTestLabel}:`);
    lines.push(`${currentSelect.endLabel}:`);
    return { ok: true, handled: true, lines };
  }

  return { handled: false };
}
