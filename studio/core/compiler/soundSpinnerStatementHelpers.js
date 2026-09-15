import { checkSoundDeprecation } from "./deprecations.js";

function splitTopLevelCommaExpressions(text) {
  const expressions = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (char === "," && depth === 0) {
      expressions.push(text.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) return null;
  }
  if (depth !== 0) return null;
  expressions.push(text.slice(start).trim());
  return expressions.every(Boolean) ? expressions : null;
}

export function handleSoundSpinnerStatement({
  line,
  rawLine,
  emitLoadInt8Into,
  emitLoadInt8ValueInto,
  emitLoadInt16IntoHL,
  tryEvaluateCompileTimeNumericExpression,
  normalizeExpression,
  makeGeneratedLabel,
  resolveAddressSymbol,
  emitLoadSourceAddressIntoHL,
  emitStoreInt8FromA
}) {
  const _dep = checkSoundDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  const validateSoundIndex = (expression) => {
    const value = tryEvaluateCompileTimeNumericExpression(expression);
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    if (!Number.isInteger(value) || value < 1 || value > 62) {
      return `Coleco BIOS sound indexes must be 1..62; index 63 aliases the free-area sentinel: ${rawLine}`;
    }
    return null;
  };

  const psgTone = line.match(/^psg\s+tone\s+(.+?)\s*,\s*(.+)$/i);
  if (psgTone) {
    const loadPeriod = emitLoadInt16IntoHL(psgTone[2]);
    const loadChannel = emitLoadInt8Into("b", psgTone[1]);
    if (!loadPeriod || !loadChannel) return { ok: false, handled: true, log: `psg tone requires a byte channel and 16-bit period: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadPeriod, ...loadChannel, "    call AMY_PSG_TONE"] };
  }

  const psgVolume = line.match(/^psg\s+volume\s+(.+?)\s*,\s*(.+)$/i);
  if (psgVolume) {
    const loadAttenuation = emitLoadInt8Into("c", psgVolume[2]);
    const loadChannel = emitLoadInt8Into("b", psgVolume[1]);
    if (!loadAttenuation || !loadChannel) return { ok: false, handled: true, log: `psg volume requires byte channel and attenuation values: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadAttenuation, ...loadChannel, "    call AMY_PSG_VOLUME"] };
  }

  const psgNoise = line.match(/^psg\s+noise\s+(.+?)\s*,\s*(.+)$/i);
  if (psgNoise) {
    const loadRate = emitLoadInt8Into("c", psgNoise[2]);
    const loadMode = emitLoadInt8Into("b", psgNoise[1]);
    if (!loadRate || !loadMode) return { ok: false, handled: true, log: `psg noise requires byte mode and rate values: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadRate, ...loadMode, "    call AMY_PSG_NOISE"] };
  }

  const voiceDetect = line.match(/^voice\s+detect\s+into\s+(.+)$/i);
  if (voiceDetect) {
    const store = emitStoreInt8FromA?.(voiceDetect[1].trim());
    if (!store) return { ok: false, handled: true, log: `voice detect into requires a byte variable: ${rawLine}` };
    return { ok: true, handled: true, lines: ["    call AMY_VOICE_DETECT", ...store] };
  }

  const voiceSpeak = line.match(/^voice\s+speak\s+(.+?)\s+using\s+(.+)$/i);
  if (voiceSpeak) {
    const loadModule = emitLoadInt8Into("b", voiceSpeak[2]);
    const loadPhrase = emitLoadSourceAddressIntoHL?.(voiceSpeak[1]);
    if (!loadModule || !loadPhrase) return { ok: false, handled: true, log: `voice speak requires a data block or word-table entry and a byte module value: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [...loadPhrase, ...loadModule, "    call AMY_VOICE_SPEAK"]
    };
  }

  const voiceStart = line.match(/^voice\s+start\s+(.+?)\s+using\s+(.+)$/i);
  if (voiceStart) {
    const loadModule = emitLoadInt8Into("b", voiceStart[2]);
    const loadPhrase = emitLoadSourceAddressIntoHL?.(voiceStart[1]);
    if (!loadModule || !loadPhrase) return { ok: false, handled: true, log: `voice start requires a data block or word-table entry and a byte module value: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [
        "    ld a,(NO_NMI)", "    push af", "    ld a,1", "    ld (NO_NMI),a",
        ...loadPhrase, ...loadModule, "    call AMY_VOICE_START",
        "    pop af", "    ld (NO_NMI),a"
      ]
    };
  }

  if (/^voice\s+stop$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: ["    ld a,(NO_NMI)", "    push af", "    ld a,1", "    ld (NO_NMI),a", "    call AMY_VOICE_STOP", "    pop af", "    ld (NO_NMI),a"]
    };
  }

  const voiceSpeaking = line.match(/^voice\s+speaking\s+into\s+(.+)$/i);
  if (voiceSpeaking) {
    const store = emitStoreInt8FromA?.(voiceSpeaking[1].trim());
    if (!store) return { ok: false, handled: true, log: `voice speaking into requires a byte variable: ${rawLine}` };
    return { ok: true, handled: true, lines: ["    call AMY_VOICE_SPEAKING", ...store] };
  }

  const voiceAllophone = line.match(/^voice\s+allophone\s+(.+?)\s+using\s+(.+)$/i);
  if (voiceAllophone) {
    const loadCode = emitLoadInt8Into("c", voiceAllophone[1]);
    const loadModule = emitLoadInt8Into("b", voiceAllophone[2]);
    if (!loadCode || !loadModule) return { ok: false, handled: true, log: `voice allophone requires byte allophone and module values: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadCode, ...loadModule, "    call AMY_VOICE_ALLOPHONE"] };
  }

  const voiceReady = line.match(/^voice\s+ready\s+(.+?)\s+into\s+(.+)$/i);
  if (voiceReady) {
    const loadModule = emitLoadInt8Into("b", voiceReady[1]);
    const store = emitStoreInt8FromA?.(voiceReady[2].trim());
    if (!loadModule || !store) return { ok: false, handled: true, log: `voice ready requires a byte module value and byte destination: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadModule, "    call AMY_VOICE_READY", ...store] };
  }

  const voiceReset = line.match(/^voice\s+reset\s+(.+)$/i);
  if (voiceReset) {
    const loadModule = emitLoadInt8Into("b", voiceReset[1]);
    if (!loadModule) return { ok: false, handled: true, log: `voice reset requires a byte module value: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadModule, "    call AMY_VOICE_RESET"] };
  }

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

  const playSounds = line.match(/^play\s+sounds\s+(.+)$/i);
  if (playSounds) {
    const soundExpressions = splitTopLevelCommaExpressions(playSounds[1]);
    if (!soundExpressions || soundExpressions.length < 2) {
      return { ok: false, handled: true, log: `play sounds requires at least two comma-separated byte sound indexes: ${rawLine}` };
    }
    const lines = ["    ld a,1", "    ld (AMY_SOUND_ENABLED),a"];
    for (const expression of soundExpressions) {
      const rangeError = validateSoundIndex(expression);
      if (rangeError) return { ok: false, handled: true, log: rangeError };
      const loadSound = emitLoadInt8Into("b", expression);
      if (!loadSound) return { ok: false, handled: true, log: `play sounds requires byte sound indexes: ${rawLine}` };
      lines.push(...loadSound, "    call AMY_PLAY_SOUND");
    }
    return { ok: true, handled: true, lines };
  }

  const playSound = line.match(/^play\s+sound\s+(.+)$/i);
  if (playSound) {
    const soundExpressions = splitTopLevelCommaExpressions(playSound[1]);
    if (soundExpressions?.length > 1) {
      return { ok: false, handled: true, log: `play sound accepts one index; use play sounds for a comma-separated list: ${rawLine}` };
    }
    const rangeError = validateSoundIndex(playSound[1]);
    if (rangeError) return { ok: false, handled: true, log: rangeError };
    const loadSound = emitLoadInt8Into("b", playSound[1]);
    if (!loadSound) return { ok: false, handled: true, log: `play sound requires a byte sound index: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: ["    ld a,1", "    ld (AMY_SOUND_ENABLED),a", ...loadSound, "    call AMY_PLAY_SOUND"]
    };
  }

  const stopSound = line.match(/^stop\s+sound\s+(.+)$/i);
  if (stopSound) {
    const rangeError = validateSoundIndex(stopSound[1]);
    if (rangeError) return { ok: false, handled: true, log: rangeError };
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

  if (/^mute\s+all$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: ["    xor a", "    ld (AMY_MUSIC_ENABLED),a", "    call AMY_MUTE_ALL"]
    };
  }

  const waitAlone = line.match(/^wait$/i);
  const waitVblank = waitAlone
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

  const playDSound = line.match(/^play\s+dsound\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+step\s+(\d+|\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*))?$/i);
  if (playDSound) {
    const step = playDSound[2] !== undefined
      ? tryEvaluateCompileTimeNumericExpression(playDSound[2])
      : 0;
    if (!Number.isInteger(step) || step < 0 || step > 255) {
      return { ok: false, handled: true, log: `play dsound step requires a compile-time byte constant: ${rawLine}` };
    }
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

  const playTriPcm = line.match(/^play\s+tripcm(?:\s+(compact|sequence))?\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  const playVoxPcmIndexed = line.match(/^play\s+voxpcm\s+([A-Za-z_][A-Za-z0-9_]*)\[(.+)\]$/i);
  const playVoxPcm = line.match(/^play\s+voxpcm\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (playTriPcm || playVoxPcm || playVoxPcmIndexed) {
    const dataSymbol = playVoxPcmIndexed?.[1] || playVoxPcm?.[1] || playTriPcm[2];
    const player = playVoxPcm || playVoxPcmIndexed
      ? "AMY_PLAY_TRIPCM_SEQUENCE"
      : playTriPcm[1]?.toLowerCase() === "sequence"
        ? "AMY_PLAY_TRIPCM_SEQUENCE"
        : playTriPcm[1]
          ? "AMY_PLAY_TRIPCM_COMPACT"
          : "AMY_PLAY_TRIPCM";
    const nmiOffLabel = makeGeneratedLabel("TriPcmNmiWasOff");
    const doneLabel = makeGeneratedLabel("TriPcmDone");
    const indexedLoad = playVoxPcmIndexed
      ? emitLoadInt8Into("a", playVoxPcmIndexed[2])
      : null;
    if (playVoxPcmIndexed && !indexedLoad) {
      return { ok: false, handled: true, log: `play voxpcm table index must be a byte expression: ${rawLine}` };
    }
    const loadSequence = indexedLoad
      ? [
          ...indexedLoad,
          "    ld l,a",
          "    ld h,0",
          "    add hl,hl",
          `    ld de,${resolveAddressSymbol(dataSymbol)}`,
          "    add hl,de",
          "    ld e,(hl)",
          "    inc hl",
          "    ld d,(hl)",
          "    ex de,hl"
        ]
      : [`    ld hl,${resolveAddressSymbol(dataSymbol)}`];
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
        ...loadSequence,
        `    call ${player}`,
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
