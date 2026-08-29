import { analyzeStaticAbiEligibility } from "./staticAbiAnalysis.js?v=20260730-static-abi-v11";

export function transpileAmyCore(sourceText, deps) {
  const {
    resolveStaticAbiInclude,
    rewriteImmediateByteTempCoordinateUsesCore,
    inferAmyMemoryCapabilities,
    sourceHintsTinySound,
    getRamLayout,
    emitSafeCallCore,
    parseCartridgeDirectiveCore,
    parseExpressionAstCore,
    renderExpressionAstCore,
    createTypeSymbolHelpers,
    createProcHelpers,
    createValueParseHelpers,
    createExpressionComputeHelpers,
    createRuntimeValueHelpers,
    createCompareLiteralHelpers,
    createPrintHelpers,
    createBcdHelpers,
    createControlFlowHelpers,
    createCompilerShellHelpers,
    createDataHelpers,
    createLoadStoreHelpers,
    createByteLoadHelpers,
    createAddressHelpers,
    createU32Helpers,
    createFx16Helpers,
    createSimpleArithmeticHelpers,
    createAssignmentArithmeticHelpers,
    scanAmyFirstPass,
    handleDataMetaStatement,
    handleDeclarationStatement,
    handleProcFunctionStatement,
    handleDisplayGraphicsSpriteStatement,
    handleSoundSpinnerStatement,
    handleVramTextStatement,
    handlePrintFormatStatement,
    handleVramPixelInputStatement,
    handleDataCursorStatement,
    handleWhileStatement,
    handleDoStatement,
    handleIfStatement,
    handleSelectCaseStatement,
    handleForStatement,
    handleRandomBounceStatement,
    handleSpecialIfGotoStatement,
    handleDispatchLabelStatement,
    handleRoutineStatement,
    handleMutateStatement,
    handleMathBitStatement,
    handleArrayBulkStatement,
    createInlineStatementCompiler,
    finalizeAmyTranspile,
    stripAmyInlineComment
  } = deps;

  function preprocessCompileTimeConditionals(rawLines) {
    const result = [...rawLines];
    const definedSymbols = new Set();
    const stack = [];
    const isActive = () => stack.every((entry) => entry.active);
    const strippedLine = (index) => stripAmyInlineComment(rawLines[index]).trim();
    const symbolIsDefined = (name) => definedSymbols.has(String(name || "").toLowerCase());

    const tokenizeDefinedExpression = (expr) => {
      const source = String(expr || "").trim();
      if (!source) return null;
      const tokens = [];
      let index = 0;
      while (index < source.length) {
        const rest = source.slice(index);
        const space = rest.match(/^\s+/);
        if (space) { index += space[0].length; continue; }
        const word = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (word) { tokens.push(word[0]); index += word[0].length; continue; }
        const paren = rest.match(/^[()]/);
        if (paren) { tokens.push(paren[0]); index += 1; continue; }
        return null;
      }
      return tokens;
    };

    const evaluateDefinedExpression = (expr) => {
      const tokens = tokenizeDefinedExpression(expr);
      if (!tokens || !tokens.length) return { ok: false, log: "empty defined expression" };
      const out = [];
      for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        const lower = token.toLowerCase();
        if (lower === "and") { out.push("&&"); continue; }
        if (lower === "or") { out.push("||"); continue; }
        if (lower === "not") { out.push("!"); continue; }
        if (token === "(" || token === ")") { out.push(token); continue; }
        if (lower === "defined") {
          let symbol = tokens[index + 1];
          if (symbol === "(") {
            symbol = tokens[index + 2];
            if (!symbol || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol) || tokens[index + 3] !== ")") {
              return { ok: false, log: "invalid defined(...) expression" };
            }
            out.push(symbolIsDefined(symbol) ? "true" : "false");
            index += 3;
          } else {
            if (!symbol || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) {
              return { ok: false, log: "missing symbol after defined" };
            }
            out.push(symbolIsDefined(symbol) ? "true" : "false");
            index += 1;
          }
          continue;
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) return { ok: false, log: "invalid token '" + token + "'" };
        out.push(symbolIsDefined(token) ? "true" : "false");
      }
      try {
        return { ok: true, active: Boolean(Function("return (" + out.join(" ") + ");")()) };
      } catch (error) {
        return { ok: false, log: error.message || "invalid expression" };
      }
    };

    const parseDefinedCondition = (line) => {
      let match = line.match(/^(?:#ifdef|ifdef)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (match) return { handled: true, active: symbolIsDefined(match[1]), modern: false };
      match = line.match(/^(?:#ifndef|ifndef)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (match) return { handled: true, active: !symbolIsDefined(match[1]), modern: false };
      match = line.match(/^if\s+defined\s+(.+)$/i);
      if (match) {
        const evaluated = evaluateDefinedExpression(match[1]);
        if (!evaluated.ok) return { handled: true, error: "invalid compile-time condition at line: " + evaluated.log };
        return { handled: true, active: evaluated.active, modern: true };
      }
      match = line.match(/^if\s+not\s+defined\s+(.+)$/i) || line.match(/^if\s+not\s+define\s+(.+)$/i);
      if (match) {
        const evaluated = evaluateDefinedExpression(match[1]);
        if (!evaluated.ok) return { handled: true, error: "invalid compile-time condition at line: " + evaluated.log };
        return { handled: true, active: !evaluated.active, modern: true };
      }
      return { handled: false };
    };

    const parseElseDefinedCondition = (line) => {
      if (/^else\s+defined$/i.test(line)) return { handled: true, fallback: true };
      let match = line.match(/^else\s+(?:if\s+)?defined\s+(.+)$/i);
      if (match) {
        const expr = String(match[1] || "").trim();
        if (!expr) return { handled: true, fallback: true };
        const evaluated = evaluateDefinedExpression(expr);
        if (!evaluated.ok) return { handled: true, error: "invalid compile-time else condition: " + evaluated.log };
        return { handled: true, active: evaluated.active };
      }
      match = line.match(/^else\s+(?:if\s+)?not\s+defined\s+(.+)$/i);
      if (match) {
        const evaluated = evaluateDefinedExpression(match[1]);
        if (!evaluated.ok) return { handled: true, error: "invalid compile-time else condition: " + evaluated.log };
        return { handled: true, active: !evaluated.active };
      }
      return { handled: false };
    };

    for (let index = 0; index < rawLines.length; index += 1) {
      const line = strippedLine(index);
      if (!line) continue;

      const defineFlag = line.match(/^(?:#define|define)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (defineFlag) {
        result[index] = "";
        if (isActive()) definedSymbols.add(defineFlag[1].toLowerCase());
        continue;
      }

      const condition = parseDefinedCondition(line);
      if (condition.handled) {
        result[index] = "";
        if (condition.error) return { ok: false, log: condition.error + ` at line ${index + 1}` };
        const parentActive = isActive();
        const conditionActive = Boolean(condition.active);
        stack.push({
          parentActive,
          branchMatched: conditionActive,
          active: parentActive && conditionActive,
          sawFallback: false,
          line: index + 1,
          modern: Boolean(condition.modern)
        });
        continue;
      }

      const elseCondition = parseElseDefinedCondition(line);
      if (elseCondition.handled) {
        result[index] = "";
        if (!stack.length) return { ok: false, log: `else defined without matching if defined at line ${index + 1}` };
        const current = stack[stack.length - 1];
        if (current.sawFallback) return { ok: false, log: `conditional branch after fallback for compile-time block started at line ${current.line}` };
        if (elseCondition.error) return { ok: false, log: elseCondition.error + ` at line ${index + 1}` };
        if (elseCondition.fallback) {
          current.sawFallback = true;
          current.active = current.parentActive && !current.branchMatched;
        } else {
          const branchActive = Boolean(elseCondition.active);
          current.active = current.parentActive && !current.branchMatched && branchActive;
          current.branchMatched = current.branchMatched || branchActive;
        }
        continue;
      }

      if (/^(?:#else|else\s+ifdef|else\s+ifndef)$/i.test(line)) {
        result[index] = "";
        if (!stack.length) return { ok: false, log: `else without matching ifdef/ifndef at line ${index + 1}` };
        const current = stack[stack.length - 1];
        if (current.sawFallback) return { ok: false, log: `multiple else clauses for ifdef/ifndef started at line ${current.line}` };
        current.sawFallback = true;
        current.active = current.parentActive && !current.branchMatched;
        continue;
      }

      if (/^(?:#endif|end\s+ifdef|end\s+ifndef|end\s+defined)$/i.test(line)) {
        result[index] = "";
        if (!stack.length) return { ok: false, log: `endif without matching ifdef/ifndef at line ${index + 1}` };
        stack.pop();
        continue;
      }

      if (!isActive()) result[index] = "";
    }

    if (stack.length) {
      const current = stack[stack.length - 1];
      return { ok: false, log: `missing endif/end defined for compile-time block started at line ${current.line}` };
    }
    return { ok: true, lines: result, definedSymbols };
  }

  function lowerRecordScopeAliases(rawLines) {
    const result = [];
    const blockStack = [];
    const aliases = [];

    const rewriteAliases = (rawLine) => {
      if (!aliases.length) return rawLine;
      let quoted = false;
      let codeEnd = rawLine.length;
      for (let index = 0; index < rawLine.length; index += 1) {
        const char = rawLine[index];
        if (char === '"') quoted = !quoted;
        else if (char === "'" && !quoted) { codeEnd = index; break; }
      }
      let code = rawLine.slice(0, codeEnd);
      for (let index = aliases.length - 1; index >= 0; index -= 1) {
        const alias = aliases[index];
        const escaped = alias.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`\\b${escaped}(?=\\s*\\.)`, "gi");
        let output = "";
        let start = 0;
        let inString = false;
        for (let cursor = 0; cursor < code.length; cursor += 1) {
          if (code[cursor] !== '"') continue;
          const segment = code.slice(start, cursor);
          output += inString ? segment : segment.replace(pattern, alias.prefix);
          output += '"';
          inString = !inString;
          start = cursor + 1;
        }
        const tail = code.slice(start);
        output += inString ? tail : tail.replace(pattern, alias.prefix);
        code = output;
      }
      return `${code}${rawLine.slice(codeEnd)}`;
    };

    for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex += 1) {
      const rawLine = rawLines[lineIndex];
      const stripped = stripAmyInlineComment(rawLine).trim();
      const lexical = stripped.match(/^with\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?$/i);
      if (lexical) {
        const name = lexical[2];
        if (aliases.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
          return { ok: false, log: `Duplicate with alias '${name}' at line ${lineIndex + 1}` };
        }
        const entry = { kind: "lexical", name, prefix: lexical[1] };
        aliases.push(entry);
        blockStack.push(entry);
        result.push("");
        continue;
      }
      if (/^with\b/i.test(stripped)) {
        blockStack.push({ kind: "runtime" });
        result.push(rewriteAliases(rawLine));
        continue;
      }
      if (/^end\s+with$/i.test(stripped)) {
        const entry = blockStack.pop();
        if (entry?.kind === "lexical") {
          aliases.pop();
          result.push("");
        } else {
          result.push(rewriteAliases(rawLine));
        }
        continue;
      }
      result.push(rewriteAliases(rawLine));
    }
    const unclosed = [...blockStack].reverse().find((entry) => entry.kind === "lexical");
    if (unclosed) return { ok: false, log: `with ${unclosed.name} is missing end with` };
    return { ok: true, lines: result };
  }

  function validateRecordAliasControlFlow(rawLines) {
    const blockStack = [];
    const labels = new Map();
    const transfers = [];
    let nextRuntimeBlockId = 1;
    const activeRuntimePath = () => blockStack.filter((entry) => entry.kind === "runtime").map((entry) => entry.id);
    const addTransfer = (target, line) => transfers.push({ target: target.toLowerCase(), line, path: activeRuntimePath() });

    for (let index = 0; index < rawLines.length; index += 1) {
      const stripped = stripAmyInlineComment(rawLines[index]).trim();
      if (!stripped) continue;
      if (/^end\s+with$/i.test(stripped)) {
        blockStack.pop();
        continue;
      }

      const label = stripped.match(/^(?:label\s+([A-Za-z_][A-Za-z0-9_]*):?|([A-Za-z_][A-Za-z0-9_]*):)$/i);
      const labelName = label?.[1] || label?.[2];
      if (labelName) labels.set(labelName.toLowerCase(), { line: index + 1, path: activeRuntimePath() });

      for (const match of stripped.matchAll(/\b(?:goto|gosub)\s+([A-Za-z_][A-Za-z0-9_]*)/gi)) {
        addTransfer(match[1], index + 1);
      }
      const indexedDispatch = stripped.match(/^on\s+.+?\s+go(?:to|sub)\s+(.+)$/i);
      if (indexedDispatch) {
        for (const target of indexedDispatch[1].split(",")) {
          const name = target.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)$/)?.[1];
          if (name) addTransfer(name, index + 1);
        }
      }

      if (/^with\b/i.test(stripped)) {
        const runtime = /^with(?:\s+each)?\s+[A-Za-z_][A-Za-z0-9_]*\s*\[/i.test(stripped);
        blockStack.push(runtime
          ? { kind: "runtime", id: nextRuntimeBlockId++, line: index + 1 }
          : { kind: "lexical" });
      }
    }

    for (const transfer of transfers) {
      const target = labels.get(transfer.target);
      if (!target || target.path.length === 0) continue;
      const entersInactiveAlias = target.path.some((id, index) => transfer.path[index] !== id);
      if (entersInactiveAlias) {
        return {
          ok: false,
          log: `Line ${transfer.line}: jump to '${transfer.target}' enters a record alias block before its pointer is initialized (target line ${target.line})`
        };
      }
    }
    return { ok: true };
  }
  function parseSceneDeclarations(rawLines) {
    const lines = [...rawLines];
    const scenes = [];
    const names = new Set();
    let overlayName = "";
    for (let index = 0; index < lines.length; index += 1) {
      const start = stripAmyInlineComment(lines[index]).trim().match(/^scene\s+([A-Za-z_][A-Za-z0-9_]*)\s+uses\s+([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (!start) continue;
      const name = start[1];
      if (names.has(name.toLowerCase())) return { ok: false, log: `Duplicate scene '${name}' at line ${index + 1}` };
      if (name.toLowerCase() !== start[3].toLowerCase()) return { ok: false, log: `Scene '${name}' must use the matching overlay part '${start[2]}.${name}' at line ${index + 1}` };
      if (overlayName && overlayName.toLowerCase() !== start[2].toLowerCase()) return { ok: false, log: "Amy scene v1 supports one overlay group per program." };
      overlayName = start[2];
      let enterRoutine = "";
      let frameRoutine = "";
      let end = index + 1;
      for (; end < lines.length; end += 1) {
        const text = stripAmyInlineComment(lines[end]).trim();
        if (!text) continue;
        if (/^end\s+scene$/i.test(text)) break;
        const enter = text.match(/^on\s+enter\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        const frame = text.match(/^on\s+frame\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        if (enter && !enterRoutine) enterRoutine = enter[1];
        else if (frame && !frameRoutine) frameRoutine = frame[1];
        else return { ok: false, log: `Invalid or duplicate scene binding at line ${end + 1}: ${text}` };
      }
      if (end >= lines.length) return { ok: false, log: `Scene '${name}' is missing 'end scene'.` };
      if (!enterRoutine || !frameRoutine) return { ok: false, log: `Scene '${name}' requires exactly one 'on enter' and one 'on frame' binding.` };
      names.add(name.toLowerCase());
      scenes.push({ name, overlayName, partName: start[3], enterRoutine, frameRoutine, value: scenes.length + 1, line: index + 1 });
      lines[index] = `const Scenes_${name} = ${scenes.length}`;
      for (let clear = index + 1; clear <= end; clear += 1) lines[clear] = "";
      index = end;
    }
    for (const scene of scenes) {
      for (const [role, routineName] of [["on enter", scene.enterRoutine], ["on frame", scene.frameRoutine]]) {
        const declaration = rawLines
          .map((raw) => stripAmyInlineComment(raw).trim())
          .map((text) => ({
            text,
            match: text.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(([^)]*)\))?\s*:?\s*$/i)
          }))
          .find((entry) => entry.match && entry.match[1].toLowerCase() === routineName.toLowerCase());
        if (!declaration) return { ok: false, log: `Scene '${scene.name}' ${role} target '${routineName}' must be a subroutine.` };
        if (declaration.match[2]?.trim()) return { ok: false, log: `Scene '${scene.name}' ${role} target '${routineName}' must not have parameters.` };
      }
    }
    return { ok: true, lines, scenes, overlayName };
  }

  function lowerStateMachines(rawLines, sceneInfo = null) {
    const result = [...rawLines];
    const machines = new Map();
    const overlayBindings = new Map();
    if (sceneInfo?.scenes?.length) {
      const entries = sceneInfo.scenes.map((scene) => ({
        name: scene.name,
        routine: scene.frameRoutine,
        constantName: `Scenes_${scene.name}`,
        value: scene.value
      }));
      const states = new Map(entries.map((entry) => [entry.name.toLowerCase(), entry]));
      const machine = { name: "Scenes", key: "scenes", states, entries, implicitScenes: true };
      machines.set("scenes", machine);
      overlayBindings.set(sceneInfo.overlayName.toLowerCase(), {
        overlayName: sceneInfo.overlayName,
        selectorName: "__AMY_ACTIVE_SCENE",
        machine,
        line: sceneInfo.scenes[0].line,
        internalSelector: true
      });
    }
    const subNames = new Set();
    let current = null;
    let routineDepth = 0;

    for (const rawLine of rawLines) {
      const stripped = stripAmyInlineComment(rawLine).trim();
      const declaration = stripped.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\([^)]*\)|\s*:)?\s*$/i);
      if (declaration) subNames.add(declaration[1].toLowerCase());
    }

    const replaceQualifiedStates = (rawLine) => {
      let output = "";
      let index = 0;
      let inString = false;
      while (index < rawLine.length) {
        const ch = rawLine[index];
        if (ch === '"') {
          inString = !inString;
          output += ch;
          index += 1;
          continue;
        }
        if (!inString && ch === "'") {
          output += rawLine.slice(index);
          break;
        }
        if (!inString && /[A-Za-z_]/.test(ch)) {
          const match = rawLine.slice(index).match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)/);
          if (match) {
            const machine = machines.get(match[1].toLowerCase());
            if (machine) {
              const state = machine.states.get(match[2].toLowerCase());
              if (!state) {
                return { ok: false, log: `Unknown state '${match[1]}.${match[2]}'` };
              }
              output += state.constantName;
              index += match[0].length;
              continue;
            }
          }
        }
        output += ch;
        index += 1;
      }
      return { ok: true, line: output };
    };

    for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex += 1) {
      const rawLine = rawLines[lineIndex];
      const stripped = stripAmyInlineComment(rawLine).trim();
      if (!current && /^(?:sub|function)\b/i.test(stripped)) routineDepth += 1;
      if (!current && /^end\s+(?:sub|function)$/i.test(stripped)) routineDepth = Math.max(0, routineDepth - 1);

      if (!current) {
        const open = stripped.match(/^state\s+machine\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?$/i);
        if (!open) continue;
        if (routineDepth !== 0) {
          return { ok: false, log: `state machine declarations must be global at line ${lineIndex + 1}` };
        }
        const name = open[1];
        const key = name.toLowerCase();
        if (machines.has(key)) {
          return { ok: false, log: `Duplicate state machine '${name}' at line ${lineIndex + 1}` };
        }
        current = { name, key, states: new Map(), entries: [], line: lineIndex + 1 };
        result[lineIndex] = "";
        continue;
      }

      if (/^end\s+state\s+machine$/i.test(stripped)) {
        if (!current.entries.length) {
          return { ok: false, log: `State machine '${current.name}' must declare at least one state` };
        }
        machines.set(current.key, current);
        current = null;
        result[lineIndex] = "";
        continue;
      }

      if (!stripped) {
        result[lineIndex] = "";
        continue;
      }
      const entry = stripped.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+calls\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (!entry) {
        return { ok: false, log: `Invalid state in machine '${current.name}' at line ${lineIndex + 1}: ${stripped}` };
      }
      const stateName = entry[1];
      const stateKey = stateName.toLowerCase();
      if (current.states.has(stateKey)) {
        return { ok: false, log: `Duplicate state '${stateName}' in machine '${current.name}' at line ${lineIndex + 1}` };
      }
      const state = {
        name: stateName,
        routine: entry[2],
        constantName: `${current.name}_${stateName}`,
        value: current.entries.length + 1
      };
      current.states.set(stateKey, state);
      current.entries.push(state);
      const indent = rawLine.slice(0, rawLine.search(/\S|$/));
      result[lineIndex] = `${indent}const ${state.constantName} = ${state.value}`;
    }

    if (current) {
      return { ok: false, log: `State machine '${current.name}' opened at line ${current.line} is missing end state machine` };
    }

    for (const machine of machines.values()) {
      for (const entry of machine.entries) {
        if (!subNames.has(entry.routine.toLowerCase())) {
          return { ok: false, log: `State '${machine.name}.${entry.name}' calls unknown subroutine '${entry.routine}'` };
        }
      }
    }
    for (const scene of sceneInfo?.scenes || []) {
      if (!subNames.has(scene.enterRoutine.toLowerCase())) {
        return { ok: false, log: `Scene '${scene.name}' calls unknown enter subroutine '${scene.enterRoutine}'` };
      }
    }

    for (let lineIndex = 0; lineIndex < result.length; lineIndex += 1) {
      const rawLine = result[lineIndex];
      const stripped = stripAmyInlineComment(rawLine).trim();
      const binding = stripped.match(/^bind\s+overlay\s+([A-Za-z_][A-Za-z0-9_]*)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)\s+using\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (binding) {
        const overlayKey = binding[1].toLowerCase();
        const machine = machines.get(binding[3].toLowerCase());
        if (!machine) return { ok: false, log: `Unknown state machine '${binding[3]}' at line ${lineIndex + 1}` };
        if (overlayBindings.has(overlayKey)) return { ok: false, log: `Duplicate active-part binding for overlay '${binding[1]}' at line ${lineIndex + 1}` };
        overlayBindings.set(overlayKey, { overlayName: binding[1], selectorName: binding[2], machine, line: lineIndex + 1 });
        result[lineIndex] = "";
        continue;
      }
      const dispatch = stripped.match(/^dispatch\s+(.+?)\s+using\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (dispatch) {
        const machine = machines.get(dispatch[2].toLowerCase());
        if (!machine) {
          return { ok: false, log: `Unknown state machine '${dispatch[2]}' at line ${lineIndex + 1}` };
        }
        const indent = rawLine.slice(0, rawLine.search(/\S|$/));
        result[lineIndex] = `${indent}dispatch ${dispatch[1]} gosub ${machine.entries.map((entry) => entry.routine).join(", ")}`;
      }
      const replaced = replaceQualifiedStates(result[lineIndex]);
      if (!replaced.ok) return { ok: false, log: `${replaced.log} at line ${lineIndex + 1}` };
      result[lineIndex] = replaced.line;
    }

    return { ok: true, lines: result, machines, overlayBindings };
  }
  function pruneSourceUnreachableAfterRoutineTerminators(rawLines) {
    const result = [...rawLines];
    const topLevelGotoReferences = new Set();
    let currentRoutineStart = -1;

    const strippedLine = (index) => stripAmyInlineComment(rawLines[index]).trim();
    const routineStart = (line) => /^(?:sub|function)\b/i.test(line);
    const routineEnd = (line) => /^end\s+(?:sub|function)$/i.test(line);
    const labelOf = (line) => {
      const match = String(line || "").trim().match(/^([A-Za-z_][A-Za-z0-9_]*):$/);
      return match ? match[1].toLowerCase() : null;
    };
    const addGotoReferences = (set, line) => {
      for (const match of String(line || "").matchAll(/\bgoto\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi)) {
        set.add(match[1].toLowerCase());
      }
    };

    for (let index = 0; index < rawLines.length; index += 1) {
      const line = strippedLine(index);
      if (!line) continue;
      if (routineStart(line)) {
        currentRoutineStart = index;
        continue;
      }
      if (currentRoutineStart < 0) {
        addGotoReferences(topLevelGotoReferences, line);
        continue;
      }
      if (routineEnd(line)) currentRoutineStart = -1;
    }

    let inRoutine = false;
    let routineKey = -1;
    let dead = false;
    let blockDepth = 0;
    let reachableRoutineGotoReferences = new Set();
    const isRootTerminator = (line) => /^(?:return(?:\s+.+)?|goto\s+[A-Za-z_][A-Za-z0-9_]*|loop\s+forever)$/i.test(line);
    const closesBlock = (line) => /^(?:end\s*if|endif|next\b|loop\b|end\s*select|endselect|end\s+with)$/i.test(line);
    const topLevelDirective = (line) => /^(?:asm\s*\{|include\s+asm\s+"|include\s+"|asset\b|data\b|const\b|enum\b|record\b|type\b|global\b)/i.test(line);
    const opensBlock = (line) => {
      if (/^if\b/i.test(line)) return /\bthen\s*$/i.test(line) && !/\bgoto\b/i.test(line);
      return /^(?:while\b|for\b|do\b|select\s+case\b|with\b)/i.test(line);
    };

    for (let index = 0; index < rawLines.length; index += 1) {
      const line = strippedLine(index);
      if (!line) continue;

      if (routineStart(line)) {
        inRoutine = true;
        routineKey = index;
        reachableRoutineGotoReferences = new Set();
        dead = false;
        blockDepth = 0;
        continue;
      }

      if (!inRoutine) continue;

      if (routineEnd(line)) {
        inRoutine = false;
        routineKey = -1;
        dead = false;
        blockDepth = 0;
        continue;
      }

      if (dead) {
        if (topLevelDirective(line)) {
          inRoutine = false;
          routineKey = -1;
          dead = false;
          blockDepth = 0;
          continue;
        }
        const label = labelOf(line);
        if (label && (reachableRoutineGotoReferences.has(label) || topLevelGotoReferences.has(label))) {
          dead = false;
        } else {
          result[index] = "";
          continue;
        }
      }

      addGotoReferences(reachableRoutineGotoReferences, line);
      if (closesBlock(line)) blockDepth = Math.max(0, blockDepth - 1);
      if (blockDepth === 0 && isRootTerminator(line)) {
        // A top-level value return is both the terminator and the implicit end
        // of an Amy function. Following lines are mainline, not dead function code.
        if (/^return\s+.+$/i.test(line)
          && /^function\b/i.test(strippedLine(routineKey))) {
          inRoutine = false;
          routineKey = -1;
          dead = false;
          blockDepth = 0;
          continue;
        }
        dead = true;
        continue;
      }
      if (opensBlock(line)) blockDepth += 1;
    }

    return result;
  }
  function lowerForEachLoops(rawLines) {
    const arrayLengths = new Map();
    const recordArrayFields = new Map();
    const overlayParts = [];
    let routineDepth = 0;
    let currentRecord = null;
    let currentOverlay = null;
    for (const rawLine of rawLines) {
      const line = stripAmyInlineComment(rawLine).trim();
      if (/^(?:sub|function)\b/i.test(line)) routineDepth += 1;
      if (/^end\s+(?:sub|function)$/i.test(line)) { routineDepth = Math.max(0, routineDepth - 1); continue; }
      if (routineDepth !== 0) continue;
      const recordStart = line.match(/^record\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?$/i);
      if (recordStart) {
        currentRecord = recordStart[1];
        recordArrayFields.set(currentRecord.toLowerCase(), new Map());
        continue;
      }
      if (/^end\s+record$/i.test(line)) { currentRecord = null; continue; }
      if (currentRecord) {
        const field = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]/);
        if (field) {
          const primitive = /^(?:u8|i8|byte|bool|boolean|u16|i16|word|fixed|ufixed|fx16|ufx16|u32|i32|fp5)$/i.test(field[1]);
          recordArrayFields.get(currentRecord.toLowerCase()).set(field[2].toLowerCase(), {
            name: field[2],
            length: Number(field[3]),
            recordLike: !primitive
          });
        }
        continue;
      }
      const overlayStart = line.match(/^overlay\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?$/i);
      if (overlayStart) { currentOverlay = overlayStart[1]; continue; }
      if (/^end\s+overlay$/i.test(line)) { currentOverlay = null; continue; }
      if (currentOverlay) {
        const part = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        if (part) overlayParts.push({ overlay: currentOverlay, part: part[1], recordType: part[2] });
        continue;
      }
      const declaration = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]/);
      if (declaration) {
        const primitive = /^(?:u8|i8|byte|bool|boolean|u16|i16|word|fixed|ufixed|fx16|ufx16|u32|i32|fp5)$/i.test(declaration[1]);
        arrayLengths.set(declaration[2].toLowerCase(), { length: Number(declaration[3]), recordLike: !primitive });
      }
    }
    for (const part of overlayParts) {
      const fields = recordArrayFields.get(part.recordType.toLowerCase());
      if (!fields) continue;
      for (const field of fields.values()) {
        const qualifiedName = `${part.overlay}.${part.part}.${field.name}`;
        arrayLengths.set(qualifiedName.toLowerCase(), { ...field, qualified: true });
      }
    }

    const replaceIdentifier = (rawLine, name, replacement) => {
      let result = "";
      let index = 0;
      let inString = false;
      while (index < rawLine.length) {
        const ch = rawLine[index];
        if (ch === '"') { inString = !inString; result += ch; index += 1; continue; }
        if (!inString && ch === "'") { result += rawLine.slice(index); break; }
        if (!inString && /[A-Za-z_]/.test(ch)) {
          let end = index + 1;
          while (end < rawLine.length && /[A-Za-z0-9_]/.test(rawLine[end])) end += 1;
          const token = rawLine.slice(index, end);
          result += token.toLowerCase() === name.toLowerCase() ? replacement : token;
          index = end;
          continue;
        }
        result += ch;
        index += 1;
      }
      return result;
    };

    const result = [];
    const aliasStack = [];
    const controlStack = [];
    const lowerAliases = (rawLine) => {
      let loweredLine = rawLine;
      for (let aliasIndex = aliasStack.length - 1; aliasIndex >= 0; aliasIndex -= 1) {
        const alias = aliasStack[aliasIndex];
        if (!alias.native) loweredLine = replaceIdentifier(loweredLine, alias.elementName, `${alias.arrayName}[${alias.indexName}]`);
      }
      return loweredLine;
    };
    for (const rawLine of rawLines) {
      const stripped = stripAmyInlineComment(rawLine).trim();
      const open = stripped.match(/^for\s+each\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*([A-Za-z_][A-Za-z0-9_]*))?\s+in\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*:?$/i);
      if (open) {
        const elementName = open[1];
        const arrayName = open[3];
        const arrayEntry = arrayLengths.get(arrayName.toLowerCase());
        const length = arrayEntry?.length;
        if (!Number.isInteger(length) || length < 1) {
          return { ok: false, log: `for each requires a global fixed array with a literal nonzero length: ${stripped}` };
        }
        if (!open[2]) {
          return { ok: false, log: `for each currently requires an explicit u8 index: for each ${elementName}, Index in ${arrayName}` };
        }
        const indexName = open[2];
        const indent = rawLine.slice(0, rawLine.search(/\S|$/));
        result.push(`${indent}for ${indexName} = 0 to ${length - 1}`);
        const nativeAlias = arrayEntry.recordLike && !arrayEntry.qualified;
        if (nativeAlias) result.push(`${indent}  with each ${arrayName}[${indexName}] as ${elementName}`);
        const alias = { elementName, indexName, arrayName, native: nativeAlias };
        aliasStack.push(alias);
        controlStack.push({ kind: "each", alias });
        continue;
      }
      const close = stripped.match(/^next(?:\s+([A-Za-z_][A-Za-z0-9_]*))?$/i);
      if (close && controlStack.length) {
        const control = controlStack.pop();
        if (control.kind === "each") {
          const current = aliasStack.pop();
          const requested = close[1];
          if (requested && requested.toLowerCase() !== current.elementName.toLowerCase() && requested.toLowerCase() !== current.indexName.toLowerCase()) {
            return { ok: false, log: `next ${requested} does not match for each ${current.elementName}` };
          }
          const indent = rawLine.slice(0, rawLine.search(/\S|$/));
          if (current.native) result.push(`${indent}  end with`);
          result.push(`${indent}next ${current.indexName}`);
        } else {
          result.push(lowerAliases(rawLine));
        }
        continue;
      }
      const loweredLine = lowerAliases(rawLine);
      result.push(loweredLine);
      if (/^for\s+(?!each\b)/i.test(stripped)) controlStack.push({ kind: "counted" });
    }
    if (aliasStack.length) return { ok: false, log: `for each ${aliasStack[aliasStack.length - 1].elementName} is missing next` };
    return { ok: true, lines: result };
  }
  const conditionalPrepass = preprocessCompileTimeConditionals(sourceText.split(/\r?\n/));
  if (!conditionalPrepass.ok) return { ok: false, asmBody: "", log: conditionalPrepass.log };
  const recordAliasControlFlow = validateRecordAliasControlFlow(conditionalPrepass.lines);
  if (!recordAliasControlFlow.ok) return { ok: false, asmBody: "", log: recordAliasControlFlow.log };
  const recordAliasLowering = lowerRecordScopeAliases(conditionalPrepass.lines);
  if (!recordAliasLowering.ok) return { ok: false, asmBody: "", log: recordAliasLowering.log };
  const debugScenePoison = conditionalPrepass.definedSymbols.has("amy_debug_scene_poison");
  const sceneParsing = parseSceneDeclarations(recordAliasLowering.lines);
  if (!sceneParsing.ok) return { ok: false, asmBody: "", log: sceneParsing.log };
  const stateMachineLowering = lowerStateMachines(sceneParsing.lines, sceneParsing);
  if (!stateMachineLowering.ok) return { ok: false, asmBody: "", log: stateMachineLowering.log };
  const prunedLines = pruneSourceUnreachableAfterRoutineTerminators(stateMachineLowering.lines);
  const forEachLowering = lowerForEachLoops(prunedLines);
  if (!forEachLowering.ok) return { ok: false, asmBody: "", log: forEachLowering.log };
  const lines = rewriteImmediateByteTempCoordinateUsesCore(forEachLowering.lines, normalizeExpression);
  const spriteStableRanges = [];
  let usesSpriteFlicker = false;
  let usesPartialSpriteUpdate = false;
  for (let index = 0; index < lines.length; index += 1) {
    const candidate = stripAmyInlineComment(lines[index]).trim();
    if (/^sprites\s+flicker\s+(?:on|off)$/i.test(candidate)) usesSpriteFlicker = true;
    if (/^update\s+sprites\s+from\b/i.test(candidate)) usesPartialSpriteUpdate = true;
    const stable = candidate.match(/^sprites\s+stable\s+(.+?)\s+to\s+(.+)$/i);
    if (!stable) continue;
    const first = Number(stable[1].trim().replace(/^\$/, "0x"));
    const last = Number(stable[2].trim().replace(/^\$/, "0x"));
    if (!Number.isInteger(first) || !Number.isInteger(last)) {
      return { ok: false, asmBody: "", log: `sprites stable requires constant indexes: ${lines[index]}` };
    }
    if (first < 0 || last > 31 || first > last) {
      return { ok: false, asmBody: "", log: `sprites stable range must be ordered within 0..31: ${lines[index]}` };
    }
    spriteStableRanges.push({ first, last });
  }
  if (spriteStableRanges.length > 1) {
    return { ok: false, asmBody: "", log: "Amy sprite flicker v1 accepts one stable sprite range" };
  }
  if (usesSpriteFlicker && usesPartialSpriteUpdate) {
    return { ok: false, asmBody: "", log: "partial sprite upload is not allowed in a project using sprites flicker" };
  }
  const inferredMemoryCaps = inferAmyMemoryCapabilities(lines.join("\n"), sourceHintsTinySound);
  if ((inferredMemoryCaps.usesJoypadPressed1 || inferredMemoryCaps.usesJoypadPressed2
      || inferredMemoryCaps.usesJoypadReleased1 || inferredMemoryCaps.usesJoypadReleased2)
      && !inferredMemoryCaps.usesWaitVblank) {
    return { ok: false, asmBody: "", log: "joypad edge input requires wait in the frame loop" };
  }
  const hasExternalAsmInclude = lines.some((candidateRaw) => /^include\s+asm\s+"/i.test(stripAmyInlineComment(candidateRaw).trim()));
  const preferScreenOnNoNmi = !inferredMemoryCaps.needsNmi;
  const declarations = [];
  if (usesSpriteFlicker) {
    const stableRange = spriteStableRanges[0] || { first: 32, last: 31 };
    declarations.push(`AMY_SPRITE_STABLE_FIRST EQU ${stableRange.first}`);
    declarations.push(`AMY_SPRITE_STABLE_LAST EQU ${stableRange.last}`);
  }
  const symbols = new Set();
  const compileTimeConstants = new Map();
  const runtimeVars = new Map();
  const recordTypes = new Map();
  const recordDefinitionLineNumbers = new Set();
  const overlayDefinitions = new Map();
  const overlayLayouts = [];
  const dataBlocks = new Map();
  const dataWordTables = new Map();
  const dataRecordTables = new Map();
  const tileTypes = new Map();
  const hitboxes = new Map();
  const amyTimers = new Map();
  const precomputedSprite16Lengths = new Map();
  const procLocals = new Map();
  const staticLocalProcCandidates = new Set();
  const staticAbiProcCandidates = new Set();
  const staticAbiParams = new Map();
  const procFrames = new Map();
  const runtimeDeclarations = [];
  const runtimeInit = [];
  const runtimeInitRecords = [];
  const body = [];
  const textData = [];
  const romData = [];
  const assets = [];
  const pictureDefinitions = new Map();
  const constAsmSymbols = new Map();
  const dataAsmSymbols = new Map();
  const assetAsmSymbols = new Map();
  const procAsmSymbols = new Map();
  const procSignatures = new Map();
  const functionReturnTypes = new Map();
  const labelAsmSymbols = new Map();
  const userVarAsmSymbols = new Map();
  const userAsmNames = new Set();
  const dataLengths = new Map();
  let inAsm = false;
  let inData = null;
  let asmBuffer = [];
  let selectedMemoryProfile = "colecovision_legacy_sdcc";
  let ramLayout = getRamLayout(selectedMemoryProfile, inferredMemoryCaps);
  let nextRamAddress = ramLayout?.userRamStart ?? 0x7100;
  let nextTextLabel = 0;
  let nextGeneratedLabel = 0;
  let currentProc = null;
  let currentFunction = null;
  let currentGraphicsMode = null;
  let numericDigitBaseName = null;
  let numericPadCharName = null;
  let needsNumericPostprocessHelpers = false;
  let needsNumericPostprocessWidthHelper = false;
  let needsFp5FriendlyFormatHelper = false;
  let fp5FriendlyFirstIntName = null;
  let fp5FriendlyDotName = null;
  let fp5FriendlyLastFracName = null;
  const forStack = [];
  const whileStack = [];
  const doStack = [];
  const selectStack = [];
  const ifStack = [];
  const recordAliasStack = [];
  let dataCursorName = null;
  let compareScratch32 = null;
  let fp5ReturnScratch = null;
  let ensureCompareScratch32 = null;
  let emitStoreMemory32ToTarget = null;
  let emitPrepareU32Source = null;
  let emitPrepareI32Source = null;
  let emitStoreExtended32 = null;
  let emitLoadDwordInt16ComponentIntoHL = null;
  let emitCompareScratch32Goto = null;
  let emitComputedCompareGoto = null;
  let getU32Info = null;
  let getI32Info = null;
  let emitU32Inc = null;
  let emitU32Dec = null;
  let emitU32ArrayCompareGoto = null;
  let getFx16Info = null;
  let emitStoreFx16Source = null;
  let emitStoreFx16MemoryAsFp5 = null;
  let emitFx16ArithOp = null;
  let emitFx16MultiplyOp = null;
  let emitFx16DivideOp = null;
  let emitSqrtFx16Into = null;
  let emitSqrtFp5Into = null;
  let emitLogFp5Into = null;
  let emitExpFp5Into = null;
  let emitAbsFx16Into = null;
  let emitAbsFp5Into = null;
  let emitCompareFp5Goto = null;
  let emitSgnFx16Into = null;
  let emitSgnInt16LikeInto = null;
  let emitSgnFp5Into = null;
  let emitIntFp5Into = null;
  let emitRandomFx16Into = null;
  let emitRandomFp5Into = null;
  let emitRandomFp5BetweenInto = null;
  let emitFp5ArithOp = null;
  let emitFp5MultiplyOp = null;
  let emitFp5DivideOp = null;
  let emitLoadFp5SourceToFpa = null;
  let cartridgeMeta = null;
  let onFrameHook = null;
  let sawExplicitRestore = false;
  let nextBoolBit = 8;
  let boolPackCount = 0;
  let currentBoolPackLabel = null;
  let currentBoolPackAddress = null;
  const boolPackInits = new Map();
  let hasRuntimeInit = false;
  let hasRuntimeRamDeclarations = false;
  let startRuntimeInitInsertIndex = -1;
  let openedImplicitStart = false;
  let ensureProcLocalMap = null;
  let ensureProcFrame = null;
  let emitAdjustSpBy = null;
  let emitCurrentProcReturnLines = null;
  let bodyAlreadyEndsWith = null;
  let emitCurrentProcReturnLinesIfNeeded = null;
  let removeDeadReturnsAfterJumps = null;
  let inlineSingleCallUserProcedures = null;
  let simplifyStartTailForeverGoto = null;
  let openStartProc = null;
  let ensureImplicitStartForExecutable = null;
  let getRuntimeInfo = null;
  let scopedRuntimeName = null;
  let runtimeTypeSize = null;
  let splitTopLevelArgs = null;
  let parseAmyDeclarationList = null;
  let isWordChar = null;
  let stripOuterParens = null;
  let splitTopLevelKeyword = null;
  let parseBooleanConditionAst = null;
  let parseRoutineInvocation = null;
  let getImplicitNoArgFunctionInvocation = null;
  let parseFix8_8Component = null;
  let parseWordByteComponent = null;
  let parseDwordWordComponent = null;
  let emitRoutineArgumentPushes = null;
  let emitFunctionInvocation = null;
  let isKnownProcedureStatementName = null;
  let parseArrayRef = null;
  let parseRecordFieldRef = null;
  let parseBuiltinInputRef = null;
  let emitLoadBuiltinInputInto = null;
  let isIndexedByteReadable = null;
  let resolveValueType = null;
  let resolveExpressionAstValueType = null;
  let resolveExpressionAstDeclaredType = null;
  let emitComputeExpressionAst = null;
  let emitStoreComputedExpression = null;
  let emitStoreComputedToScratch32 = null;
  let coerceComputedExpressionForCompare = null;
  let emitLoadInt8AstIntoA = null;
  let emitLoadInt16AstIntoHL = null;
  let emitLoadInt16IntoHL = null;
  let emitRuntimeStore = null;
  let emitStoreImmediate32 = null;
  let emitPushArgument = null;
  let ensureDataCursorVar = null;
  let emitTextLiteral = null;
  let optimizeRepeatedBitTestLoads = null;
  let emitSignedInt8CompareGoto = null;
  let emitSignedInt16CompareGoto = null;
  let emitArithInt8Op = null;
  let emitLoadInt16ArithSourceIntoDE = null;
  let emitArithInt16Op = null;
  let emitLoadUnsignedInt16ValueIntoBC = null;
  let emitU32Add = null;
  let emitU32Sub = null;
  let emitArith32Op = null;
  let emitStoreWideExpression = null;
  let emitFormulaAssignment = null;
  let emitMultiplyInt8Op = null;
  let emitMultiplyInt16Op = null;
  let emitDivideInt8Op = null;
  let emitShiftVar = null;
  let emitShiftVarByN = null;
  let makeGeneratedLabel = null;
  let optimizeTransientDrawCoordinateTemps = null;
  let optimizeSharedRecordPutCharLoads = null;
  let optimizeSequentialAbsoluteByteStores = null;
  let optimizeRedundantImmediateLoads = null;
  let reserveRam = null;
  let isZeroInitializer = null;
  let emitLoadRecordFieldAddressIntoHL = null;
  let getDirectRecordFieldAddress = null;
  let formatIxOffset = null;
  let normalizeDataToken = null;
  let appendWordDataTokens = null;
  let looksLikeWordDataTokens = null;
  let parseBitmapLine = null;
  let bitmapCharToBit = null;
  let encodeBitmap8Row = null;
  let encodeSprite16Row = null;
  let appendBitmapRow = null;
  let appendCharRow = null;
  let appendDataTokens = null;
  let looksLikeDataTokens = null;
  let formatDataByteLiteral = null;
  let expandDataValueToken = null;
  let flushDataBlock = null;
  const compilerWarnings = [];
  const compilerWarningSet = new Set();
  let vdpR1ModifierContexts = [];
  let knownVdpR1Value = null;
  let lastAuthoritativeR1Baseline = null;
  let lastAuthoritativeR1Label = null;
  let lastAuthoritativeR1Line = null;
  let bufferedVdpR1PureModifiers = [];

  function addCompilerWarning(message) {
    const text = String(message || "").trim();
    if (!text || compilerWarningSet.has(text)) return;
    compilerWarningSet.add(text);
    compilerWarnings.push(text);
  }

  function resetVdpR1ModifierContexts() {
    vdpR1ModifierContexts = [];
  }
  function resetKnownVdpR1Value() {
    knownVdpR1Value = null;
    lastAuthoritativeR1Baseline = null;
    lastAuthoritativeR1Label = null;
    lastAuthoritativeR1Line = null;
  }
  function resetBufferedVdpR1PureModifiers() {
    bufferedVdpR1PureModifiers = [];
  }
  function resetVdpR1SemanticTracking() {
    resetVdpR1ModifierContexts();
    resetKnownVdpR1Value();
    resetBufferedVdpR1PureModifiers();
  }

  function isBufferableVdpR1PureModifier(classification) {
    return classification?.kind === "modifier"
      && classification.label !== "nmi on"
      && classification.label !== "nmi off"
      && (
        classification.category === "sprite_size"
        || classification.category === "sprite_zoom"
        || classification.category === "display"
        || classification.category === "screen"
        || classification.category === "screen_nmi"
        || classification.category === "nmi"
      );
  }

  function flushBufferedVdpR1PureModifiers() {
    if (!bufferedVdpR1PureModifiers.length) return;
    if (
      lastAuthoritativeR1Baseline !== null &&
      knownVdpR1Value !== null &&
      knownVdpR1Value === lastAuthoritativeR1Baseline
    ) {
      const preview = bufferedVdpR1PureModifiers
        .map((entry) => `${entry.label} (line ${entry.lineNumber})`)
        .slice(0, 4);
      const hiddenCount = bufferedVdpR1PureModifiers.length - preview.length;
      const modifierText = hiddenCount > 0
        ? `${preview.join(", ")}, and ${hiddenCount} more`
        : preview.join(", ");
      addCompilerWarning(`Earlier pure R1 modifiers (${modifierText}) collectively return to the active mode baseline, so they are omitted from generated ASM.`);
      resetBufferedVdpR1PureModifiers();
      return;
    }
    for (const entry of bufferedVdpR1PureModifiers) body.push(...entry.lines);
    resetBufferedVdpR1PureModifiers();
  }

  function discardBufferedVdpR1PureModifiersBecauseOfAuthoritative(authoritativeLabel) {
    if (!bufferedVdpR1PureModifiers.length) return;
    const preview = bufferedVdpR1PureModifiers
      .map((entry) => `${entry.label} (line ${entry.lineNumber})`)
      .slice(0, 4);
    const hiddenCount = bufferedVdpR1PureModifiers.length - preview.length;
    const modifierText = hiddenCount > 0
      ? `${preview.join(", ")}, and ${hiddenCount} more`
      : preview.join(", ");
    addCompilerWarning(`${authoritativeLabel} makes earlier pure R1 modifiers redundant in this straight-line flow (${modifierText}), so they are omitted from generated ASM.`);
    resetBufferedVdpR1PureModifiers();
  }

  function classifyVdpR1SemanticStatement(line) {
    if (/^text\s+screen$/i.test(line)) {
      return { kind: "authoritative", label: "text screen" };
    }
    if (/^bitmap\s+screen(?:\s+color\s+.+)?$/i.test(line)) {
      return { kind: "authoritative", label: "bitmap screen" };
    }
    if (/^picture\s+screen$/i.test(line)) {
      return { kind: "authoritative", label: "picture screen" };
    }
    if (/^multicolor\s+screen$/i.test(line)) {
      return { kind: "authoritative", label: "multicolor screen" };
    }
    if (/^graphics\s+mode\s+1\s+text$/i.test(line)) {
      return { kind: "authoritative", label: "graphics mode 1 text" };
    }
    if (/^graphics\s+mode\s+2\s+text$/i.test(line)
      || /^mode\s+2\s+screen$/i.test(line)
      || /^graphics\s+mode\s+2\s+screen$/i.test(line)) {
      return { kind: "authoritative", label: "mode 2 screen" };
    }
    if (/^tile\s+screen$/i.test(line)) {
      return { kind: "authoritative", label: "tile screen" };
    }
    if (/^graphics\s+(?:mode\s+)?bitmap$/i.test(line) || /^graphics\s+mode\s+2\s+bitmap$/i.test(line)) {
      return { kind: "authoritative", label: "graphics bitmap" };
    }
    if (/^graphics\s+mode\s*1(?:\s+color\s+.+)?$/i.test(line)) {
      return { kind: "authoritative", label: "graphics mode 1" };
    }
    if (/^graphics\s+(?:mode\s+3\s+)?multicolor$/i.test(line) || /^graphics\s+mode\s+3$/i.test(line)) {
      return { kind: "authoritative", label: "graphics mode 3 multicolor" };
    }
    if (/^sprites\s+8x8$/i.test(line)) {
      return { kind: "modifier", label: "sprites 8x8", category: "sprite_size" };
    }
    if (/^sprites\s+16x16$/i.test(line)) {
      return { kind: "modifier", label: "sprites 16x16", category: "sprite_size" };
    }
    if (/^sprites\s+simple$/i.test(line)) {
      return { kind: "modifier", label: "sprites simple", category: "sprite_zoom" };
    }
    if (/^sprites\s+double$/i.test(line)) {
      return { kind: "modifier", label: "sprites double", category: "sprite_zoom" };
    }
    if (/^screen\s+off(\s+no\s+nmi)?$/i.test(line)) {
      return { kind: "modifier", label: "screen off", category: "screen" };
    }
    if (/^screen\s+on\s+no\s+nmi$/i.test(line)) {
      return { kind: "modifier", label: "screen on no nmi", category: "screen_nmi" };
    }
    if (/^screen\s+on$/i.test(line)) {
      return { kind: "modifier", label: "screen on", category: "screen_nmi" };
    }
    if (/^display\s+off$/i.test(line)) {
      return { kind: "modifier", label: "display off", category: "display" };
    }
    if (/^display\s+on$/i.test(line)) {
      return { kind: "modifier", label: "display on", category: "display" };
    }
    if (/^(nmi\s+off|disable\s+nmi)$/i.test(line)) {
      return { kind: "modifier", label: "nmi off", category: "nmi" };
    }
    if (/^(nmi\s+on|enable\s+nmi)$/i.test(line)) {
      return { kind: "modifier", label: "nmi on", category: "nmi" };
    }
    return null;
  }

  function trackVdpR1SemanticWarning(line, lineNumber) {
    const classification = classifyVdpR1SemanticStatement(line);
    if (!classification) return { suppressEmit: false };
    const knownBefore = knownVdpR1Value;
    const applyKnownEffect = () => {
      if (classification.kind === "authoritative") {
        if (classification.label === "graphics mode 3 multicolor") return 0x8A;
        return 0x82;
      }
      if (knownBefore === null) return null;
      switch (classification.label) {
        case "sprites 8x8": return knownBefore & 0xFD;
        case "sprites 16x16": return knownBefore | 0x02;
        case "sprites simple": return knownBefore & 0xFE;
        case "sprites double": return knownBefore | 0x01;
        case "screen off": return knownBefore & 0x9F;
        case "screen on no nmi": return (knownBefore | 0x40) & 0xDF;
        case "screen on": return knownBefore | 0x60;
        case "display off": return knownBefore & 0xBF;
        case "display on": return knownBefore | 0x40;
        case "nmi off": return knownBefore & 0xDF;
        case "nmi on": return knownBefore | 0x20;
        default: return null;
      }
    };
    const knownAfter = applyKnownEffect();
      if (classification.kind === "modifier") {
        let suppressEmit = false;
        const previousSameCategory = vdpR1ModifierContexts.find((entry) => entry.category === classification.category);
        if (
          classification.label === "display on" &&
          knownBefore !== null &&
          (knownBefore & 0x20) === 0
        ) {
          if (lastAuthoritativeR1Label) {
            addCompilerWarning(`display on only enables the display bit here; NMI remains disabled in the known VDP register 1 state after ${lastAuthoritativeR1Label} (line ${lastAuthoritativeR1Line}). If this is the end of a hidden loading/setup phase, prefer screen on so display and NMI resume together.`);
          } else {
            addCompilerWarning("display on only enables the display bit here; NMI remains disabled in the known VDP register 1 state. In normal Amy code, prefer screen on unless you intentionally want display without enabling NMI.");
          }
        }
        if (
          classification.label === "display off" &&
          knownBefore !== null &&
          (knownBefore & 0x20) !== 0
        ) {
          addCompilerWarning("display off only disables the display bit here; NMI remains enabled in the known VDP register 1 state. In normal Amy code, prefer screen off unless you intentionally want a blank display with interrupts still running.");
        }
        if (knownBefore !== null && knownAfter === knownBefore) {
          suppressEmit = classification.label !== "nmi on" && classification.label !== "nmi off";
          if (suppressEmit) {
            addCompilerWarning(`${classification.label} has no effect here; current known VDP register 1 state already includes that setting, so this command is omitted from generated ASM.`);
          } else {
            addCompilerWarning(`${classification.label} has no effect on the known VDP register 1 bit state here, but it is still emitted as an explicit NMI ownership barrier.`);
          }
        }
        if (previousSameCategory && previousSameCategory.label !== classification.label) {
          addCompilerWarning(`${classification.label} supersedes earlier ${previousSameCategory.label} (line ${previousSameCategory.lineNumber}) for the same VDP register 1 setting category in this straight-line flow.`);
        }
        vdpR1ModifierContexts = vdpR1ModifierContexts.filter((entry) => entry.category !== classification.category);
        vdpR1ModifierContexts.push({
          category: classification.category,
        label: classification.label,
        lineNumber
      });
      knownVdpR1Value = knownAfter;
      return { suppressEmit };
    }
    if (classification.kind === "authoritative" && vdpR1ModifierContexts.length) {
      const modifierPreview = vdpR1ModifierContexts
        .map((entry) => `${entry.label} (line ${entry.lineNumber})`)
        .slice(0, 4);
      const hiddenCount = vdpR1ModifierContexts.length - modifierPreview.length;
      const modifierText = hiddenCount > 0
        ? `${modifierPreview.join(", ")}, and ${hiddenCount} more`
        : modifierPreview.join(", ");
      addCompilerWarning(
        `${classification.label} resets VDP register 1 to its mode baseline and may override earlier R1 modifiers (${modifierText}); if you want those final R1 settings to stick, place them after ${classification.label}.`
      );
      resetVdpR1ModifierContexts();
    }
    knownVdpR1Value = knownAfter;
    if (classification.kind === "authoritative") {
      lastAuthoritativeR1Baseline = knownAfter;
      lastAuthoritativeR1Label = classification.label;
      lastAuthoritativeR1Line = lineNumber;
    }
    return { suppressEmit: false };
  }

  function emitSafeCall(funcName, liveRegs) {
    return emitSafeCallCore(funcName, liveRegs);
  }

  function isValidSymbolName(name) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
  }

  const RESERVED_AMY_IDENTIFIERS = new Set([
    "and", "or", "not",
    "if", "then", "else", "elseif", "endif",
    "do", "loop", "while", "wend", "until",
    "for", "to", "step", "next", "downto",
    "select", "case", "default",
    "goto", "return", "exit", "continue",
    "sub", "function",
    "let", "var", "const", "dim", "ram", "local",
    "data", "restore", "read", "memory", "asset", "codec", "picture", "bitmap", "sprite16", "cartridge", "overlay",
    "screen", "display", "nmi", "graphics", "text", "cls", "print", "put", "fill",
    "vpoke", "vpeek", "vram", "decompress", "copy", "define", "show",
    "sprites", "sprite", "hitbox", "hide", "clear", "update", "swap", "wipe",
    "play", "stop", "mute", "sound", "song", "dsound",
    "enable", "disable", "reset", "spinner", "spinners",
    "random", "floor", "fraction", "highbyte", "lowbyte", "highword", "lowword", "sqrt", "log", "exp", "format",
    "fixed", "ufixed", "fixed32", "fp5", "float", "boolean", "bool", "bcd", "u8", "u16", "u32", "i8", "i16", "i32",
    "joypad", "keypad", "vdp", "status", "frame",
    "on", "label", "wait", "choose", "fire",
    "true", "false"
  ]);

  function lowerName(name) {
    return String(name || "").toLowerCase();
  }

  function setHasInsensitive(set, name) {
    const probe = lowerName(name);
    for (const value of set) {
      if (lowerName(value) === probe) return true;
    }
    return false;
  }

  function mapHasInsensitive(map, name) {
    const probe = lowerName(name);
    for (const key of map.keys()) {
      if (lowerName(key) === probe) return true;
    }
    return false;
  }

  function isReservedAmyIdentifier(name) {
    return RESERVED_AMY_IDENTIFIERS.has(lowerName(name));
  }

  function describeGlobalNameCollision(name) {
    if (isReservedAmyIdentifier(name)) return "reserved Amy keyword or builtin";
    if (mapHasInsensitive(recordTypes, name)) return "record type";
    if (mapHasInsensitive(tileTypes, name)) return "tile type";
    if (mapHasInsensitive(hitboxes, name)) return "hitbox";
    if (mapHasInsensitive(amyTimers, name)) return "timer";
    if (setHasInsensitive(symbols, name)) return "constant";
    if (mapHasInsensitive(runtimeVars, name)) return "variable";
    if (mapHasInsensitive(dataBlocks, name) || mapHasInsensitive(dataLengths, name)) return "data block";
    if (mapHasInsensitive(assetAsmSymbols, name)) return "asset";
    if (mapHasInsensitive(procAsmSymbols, name) || mapHasInsensitive(procSignatures, name) || mapHasInsensitive(functionReturnTypes, name)) return "subroutine/function";
    if (mapHasInsensitive(labelAsmSymbols, name)) return "label";
    return null;
  }

  function validateGlobalUserName(name, role, rawLine) {
    if (!isValidSymbolName(name)) return `Invalid ${role} name: ${rawLine}`;
    const collision = describeGlobalNameCollision(name);
    if (collision) return `${role} name '${name}' collides with existing ${collision}: ${rawLine}`;
    return null;
  }

  function isSupportedRecordTypeName(name) {
    return mapHasInsensitive(recordTypes, name);
  }

  function getRecordTypeInfo(name) {
    const probe = lowerName(name);
    for (const [key, value] of recordTypes.entries()) {
      if (lowerName(key) === probe) return value;
    }
    return null;
  }

  function getTileTypeInfo(name) {
    const probe = lowerName(name);
    for (const [key, value] of tileTypes.entries()) {
      if (lowerName(key) === probe) return value;
    }
    return null;
  }

  function getHitboxInfo(name) {
    const probe = lowerName(name);
    for (const [key, value] of hitboxes.entries()) {
      if (lowerName(key) === probe) return value;
    }
    return null;
  }

  function isSafeExpression(expr) {
    return /^[A-Za-z0-9_$%&|^~+\-*/()<>=!.,'"\[\]\s]+$/.test(expr);
  }

  function normalizeExpression(expr) {
    return String(expr)
      .replace(/\btrue\b/gi, "1")
      .replace(/\bfalse\b/gi, "0");
  }

  function decodeCartridgeTitleBytes(bytes) {
    const out = [];
    for (let index = 0; index < bytes.length; index += 1) {
      const value = bytes[index] & 0xFF;
      if (value === 0x1D) {
        out.push("{c}");
        continue;
      }
      if (value === 0x1E && (bytes[index + 1] & 0xFF) === 0x1F) {
        out.push("{tm}");
        index += 1;
        continue;
      }
      if (value >= 0x20 && value <= 0x7E) {
        out.push(String.fromCharCode(value));
        continue;
      }
      out.push(`{byte:${value.toString(16).toUpperCase().padStart(2, "0")}}`);
    }
    return out.join("");
  }

  function parseCartridgeDirective(rawText, rawLine) {
    return parseCartridgeDirectiveCore(rawText, rawLine, decodeCartridgeTitleBytes);
  }

  function parseExpressionAst(expr) {
    return parseExpressionAstCore(expr, normalizeExpression);
  }

  function renderExpressionAst(node) {
    return renderExpressionAstCore(node);
  }

  const sourceTypeAliases = new Map();
  const {
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
  } = createTypeSymbolHelpers({
    lowerName,
    isValidSymbolName,
    isReservedAmyIdentifier,
    describeGlobalNameCollision,
    normalizeExpression,
    getRuntimeInfo: (...args) => getRuntimeInfo(...args),
    scopedRuntimeName: (...args) => scopedRuntimeName(...args),
    runtimeTypeSize: (...args) => runtimeTypeSize(...args),
    constAsmSymbols,
    dataAsmSymbols,
    assetAsmSymbols,
    procAsmSymbols,
    labelAsmSymbols,
    userVarAsmSymbols,
    userAsmNames,
    sourceTypeAliases
  });

  function formatHex16(value) {
    return `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
  }

  function analyzeStaticLocalProcCandidates() {
    const procBodies = new Map();
    let scanInAsm = false;
    let scanProc = null;
    let scanProcHasParams = false;
    let scanProcIsFunction = false;
    let scanBody = [];

    const finishProc = () => {
      if (!scanProc) return;
      procBodies.set(scanProc, {
        hasParams: scanProcHasParams,
        isFunction: scanProcIsFunction,
        body: scanBody
      });
      scanProc = null;
      scanProcHasParams = false;
      scanProcIsFunction = false;
      scanBody = [];
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      if (recordDefinitionLineNumbers?.has(lineIndex)) continue;
      const rawLine = lines[lineIndex];
      const trimmed = stripAmyInlineComment(rawLine).trim();
      if (/^asm\s*\{$/i.test(trimmed)) { scanInAsm = true; continue; }
      if (trimmed === "}" && scanInAsm) { scanInAsm = false; continue; }
      if (scanInAsm) continue;

      const subWithParams = trimmed.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:?\s*$/i);
      const subBare = trimmed.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(\s*\))?\s*:?\s*$/i);
      const functionHeader = trimmed.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\([^)]*\))?\s+as\s+[A-Za-z_][A-Za-z0-9_]*\s*:?\s*$/i);
      if (subWithParams || subBare || functionHeader) {
        finishProc();
        scanProc = (subWithParams || subBare || functionHeader)[1];
        scanProcHasParams = !!subWithParams && subWithParams[2].trim().length > 0;
        scanProcIsFunction = !!functionHeader;
        continue;
      }
      if (/^end\s+sub$/i.test(trimmed)) {
        finishProc();
        continue;
      }
      if (scanProc) {
        if (/^return\b/i.test(trimmed) && scanProcIsFunction) {
          scanBody.push(trimmed);
          finishProc();
        } else {
          scanBody.push(trimmed);
        }
      }
    }
    finishProc();

    const eligibility = analyzeStaticAbiEligibility(lines, { resolveInclude: resolveStaticAbiInclude });
    for (const key of eligibility.eligible) {
      const routine = eligibility.routines.get(key);
      if (!routine) continue;
      const name = routine.name;
      staticAbiProcCandidates.add(name);
      staticLocalProcCandidates.add(name);
      const sig = procSignatures.get(name) || [];
      const params = [];
      for (const param of sig) {
        const mangledName = `${name}_${param.name}`;
        const info = runtimeVars.get(mangledName);
        if (!info) continue;
        const asmName = allocateUserAsmSymbol("SPARM", mangledName);
        Object.assign(info, { storage: "static", asmName });
        delete info.address;
        delete info.offset;
        params.push({ ...param, asmName, mangledName });
      }
      staticAbiParams.set(name, params);
      const frame = procFrames.get(name);
      if (frame) frame.usesIxFrame = false;
    }
  }

  ({
    ensureProcLocalMap,
    ensureProcFrame,
    emitAdjustSpBy,
    emitCurrentProcReturnLines,
    bodyAlreadyEndsWith,
    emitCurrentProcReturnLinesIfNeeded,
    removeDeadReturnsAfterJumps,
    inlineSingleCallUserProcedures,
    simplifyStartTailForeverGoto,
    openStartProc,
    ensureImplicitStartForExecutable,
    getRuntimeInfo,
    scopedRuntimeName,
    runtimeTypeSize
  } = createProcHelpers({
    body,
    inferredMemoryCaps,
    hasRuntimeRamDeclarationsRef: {
      get: () => hasRuntimeRamDeclarations
    },
    hasRuntimeInitRef: {
      get: () => hasRuntimeInit
    },
    startRuntimeInitInsertIndexRef: {
      get: () => startRuntimeInitInsertIndex,
      set: (value) => { startRuntimeInitInsertIndex = value; }
    },
    currentProcRef: {
      get: () => currentProc,
      set: (value) => { currentProc = value; }
    },
    currentFunctionRef: {
      get: () => currentFunction,
      set: (value) => { currentFunction = value; }
    },
    openedImplicitStartRef: {
      get: () => openedImplicitStart,
      set: (value) => { openedImplicitStart = value; }
    },
    ensureProcAsmSymbol,
    ensureProcLocalMapStorage: procLocals,
    procAsmSymbols,
    procFrames,
    runtimeVars
  }));

  function parseRecordDefinitions() {
    const simpleRecordFieldRe = /^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\[\s*(\d+)\s*\])?$/i;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const trimmed = stripAmyInlineComment(rawLine).trim();
      const recordStart = trimmed.match(/^(record|struct)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
      if (!recordStart) continue;
      const recordKeyword = recordStart[1].toLowerCase();
      if (recordKeyword === "struct") {
        return `'struct' was removed; use 'record ${recordStart[2]}:' ... 'end record': ${rawLine}`;
      }
      const endKeyword = "end record";
      const recordName = recordStart[2];
      const nameError = validateGlobalUserName(recordName, "Record type", rawLine);
      if (nameError) return nameError;
      const orderedFields = [];
      const fields = new Map();
      let offset = 0;
      recordDefinitionLineNumbers.add(lineIndex);
      let cursor = lineIndex + 1;
      let sawEnd = false;
      for (; cursor < lines.length; cursor += 1) {
        const fieldRaw = lines[cursor];
        const fieldLine = stripAmyInlineComment(fieldRaw).trim();
        recordDefinitionLineNumbers.add(cursor);
        if (!fieldLine) continue;
        if ((recordKeyword === "record" && /^end\s+record$/i.test(fieldLine)) ||
            (recordKeyword === "struct" && /^end\s+struct$/i.test(fieldLine))) {
          sawEnd = true;
          break;
        }
        const bcdFieldMatch = fieldLine.match(/^bcd\s+digits\s+([1-9]|10|11|12)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        const fieldMatch = bcdFieldMatch || fieldLine.match(simpleRecordFieldRe);
        if (!fieldMatch) {
          return `Invalid record field declaration: ${fieldRaw}`;
        }
        const declaredTypeToken = bcdFieldMatch ? "bcd" : fieldMatch[1];
        const declaredType = normalizeDeclaredType(declaredTypeToken.toLowerCase());
        const fieldName = fieldMatch[2];
        const arrayLength = bcdFieldMatch || fieldMatch[3] === undefined ? null : Number.parseInt(fieldMatch[3], 10);
        if (!isValidSymbolName(fieldName) || isReservedAmyIdentifier(fieldName) || fields.has(fieldName)) {
          return `Invalid or duplicate record field '${fieldName}': ${fieldRaw}`;
        }
        if (arrayLength !== null && (!Number.isInteger(arrayLength) || arrayLength < 1 || arrayLength > 255)) {
          return `Record array fields require a literal length from 1 to 255: ${fieldRaw}`;
        }
        let fieldInfo = null;
        if (bcdFieldMatch) {
          const digitCount = Number.parseInt(bcdFieldMatch[1], 10);
          const byteCount = Math.ceil(digitCount / 2);
          fieldInfo = {
            name: fieldName,
            declaredType: "bcd",
            type: "bcd",
            kind: "bcd",
            digitCount,
            byteCount,
            offset,
            size: byteCount,
            isArray: false,
            length: null,
            elementSize: byteCount
          };
        } else if (isSupportedSourceTypeName(declaredTypeToken)) {
          if (!["u8", "i8", "u16", "i16", "u32", "i32", "fix8_8", "ufix8_8", "boolean", "bool"].includes(declaredType)) {
            return `Record fields currently support u8, i8, u16, i16, u32, i32, fixed, ufixed, bool, and previously defined record types: ${fieldRaw}`;
          }
          const runtimeType = normalizeRuntimeType(declaredType);
          const elementSize = runtimeTypeSize(runtimeType);
          const size = elementSize * (arrayLength || 1);
          fieldInfo = {
            name: fieldName,
            declaredType,
            type: runtimeType,
            offset,
            size,
            isArray: arrayLength !== null,
            length: arrayLength,
            elementSize
          };
        } else {
          const nestedRecordInfo = getRecordTypeInfo(declaredTypeToken);
          if (!nestedRecordInfo) {
            return `Unknown record field type '${declaredTypeToken}': ${fieldRaw}`;
          }
          const elementSize = nestedRecordInfo.byteSize;
          fieldInfo = {
            name: fieldName,
            declaredType: declaredTypeToken,
            type: "record",
            offset,
            size: elementSize * (arrayLength || 1),
            isArray: arrayLength !== null,
            length: arrayLength,
            elementSize,
            recordTypeName: nestedRecordInfo.name,
            recordInfo: nestedRecordInfo
          };
        }
        orderedFields.push(fieldInfo);
        fields.set(fieldName, fieldInfo);
        offset += fieldInfo.size;
      }
      if (!sawEnd) return `Record type '${recordName}' is missing '${endKeyword}'.`;
      recordTypes.set(recordName, {
        name: recordName,
        fields,
        orderedFields,
        byteSize: offset
      });
      lineIndex = cursor;
    }
    return null;
  }

  const recordDefinitionError = parseRecordDefinitions();
  if (recordDefinitionError) {
    return { ok: false, asmBody: "", log: recordDefinitionError };
  }

  function parseOverlayDefinitions() {
    let overlayCount = 0;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const trimmed = stripAmyInlineComment(rawLine).trim();
      const start = trimmed.match(/^overlay\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
      if (!start) continue;
      overlayCount += 1;
      if (overlayCount > 1) return `Amy overlay v1 supports one overlay group per program: ${rawLine}`;
      const name = start[1];
      if (lines.slice(lineIndex + 1).some((candidate) => /^memory\s+"[^"]+"$/i.test(stripAmyInlineComment(candidate).trim()))) {
        return `memory must be declared before overlay '${name}' so its physical RAM address cannot be reset later.`;
      }
      if (isReservedAmyIdentifier(name) || mapHasInsensitive(recordTypes, name)) {
        return `Invalid or duplicate overlay name '${name}': ${rawLine}`;
      }
      const parts = [];
      const partNames = new Set();
      let cursor = lineIndex + 1;
      let sawEnd = false;
      for (; cursor < lines.length; cursor += 1) {
        const partRaw = lines[cursor];
        const partLine = stripAmyInlineComment(partRaw).trim();
        recordDefinitionLineNumbers.add(cursor);
        if (!partLine) continue;
        if (/^end\s+overlay$/i.test(partLine)) {
          sawEnd = true;
          break;
        }
        const partMatch = partLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        if (!partMatch) return `Invalid overlay part declaration: ${partRaw}`;
        const partName = partMatch[1];
        const partKey = lowerName(partName);
        if (partNames.has(partKey) || isReservedAmyIdentifier(partName)) {
          return `Invalid or duplicate overlay part '${partName}': ${partRaw}`;
        }
        const recordInfo = getRecordTypeInfo(partMatch[2]);
        if (!recordInfo) return `Overlay part '${partName}' requires a previously defined record type: ${partRaw}`;
        if (!Number.isInteger(recordInfo.byteSize) || recordInfo.byteSize < 1) {
          return `Overlay part '${partName}' requires a non-empty, fixed-size record type: ${partRaw}`;
        }
        partNames.add(partKey);
        parts.push({ name: partName, recordTypeName: recordInfo.name, recordInfo, byteSize: recordInfo.byteSize });
      }
      if (!sawEnd) return `Overlay '${name}' is missing 'end overlay'.`;
      if (parts.length < 2) return `Overlay '${name}' requires at least two mutually exclusive parts.`;
      overlayDefinitions.set(lineIndex, { name, parts });
      lineIndex = cursor;
    }
    return null;
  }

  const overlayDefinitionError = parseOverlayDefinitions();
  if (overlayDefinitionError) {
    return { ok: false, asmBody: "", log: overlayDefinitionError };
  }

  function parseEnumDefinitions() {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const trimmed = stripAmyInlineComment(rawLine).trim();
      const enumStart = trimmed.match(/^enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
      if (!enumStart) continue;
      const enumName = enumStart[1];
      if (!isValidSymbolName(enumName) || isReservedAmyIdentifier(enumName)) {
        return `Invalid enum name '${enumName}': ${rawLine}`;
      }
      recordDefinitionLineNumbers.add(lineIndex);
      let cursor = lineIndex + 1;
      let sawEnd = false;
      let nextValueExpr = "0";
      for (; cursor < lines.length; cursor += 1) {
        const enumRaw = lines[cursor];
        const enumLine = stripAmyInlineComment(enumRaw).trim();
        recordDefinitionLineNumbers.add(cursor);
        if (!enumLine) continue;
        if (/^end\s+enum$/i.test(enumLine)) {
          sawEnd = true;
          break;
        }
        const entryMatch = enumLine.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*(.+))?$/);
        if (!entryMatch) return `Invalid enum value declaration: ${enumRaw}`;
        const name = entryMatch[1];
        const expr = normalizeExpression((entryMatch[2] || nextValueExpr).trim());
        const nameError = validateGlobalUserName(name, "Enum value", enumRaw);
        if (nameError) return nameError;
        if (!isSafeExpression(expr)) return `Invalid enum value declaration: ${enumRaw}`;
        symbols.add(name);
        compileTimeConstants.set(name, expr);
        declarations.push(`${ensureConstAsmSymbol(name)} EQU ${rewriteUserSymbolsInExpression(expr)}`);
        const numericValue = tryEvaluateCompileTimeNumericExpression(expr);
        nextValueExpr = Number.isInteger(numericValue) ? String(numericValue + 1) : `(${expr}) + 1`;
      }
      if (!sawEnd) return `Enum '${enumName}' is missing 'end enum'.`;
      lineIndex = cursor;
    }
    return null;
  }

  const enumDefinitionError = parseEnumDefinitions();
  if (enumDefinitionError) {
    return { ok: false, asmBody: "", log: enumDefinitionError };
  }

  function splitRecordDataRow(text) {
    const values = [];
    let current = "";
    let depth = 0;
    let quoted = false;
    for (const ch of String(text)) {
      if (ch === '"') quoted = !quoted;
      if (!quoted) {
        if (ch === "(" || ch === "[") depth += 1;
        else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
        else if (ch === "," && depth === 0) {
          values.push(current.trim());
          current = "";
          continue;
        }
      }
      current += ch;
    }
    values.push(current.trim());
    return values;
  }

  function lowerRecordDataTables() {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const start = stripAmyInlineComment(rawLine).trim().match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+records\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (!start) continue;
      const [, tableName, recordTypeName] = start;
      const recordInfo = getRecordTypeInfo(recordTypeName);
      if (!recordInfo) return `Unknown record type '${recordTypeName}' for data table '${tableName}'.`;
      if (recordInfo.orderedFields.some((field) => field.type !== "int8" || field.size !== 1)) {
        return `Record data tables v1 require only u8, i8, or bool fields; '${recordTypeName}' contains a wider or nested field.`;
      }
      let rowCount = 0;
      let cursor = lineIndex + 1;
      let sawEnd = false;
      for (; cursor < lines.length; cursor += 1) {
        const rowRaw = lines[cursor];
        const row = stripAmyInlineComment(rowRaw).trim();
        if (!row) continue;
        if (/^end\s+data$/i.test(row)) {
          sawEnd = true;
          break;
        }
        const values = splitRecordDataRow(row);
        if (values.length !== recordInfo.orderedFields.length) {
          return `Record data row for '${tableName}' needs ${recordInfo.orderedFields.length} fields, got ${values.length}: ${rowRaw}`;
        }
        for (let fieldIndex = 0; fieldIndex < values.length; fieldIndex += 1) {
          const value = normalizeExpression(values[fieldIndex]);
          const numeric = tryEvaluateConstantExpression(value);
          const field = recordInfo.orderedFields[fieldIndex];
          if (Number.isInteger(numeric)) {
            const signed = field.declaredType === "i8";
            const booleanField = field.declaredType === "bool" || field.declaredType === "boolean";
            const valid = signed
              ? numeric >= -128 && numeric <= 127
              : booleanField
                ? numeric === 0 || numeric === 1
                : numeric >= 0 && numeric <= 255;
            if (!valid) return `Value '${values[fieldIndex]}' does not fit ${field.declaredType} field ${recordTypeName}.${field.name}: ${rowRaw}`;
          }
        }
        lines[cursor] = values.map((value) => normalizeExpression(value)).join(",");
        rowCount += 1;
      }
      if (!sawEnd) return `Record data table '${tableName}' is missing 'end data'.`;
      if (!rowCount) return `Record data table '${tableName}' is empty.`;
      lines[lineIndex] = `data ${tableName} bytes`;
      dataRecordTables.set(tableName, {
        name: tableName,
        recordTypeName: recordInfo.name,
        recordSize: recordInfo.byteSize,
        rowCount,
        byteCount: rowCount * recordInfo.byteSize
      });
      lineIndex = cursor;
    }
    return null;
  }

  const recordDataTableError = lowerRecordDataTables();
  if (recordDataTableError) {
    return { ok: false, asmBody: "", log: recordDataTableError };
  }

  function parsePictureDefinitions() {
    const codecRe = "(zx0|zx7|dan1|dan2|dan3|mdkrle|pletter|lzf|bitbuster|nibble|rle|raw)";
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const trimmed = stripAmyInlineComment(rawLine).trim();
      if (/^picture\s+screen$/i.test(trimmed)) continue;
      const pictureStart = trimmed.match(/^picture\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
      if (!pictureStart) continue;
      const pictureName = pictureStart[1];
      const nameError = validateGlobalUserName(pictureName, "Picture", rawLine);
      if (nameError) return nameError;
      recordDefinitionLineNumbers.add(lineIndex);
      const components = new Map();
      let cursor = lineIndex + 1;
      let sawEnd = false;
      for (; cursor < lines.length; cursor += 1) {
        const componentRaw = lines[cursor];
        const componentLine = stripAmyInlineComment(componentRaw).trim();
        recordDefinitionLineNumbers.add(cursor);
        if (!componentLine) continue;
        if (/^end\s+picture$/i.test(componentLine)) {
          sawEnd = true;
          break;
        }
        const componentMatch = componentLine.match(new RegExp(`^(pattern_color|pattern|color|name)\\s+from\\s+"([^"]+)"(?:\\s+codec\\s+${codecRe})?$`, "i"));
        if (!componentMatch) return `Invalid picture component declaration: ${componentRaw}`;
        const component = componentMatch[1].toLowerCase();
        if (components.has(component)) return `Duplicate picture component '${component}' in ${pictureName}: ${componentRaw}`;
        const path = componentMatch[2];
        const codec = (componentMatch[3] || "raw").toLowerCase();
        const assetName = `${pictureName}_${component}`;
        if (component === "pattern_color" && codec !== "raw") {
          return `picture ${pictureName} pattern_color currently supports codec raw only: ${componentRaw}`;
        }
        ensureAssetAsmSymbol(assetName);
        assets.push({ name: assetName, path, codec });
        components.set(component, { component, assetName, path, codec });
      }
      if (!sawEnd) return `Picture '${pictureName}' is missing 'end picture'.`;
      if (!components.has("pattern") && !components.has("pattern_color")) {
        return `Picture '${pictureName}' needs a pattern or pattern_color component.`;
      }
      if (components.has("pattern") && !components.has("color")) {
        return `Picture '${pictureName}' needs a color component when pattern is separate.`;
      }
      symbols.add(pictureName);
      pictureDefinitions.set(pictureName, { name: pictureName, components });
      lineIndex = cursor;
    }
    return null;
  }

  const pictureDefinitionError = parsePictureDefinitions();
  if (pictureDefinitionError) {
    return { ok: false, asmBody: "", log: pictureDefinitionError };
  }

  function resolveTimerInterval(token, rawLine) {
    const normalized = normalizeExpression(String(token || "").trim());
    const evaluated = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(normalized)
      : null;
    const numeric = evaluated !== null ? evaluated : parseNumericLiteral(normalized);
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 0xFFFF) {
      return { ok: false, value: 0, log: `timer interval must be a constant from 1 to 65535 ticks: ${rawLine}` };
    }
    return { ok: true, value: numeric, log: "" };
  }

  function getTimerInfo(name) {
    const probe = lowerName(name);
    for (const [key, value] of amyTimers.entries()) {
      if (lowerName(key) === probe) return value;
    }
    return null;
  }

  function emitSetTimerBytes(timer, activeValue) {
    const low = "$" + (timer.interval & 0xFF).toString(16).toUpperCase().padStart(2, "0");
    const high = "$" + ((timer.interval >> 8) & 0xFF).toString(16).toUpperCase().padStart(2, "0");
    const lines = [
      "    xor a",
      `    ld (${timer.activeLabel}),a`,
      `    ld hl,${timer.countLabel}`,
      `    ld (hl),${low}`,
      "    inc hl",
      `    ld (hl),${high}`,
      "    xor a",
      `    ld (${timer.signalLabel}),a`
    ];
    if (activeValue) {
      lines.push("    inc a", `    ld (${timer.activeLabel}),a`);
    }
    return lines;
  }

  function emitTimerTestAndConsume(name, falseLabel, rawLine) {
    const timer = getTimerInfo(name);
    if (!timer) return { ok: false, lines: [], log: `Unknown timer '${name}': ${rawLine}` };
    return {
      ok: true,
      lines: [
        `    ld a,(${timer.signalLabel})`,
        "    or a",
        `    jp z,${falseLabel}`,
        "    xor a",
        `    ld (${timer.signalLabel}),a`
      ],
      log: ""
    };
  }

  function defineAmyTimer(name, mode, interval, initiallyActive, rawLine) {
    const nameError = validateGlobalUserName(name, "Timer", rawLine);
    if (nameError) return { ok: false, log: nameError };
    const prefix = `${name}_timer`;
    let countAddress;
    let reloadAddress;
    let signalAddress;
    let activeAddress;
    try {
      countAddress = reserveRam(`${prefix}_count`, 2, rawLine.trim());
      reloadAddress = reserveRam(`${prefix}_reload`, 2, rawLine.trim());
      signalAddress = reserveRam(`${prefix}_signal`, 1, rawLine.trim());
      activeAddress = reserveRam(`${prefix}_active`, 1, rawLine.trim());
    } catch (error) {
      return { ok: false, log: String(error.message || error) };
    }
    const countLabel = ensureUserVarAsmSymbol(`${prefix}_count`);
    const reloadLabel = ensureUserVarAsmSymbol(`${prefix}_reload`);
    const signalLabel = ensureUserVarAsmSymbol(`${prefix}_signal`);
    const activeLabel = ensureUserVarAsmSymbol(`${prefix}_active`);
    runtimeDeclarations.push(`${countLabel} EQU ${formatHex16(countAddress)}`);
    runtimeDeclarations.push(`${reloadLabel} EQU ${formatHex16(reloadAddress)}`);
    runtimeDeclarations.push(`${signalLabel} EQU ${formatHex16(signalAddress)}`);
    runtimeDeclarations.push(`${activeLabel} EQU ${formatHex16(activeAddress)}`);
    runtimeInitRecords.push({ address: countAddress, bytes: [interval & 0xFF, (interval >> 8) & 0xFF] });
    runtimeInitRecords.push({ address: reloadAddress, bytes: [interval & 0xFF, (interval >> 8) & 0xFF] });
    runtimeInitRecords.push({ address: signalAddress, bytes: [0] });
    runtimeInitRecords.push({ address: activeAddress, bytes: [initiallyActive ? 1 : 0] });
    hasRuntimeInit = true;
    hasRuntimeRamDeclarations = true;
    const timer = { name, mode, interval, initiallyActive, countLabel, reloadLabel, signalLabel, activeLabel };
    amyTimers.set(name, timer);
    return { ok: true, log: "" };
  }

  function precomputeSprite16DataLengths() {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const trimmed = stripAmyInlineComment(rawLine).trim();
      const dataStart = trimmed.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+sprite16$/i);
      if (!dataStart) continue;
      const name = dataStart[1];
      let rowCount = 0;
      for (let cursor = lineIndex + 1; cursor < lines.length; cursor += 1) {
        const dataLine = stripAmyInlineComment(lines[cursor]).trim();
        if (/^end\s+data$/i.test(dataLine)) break;
        if (/^(?:bitmap\s+)?\"([^\"]+)\"$/i.test(dataLine)) rowCount += 1;
      }
      if (rowCount > 0 && (rowCount % 16) === 0) {
        precomputedSprite16Lengths.set(name, (rowCount / 16) * 32);
      }
    }
  }

  precomputeSprite16DataLengths();

  function wrapVramUploadLines(lines) {
    const clearLabel = makeGeneratedLabel("VramUploadClearNoNmi");
    const doneLabel = makeGeneratedLabel("VramUploadDone");
    return [
      "    ld a,1",
      "    ld (NO_NMI),a",
      "    ld a,($73C4)",
      "    push af",
      "    and $DF",
      "    ld ($73C4),a",
      "    ld c,a",
      "    ld b,1",
      "    call WRITE_REGISTER",
      ...lines,
      "    pop af",
      "    ld ($73C4),a",
      "    push af",
      "    ld c,a",
      "    ld b,1",
      "    call WRITE_REGISTER",
      "    pop af",
      "    and $20",
      `    jp z,${clearLabel}`,
      "    call READ_REGISTER",
      "    xor a",
      "    ld (NO_NMI),a",
      "    ei",
      `    jp ${doneLabel}`,
      `${clearLabel}:`,
      "    xor a",
      "    ld (NO_NMI),a",
      `${doneLabel}:`
    ];
  }
  function wrapVramUploadLinesOwnedByMain(lines) {
    return [
      "    ld a,1",
      "    ld (NO_NMI),a",
      ...lines,
      "    xor a",
      "    ld (NO_NMI),a"
    ];
  }
  function emitPictureComponentToVram(component, target, byteCount) {
    const assetLabel = `Asset_${component.assetName}`;
    const targetLabel = { pattern: "VRAM_PATTERN", color: "VRAM_COLOR", name: "VRAM_NAME" }[target];
    const codec = component.codec === "rle" ? "mdkrle" : component.codec;
    if (!codec || codec === "raw") {
      return [
        `    ld hl,${assetLabel}`,
        `    ld de,${targetLabel}`,
        `    ld bc,${byteCount}`,
        "    call AMY_COPY_BYTES_TO_VRAM"
      ];
    }
    return [
      `    ld hl,${assetLabel}`,
      `    ld de,${targetLabel}`,
      `    call ${codec}_decompress`
    ];
  }

  function emitUploadPicture(name, rawLine, options = {}) {
    const picture = pictureDefinitions.get(name);
    const nmiKnownOff = knownVdpR1Value !== null && (knownVdpR1Value & 0x20) === 0;
    const wrapUpload = options.keepNmi
      ? (lines) => lines
      : (nmiKnownOff ? wrapVramUploadLinesOwnedByMain : wrapVramUploadLines);
    if (!picture) return { ok: false, lines: [], log: `Unknown picture '${name}': ${rawLine}` };
    const pc = picture.components.get("pattern_color");
    if (pc) {
      return {
        ok: true,
        lines: wrapUpload([
          `    ld hl,Asset_${pc.assetName}`,
          "    ld de,VRAM_PATTERN",
          "    ld bc,6144",
          "    call AMY_COPY_BYTES_TO_VRAM",
          `    ld hl,Asset_${pc.assetName}+6144`,
          "    ld de,VRAM_COLOR",
          "    ld bc,6144",
          "    call AMY_COPY_BYTES_TO_VRAM",
          "    ld d,3",
          "    call AMY_LOAD_SEQUENTIAL_NAME_TABLE"
        ])
      };
    }
    const pattern = picture.components.get("pattern");
    const color = picture.components.get("color");
    const nameTable = picture.components.get("name");
    const lines = [
      ...emitPictureComponentToVram(pattern, "pattern", 6144),
      ...emitPictureComponentToVram(color, "color", 6144)
    ];
    if (nameTable) lines.push(...emitPictureComponentToVram(nameTable, "name", 768));
    else lines.push("    ld d,3", "    call AMY_LOAD_SEQUENTIAL_NAME_TABLE");
    return { ok: true, lines: wrapUpload(lines) };
  }

  function emitShowPicture(name, rawLine) {
    const uploaded = emitUploadPicture(name, rawLine);
    if (!uploaded.ok) return uploaded;
    return {
      ok: true,
      lines: [
        "    call AMY_SCREEN_OFF_NO_NMI",
        "    call AMY_SET_BITMAP_GRAPHICS_MODE",
        ...uploaded.lines,
        "    call AMY_SCREEN_ON_NMI"
      ]
    };
  }

  function resolveDeclaredValueType(token) {
    const builtinInput = parseBuiltinInputRef(token);
    if (builtinInput) return normalizeDeclaredType(builtinInput.declaredType);
    const recordField = parseRecordFieldRef?.(token);
    if (recordField) return normalizeDeclaredType(recordField.fieldInfo.declaredType || recordField.fieldInfo.type);
    const invocation = parseRoutineInvocation(token);
    if (invocation) {
      const retInfo = functionReturnTypes.get(invocation.name);
      if (!retInfo) return null;
      return normalizeDeclaredType(retInfo.declaredType || retInfo.returnType);
    }
    const arrayRef = parseArrayRef(token);
    if (arrayRef) {
      if (dataLengths.has(arrayRef.name)) return "u8";
      if (dataWordTables.has(arrayRef.name)) return "u16";
      const info = getRuntimeInfo(arrayRef.name);
      if (!info) return null;
      if (info.kind === "array") return normalizeDeclaredType(info.declaredType || info.elementType || info.type);
      if (info.kind === "bcd") return "u8";
      return null;
    }
    const fixPart = parseFix8_8Component(token);
    if (fixPart) {
      const declared = resolveDeclaredValueType(fixPart.valueToken);
      if (isAnyFixedDeclaredType(declared)) return "u8";
    }
    const wordBytePart = parseWordByteComponent(token);
    if (wordBytePart) {
      const declared = resolveDeclaredValueType(wordBytePart.valueToken);
      if (declared === "u16" || declared === "i16" || isAnyFixedDeclaredType(declared)) return "u8";
    }
    const dwordWordPart = parseDwordWordComponent(token);
    if (dwordWordPart) {
      const declared = resolveDeclaredValueType(dwordWordPart.valueToken);
      if (declared === "u32" || declared === "i32") return "u16";
    }
    const implicitFn = getImplicitNoArgFunctionInvocation(token);
    const info = getRuntimeInfo(token);
    if (!info && implicitFn) return normalizeDeclaredType(implicitFn.declaredType || implicitFn.returnType);
    if (!info || info.kind === "array") return null;
    return normalizeDeclaredType(info.declaredType || info.type);
  }

  function isSignedDeclaredType(type) {
    const lowered = normalizeDeclaredType(type);
    return lowered === "i8" || lowered === "i16" || lowered === "i32" || lowered === "fix8_8" || lowered === "fix16_16";
  }

  function declaredTypeBitWidth(type) {
    const lowered = normalizeDeclaredType(type);
    if (lowered === "u8" || lowered === "i8" || lowered === "boolean") return 8;
    if (lowered === "u16" || lowered === "i16" || lowered === "fix8_8" || lowered === "ufix8_8") return 16;
    if (lowered === "u32" || lowered === "i32" || lowered === "fix16_16") return 32;
    if (lowered === "fp5") return 40;
    return 0;
  }

  function declaredTypeForWidth(widthBits, signed, sourceType = null) {
    const normalizedSource = normalizeDeclaredType(sourceType);
    if (normalizedSource === "fix8_8" && widthBits === 16) return "fix8_8";
    if (normalizedSource === "ufix8_8" && widthBits === 16 && !signed) return "ufix8_8";
    if (normalizedSource === "fix16_16" && widthBits === 32) return "fix16_16";
    if (normalizedSource === "fp5") return "fp5";
    if (widthBits <= 8) return signed ? "i8" : "u8";
    if (widthBits <= 16) return signed ? "i16" : "u16";
    return signed ? "i32" : "u32";
  }

  function runtimeTypeForDeclaredType(type) {
    const lowered = normalizeDeclaredType(type);
    if (lowered === "fp5") return "fp5";
    if (lowered === "u32" || lowered === "i32" || lowered === "fix16_16") return "i32";
    if (declaredTypeBitWidth(lowered) <= 8) return "int8";
    return "int16";
  }

  function inferLiteralDeclaredType(valueToken) {
    const literalValue = parseNumericLiteral(valueToken);
    if (literalValue === null) return null;
    if (literalValue < 0) {
      if (literalValue >= -128) return "i8";
      if (literalValue >= -32768) return "i16";
      return "i32";
    }
    if (literalValue <= 0xFF) return "u8";
    if (literalValue <= 0xFFFF) return "u16";
    return "u32";
  }

  function tryEvaluateAstInteger(node) {
    if (!node) return null;
    const value = tryEvaluateCompileTimeNumericExpression(renderExpressionAst(node));
    if (!Number.isInteger(value)) return null;
    return value;
  }

  function valueFitsDeclaredDomain(value, declaredType) {
    const lowered = normalizeDeclaredType(declaredType);
    if (lowered === "u8" || lowered === "boolean") return value >= 0 && value <= 0xFF;
    if (lowered === "i8") return value >= -128 && value <= 127;
    if (lowered === "u16") return value >= 0 && value <= 0xFFFF;
    if (lowered === "i16") return value >= -32768 && value <= 32767;
    return false;
  }

  function resolveAbsdiffDomains(leftNode, rightNode, leftType, rightType) {
    let leftSigned = isSignedDeclaredType(leftType.declaredType);
    let rightSigned = isSignedDeclaredType(rightType.declaredType);
    if (leftSigned === rightSigned) return { leftSigned, rightSigned };
    const leftValue = tryEvaluateAstInteger(leftNode);
    const rightValue = tryEvaluateAstInteger(rightNode);
    if (leftValue !== null && rightValue === null && valueFitsDeclaredDomain(leftValue, rightType.declaredType)) {
      leftSigned = rightSigned;
    } else if (rightValue !== null && leftValue === null && valueFitsDeclaredDomain(rightValue, leftType.declaredType)) {
      rightSigned = leftSigned;
    } else if (leftValue !== null && rightValue !== null) {
      const magnitude = Math.abs(leftValue - rightValue);
      if (magnitude <= 0xFFFF) return { leftSigned: false, rightSigned: false, constantMagnitude: magnitude };
    }
    if (leftSigned !== rightSigned) return null;
    return { leftSigned, rightSigned };
  }

  function mergeDeclaredTypes(leftType, rightType, preferredDeclaredType = null, op = null) {
    const normalizedLeft = normalizeDeclaredType(leftType);
    const normalizedRight = normalizeDeclaredType(rightType);
    const normalizedPreferred = normalizeDeclaredType(preferredDeclaredType);
    const leftWidth = declaredTypeBitWidth(normalizedLeft);
    const rightWidth = declaredTypeBitWidth(normalizedRight);
    const preferredWidth = declaredTypeBitWidth(normalizedPreferred);
    let width = Math.max(leftWidth, rightWidth, preferredWidth);
    if (!width) width = preferredWidth || leftWidth || rightWidth || 8;
    if (op === "<<" || op === ">>") {
      width = Math.max(leftWidth, preferredWidth) || width;
    }
    if (normalizedLeft === "fp5" || normalizedRight === "fp5" || normalizedPreferred === "fp5") {
      return "fp5";
    }
    const signed = isSignedDeclaredType(normalizedLeft) || isSignedDeclaredType(normalizedRight) || isSignedDeclaredType(normalizedPreferred);
    const sourceType = (op === "+" || op === "-") && (
      isAnyFixedDeclaredType(normalizedLeft)
      || isAnyFixedDeclaredType(normalizedRight)
      || isAnyFixedDeclaredType(normalizedPreferred)
    )
      ? (normalizedLeft === "fix16_16"
        || normalizedRight === "fix16_16"
        || normalizedPreferred === "fix16_16"
        ? "fix16_16"
        : normalizedLeft === "fix8_8"
          || normalizedRight === "fix8_8"
          || normalizedPreferred === "fix8_8"
          ? "fix8_8"
          : "ufix8_8")
      : normalizedPreferred || normalizedLeft || normalizedRight;
    return declaredTypeForWidth(width, signed, sourceType);
  }

  function resolveExpressionAstComputationType(node, preferredDeclaredType = null) {
    if (!node) return null;
    if (node.kind === "number") {
      const declaredType = mergeDeclaredTypes(inferLiteralDeclaredType(node.value), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "identifier") {
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(node.name), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "call") {
      if (String(node.name || "").toLowerCase() === "peek" && node.args.length === 1) {
        return { declaredType: "u8", runtimeType: "int8" };
      }
      if (String(node.name || "").toLowerCase() === "random" && (node.args.length === 1 || node.args.length === 2)) {
        return { declaredType: "u8", runtimeType: "int8" };
      }
      if (String(node.name || "").toLowerCase() === "absdiff" && node.args.length === 2) {
        const leftType = resolveExpressionAstComputationType(node.args[0]);
        const rightType = resolveExpressionAstComputationType(node.args[1]);
        if (!leftType || !rightType) return null;
        const domains = resolveAbsdiffDomains(node.args[0], node.args[1], leftType, rightType);
        if (!domains) return null;
        if (domains.constantMagnitude !== undefined) {
          const declaredType = domains.constantMagnitude <= 0xFF ? "u8" : "u16";
          return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
        }
        const width = Math.max(8, declaredTypeBitWidth(leftType.declaredType), declaredTypeBitWidth(rightType.declaredType));
        const hasSignedInput = domains.leftSigned || domains.rightSigned;
        const declaredType = width <= 8 && !hasSignedInput ? "u8" : "u16";
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      if (String(node.name || "").toLowerCase() === "abs" && node.args.length === 1) {
        const argType = resolveExpressionAstComputationType(node.args[0], preferredDeclaredType);
        if (!argType) return null;
        const width = Math.max(8, declaredTypeBitWidth(argType.declaredType));
        const declaredType = width <= 8 ? "u8" : "u16";
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(renderExpressionAst(node)), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "index") {
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(`${node.name}[${renderExpressionAst(node.index)}]`), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "subscript") {
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(renderExpressionAst(node)), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "member") {
      const declaredType = mergeDeclaredTypes(resolveDeclaredValueType(renderExpressionAst(node)), null, preferredDeclaredType);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    if (node.kind === "unary") {
      if (node.op === "~") {
        const exprType = resolveExpressionAstComputationType(node.expr, preferredDeclaredType);
        if (!exprType) return null;
        return exprType;
      }
      const mergedType = mergeDeclaredTypes(resolveExpressionAstDeclaredType(node.expr), null, preferredDeclaredType);
      return { declaredType: mergedType, runtimeType: runtimeTypeForDeclaredType(mergedType) };
    }
    if (node.kind === "binary") {
      const leftType = resolveExpressionAstComputationType(node.left);
      const rightType = resolveExpressionAstComputationType(node.right);
      if (node.op === "<<" || node.op === ">>") {
        const declaredType = mergeDeclaredTypes(leftType?.declaredType, null, preferredDeclaredType, node.op);
        return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
      }
      const declaredType = mergeDeclaredTypes(leftType?.declaredType, rightType?.declaredType, preferredDeclaredType, node.op);
      return { declaredType, runtimeType: runtimeTypeForDeclaredType(declaredType) };
    }
    return null;
  }

  function isByteValueType(type) {
    return type === "int8";
  }

  function isWordValueType(type) {
    return type === "int16";
  }

  function parseNumericLiteral(token) {
    const text = String(token).trim();
    if (/^-?[0-9]+$/.test(text)) return Number.parseInt(text, 10);
    if (/^-?\$[0-9A-Fa-f]+$/.test(text)) {
      const neg = text.startsWith("-");
      const digits = neg ? text.slice(2) : text.slice(1);
      const value = Number.parseInt(digits, 16);
      return neg ? -value : value;
    }
    return null;
  }

  function parseRawIntegerLiteral(token, maxBits) {
    const match = String(token).trim().match(/^raw\s+(\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+)$/i);
    if (!match) return null;
    const digits = match[1].startsWith("$") ? match[1].slice(1) : match[1].slice(2);
    const value = Number.parseInt(digits, 16);
    if (!Number.isInteger(value) || value < 0 || value > (2 ** maxBits) - 1) return null;
    return value;
  }

  function parseFixedPointLiteral(token) {
    const text = String(token).trim();
    const rawValue = parseRawIntegerLiteral(text, 16);
    if (rawValue !== null) return rawValue;
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      const numeric = Number.parseFloat(text);
      if (!Number.isFinite(numeric)) return null;
      const scaled = Math.round(numeric * 256);
      if (scaled < -32768 || scaled > 65535) return null;
      return scaled;
    }
    const integerValue = parseNumericLiteral(text);
    if (integerValue === null || !Number.isInteger(integerValue)) return null;
    const scaled = integerValue << 8;
    if (scaled < -32768 || scaled > 65535) return null;
    return scaled;
  }

  function formatFixedPointLiteral16(value) {
    return formatHex16(Number(value) & 0xFFFF);
  }

  function parseFixedPointLiteral32(token) {
    const text = String(token).trim();
    const rawValue = parseRawIntegerLiteral(text, 32);
    if (rawValue !== null) return rawValue >>> 0;
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      const numeric = Number.parseFloat(text);
      if (!Number.isFinite(numeric)) return null;
      const scaled = Math.round(numeric * 65536);
      if (scaled < -2147483648 || scaled > 2147483647) return null;
      return scaled;
    }
    const integerValue = parseNumericLiteral(text);
    if (integerValue === null || !Number.isInteger(integerValue)) return null;
    const scaled = integerValue * 65536;
    if (scaled < -2147483648 || scaled > 2147483647) return null;
    return scaled;
  }

  function parseFormulaAssignment(text) {
    const targetPattern = String.raw`[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?(?:\.[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)*`;
    const match = String(text).trim().match(new RegExp(`^(${targetPattern})\\s*(<<=|>>=|\\+=|-=|\\*=|/=|%=|\\^=|&=|\\|=|=)\\s*(.+)$`));
    if (!match) return null;
    if (match[2] === "=" && /^(?:get|read)\s+(?:char|tile|count|frame)\b/i.test(match[3].trim())) return null;
    return {
      target: match[1],
      op: match[2],
      value: normalizeExpression(match[3])
    };
  }

  function tryEvaluateConstantExpression(expr) {
    const normalized = normalizeExpression(String(expr).trim());
    if (!normalized || !isSafeExpression(normalized) || normalized.includes("[")) return null;
    const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    if (identifiers.length) return null;
    const jsExpr = normalized.replace(/\$([0-9A-Fa-f]+)/g, "0x$1");
    try {
      const value = Function(`"use strict"; return (${jsExpr});`)();
      if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
      return value;
    } catch {
      return null;
    }
  }

  function tryEvaluateCompileTimeNumericExpression(expr, seen = new Set()) {
    const normalized = normalizeExpression(String(expr).trim());
    if (!normalized || !isSafeExpression(normalized) || normalized.includes("[")) return null;
    const directNumber = parseNumericLiteral(normalized);
    if (directNumber !== null) return directNumber;
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
      const numeric = Number.parseFloat(normalized);
      return Number.isFinite(numeric) ? numeric : null;
    }
    const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    let expanded = normalized;
    for (const ident of identifiers) {
      if (!compileTimeConstants.has(ident)) return null;
      if (seen.has(lowerName(ident))) return null;
      const nestedSeen = new Set(seen);
      nestedSeen.add(lowerName(ident));
      const resolved = tryEvaluateCompileTimeNumericExpression(compileTimeConstants.get(ident), nestedSeen);
      if (resolved === null) return null;
      const escapedIdent = ident.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expanded = expanded.replace(new RegExp(`\\b${escapedIdent}\\b`, "g"), String(resolved));
    }
    if (!isSafeExpression(expanded) || expanded.includes("[")) return null;
    const jsExpr = expanded.replace(/\$([0-9A-Fa-f]+)/g, "0x$1");
    try {
      const value = Function(`"use strict"; return (${jsExpr});`)();
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  function analyzeForStep(stepToken, defaultDirection = "up") {
    const constantValue = tryEvaluateConstantExpression(stepToken);
    if (constantValue !== null) {
      if (constantValue === 0) return { error: "FOR step cannot be zero." };
      return {
        direction: constantValue < 0 ? "down" : "up",
        magnitudeToken: String(Math.abs(constantValue))
      };
    }
    return {
      direction: defaultDirection,
      magnitudeToken: stepToken
    };
  }

  function emitRandomBetweenInto(minToken, maxToken, target) {
    const info = getRuntimeInfo(target);
    if (!info || info.type !== "int8") return null;
    const retryLabel = makeGeneratedLabel("RandomRetry");
    const lines = [];
    const storeTarget = emitStoreInt8FromA(target);
    if (!storeTarget) return null;
    const maxInfo = getRuntimeInfo(maxToken);
    if (maxInfo) {
      if (maxInfo.type !== "int8") return null;
      lines.push(...emitLoadInt8Into("b", maxToken));
    } else {
      lines.push(`    ld b,${symbolOrValue(maxToken)}`);
    }
    const minInfo = getRuntimeInfo(minToken);
    if (minInfo) {
      if (minInfo.type !== "int8") return null;
      lines.push(...emitLoadInt8Into("c", minToken));
    } else {
      lines.push(`    ld c,${symbolOrValue(minToken)}`);
    }
    lines.push("    ld a,b");
    lines.push("    sub c");
    lines.push("    inc a");
    lines.push("    ld b,a");
    lines.push(`${retryLabel}:`);
    lines.push("    call AMY_RANDOM_U8");
    lines.push("    cp b");
    lines.push(`    jr nc,${retryLabel}`);
    lines.push("    add a,c");
    lines.push(...storeTarget);
    return lines;
  }

  function tryEvaluateByteConstantExpression(expr) {
    const value = tryEvaluateConstantExpression(expr);
    if (value === null || value < 0 || value > 0xFF) return null;
    return value;
  }

  function emitSqrtInt16Into(valueToken, targetToken) {
    const targetInfo = getRuntimeInfo(targetToken);
    if (!targetInfo || targetInfo.kind === "array" || targetInfo.type !== "int16") return null;
    const loadHL = emitLoadUnsignedInt16ValueIntoHL(valueToken);
    const storeTarget = emitStoreInt16FromHL(targetToken);
    if (!loadHL || !storeTarget) return null;
    return [...loadHL, "    call AMY_U16_SQRT", ...storeTarget];
  }

  function emitU32Zero(name) {
    const info = getRuntimeInfo(name);
    if (info && (info.kind === "u32" || info.kind === "i32")) {
      if (info.storage === "stack") {
        const scratch = ensureCompareScratch32();
        const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
        if (!storeTarget) return null;
        return [`    ld hl,${scratch.leftLabel}`, "    call AMY_U32_ZERO", ...storeTarget];
      }
      return [`    ld hl,${info.asmName}`, "    call AMY_U32_ZERO"];
    }
    const compatInfo = getU32Info(name);
    if (!compatInfo) return null;
    if (compatInfo.storage === "stack") {
      const scratch = ensureCompareScratch32();
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, name);
      if (!storeTarget) return null;
      return [`    ld hl,${scratch.leftLabel}`, "    call AMY_U32_ZERO", ...storeTarget];
    }
    return [`    ld hl,${compatInfo.asmName}`, "    call AMY_U32_ZERO"];
  }

  function emitClearValue(name) {
    const info = getRuntimeInfo(name);
    const fieldRef = parseRecordFieldRef(name);
    if (!info && !fieldRef) return null;
    if (fieldRef?.fieldInfo?.type === "bcd") return emitBcdClear(name);
    if (!info) return null;
    if (info.kind === "array") return null;
    if (info.kind === "bcd") return emitBcdClear(name);
    if (info.kind === "u32" || info.kind === "i32") return emitU32Zero(name);
    if (info.kind === "fp5" || info.type === "fp5") return emitRuntimeStore(name, "0");
    if (info.type === "int8") {
      const storeByte = emitStoreInt8FromA(name);
      if (!storeByte) return null;
      return ["    xor a", ...storeByte];
    }
    if (info.type === "int16") {
      const storeWord = emitStoreInt16FromHL(name);
      if (!storeWord) return null;
      return ["    ld hl,0", ...storeWord];
    }
    return null;
  }

  function emitU32Copy(srcName, dstName) {
    const srcInfo = getU32Info(srcName);
    const dstInfo = getU32Info(dstName);
    if (!srcInfo || !dstInfo) return null;
    if (srcInfo.storage === "stack" || dstInfo.storage === "stack") {
      const scratch = ensureCompareScratch32();
      const storeSource = emitStoreExtended32(srcName, scratch.leftLabel);
      const storeTarget = emitStoreMemory32ToTarget(scratch.leftLabel, dstName);
      if (!storeSource || !storeTarget) return null;
      return [...storeSource, ...storeTarget];
    }
    return [
      `    ld hl,${dstInfo.asmName}`,
      `    ld de,${srcInfo.asmName}`,
      "    call AMY_U32_COPY"
    ];
  }

  function emitDefineMode2Thirds(sourceLabel, startToken, countToken, rawLine, kind) {
    const sourceMatch = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s*\+\s*(.+))?$/.exec(String(sourceLabel).trim());
    if (!sourceMatch) {
      return { ok: false, asmLines: [], log: "define " + kind + " requires a data source with an optional constant byte offset: " + rawLine };
    }
    const sourceBase = sourceMatch[1];
    const sourceOffsetToken = sourceMatch[2] ? sourceMatch[2].trim() : "";
    if (sourceOffsetToken && !countToken) {
      return { ok: false, asmLines: [], log: "define " + kind + " with a source offset requires count: " + rawLine };
    }
    const normalizedSourceOffset = sourceOffsetToken ? normalizeExpression(sourceOffsetToken) : "0";
    if (!isSafeExpression(normalizedSourceOffset) || normalizedSourceOffset.includes("[") || (normalizedSourceOffset.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).some((ident) => getRuntimeInfo(ident))) {
      return { ok: false, asmLines: [], log: "define " + kind + " source offset must be a constant expression: " + rawLine };
    }
    const knownLength = dataLengths.get(sourceBase);
    if (!knownLength && !countToken) {
      return { ok: false, asmLines: [], log: "define " + kind + " requires count when the source length is external: " + rawLine };
    }
    if (knownLength && (knownLength % 8) !== 0) {
      return { ok: false, asmLines: [], log: `define ${kind} source length must be a multiple of 8 bytes: ${rawLine}` };
    }
    const normalizedStart = normalizeExpression(String(startToken).trim());
    if (!isSafeExpression(normalizedStart) || normalizedStart.includes("[")) {
      return { ok: false, asmLines: [], log: `define ${kind} requires a byte-sized start index or constant expression: ${rawLine}` };
    }
    const startIdentifiers = normalizedStart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    for (const ident of startIdentifiers) {
      if (getRuntimeInfo(ident)) {
        return { ok: false, asmLines: [], log: `define ${kind} start index cannot use runtime variables yet: ${rawLine}` };
      }
    }
    const resolvedCharCount = countToken ? normalizeExpression(String(countToken).trim()) : String(knownLength / 8);
    const loadByteCount = emitLoadCountIntoBC(`((${resolvedCharCount}) * 8)`);
    if (!loadByteCount) {
      return { ok: false, asmLines: [], log: `define ${kind} could not resolve byte count: ${rawLine}` };
    }
    const byteCountExpr = `((${resolvedCharCount}) * 8)`;
    const useDirectWriteVram = isDefinitelyByteSizedCount(byteCountExpr);
    const sourceAddress = resolveAddressSymbol(sourceBase) + (sourceOffsetToken ? " + (" + normalizedSourceOffset + ")" : "");
    const startOffsetExpr = `((${normalizedStart}) * 8)`;
    const baseSymbol = kind === "colors" ? "VRAM_COLOR" : "VRAM_PATTERN";
    const targetBase = `${baseSymbol} + ${startOffsetExpr}`;     const asmLines = [       `    ld de,${symbolOrValue(targetBase)}`,       `    ld hl,${sourceAddress}`,       ...loadByteCount,       "    call AMY_DEFINE_MODE2_THIRDS"     ];     return { ok: true, asmLines, log: "" };
  }

  function emitDefineCharsToPattern(sourceLabel, startToken, countToken, rawLine) {
    return emitDefineMode2Thirds(sourceLabel, startToken, countToken, rawLine, "chars");
  }

  function emitDefineColorsToPattern(sourceLabel, startToken, countToken, rawLine) {
    return emitDefineMode2Thirds(sourceLabel, startToken, countToken, rawLine, "colors");
  }

  let emitLoadArrayAddressIntoHL;
  let emitStoreInt8FromA;
  let emitStoreInt16FromHL;
  let getByteArrayBufferInfo;

  let emitLoadInt8Into;
  let SIMPLE_BYTE_TOKEN_RE;
  let splitTopLevelByteExpression;
  let emitScaleAByConst;
  let emitRandomCountIntoA;
  let emitLoadInt8TermIntoA;
  let emitLoadInt8ValueInto;
  let emitLoadInt8ValueIntoPreserving;
  let emitLoadRawInt8IntoA;
  let emitLoadCountIntoBC;
  let emitLoadCountIntoDE;
  let isDefinitelyByteSizedCount;
  let emitLoadSourceAddressIntoHL;
  let emitLoadWordTableEntryIntoHL;
  let getWordTableInfo;
  let emitLoadVramAddressIntoDE;
  let emitLoadVramAddressIntoHL;

  ({
    makeGeneratedLabel,
    optimizeTransientDrawCoordinateTemps,
    optimizeSharedRecordPutCharLoads,
    optimizeSequentialAbsoluteByteStores,
    optimizeRedundantImmediateLoads,
    reserveRam,
    isZeroInitializer,
    formatIxOffset
  } = createCompilerShellHelpers({
    state: {
      getNextGeneratedLabel: () => nextGeneratedLabel,
      bumpNextGeneratedLabel: () => { nextGeneratedLabel += 1; },
      getRamLayout: () => ramLayout,
      getNextRamAddress: () => nextRamAddress,
      setNextRamAddress: (value) => { nextRamAddress = value; }
    },
    formatHex16,
    parseNumericLiteral: (...args) => parseNumericLiteral(...args),
    parseFixedPointLiteral32: (...args) => parseFixedPointLiteral32(...args)
  }));

  function ensureFp5ReturnScratch() {
    if (fp5ReturnScratch) return fp5ReturnScratch;
    const label = "AMY_FP5_RET";
    const address = reserveRam(label, 5, "internal fp5 function return");
    runtimeDeclarations.push(`${label} EQU ${formatHex16(address)}`);
    fp5ReturnScratch = label;
    return label;
  }

  function findConstantZeroDivisor(expr) {
    const ast = parseExpressionAst(normalizeExpression(String(expr || "").trim()));
    if (!ast) return null;
    const visit = (node) => {
      if (!node || typeof node !== "object") return null;
      if (node.kind === "binary" && (node.op === "/" || node.op === "%")) {
        const divisor = tryEvaluateCompileTimeNumericExpression(renderExpressionAst(node.right));
        if (divisor === 0) return node.op;
      }
      return visit(node.left)
        || visit(node.right)
        || (Array.isArray(node.args) ? node.args.map(visit).find(Boolean) : null)
        || visit(node.index)
        || visit(node.object);
    };
    return visit(ast);
  }

  function resolveStaticWholeRecord(token) {
    const normalized = normalizeExpression(String(token || "").trim());
    if (!normalized) return null;
    const directInfo = getRuntimeInfo(normalized);
    if (directInfo?.kind === "record") {
      if (!directInfo.asmName || directInfo.storage === "alias_pointer" || directInfo.storage === "dynamic_record_alias") return null;
      const recordInfo = getRecordTypeInfo(directInfo.recordTypeName || directInfo.declaredType);
      if (!recordInfo) return null;
      return {
        address: directInfo.asmName,
        recordTypeName: recordInfo.name,
        byteSize: recordInfo.byteSize
      };
    }
    const arrayElement = normalized.match(/^(.+)\[([^\]]+)\]$/);
    if (arrayElement) {
      const arrayToken = arrayElement[1].trim();
      const indexToken = arrayElement[2].trim();
      const arrayInfo = getRuntimeInfo(arrayToken);
      if (arrayInfo?.kind === "record_array") {
        const recordInfo = getRecordTypeInfo(arrayInfo.recordTypeName || arrayInfo.declaredType);
        const loadLines = emitLoadArrayAddressIntoHL(arrayToken, indexToken);
        if (!recordInfo || !loadLines) return null;
        return {
          loadLines,
          recordTypeName: recordInfo.name,
          byteSize: recordInfo.byteSize
        };
      }
      const qualifiedArray = parseRecordFieldRef?.(arrayToken);
      if (qualifiedArray?.isWholeRecordArray && qualifiedArray.fieldInfo?.type === "record") {
        const recordInfo = getRecordTypeInfo(qualifiedArray.fieldInfo.recordTypeName || qualifiedArray.fieldInfo.declaredType);
        const loadLines = emitLoadArrayAddressIntoHL(arrayToken, indexToken);
        if (!recordInfo || !loadLines) return null;
        return {
          loadLines,
          recordTypeName: recordInfo.name,
          byteSize: recordInfo.byteSize
        };
      }
    }
    const field = parseRecordFieldRef?.(normalized);
    if (!field || field.baseKind !== "scalar" || field.index !== null || field.isWholeArray
      || field.arrayFieldIndex !== null || (field.arrayFieldOffsets?.length || 0) !== 0
      || field.fieldInfo?.type !== "record" || field.fieldInfo?.isArray) return null;
    const baseInfo = getRuntimeInfo(field.name);
    if (!baseInfo?.asmName || baseInfo.storage === "alias_pointer" || baseInfo.storage === "dynamic_record_alias") return null;
    const recordInfo = getRecordTypeInfo(field.fieldInfo.recordTypeName || field.fieldInfo.declaredType);
    if (!recordInfo) return null;
    return {
      address: `${baseInfo.asmName}${field.totalOffset ? ` + ${field.totalOffset}` : ""}`,
      recordTypeName: recordInfo.name,
      byteSize: recordInfo.byteSize
    };
  }

  function emitOverlayFieldAliases(overlayName, partName, recordInfo, baseAddress, metadataFields, path = [], baseOffset = 0) {
    for (const field of recordInfo.orderedFields) {
      const fieldPath = [...path, field.name];
      const fieldOffset = baseOffset + field.offset;
      if (field.type === "record") {
        if (field.isArray) {
          const alias = `AMY_SCENE_${partName}_${fieldPath.join("_")}`;
          runtimeDeclarations.push(`${alias} EQU ${formatHex16(baseAddress + fieldOffset)}`);
          metadataFields.push({
            qualifiedName: `${overlayName}.${partName}.${fieldPath.join(".")}`,
            asmName: alias,
            address: baseAddress + fieldOffset,
            offset: fieldOffset,
            type: "record_array",
            declaredType: field.recordTypeName || field.declaredType,
            width: field.size,
            length: field.length,
            elementSize: field.elementSize
          });
          continue;
        }
        const nested = getRecordTypeInfo(field.recordTypeName || field.declaredType);
        if (nested) emitOverlayFieldAliases(overlayName, partName, nested, baseAddress, metadataFields, fieldPath, fieldOffset);
        continue;
      }
      const alias = `AMY_SCENE_${partName}_${fieldPath.join("_")}`;
      runtimeDeclarations.push(`${alias} EQU ${formatHex16(baseAddress + fieldOffset)}`);
      metadataFields.push({
        qualifiedName: `${overlayName}.${partName}.${fieldPath.join(".")}`,
        asmName: alias,
        address: baseAddress + fieldOffset,
        offset: fieldOffset,
        type: field.isArray ? "array" : (field.type || field.declaredType),
        declaredType: field.declaredType,
        width: field.size,
        ...(field.isArray ? { length: field.length, elementSize: field.elementSize } : {}),
        ...(field.type === "bcd" ? { digitCount: field.digitCount, byteCount: field.byteCount } : {})
      });
    }
  }

  function allocateOverlay(definition, rawLine) {
    const nameError = validateGlobalUserName(definition.name, "Overlay", rawLine);
    if (nameError) return nameError;
    const reservedBytes = Math.max(...definition.parts.map((part) => part.byteSize));
    const logicalBytes = definition.parts.reduce((sum, part) => sum + part.byteSize, 0);
    let address;
    try {
      address = reserveRam(definition.name, reservedBytes, rawLine.trim());
    } catch (error) {
      return String(error.message || error);
    }
    const syntheticTypeName = `__overlay_${definition.name}`;
    const fields = new Map();
    const orderedFields = definition.parts.map((part) => {
      const field = {
        name: part.name,
        declaredType: part.recordTypeName,
        type: "record",
        offset: 0,
        size: part.byteSize,
        recordTypeName: part.recordTypeName,
        recordInfo: part.recordInfo,
        overlayPart: true
      };
      fields.set(part.name, field);
      return field;
    });
    recordTypes.set(syntheticTypeName, { name: syntheticTypeName, fields, orderedFields, byteSize: reservedBytes, syntheticOverlay: true });
    const asmName = `AMY_OVERLAY_${definition.name}`;
    runtimeVars.set(definition.name, {
      kind: "record",
      type: "record",
      declaredType: syntheticTypeName,
      recordTypeName: syntheticTypeName,
      recordInfo: getRecordTypeInfo(syntheticTypeName),
      recordSize: reservedBytes,
      address,
      scope: "global",
      storage: "overlay",
      asmName,
      overlayName: definition.name
    });
    userVarAsmSymbols.set(definition.name, asmName);
    runtimeDeclarations.push(`; --- Amy RAM overlay ${definition.name}: ${reservedBytes} physical, ${logicalBytes} logical ---`);
    runtimeDeclarations.push(`${asmName} EQU ${formatHex16(address)}`);
    const parts = definition.parts.map((part) => {
      const metadataFields = [];
      emitOverlayFieldAliases(definition.name, part.name, part.recordInfo, address, metadataFields);
      return {
        name: part.name,
        recordTypeName: part.recordTypeName,
        byteSize: part.byteSize,
        fields: metadataFields
      };
    });
    overlayLayouts.push({
      name: definition.name,
      address,
      reservedBytes,
      logicalBytes,
      savedBytes: logicalBytes - reservedBytes,
      ...(debugScenePoison ? { debugPoison: 0xCD } : {}),
      parts
    });
    hasRuntimeRamDeclarations = true;
    return null;
  }
  ({
    normalizeDataToken,
    parseBitmapLine,
    bitmapCharToBit,
    encodeBitmap8Row,
    encodeSprite16Row,
    appendBitmapRow,
    appendCharRow,
    appendDataTokens,
    looksLikeDataTokens,
    appendWordDataTokens,
    looksLikeWordDataTokens,
    formatDataByteLiteral,
    expandDataValueToken,
    flushDataBlock
  } = createDataHelpers({
    tryEvaluateConstantExpression,
    ensureDataAsmSymbol,
    rewriteUserSymbolsInExpression,
    dataLengths,
    dataBlocks,
    dataWordTables,
    romData,
    getInData: () => inData,
    setInData: (value) => { inData = value; }
  }));

  let decimalToBcdBytes;
  let getBcdDigitCount;
  let doesDecimalFitBcdDigits;
  let emitLoadBcdInt8IntoA;
  let emitStoreAToBcdInt8;
  let emitBcdNormalize;
  let emitBcdAddOne;
  let emitBcdSubOne;
  let emitBcdAdjustByInt8;
  let emitBcdAdd;
  let emitBcdSub;
  let emitBcdClear;
  let emitBcdPrint;
  let emitFormatBcdIntoBuffer;
  let emitBcdCopy;
  let emitBcdStore;
  let emitBcdCompareGoto;
  ({
    decimalToBcdBytes,
    getBcdDigitCount,
    doesDecimalFitBcdDigits,
    emitLoadBcdInt8IntoA,
    emitStoreAToBcdInt8,
    emitBcdNormalize,
    emitBcdAddOne,
    emitBcdSubOne,
    emitBcdAdjustByInt8,
    emitBcdAdd,
    emitBcdSub,
    emitBcdClear,
    emitBcdPrint,
    emitFormatBcdIntoBuffer,
    emitBcdCopy,
    emitBcdStore,
    emitBcdCompareGoto
  } = createBcdHelpers({
    getRuntimeInfo,
    parseRecordFieldRef: (...args) => parseRecordFieldRef(...args),
    emitLoadRecordFieldAddressIntoHL: (...args) => emitLoadRecordFieldAddressIntoHL(...args),
    formatIxOffset,
    scopedRuntimeName,
    parseNumericLiteral,
    makeGeneratedLabel,
    emitLoadInt8Into: (...args) => emitLoadInt8Into(...args),
    isSignedDeclaredType,
    resolveDeclaredValueType,
    emitLoadArrayAddressIntoHL: (...args) => emitLoadArrayAddressIntoHL(...args),
    emitLoadInt8ValueInto: (...args) => emitLoadInt8ValueInto(...args),
    symbolOrValue,
    tryEvaluateCompileTimeNumericExpression,
    getByteArrayBufferInfo: (...args) => getByteArrayBufferInfo(...args)
  }));
  ({
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
  } = createValueParseHelpers({
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
    emitPushArgument: (...args) => emitPushArgument(...args),
    getStaticAbiParams: (name) => staticAbiParams.get(name) || null,
    runtimeParamSlotSize,
    emitAdjustSpBy,
    resolveJumpTarget,
    makeGeneratedLabel,
    resolveExpressionAstComputationType,
    scopedRuntimeName,
    formatIxOffset,
    emitLoadInt8ValueInto: (...args) => emitLoadInt8ValueInto(...args)
  }));

  let invertOperator;
  let evaluateConstantComparison;
  let emitCompareGoto;
  let emitSelectCaseEqGoto;
  let emitSimpleConditionalJump;
  let emitConditionAstJump;
  let emitConditionalJump;
  let emitOnIndexedJump;
  ({
    invertOperator,
    evaluateConstantComparison,
    emitCompareGoto,
    emitSelectCaseEqGoto,
    emitSimpleConditionalJump,
    emitConditionAstJump,
    emitConditionalJump,
    emitOnIndexedJump
  } = createControlFlowHelpers({
    tryEvaluateConstantExpression,
    tryEvaluateCompileTimeNumericExpression,
    resolveJumpTarget,
    emitBcdCompareGoto,
    getI32Info: (...args) => getI32Info(...args),
    getU32Info: (...args) => getU32Info(...args),
    resolveValueType,
    resolveDeclaredValueType,
    isSignedDeclaredType,
    parseExpressionAst,
    emitComputeExpressionAst: (...args) => emitComputeExpressionAst(...args),
    inferLiteralDeclaredType,
    declaredTypeBitWidth,
    declaredTypeForWidth,
      coerceComputedExpressionForCompare: (...args) => coerceComputedExpressionForCompare(...args),
    parseArrayRef,
    emitU32ArrayCompareGoto: (...args) => emitU32ArrayCompareGoto(...args),
    emitCompareScratch32Goto: (...args) => emitCompareScratch32Goto(...args),
    emitCompareFp5Goto: (...args) => emitCompareFp5Goto(...args),
    isWordValueType,
    emitSignedInt16CompareGoto: (...args) => emitSignedInt16CompareGoto(...args),
    emitSignedInt8CompareGoto: (...args) => emitSignedInt8CompareGoto(...args),
    emitLoadInt16IntoHL: (...args) => emitLoadInt16IntoHL(...args),
    symbolOrValue,
    makeGeneratedLabel,
    emitLoadInt8ValueInto: (...args) => emitLoadInt8ValueInto(...args),
    getRuntimeInfo,
    formatIxOffset,
    emitLoadInt8Into: (...args) => emitLoadInt8Into(...args),
    getImplicitNoArgFunctionInvocation,
    emitFunctionInvocation,
    normalizeExpression,
    resolveExpressionAstValueType,
    emitLoadInt8AstIntoA: (...args) => emitLoadInt8AstIntoA(...args),
    emitLoadInt16AstIntoHL: (...args) => emitLoadInt16AstIntoHL(...args),
    parseBooleanConditionAst,
    parseBuiltinInputRef,
    emitLoadBuiltinInputInto,
    resolveSourceJumpTarget,
    formatUnknownJumpTargetLog,
    emitComputedCompareGoto: (...args) => emitComputedCompareGoto(...args),
    getTileTypeInfo,
    getHitboxInfo,
    resolveWholeRecord: resolveStaticWholeRecord
  }));
  ({
    emitLoadArrayAddressIntoHL,
    emitLoadRecordFieldAddressIntoHL,
    getDirectRecordFieldAddress,
    getByteArrayBufferInfo,
    emitStoreInt8FromA,
    emitStoreInt16FromHL
  } = createLoadStoreHelpers({
    parseArrayRef,
    parseRecordFieldRef,
    getRuntimeInfo,
    normalizeExpression,
    resolveValueType,
    runtimeTypeSize,
    isIndexedByteReadable,
    formatHex16,
    formatIxOffset,
    scopedRuntimeName,
    symbolOrValue,
    emitLoadInt8Into: (...args) => emitLoadInt8Into(...args),
    makeGeneratedLabel
  }));
  ({
    emitLoadInt16IntoHL,
    emitRuntimeStore,
    emitStoreImmediate32,
    emitPushArgument,
    ensureDataCursorVar,
    emitLoadFp5SourceToFpa
  } = createRuntimeValueHelpers({
    normalizeExpression,
    normalizeDeclaredType,
    tryEvaluateCompileTimeNumericExpression,
    isAnyFixedDeclaredType,
    isFix16_16DeclaredType,
    parseFixedPointLiteral,
    formatFixedPointLiteral16,
    parseFixedPointLiteral32,
    parseNumericLiteral,
    emitStoreFx16Source: (...args) => emitStoreFx16Source(...args),
    emitStoreFx16MemoryAsFp5: (...args) => emitStoreFx16MemoryAsFp5(...args),
    parseExpressionAst,
    emitLoadInt16AstIntoHL: (...args) => emitLoadInt16AstIntoHL(...args),
    parseBuiltinInputRef,
    parseRecordFieldRef,
    emitLoadInt8Into: (...args) => emitLoadInt8Into(...args),
    isSignedDeclaredType,
    parseDwordWordComponent,
    emitLoadDwordInt16ComponentIntoHL: (...args) => emitLoadDwordInt16ComponentIntoHL(...args),
    parseArrayRef,
    getRuntimeInfo,
    emitLoadArrayAddressIntoHL: (...args) => emitLoadArrayAddressIntoHL(...args),
    emitLoadRecordFieldAddressIntoHL: (...args) => emitLoadRecordFieldAddressIntoHL(...args),
    getDirectRecordFieldAddress: (...args) => getDirectRecordFieldAddress(...args),
    emitFunctionInvocation: (...args) => emitFunctionInvocation(...args),
    resolveDeclaredValueType: (...args) => resolveDeclaredValueType(...args),
    scopedRuntimeName,
    symbolOrValue,
    emitBcdStore: (...args) => emitBcdStore(...args),
    resolveValueType: (...args) => resolveValueType(...args),
    emitComputeExpressionAst: (...args) => emitComputeExpressionAst(...args),
    emitStoreComputedExpression: (...args) => emitStoreComputedExpression(...args),
    emitStoreInt8FromA: (...args) => emitStoreInt8FromA(...args),
    emitLoadInt8ValueInto: (...args) => emitLoadInt8ValueInto(...args),
    emitLoadWordTableEntryIntoHL: (...args) => emitLoadWordTableEntryIntoHL(...args),
    getWordTableInfo: (...args) => getWordTableInfo(...args),
    ensureCompareScratch32: (...args) => ensureCompareScratch32(...args),
    ensureFp5ReturnScratch,
    emitStoreExtended32: (...args) => emitStoreExtended32(...args),
    emitStoreWideExpression: (...args) => emitStoreWideExpression?.(...args) ?? null,
    emitStoreMemory32ToTarget: (...args) => emitStoreMemory32ToTarget(...args),
    emitStoreInt16FromHL: (...args) => emitStoreInt16FromHL(...args),
    runtimeTypeSize,
    reserveRam,
    runtimeState: {
      runtimeVars,
      runtimeDeclarations,
      getDataCursorName: () => dataCursorName,
      setDataCursorName: (value) => { dataCursorName = value; }
    },
    formatHex16,
    splitTopLevelArgs
  }));
  ({
    SIMPLE_BYTE_TOKEN_RE,
    emitLoadInt8Into,
    splitTopLevelByteExpression,
    emitScaleAByConst,
    emitRandomCountIntoA,
    emitLoadInt8TermIntoA,
    emitLoadInt8ValueInto,
    emitLoadInt8ValueIntoPreserving,
    emitLoadRawInt8IntoA,
    emitLoadCountIntoBC,
    emitLoadCountIntoDE,
    isDefinitelyByteSizedCount
  } = createByteLoadHelpers({
    parseArrayRef,
    parseRecordFieldRef,
    getRuntimeInfo,
    normalizeExpression,
    parseExpressionAst,
    emitLoadInt8AstIntoA: (...args) => emitLoadInt8AstIntoA(...args),
    parseBuiltinInputRef,
    emitLoadBuiltinInputInto,
    isIndexedByteReadable,
    emitLoadArrayAddressIntoHL: (...args) => emitLoadArrayAddressIntoHL(...args),
    emitLoadRecordFieldAddressIntoHL: (...args) => emitLoadRecordFieldAddressIntoHL(...args),
    getDirectRecordFieldAddress: (...args) => getDirectRecordFieldAddress(...args),
    emitFunctionInvocation,
    parseFix8_8Component,
    resolveDeclaredValueType,
    isAnyFixedDeclaredType,
    emitLoadInt16IntoHL,
    parseWordByteComponent,
    scopedRuntimeName,
    symbolOrValue,
    formatIxOffset,
    makeGeneratedLabel,
    isSafeExpression,
    parseNumericLiteral,
    tryEvaluateConstantExpression,
    resolveExpressionAstValueType,
    dataLengths,
    resolveAddressSymbol
  }));
  ({
    emitTextLiteral,
    optimizeRepeatedBitTestLoads,
    emitSignedInt8CompareGoto,
    emitSignedInt16CompareGoto
  } = createCompareLiteralHelpers({
    textState: {
      textData,
      getNextTextLabel: () => nextTextLabel,
      bumpNextTextLabel: () => { nextTextLabel += 1; }
    },
    emitLoadInt8ValueInto: (...args) => emitLoadInt8ValueInto(...args),
    resolveValueType: (...args) => resolveValueType(...args),
    isByteValueType,
    makeGeneratedLabel,
    emitLoadInt16IntoHL: (...args) => emitLoadInt16IntoHL(...args),
    isWordValueType,
    symbolOrValue
  }));
  let ensureNumericFormatVars;
  let emitNumericPostprocessAt;
  let emitNumericPostprocessBuffer;
  let emitPrintInt8AtAuto;
  let emitPrintInt16FromCurrentHLAt;
  let emitPrintInt16AtAuto;
  let emitPrintI16At;
  let emitPrintI8At;
  let emitPrintFix8_8At;
  let emitPrintU32At;
  let emitPrintI32At;
  let emitFormatAutoIntoBuffer;
  let emitFormatHexIntoBuffer;
  let emitFormatI8IntoBuffer;
  let emitFormatI16IntoBuffer;
  let emitFormatFix8_8IntoBuffer;
  let emitLoadUnsignedInt16ValueIntoHL;
  let emitFormatFp5FriendlyIntoBuffer;
  let emitFormatU32IntoBuffer;
  let emitFormatI32IntoBuffer;
  let emitPrintAutoAt;
  let emitPrintHexAt;
  let emitPrintLiteralAt;
  let getDefaultPrintWidth;
  let emitPrintAtDense;
  let emitTextExpressionIntoBuffer;
  ({
    ensureNumericFormatVars,
    emitNumericPostprocessAt,
    emitNumericPostprocessBuffer,
    emitLoadUnsignedInt16ValueIntoHL,
    emitFormatAutoIntoBuffer,
    emitFormatHexIntoBuffer,
    emitFormatI8IntoBuffer,
    emitFormatI16IntoBuffer,
    emitFormatFix8_8IntoBuffer,
    emitFormatFp5FriendlyIntoBuffer,
    emitFormatU32IntoBuffer,
    emitFormatI32IntoBuffer,
    emitPrintInt8AtAuto,
    emitPrintInt16FromCurrentHLAt,
    emitPrintInt16AtAuto,
    emitPrintI16At,
    emitPrintI8At,
    emitPrintFix8_8At,
    emitPrintU32At,
    emitPrintI32At,
    emitPrintAutoAt,
    emitPrintHexAt,
    emitPrintLiteralAt,
    getDefaultPrintWidth,
    emitPrintAtDense,
    emitTextExpressionIntoBuffer
  } = createPrintHelpers({
    state: {
      get numericDigitBaseName() { return numericDigitBaseName; },
      set numericDigitBaseName(value) { numericDigitBaseName = value; },
      get numericPadCharName() { return numericPadCharName; },
      set numericPadCharName(value) { numericPadCharName = value; },
      get hasRuntimeRamDeclarations() { return hasRuntimeRamDeclarations; },
      set hasRuntimeRamDeclarations(value) { hasRuntimeRamDeclarations = value; },
      get hasRuntimeInit() { return hasRuntimeInit; },
      set hasRuntimeInit(value) { hasRuntimeInit = value; },
      get needsNumericPostprocessHelpers() { return needsNumericPostprocessHelpers; },
      set needsNumericPostprocessHelpers(value) { needsNumericPostprocessHelpers = value; },
      get needsNumericPostprocessWidthHelper() { return needsNumericPostprocessWidthHelper; },
      set needsNumericPostprocessWidthHelper(value) { needsNumericPostprocessWidthHelper = value; },
      get needsFp5FriendlyFormatHelper() { return needsFp5FriendlyFormatHelper; },
      set needsFp5FriendlyFormatHelper(value) { needsFp5FriendlyFormatHelper = value; },
      get fp5FriendlyFirstIntName() { return fp5FriendlyFirstIntName; },
      set fp5FriendlyFirstIntName(value) { fp5FriendlyFirstIntName = value; },
      get fp5FriendlyDotName() { return fp5FriendlyDotName; },
      set fp5FriendlyDotName(value) { fp5FriendlyDotName = value; },
      get fp5FriendlyLastFracName() { return fp5FriendlyLastFracName; },
      set fp5FriendlyLastFracName(value) { fp5FriendlyLastFracName = value; }
    },
    reserveRam,
    runtimeVars,
    runtimeDeclarations,
    runtimeInit,
    formatHex16,
    emitLoadArrayAddressIntoHL,
    emitLoadInt8ValueInto,
    emitLoadInt8ValueIntoPreserving,
    emitLoadInt16IntoHL,
    makeGeneratedLabel,
    emitSafeCall,
    normalizeDeclaredType,
    isAnyFixedDeclaredType,
    isFix8_8DeclaredType,
    isFix16_16DeclaredType,
    isSignedDeclaredType,
    ensureCompareScratch32: (...args) => ensureCompareScratch32(...args),
    emitPrepareU32Source: (...args) => emitPrepareU32Source(...args),
    emitPrepareI32Source: (...args) => emitPrepareI32Source(...args),
    resolveDeclaredValueType,
    resolveExpressionAstComputationType,
    parseExpressionAst,
    parseNumericLiteral,
    resolveValueType,
    emitTextLiteral,
    tryEvaluateByteConstantExpression,
    normalizeExpression,
    getRuntimeInfo,
    emitBcdPrint,
    getBcdDigitCount,
    emitFormatBcdIntoBuffer
  }));
  ({
    emitLoadSourceAddressIntoHL,
    emitLoadVramAddressIntoDE,
    emitLoadVramAddressIntoHL,
    emitLoadWordTableEntryIntoHL,
    getWordTableInfo
  } = createAddressHelpers({
    normalizeExpression,
    getRuntimeInfo,
    resolveAddressSymbol,
    parseExpressionAst,
    resolveExpressionAstValueType,
    emitLoadInt8ValueInto,
    emitLoadInt16IntoHL,
    symbolOrValue,
    tryEvaluateConstantExpression,
    tryEvaluateCompileTimeNumericExpression,
    dataWordTables
  }));
  ({
    ensureCompareScratch32,
    emitStoreMemory32ToTarget,
    emitPrepareU32Source,
    emitPrepareI32Source,
    emitStoreExtended32,
    emitLoadDwordInt16ComponentIntoHL,
    emitCompareScratch32Goto,
    emitComputedCompareGoto,
    getU32Info,
    getI32Info,
    emitU32Inc,
    emitU32Dec,
    emitU32ArrayCompareGoto
  } = createU32Helpers({
    parseArrayRef,
    parseRecordFieldRef,
    getRuntimeInfo,
    emitLoadArrayAddressIntoHL,
    emitLoadRecordFieldAddressIntoHL,
    formatIxOffset,
    emitFunctionInvocation,
    resolveValueType,
    resolveDeclaredValueType,
    isSignedDeclaredType,
    parseNumericLiteral,
    emitStoreImmediate32,
    emitLoadInt8Into,
    emitLoadInt16IntoHL,
    emitStoreWideExpression: (...args) => emitStoreWideExpression?.(...args) ?? null,
      emitStoreComputedToScratch32: (...args) => emitStoreComputedToScratch32(...args),
    makeGeneratedLabel,
    reserveRam,
    runtimeDeclarations,
    formatHex16,
    compareScratchState: {
      get: () => compareScratch32,
      set: (value) => { compareScratch32 = value; }
    }
  }));
  ({
    getFx16Info,
    emitStoreFx16Source,
    emitStoreFx16MemoryAsFp5,
    emitCompareFp5Goto,
    emitFx16ArithOp,
    emitFx16MultiplyOp,
    emitFx16DivideOp,
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
    emitRandomFx16Into,
    emitRandomFp5Into,
    emitRandomFp5BetweenInto,
    emitFp5ArithOp,
    emitFp5MultiplyOp,
    emitFp5DivideOp
  } = createFx16Helpers({
    getRuntimeInfo,
    emitLoadInt8Into: (...args) => emitLoadInt8Into(...args),
    emitLoadInt16IntoHL,
    emitRuntimeStore: (...args) => emitRuntimeStore(...args),
    emitStoreInt8FromA,
    emitStoreInt16FromHL,
    emitStoreExtended32,
    emitStoreMemory32ToTarget,
    emitStoreImmediate32,
    ensureCompareScratch32,
    parseFixedPointLiteral32,
    parseNumericLiteral,
    tryEvaluateCompileTimeNumericExpression,
    resolveDeclaredValueType,
    normalizeDeclaredType,
    formatIxOffset,
    scopedRuntimeName
  }));
  ({
    emitComputeExpressionAst,
    emitStoreComputedExpression,
    emitStoreComputedToScratch32,
    coerceComputedExpressionForCompare,
    emitLoadInt8AstIntoA,
    emitLoadInt16AstIntoHL
  } = createExpressionComputeHelpers({
    resolveExpressionAstComputationType,
    emitLoadInt8Into: (...args) => emitLoadInt8Into(...args),
    emitLoadInt16ValueIntoHL: (...args) => emitLoadInt16IntoHL(...args),
    resolveValueType,
    resolveDeclaredValueType,
    isAnyFixedDeclaredType,
    isSignedDeclaredType,
    normalizeDeclaredType,
    runtimeTypeForDeclaredType,
    parseFixedPointLiteral,
    formatFixedPointLiteral16,
    renderExpressionAst,
    tryEvaluateConstantExpression,
    tryEvaluateCompileTimeNumericExpression,
    symbolOrValue,
    emitRandomCountIntoA,
    emitScaleAByConst,
    emitStoreInt8FromA,
    emitStoreInt16FromHL,
    makeGeneratedLabel,
    getRuntimeInfo,
    scopedRuntimeName,
    parseArrayRef,
    dataLengths
  }));
  ({
    emitArithInt8Op,
    emitLoadInt16ArithSourceIntoDE,
    emitArithInt16Op,
    emitShiftVar,
    emitShiftVarByN
  } = createSimpleArithmeticHelpers({
    emitLoadInt8Into,
    emitStoreInt8FromA,
    resolveValueType,
    symbolOrValue,
    getRuntimeInfo,
    resolveDeclaredValueType,
    isAnyFixedDeclaredType,
    isSignedDeclaredType,
    parseFixedPointLiteral,
    formatFixedPointLiteral16,
    parseNumericLiteral,
    emitLoadInt16IntoHL,
    emitStoreInt16FromHL,
    parseArrayRef,
    parseRecordFieldRef,
    normalizeDeclaredType,
    scopedRuntimeName,
    formatIxOffset,
    emitLoadInt8ValueInto: (...args) => emitLoadInt8ValueInto(...args)
  }));
  ({
    emitLoadUnsignedInt16ValueIntoBC,
    emitU32Add,
    emitU32Sub,
    emitArith32Op,
    emitStoreWideExpression,
    emitFormulaAssignment,
    emitMultiplyInt8Op,
    emitMultiplyInt16Op,
    emitDivideInt8Op
  } = createAssignmentArithmeticHelpers({
    getRuntimeInfo,
    tryEvaluateCompileTimeNumericExpression,
    resolveDeclaredValueType,
    normalizeDeclaredType,
    isAnyFixedDeclaredType,
    isFix16_16DeclaredType,
    emitFx16ArithOp: (...args) => emitFx16ArithOp(...args),
    emitFp5ArithOp: (...args) => emitFp5ArithOp(...args),
    emitFx16MultiplyOp: (...args) => emitFx16MultiplyOp(...args),
    emitFx16DivideOp: (...args) => emitFx16DivideOp(...args),
    emitFp5MultiplyOp: (...args) => emitFp5MultiplyOp(...args),
    emitFp5DivideOp: (...args) => emitFp5DivideOp(...args),
    emitRandomFp5BetweenInto: (...args) => emitRandomFp5BetweenInto(...args),
    splitTopLevelArgs,
    emitRuntimeStore: (...args) => emitRuntimeStore(...args),
    emitLoadInt8Into,
    emitStoreInt8FromA,
    makeGeneratedLabel,
    symbolOrValue,
    emitLoadInt16IntoHL,
    emitStoreInt16FromHL,
    parseNumericLiteral,
    isSignedDeclaredType,
    formatHex16,
    resolveValueType,
    emitArithInt8Op,
    emitArithInt16Op,
    parseArrayRef,
    parseRecordFieldRef,
    emitLoadArrayAddressIntoHL: (...args) => emitLoadArrayAddressIntoHL(...args),
    emitU32Inc,
    emitU32Dec,
    ensureCompareScratch32,
    emitStoreExtended32,
    emitStoreMemory32ToTarget,
    emitBcdAdd,
    emitBcdSub
  }));
  const firstPassNameError = scanAmyFirstPass({
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
  });
  if (firstPassNameError) {
    return { ok: false, asmBody: "", log: firstPassNameError };
  }
  const staticLocalProcScanError = analyzeStaticLocalProcCandidates();
  if (staticLocalProcScanError) {
    return { ok: false, asmBody: "", log: staticLocalProcScanError };
  }

  for (let sourceLineNumber = 0; sourceLineNumber < lines.length; sourceLineNumber += 1) {
    const overlayDefinition = overlayDefinitions.get(sourceLineNumber);
    if (overlayDefinition) {
      if (currentProc || currentFunction) {
        return { ok: false, asmBody: "", log: `Overlay '${overlayDefinition.name}' must be declared at top level: ${lines[sourceLineNumber]}` };
      }
      const overlayError = allocateOverlay(overlayDefinition, lines[sourceLineNumber]);
      if (overlayError) return { ok: false, asmBody: "", log: overlayError };
      continue;
    }
    if (recordDefinitionLineNumbers.has(sourceLineNumber)) continue;
    const rawLine = lines[sourceLineNumber];
    if (/^rem(?:\s|$)/i.test(rawLine.trim())) {
      addCompilerWarning(`Line ${sourceLineNumber + 1}: 'rem' was removed; use a single-quote comment (')`);
    }
    let line = stripAmyInlineComment(rawLine).trim();
    const internalSourceMarker = line.match(/^debug\s+source\s+marker\s+(\d+)$/i);
    if (internalSourceMarker) {
      body.push(`; @amy-source-line ${internalSourceMarker[1]}`);
      continue;
    }

    const currentVdpR1Classification = classifyVdpR1SemanticStatement(line);
    if (!currentVdpR1Classification) {
      flushBufferedVdpR1PureModifiers();
    }
    {
      const onFrameMatch = line.match(/^on\s+(?:vblank|frame)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (onFrameMatch) {
        if (currentProc || currentFunction) {
          return { ok: false, asmBody: "", log: `on vblank must be declared at top level: ${rawLine}` };
        }
        if (onFrameHook && lowerName(onFrameHook.name) !== lowerName(onFrameMatch[1])) {
          return { ok: false, asmBody: "", log: `Only one on vblank hook is supported. Existing hook: ${onFrameHook.name}; offending line: ${rawLine}` };
        }
        const hookName = onFrameMatch[1];
        onFrameHook = { name: hookName, asmLabel: ensureProcAsmSymbol(hookName) };
        continue;
      }
    }
    {
      const enterMatch = line.match(/^enter\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (enterMatch) {
        const scene = sceneParsing.scenes.find((entry) => lowerName(entry.name) === lowerName(enterMatch[1]));
        if (!scene) return { ok: false, asmBody: "", log: `Unknown scene '${enterMatch[1]}' at line ${sourceLineNumber + 1}` };
        if (currentProc && lowerName(currentProc) !== "start") {
          return { ok: false, asmBody: "", log: `enter ${scene.name} is only valid from mainline in Amy scene v1.` };
        }
        ensureImplicitStartForExecutable();
        body.push("    call AMY_VRAM_BEGIN");
        body.push("    xor a");
        body.push("    ld (AMY_ACTIVE_SCENE),a");
        if (debugScenePoison) body.push("    call AMY_SCENE_DEBUG_POISON");
        body.push(`    call ${ensureProcAsmSymbol(scene.enterRoutine)}`);
        body.push(`    ld a,${scene.value}`);
        body.push("    ld (AMY_ACTIVE_SCENE),a");
        body.push("    call AMY_VRAM_END");
        continue;
      }
    }
    {
      const dataMetaStmt = handleDataMetaStatement({
        line,
        rawLine,
        body,
        state: {
          get inData() { return inData; },
          set inData(value) { inData = value; },
          get inAsm() { return inAsm; },
          set inAsm(value) { inAsm = value; },
          get asmBuffer() { return asmBuffer; },
          set asmBuffer(value) { asmBuffer = value; },
          get selectedMemoryProfile() { return selectedMemoryProfile; },
          set selectedMemoryProfile(value) { selectedMemoryProfile = value; },
          get ramLayout() { return ramLayout; },
          set ramLayout(value) { ramLayout = value; },
          get nextRamAddress() { return nextRamAddress; },
          set nextRamAddress(value) { nextRamAddress = value; },
          get inferredMemoryCaps() { return inferredMemoryCaps; },
          get assets() { return assets; },
          get cartridgeMeta() { return cartridgeMeta; },
          set cartridgeMeta(value) { cartridgeMeta = value; },
          get hasRamOverlay() { return overlayDefinitions.size > 0; },
          resolveAsmInclude: (includePath) => resolveStaticAbiInclude?.(includePath),
          rewriteUserSymbolsInExpression,
          describeGlobalNameCollision
        },
        parseBitmapLine,
        appendBitmapRow,
        appendCharRow,
        looksLikeDataTokens,
        appendDataTokens,
        looksLikeWordDataTokens,
        appendWordDataTokens,
        flushDataBlock,
        ensureAssetAsmSymbol,
        validateGlobalUserName,
        getRamLayout,
        parseCartridgeDirective
      });
      if (dataMetaStmt.handled) {
        if (!dataMetaStmt.ok) return { ok: false, asmBody: "", log: dataMetaStmt.log };
        continue;
      }
    }

    {
      const uploadPicture = line.match(/^upload\s+picture\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+with\s+nmi)?$/i);
      if (uploadPicture) {
        const emitted = emitUploadPicture(uploadPicture[1], rawLine, { keepNmi: /\s+with\s+nmi\s*$/i.test(line) });
        if (!emitted.ok) return { ok: false, asmBody: "", log: emitted.log };
        ensureImplicitStartForExecutable();
        body.push(...emitted.lines);
        continue;
      }

      const showPicture = line.match(/^show\s+picture\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (showPicture) {
        const emitted = emitShowPicture(showPicture[1], rawLine);
        if (!emitted.ok) return { ok: false, asmBody: "", log: emitted.log };
        ensureImplicitStartForExecutable();
        body.push(...emitted.lines);
        continue;
      }
    }

    {
      const tileType = line.match(/^tile\s+type\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i);
      if (tileType) {
        const typeName = tileType[1];
        const collision = validateGlobalUserName(typeName, "tile type", rawLine);
        if (collision) return { ok: false, asmBody: "", log: collision };
        const values = new Set();
        const parts = splitTopLevelArgs(tileType[2]);
        if (!parts.length) return { ok: false, asmBody: "", log: `tile type requires at least one tile value: ${rawLine}` };
        for (const partRaw of parts) {
          const part = normalizeExpression(partRaw.trim());
          const inherited = getTileTypeInfo(part);
          if (inherited) {
            for (const value of inherited.values) values.add(value);
            continue;
          }
          const numeric = tryEvaluateCompileTimeNumericExpression(part);
          if (!Number.isInteger(numeric) || numeric < 0 || numeric > 255) {
            return { ok: false, asmBody: "", log: `tile type '${typeName}' expects byte tile values or existing tile type names: ${rawLine}` };
          }
          values.add(numeric & 0xFF);
        }
        tileTypes.set(typeName, { name: typeName, values: [...values].sort((a, b) => a - b) });
        continue;
      }
    }

    {
      const hitbox = line.match(/^hitbox\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*,\s*(.+?)\s+size\s+(.+?)\s*,\s*(.+)$/i);
      if (hitbox) {
        const hitboxName = hitbox[1];
        const collision = validateGlobalUserName(hitboxName, "hitbox", rawLine);
        if (collision) return { ok: false, asmBody: "", log: collision };
        const x = tryEvaluateCompileTimeNumericExpression(normalizeExpression(hitbox[2]));
        const y = tryEvaluateCompileTimeNumericExpression(normalizeExpression(hitbox[3]));
        const width = tryEvaluateCompileTimeNumericExpression(normalizeExpression(hitbox[4]));
        const height = tryEvaluateCompileTimeNumericExpression(normalizeExpression(hitbox[5]));
        if (![x, y, width, height].every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
          return { ok: false, asmBody: "", log: `hitbox '${hitboxName}' expects byte constants: ${rawLine}` };
        }
        if (width === 0 || height === 0) {
          return { ok: false, asmBody: "", log: `hitbox '${hitboxName}' width and height must be greater than zero: ${rawLine}` };
        }
        hitboxes.set(hitboxName, { name: hitboxName, x: x & 0xFF, y: y & 0xFF, width: width & 0xFF, height: height & 0xFF });
        symbols.add(hitboxName);
        continue;
      }
    }

    {
      const timerDecl = line.match(/^timer\s+([A-Za-z_][A-Za-z0-9_]*)\s+(every|after)\s+(.+?)\s+ticks?(?:\s+(stopped|inactive))?$/i);
      if (timerDecl) {
        if (currentProc || currentFunction) {
          return { ok: false, asmBody: "", log: `timer declarations must be top-level: ${rawLine}` };
        }
        const timerName = timerDecl[1];
        const mode = timerDecl[2].toLowerCase() === "every" ? "repeat" : "once";
        const intervalResult = resolveTimerInterval(timerDecl[3], rawLine);
        if (!intervalResult.ok) return { ok: false, asmBody: "", log: intervalResult.log };
        const initiallyActive = !timerDecl[4];
        const defined = defineAmyTimer(timerName, mode, intervalResult.value, initiallyActive, rawLine);
        if (!defined.ok) return { ok: false, asmBody: "", log: defined.log };
        continue;
      }

      const startStopTimer = line.match(/^(start|stop)\s+timer\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      if (startStopTimer) {
        const timer = getTimerInfo(startStopTimer[2]);
        if (!timer) return { ok: false, asmBody: "", log: `Unknown timer '${startStopTimer[2]}': ${rawLine}` };
        ensureImplicitStartForExecutable();
        body.push(...emitSetTimerBytes(timer, startStopTimer[1].toLowerCase() === "start"));
        continue;
      }
    }

    {
      const declarationStmt = handleDeclarationStatement({
        line,
        rawLine,
        state: {
          body,
          declarations,
          runtimeDeclarations,
          runtimeVars,
          runtimeInit,
          runtimeInitRecords,
          boolPackInits,
          symbols,
          compileTimeConstants,
          rewriteUserSymbolsInExpression,
          get currentProc() { return currentProc; },
          isValidSymbolName,
          isReservedAmyIdentifier,
          describeGlobalNameCollision,
          mapHasInsensitive,
          formatIxOffset,
          get nextBoolBit() { return nextBoolBit; },
          set nextBoolBit(value) { nextBoolBit = value; },
          get boolPackCount() { return boolPackCount; },
          set boolPackCount(value) { boolPackCount = value; },
          get currentBoolPackLabel() { return currentBoolPackLabel; },
          set currentBoolPackLabel(value) { currentBoolPackLabel = value; },
          get currentBoolPackAddress() { return currentBoolPackAddress; },
          set currentBoolPackAddress(value) { currentBoolPackAddress = value; },
          isStaticLocalProcCandidate: (name) => staticLocalProcCandidates.has(name),
          isStaticAbiProcCandidate: (name) => staticAbiProcCandidates.has(name),
          get hasRuntimeRamDeclarations() { return hasRuntimeRamDeclarations; },
          set hasRuntimeRamDeclarations(value) { hasRuntimeRamDeclarations = value; },
          get hasRuntimeInit() { return hasRuntimeInit; },
          set hasRuntimeInit(value) { hasRuntimeInit = value; }
        },
        normalizeExpression,
        validateGlobalUserName,
        isSafeExpression,
        ensureConstAsmSymbol,
        parseAmyDeclarationList,
        isZeroInitializer,
        ensureProcLocalMap,
        lowerName,
        ensureProcFrame,
        emitBcdClear,
        reserveRam,
        ensureUserVarAsmSymbol,
        allocateUserAsmSymbol,
        formatHex16,
        emitRuntimeStore,
        parseRoutineInvocation,
        runtimeTypeSize,
        parseNumericLiteral,
        tryEvaluateCompileTimeNumericExpression,
        emitStoreImmediate32,
        isSupportedSourceTypeName,
        normalizeDeclaredType,
        normalizeRuntimeType,
        isRemovedSourceTypeName,
        canonicalSourceTypeList,
        parseFixedPointLiteral,
        parseFixedPointLiteral32,
        isSupportedRecordTypeName,
        getRecordTypeInfo,
        findConstantZeroDivisor
      });
      if (declarationStmt.handled) {
        if (!declarationStmt.ok) return { ok: false, asmBody: "", log: declarationStmt.log };
        continue;
      }
    }

    {
      const procFunctionStmt = handleProcFunctionStatement({
        line,
        rawLine,
        body,
        state: {
          get currentProc() { return currentProc; },
          set currentProc(value) { currentProc = value; },
          get currentFunction() { return currentFunction; },
          set currentFunction(value) { currentFunction = value; },
          get openedImplicitStart() { return openedImplicitStart; },
          set openedImplicitStart(value) { openedImplicitStart = value; },
          isStaticAbiProcCandidate: (name) => staticAbiProcCandidates.has(name)
        },
        isSupportedSourceTypeName,
        isRemovedSourceTypeName,
        canonicalSourceTypeList,
        emitCurrentProcReturnLines,
        emitCurrentProcReturnLinesIfNeeded,
        bodyAlreadyEndsWith,
        ensureProcAsmSymbol,
        ensureProcFrame,
        procSignatures,
        ensureProcLocalMap,
        functionReturnTypes,
        normalizeRuntimeType,
        normalizeDeclaredType,
        openStartProc,
        addCompilerWarning
      });
      if (procFunctionStmt.handled) {
        if (!procFunctionStmt.ok) return { ok: false, asmBody: "", log: procFunctionStmt.log };
        resetVdpR1SemanticTracking();
        currentGraphicsMode = null;
        continue;
      }
    }

    {
      const includeAsmStmt = line.match(/^include\s+asm\s+"([^"]+)"\s*$/i);
      if (includeAsmStmt) {
        const includePath = includeAsmStmt[1].replace(/\\/g, "/");
        body.push(`include "${includePath}"`);
        continue;
      }
    }

    {
      const callAsmStmt = line.match(/^call\s+asm\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+with\s+(.+))?$/i);
      if (callAsmStmt) {
        const label = callAsmStmt[1];
        const argsText = callAsmStmt[2]?.trim();
        const lines = [];
        const usedRegs = new Set();

        function reserveAsmRegister(reg) {
          const normalized = reg.toLowerCase();
          const pairs = { h: "hl", l: "hl", d: "de", e: "de", b: "bc", c: "bc" };
          if (["hl", "de", "bc"].includes(normalized)) {
            for (const half of normalized) {
              if (usedRegs.has(half)) return `call asm cannot set ${normalized} and ${half} in the same statement.`;
            }
          } else if (pairs[normalized] && usedRegs.has(pairs[normalized])) {
            return `call asm cannot set ${normalized} and ${pairs[normalized]} in the same statement.`;
          }
          usedRegs.add(normalized);
          return null;
        }

        function emitLoadAsmRegister(reg, valueToken) {
          const normalized = reg.toLowerCase();
          const value = valueToken.trim();
          const conflict = reserveAsmRegister(normalized);
          if (conflict) return { ok: false, log: conflict };
          if (["a", "b", "c", "d", "e", "h", "l"].includes(normalized)) {
            const load = emitLoadInt8Into(normalized, value);
            if (!load) return { ok: false, log: `cannot load ${value} into ${normalized} for '${rawLine.trim()}'` };
            return { ok: true, lines: load };
          }
          if (normalized === "hl") {
            let load = null;
            if (/^vram(?:\.|\s+)/i.test(value)) load = emitLoadVramAddressIntoHL(value);
            if (!load) load = emitLoadSourceAddressIntoHL(value);
            if (!load) load = emitLoadInt16IntoHL(value);
            if (!load) return { ok: false, log: `cannot load ${value} into hl for '${rawLine.trim()}'` };
            return { ok: true, lines: load };
          }
          if (normalized === "de") {
            let load = null;
            if (/^vram(?:\.|\s+)/i.test(value)) load = emitLoadVramAddressIntoDE(value);
            if (!load) {
              const hlLoad = emitLoadInt16IntoHL(value) || emitLoadSourceAddressIntoHL(value);
              if (hlLoad) load = [...hlLoad, "    ex de,hl"];
            }
            if (!load) return { ok: false, log: `cannot load ${value} into de for '${rawLine.trim()}'` };
            return { ok: true, lines: load };
          }
          if (normalized === "bc") {
            const load = emitLoadCountIntoBC(value) || emitLoadUnsignedInt16ValueIntoBC(value);
            if (!load) return { ok: false, log: `cannot load ${value} into bc for '${rawLine.trim()}'` };
            return { ok: true, lines: load };
          }
          return { ok: false, log: `unsupported call asm register '${reg}' in '${rawLine.trim()}'` };
        }

        if (argsText) {
          const assignments = argsText.split(/\s*,\s*/).filter(Boolean);
          for (const assignment of assignments) {
            const match = assignment.match(/^(a|b|c|d|e|h|l|hl|de|bc)\s*=\s*(.+)$/i);
            if (!match) {
              return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: invalid call asm argument '${assignment}'` };
            }
            const loaded = emitLoadAsmRegister(match[1], match[2]);
            if (!loaded.ok) return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: ${loaded.log}` };
            lines.push(...loaded.lines);
          }
        }
        lines.push(`    call ${label}`);
        body.push(...lines);
        continue;
      }
    }
    {
      const includeStmt = line.match(/^include\s+"([^"]+)"\s*$/i);
      if (includeStmt) {
        const lastBodyLine = String(body[body.length - 1] || "").trim();
        const bodyEndsWithTerminator = /^(?:ret|reti|retn|(?:jp|jr)\s+[A-Za-z_][A-Za-z0-9_]*)$/i.test(lastBodyLine);
        if (currentProc && currentProc !== "Start" && bodyEndsWithTerminator) {
          currentProc = null;
          currentFunction = null;
        }
        if (currentProc === "Start" && openedImplicitStart) {
          emitCurrentProcReturnLinesIfNeeded();
          currentProc = null;
          currentFunction = null;
          openedImplicitStart = false;
        }
        const includePath = includeStmt[1].replace(/\\/g, "/");
        body.push(`include "${includePath}"`);
        continue;
      }
    }
    ensureImplicitStartForExecutable();

    {
      if (/^end\s+with$/i.test(line)) {
        const alias = recordAliasStack.pop();
        if (!alias) return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: end with without a matching with` };
        runtimeVars.delete(alias.name);
        continue;
      }

      const openRecordAlias = line.match(/^with(\s+each)?\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(.+)\s*\]\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?$/i);
      if (openRecordAlias) {
        const generatedForEach = !!openRecordAlias[1];
        const arrayName = openRecordAlias[2];
        const indexToken = openRecordAlias[3].trim();
        const aliasName = openRecordAlias[4];
        const arrayInfo = getRuntimeInfo(arrayName);
        if (!arrayInfo || arrayInfo.kind !== "record_array") {
          return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: with requires a fixed record array: ${rawLine.trim()}` };
        }
        if (getRuntimeInfo(aliasName) || recordAliasStack.some((entry) => lowerName(entry.name) === lowerName(aliasName))) {
          return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: record alias '${aliasName}' conflicts with an existing name` };
        }
        const staticAliasSafe = currentProc === "Start" || staticLocalProcCandidates.has(currentProc);
        if (!staticAliasSafe && !generatedForEach) {
          return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: with record aliases currently require Start or a proven non-reentrant subroutine` };
        }
        const loadAddress = emitLoadArrayAddressIntoHL(arrayName, indexToken);
        if (!loadAddress) {
          return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: invalid record-array index in ${rawLine.trim()}` };
        }
        const pointerAddress = staticAliasSafe ? reserveRam(`record alias ${aliasName}`, 2, rawLine.trim()) : null;
        if (staticAliasSafe) body.push(...loadAddress, `    ld (${formatHex16(pointerAddress)}),hl`);
        runtimeVars.set(aliasName, {
          kind: "record",
          type: "record",
          declaredType: arrayInfo.recordTypeName,
          recordTypeName: arrayInfo.recordTypeName,
          recordSize: arrayInfo.recordSize,
          storage: staticAliasSafe ? "alias_pointer" : "dynamic_record_alias",
          isAliasPointer: staticAliasSafe,
          isDynamicRecordAlias: !staticAliasSafe,
          aliasArrayName: arrayName,
          aliasIndexToken: indexToken,
          pointerAddress
        });
        recordAliasStack.push({ name: aliasName, pointerAddress });
        continue;
      }
    }

    {
      const displayGraphicsSpriteStmt = handleDisplayGraphicsSpriteStatement({
        line,
        rawLine,
        preferScreenOnNoNmi,
        currentGraphicsMode,
        emitLoadInt8Into,
        emitLoadInt8ValueInto,
        tryEvaluateConstantExpression,
        formatHex16,
        makeGeneratedLabel,
        usesSpriteFlicker
      });
      if (displayGraphicsSpriteStmt.handled) {
        if (!displayGraphicsSpriteStmt.ok) return { ok: false, asmBody: "", log: displayGraphicsSpriteStmt.log };
        if (/^graphics\s+(?:mode\s+3\s+)?multicolor$/i.test(line) || /^graphics\s+mode\s+3$/i.test(line) || /^multicolor\s+screen$/i.test(line)) {
          currentGraphicsMode = "multicolor";
        } else if (/^graphics\s+mode\s+1\s+text$/i.test(line) || /^text\s+screen$/i.test(line)) {
          currentGraphicsMode = "mode1_text";
        } else if (/^graphics\s+mode\s*1(?:\s+color\s+.+)?$/i.test(line) || /^bitmap\s+screen(?:\s+color\s+.+)?$/i.test(line)) {
          currentGraphicsMode = "mode1_bitmap";
        } else if (/^graphics\s+mode\s+2\s+text$/i.test(line)
          || /^mode\s+2\s+screen$/i.test(line)
          || /^graphics\s+mode\s+2\s+screen$/i.test(line)
          || /^tile\s+screen$/i.test(line)) {
          currentGraphicsMode = "mode2_text";
        } else if (/^graphics\s+(?:mode\s+)?bitmap$/i.test(line) || /^graphics\s+mode\s+2\s+bitmap$/i.test(line) || /^picture\s+screen$/i.test(line)) {
          currentGraphicsMode = "mode2_bitmap";
        }
        const vdpR1WarningResult = trackVdpR1SemanticWarning(line, sourceLineNumber + 1);
        if (currentVdpR1Classification?.kind === "authoritative") {
          discardBufferedVdpR1PureModifiersBecauseOfAuthoritative(currentVdpR1Classification.label);
        }
        if (!vdpR1WarningResult?.suppressEmit) {
          if (isBufferableVdpR1PureModifier(currentVdpR1Classification)) {
            bufferedVdpR1PureModifiers = bufferedVdpR1PureModifiers
              .filter((entry) => entry.category !== currentVdpR1Classification.category);
            bufferedVdpR1PureModifiers.push({
              category: currentVdpR1Classification.category,
              label: currentVdpR1Classification.label,
              lineNumber: sourceLineNumber + 1,
              lines: displayGraphicsSpriteStmt.lines
            });
          } else {
            flushBufferedVdpR1PureModifiers();
            body.push(...displayGraphicsSpriteStmt.lines);
          }
        }
        continue;
      }
    }

    {
      const soundSpinnerStmt = handleSoundSpinnerStatement({
        line,
        rawLine,
        emitLoadInt8Into,
        emitLoadInt8ValueInto,
        emitLoadInt16IntoHL,
        tryEvaluateCompileTimeNumericExpression,
        normalizeExpression,
        makeGeneratedLabel,
        resolveAddressSymbol
      });
      if (soundSpinnerStmt.handled) {
        if (!soundSpinnerStmt.ok) return { ok: false, asmBody: "", log: soundSpinnerStmt.log };
        body.push(...soundSpinnerStmt.lines);
        continue;
      }
    }

    {
      const vramTextStmt = handleVramTextStatement({
        line,
        rawLine,
        addCompilerWarning,
        normalizeExpression,
        tryEvaluateConstantExpression,
        resolveAddressSymbol,
        emitLoadVramAddressIntoHL,
        emitLoadVramAddressIntoDE,
        emitLoadSourceAddressIntoHL,
        getWordTableInfo,
        assets,
        getRuntimeInfo,
        getByteArrayBufferInfo,
        emitLoadArrayAddressIntoHL,
        emitLoadCountIntoBC,
        isDefinitelyByteSizedCount,
        runtimeTypeSize,
        symbolOrValue,
        dataLengths,
        dataRecordTables,
        precomputedSprite16Lengths,
        emitDefineCharsToPattern,
        emitDefineColorsToPattern,
        emitLoadInt8ValueInto,
        emitLoadInt8ValueIntoPreserving,
        parseRecordFieldRef,
        emitLoadRecordFieldAddressIntoHL,
        emitLoadInt16IntoHL,
        emitStoreExtended32,
        emitLoadCountIntoDE,
        parseArrayRef,
        emitStoreInt8FromA,
        currentGraphicsMode,
        getTileTypeInfo,
        makeGeneratedLabel
      });
      if (vramTextStmt.handled) {
        if (!vramTextStmt.ok) return { ok: false, asmBody: "", log: vramTextStmt.log };
        body.push(...vramTextStmt.lines);
        continue;
      }
    }

    {
      const printFormatStmt = handlePrintFormatStatement({
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
      });
      if (printFormatStmt.handled) {
        if (!printFormatStmt.ok) return { ok: false, asmBody: "", log: printFormatStmt.log };
        continue;
      }
    }

    const formulaAssignment = parseFormulaAssignment(line);
    const formulaShiftHandledLater = formulaAssignment
      && (formulaAssignment.op === "<<=" || formulaAssignment.op === ">>=")
      && !["int16", "u32", "i32"].includes(resolveValueType(formulaAssignment.target));
    if (formulaAssignment && !formulaShiftHandledLater) {
      const zeroDivisorOp = (formulaAssignment.op === "/=" || formulaAssignment.op === "%=")
        ? (tryEvaluateCompileTimeNumericExpression(formulaAssignment.value) === 0 ? formulaAssignment.op[0] : null)
        : findConstantZeroDivisor(formulaAssignment.value);
      if (zeroDivisorOp) {
        return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: constant ${zeroDivisorOp === "%" ? "modulo" : "division"} by zero: ${rawLine}` };
      }
      const wordTableAssignment = String(formulaAssignment.value || "").trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\[(.+)\]$/);
      if (wordTableAssignment) {
        const table = getWordTableInfo(wordTableAssignment[1]);
        const indexValue = table ? tryEvaluateCompileTimeNumericExpression(wordTableAssignment[2]) : null;
        if (table && Number.isInteger(indexValue) && (indexValue < 0 || indexValue >= table.length)) {
          return { ok: false, asmBody: "", log: `Word table ${wordTableAssignment[1]} index ${indexValue} is out-of-range (0..${table.length - 1}): ${rawLine}` };
        }
      }
      if (formulaAssignment.op === "=") {
        const targetRecord = resolveStaticWholeRecord(formulaAssignment.target);
        const sourceRecord = resolveStaticWholeRecord(formulaAssignment.value);
        if (targetRecord || sourceRecord) {
          if (!targetRecord || !sourceRecord) {
            return { ok: false, asmBody: "", log: `Whole-record assignment requires two compatible record operands: ${rawLine}` };
          }
          if (lowerName(targetRecord.recordTypeName) !== lowerName(sourceRecord.recordTypeName)
            || targetRecord.byteSize !== sourceRecord.byteSize) {
            return {
              ok: false,
              asmBody: "",
              log: `Whole-record assignment type mismatch: ${sourceRecord.recordTypeName} cannot initialize ${targetRecord.recordTypeName}: ${rawLine}`
            };
          }
          const sameStaticAddress = targetRecord.address && sourceRecord.address
            && targetRecord.address === sourceRecord.address;
          if (!sameStaticAddress) {
            if (targetRecord.address && sourceRecord.address) {
              body.push(
                `    ld hl,${sourceRecord.address}`,
                `    ld de,${targetRecord.address}`,
                `    ld bc,${targetRecord.byteSize}`,
                "    ldir"
              );
            } else {
              const sourceLoad = sourceRecord.loadLines || [`    ld hl,${sourceRecord.address}`];
              const targetLoad = targetRecord.loadLines || [`    ld hl,${targetRecord.address}`];
              body.push(...sourceLoad, "    push hl", ...targetLoad, "    ex de,hl", "    pop hl", `    ld bc,${targetRecord.byteSize}`, "    ldir");
            }
          }
          continue;
        }
      }
      const assignmentCode = emitFormulaAssignment(formulaAssignment.target, formulaAssignment.op, formulaAssignment.value);
      if (!assignmentCode) {
        return { ok: false, asmBody: "", log: `Invalid runtime assignment: ${rawLine}` };
      }
      body.push(...assignmentCode);
      continue;
    }

    {
      const vramPixelInputStmt = handleVramPixelInputStatement({
        line,
        rawLine,
        body,
        emitLoadVramAddressIntoHL,
        emitLoadInt8ValueInto,
        emitLoadInt16IntoHL,
        emitStoreInt8FromA,
        resolveValueType,
        emitLoadInt8ValueIntoPreserving,
        getRuntimeInfo,
        emitStoreInt16FromHL,
        makeGeneratedLabel,
        currentGraphicsMode,
        tryEvaluateConstantExpression: tryEvaluateCompileTimeNumericExpression,
        nmiKnownOff: knownVdpR1Value !== null && (knownVdpR1Value & 0x20) === 0
      });
      if (vramPixelInputStmt.handled) {
        if (!vramPixelInputStmt.ok) return { ok: false, asmBody: "", log: vramPixelInputStmt.log };
        continue;
      }
    }

    {
      const dataCursorStmt = handleDataCursorStatement({
        line,
        rawLine,
        ensureDataCursorVar,
        resolveAddressSymbol,
        splitTopLevelArgs,
        resolveValueType,
        parseArrayRef,
        emitLoadArrayAddressIntoHL,
        emitStoreInt8FromA,
        emitStoreInt16FromHL
      });
      if (dataCursorStmt.handled) {
        if (!dataCursorStmt.ok) return { ok: false, asmBody: "", log: dataCursorStmt.log };
        if (dataCursorStmt.sawExplicitRestore) sawExplicitRestore = true;
        body.push(...dataCursorStmt.lines);
        continue;
      }
    }

    {
      const whileStmt = handleWhileStatement({
        line,
        rawLine,
        whileStack,
        makeGeneratedLabel,
        emitConditionalJump: (conditionText, targetLabel, branchWhenFalse, directCondition = false, signedHint = "auto") => {
          if (directCondition) {
            const m = conditionText.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)\s*(==|!=|<=|>=|<|>)\s*([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?|-?\$[0-9A-Fa-f]+|-?[0-9]+)$/i);
            if (!m) return { ok: false, lines: [] };
            return emitCompareGoto(m[1], m[2], m[3], targetLabel, branchWhenFalse, signedHint);
          }
          return emitConditionalJump(conditionText, targetLabel, branchWhenFalse);
        }
      });
      if (whileStmt.handled) {
        if (!whileStmt.ok) return { ok: false, asmBody: "", log: whileStmt.log };
        resetVdpR1SemanticTracking();
        body.push(...whileStmt.lines);
        continue;
      }
    }

    const compileInlineStatement = createInlineStatementCompiler({
      currentFunctionRef: () => currentFunction,
      doStack,
      whileStack,
      forStack,
      normalizeExpression,
      emitCurrentProcReturnLines,
      emitLoadInt8Into,
      emitLoadInt16IntoHL,
      emitStoreExtended32,
      emitStoreWideExpression,
      parseFormulaAssignment,
      emitFormulaAssignment,
      emitTextLiteral,
      emitLoadInt8ValueInto,
      tryEvaluateByteConstantExpression,
      formatHex16,
      splitTopLevelArgs,
      emitPrintAtDense,
      emitPrintAutoAt,
      isKnownProcedureStatementName,
      procSignatures,
      emitRoutineArgumentPushes,
      resolveJumpTarget,
      emitAdjustSpBy,
      resolveSourceJumpTarget,
      formatUnknownJumpTargetLog,
      emitClearValue,
      resolveValueType,
      emitU32Inc,
      emitArith32Op,
      emitStoreInt8FromA,
      emitStoreInt16FromHL,
      getRuntimeInfo,
      getByteArrayBufferInfo,
      dataLengths,
      emitLoadSourceAddressIntoHL,
      emitLoadArrayAddressIntoHL,
      emitLoadCountIntoBC,
      isDefinitelyByteSizedCount,
      ensureCompareScratch32,
      ensureFp5ReturnScratch,
      emitLoadFp5SourceToFpa,
      emitBcdAdd,
      emitBcdSub,
      emitArithInt8Op,
      emitArithInt16Op
    });

    {
      const inlineTimerIf = line.match(/^if\s+timer\s+([A-Za-z_][A-Za-z0-9_]*)\s+then\s+(.+)$/i);
      if (inlineTimerIf) {
        const inlineTail = inlineTimerIf[2].trim();
        const inlineResult = compileInlineStatement(inlineTail, rawLine);
        if (!inlineResult.ok) return { ok: false, asmBody: "", log: inlineResult.log };
        const falseLabel = makeGeneratedLabel("TimerFalse");
        const code = emitTimerTestAndConsume(inlineTimerIf[1], falseLabel, rawLine);
        if (!code.ok) return { ok: false, asmBody: "", log: code.log };
        body.push(...code.lines, ...inlineResult.lines, `${falseLabel}:`);
        continue;
      }

      const blockTimerIf = line.match(/^if\s+timer\s+([A-Za-z_][A-Za-z0-9_]*)\s+then$/i);
      if (blockTimerIf) {
        const falseLabel = makeGeneratedLabel("TimerFalse");
        const endLabel = makeGeneratedLabel("TimerEnd");
        const code = emitTimerTestAndConsume(blockTimerIf[1], falseLabel, rawLine);
        if (!code.ok) return { ok: false, asmBody: "", log: code.log };
        ifStack.push({ falseLabel, endLabel, hasElse: false, hasEndJump: false });
        body.push(...code.lines);
        continue;
      }
    }

    {
      const ifStmt = handleIfStatement({
        line,
        rawLine,
        body,
        ifStack,
        splitTopLevelKeyword,
        compileInlineStatement,
        makeGeneratedLabel,
        emitConditionalJump
      });
      if (ifStmt.handled) {
        if (!ifStmt.ok) return { ok: false, asmBody: "", log: ifStmt.log };
        resetVdpR1SemanticTracking();
        body.push(...ifStmt.lines);
        continue;
      }
    }

    {
      const doStmt = handleDoStatement({
        line,
        rawLine,
        doStack,
        makeGeneratedLabel,
        emitConditionalJump
      });
      if (doStmt.handled) {
        if (!doStmt.ok) return { ok: false, asmBody: "", log: doStmt.log };
        resetVdpR1SemanticTracking();
        body.push(...doStmt.lines);
        continue;
      }
    }

    {
      const selectStmt = handleSelectCaseStatement({
        line,
        rawLine,
        selectStack,
        normalizeExpression,
        splitTopLevelArgs,
        makeGeneratedLabel,
        emitCompareGoto,
        getTileTypeInfo,
        emitSelectCaseEqGoto
      });
      if (selectStmt.handled) {
        if (!selectStmt.ok) return { ok: false, asmBody: "", log: selectStmt.log };
        resetVdpR1SemanticTracking();
        body.push(...selectStmt.lines);
        continue;
      }
    }

    {
      const forStmt = handleForStatement({
        line,
        rawLine,
        forStack,
        getRuntimeInfo,
        parseRecordFieldRef,
        emitRuntimeStore,
        normalizeExpression,
        makeGeneratedLabel,
        analyzeForStep,
        tryEvaluateCompileTimeNumericExpression,
        normalizeDeclaredType,
        resolveDeclaredValueType,
        emitCompareGoto,
        isSignedDeclaredType,
        emitLoadInt8Into,
        emitStoreInt8FromA,
        emitLoadInt16IntoHL,
        emitStoreInt16FromHL,
        isAnyFixedDeclaredType
      });
      if (forStmt.handled) {
        if (!forStmt.ok) return { ok: false, asmBody: "", log: forStmt.log };
        resetVdpR1SemanticTracking();
        body.push(...forStmt.lines);
        continue;
      }
    }

    {
      const randomBounceStmt = handleRandomBounceStatement({
        line,
        rawLine,
        getRuntimeInfo,
        emitRandomBetweenInto,
        emitRandomFx16Into,
        emitRandomFp5Into,
        scopedRuntimeName,
        makeGeneratedLabel,
        emitLoadInt8Into,
        emitStoreInt8FromA
      });
      if (randomBounceStmt.handled) {
        if (!randomBounceStmt.ok) return { ok: false, asmBody: "", log: randomBounceStmt.log };
        body.push(...randomBounceStmt.lines);
        continue;
      }
    }

    {
      const specialIfGotoStmt = handleSpecialIfGotoStatement({
        line,
        rawLine,
        resolveSourceJumpTarget,
        formatUnknownJumpTargetLog,
        emitConditionalJump,
        normalizeExpression,
        getRuntimeInfo,
        emitLoadInt8Into
      });
      if (specialIfGotoStmt.handled) {
        if (!specialIfGotoStmt.ok) return { ok: false, asmBody: "", log: specialIfGotoStmt.log };
        resetVdpR1SemanticTracking();
        body.push(...specialIfGotoStmt.lines);
        continue;
      }
    }

    {
      const dispatchLabelStmt = handleDispatchLabelStatement({
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
      });
      if (dispatchLabelStmt.handled) {
        if (!dispatchLabelStmt.ok) return { ok: false, asmBody: "", log: dispatchLabelStmt.log };
        resetVdpR1SemanticTracking();
        body.push(...dispatchLabelStmt.lines);
        continue;
      }
    }

    {
      const routineStmt = handleRoutineStatement({
        line,
        rawLine,
        body,
        normalizeExpression,
        parseRoutineInvocation,
        resolveValueType,
        isSafeExpression,
        emitRuntimeStore,
        currentFunction,
        emitCurrentProcReturnLines,
        emitLoadInt8Into,
        emitLoadInt16IntoHL,
        emitStoreExtended32,
        emitStoreWideExpression,
        ensureCompareScratch32,
        ensureFp5ReturnScratch,
        emitLoadFp5SourceToFpa,
        makeGeneratedLabel,
        isKnownProcedureStatementName,
        procSignatures,
        splitTopLevelArgs,
        emitRoutineArgumentPushes,
        resolveJumpTarget,
        emitAdjustSpBy
      });
      if (routineStmt.handled) {
        if (!routineStmt.ok) return { ok: false, asmBody: "", log: routineStmt.log };
        if (currentFunction && /^return\s+.+$/i.test(line)
          && !ifStack.length && !whileStack.length && !doStack.length && !forStack.length && !selectStack.length) {
          currentProc = null;
          currentFunction = null;
        }
        resetVdpR1SemanticTracking();
        continue;
      }
    }

    {
      const mutateStmt = handleMutateStatement({
        line,
        rawLine,
        parseArrayRef,
        parseRecordFieldRef,
        getRuntimeInfo,
        resolveValueType,
        scopedRuntimeName,
        emitLoadArrayAddressIntoHL,
        ensureCompareScratch32,
        emitStoreExtended32,
        emitStoreMemory32ToTarget,
        makeGeneratedLabel,
        formatIxOffset,
        emitU32Inc,
        emitArith32Op,
        emitFx16ArithOp,
        emitLoadInt16IntoHL,
        emitStoreInt16FromHL,
        normalizeExpression,
        emitBcdAdd,
        emitBcdSub,
        emitArithInt8Op,
        emitArithInt16Op,
        emitShiftVar,
        emitShiftVarByN,
        emitLoadInt8Into,
        emitStoreInt8FromA
      });
      if (mutateStmt.handled) {
        if (!mutateStmt.ok) return { ok: false, asmBody: "", log: mutateStmt.log };
        body.push(...mutateStmt.lines);
        continue;
      }
    }

    {
      const mathBitStmt = handleMathBitStatement({
        line,
        rawLine,
        resolveValueType,
        emitMultiplyInt8Op,
        emitMultiplyInt16Op,
        emitDivideInt8Op,
        getRuntimeInfo,
        makeGeneratedLabel,
        emitLoadInt8Into,
        emitStoreInt8FromA,
        emitLoadInt16IntoHL,
        emitStoreInt16FromHL,
        formatIxOffset,
        scopedRuntimeName,
        runtimeTypeSize
      });
      if (mathBitStmt.handled) {
        if (!mathBitStmt.ok) return { ok: false, asmBody: "", log: mathBitStmt.log };
        body.push(...mathBitStmt.lines);
        continue;
      }
    }

    {
      const arrayBulkStmt = handleArrayBulkStatement({
        line,
        rawLine,
        getRuntimeInfo,
        runtimeTypeSize,
        symbolOrValue,
        emitLoadInt8Into,
        emitLoadInt8ValueInto,
        emitLoadArrayAddressIntoHL,
        emitStoreInt8FromA,
        makeGeneratedLabel,
        getTileTypeInfo,
        getRecordTypeInfo
      });
      if (arrayBulkStmt.handled) {
        if (!arrayBulkStmt.ok) return { ok: false, asmBody: "", log: arrayBulkStmt.log };
        body.push(...arrayBulkStmt.lines);
        continue;
      }
    }

    {
      const includeStmt = line.match(/^include\s+"([^"]+)"\s*$/i);
      if (includeStmt) {
        const includePath = includeStmt[1].replace(/\\/g, "/");
        body.push(`include "${includePath}"`);
        continue;
      }
    }

    return { ok: false, asmBody: "", log: `Line ${sourceLineNumber + 1}: unknown statement: ${rawLine}` };
  }

  if (recordAliasStack.length) {
    return { ok: false, asmBody: "", log: `with ${recordAliasStack[recordAliasStack.length - 1].name} is missing end with` };
  }

  flushBufferedVdpR1PureModifiers();

  if (sceneParsing.scenes.length && onFrameHook) {
    return { ok: false, asmBody: "", log: "Amy scenes own the single on frame hook; remove the separate top-level on frame declaration." };
  }

  for (const scene of sceneParsing.scenes) {
    for (const [role, routineName] of [["on enter", scene.enterRoutine], ["on frame", scene.frameRoutine]]) {
      const routineLower = lowerName(routineName);
      if ([...functionReturnTypes.keys()].some((name) => lowerName(name) === routineLower)) {
        return { ok: false, asmBody: "", log: `Scene '${scene.name}' ${role} must target a subroutine, not a function.` };
      }
      const signatureEntry = [...procSignatures.entries()].find(([name]) => lowerName(name) === routineLower);
      const hasSub = lines.some((candidateRaw) => {
        const candidate = stripAmyInlineComment(candidateRaw).trim();
        const match = candidate.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\([^)]*\)|\s*:)?\s*$/i);
        return match && lowerName(match[1]) === routineLower;
      });
      if (!hasSub) {
        return { ok: false, asmBody: "", log: `Scene '${scene.name}' ${role} target '${routineName}' was not found.` };
      }
      if (signatureEntry?.[1]?.length) {
        return { ok: false, asmBody: "", log: `Scene '${scene.name}' ${role} target '${routineName}' must not have parameters.` };
      }
    }
  }

  if (onFrameHook) {
    const hookLower = lowerName(onFrameHook.name);
    const functionMatch = [...functionReturnTypes.keys()].some((name) => lowerName(name) === hookLower);
    if (functionMatch) {
      return { ok: false, asmBody: "", log: `on frame '${onFrameHook.name}' must target a subroutine, not a function.` };
    }
    const signatureEntry = [...procSignatures.entries()].find(([name]) => lowerName(name) === hookLower);
    if (signatureEntry && signatureEntry[1]?.length) {
      return { ok: false, asmBody: "", log: `on frame '${onFrameHook.name}' must target a subroutine without parameters.` };
    }
    const hasBareSub = lines.some((candidateRaw) => {
      const candidate = stripAmyInlineComment(candidateRaw).trim();
      const match = candidate.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*$/i);
      return match && lowerName(match[1]) === hookLower;
    });
    if (!hasBareSub) {
      return { ok: false, asmBody: "", log: `on frame hook target '${onFrameHook.name}' was not found as a parameterless subroutine.` };
    }
  }

  for (const [name, params] of staticAbiParams) {
    for (const param of params) {
      const info = runtimeVars.get(param.mangledName);
      if (!info || Number.isInteger(info.address)) continue;
      const address = reserveRam(`${name}.${param.name}`, runtimeTypeSize(param.type), `static ABI parameter ${name}.${param.name}`);
      info.address = address;
      param.address = address;
      runtimeDeclarations.push(`${param.asmName} EQU ${formatHex16(address)}`);
      hasRuntimeRamDeclarations = true;
    }
  }

  const staticAbiRoutineKeys = new Set([...staticAbiProcCandidates].map((name) => lowerName(name)));
  const staticAbiParamBytes = [...staticAbiParams.values()]
    .flat()
    .reduce((total, param) => total + runtimeTypeSize(param.type), 0);
  const staticAbiLocalBytes = [...runtimeVars.values()]
    .filter((info) => info?.storage === "static"
      && /^AMY_LVAR_/i.test(info.asmName || "")
      && staticAbiRoutineKeys.has(lowerName(info.scope || "")))
    .reduce((total, info) => total + runtimeTypeSize(info.type), 0);
  const staticAbiRamUsage = {
    routineCount: staticAbiProcCandidates.size,
    parameterBytes: staticAbiParamBytes,
    localBytes: staticAbiLocalBytes,
    totalBytes: staticAbiParamBytes + staticAbiLocalBytes
  };

  if (sceneParsing.scenes.length) {
    const analysis = analyzeStaticAbiEligibility(lines, { resolveInclude: resolveStaticAbiInclude });
    const enterUnsafe = /^(?:wait\b|pause\b|nmi\s+on\b|screen\s+on\b)/i;
    const frameUnsafe = /^(?:wait\b|pause\b|nmi\b|screen\b|display\b|enter\b)/i;
    const routineSceneOwners = new Map();
    const markSceneOwnership = (rootName, scene) => {
      const visited = new Set();
      const visit = (key) => {
        if (visited.has(key)) return;
        visited.add(key);
        if (!routineSceneOwners.has(key)) routineSceneOwners.set(key, new Set());
        routineSceneOwners.get(key).add(lowerName(scene.partName));
        for (const next of analysis.graph.get(key) || []) visit(next);
      };
      visit(lowerName(rootName));
    };
    for (const scene of sceneParsing.scenes) {
      markSceneOwnership(scene.enterRoutine, scene);
      markSceneOwnership(scene.frameRoutine, scene);
    }
    for (const scene of sceneParsing.scenes) {
      const inspectPath = (rootName, unsafePattern) => {
        const visited = new Set();
        const inspect = (key) => {
          if (visited.has(key)) return null;
          visited.add(key);
          const routine = analysis.routines.get(key);
          if (!routine) return `unknown routine '${key}'`;
          if (routine.asm.length) return `inline ASM in '${routine.name}'`;
          const blockedLine = routine.body.find((candidate) => unsafePattern.test(candidate));
          if (blockedLine) return `'${blockedLine}' in '${routine.name}'`;
          for (const next of analysis.graph.get(key) || []) {
            const reason = inspect(next);
            if (reason) return reason;
          }
          return null;
        };
        return inspect(lowerName(rootName));
      };
      const enterReason = inspectPath(scene.enterRoutine, enterUnsafe);
      if (enterReason) return { ok: false, asmBody: "", log: `Scene '${scene.name}' on enter path is not NMI-safe: ${enterReason}.` };
      const frameReason = inspectPath(scene.frameRoutine, frameUnsafe);
      if (frameReason) return { ok: false, asmBody: "", log: `Scene '${scene.name}' on frame path is not NMI-safe: ${frameReason}.` };
    }

    const overlayAccess = new RegExp(`\\b${sceneParsing.overlayName}\\.([A-Za-z_][A-Za-z0-9_]*)\\.`, "ig");
    for (const routine of analysis.routines.values()) {
      const referencedParts = new Set();
      for (const statement of routine.body) {
        overlayAccess.lastIndex = 0;
        for (const match of statement.matchAll(overlayAccess)) referencedParts.add(lowerName(match[1]));
      }
      if (!referencedParts.size) continue;
      const owners = routineSceneOwners.get(routine.key) || new Set();
      if (owners.size !== 1) {
        const ownership = owners.size ? [...owners].join(", ") : "no scene";
        return {
          ok: false,
          asmBody: "",
          log: `Routine '${routine.name}' accesses scene overlay storage but is reachable from ${ownership}; scene-owned overlay access requires exactly one owning scene.`
        };
      }
      const [owner] = owners;
      for (const referencedPart of referencedParts) {
        if (referencedPart !== owner) {
          return {
            ok: false,
            asmBody: "",
            log: `Routine '${routine.name}' belongs to scene '${owner}' but accesses overlay part '${referencedPart}'.`
          };
        }
      }
    }

    const dispatcherLabel = "AMY_SCENE_FRAME_DISPATCH";
    body.push(`${dispatcherLabel}:`);
    body.push("    ld a,(AMY_ACTIVE_SCENE)");
    for (const scene of sceneParsing.scenes) {
      body.push("    dec a");
      body.push(`    jp z,AMY_SCENE_FRAME_${scene.value}`);
    }
    body.push("    ret");
    for (const scene of sceneParsing.scenes) {
      body.push(`AMY_SCENE_FRAME_${scene.value}:`);
      body.push(`    jp ${ensureProcAsmSymbol(scene.frameRoutine)}`);
    }
    onFrameHook = { name: "Scenes", asmLabel: dispatcherLabel, generated: true };

    if (debugScenePoison) {
      const layout = overlayLayouts.find((entry) => lowerName(entry.name) === lowerName(sceneParsing.overlayName));
      if (!layout) return { ok: false, asmBody: "", log: `Scene debug poison cannot resolve overlay '${sceneParsing.overlayName}'.` };
      body.push("AMY_SCENE_DEBUG_POISON:");
      body.push(`    ld hl,${formatHex16(layout.address)}`);
      body.push("    ld (hl),$CD");
      if (layout.reservedBytes > 1) {
        body.push(`    ld de,${formatHex16(layout.address + 1)}`);
        body.push(`    ld bc,${layout.reservedBytes - 1}`);
        body.push("    ldir");
      }
      body.push("    ret");
    }
  }

  for (const binding of stateMachineLowering.overlayBindings.values()) {
    const layout = overlayLayouts.find((entry) => lowerName(entry.name) === lowerName(binding.overlayName));
    if (!layout) {
      return { ok: false, asmBody: "", log: `Active-part binding at line ${binding.line} references unknown overlay '${binding.overlayName}'.` };
    }
    let selector = getRuntimeInfo(binding.selectorName);
    if (!selector && binding.internalSelector) {
      const address = reserveRam("active scene", 1, "implicit scene active selector");
      selector = { type: "int8", declaredType: "u8", kind: "int8", address, scope: "global", asmName: "AMY_ACTIVE_SCENE", internal: true };
      runtimeVars.set(binding.selectorName, selector);
      runtimeDeclarations.push(`AMY_ACTIVE_SCENE EQU ${formatHex16(address)}`);
      hasRuntimeRamDeclarations = true;
    }
    if (!selector || selector.declaredType !== "u8" || selector.scope !== "global" || !Number.isInteger(selector.address)) {
      return { ok: false, asmBody: "", log: `Overlay '${layout.name}' active-part selector '${binding.selectorName}' must be a global u8 variable.` };
    }
    for (const part of layout.parts) {
      const state = binding.machine.states.get(lowerName(part.name));
      if (!state) {
        return { ok: false, asmBody: "", log: `Overlay part '${layout.name}.${part.name}' has no matching state '${binding.machine.name}.${part.name}'.` };
      }
      part.activeWhen = { symbol: selector.asmName, equals: state.value };
      for (const field of part.fields) field.activeWhen = { ...part.activeWhen };
    }
    layout.activeBinding = {
      selectorName: binding.selectorName,
      symbol: selector.asmName,
      machineName: binding.machine.name
    };
    if (binding.internalSelector) layout.scenes = sceneParsing.scenes.map((scene) => ({ ...scene }));
  }

  return finalizeAmyTranspile({
    state: {
      inAsm,
      whileStack,
      doStack,
      forStack,
      selectStack,
      ifStack,
      currentFunction,
      get currentProc() { return currentProc; },
      set currentProc(value) { currentProc = value; },
      set currentFunction(value) { currentFunction = value; },
      dataCursorName,
      sawExplicitRestore,
      dataBlocks,
      procFrames,
      boolPackInits,
      hasRuntimeInit,
      startRuntimeInitInsertIndex,
      runtimeInit,
      runtimeInitRecords,
      compilerWarnings,
      declarations,
      runtimeDeclarations,
      body,
      textData,
      romData,
      assets,
      cartridgeMeta,
      onFrameHook,
      amyTimers,
      hasExternalAsmInclude,
      nextRamAddress,
      overlayLayouts,
      ramLayout,
      runtimeVars,
      boolPackCount,
      staticAbiRamUsage,
      needsNumericPostprocessHelpers,
      needsNumericPostprocessWidthHelper,
      needsFp5FriendlyFormatHelper,
      numericPadCharName,
      numericDigitBaseName,
      fp5FriendlyFirstIntName,
      fp5FriendlyDotName,
      fp5FriendlyLastFracName
    },
    helpers: {
      emitCurrentProcReturnLines,
      bodyAlreadyEndsWith,
      emitCurrentProcReturnLinesIfNeeded,
      flushDataBlock,
      resolveAddressSymbol,
      formatHex16,
      openStartProc,
      inlineSingleCallUserProcedures,
      simplifyStartTailForeverGoto,
      removeDeadReturnsAfterJumps,
      optimizeTransientDrawCoordinateTemps,
      optimizeSharedRecordPutCharLoads,
      optimizeSequentialAbsoluteByteStores,
      optimizeRedundantImmediateLoads,
      optimizeRepeatedBitTestLoads
    }
  });
}
