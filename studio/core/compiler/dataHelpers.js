export function createDataHelpers(ctx) {
  const {
    tryEvaluateConstantExpression,
    ensureDataAsmSymbol,
    rewriteUserSymbolsInExpression,
    dataLengths,
    dataBlocks,
    romData,
    getInData,
    setInData
  } = ctx;

  function normalizeDataToken(token) {
    const trimmed = token.trim();
    if (!trimmed) return null;
    if (/^\$[0-9A-Fa-f]+$/.test(trimmed)) return trimmed.toUpperCase();
    if (/^0x[0-9A-Fa-f]+$/i.test(trimmed)) return `$${trimmed.slice(2).toUpperCase()}`;
    if (/^-?[0-9]+$/.test(trimmed)) return trimmed;
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) return trimmed;
    return false;
  }

  function parseBitmapLine(line) {
    const match = String(line).trim().match(/^(?:bitmap\s+)?\"([^\"]+)\"$/i);
    return match ? match[1] : null;
  }

  function bitmapCharToBit(ch) {
    return ch === "0" || ch === "_" || ch === " " || ch === "." ? 0 : 1;
  }

  function encodeBitmap8Row(rowText, rawLine) {
    if (rowText.length !== 8) throw new Error(`BITMAP row must be 8 pixels for bitmap8 data: ${rawLine}`);
    let value = 0;
    for (let index = 0; index < 8; index++) {
      if (bitmapCharToBit(rowText[index])) value |= 0x80 >> index;
    }
    return `$${value.toString(16).toUpperCase().padStart(2, "0")}`;
  }

  function encodeSprite16Row(rowText, rawLine) {
    if (rowText.length !== 16) throw new Error(`BITMAP row must be 16 pixels for sprite16 data: ${rawLine}`);
    let value = 0;
    for (let index = 0; index < 16; index++) {
      if (bitmapCharToBit(rowText[index])) value |= 0x8000 >> index;
    }
    return {
      left: `$${((value >> 8) & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`,
      right: `$${(value & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`
    };
  }

  function appendBitmapRow(block, rowText, rawLine) {
    if (block.layout === "bitmap8") {
      block.values.push(encodeBitmap8Row(rowText, rawLine));
      return;
    }
    if (block.layout === "sprite16") {
      const encoded = encodeSprite16Row(rowText, rawLine);
      block.leftRows.push(encoded.left);
      block.rightRows.push(encoded.right);
      return;
    }
    throw new Error(`BITMAP rows require a bitmap-enabled data block: ${rawLine}`);
  }

  function encodeCharEscape(token, rawLine) {
    const normalized = String(token || "").trim().replace(/^byte\s*:\s*/i, "");
    if (!normalized) throw new Error(`Empty character data escape: ${rawLine}`);
    const value = tryEvaluateConstantExpression(normalized);
    if (Number.isInteger(value) && value >= 0 && value <= 0xFF) {
      return formatDataByteLiteral(value);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
      return normalized;
    }
    if (Number.isInteger(value)) {
      throw new Error(`Character data escape must resolve to one byte: {${token}} in ${rawLine}`);
    }
    throw new Error(`Character data escape must be a byte literal or constant: {${token}} in ${rawLine}`);
  }

  function encodeCharRow(rowText, rawLine) {
    const out = [];
    for (let index = 0; index < rowText.length; index += 1) {
      if (rowText[index] === "{" && rowText[index + 1] === "{") {
        out.push(formatDataByteLiteral("{".charCodeAt(0)));
        index += 1;
        continue;
      }
      if (rowText[index] === "}" && rowText[index + 1] === "}") {
        out.push(formatDataByteLiteral("}".charCodeAt(0)));
        index += 1;
        continue;
      }
      if (rowText[index] === "{") {
        const end = rowText.indexOf("}", index + 1);
        if (end < 0) throw new Error(`Unclosed character data escape: ${rawLine}`);
        out.push(encodeCharEscape(rowText.slice(index + 1, end), rawLine));
        index = end;
        continue;
      }
      const value = rowText.charCodeAt(index);
      if (value < 0 || value > 0xFF) throw new Error(`Character data only supports byte-sized character codes: ${rawLine}`);
      out.push(formatDataByteLiteral(value));
    }
    return out;
  }

  function appendCharRow(block, rowText, rawLine) {
    if (block.layout !== "chars") throw new Error(`Text rows require a chars data block.`);
    block.values.push(...encodeCharRow(rowText, rawLine));
  }

  function appendDataTokens(block, tokenText, rawLine) {
    const normalizedText = String(tokenText).trim().replace(/^db\s+/i, "");
    const tokens = normalizedText.split(",").map(normalizeDataToken);
    if (tokens.some((token) => token === false)) {
      throw new Error(`Invalid data byte list: ${rawLine}`);
    }
    block.values.push(...tokens.filter(Boolean));
  }

  function looksLikeDataTokens(tokenText) {
    const normalizedText = String(tokenText).trim().replace(/^db\s+/i, "");
    if (!normalizedText || !normalizedText.includes(",")) return false;
    const tokens = normalizedText.split(",").map(normalizeDataToken);
    return tokens.length > 0 && !tokens.some((token) => token === false);
  }

  function formatDataByteLiteral(value) {
    return `$${(Number(value) & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
  }

  function expandDataValueToken(token, blockName) {
    const normalized = String(token).trim();
    const numeric = tryEvaluateConstantExpression(normalized);
    if (numeric === null) return [normalized];
    if (numeric >= -128 && numeric <= 0xFF) {
      return [formatDataByteLiteral(numeric)];
    }
    if (numeric >= -32768 && numeric <= 0xFFFF) {
      const word = numeric & 0xFFFF;
      return [
        formatDataByteLiteral(word & 0xFF),
        formatDataByteLiteral((word >> 8) & 0xFF)
      ];
    }
    throw new Error(`Data block ${blockName} literal out of supported range: ${normalized}`);
  }

  function flushDataBlock() {
    const inData = getInData();
    if (!inData) return;
    const { name } = inData;
    if (inData.layout === "sprite16") {
      if (!inData.leftRows.length || !inData.rightRows.length) {
        throw new Error(`Data block ${name} is empty.`);
      }
      if (inData.leftRows.length !== inData.rightRows.length || (inData.leftRows.length % 16) !== 0) {
        throw new Error(`sprite16 data block ${name} must contain 16 bitmap rows per sprite.`);
      }
      inData.values = [];
      for (let index = 0; index < inData.leftRows.length; index += 16) {
        inData.values.push(...inData.leftRows.slice(index, index + 16));
        inData.values.push(...inData.rightRows.slice(index, index + 16));
      }
    }
    const { values } = inData;
    if (!values.length) {
      throw new Error(`Data block ${name} is empty.`);
    }
    const emittedValues = [];
    values.forEach((value) => emittedValues.push(...expandDataValueToken(value, name)));
    const asmName = ensureDataAsmSymbol(name);
    dataLengths.set(name, emittedValues.length);
    dataBlocks.set(name, [...emittedValues]);
    romData.push(`${asmName}:`);
    for (let index = 0; index < emittedValues.length; index += 8) {
      romData.push(`    db ${emittedValues.slice(index, index + 8).map(rewriteUserSymbolsInExpression).join(",")}`);
    }
    setInData(null);
  }

  return {
    normalizeDataToken,
    parseBitmapLine,
    bitmapCharToBit,
    encodeBitmap8Row,
    encodeSprite16Row,
    appendBitmapRow,
    appendCharRow,
    appendDataTokens,
    looksLikeDataTokens,
    formatDataByteLiteral,
    expandDataValueToken,
    flushDataBlock
  };
}
