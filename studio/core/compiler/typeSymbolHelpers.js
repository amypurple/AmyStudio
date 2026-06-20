export function createTypeSymbolHelpers(ctx) {
  const {
    lowerName,
    isValidSymbolName,
    isReservedAmyIdentifier,
    describeGlobalNameCollision,
    normalizeExpression,
    getRuntimeInfo,
    scopedRuntimeName,
    runtimeTypeSize,
    constAsmSymbols,
    dataAsmSymbols,
    assetAsmSymbols,
    procAsmSymbols,
    labelAsmSymbols,
    userVarAsmSymbols,
    userAsmNames,
    sourceTypeAliases
  } = ctx;

  const CANONICAL_SOURCE_TYPE_NAMES = ["boolean", "bool", "u8", "i8", "u16", "i16", "u32", "i32", "fixed", "ufixed", "fixed32", "fp5", "float"];
  const REMOVED_SOURCE_TYPE_NAMES = new Set(["byte", "word", "integer", "char", "int", "long", "fix8_8", "ufix8_8"]);
  const canonicalSourceTypeList = CANONICAL_SOURCE_TYPE_NAMES.join(", ");

  function resolveSourceTypeName(type) {
    let lowered = String(type || "").trim().toLowerCase();
    if (!lowered) return null;
    const seen = new Set();
    while (sourceTypeAliases.has(lowered)) {
      if (seen.has(lowered)) return null;
      seen.add(lowered);
      lowered = sourceTypeAliases.get(lowered);
    }
    return lowered;
  }

  function isCanonicalSourceTypeName(type) {
    return CANONICAL_SOURCE_TYPE_NAMES.includes(String(type || "").trim().toLowerCase());
  }

  function isSupportedSourceTypeName(type) {
    const resolved = resolveSourceTypeName(type);
    return !!resolved && isCanonicalSourceTypeName(resolved);
  }

  function isRemovedSourceTypeName(type) {
    return REMOVED_SOURCE_TYPE_NAMES.has(String(type || "").trim().toLowerCase());
  }

  function normalizeRuntimeType(type) {
    const lowered = resolveSourceTypeName(type) || String(type || "").trim().toLowerCase();
    if (lowered === "boolean" || lowered === "bool") return "int8";
    if (lowered === "u8" || lowered === "i8") return "int8";
    if (lowered === "u16" || lowered === "i16" || lowered === "fix8_8" || lowered === "fixed" || lowered === "ufix8_8" || lowered === "ufixed") return "int16";
    if (lowered === "u32") return "u32";
    if (lowered === "i32") return "i32";
    if (lowered === "fix16_16" || lowered === "fixed32") return "i32";
    if (lowered === "fp5" || lowered === "float") return "fp5";
    return lowered;
  }

  function normalizeDeclaredType(type) {
    const lowered = resolveSourceTypeName(type) || String(type || "").trim().toLowerCase();
    if (lowered === "bool") return "boolean";
    if (lowered === "fixed") return "fix8_8";
    if (lowered === "ufixed") return "ufix8_8";
    if (lowered === "fixed32") return "fix16_16";
    if (lowered === "float") return "fp5";
    return lowered;
  }

  function registerSourceTypeAlias(aliasName, targetType, rawLine) {
    const aliasLower = lowerName(aliasName);
    if (!isValidSymbolName(aliasName)) return `Invalid type alias name in ${rawLine}`;
    if (isCanonicalSourceTypeName(aliasLower)) return `Cannot redefine canonical type '${aliasName}' in ${rawLine}`;
    if (isReservedAmyIdentifier(aliasName) && !isRemovedSourceTypeName(aliasLower)) {
      return `Type alias '${aliasName}' collides with a reserved Amy keyword in ${rawLine}`;
    }
    if (describeGlobalNameCollision(aliasName)) {
      return `Type alias '${aliasName}' collides with an existing symbol in ${rawLine}`;
    }
    const resolvedTarget = resolveSourceTypeName(targetType);
    if (!resolvedTarget || !isCanonicalSourceTypeName(resolvedTarget)) {
      return `Type alias target '${targetType}' must resolve to a canonical type (${canonicalSourceTypeList}) in ${rawLine}`;
    }
    sourceTypeAliases.set(aliasLower, resolvedTarget);
    return null;
  }

  function isFix8_8DeclaredType(type) {
    return normalizeDeclaredType(type) === "fix8_8";
  }

  function isUFix8_8DeclaredType(type) {
    return normalizeDeclaredType(type) === "ufix8_8";
  }

  function isFix16_16DeclaredType(type) {
    return normalizeDeclaredType(type) === "fix16_16";
  }

  function isFp5DeclaredType(type) {
    return normalizeDeclaredType(type) === "fp5";
  }

  function isAnyFixedDeclaredType(type) {
    const lowered = normalizeDeclaredType(type);
    return lowered === "fix8_8" || lowered === "ufix8_8" || lowered === "fix16_16";
  }

  function isAnyFixed8DeclaredType(type) {
    const lowered = normalizeDeclaredType(type);
    return lowered === "fix8_8" || lowered === "ufix8_8";
  }

  function allocateUserAsmSymbol(prefix, sourceName) {
    const normalizedSource = String(sourceName).replace(/[^A-Za-z0-9_]/g, "_");
    const base = `AMY_${prefix}_${normalizedSource}`;
    let candidate = base;
    let suffix = 1;
    while (userAsmNames.has(candidate.toLowerCase())) candidate = `${base}_${suffix++}`;
    userAsmNames.add(candidate.toLowerCase());
    return candidate;
  }

  function ensureMappedAsmSymbol(map, prefix, sourceName) {
    if (!map.has(sourceName)) map.set(sourceName, allocateUserAsmSymbol(prefix, sourceName));
    return map.get(sourceName);
  }

  function ensureConstAsmSymbol(sourceName) {
    return ensureMappedAsmSymbol(constAsmSymbols, "UCONST", sourceName);
  }

  function ensureDataAsmSymbol(sourceName) {
    return ensureMappedAsmSymbol(dataAsmSymbols, "UDATA", sourceName);
  }

  function ensureAssetAsmSymbol(sourceName) {
    if (!assetAsmSymbols.has(sourceName)) {
      const asmName = `Asset_${String(sourceName).replace(/[^A-Za-z0-9_]/g, "_")}`;
      assetAsmSymbols.set(sourceName, asmName);
      userAsmNames.add(asmName.toLowerCase());
    }
    return assetAsmSymbols.get(sourceName);
  }

  function ensureProcAsmSymbol(sourceName) {
    if (String(sourceName).toLowerCase() === "start") return "Start";
    return ensureMappedAsmSymbol(procAsmSymbols, "UPROC", sourceName);
  }

  function ensureLabelAsmSymbol(sourceName) {
    return ensureMappedAsmSymbol(labelAsmSymbols, "ULBL", sourceName);
  }

  function ensureUserVarAsmSymbol(sourceName) {
    return ensureMappedAsmSymbol(userVarAsmSymbols, "UVAR", sourceName);
  }

  function resolveNamedAsmSymbol(sourceName) {
    if (userVarAsmSymbols.has(sourceName)) return userVarAsmSymbols.get(sourceName);
    if (constAsmSymbols.has(sourceName)) return constAsmSymbols.get(sourceName);
    if (dataAsmSymbols.has(sourceName)) return dataAsmSymbols.get(sourceName);
    if (assetAsmSymbols.has(sourceName)) return assetAsmSymbols.get(sourceName);
    if (labelAsmSymbols.has(sourceName)) return labelAsmSymbols.get(sourceName);
    if (procAsmSymbols.has(sourceName)) return procAsmSymbols.get(sourceName);
    const runtimeInfo = getRuntimeInfo(sourceName);
    if (runtimeInfo?.asmName) return runtimeInfo.asmName;
    return null;
  }

  function rewriteUserSymbolsInExpression(expr) {
    return String(expr).replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (name) => resolveNamedAsmSymbol(name) || name);
  }

  function symbolOrValue(token) {
    return rewriteUserSymbolsInExpression(normalizeExpression(token));
  }

  function resolveAddressSymbol(token) {
    const info = getRuntimeInfo(token);
    if (info) return scopedRuntimeName(token);
    return resolveNamedAsmSymbol(token) || token;
  }

  function resolveJumpTarget(name) {
    return labelAsmSymbols.get(name) || procAsmSymbols.get(name) || name;
  }

  function resolveSourceJumpTarget(name) {
    return labelAsmSymbols.get(name) || procAsmSymbols.get(name) || null;
  }

  function formatUnknownJumpTargetLog(name, rawLine) {
    return `Unknown jump target: ${name} in ${rawLine}. Define it as '${name}:', 'label ${name}:', or a matching subroutine.`;
  }

  function formatUnknownCallTargetLog(name, rawLine) {
    return `Unknown call target: ${name} in ${rawLine}. Define it as 'sub ${name}:' or a matching function/subroutine signature.`;
  }

  function runtimeParamSlotSize(type, declaredType = type) {
    if (type === "u32" || type === "i32") return 4;
    if (type === "fp5") return 5;
    if (type === "int8") return 2;
    if (type === "int16") return 2;
    if (normalizeRuntimeType(declaredType) === "u32" || normalizeRuntimeType(declaredType) === "i32") return 4;
    if (normalizeRuntimeType(declaredType) === "fp5") return 5;
    return runtimeTypeSize(type);
  }

  return {
    CANONICAL_SOURCE_TYPE_NAMES,
    REMOVED_SOURCE_TYPE_NAMES,
    canonicalSourceTypeList,
    resolveSourceTypeName,
    isCanonicalSourceTypeName,
    isSupportedSourceTypeName,
    isRemovedSourceTypeName,
    normalizeRuntimeType,
    normalizeDeclaredType,
    registerSourceTypeAlias,
    isFix8_8DeclaredType,
    isUFix8_8DeclaredType,
    isFix16_16DeclaredType,
    isFp5DeclaredType,
    isAnyFixedDeclaredType,
    isAnyFixed8DeclaredType,
    symbolOrValue,
    allocateUserAsmSymbol,
    ensureMappedAsmSymbol,
    ensureConstAsmSymbol,
    ensureDataAsmSymbol,
    ensureAssetAsmSymbol,
    ensureProcAsmSymbol,
    ensureLabelAsmSymbol,
    ensureUserVarAsmSymbol,
    resolveNamedAsmSymbol,
    rewriteUserSymbolsInExpression,
    resolveAddressSymbol,
    resolveJumpTarget,
    resolveSourceJumpTarget,
    formatUnknownJumpTargetLog,
    formatUnknownCallTargetLog,
    runtimeParamSlotSize
  };
}
