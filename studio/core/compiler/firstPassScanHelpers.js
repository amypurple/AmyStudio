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
  getRecordTypeInfo,
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

  const REF_SCALAR_DECLARED_TYPES = new Set(["u8", "i8", "u16", "i16"]);

  function parseSignatureParam(rawParam, ownerName, seenParams, rawLine) {
    const pm = rawParam.trim().match(/^(ref\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (!pm) return { invalid: true };
    const isRef = !!pm[1];
    const typeName = pm[2];
    const paramName = pm[3];
    const isRecordType = typeof isSupportedRecordTypeName === "function" && isSupportedRecordTypeName(typeName);
    if (!isRecordType && !isSupportedSourceTypeName(typeName)) {
      if (isRef) return { error: `Unknown ref parameter type '${typeName}' in ${rawLine}` };
      return { invalid: true };
    }
    if (isRecordType && !isRef) {
      return { error: `Record parameter '${paramName}' must be passed by reference: use 'ref ${typeName} ${paramName}' in ${rawLine}` };
    }
    if (isRef && !isRecordType) {
      const declared = normalizeDeclaredType(typeName.toLowerCase());
      if (!REF_SCALAR_DECLARED_TYPES.has(declared)) {
        return { error: `ref parameters support u8, i8, u16, i16 or record types (got '${typeName}') in ${rawLine}` };
      }
    }
    const paramLower = lowerName(paramName);
    if (seenParams.has(paramLower) || paramLower === lowerName(ownerName) || isReservedAmyIdentifier(paramName) || describeGlobalNameCollision(paramName)) {
      return { error: `Parameter name '${paramName}' is invalid or collides with an existing symbol in ${rawLine}` };
    }
    seenParams.add(paramLower);
    if (isRecordType) {
      return { param: { type: "record", declaredType: "record", name: paramName, isRef: true, recordTypeName: typeName } };
    }
    if (isRef) {
      const runtime = normalizeRuntimeType(typeName.toLowerCase());
      return {
        param: {
          type: `ref_${runtime}`,
          refTargetType: runtime,
          declaredType: normalizeDeclaredType(typeName.toLowerCase()),
          name: paramName,
          isRef: true
        }
      };
    }
    return {
      param: {
        type: normalizeRuntimeType(typeName.toLowerCase()),
        declaredType: normalizeDeclaredType(typeName.toLowerCase()),
        name: paramName
      }
    };
  }

  function registerParamRuntimeVars(ownerName, params) {
    const frame = ensureProcFrame(ownerName);
    frame.usesIxFrame = true;
    let nextParamOffset = 4;
    for (const param of params) {
      const paramLabel = `${ownerName}_${param.name}`;
      if (!runtimeVars.has(paramLabel)) {
        if (param.isRef && param.recordTypeName) {
          const recordInfo = typeof getRecordTypeInfo === "function" ? getRecordTypeInfo(param.recordTypeName) : null;
          runtimeVars.set(paramLabel, {
            type: "record",
            declaredType: param.recordTypeName,
            kind: "record",
            recordTypeName: param.recordTypeName,
            recordInfo,
            recordSize: recordInfo?.byteSize,
            scope: ownerName,
            isParam: true,
            isRef: true,
            storage: "stack",
            offset: nextParamOffset
          });
        } else {
          runtimeVars.set(paramLabel, {
            type: param.type,
            ...(param.refTargetType ? { refTargetType: param.refTargetType } : {}),
            declaredType: param.declaredType,
            kind: param.declaredType,
            scope: ownerName,
            isParam: true,
            ...(param.isRef ? { isRef: true } : {}),
            storage: "stack",
            offset: nextParamOffset
          });
        }
      }
      nextParamOffset += param.isRef ? 2 : runtimeParamSlotSize(param.type, param.declaredType);
    }
  }

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

    const dataMatch = trimmed.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:bytes|bitmap8|sprite16|chars|words)(?:$|\s)/i);
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
      const parsed = parseSignatureParam(rp, procName, seenParams, rawLine);
      if (parsed.error) {
        firstPassNameError = parsed.error;
        valid = false;
        break;
      }
      if (parsed.invalid) {
        valid = false;
        break;
      }
      params.push(parsed.param);
    }
    if (!valid || !params.length) continue;
    procSignatures.set(procName, params);
    registerParamRuntimeVars(procName, params);
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
      const parsed = parseSignatureParam(rp, functionName, seenParams, rawLine);
      if (parsed.error) {
        firstPassNameError = parsed.error;
        valid = false;
        break;
      }
      if (parsed.invalid) {
        valid = false;
        break;
      }
      params.push(parsed.param);
    }
    if (!valid) continue;
    procSignatures.set(functionName, params);
    functionReturnTypes.set(functionName, {
      returnType: normalizeRuntimeType(m[3].toLowerCase()),
      declaredType: normalizeDeclaredType(m[3].toLowerCase())
    });
    registerParamRuntimeVars(functionName, params);
  }

  return firstPassNameError;
}
