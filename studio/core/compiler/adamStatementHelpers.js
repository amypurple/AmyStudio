export function handleAdamStatement({
  line,
  rawLine,
  buildContext,
  emitLoadInt16IntoHL,
  emitLoadInt8TermIntoA,
  emitLoadInt8ValueInto,
  emitLoadSourceAddressIntoHL,
  emitStoreInt8FromA,
  resolveValueType,
  resolveWholeRecord,
  getRuntimeInfo,
  makeGeneratedLabel
}) {
  const supportsEos = buildContext?.capabilities?.includes("eos");
  const capabilities = new Set(buildContext?.capabilities || []);
  const serialProfile = buildContext?.machine === "adam" && capabilities.has("serial-adamlink")
    ? { name: "AdamLink", data: "$5F", status: "$5E", readable: "$02", writable: "$01", carrier: "$40" }
    : buildContext?.machine === "adam" && capabilities.has("serial-eve")
      ? { name: "Eve/Orphanware", data: "$44", status: "$45", readable: "$02", writable: "$01", carrier: "$40" }
      : buildContext?.machine === "adam" && capabilities.has("serial-micro")
        ? { name: "Micro Innovations", data: "$1B", status: "$19", readable: "$01", writable: "$08", carrier: "$20", carrierPort: "$1D" }
        : null;
  const emitBooleanFromMask = (port, mask, invert = false) => {
    const falseLabel = makeGeneratedLabel("AdamSerialFalse");
    const doneLabel = makeGeneratedLabel("AdamSerialDone");
    return [
      `    in a,(${port})`,
      `    and ${mask}`,
      `    jr ${invert ? "nz" : "z"},${falseLabel}`,
      "    ld a,1",
      `    jr ${doneLabel}`,
      `${falseLabel}:`,
      "    xor a",
      `${doneLabel}:`
    ];
  };
  const emitSerialPresent = (port) => {
    const absentLabel = makeGeneratedLabel("AdamSerialAbsent");
    const doneLabel = makeGeneratedLabel("AdamSerialPresentDone");
    return [
      `    in a,(${port})`,
      "    cp $FF",
      `    jr z,${absentLabel}`,
      "    ld a,1",
      `    jr ${doneLabel}`,
      `${absentLabel}:`,
      "    xor a",
      `${doneLabel}:`
    ];
  };
  const serialQuery = line.match(/^(.+?)\s*=\s*serial\s+(present|readable|writable|read|carrier)$/i);
  if (serialQuery) {
    if (!serialProfile) {
      return { ok: false, handled: true, log: `serial I/O requires target.hardware adamlink, eve-serial, or micro-serial: ${rawLine}` };
    }
    const operation = serialQuery[2].toLowerCase();
    const store = emitStoreInt8FromA(serialQuery[1].trim());
    if (!store) {
      return { ok: false, handled: true, log: `serial ${operation} requires a byte destination: ${rawLine}` };
    }
    const read = operation === "present"
      ? emitSerialPresent(serialProfile.status)
      : operation === "read"
      ? [`    in a,(${serialProfile.data})`]
      : operation === "carrier"
        ? emitBooleanFromMask(serialProfile.carrierPort || serialProfile.status, serialProfile.carrier, !serialProfile.carrierPort)
        : emitBooleanFromMask(serialProfile.status, serialProfile[operation]);
    return { ok: true, handled: true, lines: [...read, ...store] };
  }

  const serialWrite = line.match(/^serial\s+write\s+(.+)$/i);
  if (serialWrite) {
    if (!serialProfile) {
      return { ok: false, handled: true, log: `serial I/O requires target.hardware adamlink, eve-serial, or micro-serial: ${rawLine}` };
    }
    const loadValue = emitLoadInt8ValueInto?.("a", serialWrite[1].trim()) || emitLoadInt8TermIntoA?.(serialWrite[1].trim());
    if (!loadValue) {
      return { ok: false, handled: true, log: `serial write requires a byte value: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadValue, `    out (${serialProfile.data}),a`] };
  }
  const resolveRecordInfo = (token) => {
    const resolved = resolveWholeRecord?.(token);
    if (resolved) return resolved;
    const direct = getRuntimeInfo?.(token);
    if (direct?.kind !== "record") return null;
    return {
      recordTypeName: direct.recordTypeName || direct.declaredType,
      byteSize: direct.recordSize
    };
  };
  const readDate = line.match(/^(.+?)\s*=\s*date(?:\s+status\s+(.+))?$/i);
  if (readDate) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `date requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const destination = readDate[1].trim();
    const info = resolveRecordInfo(destination);
    const loadDestination = emitLoadSourceAddressIntoHL(destination);
    const storeStatus = readDate[2] ? emitStoreInt8FromA(readDate[2].trim()) : [];
    if (!loadDestination || info?.recordTypeName?.toLowerCase() !== "eosdate" || info?.byteSize !== 3 || !storeStatus) {
      return { ok: false, handled: true, log: `date requires an EosDate result and optional byte status variable: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamDateReadFailed");
    const doneLabel = makeGeneratedLabel("AdamDateReadDone");
    return {
      ok: true,
      handled: true,
      lines: [
        "    call $FCDB",
        `    jr nz,${failedLabel}`,
        ...loadDestination,
        "    ld (hl),d",
        "    inc hl",
        "    ld (hl),c",
        "    inc hl",
        "    ld (hl),b",
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        ...loadDestination,
        "    xor a",
        "    ld (hl),a",
        "    inc hl",
        "    ld (hl),a",
        "    inc hl",
        "    ld (hl),a",
        ...(readDate[2] ? ["    inc a", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const setDate = line.match(/^set\s+date\s+(.+)$/i);
  if (setDate) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `set date requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const source = setDate[1].trim();
    const info = resolveRecordInfo(source);
    const loadSource = emitLoadSourceAddressIntoHL(source);
    if (!loadSource || info?.recordTypeName?.toLowerCase() !== "eosdate" || info?.byteSize !== 3) {
      return { ok: false, handled: true, log: `set date requires an EosDate record: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadSource,
        "    ld d,(hl)",
        "    inc hl",
        "    ld c,(hl)",
        "    inc hl",
        "    ld b,(hl)",
        "    call $FCD8"
      ]
    };
  }
  const printToPrinter = line.match(/^print\s+(.+?)\s+to\s+printer(?:\s+status\s+(.+))?$/i);
  if (printToPrinter) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `print to printer requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const value = printToPrinter[1].trim();
    const storeStatus = printToPrinter[2] ? emitStoreInt8FromA(printToPrinter[2].trim()) : [];
    if (!storeStatus) {
      return { ok: false, handled: true, log: `print to printer requires an optional byte status variable: ${rawLine}` };
    }
    const stringMatch = value.match(/^"([^"]*)"$/);
    const values = stringMatch ? [...stringMatch[1]].map((char) => char.charCodeAt(0)) : null;
    const loadValue = values
      ? null
      : (emitLoadInt8ValueInto?.("a", value) || emitLoadInt8TermIntoA?.(value));
    if (!values && !loadValue) {
      return { ok: false, handled: true, log: `print to printer requires a string literal or byte value: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamPrinterFailed");
    const doneLabel = makeGeneratedLabel("AdamPrinterDone");
    const stringLabel = values ? makeGeneratedLabel("AdamPrinterString") : null;
    const stringCodeLabel = values ? makeGeneratedLabel("AdamPrinterStringCode") : null;
    const calls = values
      ? [
          `    jr ${stringCodeLabel}`,
          `${stringLabel}:`,
          `    db ${[...values, 3].map((byte) => `$${byte.toString(16).padStart(2, "0")}`).join(",")}`,
          `${stringCodeLabel}:`,
          `    ld hl,${stringLabel}`,
          "    call $FC63",
          `    jr nz,${failedLabel}`
        ]
      : [...loadValue, "    call $FC66", `    jr nz,${failedLabel}`];
    return {
      ok: true,
      handled: true,
      lines: [
        ...calls,
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        ...(printToPrinter[2] ? ["    ld a,1", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const startKeyRead = line.match(/^(.+?)\s*=\s*key\s+start(?:\s+status\s+(.+))?$/i);
  if (startKeyRead) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `key start requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const storeRequest = emitStoreInt8FromA(startKeyRead[1].trim());
    const storeStatus = startKeyRead[2] ? emitStoreInt8FromA(startKeyRead[2].trim()) : [];
    if (!storeRequest || !storeStatus) {
      return { ok: false, handled: true, log: `key start requires a byte request variable and optional byte status variable: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamStartKeyReadFailed");
    const doneLabel = makeGeneratedLabel("AdamStartKeyReadDone");
    return {
      ok: true,
      handled: true,
      lines: [
        "    call $FCA8",
        `    jr nz,${failedLabel}`,
        ...storeRequest,
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    xor a",
        ...storeRequest,
        ...(startKeyRead[2] ? ["    inc a", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const pollKeyReadMatch = line.match(/^(.+?)\s*=\s*key\s+poll\s+(.+?)\s+status\s+(.+)$/i);
  const pollKeyRead = pollKeyReadMatch
    ? [pollKeyReadMatch[0], pollKeyReadMatch[2], pollKeyReadMatch[1], pollKeyReadMatch[3]]
    : null;
  if (pollKeyRead) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `key poll requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const request = pollKeyRead[1].trim();
    const loadRequest = emitLoadInt8ValueInto?.("a", request) || emitLoadInt8TermIntoA?.(request);
    const storeKey = emitStoreInt8FromA(pollKeyRead[2].trim());
    const storeStatus = emitStoreInt8FromA(pollKeyRead[3].trim());
    if (!loadRequest || !storeKey || !storeStatus) {
      return { ok: false, handled: true, log: `key poll requires byte request, key, and status variables: ${rawLine}` };
    }
    const pendingLabel = makeGeneratedLabel("AdamPollKeyReadPending");
    const failedLabel = makeGeneratedLabel("AdamPollKeyReadFailed");
    const doneLabel = makeGeneratedLabel("AdamPollKeyReadDone");
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadRequest,
        "    call $FC4B",
        `    jr nc,${pendingLabel}`,
        `    jr nz,${failedLabel}`,
        ...storeKey,
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${pendingLabel}:`,
        "    xor a",
        ...storeKey,
        "    inc a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    xor a",
        ...storeKey,
        "    ld a,2",
        ...storeStatus,
        `${doneLabel}:`
      ]
    };
  }

  const resetKeyboard = line.match(/^key\s+reset(?:\s+status\s+(.+))?$/i);
  if (resetKeyboard) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `key reset requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const storeStatus = resetKeyboard[1] ? emitStoreInt8FromA(resetKeyboard[1].trim()) : [];
    if (!storeStatus) {
      return { ok: false, handled: true, log: `key reset requires an optional byte status variable: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamResetKeyboardFailed");
    const doneLabel = makeGeneratedLabel("AdamResetKeyboardDone");
    return {
      ok: true,
      handled: true,
      lines: [
        "    call $FC93",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const readKey = line.match(/^(.+?)\s*=\s*await\s+key(?:\s+status\s+(.+))?$/i);
  if (readKey) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `await key requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const storeKey = emitStoreInt8FromA(readKey[1].trim());
    const storeStatus = readKey[2] ? emitStoreInt8FromA(readKey[2].trim()) : [];
    if (!storeKey || !storeStatus) {
      return { ok: false, handled: true, log: `await key requires a byte key variable and optional byte status variable: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamReadKeyFailed");
    const doneLabel = makeGeneratedLabel("AdamReadKeyDone");
    return {
      ok: true,
      handled: true,
      lines: [
        "    call $FC6C",
        `    jr nz,${failedLabel}`,
        ...storeKey,
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    xor a",
        ...storeKey,
        ...(readKey[2] ? ["    inc a", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const createFile = line.match(/^create\s+"([^"]+)"\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (createFile) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `adam create file requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const name = createFile[1].toUpperCase();
    if (!/^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) || name.replace(".", "").length > 10) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const sizeTerm = createFile[2].trim();
    const sizeType = resolveValueType?.(sizeTerm);
    const loadSize = sizeType === "u32"
      ? emitLoadSourceAddressIntoHL(sizeTerm)
      : emitLoadInt16IntoHL(sizeTerm);
    const storeStatus = createFile[3] ? emitStoreInt8FromA(createFile[3].trim()) : [];
    if (!loadSize || !storeStatus) {
      return { ok: false, handled: true, log: `create requires a 16-bit expression or u32 size and optional byte status variable: ${rawLine}` };
    }

    const nameLabel = makeGeneratedLabel("AdamCreateFileName");
    const codeLabel = makeGeneratedLabel("AdamCreateFileCode");
    const failedLabel = makeGeneratedLabel("AdamCreateFileFailed");
    const doneLabel = makeGeneratedLabel("AdamCreateFileDone");
    const encodedName = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
    if (!name.includes(".")) encodedName.push(2);
    encodedName.push(3);
    while (encodedName.length < 12) encodedName.push(0x20);
    const nameBytes = encodedName.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${nameLabel}:`,
        `    db ${nameBytes}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        ...loadSize,
        ...(sizeType === "u32" ? [
          "    ld e,(hl)",
          "    inc hl",
          "    ld d,(hl)",
          "    inc hl",
          "    ld c,(hl)",
          "    inc hl",
          "    ld b,(hl)"
        ] : [
          "    ex de,hl",
          "    ld bc,0"
        ]),
        `    ld hl,${nameLabel}`,
        `    ld a,${device}`,
        "    call $FCC9",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const findFile = line.match(/^(.+?)\s*=\s*find\s+"([^"]+)"\s+as\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (findFile) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `find requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const name = findFile[2].toUpperCase();
    if (!/^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) || name.replace(".", "").length > 10) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const infoTerm = findFile[3].trim();
    const info = resolveRecordInfo(infoTerm);
    const loadInfo = emitLoadSourceAddressIntoHL(infoTerm);
    const storeFound = emitStoreInt8FromA(findFile[1].trim());
    const storeStatus = findFile[4] ? emitStoreInt8FromA(findFile[4].trim()) : [];
    if (!loadInfo || info?.recordTypeName?.toLowerCase() !== "eosfile" || info?.byteSize !== 23 || !storeFound || !storeStatus) {
      return { ok: false, handled: true, log: `find requires an EosFile record, byte result, and optional byte status variable: ${rawLine}` };
    }
    const encodedName = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
    if (!name.includes(".")) encodedName.push(2);
    encodedName.push(3);
    while (encodedName.length < 12) encodedName.push(0x20);
    const nameBytes = encodedName.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    const nameLabel = makeGeneratedLabel("AdamFindFileName");
    const codeLabel = makeGeneratedLabel("AdamFindFileCode");
    const absentLabel = makeGeneratedLabel("AdamFindFileAbsent");
    const failedLabel = makeGeneratedLabel("AdamFindFileFailed");
    const clearLabel = makeGeneratedLabel("AdamFindFileClear");
    const doneLabel = makeGeneratedLabel("AdamFindFileDone");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    const clearInfo = [
      ...loadInfo,
      "    xor a",
      "    ld (hl),a",
      "    ld d,h",
      "    ld e,l",
      "    inc de",
      "    ld bc,22",
      "    ldir"
    ];
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${nameLabel}:`,
        `    db ${nameBytes}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        `    ld de,${nameLabel}`,
        "    push de",
        ...loadInfo,
        "    pop de",
        `    ld a,${device}`,
        "    call $FCCC",
        `    jr z,${doneLabel}`,
        "    cp $05",
        `    jr z,${absentLabel}`,
        `    jr ${failedLabel}`,
        `${absentLabel}:`,
        ...clearInfo,
        "    xor a",
        ...storeFound,
        ...storeStatus,
        `    jr ${clearLabel}`,
        `${failedLabel}:`,
        ...clearInfo,
        "    xor a",
        ...storeFound,
        ...(findFile[4] ? ["    inc a", ...storeStatus] : []),
        `    jr ${clearLabel}`,
        `${doneLabel}:`,
        "    ld a,1",
        ...storeFound,
        "    xor a",
        ...storeStatus,
        `${clearLabel}:`
      ]
    };
  }

  const fileExists = line.match(/^(.+?)\s*=\s*exists\s+"([^"]+)"(?:\s+status\s+(.+))?$/i);
  if (fileExists) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `exists requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const name = fileExists[2].toUpperCase();
    if (!/^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) || name.replace(".", "").length > 10) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const storeExists = emitStoreInt8FromA(fileExists[1].trim());
    const storeStatus = fileExists[3] ? emitStoreInt8FromA(fileExists[3].trim()) : [];
    if (!storeExists || !storeStatus) {
      return { ok: false, handled: true, log: `exists requires a byte result and optional byte status variable: ${rawLine}` };
    }
    const encodedName = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
    if (!name.includes(".")) encodedName.push(2);
    encodedName.push(3);
    while (encodedName.length < 12) encodedName.push(0x20);
    const nameBytes = encodedName.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    const nameLabel = makeGeneratedLabel("AdamExistsFileName");
    const codeLabel = makeGeneratedLabel("AdamExistsFileCode");
    const absentLabel = makeGeneratedLabel("AdamExistsFileAbsent");
    const failedLabel = makeGeneratedLabel("AdamExistsFileFailed");
    const doneLabel = makeGeneratedLabel("AdamExistsFileDone");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${nameLabel}:`,
        `    db ${nameBytes}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        `    ld de,${nameLabel}`,
        "    ld hl,$4200",
        `    ld a,${device}`,
        "    call $FCCC",
        `    jr z,${doneLabel}`,
        "    cp $05",
        `    jr z,${absentLabel}`,
        `    jr ${failedLabel}`,
        `${absentLabel}:`,
        "    xor a",
        ...storeExists,
        ...storeStatus,
        `    jr ${doneLabel}_EXIT`,
        `${failedLabel}:`,
        "    xor a",
        ...storeExists,
        ...(fileExists[3] ? ["    inc a", ...storeStatus] : []),
        `    jr ${doneLabel}_EXIT`,
        `${doneLabel}:`,
        "    ld a,1",
        ...storeExists,
        "    xor a",
        ...storeStatus,
        `${doneLabel}_EXIT:`
      ]
    };
  }

  const recordSize = line.match(/^(.+?)\s*=\s*size\s+(?!")(.+)$/i);
  if (recordSize) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `size requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const target = recordSize[1].trim();
    const infoTerm = recordSize[2].trim();
    const info = resolveRecordInfo(infoTerm);
    const loadInfo = emitLoadSourceAddressIntoHL(infoTerm);
    const loadTarget = emitLoadSourceAddressIntoHL(target);
    if (resolveValueType?.(target) !== "u32" || !loadTarget || !loadInfo || info?.recordTypeName?.toLowerCase() !== "eosfile" || info?.byteSize !== 23) {
      return { ok: false, handled: true, log: `size record form requires a u32 result and EosFile source: ${rawLine}` };
    }
    const emptyLabel = makeGeneratedLabel("AdamSizeRecordEmpty");
    const shiftLabel = makeGeneratedLabel("AdamSizeRecordShift");
    const noCarryLabel = makeGeneratedLabel("AdamSizeRecordNoCarry");
    const storeLabel = makeGeneratedLabel("AdamSizeRecordStore");
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadInfo,
        "    ld de,19",
        "    add hl,de",
        "    ld e,(hl)",
        "    inc hl",
        "    ld d,(hl)",
        "    inc hl",
        "    ld c,(hl)",
        "    inc hl",
        "    ld b,(hl)",
        "    push bc",
        "    ex de,hl",
        "    ld a,h",
        "    or l",
        `    jr z,${emptyLabel}`,
        "    dec hl",
        "    ld de,0",
        "    ld b,10",
        `${shiftLabel}:`,
        "    add hl,hl",
        "    rl e",
        "    rl d",
        `    djnz ${shiftLabel}`,
        "    pop bc",
        "    add hl,bc",
        `    jr nc,${noCarryLabel}`,
        "    inc de",
        `${noCarryLabel}:`,
        `    jr ${storeLabel}`,
        `${emptyLabel}:`,
        "    pop bc",
        "    ld hl,0",
        "    ld de,0",
        `${storeLabel}:`,
        "    push de",
        "    push hl",
        ...loadTarget,
        "    ex de,hl",
        "    pop hl",
        "    ld a,l",
        "    ld (de),a",
        "    inc de",
        "    ld a,h",
        "    ld (de),a",
        "    inc de",
        "    pop hl",
        "    ld a,l",
        "    ld (de),a",
        "    inc de",
        "    ld a,h",
        "    ld (de),a"
      ]
    };
  }

  const fileSize = line.match(/^(.+?)\s*=\s*size\s+"([^"]+)"(?:\s+status\s+(.+))?$/i);
  if (fileSize) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `size requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const name = fileSize[2].toUpperCase();
    if (!/^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) || name.replace(".", "").length > 10) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const target = fileSize[1].trim();
    const loadTarget = emitLoadSourceAddressIntoHL(target);
    const storeStatus = fileSize[3] ? emitStoreInt8FromA(fileSize[3].trim()) : [];
    if (resolveValueType?.(target) !== "u32" || !loadTarget || !storeStatus) {
      return { ok: false, handled: true, log: `size requires a u32 result and optional byte status variable: ${rawLine}` };
    }
    const encodedName = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
    if (!name.includes(".")) encodedName.push(2);
    encodedName.push(3);
    while (encodedName.length < 12) encodedName.push(0x20);
    const nameBytes = encodedName.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    const nameLabel = makeGeneratedLabel("AdamSizeFileName");
    const codeLabel = makeGeneratedLabel("AdamSizeFileCode");
    const failedLabel = makeGeneratedLabel("AdamSizeFileFailed");
    const emptyLabel = makeGeneratedLabel("AdamSizeFileEmpty");
    const shiftLabel = makeGeneratedLabel("AdamSizeFileShift");
    const storeLabel = makeGeneratedLabel("AdamSizeFileStore");
    const noCarryLabel = makeGeneratedLabel("AdamSizeFileNoCarry");
    const doneLabel = makeGeneratedLabel("AdamSizeFileDone");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${nameLabel}:`,
        `    db ${nameBytes}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        `    ld de,${nameLabel}`,
        "    ld hl,$4200",
        `    ld a,${device}`,
        "    call $FCCC",
        `    jr nz,${failedLabel}`,
        "    ld hl,($4213)",
        "    ld a,h",
        "    or l",
        `    jr z,${emptyLabel}`,
        "    dec hl",
        "    ld de,0",
        "    ld b,10",
        `${shiftLabel}:`,
        "    add hl,hl",
        "    rl e",
        "    rl d",
        `    djnz ${shiftLabel}`,
        "    ld bc,($4215)",
        "    add hl,bc",
        `    jr nc,${noCarryLabel}`,
        "    inc de",
        `${noCarryLabel}:`,
        `    jr ${storeLabel}`,
        `${emptyLabel}:`,
        "    ld de,0",
        `${storeLabel}:`,
        "    push de",
        "    push hl",
        ...loadTarget,
        "    ex de,hl",
        "    pop hl",
        "    ld a,l",
        "    ld (de),a",
        "    inc de",
        "    ld a,h",
        "    ld (de),a",
        "    inc de",
        "    pop hl",
        "    ld a,l",
        "    ld (de),a",
        "    inc de",
        "    ld a,h",
        "    ld (de),a",
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        ...loadTarget,
        "    ex de,hl",
        "    xor a",
        "    ld (de),a",
        "    inc de",
        "    ld (de),a",
        "    inc de",
        "    ld (de),a",
        "    inc de",
        "    ld (de),a",
        ...(fileSize[3] ? ["    inc a", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const deleteFile = line.match(/^delete\s+"([^"]+)"(?:\s+status\s+(.+))?$/i);
  if (deleteFile) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `delete requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const name = deleteFile[1].toUpperCase();
    if (!/^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) || name.replace(".", "").length > 10) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const storeStatus = deleteFile[2] ? emitStoreInt8FromA(deleteFile[2].trim()) : [];
    if (!storeStatus) {
      return { ok: false, handled: true, log: `delete requires an optional byte status variable: ${rawLine}` };
    }

    const nameLabel = makeGeneratedLabel("AdamDeleteFileName");
    const codeLabel = makeGeneratedLabel("AdamDeleteFileCode");
    const failedLabel = makeGeneratedLabel("AdamDeleteFileFailed");
    const doneLabel = makeGeneratedLabel("AdamDeleteFileDone");
    const encodedName = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
    if (!name.includes(".")) encodedName.push(2);
    encodedName.push(3);
    while (encodedName.length < 12) encodedName.push(0x20);
    const nameBytes = encodedName.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${nameLabel}:`,
        `    db ${nameBytes}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        `    ld hl,${nameLabel}`,
        `    ld a,${device}`,
        "    call $FCE1",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const renameFile = line.match(/^rename\s+"([^"]+)"\s+to\s+"([^"]+)"(?:\s+status\s+(.+))?$/i);
  if (renameFile) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `rename requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const oldName = renameFile[1].toUpperCase();
    const newName = renameFile[2].toUpperCase();
    const validName = (name) => /^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) && name.replace(".", "").length <= 10;
    if (!validName(oldName) || !validName(newName)) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const storeStatus = renameFile[3] ? emitStoreInt8FromA(renameFile[3].trim()) : [];
    if (!storeStatus) {
      return { ok: false, handled: true, log: `rename requires an optional byte status variable: ${rawLine}` };
    }
    const encodeName = (name) => {
      const encoded = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
      if (!name.includes(".")) encoded.push(2);
      encoded.push(3);
      while (encoded.length < 12) encoded.push(0x20);
      return encoded.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    };
    const oldLabel = makeGeneratedLabel("AdamRenameOldName");
    const newLabel = makeGeneratedLabel("AdamRenameNewName");
    const codeLabel = makeGeneratedLabel("AdamRenameFileCode");
    const failedLabel = makeGeneratedLabel("AdamRenameFileFailed");
    const doneLabel = makeGeneratedLabel("AdamRenameFileDone");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${oldLabel}:`,
        `    db ${encodeName(oldName)}`,
        `${newLabel}:`,
        `    db ${encodeName(newName)}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        `    ld de,${oldLabel}`,
        `    ld hl,${newLabel}`,
        `    ld a,${device}`,
        "    call $FCDE",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const writeFile = line.match(/^write\s+"([^"]+)"\s+from\s+(.+?)\s+count\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (writeFile) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `adam write file requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const name = writeFile[1].toUpperCase();
    if (!/^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) || name.replace(".", "").length > 10) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const loadSource = emitLoadSourceAddressIntoHL(writeFile[2].trim());
    const loadCount = emitLoadInt16IntoHL(writeFile[3].trim());
    const storeStatus = writeFile[4] ? emitStoreInt8FromA(writeFile[4].trim()) : [];
    if (!loadSource || !loadCount || !storeStatus) {
      return { ok: false, handled: true, log: `write requires an addressable source, 16-bit count, and optional byte status variable: ${rawLine}` };
    }

    const nameLabel = makeGeneratedLabel("AdamWriteFileName");
    const codeLabel = makeGeneratedLabel("AdamWriteFileCode");
    const writeFailedLabel = makeGeneratedLabel("AdamWriteFileWriteFailed");
    const failedLabel = makeGeneratedLabel("AdamWriteFileFailed");
    const doneLabel = makeGeneratedLabel("AdamWriteFileDone");
    const encodedName = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
    if (!name.includes(".")) encodedName.push(2);
    encodedName.push(3);
    while (encodedName.length < 12) encodedName.push(0x20);
    const nameBytes = encodedName.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${nameLabel}:`,
        `    db ${nameBytes}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        `    ld a,${device}`,
        "    ld b,2",
        `    ld hl,${nameLabel}`,
        "    call $FCC0",
        `    jr nz,${failedLabel}`,
        "    push af",
        ...loadCount,
        "    ld b,h",
        "    ld c,l",
        ...loadSource,
        "    pop af",
        "    push af",
        "    call $FCD5",
        `    jr nz,${writeFailedLabel}`,
        "    pop bc",
        "    ld a,b",
        "    call $FCC3",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${writeFailedLabel}:`,
        "    pop bc",
        "    ld a,b",
        "    call $FCC3",
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const readFileAssignment = line.match(/^(.+?)\s*=\s*read\s+"([^"]+)"\s+count\s+(.+?)(?:\s+status\s+(.+))?$/i);
  const readFile = readFileAssignment
    ? [readFileAssignment[0], readFileAssignment[2], readFileAssignment[1], readFileAssignment[3], readFileAssignment[4]]
    : null;
  if (readFile) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `read file requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const name = readFile[1].toUpperCase();
    if (!/^[A-Z0-9 _-]+(?:\.[A-Z0-9 _-]+)?$/.test(name) || name.replace(".", "").length > 10) {
      return { ok: false, handled: true, log: `EOS filenames must contain at most 10 base/extension characters: ${rawLine}` };
    }
    const loadBuffer = emitLoadSourceAddressIntoHL(readFile[2].trim());
    const loadCount = emitLoadInt16IntoHL(readFile[3].trim());
    const storeStatus = readFile[4] ? emitStoreInt8FromA(readFile[4].trim()) : [];
    if (!loadBuffer || !loadCount || !storeStatus) {
      return { ok: false, handled: true, log: `read requires an addressable buffer, 16-bit count, and optional byte status variable: ${rawLine}` };
    }

    const nameLabel = makeGeneratedLabel("AdamFileName");
    const codeLabel = makeGeneratedLabel("AdamReadFileCode");
    const readCompleteLabel = makeGeneratedLabel("AdamReadFileReadComplete");
    const readFailedLabel = makeGeneratedLabel("AdamReadFileReadFailed");
    const failedLabel = makeGeneratedLabel("AdamReadFileFailed");
    const doneLabel = makeGeneratedLabel("AdamReadFileDone");
    const encodedName = [...name].map((char) => char === "." ? 2 : char.charCodeAt(0));
    if (!name.includes(".")) encodedName.push(2);
    encodedName.push(3);
    while (encodedName.length < 12) encodedName.push(0x20);
    const nameBytes = encodedName.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        `    jr ${codeLabel}`,
        `${nameLabel}:`,
        `    db ${nameBytes}`,
        `${codeLabel}:`,
        "    ld hl,$4000",
        "    ld de,$4100",
        "    call $FCBA",
        `    ld a,${device}`,
        "    ld b,1",
        `    ld hl,${nameLabel}`,
        "    call $FCC0",
        `    jr nz,${failedLabel}`,
        "    push af",
        ...loadCount,
        "    ld b,h",
        "    ld c,l",
        ...loadBuffer,
        "    pop af",
        "    push af",
        "    call $FCD2",
        `    jr z,${readCompleteLabel}`,
        "    cp $0A",
        `    jr nz,${readFailedLabel}`,
        `${readCompleteLabel}:`,
        "    pop bc",
        "    ld a,b",
        "    call $FCC3",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${readFailedLabel}:`,
        "    pop bc",
        "    ld a,b",
        "    call $FCC3",
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const catalogAssignment = line.match(/^(.+?)\s*=\s*catalog\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (catalogAssignment) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `catalog requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const loadBuffer = emitLoadSourceAddressIntoHL(catalogAssignment[2].trim());
    const directoryInfo = resolveRecordInfo(catalogAssignment[2].trim());
    const storeCount = emitStoreInt8FromA(catalogAssignment[1].trim());
    const storeStatus = catalogAssignment[3] ? emitStoreInt8FromA(catalogAssignment[3].trim()) : [];
    if (!loadBuffer || directoryInfo?.byteSize !== 1024 || !storeCount || !storeStatus) {
      return { ok: false, handled: true, log: `catalog requires a packed 1024-byte directory record, byte count result, and optional byte status variable: ${rawLine}` };
    }
    const scanLabel = makeGeneratedLabel("AdamCatalogScan");
    const scanDoneLabel = makeGeneratedLabel("AdamCatalogScanDone");
    const failedLabel = makeGeneratedLabel("AdamCatalogFailed");
    const doneLabel = makeGeneratedLabel("AdamCatalogDone");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadBuffer,
        "    ld de,1",
        "    ld bc,0",
        `    ld a,${device}`,
        "    call $FCF3",
        `    jr nz,${failedLabel}`,
        ...loadBuffer,
        "    ld b,39",
        "    ld c,0",
        `${scanLabel}:`,
        "    ld a,(hl)",
        "    cp $ff",
        `    jr z,${scanDoneLabel}`,
        "    or a",
        `    jr z,${scanDoneLabel}`,
        "    inc c",
        "    ld de,26",
        "    add hl,de",
        `    djnz ${scanLabel}`,
        `${scanDoneLabel}:`,
        "    ld a,c",
        ...storeCount,
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    xor a",
        ...storeCount,
        ...(catalogAssignment[3] ? ["    inc a", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const submitAdamNet = line.match(/^submit\s+(.+?)\s+to\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (submitAdamNet) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `submit requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const requestTerm = submitAdamNet[1].trim();
    const slotTerm = submitAdamNet[2].trim();
    const requestInfo = resolveRecordInfo(requestTerm);
    const loadRequest = emitLoadSourceAddressIntoHL(requestTerm);
    const loadSlot = emitLoadInt8ValueInto?.("a", slotTerm) || emitLoadInt8TermIntoA?.(slotTerm);
    const storeStatus = submitAdamNet[3] ? emitStoreInt8FromA(submitAdamNet[3].trim()) : [];
    if (requestInfo?.recordTypeName?.toLowerCase() !== "adamnetdcb" || requestInfo?.byteSize !== 21 || !loadRequest || !loadSlot || !storeStatus) {
      return { ok: false, handled: true, log: `submit requires an AdamNetDcb record, byte slot, and optional byte status variable: ${rawLine}` };
    }
    const locateLabel = makeGeneratedLabel("AdamNetLocateDcb");
    const copyLabel = makeGeneratedLabel("AdamNetCopyDcb");
    const waitLabel = makeGeneratedLabel("AdamNetWaitDcb");
    const failedLabel = makeGeneratedLabel("AdamNetSubmitFailed");
    const doneLabel = makeGeneratedLabel("AdamNetSubmitDone");
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadSlot,
        "    ld b,a",
        "    ld a,($FEC3)",
        "    cp b",
        `    jr z,${failedLabel}`,
        `    jr c,${failedLabel}`,
        "    ld a,b",
        "    ld hl,$FEC4",
        "    ld de,21",
        "    or a",
        `    jr z,${copyLabel}`,
        `${locateLabel}:`,
        "    add hl,de",
        "    dec a",
        `    jr nz,${locateLabel}`,
        `${copyLabel}:`,
        "    push hl",
        ...loadRequest,
        "    pop de",
        "    push de",
        "    ld bc,21",
        "    ldir",
        "    pop hl",
        `${waitLabel}:`,
        "    ld a,(hl)",
        "    bit 7,a",
        `    jr z,${waitLabel}`,
        "    push af",
        "    push hl",
        ...loadRequest,
        "    ex de,hl",
        "    pop hl",
        "    ld bc,21",
        "    ldir",
        "    pop af",
        "    cp $80",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const deviceResult = line.match(/^(.+?)\s*=\s*device\s+result\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (deviceResult) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `device result requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const storeCode = emitStoreInt8FromA(deviceResult[1].trim());
    const loadDevice = emitLoadInt8ValueInto?.("a", deviceResult[2].trim()) || emitLoadInt8TermIntoA?.(deviceResult[2].trim());
    const storeStatus = deviceResult[3] ? emitStoreInt8FromA(deviceResult[3].trim()) : [];
    if (!storeCode || !loadDevice || !storeStatus) {
      return { ok: false, handled: true, log: `device result requires a byte result, a byte device ID, and an optional byte status variable: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamDeviceResultFailed");
    const doneLabel = makeGeneratedLabel("AdamDeviceResultDone");
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadDevice,
        "    call $FC75",
        "    push af",
        `    jr nz,${failedLabel}`,
        "    pop af",
        ...storeCode,
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    pop af",
        ...storeCode,
        ...(deviceResult[3] ? ["    ld a,1", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const deviceStatus = line.match(/^(.+?)\s*=\s*device\s+status\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (deviceStatus) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `device status requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const storeFlags = emitStoreInt8FromA(deviceStatus[1].trim());
    const loadDevice = emitLoadInt8ValueInto?.("a", deviceStatus[2].trim()) || emitLoadInt8TermIntoA?.(deviceStatus[2].trim());
    const storeStatus = deviceStatus[3] ? emitStoreInt8FromA(deviceStatus[3].trim()) : [];
    if (!storeFlags || !loadDevice || !storeStatus) {
      return { ok: false, handled: true, log: `device status requires byte flags, a byte device ID, and an optional byte status variable: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamDeviceStatusFailed");
    const doneLabel = makeGeneratedLabel("AdamDeviceStatusDone");
    return {
      ok: true,
      handled: true,
      lines: [
        "    push iy",
        ...loadDevice,
        "    call $FC7E",
        `    jr nz,${failedLabel}`,
        "    ld a,(iy+20)",
        "    pop iy",
        ...storeFlags,
        "    xor a",
        ...storeStatus,
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    pop iy",
        "    xor a",
        ...storeFlags,
        ...(deviceStatus[3] ? ["    inc a", ...storeStatus] : []),
        `${doneLabel}:`
      ]
    };
  }

  const resetDevice = line.match(/^reset\s+device\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (resetDevice) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `reset device requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const loadDevice = emitLoadInt8ValueInto?.("a", resetDevice[1].trim()) || emitLoadInt8TermIntoA?.(resetDevice[1].trim());
    const storeStatus = resetDevice[2] ? emitStoreInt8FromA(resetDevice[2].trim()) : [];
    if (!loadDevice || !storeStatus) {
      return { ok: false, handled: true, log: `reset device requires a byte device ID and an optional byte status variable: ${rawLine}` };
    }
    const failedLabel = makeGeneratedLabel("AdamDeviceResetFailed");
    const doneLabel = makeGeneratedLabel("AdamDeviceResetDone");
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadDevice,
        "    call $FC90",
        `    jr nz,${failedLabel}`,
        "    xor a",
        `    jr ${doneLabel}`,
        `${failedLabel}:`,
        "    ld a,1",
        `${doneLabel}:`,
        ...storeStatus
      ]
    };
  }

  const writeBlock = line.match(/^block\s+write\s+(.+?)\s+from\s+(.+?)(?:\s+status\s+(.+))?$/i);
  if (writeBlock) {
    if (!supportsEos) {
      return { ok: false, handled: true, log: `adam write block requires an EOS-capable ADAM target: ${rawLine}` };
    }
    const loadBlock = emitLoadInt16IntoHL(writeBlock[1].trim());
    const loadBuffer = emitLoadSourceAddressIntoHL(writeBlock[2].trim());
    const storeStatus = writeBlock[3] ? emitStoreInt8FromA(writeBlock[3].trim()) : [];
    if (!loadBlock || !loadBuffer || !storeStatus) {
      return { ok: false, handled: true, log: `block write requires a 16-bit block, addressable buffer, and optional byte status variable: ${rawLine}` };
    }
    const successLabel = makeGeneratedLabel("AdamWriteBlockSuccess");
    const device = buildContext.medium === "ddp" ? "$08" : "$04";
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadBlock,
        "    ex de,hl",
        ...loadBuffer,
        "    ld bc,0",
        `    ld a,${device}`,
        "    call $FCF6",
        "    ld a,0",
        `    jr z,${successLabel}`,
        "    inc a",
        `${successLabel}:`,
        ...storeStatus
      ]
    };
  }

  const readBlockAssignment = line.match(/^(.+?)\s*=\s*read\s+block\s+(.+?)(?:\s+status\s+(.+))?$/i);
  const readBlock = readBlockAssignment
    ? [readBlockAssignment[0], readBlockAssignment[2], readBlockAssignment[1], readBlockAssignment[3]]
    : null;
  if (!readBlock) return { ok: true, handled: false, lines: [] };

  if (!supportsEos) {
    return { ok: false, handled: true, log: `read block requires an EOS-capable ADAM target: ${rawLine}` };
  }

  const loadBlock = emitLoadInt16IntoHL(readBlock[1].trim());
  const loadBuffer = emitLoadSourceAddressIntoHL(readBlock[2].trim());
  const storeStatus = readBlock[3] ? emitStoreInt8FromA(readBlock[3].trim()) : [];
  if (!loadBlock || !loadBuffer || !storeStatus) {
    return { ok: false, handled: true, log: `read block requires a 16-bit block, addressable buffer, and optional byte status variable: ${rawLine}` };
  }

  const successLabel = makeGeneratedLabel("AdamReadBlockSuccess");
  const device = buildContext.medium === "ddp" ? "$08" : "$04";
  return {
    ok: true,
    handled: true,
    lines: [
      ...loadBlock,
      "    ex de,hl",
      ...loadBuffer,
      "    ld bc,0",
      `    ld a,${device}`,
      "    call $FCF3",
      "    ld a,0",
      `    jr z,${successLabel}`,
      "    inc a",
      `${successLabel}:`,
      ...storeStatus
    ]
  };
}
