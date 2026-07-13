export function createValueParseHelpers({
  normalizeExpression,
  parseExpressionAst,
  renderExpressionAst,
  tryEvaluateConstantExpression,
  getRuntimeInfo,
  getRecordTypeInfo,
  functionReturnTypes,
  procSignatures,
  procAsmSymbols,
  resolveDeclaredValueType,
  isAnyFixedDeclaredType,
  emitPushArgument,
  runtimeParamSlotSize,
  emitAdjustSpBy,
  resolveJumpTarget,
  makeGeneratedLabel,
  resolveExpressionAstComputationType
}) {
  function splitTopLevelArgs(text) {
    const source = String(text || "").trim();
    if (!source) return [];
    const parts = [];
    let depthParen = 0;
    let depthBracket = 0;
    let inString = false;
    let start = 0;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "\"") {
        if (inString && source[i + 1] === "\"") {
          i += 1;
          continue;
        }
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "(") depthParen += 1;
      else if (ch === ")") depthParen = Math.max(0, depthParen - 1);
      else if (ch === "[") depthBracket += 1;
      else if (ch === "]") depthBracket = Math.max(0, depthBracket - 1);
      else if (ch === "," && depthParen === 0 && depthBracket === 0) {
        const part = source.slice(start, i).trim();
        if (part) parts.push(part);
        start = i + 1;
      }
    }
    const tail = source.slice(start).trim();
    if (tail) parts.push(tail);
    return parts;
  }

  function parseAmyDeclarationList(text, rawLine = "") {
    const source = String(text || "").trim();
    if (!source) return [];
    const parts = splitTopLevelArgs(source);
    if (!parts.length) {
      throw new Error(`Invalid declaration list: ${rawLine || source}`);
    }
    return parts.map((part) => {
      const match = part.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\[(.+)\])?(?:\s*=\s*(.+))?$/);
      if (!match) {
        throw new Error(`Invalid declaration entry '${part}' in ${rawLine || source}`);
      }
      return {
        name: match[1],
        lengthToken: match[2] ? normalizeExpression(match[2].trim()) : null,
        initial: normalizeExpression((match[3] || "0").trim())
      };
    });
  }

  function isWordChar(ch) {
    return !!ch && /[A-Za-z0-9_]/.test(ch);
  }

  function stripOuterParens(text) {
    let source = String(text || "").trim();
    while (source.startsWith("(") && source.endsWith(")")) {
      let depthParen = 0;
      let depthBracket = 0;
      let inString = false;
      let enclosesWhole = true;
      for (let i = 0; i < source.length; i += 1) {
        const ch = source[i];
        if (ch === "\"") {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (ch === "(") depthParen += 1;
        else if (ch === ")") depthParen = Math.max(0, depthParen - 1);
        else if (ch === "[") depthBracket += 1;
        else if (ch === "]") depthBracket = Math.max(0, depthBracket - 1);
        if (depthParen === 0 && depthBracket === 0 && i < source.length - 1) {
          enclosesWhole = false;
          break;
        }
      }
      if (!enclosesWhole) break;
      source = source.slice(1, -1).trim();
    }
    return source;
  }

  function splitTopLevelKeyword(text, keyword) {
    const source = String(text || "").trim();
    const loweredKeyword = String(keyword || "").toLowerCase();
    if (!source || !loweredKeyword) return [source];
    const parts = [];
    let depthParen = 0;
    let depthBracket = 0;
    let inString = false;
    let start = 0;
    let found = false;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "(") {
        depthParen += 1;
        continue;
      }
      if (ch === ")") {
        depthParen = Math.max(0, depthParen - 1);
        continue;
      }
      if (ch === "[") {
        depthBracket += 1;
        continue;
      }
      if (ch === "]") {
        depthBracket = Math.max(0, depthBracket - 1);
        continue;
      }
      if (depthParen !== 0 || depthBracket !== 0) continue;
      if (source.slice(i, i + loweredKeyword.length).toLowerCase() !== loweredKeyword) continue;
      const before = i > 0 ? source[i - 1] : "";
      const after = i + loweredKeyword.length < source.length ? source[i + loweredKeyword.length] : "";
      if (isWordChar(before) || isWordChar(after)) continue;
      const part = source.slice(start, i).trim();
      if (!part) return [source];
      parts.push(part);
      start = i + loweredKeyword.length;
      i = start - 1;
      found = true;
    }
    if (!found) return [source];
    const tail = source.slice(start).trim();
    if (!tail) return [source];
    parts.push(tail);
    return parts;
  }

  function parseBooleanConditionAst(text) {
    const source = stripOuterParens(String(text || "").trim());
    if (!source) return null;
    const orParts = splitTopLevelKeyword(source, "or");
    if (orParts.length > 1) {
      return orParts
        .map((part) => parseBooleanConditionAst(part))
        .reduce((left, right) => (left ? { kind: "or", left, right } : right), null);
    }
    const andParts = splitTopLevelKeyword(source, "and");
    if (andParts.length > 1) {
      return andParts
        .map((part) => parseBooleanConditionAst(part))
        .reduce((left, right) => (left ? { kind: "and", left, right } : right), null);
    }
    if (/^not\b/i.test(source)) {
      const rest = source.replace(/^not\b/i, "").trim();
      if (!rest) return null;
      const expr = parseBooleanConditionAst(rest);
      return expr ? { kind: "not", expr } : null;
    }
    return { kind: "atom", text: source };
  }

  function parseRoutineInvocation(token) {
    const match = String(token).trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
    if (!match) return null;
    return {
      name: match[1],
      args: splitTopLevelArgs(match[2]).map((part) => normalizeExpression(part))
    };
  }

  function getImplicitNoArgFunctionInvocation(token) {
    const name = String(token).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;
    if (getRuntimeInfo(name)) return null;
    const retInfo = functionReturnTypes.get(name);
    if (!retInfo) return null;
    const sig = procSignatures.get(name) || [];
    if (sig.length !== 0) return null;
    return {
      name,
      returnType: retInfo.returnType,
      declaredType: retInfo.declaredType
    };
  }

  function parseFix8_8Component(token) {
    const match = String(token).trim().match(/^(whole|floor|fraction)\s+(.+)$/i);
    if (!match) return null;
    const component = match[1].toLowerCase() === "floor" ? "whole" : match[1].toLowerCase();
    return { component, valueToken: normalizeExpression(match[2].trim()) };
  }

  function parseWordByteComponent(token) {
    const match = String(token).trim().match(/^(highbyte|lowbyte)\s+(.+)$/i);
    if (!match) return null;
    return { component: match[1].toLowerCase(), valueToken: normalizeExpression(match[2].trim()) };
  }

  function parseDwordWordComponent(token) {
    const match = String(token).trim().match(/^(highword|lowword)\s+(.+)$/i);
    if (!match) return null;
    return { component: match[1].toLowerCase(), valueToken: normalizeExpression(match[2].trim()) };
  }

  function emitRoutineArgumentPushes(name, args, sig, invokeKeyword = "call") {
    if (args.length !== sig.length) return null;
    const lines = [];
    let cleanupBytes = 0;
    for (let i = sig.length - 1; i >= 0; i -= 1) {
      const pushCode = emitPushArgument(args[i], sig[i]);
      if (!pushCode) return null;
      lines.push(...pushCode);
      cleanupBytes += sig[i].isRef ? 2 : runtimeParamSlotSize(sig[i].type, sig[i].declaredType);
    }
    return { lines, cleanupBytes, invokeKeyword, name };
  }

  function emitFunctionInvocation(token) {
    const invocation = parseRoutineInvocation(token);
    const implicitNoArg = invocation ? null : getImplicitNoArgFunctionInvocation(token);
    const effectiveInvocation = invocation || (implicitNoArg ? { name: implicitNoArg.name, args: [] } : null);
    if (!effectiveInvocation) return null;
    const retInfo = functionReturnTypes.get(effectiveInvocation.name);
    if (!retInfo) return null;
    const sig = procSignatures.get(effectiveInvocation.name) || [];
    const prepared = emitRoutineArgumentPushes(effectiveInvocation.name, effectiveInvocation.args, sig, "call");
    if (!prepared) return null;
    let cleanupLines = emitAdjustSpBy(prepared.cleanupBytes);
    if (prepared.cleanupBytes && retInfo.returnType === "int16") {
      cleanupLines = ["    ex de,hl", ...cleanupLines, "    ex de,hl"];
    }
    return {
      ...retInfo,
      lines: [
        ...prepared.lines,
        `    call ${resolveJumpTarget(effectiveInvocation.name)}`,
        ...cleanupLines
      ]
    };
  }

  function isKnownProcedureStatementName(name) {
    return procAsmSymbols.has(name) && !functionReturnTypes.has(name);
  }

  function parseArrayRef(token) {
    const match = String(token).trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\[(.+)\]$/);
    if (!match) return null;
    return { name: match[1], index: match[2].trim() };
  }

  function parseRecordFieldRef(nodeOrText) {
    const node = typeof nodeOrText === "string"
      ? parseExpressionAst(normalizeExpression(String(nodeOrText).trim()))
      : nodeOrText;
    if (!node || node.kind !== "member") return null;
    const fieldNames = [];
    let cursor = node;
    while (cursor?.kind === "member") {
      const fieldName = String(cursor.property || "").trim();
      if (!fieldName) return null;
      fieldNames.unshift(fieldName);
      cursor = cursor.object;
    }

    let baseKind = null;
    let name = null;
    let index = null;
    let recordInfo = null;
    if (cursor?.kind === "identifier") {
      const info = getRuntimeInfo(cursor.name);
      if (!info || info.kind !== "record") return null;
      recordInfo = getRecordTypeInfo?.(info.recordTypeName || info.declaredType);
      if (!recordInfo) return null;
      baseKind = "scalar";
      name = cursor.name;
    } else if (cursor?.kind === "index") {
      const info = getRuntimeInfo(cursor.name);
      if (!info || info.kind !== "record_array") return null;
      recordInfo = getRecordTypeInfo?.(info.recordTypeName || info.declaredType);
      if (!recordInfo) return null;
      baseKind = "array";
      name = cursor.name;
      index = renderExpressionAst(cursor.index);
    } else {
      return null;
    }

    let totalOffset = 0;
    let fieldInfo = null;
    const fieldPath = [];
    for (let i = 0; i < fieldNames.length; i += 1) {
      const fieldName = fieldNames[i];
      fieldInfo = recordInfo?.fields?.get(fieldName);
      if (!fieldInfo) return null;
      totalOffset += fieldInfo.offset;
      fieldPath.push(fieldName);
      if (i < fieldNames.length - 1) {
        if (fieldInfo.type !== "record") return null;
        recordInfo = getRecordTypeInfo?.(fieldInfo.recordTypeName || fieldInfo.declaredType);
        if (!recordInfo) return null;
      }
    }

    return {
      kind: "record_field",
      baseKind,
      name,
      index,
      fieldName: fieldNames[fieldNames.length - 1],
      fieldPath,
      fieldInfo,
      recordInfo,
      totalOffset
    };
  }

  function parseBuiltinInputRef(nodeOrText) {
    const node = typeof nodeOrText === "string"
      ? parseExpressionAst(normalizeExpression(String(nodeOrText).trim()))
      : nodeOrText;
    if (!node) return null;
    if (node.kind === "call") {
      const name = String(node.name || "").toLowerCase();
      if ((name === "joypad" || name === "keypad" || name === "spinner") && node.args.length === 1) {
        const padNumber = tryEvaluateConstantExpression(renderExpressionAst(node.args[0]));
        if (padNumber !== 1 && padNumber !== 2) return null;
        return {
          source: name,
          pad: padNumber,
          runtimeName: `${name.toUpperCase()}_${padNumber}`,
          valueType: "int8",
          declaredType: "u8"
        };
      }
      return null;
    }
    if (node.kind === "identifier" && String(node.name || "").toLowerCase() === "frame") {
      return {
        source: "frame",
        runtimeName: "AMY_FRAME_COUNTER",
        valueType: "int16",
        declaredType: "u16"
      };
    }
    if (node.kind === "member") {
      const property = String(node.property || "").toLowerCase();
      if (property === "status" && node.object?.kind === "identifier" && String(node.object.name || "").toLowerCase() === "vdp") {
        return {
          source: "vdp_status",
          runtimeName: "VDP_STATUS",
          valueType: "int8",
          declaredType: "u8"
        };
      }
      const joypadSource = parseBuiltinInputRef(node.object);
      if (joypadSource?.source !== "joypad") return null;
      const bits = { up: 0, right: 1, down: 2, left: 3, button4: 4, button3: 5, button2: 6, button1: 7 };
      if (!(property in bits)) return null;
      return {
        source: "joypad_bit",
        pad: joypadSource.pad,
        runtimeName: joypadSource.runtimeName,
        property,
        bit: bits[property],
        valueType: "int8",
        declaredType: "boolean"
      };
    }
    return null;
  }

  function emitLoadBuiltinInputInto(register, builtinInput) {
    if (!builtinInput) return null;
    const lowerRegister = String(register || "").toLowerCase();
    let lines = null;
    if (builtinInput.source === "joypad" || builtinInput.source === "keypad" || builtinInput.source === "spinner" || builtinInput.source === "vdp_status" || builtinInput.source === "frame") {
      lines = [`    ld a,(${builtinInput.runtimeName})`];
    } else if (builtinInput.source === "joypad_bit") {
      const falseLabel = makeGeneratedLabel("InputFalse");
      const doneLabel = makeGeneratedLabel("InputDone");
      lines = [
        `    ld a,(${builtinInput.runtimeName})`,
        `    bit ${builtinInput.bit},a`,
        `    jr z,${falseLabel}`,
        "    ld a,1",
        `    jr ${doneLabel}`,
        `${falseLabel}:`,
        "    xor a",
        `${doneLabel}:`
      ];
    }
    if (!lines) return null;
    if (lowerRegister !== "a") lines.push(`    ld ${register},a`);
    return lines;
  }

  function isIndexedByteReadable(info) {
    return !!info && (
      (info.kind === "array" && info.elementType === "int8")
      || info.kind === "bcd"
      || info.kind === "u32"
      || info.kind === "i32"
    );
  }

  function resolveValueType(token) {
    const builtinInput = parseBuiltinInputRef(token);
    if (builtinInput) return builtinInput.valueType;
    const recordField = parseRecordFieldRef(token);
    if (recordField) return recordField.fieldInfo.type;
    const invocation = parseRoutineInvocation(token);
    if (invocation) {
      const retInfo = functionReturnTypes.get(invocation.name);
      if (!retInfo) return null;
      return retInfo.returnType;
    }
    const arrayRef = parseArrayRef(token);
    if (arrayRef) {
      const info = getRuntimeInfo(arrayRef.name);
      if (!info) return null;
      if (info.kind === "array") return info.elementType;
      if (info.kind === "bcd") return "int8";
      if (info.kind === "u32" || info.kind === "i32") return "int8";
      return null;
    }
    const fixPart = parseFix8_8Component(token);
    if (fixPart) {
      const declared = resolveDeclaredValueType(fixPart.valueToken);
      if (isAnyFixedDeclaredType(declared)) return "int8";
    }
    const wordBytePart = parseWordByteComponent(token);
    if (wordBytePart) {
      const declared = resolveDeclaredValueType(wordBytePart.valueToken);
      if (declared === "u16" || declared === "i16" || isAnyFixedDeclaredType(declared)) return "int8";
    }
    const dwordWordPart = parseDwordWordComponent(token);
    if (dwordWordPart) {
      const declared = resolveDeclaredValueType(dwordWordPart.valueToken);
      if (declared === "u32" || declared === "i32") return "int16";
    }
    const info = getRuntimeInfo(token);
    const implicitFn = getImplicitNoArgFunctionInvocation(token);
    if (!info && implicitFn) return implicitFn.returnType;
    if (info) {
      if (info.kind === "array") return null;
      if (info.kind === "u32") return "u32";
      if (info.kind === "i32") return "i32";
      if (info.isRef && info.refTargetType) return info.refTargetType;
      return info.type;
    }
    return null;
  }

  function resolveExpressionAstValueType(node) {
    return resolveExpressionAstComputationType(node)?.runtimeType || null;
  }

  function resolveExpressionAstDeclaredType(node) {
    return resolveExpressionAstComputationType(node)?.declaredType || null;
  }

  return {
    splitTopLevelArgs,
    parseAmyDeclarationList,
    isWordChar,
    stripOuterParens,
    splitTopLevelKeyword,
    parseBooleanConditionAst,
    parseRoutineInvocation,
    getImplicitNoArgFunctionInvocation,
    parseFix8_8Component,
    parseWordByteComponent,
    parseDwordWordComponent,
    emitRoutineArgumentPushes,
    emitFunctionInvocation,
    isKnownProcedureStatementName,
    parseArrayRef,
    parseRecordFieldRef,
    parseBuiltinInputRef,
    emitLoadBuiltinInputInto,
    isIndexedByteReadable,
    resolveValueType,
    resolveExpressionAstValueType,
    resolveExpressionAstDeclaredType
  };
}
