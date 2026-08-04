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
  getStaticAbiParams,
  runtimeParamSlotSize,
  emitAdjustSpBy,
  resolveJumpTarget,
  makeGeneratedLabel,
  resolveExpressionAstComputationType,
  scopedRuntimeName,
  formatIxOffset,
  emitLoadInt8ValueInto
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
    const staticParams = typeof getStaticAbiParams === "function" ? getStaticAbiParams(name) : null;
    if (staticParams && staticParams.length === sig.length) {
      const preparedArgs = args.map((arg, index) => emitPushArgument(arg, sig[index]));
      if (preparedArgs.some((code) => !code || code[code.length - 1]?.trim().toLowerCase() !== "push hl")) return null;
      const needsStaging = preparedArgs.some((code) => code.some((line) => /^\s*call\b/i.test(line)));
      const lines = [];
      const storeParam = (param) => param.type === "int16"
        ? [`    ld (${param.asmName}),hl`]
        : ["    ld a,l", `    ld (${param.asmName}),a`];
      if (needsStaging) {
        for (let index = preparedArgs.length - 1; index >= 0; index -= 1) lines.push(...preparedArgs[index]);
        for (const param of staticParams) lines.push("    pop hl", ...storeParam(param));
      } else {
        for (let index = 0; index < preparedArgs.length; index += 1) {
          const param = staticParams[index];
          const code = preparedArgs[index].slice(0, -1);
          if (param.type === "int8") {
            const constant = tryEvaluateConstantExpression(args[index]);
            if (Number.isInteger(constant)) {
              lines.push(`    ld a,${constant & 0xFF}`, `    ld (${param.asmName}),a`);
              continue;
            }
            const unsignedSuffix = ["ld l,a", "ld h,0"];
            const signedSuffix = ["ld l,a", "add a,a", "sbc a,a", "ld h,a"];
            const lowered = code.map((line) => line.trim().toLowerCase());
            const suffix = lowered.slice(-signedSuffix.length).join("|") === signedSuffix.join("|")
              ? signedSuffix.length
              : lowered.slice(-unsignedSuffix.length).join("|") === unsignedSuffix.join("|")
                ? unsignedSuffix.length
                : 0;
            lines.push(...code.slice(0, code.length - suffix), `    ld (${param.asmName}),a`);
            continue;
          }
          lines.push(...code, ...storeParam(param));
        }
      }
      return { lines, cleanupBytes: 0, invokeKeyword, name, staticAbi: true };
    }
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
        const padToken = normalizeExpression(renderExpressionAst(node.args[0]));
        const padNumber = tryEvaluateConstantExpression(padToken);
        if (padNumber === 1 || padNumber === 2) {
          return {
            source: name,
            pad: padNumber,
            runtimeName: `${name.toUpperCase()}_${padNumber}`,
            valueType: "int8",
            declaredType: name === "spinner" ? "i8" : "u8"
          };
        }
        const padInfo = getRuntimeInfo(padToken);
        const selectorType = resolveExpressionAstComputationType(node.args[0]);
        if ((!padInfo || padInfo.type !== "int8") && selectorType?.runtimeType !== "int8") return null;
        return {
          source: name,
          pad: null,
          padToken,
          runtimeName: null,
          valueType: "int8",
          declaredType: name === "spinner" ? "i8" : "u8"
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
        padToken: joypadSource.padToken,
        runtimeName: joypadSource.runtimeName,
        property,
        bit: bits[property],
        valueType: "int8",
        declaredType: "boolean"
      };
    }
    return null;
  }

  function emitLoadSelectedInputValue(builtinInput) {
    const inputSource = builtinInput.source === "joypad_bit" ? "joypad" : builtinInput.source;
    if (builtinInput.runtimeName) return [`    ld a,(${builtinInput.runtimeName})`];
    const padInfo = getRuntimeInfo(builtinInput.padToken);
    const selectorLoad = typeof emitLoadInt8ValueInto === "function" ? emitLoadInt8ValueInto("a", builtinInput.padToken) : null;
    if (!selectorLoad) return null;
    const lines = [];
    lines.push(...selectorLoad);
    const padOneLabel = makeGeneratedLabel("InputPadOne");
    const doneLabel = makeGeneratedLabel("InputPadDone");
    lines.push(
      "    cp 1",
      `    jr z,${padOneLabel}`,
      `    ld a,(${inputSource.toUpperCase()}_2)`,
      `    jr ${doneLabel}`,
      `${padOneLabel}:`,
      `    ld a,(${inputSource.toUpperCase()}_1)`,
      `${doneLabel}:`
    );
    return lines;
  }

  function emitLoadBuiltinInputInto(register, builtinInput) {
    if (!builtinInput) return null;
    const lowerRegister = String(register || "").toLowerCase();
    let lines = null;
    if (builtinInput.source === "spinner") {
      if (builtinInput.runtimeName) {
        lines = [
          "    di",
          `    ld hl,${builtinInput.runtimeName}`,
          "    ld a,(hl)",
          "    ld (hl),0",
          "    ei"
        ];
        if (builtinInput.pad === 1) lines.push("    neg");
      } else {
        const selectorLoad = typeof emitLoadInt8ValueInto === "function" ? emitLoadInt8ValueInto("a", builtinInput.padToken) : null;
        if (!selectorLoad) return null;
        const portOneLabel = makeGeneratedLabel("SpinnerPortOne");
        const doneLabel = makeGeneratedLabel("SpinnerReadDone");
        lines = [
          ...selectorLoad,
          "    cp 1",
          "    di",
          `    jr z,${portOneLabel}`,
          "    ld hl,SPINNER_2",
          "    ld a,(hl)",
          "    ld (hl),0",
          "    ei",
          `    jr ${doneLabel}`,
          `${portOneLabel}:`,
          "    ld hl,SPINNER_1",
          "    ld a,(hl)",
          "    ld (hl),0",
          "    ei",
          "    neg",
          `${doneLabel}:`
        ];
      }
    } else if (builtinInput.source === "joypad" || builtinInput.source === "keypad") {
      lines = emitLoadSelectedInputValue(builtinInput);
    } else if (builtinInput.source === "vdp_status" || builtinInput.source === "frame") {
      lines = [`    ld a,(${builtinInput.runtimeName})`];
    } else if (builtinInput.source === "joypad_bit") {
      const falseLabel = makeGeneratedLabel("InputFalse");
      const doneLabel = makeGeneratedLabel("InputDone");
      const loadJoypad = emitLoadSelectedInputValue(builtinInput);
      if (!loadJoypad) return null;
      lines = [
        ...loadJoypad,
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
