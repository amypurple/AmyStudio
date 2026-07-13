import { checkDataDeprecation } from "./deprecations.js";

export function handleDataMetaStatement({
  line,
  rawLine,
  body,
  state,
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
}) {
  const typeAliasMatch = line.match(/^define\s+([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (typeAliasMatch) {
    return { handled: true, ok: true };
  }

  if (state.inData) {
    if (!line || line.startsWith(";") || line.startsWith("'")) {
      return { handled: true, ok: true };
    }
    const _depData = checkDataDeprecation(line, rawLine);
    if (_depData.handled) return _depData;
    if (/^end\s+data$/i.test(line)) {
      try {
        flushDataBlock();
      } catch (error) {
        return { handled: true, ok: false, log: String(error.message || error) };
      }
      return { handled: true, ok: true };
    }
    if (state.inData.layout === "words") {
      if (looksLikeWordDataTokens(line)) {
        try {
          appendWordDataTokens(state.inData, line, rawLine.trim());
        } catch (error) {
          return { handled: true, ok: false, log: String(error.message || error) };
        }
        return { handled: true, ok: true };
      }
      try {
        flushDataBlock();
      } catch (error) {
        return { handled: true, ok: false, log: String(error.message || error) };
      }
    }
  }

  if (state.inData) {
    const bitmapRow = parseBitmapLine(line);
    if (bitmapRow !== null) {
      try {
        if (state.inData.layout === "chars") {
          appendCharRow(state.inData, bitmapRow, rawLine.trim());
          return { handled: true, ok: true };
        }
        appendBitmapRow(state.inData, bitmapRow, rawLine.trim());
      } catch (error) {
        return { handled: true, ok: false, log: String(error.message || error) };
      }
      return { handled: true, ok: true };
    }
    if (looksLikeDataTokens(line)) {
      try {
        appendDataTokens(state.inData, line, rawLine.trim());
      } catch (error) {
        return { handled: true, ok: false, log: String(error.message || error) };
      }
      return { handled: true, ok: true };
    }
    try {
      flushDataBlock();
    } catch (error) {
      return { handled: true, ok: false, log: String(error.message || error) };
    }
  }

  if (!line || line.startsWith(";") || line.startsWith("'")) {
    return { handled: true, ok: true };
  }

  if (state.inAsm) {
    if (line === "}") {
      body.push(...state.asmBuffer);
      state.asmBuffer = [];
      state.inAsm = false;
    } else {
      state.asmBuffer = [...state.asmBuffer, state.rewriteUserSymbolsInExpression(rawLine.replace(/^  /, ""))];
    }
    return { handled: true, ok: true };
  }

  if (/^asm\s*\{$/i.test(line)) {
    state.inAsm = true;
    return { handled: true, ok: true };
  }

  const includeAsm = line.match(/^include\s+asm\s+"([^"]+)"$/i);
  if (includeAsm) {
    const includePath = includeAsm[1].replace(/\\/g, "/");
    body.push(`include "${includePath}"`);
    return { handled: true, ok: true };
  }

  const includeRawAsm = line.match(/^include\s+"([^"]+\.(?:asm|inc|s))"$/i);
  if (includeRawAsm) {
    const includePath = includeRawAsm[1].replace(/\\/g, "/");
    body.push(`include "${includePath}"`);
    return { handled: true, ok: true };
  }

  const asset = line.match(/^asset\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+"([^"]+)"(?:\s+codec\s+([A-Za-z0-9_]+))?/i);
  if (asset) {
    ensureAssetAsmSymbol(asset[1]);
    state.assets.push({ name: asset[1], path: asset[2], codec: (asset[3] || "raw").toLowerCase() });
    return { handled: true, ok: true };
  }

  const dataColon = line.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+bytes\s*:\s*(.+)$/i);
  if (dataColon) {
    return {
      handled: true,
      ok: false,
      log: `Use 'data ${dataColon[1]} bytes ${dataColon[2]}' or 'data ${dataColon[1]} bytes = ${dataColon[2]}'. Amy keeps ':' for labels.`
    };
  }

  const dataInline = line.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+bytes(?:\s*=\s*|\s+)(.+)$/i);
  if (dataInline) {
    const name = dataInline[1];
    const nameError = validateGlobalUserName(name, "Data block", rawLine);
    if (nameError) return { handled: true, ok: false, log: nameError };
    const block = { name, values: [] };
    try {
      appendDataTokens(block, dataInline[2], rawLine.trim());
    } catch (error) {
      return { handled: true, ok: false, log: String(error.message || error) };
    }
    state.inData = block;
    return { handled: true, ok: true };
  }

  const dataWordsStart = line.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+words$/i);
  if (dataWordsStart) {
    const name = dataWordsStart[1];
    const nameError = validateGlobalUserName(name, "Word table", rawLine);
    if (nameError) return { handled: true, ok: false, log: nameError };
    state.inData = { name, values: [], layout: "words" };
    return { handled: true, ok: true };
  }

  const dataWordsInline = line.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+words(?:\s*=\s*|\s+)(.+)$/i);
  if (dataWordsInline) {
    const name = dataWordsInline[1];
    const nameError = validateGlobalUserName(name, "Word table", rawLine);
    if (nameError) return { handled: true, ok: false, log: nameError };
    const block = { name, values: [], layout: "words" };
    try {
      appendWordDataTokens(block, dataWordsInline[2], rawLine.trim());
    } catch (error) {
      return { handled: true, ok: false, log: String(error.message || error) };
    }
    state.inData = block;
    return { handled: true, ok: true };
  }

  const dataBitmapStart = line.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+(bitmap8|sprite16|chars)$/i);
  if (dataBitmapStart) {
    const name = dataBitmapStart[1];
    const nameError = validateGlobalUserName(name, "Data block", rawLine);
    if (nameError) return { handled: true, ok: false, log: nameError };
    state.inData = { name, values: [], layout: dataBitmapStart[2].toLowerCase(), leftRows: [], rightRows: [] };
    return { handled: true, ok: true };
  }

  const dataStart = line.match(/^data\s+([A-Za-z_][A-Za-z0-9_]*)\s+bytes$/i);
  if (dataStart) {
    const name = dataStart[1];
    const nameError = validateGlobalUserName(name, "Data block", rawLine);
    if (nameError) return { handled: true, ok: false, log: nameError };
    state.inData = { name, values: [], layout: "bytes", leftRows: [], rightRows: [] };
    return { handled: true, ok: true };
  }

  const memoryDecl = line.match(/^memory\s+"([^"]+)"$/i);
  if (memoryDecl) {
    state.selectedMemoryProfile = memoryDecl[1];
    state.ramLayout = getRamLayout(state.selectedMemoryProfile, state.inferredMemoryCaps);
    if (!state.ramLayout) {
      return { handled: true, ok: false, log: `Unknown memory profile: ${state.selectedMemoryProfile}` };
    }
    state.nextRamAddress = state.ramLayout.userRamStart;
    return { handled: true, ok: true };
  }

  const cartridgeDecl = line.match(/^cartridge\s+"([^"]+)"$/i);
  if (cartridgeDecl) {
    try {
      state.cartridgeMeta = parseCartridgeDirective(cartridgeDecl[1], rawLine);
    } catch (error) {
      return { handled: true, ok: false, log: String(error.message || error) };
    }
    return { handled: true, ok: true };
  }

  return { handled: false, line };
}
