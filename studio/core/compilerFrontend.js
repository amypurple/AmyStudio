export function inferAmyMemoryCapabilities(sourceText, sourceHintsTinySound) {
  const text = sourceText || "";
  const codeText = text.split(/\r?\n/).map((line) => line.replace(/'.*$/, "")).join("\n");
  const usesTinySound = sourceHintsTinySound(text);
  const needsTinySound = usesTinySound;
  const usesHalt = /\bhalt\b/i.test(text);
  const usesWaitVblank = /^\s*wait\s*(?:'.*)?$/im.test(text) ||
    /\bwait\s+vblanks?\b/i.test(text) ||
    /\bwait\s+(?:[A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+frames?\b/i.test(text);
  const usesWipeWithHalt = /\bwipe\s+(?:screen|bitmap)\s+(?:up|down)\b/i.test(text);
  const usesTextScreen = /\btext\s+screen\b/i.test(text);
  const usesGraphicsMode2Text = /\bgraphics\s+mode\s+2\s+text\b/i.test(text);
  const needsMusic = /\b(play\s+song|stop\s+song|AMY_(PLAY_SONG|UPDATE_MUSIC|STOP_SONG|NEXT_SONG)|AMY_MUSIC_ENABLED|AMY_MUSIC_POINTER|AMY_MUSIC_COUNTER)\b/i.test(text);
  const needsSound =
    needsMusic ||
    /\b(set\s+sound\s+table|play\s+sound|stop\s+sound|mute\s+all|sound\s+runtime|AMY_(SET_SOUND_TABLE|PLAY_SOUND|STOP_SOUND|MUTE_ALL)|AMY_SOUND_ENABLED|AMY_SOUND_AREA_COUNT|AMY_SOUND_TABLE_POINTER)\b/i.test(text);
  const needsSprites =
    /\b(sprite|sprites|AMY_(SET_SPRITES8X8|SET_SPRITES16X16|SET_SPRITES_SIMPLE|SET_SPRITES_DOUBLE|SET_SPRITE_COUNT|SET_SPRITE|HIDE_SPRITE|CLEAR_SPRITES|UPDATE_SPRITES)|AMY_SPRITE_(COUNT|TABLE))\b/i.test(text);
  const needsControllers =
    /\b(read\s+(joypad|keypad)|wait\s+no?\s*fire|wait\s+.+?\s+frames?\s+or\s+press|pause\s+until\s+press|JOYPAD_[12]|KEYPAD_[12])\b/i.test(text) ||
    /\b(joypad|keypad)\s*\(/i.test(text);
  const needsSpinner =
    /\b(read\s+spinner|spinner|AMY_(ENABLE_SPINNER|DISABLE_SPINNER|RESET_SPINNER1|RESET_SPINNER2|RESET_SPINNERS)|SPINNER_[12])\b/i.test(text);
  const needsFrameCounter =
    usesTinySound ||
    /\b(read\s+frame|AMY_FRAME_COUNTER)\b/i.test(text) ||
    /\bframe\b(?!\s+size)/i.test(codeText);
  const needsVdpStatusShadow =
    usesWaitVblank ||
    /\b(VDP_STATUS|NMI_FLAG)\b/i.test(text) ||
    /\bvdp\.status\b/i.test(text) ||
    /\bif\s+(?:not\s+)?any\s+collision\b/i.test(text);
  const needsNmi =
    usesHalt ||
    usesWaitVblank ||
    usesWipeWithHalt ||
    needsSound ||
    needsControllers ||
    needsSpinner ||
    needsVdpStatusShadow ||
    needsFrameCounter;
  return {
    needsSound,
    needsMusic,
    needsSprites,
    needsControllers,
    needsSpinner,
    needsFrameCounter,
    needsVdpStatusShadow,
    needsTinySound,
    usesTinySound,
    usesHalt,
    usesWaitVblank,
    usesWipeWithHalt,
    usesTextScreen,
    usesGraphicsMode2Text,
    needsNmi
  };
}

export function parseCartridgeDirective(rawText, rawLine, decodeCartridgeTitleBytes) {
  const bytes = [];
  let normalizedLowercase = false;
  const pushAscii = (ch) => bytes.push(ch.toUpperCase().charCodeAt(0) & 0xFF);
  for (let index = 0; index < rawText.length; index += 1) {
    const ch = rawText[index];
    if (ch === "{") {
      const close = rawText.indexOf("}", index + 1);
      if (close < 0) throw new Error(`Unclosed cartridge title escape: ${rawLine}`);
      const token = rawText.slice(index + 1, close).trim().toLowerCase();
      if (token === "tm" || token === "trademark") bytes.push(0x1E, 0x1F);
      else if (token === "c" || token === "copyright") bytes.push(0x1D);
      else throw new Error(`Unsupported cartridge title escape '{${token}}'. Use {c} or {tm}: ${rawLine}`);
      index = close;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 0x20 || code > 0x7E) throw new Error(`Cartridge title only supports ASCII plus {c} and {tm}: ${rawLine}`);
    if (code >= 0x61 && code <= 0x7A) normalizedLowercase = true;
    pushAscii(ch);
  }
  const parts = [];
  let current = [];
  for (const value of bytes) {
    if (value === 0x2F) {
      parts.push(current);
      current = [];
    } else current.push(value);
  }
  parts.push(current);
  if (parts.length !== 3) throw new Error(`Cartridge title must use LINE3/LINE2/YEAR: ${rawLine}`);
  const [line3Bytes, line2Bytes, yearBytes] = parts;
  if (yearBytes.length !== 4 || !yearBytes.every((value) => value >= 0x30 && value <= 0x39)) {
    throw new Error(`Cartridge title year must be exactly 4 digits: ${rawLine}`);
  }
  if (line3Bytes.length > 32 || line2Bytes.length > 32) {
    throw new Error(`Cartridge title lines must be 32 characters or fewer: ${rawLine}`);
  }
  return {
    raw: rawText,
    bytes,
    line3Bytes,
    line2Bytes,
    yearText: String.fromCharCode(...yearBytes),
    displayText: decodeCartridgeTitleBytes(bytes),
    normalizedLowercase
  };
}

export function rewriteImmediateByteTempCoordinateUses(sourceLines, normalizeExpression) {
  const stripComment = (line) => String(line).split("'")[0].trim();
  const tempSetPattern = /^set\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i;
  const buildTempCandidate = (setLine, addLine) => {
    const setMatch = stripComment(setLine).match(tempSetPattern);
    if (!setMatch) return null;
    const tempName = setMatch[1];
    const baseExpr = normalizeExpression(setMatch[2].trim());
    const addMatch = stripComment(addLine).match(new RegExp(`^add\\s+${tempName}\\s+by\\s+(.+)$`, "i"));
    if (!addMatch) return null;
    const deltaExpr = normalizeExpression(addMatch[1].trim());
    if (!baseExpr || !deltaExpr) return null;
    if (new RegExp(`\\b${tempName}\\b`, "i").test(baseExpr) || new RegExp(`\\b${tempName}\\b`, "i").test(deltaExpr)) return null;
    return { tempName, expression: `(${baseExpr} + ${deltaExpr})` };
  };
  const rewriteCoordinateStatement = (statementLine, replacements) => {
    if (typeof statementLine !== "string") return null;
    const tryRewrite = (pattern, rebuild) => {
      const match = statementLine.match(pattern);
      if (!match) return null;
      const xToken = match[2].trim();
      const yToken = match[4].trim();
      const nextX = replacements.get(xToken) || xToken;
      const nextY = replacements.get(yToken) || yToken;
      if (nextX === xToken && nextY === yToken) return null;
      return rebuild(match, nextX, nextY);
    };
    return tryRewrite(/^(put\s+(?:char|tile)\s+.+?\s+at\s+)(.+?)(\s*,\s*)(.+)$/i, (match, xToken, yToken) => `${match[1]}${xToken}${match[3]}${yToken}`)
      || tryRewrite(/^(put\s+chars\s+[A-Za-z_][A-Za-z0-9_]*\s+at\s+)(.+?)(\s*,\s*)(.+?)(\s+count\s+.+)$/i, (match, xToken, yToken) => `${match[1]}${xToken}${match[3]}${yToken}${match[5]}`)
      || tryRewrite(/^(put\s+at\s+)(.+?)(\s*,\s*)(.+?)(\s+[A-Za-z_][A-Za-z0-9_]*\s+count\s+.+)$/i, (match, xToken, yToken) => `${match[1]}${xToken}${match[3]}${yToken}${match[5]}`)
      || tryRewrite(/^(fill\s+at\s+)(.+?)(\s*,\s*)(.+?)(\s+.+?\s+count\s+.+)$/i, (match, xToken, yToken) => `${match[1]}${xToken}${match[3]}${yToken}${match[5]}`)
      || tryRewrite(/^(get\s+(?:char|tile)\s+at\s+)(.+?)(\s*,\s*)(.+?)(\s+into\s+.+)$/i, (match, xToken, yToken) => `${match[1]}${xToken}${match[3]}${yToken}${match[5]}`)
      || tryRewrite(/^(print\s+.+?\s+at\s+)(.+?)(\s*,\s*)(.+)$/i, (match, xToken, yToken) => `${match[1]}${xToken}${match[3]}${yToken}`);
  };
  const rewritten = [];
  for (let index = 0; index < sourceLines.length; index += 1) {
    const firstCandidate = buildTempCandidate(sourceLines[index], sourceLines[index + 1]);
    if (!firstCandidate) {
      rewritten.push(sourceLines[index]);
      continue;
    }
    const replacements = new Map([[firstCandidate.tempName, firstCandidate.expression]]);
    let nextIndex = index + 2;
    const secondCandidate = buildTempCandidate(sourceLines[nextIndex], sourceLines[nextIndex + 1]);
    if (secondCandidate && !replacements.has(secondCandidate.tempName)) {
      replacements.set(secondCandidate.tempName, secondCandidate.expression);
      nextIndex += 2;
    }
    const rewrittenStatement = rewriteCoordinateStatement(sourceLines[nextIndex], replacements);
    if (!rewrittenStatement) {
      rewritten.push(sourceLines[index]);
      continue;
    }
    rewritten.push(rewrittenStatement);
    index = nextIndex;
  }
  return rewritten;
}

function tokenizeExpression(expr, normalizeExpression) {
  const source = normalizeExpression(String(expr).trim());
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const ch = source[index];
    if (/\s/.test(ch)) { index++; continue; }
    const twoChar = source.slice(index, index + 2);
    if (twoChar === "<<" || twoChar === ">>") {
      tokens.push({ type: twoChar, value: twoChar });
      index += 2;
      continue;
    }
    if ("()+-*/%,[]&|^~.".includes(ch)) {
      tokens.push({ type: ch, value: ch });
      index++;
      continue;
    }
    if (ch === "$") {
      let end = index + 1;
      while (end < source.length && /[0-9A-Fa-f]/.test(source[end])) end++;
      if (end === index + 1) return null;
      tokens.push({ type: "number", value: source.slice(index, end) });
      index = end;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let end = index + 1;
      while (end < source.length && /[0-9]/.test(source[end])) end++;
      if (source[end] === "." && /[0-9]/.test(source[end + 1] || "")) {
        end++;
        while (end < source.length && /[0-9]/.test(source[end])) end++;
      }
      tokens.push({ type: "number", value: source.slice(index, end) });
      index = end;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_]/.test(source[end])) end++;
      tokens.push({ type: "identifier", value: source.slice(index, end) });
      index = end;
      continue;
    }
    return null;
  }
  return tokens;
}

export function parseExpressionAst(expr, normalizeExpression) {
  const tokens = tokenizeExpression(expr, normalizeExpression);
  if (!tokens) return null;
  let index = 0;
  function peek(offset = 0) { return tokens[index + offset] || null; }
  function consume(type = null) {
    const token = peek();
    if (!token) return null;
    if (type && token.type !== type) return null;
    index++;
    return token;
  }
  function parseCallArguments() {
    const args = [];
    if (peek()?.type !== ")") {
      while (true) {
        const arg = parseBitwiseOr();
        if (!arg) return null;
        args.push(arg);
        if (peek()?.type === ",") { consume(","); continue; }
        break;
      }
    }
    return args;
  }
  function parsePrimary() {
    const token = peek();
    if (!token) return null;
    if (token.type === "number") { consume(); return { kind: "number", value: token.value }; }
    let node = null;
    if (token.type === "identifier") {
      consume();
      node = { kind: "identifier", name: token.value };
    } else if (token.type === "(") {
      consume("(");
      node = parseBitwiseOr();
      if (!node || !consume(")")) return null;
    } else return null;
    while (true) {
      if (node.kind === "identifier" && peek()?.type === "(") {
        consume("(");
        const args = parseCallArguments();
        if (!args) return null;
        if (!consume(")")) return null;
        node = { kind: "call", name: token.value, args };
        continue;
      }
      if (peek()?.type === "[") {
        consume("[");
        const subscript = parseBitwiseOr();
        if (!subscript || !consume("]")) return null;
        if (node.kind !== "identifier") return null;
        node = { kind: "index", name: node.name, index: subscript };
        continue;
      }
      if (peek()?.type === ".") {
        consume(".");
        const property = consume("identifier");
        if (!property) return null;
        node = { kind: "member", object: node, property: property.value };
        continue;
      }
      break;
    }
    return node;
  }
  function parseUnary() {
    const token = peek();
    if (token && (token.type === "+" || token.type === "-" || token.type === "~")) {
      consume();
      const operand = parseUnary();
      if (!operand) return null;
      return { kind: "unary", op: token.type, expr: operand };
    }
    return parsePrimary();
  }
  function parseMultiplicative() {
    let node = parseUnary();
    if (!node) return null;
    while (true) {
      const token = peek();
      const isModKeyword = token && token.type === "identifier" && String(token.value || "").toLowerCase() === "mod";
      if (!token || (token.type !== "*" && token.type !== "/" && token.type !== "%" && !isModKeyword)) break;
      consume();
      const right = parseUnary();
      if (!right) return null;
      node = { kind: "binary", op: isModKeyword ? "%" : token.type, left: node, right };
    }
    return node;
  }
  function parseAdditive() {
    let node = parseMultiplicative();
    if (!node) return null;
    while (true) {
      const token = peek();
      if (!token || (token.type !== "+" && token.type !== "-")) break;
      consume();
      const right = parseMultiplicative();
      if (!right) return null;
      node = { kind: "binary", op: token.type, left: node, right };
    }
    return node;
  }
  function parseShift() {
    let node = parseAdditive();
    if (!node) return null;
    while (true) {
      const token = peek();
      if (!token || (token.type !== "<<" && token.type !== ">>")) break;
      consume();
      const right = parseAdditive();
      if (!right) return null;
      node = { kind: "binary", op: token.type, left: node, right };
    }
    return node;
  }
  function parseBitwiseAnd() {
    let node = parseShift();
    if (!node) return null;
    while (true) {
      const token = peek();
      if (!token || token.type !== "&") break;
      consume();
      const right = parseShift();
      if (!right) return null;
      node = { kind: "binary", op: token.type, left: node, right };
    }
    return node;
  }
  function parseBitwiseXor() {
    let node = parseBitwiseAnd();
    if (!node) return null;
    while (true) {
      const token = peek();
      if (!token || token.type !== "^") break;
      consume();
      const right = parseBitwiseAnd();
      if (!right) return null;
      node = { kind: "binary", op: token.type, left: node, right };
    }
    return node;
  }
  function parseBitwiseOr() {
    let node = parseBitwiseXor();
    if (!node) return null;
    while (true) {
      const token = peek();
      if (!token || token.type !== "|") break;
      consume();
      const right = parseBitwiseXor();
      if (!right) return null;
      node = { kind: "binary", op: token.type, left: node, right };
    }
    return node;
  }
  const ast = parseBitwiseOr();
  if (!ast || index !== tokens.length) return null;
  return ast;
}

export function renderExpressionAst(node) {
  if (!node) return "";
  if (node.kind === "number") return node.value;
  if (node.kind === "identifier") return node.name;
  if (node.kind === "call") return `${node.name}(${node.args.map(renderExpressionAst).join(", ")})`;
  if (node.kind === "index") return `${node.name}[${renderExpressionAst(node.index)}]`;
  if (node.kind === "member") return `${renderExpressionAst(node.object)}.${node.property}`;
  if (node.kind === "unary") return `${node.op}${renderExpressionAst(node.expr)}`;
  if (node.kind === "binary") return `(${renderExpressionAst(node.left)} ${node.op} ${renderExpressionAst(node.right)})`;
  return "";
}
