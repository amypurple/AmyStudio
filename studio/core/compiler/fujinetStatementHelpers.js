// FujiNet statements: network channels, JSON queries, app keys, clock and
// adapter information, for the FujiNet-ColecoVision cartridge (capability
// fujinet-cartridge): runtime AMY_FNC_* in src/alexis_lib/coleco_fujinet_cart.asm.
// Every mailbox access lives in the runtime, never in generated code.

const QUALIFIED_OPERAND = "[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?(?:\\.[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?)*";
const STATUS_CLAUSE = `(?:\\s+status\\s+(${QUALIFIED_OPERAND}))?`;
const TEXT_OPERAND = `("[^"]*"|${QUALIFIED_OPERAND})`;

const OPEN_MODES = Object.freeze({ "read": 4, "write": 8, "read write": 12, "post": 13 });
const TRANSLATIONS = Object.freeze({ none: 0, cr: 1, lf: 2, crlf: 3 });
const HTTP_MODES = Object.freeze({ "body": 0, "collect headers": 1, "get headers": 2, "set headers": 3, "post data": 4 });
// Text fields of GET_ADAPTERCONFIG_EXTENDED ($C4): offset and NUL-padded width.
const ADAPTER_FIELDS = Object.freeze({
  ssid: { offset: 0, width: 33 },
  hostname: { offset: 33, width: 64 },
  version: { offset: 125, width: 15 },
  ip: { offset: 140, width: 16 },
  mac: { offset: 204, width: 18 }
});
const UNIT_LIMITS = Object.freeze({ cartridge: 8 });

const RESULT_FORMS = "network\\s+(?:read|query)|appkey\\s+read|fujinet\\s+(?:present|hostname|ip|ssid|version|mac)";

// Matches a line that starts a FujiNet statement (used for statement routing).
export const FUJINET_STATEMENT_PATTERN = new RegExp(
  `^(?:(?:network\\s+(?:open|close|status|write|json|http)|appkey\\s+(?:write|creator)|fujinet\\s+time|${RESULT_FORMS})\\b|${QUALIFIED_OPERAND}\\s*=\\s*(?:${RESULT_FORMS})\\b)`,
  "i"
);

// Finds a FujiNet statement anywhere in a line, including after `if ... then`.
export const FUJINET_STATEMENT_SEARCH = /\b(?:network\s+(?:open|close|status|read|write|json|query|http)|appkey\s+(?:read|write)|fujinet\s+(?:present|time|hostname|ip|ssid|version|mac))\b/i;

