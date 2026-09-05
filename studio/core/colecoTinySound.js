const TINY_NOTE_PERIODS = Object.freeze([
  0x03ff,0x03f8,0x03db,0x03bf,0x03a4,0x0389,0x036f,0x0356,
  0x033e,0x0327,0x0310,0x02f9,0x02e3,0x02ce,0x02ba,0x02a6,
  0x0293,0x0280,0x026e,0x025c,0x024b,0x023a,0x022a,0x021a,
  0x020b,0x01fc,0x01ed,0x01df,0x01d1,0x01c4,0x01b7,0x01ab,
  0x019f,0x0193,0x0187,0x017c,0x0171,0x0167,0x015d,0x0153,
  0x0149,0x0140,0x0137,0x012e,0x0125,0x011d,0x0115,0x010d,
  0x0105,0x00fe,0x00f6,0x00ef,0x00e8,0x00e2,0x00db,0x00d5,
  0x00cf,0x00c9,0x00c3,0x00be,0x00b8,0x00b3,0x00ae,0x00a9,
  0x00a4,0x00a0,0x009b,0x0097,0x0092,0x008e,0x008a,0x0086,
  0x0082,0x007f,0x007b,0x0077,0x0074,0x0071,0x006d,0x006a,
  0x0067,0x0064,0x0061,0x005f,0x005c,0x0059,0x0056,0x0054,
  0x0052,0x0050,0x004d,0x004b,0x0049,0x0047,0x0045,0x0043,
  0x0041,0x003f,0x003d,0x003b,0x0039,0x0038,0x0036,0x0035,
  0x0033,0x0032,0x0030,0x002f,0x002d,0x002c,0x002b,0x002a
]);

function stripComment(line) {
  return String(line || "").replace(/;.*/, "");
}

function parseByte(token) {
  const value = String(token || "").trim();
  if (/^\$[0-9a-f]+$/i.test(value)) return Number.parseInt(value.slice(1), 16);
  if (/^0x[0-9a-f]+$/i.test(value)) return Number.parseInt(value.slice(2), 16);
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  return null;
}

function parseDb(line) {
  const match = stripComment(line).trim().match(/^(?:\.?db|defb)\s+(.+)$/i);
  if (!match) return null;
  const values = match[1].split(",").map(parseByte);
  return values.every((value) => Number.isInteger(value) && value >= 0 && value <= 255) ? values : null;
}

export function tinyNoteIndex(code) {
  return ((((code - 4) & 0x3f) * 2) + 1) % TINY_NOTE_PERIODS.length;
}

export function tinyNoteHasArpeggio(code) {
  return (((code - 4) & 0x40) !== 0);
}

function noteName(period, region = "NTSC") {
  const clock = region === "PAL" ? 3546893 : 3579545;
  const frequency = clock / (32 * period);
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return { frequency, name: `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}` };
}

export function tinyNoteChoices(region = "NTSC") {
  return Array.from({ length: 60 }, (_, index) => {
    const code = index + 4;
    const period = TINY_NOTE_PERIODS[tinyNoteIndex(code)];
    return { code, period, ...noteName(period, region) };
  });
}

export function tinyInstrumentEnvelope(values) {
  const stepAndCount = values?.[1] || 0;
  const rate = values?.[2] || 0;
  if (!stepAndCount) return null;
  return {
    step: stepAndCount >> 4,
    count: (stepAndCount & 0x0f) || 16,
    firstLength: (rate & 0x0f) || 16,
    stepLength: (rate >> 4) || 16
  };
}

