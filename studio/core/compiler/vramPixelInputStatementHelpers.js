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
  currentGraphicsMode
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

  const readJoypad = line.match(/^read\s+joypad\s+([12])\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (readJoypad) {
    const info = getRuntimeInfo(readJoypad[2]);
    if (!info || info.type !== "int8") return { handled: true, ok: false, log: `read joypad target must be a byte RAM variable: ${rawLine}` };
    body.push(`    ld a,(${readJoypad[1] === "1" ? "JOYPAD_1" : "JOYPAD_2"})`);
    body.push(...emitStoreInt8FromA(readJoypad[2]));
    return { handled: true, ok: true };
  }

  const readKeypad = line.match(/^read\s+keypad\s+([12])\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (readKeypad) {
    const info = getRuntimeInfo(readKeypad[2]);
    if (!info || info.type !== "int8") return { handled: true, ok: false, log: `read keypad target must be a byte RAM variable: ${rawLine}` };
    body.push(`    ld a,(${readKeypad[1] === "1" ? "KEYPAD_1" : "KEYPAD_2"})`);
    body.push(...emitStoreInt8FromA(readKeypad[2]));
    return { handled: true, ok: true };
  }

  const readSpinner = line.match(/^read\s+spinner\s+([12])\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (readSpinner) {
    const info = getRuntimeInfo(readSpinner[2]);
    if (!info || info.type !== "int8") return { handled: true, ok: false, log: `read spinner target must be a byte RAM variable: ${rawLine}` };
    body.push(`    ld a,(${readSpinner[1] === "1" ? "SPINNER_1" : "SPINNER_2"})`);
    body.push(...emitStoreInt8FromA(readSpinner[2]));
    return { handled: true, ok: true };
  }

  const readFrame = line.match(/^read\s+frame\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (readFrame) {
    const info = getRuntimeInfo(readFrame[1]);
    if (!info || info.kind === "array" || (info.type !== "int8" && info.type !== "int16")) {
      return { handled: true, ok: false, log: `read frame target must be a byte or word RAM variable: ${rawLine}` };
    }
    if (info.type === "int8") {
      body.push("    ld a,(AMY_FRAME_COUNTER)");
      body.push(...emitStoreInt8FromA(readFrame[1]));
    } else {
      body.push("    ld hl,AMY_FRAME_COUNTER");
      body.push("    ld e,(hl)");
      body.push("    inc hl");
      body.push("    ld d,(hl)");
      body.push("    ex de,hl");
      body.push(...emitStoreInt16FromHL(readFrame[1]));
    }
    return { handled: true, ok: true };
  }

  const readVdpStatus = line.match(/^read\s+vdp\s+status\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (readVdpStatus) {
    const info = getRuntimeInfo(readVdpStatus[1]);
    if (!info || info.type !== "int8") return { handled: true, ok: false, log: `read vdp status target must be a byte RAM variable: ${rawLine}` };
    body.push("    ld a,(VDP_STATUS)");
    body.push(...emitStoreInt8FromA(readVdpStatus[1]));
    return { handled: true, ok: true };
  }

  const waitFire = line.match(/^wait\s+(no\s+)?fire(?:\s+on\s+joypad\s+([12]))?$/i);
  if (waitFire) {
    const waitLabel = makeGeneratedLabel("WaitFire");
    const pad = waitFire[2] || "1";
    body.push(`${waitLabel}:`);
    body.push("    halt");
    body.push(`    ld a,(JOYPAD_${pad})`);
    body.push("    bit 7,a");
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
      body.push("    bit 7,a");
      body.push(`    jr nz,${doneLabel}`);
    } else {
      body.push("    ld a,(JOYPAD_1)");
      body.push("    and $80");
      body.push("    ld d,a");
      body.push("    ld a,(JOYPAD_2)");
      body.push("    and $80");
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

  const pauseUntilPress = line.match(/^pause\s+until\s+press(?:\s+on\s+joypad\s+([12]))?$/i);
  if (pauseUntilPress) {
    const releaseLabel = makeGeneratedLabel("PauseRelease");
    const pressLabel = makeGeneratedLabel("PausePress");
    const pad = pauseUntilPress[1] || null;
    body.push(`${releaseLabel}:`);
    body.push("    halt");
    if (pad) {
      body.push(`    ld a,(JOYPAD_${pad})`);
      body.push("    bit 7,a");
      body.push(`    jr nz,${releaseLabel}`);
      body.push(`${pressLabel}:`);
      body.push("    halt");
      body.push(`    ld a,(JOYPAD_${pad})`);
      body.push("    bit 7,a");
      body.push(`    jr z,${pressLabel}`);
    } else {
      body.push("    ld a,(JOYPAD_1)");
      body.push("    and $80");
      body.push("    ld d,a");
      body.push("    ld a,(JOYPAD_2)");
      body.push("    and $80");
      body.push("    or d");
      body.push(`    jr nz,${releaseLabel}`);
      body.push(`${pressLabel}:`);
      body.push("    halt");
      body.push("    ld a,(JOYPAD_1)");
      body.push("    and $80");
      body.push("    ld d,a");
      body.push("    ld a,(JOYPAD_2)");
      body.push("    and $80");
      body.push("    or d");
      body.push(`    jr z,${pressLabel}`);
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

  const chooseKeypad = line.match(/^choose\s+keypad\s+(.+?)\s+to\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (chooseKeypad) {
    const targetInfo = getRuntimeInfo(chooseKeypad[3]);
    const loadMin = emitLoadInt8ValueInto("b", chooseKeypad[1]);
    const loadMax = emitLoadInt8ValueInto("c", chooseKeypad[2]);
    if (!targetInfo || targetInfo.type !== "int8" || !loadMin || !loadMax) {
      return { handled: true, ok: false, log: `choose keypad requires byte-sized min, max, and target: ${rawLine}` };
    }
    body.push(...loadMin);
    body.push(...loadMax);
    body.push("    call AMY_CHOICE_KEYPAD_RANGE");
    body.push(...emitStoreInt8FromA(chooseKeypad[3]));
    return { handled: true, ok: true };
  }

  return { handled: false };
}