// Statements that would touch the FujiNet cartridge mailbox from generated code.
// On hardware any access to $8000-$FFFF is a cartridge read, so a stray write
// fires a hotspot, and a read at $FD00 or above sends a byte.
export function findFujinetCartridgeHazard(line) {
  if (/^(?:bank\s+(?:rom|select)\b|bank\s+\d+$|call\s+bank\b)/i.test(line) || /\bfrom\s+bank\s+\d+\b/i.test(line)) {
    return "MegaCart bank statements cannot run on the FujiNet cartridge: its mailbox occupies the mapper window at $FFC0-$FFFF";
  }
  for (const match of line.matchAll(/\bpoke\s*\(\s*(\$[0-9A-F]+|0x[0-9A-F]+|[0-9]+)\s*,/gi)) {
    const address = parseNumber(match[1]);
    if (address !== null && address >= 0x8000) {
      return `poke to ${hex(address, 4)} would fire a FujiNet cartridge hotspot: $8000-$FFFF is cartridge space`;
    }
  }
  for (const match of line.matchAll(/\bpeek\s*\(\s*(\$[0-9A-F]+|0x[0-9A-F]+|[0-9]+)\s*\)/gi)) {
    const address = parseNumber(match[1]);
    if (address !== null && address >= 0xF800) {
      return `peek of ${hex(address, 4)} reads the FujiNet mailbox; use the network statements instead`;
    }
  }
  return null;
}

// Finds the single `appkey creator <id> app <id>` declaration.
export function scanFujinetAppKeyDeclaration(sourceLines, stripComment = (text) => text) {
  let found = null;
  for (const rawLine of sourceLines || []) {
    const line = stripComment(String(rawLine || "")).trim();
    const match = line.match(/^appkey\s+creator\s+(\S+)\s+app\s+(\S+)$/i);
    if (!match) continue;
    const creator = parseNumber(match[1]);
    const app = parseNumber(match[2]);
    if (creator === null || creator < 1 || creator > 0xFFFF || app === null || app < 0 || app > 0xFF) {
      return { error: `appkey creator must be 1-$FFFF and app 0-$FF: ${rawLine}` };
    }
    if (found && (found.creator !== creator || found.app !== app)) {
      return { error: `Only one appkey creator/app declaration is allowed: ${rawLine}` };
    }
    found = { creator, app };
  }
  return found;
}

function parseNumber(text) {
  const value = String(text || "").trim();
  if (/^\$[0-9A-F]+$/i.test(value)) return Number.parseInt(value.slice(1), 16);
  if (/^0x[0-9A-F]+$/i.test(value)) return Number.parseInt(value.slice(2), 16);
  if (/^[0-9]+$/.test(value)) return Number.parseInt(value, 10);
  return null;
}

function hex(value, digits) {
  return `$${value.toString(16).toUpperCase().padStart(digits, "0")}`;
}

export function handleFujinetStatement({
  line,
  rawLine,
  buildContext,
  appKeyConfig = null,
  emitLoadInt8ValueInto,
  emitLoadCountIntoBC,
  emitLoadSourceAddressIntoHL,
  emitStoreInt8FromA,
  emitStoreInt16FromHL,
  emitTextLiteral,
  getByteArrayBufferInfo,
  resolveWholeRecord,
  getRuntimeInfo,
  resolveValueType,
  tryEvaluateConstant = () => null,
  makeGeneratedLabel
}) {
  const unhandled = { ok: true, handled: false, lines: [] };
  if (!FUJINET_STATEMENT_PATTERN.test(line)) return unhandled;

  const fail = (message) => ({ ok: false, handled: true, log: `${message}: ${rawLine}` });
  const capabilities = new Set(buildContext?.capabilities || []);
  const backend = capabilities.has("fujinet-cartridge") ? "cartridge" : null;
  if (!backend) {
    return fail("FujiNet statements require target.hardware \"fujinet\" on a ColecoVision cartridge");
  }
  const routine = (name) => `AMY_FNC_${name}`;

  // Loads A with a unit, checking a constant against this backend's range.
  const loadUnit = (token) => {
    const constant = tryEvaluateConstant(token);
    if (constant !== null) {
      if (!Number.isInteger(constant) || constant < 1 || constant > UNIT_LIMITS[backend]) {
        return { error: `FujiNet network unit must be 1-${UNIT_LIMITS[backend]} on this target` };
      }
      return { lines: [`    ld a,${constant}`], constant: true };
    }
    const lines = emitLoadInt8ValueInto("a", token);
    return lines ? { lines, constant: false } : { error: "FujiNet network unit must be a byte expression" };
  };

  // A literal or a u8 buffer: HL = address, BC = capacity (the runtime trims it).
  const loadText = (token) => {
    if (token.startsWith("\"")) {
      const value = token.slice(1, -1);
      if ([...value].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) > 0x7E)) {
        return { error: "FujiNet text must be printable ASCII" };
      }
      if (value.length > 255) return { error: "FujiNet text literals are limited to 255 characters" };
      const literal = emitTextLiteral(value);
      return { lines: [`    ld hl,${literal.label}`, `    ld bc,${literal.length}`] };
    }
    const info = getByteArrayBufferInfo(token, 1);
    const address = emitLoadSourceAddressIntoHL(token);
    if (!info || typeof info.length !== "number" || !address) {
      return { error: "FujiNet text must be a string literal or a u8 array" };
    }
    return { lines: [...address, `    ld bc,${info.length}`] };
  };

  // A u8 buffer destination: address loader and declared capacity.
  const resolveBuffer = (token) => {
    const info = getByteArrayBufferInfo(token, 1);
    const address = emitLoadSourceAddressIntoHL(token);
    if (!info || typeof info.length !== "number" || !address) return null;
    return { address, capacity: info.length };
  };

  const resolveRecord = (token, typeName, byteSize) => {
    const resolved = resolveWholeRecord?.(token) || (() => {
      const direct = getRuntimeInfo?.(token);
      return direct?.kind === "record"
        ? { recordTypeName: direct.recordTypeName || direct.declaredType, byteSize: direct.recordSize }
        : null;
    })();
    if (resolved?.recordTypeName?.toLowerCase() !== typeName.toLowerCase() || resolved.byteSize !== byteSize) return null;
    return emitLoadSourceAddressIntoHL(token);
  };

  // Stores HL (count) and A (status) into optional destinations.
  const storeResults = (countToken, statusToken) => {
    const out = [];
    let countStore = [];
    if (countToken) {
      const type = resolveValueType(countToken);
      if (type === "int16") countStore = emitStoreInt16FromHL(countToken);
      else {
        const store = emitStoreInt8FromA(countToken);
        countStore = store ? ["    ld a,l", ...store] : null;
      }
      if (!countStore) return null;
    }
    const statusStore = statusToken ? emitStoreInt8FromA(statusToken) : [];
    if (!statusStore) return null;
    if (countStore.length && statusStore.length) out.push("    push af", ...countStore, "    pop af", ...statusStore);
    else out.push(...countStore, ...statusStore);
    return out;
  };

  // Unit first (it may need any register), then the rest, then the call.
  const callWithUnit = (unit, rest, name) => {
    if (unit.constant) return [...rest, ...unit.lines, `    call ${routine(name)}`];
    return [...unit.lines, "    push af", ...rest, "    pop af", `    call ${routine(name)}`];
  };

  const done = (lines) => ({ ok: true, handled: true, lines });

  // appkey creator $1234 app 1 — compile-time ids, scanned before compilation.
  if (/^appkey\s+creator\b/i.test(line)) {
    if (!/^appkey\s+creator\s+\S+\s+app\s+\S+$/i.test(line)) return fail("Use 'appkey creator <1-$FFFF> app <0-$FF>'");
    return done([]);
  }

  const present = line.match(new RegExp(`^(${QUALIFIED_OPERAND})\\s*=\\s*fujinet\\s+present$`, "i"));
  if (present) {
    const store = emitStoreInt8FromA(present[1]);
    if (!store) return fail("fujinet present requires a byte destination");
    return done([`    call ${routine("PRESENT")}`, ...store]);
  }

  const open = line.match(new RegExp(`^network\\s+open\\s+(.+?)\\s+${TEXT_OPERAND}\\s+(read\\s+write|read|write|post)(?:\\s+translate\\s+(none|cr|lf|crlf))?${STATUS_CLAUSE}$`, "i"));
  if (open) {
    const unit = loadUnit(open[1].trim());
    if (unit.error) return fail(unit.error);
    const text = loadText(open[2]);
    if (text.error) return fail(text.error);
    const mode = OPEN_MODES[open[3].toLowerCase().replace(/\s+/g, " ")];
    const translation = TRANSLATIONS[(open[4] || "none").toLowerCase()];
    const store = storeResults(null, open[5]);
    if (!store) return fail("network open requires an optional byte status variable");
    return done([...callWithUnit(unit, [...text.lines, `    ld de,${hex((mode << 8) | translation, 4)}`], "OPEN"), ...store]);
  }
  if (/^network\s+open\b/i.test(line)) {
    return fail("Use 'network open Unit \"URL\"|Buffer read|write|read write|post [translate none|cr|lf|crlf] [status S]'");
  }

  const close = line.match(new RegExp(`^network\\s+close\\s+(.+?)${STATUS_CLAUSE}$`, "i"));
  if (close) {
    const unit = loadUnit(close[1].trim());
    if (unit.error) return fail(unit.error);
    const store = storeResults(null, close[2]);
    if (!store) return fail("network close requires an optional byte status variable");
    return done([...callWithUnit(unit, [], "CLOSE"), ...store]);
  }

  const status = line.match(new RegExp(`^network\\s+status\\s+(.+?)\\s+as\\s+(${QUALIFIED_OPERAND})${STATUS_CLAUSE}$`, "i"));
  if (status) {
    const unit = loadUnit(status[1].trim());
    if (unit.error) return fail(unit.error);
    const address = resolveRecord(status[2], "FujiNetStatus", 4);
    if (!address) return fail("network status requires a FujiNetStatus record");
    const store = storeResults(null, status[3]);
    if (!store) return fail("network status requires an optional byte status variable");
    return done([...callWithUnit(unit, address, "STATUS"), ...store]);
  }
  if (/^network\s+status\b/i.test(line)) return fail("Use 'network status Unit as Info [status S]' with a FujiNetStatus record");

  const read = line.match(new RegExp(`^(${QUALIFIED_OPERAND})\\s*=\\s*network\\s+read\\s+(.+?)\\s+into\\s+(${QUALIFIED_OPERAND})(?:\\s+count\\s+(.+?))?${STATUS_CLAUSE}$`, "i"));
  if (read) {
    const unit = loadUnit(read[2].trim());
    if (unit.error) return fail(unit.error);
    const buffer = resolveBuffer(read[3]);
    if (!buffer) return fail("network read requires a u8 array destination");
    let countLines = [`    ld bc,${buffer.capacity}`];
    if (read[4]) {
      const constant = tryEvaluateConstant(read[4].trim());
      if (constant !== null && (constant < 0 || constant > buffer.capacity)) {
        return fail(`network read count ${constant} exceeds the ${buffer.capacity}-byte buffer`);
      }
      const loadCount = emitLoadCountIntoBC(read[4].trim());
      if (!loadCount) return fail("network read count must be a byte or word expression");
      countLines = constant !== null
        ? [`    ld bc,${constant}`]
        : [...loadCount, `    ld hl,${buffer.capacity}`, "    call AMY_FN_MIN_BC_HL"];
    }
    const store = storeResults(read[1], read[5]);
    if (!store) return fail("network read requires a byte or word count destination and an optional byte status variable");
    return done([...callWithUnit(unit, [...countLines, "    push bc", ...buffer.address, "    pop bc"], "READ"), ...store]);
  }

  const writeBuffer = line.match(new RegExp(`^network\\s+write\\s+(.+?)\\s+from\\s+(${QUALIFIED_OPERAND})\\s+count\\s+(.+?)${STATUS_CLAUSE}$`, "i"));
  if (writeBuffer) {
    const unit = loadUnit(writeBuffer[1].trim());
    if (unit.error) return fail(unit.error);
    const buffer = resolveBuffer(writeBuffer[2]);
    if (!buffer) return fail("network write requires a u8 array source");
    const constant = tryEvaluateConstant(writeBuffer[3].trim());
    if (constant !== null && (constant < 0 || constant > buffer.capacity)) {
      return fail(`network write count ${constant} exceeds the ${buffer.capacity}-byte buffer`);
    }
    const loadCount = constant !== null ? [`    ld bc,${constant}`] : emitLoadCountIntoBC(writeBuffer[3].trim());
    if (!loadCount) return fail("network write count must be a byte or word expression");
    const countLines = constant !== null ? loadCount : [...loadCount, `    ld hl,${buffer.capacity}`, "    call AMY_FN_MIN_BC_HL"];
    const store = storeResults(null, writeBuffer[4]);
    if (!store) return fail("network write requires an optional byte status variable");
    return done([...callWithUnit(unit, [...countLines, "    push bc", ...buffer.address, "    pop bc"], "WRITE"), ...store]);
  }

  const writeText = line.match(new RegExp(`^network\\s+write\\s+(.+?)\\s+("[^"]*")${STATUS_CLAUSE}$`, "i"));
  if (writeText) {
    const unit = loadUnit(writeText[1].trim());
    if (unit.error) return fail(unit.error);
    const text = loadText(writeText[2]);
    if (text.error) return fail(text.error);
    const store = storeResults(null, writeText[3]);
    if (!store) return fail("network write requires an optional byte status variable");
    return done([...callWithUnit(unit, text.lines, "WRITE"), ...store]);
  }
  if (/^network\s+write\b/i.test(line)) return fail("Use 'network write Unit from Buffer count N [status S]' or 'network write Unit \"TEXT\" [status S]'");

  const json = line.match(new RegExp(`^network\\s+json\\s+(.+?)${STATUS_CLAUSE}$`, "i"));
  if (json) {
    const unit = loadUnit(json[1].trim());
    if (unit.error) return fail(unit.error);
    const store = storeResults(null, json[2]);
    if (!store) return fail("network json requires an optional byte status variable");
    return done([...callWithUnit(unit, [], "JSON"), ...store]);
  }

  const httpMode = line.match(new RegExp(`^network\\s+http\\s+mode\\s+(.+?)\\s+(body|collect\\s+headers|get\\s+headers|set\\s+headers|post\\s+data)${STATUS_CLAUSE}$`, "i"));
  if (httpMode) {
    const unit = loadUnit(httpMode[1].trim());
    if (unit.error) return fail(unit.error);
    const mode = HTTP_MODES[httpMode[2].toLowerCase().replace(/\s+/g, " ")];
    const store = storeResults(null, httpMode[3]);
    if (!store) return fail("network http mode requires an optional byte status variable");
    return done([...callWithUnit(unit, [`    ld e,${mode}`], "HTTP_MODE"), ...store]);
  }
  if (/^network\s+http\b/i.test(line)) {
    return fail("Use 'network http mode Unit body|post data|set headers|get headers|collect headers [status S]'");
  }

  const query = line.match(new RegExp(`^(${QUALIFIED_OPERAND})\\s*=\\s*network\\s+query\\s+(.+?)\\s+${TEXT_OPERAND}\\s+into\\s+(${QUALIFIED_OPERAND})${STATUS_CLAUSE}$`, "i"));
  if (query) {
    const unitToken = query[2].trim();
    const unit = loadUnit(unitToken);
    if (unit.error) return fail(unit.error);
    const text = loadText(query[3]);
    if (text.error) return fail(text.error);
    const buffer = resolveBuffer(query[4]);
    if (!buffer) return fail("network query requires a u8 array destination");
    const store = storeResults(query[1], query[5]);
    if (!store) return fail("network query requires a byte or word count destination and an optional byte status variable");
    const failLabel = makeGeneratedLabel("FujiNetQueryFailed");
    const doneLabel = makeGeneratedLabel("FujiNetQueryDone");
    return done([
      ...callWithUnit(unit, text.lines, "QUERY"),
      "    or a",
      `    jr nz,${failLabel}`,
      ...callWithUnit(loadUnit(unitToken), [`    ld bc,${buffer.capacity}`, "    push bc", ...buffer.address, "    pop bc"], "DRAIN"),
      `    jr ${doneLabel}`,
      `${failLabel}:`,
      "    ld hl,0",
      `${doneLabel}:`,
      ...store
    ]);
  }

  const appKeyRead = line.match(new RegExp(`^(${QUALIFIED_OPERAND})\\s*=\\s*appkey\\s+read\\s+(.+?)\\s+into\\s+(${QUALIFIED_OPERAND})${STATUS_CLAUSE}$`, "i"));
  const appKeyWrite = line.match(new RegExp(`^appkey\\s+write\\s+(.+?)\\s+from\\s+(${QUALIFIED_OPERAND})\\s+count\\s+(.+?)${STATUS_CLAUSE}$`, "i"));
  if (appKeyRead || appKeyWrite) {
    if (!appKeyConfig) return fail("App keys need an 'appkey creator <id> app <id>' declaration");
    if (appKeyConfig.error) return fail(appKeyConfig.error);
    const keyToken = (appKeyRead ? appKeyRead[2] : appKeyWrite[1]).trim();
    const keyConstant = tryEvaluateConstant(keyToken);
    if (keyConstant !== null && (!Number.isInteger(keyConstant) || keyConstant < 0 || keyConstant > 0xFF)) {
      return fail("App key ids are 0-255");
    }
    const loadKey = keyConstant !== null ? [`    ld e,${keyConstant}`] : (() => {
      const lines = emitLoadInt8ValueInto("a", keyToken);
      return lines ? [...lines, "    ld e,a"] : null;
    })();
    if (!loadKey) return fail("App key id must be a byte expression");
    const openLines = (mode) => [
      ...loadKey,
      `    ld d,${appKeyConfig.app}`,
      `    ld hl,${hex(appKeyConfig.creator, 4)}`,
      `    ld a,${mode}`,
      `    call ${routine("APPKEY_OPEN")}`
    ];
    const failLabel = makeGeneratedLabel("FujiNetAppKeyFailed");
    const doneLabel = makeGeneratedLabel("FujiNetAppKeyDone");
    if (appKeyRead) {
      const buffer = resolveBuffer(appKeyRead[3]);
      if (!buffer) return fail("appkey read requires a u8 array destination");
      const store = storeResults(appKeyRead[1], appKeyRead[4]);
      if (!store) return fail("appkey read requires a byte or word count destination and an optional byte status variable");
      return done([
        ...openLines(0),
        "    or a",
        `    jr nz,${failLabel}`,
        ...buffer.address,
        `    ld bc,${buffer.capacity}`,
        `    call ${routine("APPKEY_READ")}`,
        `    jr ${doneLabel}`,
        `${failLabel}:`,
        "    ld hl,0",
        `${doneLabel}:`,
        ...store
      ]);
    }
    const buffer = resolveBuffer(appKeyWrite[2]);
    if (!buffer) return fail("appkey write requires a u8 array source");
    const constant = tryEvaluateConstant(appKeyWrite[3].trim());
    if (constant !== null && (constant < 0 || constant > Math.min(64, buffer.capacity))) {
      return fail(`appkey write count must be 0-${Math.min(64, buffer.capacity)}`);
    }
    const loadCount = constant !== null ? [`    ld bc,${constant}`] : emitLoadCountIntoBC(appKeyWrite[3].trim());
    if (!loadCount) return fail("appkey write count must be a byte or word expression");
    const countLines = constant !== null ? loadCount : [...loadCount, `    ld hl,${buffer.capacity}`, "    call AMY_FN_MIN_BC_HL"];
    const store = storeResults(null, appKeyWrite[4]);
    if (!store) return fail("appkey write requires an optional byte status variable");
    return done([
      ...openLines(1),
      "    or a",
      `    jr nz,${failLabel}`,
      ...countLines,
      "    push bc",
      ...buffer.address,
      "    pop bc",
      `    call ${routine("APPKEY_WRITE")}`,
      `${failLabel}:`,
      ...store
    ]);
  }

  const time = line.match(new RegExp(`^fujinet\\s+time\\s+into\\s+(${QUALIFIED_OPERAND})${STATUS_CLAUSE}$`, "i"));
  if (time) {
    const address = resolveRecord(time[1], "FujiNetTime", 7);
    if (!address) return fail("fujinet time requires a FujiNetTime record");
    const store = storeResults(null, time[2]);
    if (!store) return fail("fujinet time requires an optional byte status variable");
    return done([...address, `    call ${routine("TIME")}`, ...store]);
  }

  const adapter = line.match(new RegExp(`^(${QUALIFIED_OPERAND})\\s*=\\s*fujinet\\s+(hostname|ip|ssid|version|mac)\\s+into\\s+(${QUALIFIED_OPERAND})${STATUS_CLAUSE}$`, "i"));
  if (adapter) {
    const field = ADAPTER_FIELDS[adapter[2].toLowerCase()];
    const buffer = resolveBuffer(adapter[3]);
    if (!buffer) return fail(`fujinet ${adapter[2].toLowerCase()} requires a u8 array destination`);
    const store = storeResults(adapter[1], adapter[4]);
    if (!store) return fail(`fujinet ${adapter[2].toLowerCase()} requires a byte or word count destination and an optional byte status variable`);
    return done([
      ...buffer.address,
      "    ex de,hl",
      `    ld hl,${hex((field.width << 8) | field.offset, 4)}`,
      `    ld bc,${buffer.capacity}`,
      `    call ${routine("ADAPTER")}`,
      ...store
    ]);
  }

  if (new RegExp(`^(?:${RESULT_FORMS})\\b`, "i").test(line)) {
    return fail("This FujiNet form returns a value; assign it, e.g. 'Got = network read 1 into Buffer'");
  }
  return fail("Unrecognized FujiNet statement; see the FujiNet section of the Amy language reference");
}