export function replaceTinySoundByte(sourceText, label, byteIndex, value) {
  if (!Number.isInteger(byteIndex) || byteIndex < 0) throw new Error("Tiny Sound byte index must be non-negative.");
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error("Tiny Sound replacement must fit in one byte.");
  const newline = String(sourceText || "").includes("\r\n") ? "\r\n" : "\n";
  const lines = String(sourceText || "").split(/\r?\n/);
  const wanted = String(label || "").toLowerCase();
  let inside = false;
  let handlerSeen = false;
  let currentByte = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const clean = stripComment(lines[lineIndex]).trim();
    const foundLabel = clean.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
    if (foundLabel) {
      if (inside) break;
      inside = foundLabel[1].toLowerCase() === wanted;
      continue;
    }
    if (!inside) continue;
    if (/^(?:\.?dw|defw)\s+sndtiny_[12]\s*$/i.test(clean)) {
      handlerSeen = true;
      continue;
    }
    if (!handlerSeen) continue;
    const match = lines[lineIndex].match(/^(\s*(?:\.?db|defb)\s+)([^;]+)(.*)$/i);
    if (!match) continue;
    const tokens = match[2].split(",");
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      if (parseByte(tokens[tokenIndex]) === null) continue;
      if (currentByte === byteIndex) {
        const before = tokens[tokenIndex];
        const leading = before.match(/^\s*/)?.[0] || "";
        const trailing = before.match(/\s*$/)?.[0] || "";
        tokens[tokenIndex] = `${leading}$${value.toString(16).toUpperCase().padStart(2, "0")}${trailing}`;
        lines[lineIndex] = `${match[1]}${tokens.join(",")}${match[3]}`;
        return lines.join(newline);
      }
      currentByte += 1;
    }
  }
  throw new Error(`Tiny Sound byte ${byteIndex} was not found in ${label}.`);
}

export function readTinySoundLabel(sourceText, label) {
  const lines = String(sourceText || "").split(/\r?\n/);
  const wanted = String(label || "").toLowerCase();
  const start = lines.findIndex((line) => stripComment(line).trim().match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/)?.[1].toLowerCase() === wanted);
  if (start < 0) throw new Error(`Tiny Sound label ${label} was not found.`);
  const rows = [];
  let handler = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const clean = stripComment(lines[index]).trim();
    if (!clean) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(clean)) break;
    const bytes = parseDb(lines[index]);
    if (bytes) {
      rows.push(...bytes);
      continue;
    }
    const word = clean.match(/^(?:\.?dw|defw)\s+(sndtiny_[12])\s*$/i);
    if (word && rows.length === 1 && handler === null) {
      handler = word[1].toLowerCase();
      continue;
    }
    throw new Error(`Tiny Sound label ${label} contains unsupported source data.`);
  }
  if (!handler || ![0x44, 0x84].includes(rows[0])) throw new Error(`${label} is not a SPECIAL-04 Tiny Sound stream.`);
  return { header: rows[0], channel: rows[0] >> 6, handler, bytes: rows.slice(1) };
}

