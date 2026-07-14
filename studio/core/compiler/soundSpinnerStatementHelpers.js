import { checkSoundDeprecation } from "./deprecations.js";

export function handleSoundSpinnerStatement({
  line,
  rawLine,
  emitLoadInt8Into,
  emitLoadInt8ValueInto,
  emitLoadInt16IntoHL,
  tryEvaluateCompileTimeNumericExpression,
  normalizeExpression,
  makeGeneratedLabel,
  resolveAddressSymbol
}) {
  const _dep = checkSoundDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const setSoundTable = line.match(/^set\s+sound\s+table\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+areas\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (setSoundTable) {
    const lines = [];
    if (setSoundTable[2]) {
      const loadAreaCount = emitLoadInt8Into("a", setSoundTable[2]);
      if (!loadAreaCount) return { ok: false, handled: true, log: `set sound table areas requires a byte count: ${rawLine}` };
      lines.push(...loadAreaCount, "    ld (AMY_SOUND_AREA_COUNT),a");
    }
    lines.push(`    ld hl,${resolveAddressSymbol(setSoundTable[1])}`);
    lines.push("    call AMY_SET_SOUND_TABLE");
    lines.push("    ld a,1");
    lines.push("    ld (AMY_SOUND_ENABLED),a");
    return { ok: true, handled: true, lines };
  }

  const playSong = line.match(/^play\s+song\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (playSong) {
    return {
      ok: true,
      handled: true,
      lines: [
        `    ld hl,${resolveAddressSymbol(playSong[1])}`,
        "    ld a,1",
        "    ld (AMY_SOUND_ENABLED),a",
        "    ld (AMY_MUSIC_ENABLED),a",
        "    call AMY_PLAY_SONG"
      ]
    };
  }

  if (/^stop\s+song$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    xor a", "    ld (AMY_MUSIC_ENABLED),a", "    call AMY_STOP_SONG"] };
  }

  if (/^sound\s+runtime\s+on$/i.test(line) || /^music\s+runtime\s+on$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    ld a,1", "    ld (AMY_SOUND_ENABLED),a"] };
  }

  if (/^sound\s+runtime\s+off$/i.test(line) || /^music\s+runtime\s+off$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: ["    xor a", "    ld (AMY_SOUND_ENABLED),a", "    ld (AMY_MUSIC_ENABLED),a", "    call TURN_OFF_SOUND"]
    };
  }

  if (/^enable\s+spinner$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_ENABLE_SPINNER"] };
  }
  if (/^disable\s+spinner$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_DISABLE_SPINNER"] };
  }
  if (/^reset\s+spinner\s+1$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_RESET_SPINNER1"] };
  }
  if (/^reset\s+spinner\s+2$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_RESET_SPINNER2"] };
  }
  if (/^reset\s+spinners$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_RESET_SPINNERS"] };
  }

  const playSound = line.match(/^play\s+sound\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)$/i);
  if (playSound) {
    const loadSound = emitLoadInt8Into("b", playSound[1]);
    if (!loadSound) return { ok: false, handled: true, log: `play sound requires a byte sound index: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: ["    ld a,1", "    ld (AMY_SOUND_ENABLED),a", ...loadSound, "    call AMY_PLAY_SOUND"]
    };
  }

  const stopSound = line.match(/^stop\s+sound\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)$/i);
  if (stopSound) {
    const loadSound = emitLoadInt8Into("b", stopSound[1]);
    if (!loadSound) return { ok: false, handled: true, log: `stop sound requires a byte sound index: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadSound, "    call AMY_STOP_SOUND"] };
  }

  if (/^stop\s+all(?:\s+sounds?)?$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: ["    xor a", "    ld (AMY_MUSIC_ENABLED),a", "    call AMY_STOP_SONG", "    call AMY_MUTE_ALL"]
    };
  }

  if (/^mute\s+all$/i.test(line) || /^stop\s+all\s+sound$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: ["    xor a", "    ld (AMY_MUSIC_ENABLED),a", "    call AMY_MUTE_ALL"]
    };
  }

  const waitAlone = line.match(/^wait$/i) || line.match(/^wait\s+frame$/i);
  const waitVblank = waitAlone
    || line.match(/^wait\s+vblank(?:s)?(?:\s+(.+))?$/i)
    || line.match(/^wait\s+(.+?)\s+frames?$/i);
  if (waitVblank) {
    const countToken = normalizeExpression(waitVblank[1] || "1");
    const constantCount = typeof tryEvaluateCompileTimeNumericExpression === "function"
      ? tryEvaluateCompileTimeNumericExpression(countToken)
      : null;
    if (Number.isInteger(constantCount)) {
      if (constantCount <= 0) return { ok: true, handled: true, lines: [] };
      if (constantCount > 0xFFFF) return { ok: false, handled: true, log: `wait frames requires a 16-bit frame count: ${rawLine}` };
      return { ok: true, handled: true, lines: [`    ld hl,${constantCount}`, "    call AMY_WAIT_FRAMES_SAFE"] };
    }
    const loadCount = emitLoadInt16IntoHL ? emitLoadInt16IntoHL(countToken) : null;
    if (!loadCount) return { ok: false, handled: true, log: `wait frames requires a 16-bit frame count: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadCount,
        "    call AMY_WAIT_FRAMES_SAFE"
      ]
    };
  }

  const playDSound = line.match(/^play\s+dsound\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+step\s+(\d+))?$/i);
  if (playDSound) {
    const step = playDSound[2] !== undefined ? parseInt(playDSound[2], 10) : 0;
    const nmiOffLabel = makeGeneratedLabel("DsoundNmiWasOff");
    const doneLabel = makeGeneratedLabel("DsoundDone");
    return {
      ok: true,
      handled: true,
      lines: [
        "    ld a,1",
        "    ld (NO_NMI),a",
        "    ld a,($73C4)",
        "    push af",
        "    and $DF",
        "    ld ($73C4),a",
        "    ld c,a",
        "    ld b,1",
        "    call WRITE_REGISTER",
        "    call READ_REGISTER",
        `    ld hl,${resolveAddressSymbol(playDSound[1])}`,
        `    ld c,${step}`,
        "    call AMY_PLAY_DSOUND",
        "    pop af",
        "    ld ($73C4),a",
        "    push af",
        "    ld c,a",
        "    ld b,1",
        "    call WRITE_REGISTER",
        "    pop af",
        "    and $20",
        `    jp z,${nmiOffLabel}`,
        "    call READ_REGISTER",
        "    xor a",
        "    ld (NO_NMI),a",
        "    ei",
        `    jp ${doneLabel}`,
        `${nmiOffLabel}:`,
        "    xor a",
        "    ld (NO_NMI),a",
        `${doneLabel}:`
      ]
    };
  }

  return { handled: false };
}
