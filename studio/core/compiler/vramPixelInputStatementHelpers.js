import { checkVramPixelDeprecation } from "./deprecations.js";
import { emitLoadRoutineByteInputsFromTokens } from "./routineRegisterLoadHelpers.js";

export function handleVramPixelInputStatement({
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
  tryEvaluateConstantExpression,
  nmiKnownOff = false
}) {
  const _dep = checkVramPixelDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const vpoke = line.match(/^vpoke\s+(.+)\s*,\s*(.+)$/i);
  if (vpoke) {
    const loadAddress = emitLoadVramAddressIntoHL(vpoke[1]);
    const loadValue = emitLoadInt8ValueInto("a", vpoke[2]);
    if (!loadAddress || !loadValue) {
      return { handled: true, ok: false, log: `vpoke requires a valid VRAM destination and byte value: ${rawLine}` };
    }
    body.push(...loadAddress, "    push hl", ...loadValue, "    pop hl", "    call AMY_VPOKE");
    return { handled: true, ok: true };
  }

  const vpeek = line.match(/^vpeek\s+(.+)\s+into\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?)$/i);
  if (vpeek) {
    const loadAddress = emitLoadVramAddressIntoHL(vpeek[1]);
    const targetInfo = resolveValueType(vpeek[2]);
    const storeTarget = emitStoreInt8FromA(vpeek[2]);
    if (!loadAddress || targetInfo !== "int8" || !storeTarget) {
      return { handled: true, ok: false, log: `vpeek requires a valid VRAM source and byte target: ${rawLine}` };
    }
    body.push(...loadAddress, "    call AMY_VPEEK", ...storeTarget);
    return { handled: true, ok: true };
  }

  const mode1Pixel = line.match(/^(pset|plot|preset)\s+(.+?)\s*,\s*(.+?)(?:\s+color\s+(.+))?$/i);
  if (mode1Pixel) {
    const opcode = mode1Pixel[1].toLowerCase();
    if (!currentGraphicsMode || currentGraphicsMode === "mode1_text" || currentGraphicsMode === "mode2_text") {
      return { handled: true, ok: false, log: `${opcode} requires a bitmap or multicolor graphics mode: ${rawLine}` };
    }
    if (opcode === "preset" && mode1Pixel[4]) {
      return { handled: true, ok: false, log: `preset does not accept a color clause: ${rawLine}` };
    }
    if (mode1Pixel[4]) {
      const routine = currentGraphicsMode === "multicolor" ? "AMY_MODE3_PSET" : "AMY_MODE2_PSET_COLOR";
      const loadPoint = emitLoadRoutineByteInputsFromTokens({
        routineName: routine,
        values: { b: mode1Pixel[2], c: mode1Pixel[3], a: mode1Pixel[4] },
        emitLoadInt8ValueInto,
        emitLoadInt8ValueIntoPreserving
      });
      if (!loadPoint) return { handled: true, ok: false, log: `${opcode} requires byte X,Y,color values: ${rawLine}` };
      body.push(...loadPoint, `    call ${routine}`);
    } else {
      const routine = opcode === "preset" ? "AMY_MODE2_PRESET" : "AMY_MODE2_PSET";
      const loadPoint = emitLoadRoutineByteInputsFromTokens({
        routineName: routine,
        values: { b: mode1Pixel[2], c: mode1Pixel[3] },
        emitLoadInt8ValueInto,
        emitLoadInt8ValueIntoPreserving
      });
      if (!loadPoint) return { handled: true, ok: false, log: `${opcode} requires byte X,Y coordinates: ${rawLine}` };
      body.push(...loadPoint, `    call ${routine}`);
    }
    return { handled: true, ok: true };
  }

  const lineStmt = line.match(/^line\s+(.+?)\s*,\s*(.+?)\s+to\s+(.+?)\s*,\s*(.+?)(?:\s+color\s+(.+))?$/i);
  if (lineStmt) {
    if (!currentGraphicsMode || currentGraphicsMode === "mode1_text" || currentGraphicsMode === "mode2_text") {
      return { handled: true, ok: false, log: `line requires a bitmap or multicolor graphics mode: ${rawLine}` };
    }
    if (currentGraphicsMode === "multicolor") {
      if (!lineStmt[5]) return { handled: true, ok: false, log: `line in multicolor mode requires a color clause: ${rawLine}` };
      const loadLine = emitLoadRoutineByteInputsFromTokens({
        routineName: "AMY_MODE3_LINE",
        values: { b: lineStmt[1], c: lineStmt[2], d: lineStmt[3], e: lineStmt[4], a: lineStmt[5] },
        emitLoadInt8ValueInto,
        emitLoadInt8ValueIntoPreserving
      });
      if (!loadLine) return { handled: true, ok: false, log: `line requires byte X1,Y1,X2,Y2,color values: ${rawLine}` };
      body.push(...loadLine, "    call AMY_MODE3_LINE");
    } else if (lineStmt[5]) {
      const loadLine = emitLoadRoutineByteInputsFromTokens({
        routineName: "AMY_MODE2_LINE_COLOR",
        values: { b: lineStmt[1], c: lineStmt[2], d: lineStmt[3], e: lineStmt[4], a: lineStmt[5] },
        emitLoadInt8ValueInto,
        emitLoadInt8ValueIntoPreserving
      });
      if (!loadLine) return { handled: true, ok: false, log: `line requires byte X1,Y1,X2,Y2,color values: ${rawLine}` };
      body.push(...loadLine, "    call AMY_MODE2_LINE_COLOR");
    } else {
      const loadLine = emitLoadRoutineByteInputsFromTokens({
        routineName: "AMY_MODE2_LINE",
        values: { b: lineStmt[1], c: lineStmt[2], d: lineStmt[3], e: lineStmt[4] },
        emitLoadInt8ValueInto,
        emitLoadInt8ValueIntoPreserving
      });
      if (!loadLine) return { handled: true, ok: false, log: `line requires byte X1,Y1,X2,Y2 coordinates: ${rawLine}` };
      body.push(...loadLine, "    call AMY_MODE2_LINE");
    }
    return { handled: true, ok: true };
  }

  const boxStmt = line.match(/^box\s+(.+?)\s*,\s*(.+?)\s+to\s+(.+?)\s*,\s*(.+?)\s+color\s+(.+)$/i);
  if (boxStmt) {
    if (currentGraphicsMode && currentGraphicsMode !== "multicolor") {
      return { handled: true, ok: false, log: `box requires 'graphics mode 3 multicolor' to be active: ${rawLine}` };
    }
    const loadBox = emitLoadRoutineByteInputsFromTokens({
      routineName: "AMY_MODE3_BOX",
      values: { b: boxStmt[1], c: boxStmt[2], d: boxStmt[3], e: boxStmt[4], a: boxStmt[5] },
      emitLoadInt8ValueInto,
      emitLoadInt8ValueIntoPreserving
    });
    if (!loadBox) {
      return { handled: true, ok: false, log: `box requires byte X1,Y1,X2,Y2 coordinates and a color: ${rawLine}` };
    }
    body.push(...loadBox, "    call AMY_MODE3_BOX");
    return { handled: true, ok: true };
  }

  const mode1Circle = line.match(/^circle\s+(.+?)\s*,\s*(.+?)\s+radius\s+(.+?)(?:\s+color\s+(.+))?$/i);
  if (mode1Circle) {
    if (!currentGraphicsMode || currentGraphicsMode === "mode1_text" || currentGraphicsMode === "mode2_text") {
      return { handled: true, ok: false, log: `circle requires a bitmap or multicolor graphics mode: ${rawLine}` };
    }
    const loadRadius = emitLoadInt8ValueIntoPreserving("d", mode1Circle[3], ["b", "c"]);
    const loadY = emitLoadInt8ValueIntoPreserving("c", mode1Circle[2], ["b"]);
    const loadX = emitLoadInt8ValueInto("b", mode1Circle[1]);
    if (!loadX || !loadY || !loadRadius) {
      return { handled: true, ok: false, log: `circle requires byte X,Y and radius values: ${rawLine}` };
    }
    if (mode1Circle[4]) {
      const loadColor = emitLoadInt8ValueIntoPreserving("a", mode1Circle[4], ["bc", "de"]);
      if (!loadColor) return { handled: true, ok: false, log: `circle color requires a byte expression: ${rawLine}` };
      body.push(...loadX, ...loadY, ...loadRadius, ...loadColor, "    call AMY_MODE2_CIRCLE_COLOR");
    } else {
      body.push(...loadX, ...loadY, ...loadRadius, "    call AMY_MODE2_CIRCLE");
    }
    return { handled: true, ok: true };
  }

  const waitFire = line.match(/^wait\s+(no\s+)?fire(?:\s+on\s+joypad\s+([12]))?$/i);
  if (waitFire) {
    const waitLabel = makeGeneratedLabel("WaitFire");
    const pad = waitFire[2] || null;
    body.push(`${waitLabel}:`);
    body.push("    halt");
    if (pad) {
      body.push(`    ld a,(JOYPAD_${pad})`);
      body.push("    and $F0");
    } else {
      body.push("    ld a,(JOYPAD_1)");
      body.push("    and $F0");
      body.push("    ld d,a");
      body.push("    ld a,(JOYPAD_2)");
      body.push("    and $F0");
      body.push("    or d");
    }
    body.push(`    jr ${waitFire[1] ? "nz" : "z"},${waitLabel}`);
    return { handled: true, ok: true };
  }
  const waitFramesOrPress = line.match(/^wait\s+(.+?)\s+frames?\s+or\s+press(?:\s+on\s+joypad\s+([12]))?$/i);
  if (waitFramesOrPress) {
    const loadCount = emitLoadInt16IntoHL(waitFramesOrPress[1]);
    if (!loadCount) {
      return { handled: true, ok: false, log: `wait frames or press requires a 16-bit frame count: ${rawLine}` };
    }
    const loopLabel = makeGeneratedLabel("WaitOrPress");
    const doneLabel = makeGeneratedLabel("WaitOrPressDone");
    const pad = waitFramesOrPress[2] || null;
    body.push(...loadCount);
    body.push("    ld a,h");
    body.push("    or l");
    body.push(`    jr z,${doneLabel}`);
    body.push(`${loopLabel}:`);
    body.push("    halt");
    if (pad) {
      body.push(`    ld a,(JOYPAD_${pad})`);
      body.push("    and $F0");
      body.push(`    jr nz,${doneLabel}`);
    } else {
      body.push("    ld a,(JOYPAD_1)");
      body.push("    and $F0");
      body.push("    ld d,a");
      body.push("    ld a,(JOYPAD_2)");
      body.push("    and $F0");
      body.push("    or d");
      body.push(`    jr nz,${doneLabel}`);
    }
    body.push("    dec hl");
    body.push("    ld a,h");
    body.push("    or l");
    body.push(`    jr nz,${loopLabel}`);
    body.push(`${doneLabel}:`);
    return { handled: true, ok: true };
  }

  const constantToken = "(?:\\d+|\\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*)";
  const sleepAfter = line.match(new RegExp(`^sleep\\s+after\\s+(${constantToken})\\s+seconds?(?:\\s+on\\s+joypad\\s+([12]))?$`, "i"));
  const crtSafePause = line.match(new RegExp(`^pause\\s+until\\s+press\\s+and\\s+release(?:\\s+on\\s+joypad\\s+([12]))?\\s+sleep\\s+after\\s+(${constantToken})\\s+seconds?$`, "i"));
  if (sleepAfter || crtSafePause) {
    const seconds = tryEvaluateConstantExpression?.(sleepAfter ? sleepAfter[1] : crtSafePause[2]);
    const pad = sleepAfter ? sleepAfter[2] : crtSafePause[1];
    const routine = sleepAfter
      ? "AMY_SLEEP_SERVICE"
      : "AMY_PAUSE_PRESS_RELEASE_BLANK";
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 1092) {
      return { handled: true, ok: false, log: `CRT-safe pause requires a compile-time constant timeout from 1 to 1092 seconds: ${rawLine}` };
    }
    if (nmiKnownOff) {
      return { handled: true, ok: false, log: `CRT-safe pause requires NMI enabled; the current VDP state proves NMI is off: ${rawLine}` };
    }
    body.push(
      `    ld hl,${seconds * 60}`,
      `    ld de,${seconds * 50}`,
      `    ld a,${pad || 0}`,
      `    call ${routine}`
    );
    return { handled: true, ok: true };
  }
  const pauseUntilPress = line.match(/^pause\s+until\s+press(\s+and\s+release)?(?:\s+on\s+joypad\s+([12]))?$/i);
  if (pauseUntilPress) {
    const releaseLabel = makeGeneratedLabel("PauseRelease");
    const pressLabel = makeGeneratedLabel("PausePress");
    const finalReleaseLabel = pauseUntilPress[1] ? makeGeneratedLabel("PauseFinalRelease") : null;
    const pad = pauseUntilPress[2] || null;
    body.push(`${releaseLabel}:`);
    body.push("    halt");
    if (pad) {
      body.push(`    ld a,(JOYPAD_${pad})`);
      body.push("    and $F0");
      body.push(`    jr nz,${releaseLabel}`);
      body.push(`${pressLabel}:`);
      body.push("    halt");
      body.push(`    ld a,(JOYPAD_${pad})`);
      body.push("    and $F0");
      body.push(`    jr z,${pressLabel}`);
    } else {
      body.push("    ld a,(JOYPAD_1)");
      body.push("    and $F0");
      body.push("    ld d,a");
      body.push("    ld a,(JOYPAD_2)");
      body.push("    and $F0");
      body.push("    or d");
      body.push(`    jr nz,${releaseLabel}`);
      body.push(`${pressLabel}:`);
      body.push("    halt");
      body.push("    ld a,(JOYPAD_1)");
      body.push("    and $F0");
      body.push("    ld d,a");
      body.push("    ld a,(JOYPAD_2)");
      body.push("    and $F0");
      body.push("    or d");
      body.push(`    jr z,${pressLabel}`);
    }
    if (finalReleaseLabel) {
      body.push(`${finalReleaseLabel}:`);
      body.push("    halt");
      if (pad) {
        body.push(`    ld a,(JOYPAD_${pad})`);
        body.push("    and $F0");
      } else {
        body.push("    ld a,(JOYPAD_1)");
        body.push("    and $F0");
        body.push("    ld d,a");
        body.push("    ld a,(JOYPAD_2)");
        body.push("    and $F0");
        body.push("    or d");
      }
      body.push(`    jr nz,${finalReleaseLabel}`);
    }
    return { handled: true, ok: true };
  }
  const waitKey = line.match(/^wait\s+key\s*([0-9])(?:\s+on\s+keypad\s+([12]))?$/i)
    || line.match(/^wait\s+key\s+([0-9])(?:\s+on\s+keypad\s+([12]))?$/i);
  if (waitKey) {
    const waitLabel = makeGeneratedLabel("WaitKey");
    const pad = waitKey[2] || "1";
    body.push(`${waitLabel}:`);
    body.push("    halt");
    body.push(`    ld a,(KEYPAD_${pad})`);
    body.push(`    cp ${waitKey[1]}`);
    body.push(`    jr nz,${waitLabel}`);
    return { handled: true, ok: true };
  }

  const waitKeyRelease = line.match(/^wait\s+key\s+release(?:\s+on\s+keypad\s+([12]))?$/i);
  if (waitKeyRelease) {
    const waitLabel = makeGeneratedLabel("WaitKeyRelease");
    const pad = waitKeyRelease[1] || "1";
    body.push(`${waitLabel}:`);
    body.push("    halt");
    body.push(`    ld a,(KEYPAD_${pad})`);
    body.push("    cp $FF");
    body.push(`    jr nz,${waitLabel}`);
    return { handled: true, ok: true };
  }

  const chooseSpriteMenu = line.match(new RegExp(`^choose\\s+menu\\s+(.+?)\\s+to\\s+(.+?)\\s+into\\s+([A-Za-z_][A-Za-z0-9_]*)\\s+cursor\\s+sprite\\s+(.+?)\\s+at\\s+(.+?)\\s*,\\s*(.+?)\\s+step\\s+(.+?)(?:\\s+on\\s+joypad\\s+([12]))?(?:\\s+sleep\\s+after\\s+(${constantToken})\\s+seconds?)?$`, "i"));
  const chooseTileMenu = line.match(new RegExp(`^choose\\s+menu\\s+(.+?)\\s+to\\s+(.+?)\\s+into\\s+([A-Za-z_][A-Za-z0-9_]*)\\s+cursor\\s+(.+?)\\s+at\\s+(.+?)\\s*,\\s*(.+?)\\s+step\\s+(.+?)(?:\\s+clear\\s+(.+?))?(?:\\s+on\\s+joypad\\s+([12]))?(?:\\s+sleep\\s+after\\s+(${constantToken})\\s+seconds?)?$`, "i"));
  const chooseMenu = chooseSpriteMenu || chooseTileMenu;
  if (chooseMenu) {
    const spriteCursor = Boolean(chooseSpriteMenu);
    const [, minToken, maxToken, target, cursorToken, xToken, yToken, stepToken] = chooseMenu;
    const clearToken = spriteCursor ? null : (chooseMenu[8] || "$20");
    const padToken = (spriteCursor ? chooseMenu[8] : chooseMenu[9]) || "1";
    const secondsToken = spriteCursor ? chooseMenu[9] : chooseMenu[10];
    const targetInfo = getRuntimeInfo(target);
    const byteLoads = [minToken, maxToken, cursorToken, xToken, yToken, stepToken, ...(clearToken ? [clearToken] : [])]
      .map((token) => emitLoadInt8ValueInto("a", token));
    if (!targetInfo || targetInfo.type !== "int8" || byteLoads.some((lines) => !lines)) {
      return { handled: true, ok: false, log: `choose menu requires byte-sized bounds, target, cursor, coordinates, and step: ${rawLine}` };
    }
    const spriteIndex = spriteCursor ? tryEvaluateConstantExpression?.(cursorToken) : null;
    if (spriteCursor && (!Number.isInteger(spriteIndex) || spriteIndex < 0 || spriteIndex > 31)) {
      return { handled: true, ok: false, log: `choose menu sprite cursor requires a constant sprite index from 0 to 31: ${rawLine}` };
    }
    let seconds = 0;
    if (secondsToken) {
      seconds = tryEvaluateConstantExpression?.(secondsToken);
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 1092) {
        return { handled: true, ok: false, log: `CRT-safe menu choice requires a compile-time constant timeout from 1 to 1092 seconds: ${rawLine}` };
      }
      if (nmiKnownOff) {
        return { handled: true, ok: false, log: `CRT-safe menu choice requires NMI enabled; the current VDP state proves NMI is off: ${rawLine}` };
      }
    }

    const drawLabel = makeGeneratedLabel("ChooseMenuDraw");
    const initialReleaseLabel = makeGeneratedLabel("ChooseMenuInitialRelease");
    const waitLabel = makeGeneratedLabel("ChooseMenuWait");
    const keypadDoneLabel = makeGeneratedLabel("ChooseMenuKeypadDone");
    const keypadConfirmLabel = makeGeneratedLabel("ChooseMenuKeypadConfirm");
    const upLabel = makeGeneratedLabel("ChooseMenuUp");
    const upStoreLabel = makeGeneratedLabel("ChooseMenuUpStore");
    const upCommitLabel = makeGeneratedLabel("ChooseMenuUpCommit");
    const downLabel = makeGeneratedLabel("ChooseMenuDown");
    const downStoreLabel = makeGeneratedLabel("ChooseMenuDownStore");
    const downCommitLabel = makeGeneratedLabel("ChooseMenuDownCommit");
    const confirmLabel = makeGeneratedLabel("ChooseMenuConfirm");
    const drawRoutineLabel = makeGeneratedLabel("ChooseMenuDrawCursor");
    const waitReleaseRoutineLabel = makeGeneratedLabel("ChooseMenuWaitRelease");
    const doneLabel = makeGeneratedLabel("ChooseMenuDone");
    const cursorY = `(${yToken}) + ((${target}) - (${minToken})) * (${stepToken})`;
    const emitDrawCall = (tile) => spriteCursor
      ? [`    call ${drawRoutineLabel}`]
      : [...(emitLoadInt8ValueInto("a", tile) || []), `    call ${drawRoutineLabel}`];
    const emitDrawRoutine = () => {
      if (spriteCursor) {
        const loadInputs = [
          ...(emitLoadInt8ValueInto("e", xToken) || []),
          ...(emitLoadInt8ValueIntoPreserving("d", cursorY, ["e"]) || [])
        ];
        return [
          ...loadInputs,
          "    ld a,e",
          `    ld (AMY_SPRITE_TABLE+${spriteIndex * 4 + 1}),a`,
          "    ld a,d",
          `    ld (AMY_SPRITE_TABLE+${spriteIndex * 4}),a`,
          "    call AMY_UPDATE_SPRITES",
          "    ret"
        ];
      }
      const loadInputs = [
        ...(emitLoadInt8ValueInto("e", xToken) || []),
        ...(emitLoadInt8ValueIntoPreserving("d", cursorY, ["e"]) || [])
      ];
      return ["    push af", ...loadInputs, "    pop af", "    call AMY_PUT_CHAR_AT", "    ret"];
    };
    const eraseLines = spriteCursor ? [] : emitDrawCall(clearToken);
    const drawLines = emitDrawCall(cursorToken);
    const drawRoutineLines = emitDrawRoutine();
    if ((!spriteCursor && !eraseLines.length) || !drawLines.length || !drawRoutineLines.length) {
      return { handled: true, ok: false, log: `choose menu could not compute its cursor position: ${rawLine}` };
    }

    body.push(
      ...drawLines,
      `    call ${waitReleaseRoutineLabel}`,
      `    jp ${waitLabel}`,
      `${drawLabel}:`,
      ...drawLines,
      `${waitLabel}:`,
      "    halt"
    );
    if (seconds) {
      body.push(
        `    ld hl,${seconds * 60}`,
        `    ld de,${seconds * 50}`,
        `    ld a,${padToken}`,
        "    call AMY_SLEEP_SERVICE"
      );
    }
    body.push(
      `    ld a,(KEYPAD_${padToken})`,
      "    cp $FF",
      `    jr z,${keypadDoneLabel}`,
      ...emitLoadInt8ValueInto("b", minToken),
      "    cp b",
      `    jr c,${keypadDoneLabel}`,
      ...emitLoadInt8ValueInto("b", maxToken),
      "    cp b",
      `    jr z,${keypadConfirmLabel}`,
      `    jr c,${keypadConfirmLabel}`,
      `${keypadDoneLabel}:`,
      `    ld a,(JOYPAD_${padToken})`,
      "    bit 0,a",
      `    jr nz,${upLabel}`,
      "    bit 2,a",
      `    jr nz,${downLabel}`,
      "    and $C0",
      `    jr nz,${confirmLabel}`,
      `    jr ${waitLabel}`,
      `${upLabel}:`,
      ...eraseLines,
      ...emitLoadInt8ValueInto("a", target),
      ...emitLoadInt8ValueInto("b", minToken),
      "    cp b",
      `    jr nz,${upStoreLabel}`,
      ...emitLoadInt8ValueInto("a", maxToken),
      `    jr ${upCommitLabel}`,
      `${upStoreLabel}:`,
      "    dec a",
      `${upCommitLabel}:`,
      ...emitStoreInt8FromA(target),
      `    call ${waitReleaseRoutineLabel}`,
      `    jp ${drawLabel}`,
      `${downLabel}:`,
      ...eraseLines,
      ...emitLoadInt8ValueInto("a", target),
      ...emitLoadInt8ValueInto("b", maxToken),
      "    cp b",
      `    jr nz,${downStoreLabel}`,
      ...emitLoadInt8ValueInto("a", minToken),
      `    jr ${downCommitLabel}`,
      `${downStoreLabel}:`,
      "    inc a",
      `${downCommitLabel}:`,
      ...emitStoreInt8FromA(target),
      `    call ${waitReleaseRoutineLabel}`,
      `    jp ${drawLabel}`,
      `${keypadConfirmLabel}:`,
      "    and $0F",
      ...emitStoreInt8FromA(target),
      `    jr ${confirmLabel}`,
      `${confirmLabel}:`,
      `    call ${waitReleaseRoutineLabel}`,
      `    jp ${doneLabel}`,
      `${drawRoutineLabel}:`,
      ...drawRoutineLines,
      `${waitReleaseRoutineLabel}:`,
      `${initialReleaseLabel}:`,
      "    halt",
      `    ld a,(JOYPAD_${padToken})`,
      "    or a",
      `    jr nz,${initialReleaseLabel}`,
      `    ld a,(KEYPAD_${padToken})`,
      "    cp $FF",
      `    jr nz,${initialReleaseLabel}`,
      "    ret",
      `${doneLabel}:`
    );
    return { handled: true, ok: true };
  }

  const chooseKeypad = line.match(new RegExp(`^choose\\s+keypad\\s+(.+?)\\s+to\\s+(.+?)\\s+into\\s+([A-Za-z_][A-Za-z0-9_]*)(?:\\s+on\\s+keypad\\s+([12]))?(?:\\s+sleep\\s+after\\s+(${constantToken})\\s+seconds?)?$`, "i"));
  if (chooseKeypad) {
    const targetInfo = getRuntimeInfo(chooseKeypad[3]);
    const loadMin = emitLoadInt8ValueInto("b", chooseKeypad[1]);
    const loadMax = emitLoadInt8ValueInto("c", chooseKeypad[2]);
    if (!targetInfo || targetInfo.type !== "int8" || !loadMin || !loadMax) {
      return { handled: true, ok: false, log: `choose keypad requires byte-sized min, max, and target: ${rawLine}` };
    }
    body.push(...loadMin);
    body.push(...loadMax);
    if (chooseKeypad[5]) {
      const seconds = tryEvaluateConstantExpression?.(chooseKeypad[5]);
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 1092) {
        return { handled: true, ok: false, log: `CRT-safe keypad choice requires a compile-time constant timeout from 1 to 1092 seconds: ${rawLine}` };
      }
      if (nmiKnownOff) {
        return { handled: true, ok: false, log: `CRT-safe keypad choice requires NMI enabled; the current VDP state proves NMI is off: ${rawLine}` };
      }
      body.push(
        `    ld hl,${seconds * 60}`,
        `    ld de,${seconds * 50}`,
        `    ld a,${chooseKeypad[4] || 0}`,
        "    call AMY_CHOICE_KEYPAD_RANGE_BLANK"
      );
    } else {
      body.push("    call AMY_CHOICE_KEYPAD_RANGE");
    }
    body.push(...emitStoreInt8FromA(chooseKeypad[3]));
    return { handled: true, ok: true };
  }

  return { handled: false };
}
