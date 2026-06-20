export function scanAmyFirstPass({
  lines,
  recordDefinitionLineNumbers,
  stripAmyInlineComment,
  registerSourceTypeAlias,
  ensureConstAsmSymbol,
  ensureDataAsmSymbol,
  ensureAssetAsmSymbol,
  parseAmyDeclarationList,
  ensureUserVarAsmSymbol,
  isSupportedSourceTypeName,
  isSupportedRecordTypeName,
  validateGlobalUserName,
  ensureLabelAsmSymbol,
  ensureProcAsmSymbol,
  procSignatures,
  functionReturnTypes,
  normalizeRuntimeType,
  normalizeDeclaredType,
  ensureProcFrame,
  lowerName,
  isReservedAmyIdentifier,
  describeGlobalNameCollision,
  runtimeVars,
  runtimeParamSlotSize,
  splitTopLevelArgs
}) {
  let firstPassInAsm = false;
  let firstPassNameError = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (recordDefinitionLineNumbers?.has(lineIndex)) continue;
    const rawLine = lines[lineIndex];
    if (firstPassNameError) break;
    const trimmed = stripAmyInlineComment(rawLine).trim();
    if (/^asm\s*\{$/i.test(trimmed)) {
      firstPassInAsm = true;
      continue;
    }
    if (trimmed === "}" && firstPassInAsm) {
      firstPassInAsm = false;
      continue;
    }
    if (firstPassInAsm) continue;

    const typeAliasMatch = trimmed.match(/^define\s+([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (typeAliasMatch) {
      const aliasError = registerSourceTypeAlias(typeAliasMatch[1], typeAliasMatch[2], rawLine);
      if (aliasError) {
        firstPassNameError = aliasError;
        break;
      }
      continue;
    }

    const constMatch = trimmed.match(/^(?:let|var|const)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/i);
    if (constMatch) ensureConstAsmSymbol(constMatch[1]);

    const dataMatch = trimmed.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:bytes|bitmap8|sprite16|chars)(?:$|\s)/i);
    if (dataMatch) ensureDataAsmSymbol(dataMatch[1]);

    const assetMatch = trimmed.match(/^asset\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+"([^"]+)"(?:\s+codec\s+([A-Za-z0-9_]+))?/i);
    if (assetMatch) {
      const nameError = validateGlobalUserName(assetMatch[1], "Asset", rawLine);
      if (nameError) {
        firstPassNameError = nameError;
        break;
      }
      ensureAssetAsmSymbol(assetMatch[1]);
    }

    const bcdPredecl = trimmed.match(/^(?:(?:ram|dim|local)\s+)?bcd\s+(?:(digits)\s+)?([1-9]|10|11|12)\s+(.+)$/i);
    if (bcdPredecl) {
      try {
        for (const declEntry of parseAmyDeclarationList(bcdPredecl[3], rawLine)) {
          ensureUserVarAsmSymbol(declEntry.name);
        }
      } catch (_error) {}
    }

    const ramPredecl = trimmed.match(/^(?:(?:ram|dim|local)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/i);
    if (ramPredecl && isSupportedSourceTypeName(ramPredecl[1])) {
      try {
        for (const declEntry of parseAmyDeclarationList(ramPredecl[2], rawLine)) {
          ensureUserVarAsmSymbol(declEntry.name);
        }
      } catch (_error) {}
    }
    if (ramPredecl && isSupportedRecordTypeName?.(ramPredecl[1])) {
      try {
        for (const declEntry of parseAmyDeclarationList(ramPredecl[2], rawLine)) {
          ensureUserVarAsmSymbol(declEntry.name);
        }
      } catch (_error) {}
    }

    const labelMatch = trimmed.match(/^label\s+([A-Za-z_][A-Za-z0-9_]*):?$/i);
    if (labelMatch) {
      const nameError = validateGlobalUserName(labelMatch[1], "Label", rawLine);
      if (nameError) {
        firstPassNameError = nameError;
        break;
      }
      ensureLabelAsmSymbol(labelMatch[1]);
    }

    const basicLabelMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):$/);
    if (basicLabelMatch && !/^sub\s+/i.test(trimmed)) {
      const nameError = validateGlobalUserName(basicLabelMatch[1], "Label", rawLine);
      if (nameError) {
        firstPassNameError = nameError;
        break;
      }
      ensureLabelAsmSymbol(basicLabelMatch[1]);
    }

    const procBare = trimmed.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
    if (procBare) {
      const nameError = validateGlobalUserName(procBare[1], "Subroutine", rawLine);
      if (nameError) {
        firstPassNameError = nameError;
        break;
      }
      ensureProcAsmSymbol(procBare[1]);
    }

    const functionBare = trimmed.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(\s*\))?\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
    if (functionBare && isSupportedSourceTypeName(functionBare[2])) {
      if (normalizeDeclaredType(functionBare[2].toLowerCase()) === "fp5") {
        firstPassNameError = `fp5 function returns are not supported yet: ${rawLine}`;
        break;
      }
      const functionName = functionBare[1];
      const nameError = validateGlobalUserName(functionName, "Function", rawLine);
      if (nameError) {
        firstPassNameError = nameError;
        break;
      }
      ensureProcAsmSymbol(functionName);
      procSignatures.set(functionName, []);
      functionReturnTypes.set(functionName, {
        returnType: normalizeRuntimeType(functionBare[2].toLowerCase()),
        declaredType: normalizeDeclaredType(functionBare[2].toLowerCase())
      });
      ensureProcFrame(functionName);
    }

    const m = trimmed.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)\s*:?\s*$/i);
    if (!m) continue;
    const procName = m[1];
    const procNameError = validateGlobalUserName(procName, "Subroutine", rawLine);
    if (procNameError) {
      firstPassNameError = procNameError;
      break;
    }
    ensureProcAsmSymbol(procName);
    const rawParams = m[2].split(",");
    const params = [];
    const seenParams = new Set();
    let valid = true;
    for (const rp of rawParams) {
      const pm = rp.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (!pm || !isSupportedSourceTypeName(pm[1])) {
        valid = false;
        break;
      }
      const paramName = pm[2];
      const paramLower = lowerName(paramName);
      if (seenParams.has(paramLower) || paramLower === lowerName(procName) || isReservedAmyIdentifier(paramName) || describeGlobalNameCollision(paramName)) {
        firstPassNameError = `Parameter name '${paramName}' is invalid or collides with an existing symbol in ${rawLine}`;
        valid = false;
        break;
      }
      seenParams.add(paramLower);
      params.push({
        type: normalizeRuntimeType(pm[1].toLowerCase()),
        declaredType: normalizeDeclaredType(pm[1].toLowerCase()),
        name: paramName
      });
    }
    if (!valid || !params.length) continue;
    procSignatures.set(procName, params);
    const frame = ensureProcFrame(procName);
    frame.usesIxFrame = true;
    let nextParamOffset = 4;
    for (const param of params) {
      const paramLabel = `${procName}_${param.name}`;
      if (runtimeVars.has(paramLabel)) continue;
      runtimeVars.set(paramLabel, {
        type: param.type,
        declaredType: param.declaredType,
        kind: param.declaredType,
        scope: procName,
        isParam: true,
        storage: "stack",
        offset: nextParamOffset
      });
      nextParamOffset += runtimeParamSlotSize(param.type, param.declaredType);
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (recordDefinitionLineNumbers?.has(lineIndex)) continue;
    const rawLine = lines[lineIndex];
    if (firstPassNameError) break;
    const trimmed = stripAmyInlineComment(rawLine).trim();
    const m = trimmed.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
    if (!m || !isSupportedSourceTypeName(m[3])) continue;
    if (normalizeDeclaredType(m[3].toLowerCase()) === "fp5") {
      firstPassNameError = `fp5 function returns are not supported yet: ${rawLine}`;
      break;
    }
    const functionName = m[1];
    ensureProcAsmSymbol(functionName);
    const rawParamsText = m[2].trim();
    const rawParams = rawParamsText ? splitTopLevelArgs(rawParamsText) : [];
    const params = [];
    const seenParams = new Set();
    let valid = true;
    for (const rp of rawParams) {
      const pm = rp.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (!pm || !isSupportedSourceTypeName(pm[1])) {
        valid = false;
        break;
      }
      const paramName = pm[2];
      const paramLower = lowerName(paramName);
      if (seenParams.has(paramLower) || paramLower === lowerName(functionName) || isReservedAmyIdentifier(paramName) || describeGlobalNameCollision(paramName)) {
        firstPassNameError = `Parameter name '${paramName}' is invalid or collides with an existing symbol in ${rawLine}`;
        valid = false;
        break;
      }
      seenParams.add(paramLower);
      params.push({
        type: normalizeRuntimeType(pm[1].toLowerCase()),
        declaredType: normalizeDeclaredType(pm[1].toLowerCase()),
        name: paramName
      });
    }
    if (!valid) continue;
    procSignatures.set(functionName, params);
    functionReturnTypes.set(functionName, {
      returnType: normalizeRuntimeType(m[3].toLowerCase()),
      declaredType: normalizeDeclaredType(m[3].toLowerCase())
    });
    const frame = ensureProcFrame(functionName);
    frame.usesIxFrame = true;
    let nextParamOffset = 4;
    for (const param of params) {
      const paramLabel = `${functionName}_${param.name}`;
      if (runtimeVars.has(paramLabel)) continue;
      runtimeVars.set(paramLabel, {
        type: param.type,
        declaredType: param.declaredType,
        kind: param.declaredType,
        scope: functionName,
        isParam: true,
        storage: "stack",
        offset: nextParamOffset
      });
      nextParamOffset += runtimeParamSlotSize(param.type, param.declaredType);
    }
  }

  return firstPassNameError;
}