export function decodeTinySoundSource(sourceText, label, { region = "NTSC", maxCommands = 4096 } = {}) {
  const stream = readTinySoundLabel(sourceText, label);
  if (!stream.bytes.length) throw new Error(`Tiny Sound label ${label} has no tempo.`);
  const tempo = stream.bytes[0] || 256;
  const bytes = stream.bytes.slice(1);
  const commands = [];
  const previewEvents = [];
  let offset = 0;
  let frame = 0;
  let attenuation = 8;
  let instrumentDecay = 0;
  let instrumentRate = 0;
  let loop = false;
  let lastNote = null;
  function take(count, commandOffset) {
    if (offset + count > bytes.length) throw new Error(`Truncated Tiny Sound command at byte ${commandOffset}.`);
    const values = bytes.slice(offset, offset + count);
    offset += count;
    return values;
  }
  while (offset < bytes.length && commands.length < maxCommands) {
    const commandOffset = offset;
    const code = bytes[offset++];
    if (code === 0xff) {
      commands.push({ type: "loop", code, offset: commandOffset, startFrame: frame, frames: 0 });
      loop = true;
      break;
    }
    if (code === 0x00) {
      commands.push({ type: "sustain", code, offset: commandOffset, startFrame: frame, frames: tempo });
      if (lastNote) {
        const oldLength = lastNote.length;
        lastNote.length += tempo;
        if (lastNote.arpeggioPeriod) {
          for (let localFrame = oldLength; localFrame < lastNote.length; localFrame += 1) {
            lastNote.frequencyFrames.push({
              frame: localFrame,
              period: ((lastNote.startFrame + localFrame) & 1) ? lastNote.arpeggioPeriod : lastNote.period
            });
          }
        }
      }
      frame += tempo;
      continue;
    }
    if (code === 0x01) {
      commands.push({ type: "silence", code, offset: commandOffset, startFrame: frame, frames: tempo });
      lastNote = null;
      frame += tempo;
      continue;
    }
    if (code === 0x02) {
      const values = take(3, commandOffset);
      attenuation = values[0] >> 4;
      instrumentDecay = values[1];
      instrumentRate = values[2];
      commands.push({ type: "instrument", code, offset: commandOffset, values, attenuation, startFrame: frame, frames: 0 });
      continue;
    }
    if (code === 0x03) {
      const values = take(7, commandOffset);
      const period = values[0] | ((values[1] & 0x03) << 8);
      const event = { type: "note", channel: stream.channel, period, attenuation: values[1] >> 4, length: tempo, startFrame: frame };
      commands.push({ type: "special-note", code, offset: commandOffset, values, period, ...noteName(period, region), startFrame: frame, frames: event.length });
      previewEvents.push(event);
      lastNote = event;
      frame += event.length;
      continue;
    }
    if (code === 0xfe) {
      const event = {
        type: "frequency-volume-sweep",
        channel: stream.channel,
        period: 0x015f,
        attenuation: 1,
        length: tempo,
        durationFrames: tempo,
        startFrame: frame,
        frequencySweep: { step: 0x30, firstLength: 1, stepLength: 1 },
        volumeSweep: { step: 1, count: 13, firstLength: 2, stepLength: 2 }
      };
      commands.push({ type: "drum", code, offset: commandOffset, startFrame: frame, frames: tempo });
      previewEvents.push(event);
      lastNote = null;
      frame += tempo;
      continue;
    }
    const arpeggio = tinyNoteHasArpeggio(code);
    const arpeggioCode = arpeggio ? take(1, commandOffset)[0] : null;
    const period = TINY_NOTE_PERIODS[tinyNoteIndex(code)];
    const arpeggioPeriod = arpeggio ? TINY_NOTE_PERIODS[tinyNoteIndex(arpeggioCode)] : null;
    const named = noteName(period, region);
    const volumeSweep = tinyInstrumentEnvelope([attenuation << 4, instrumentDecay, instrumentRate]);
    const frequencyFrames = arpeggio
      ? Array.from({ length: tempo }, (_, localFrame) => ({ frame: localFrame, period: ((frame + localFrame) & 1) ? arpeggioPeriod : period }))
      : null;
    const event = {
      type: volumeSweep ? "volume-sweep" : "note",
      channel: stream.channel,
      period,
      attenuation,
      length: tempo,
      startFrame: frame,
      ...(volumeSweep ? { volumeSweep } : {}),
      ...(frequencyFrames ? { frequencyFrames, arpeggioPeriod } : {})
    };
    commands.push({ type: "note", code, offset: commandOffset, period, ...named, startFrame: frame, frames: tempo, arpeggioCode });
    previewEvents.push(event);
    lastNote = event;
    frame += tempo;
  }
  if (commands.length >= maxCommands) throw new Error(`Tiny Sound stream exceeds ${maxCommands} commands.`);
  return { ...stream, tempo, commands, previewEvents, loop, totalFrames: frame };
}

export function describeTinySoundCommand(command) {
  if (command.type === "note") return `${command.name} · code $${command.code.toString(16).toUpperCase().padStart(2,"0")} · ${command.frequency.toFixed(1)} Hz · ${command.frames} frames${command.arpeggioCode === null ? "" : ` · arpeggio $${command.arpeggioCode.toString(16).toUpperCase().padStart(2,"0")}`}`;
  if (command.type === "instrument") return `Instrument · attenuation ${command.attenuation} · $${command.values.map((v) => v.toString(16).toUpperCase().padStart(2,"0")).join(",$")}`;
  if (command.type === "special-note") return `Special note · ${command.name} · ${command.frequency.toFixed(1)} Hz`;
  if (command.type === "sustain") return `Sustain · ${command.frames} frames`;
  if (command.type === "silence") return `Silence · ${command.frames} frames`;
  if (command.type === "drum") return `Drum · ${command.frames} frames`;
  if (command.type === "loop") return "Loop to first command";
  return command.type;
}
