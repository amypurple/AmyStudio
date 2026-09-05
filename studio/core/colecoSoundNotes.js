const NOTE_NAMES = Object.freeze(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
const CLOCKS = Object.freeze({ NTSC: 3579545, PAL: 3546893 });

function byte(value) {
  return value & 0xff;
}

function nibbleLength(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > 16) throw new Error(`${label} must be 1..16.`);
  return value === 16 ? 0 : value;
}

function nibbleCount(value, label) {
  return nibbleLength(value, label);
}

export function noteFrequency(note, octave) {
  const index = NOTE_NAMES.indexOf(String(note || "").toUpperCase());
  if (index < 0 || !Number.isInteger(octave)) throw new Error(`Invalid musical note: ${note}${octave}`);
  return 440 * (2 ** ((((octave - 4) * 12) + index - 9) / 12));
}

export function notePeriod(note, octave, region = "NTSC") {
  const clock = CLOCKS[String(region || "NTSC").toUpperCase()];
  if (!clock) throw new Error(`Unknown video region: ${region}`);
  return Math.max(1, Math.round(clock / (32 * noteFrequency(note, octave))));
}

export function fadeParameters(length) {
  if (!Number.isInteger(length) || length < 1 || length > 255) throw new Error("Sound length must be 1..255.");
  const steps = 15;
  let stepLength = Math.max(1, Math.floor(length / steps));
  let firstLength = length - (stepLength * (steps - 1));
  stepLength = Math.min(16, stepLength);
  firstLength = Math.min(16, Math.max(1, firstLength));
  return [0x1f, ((stepLength === 16 ? 0 : stepLength) << 4) | (firstLength === 16 ? 0 : firstLength)];
}

function toneBytes(channel, note, octave, length, region, type, suffix = [], attenuation = 0) {
  if (!Number.isInteger(channel) || channel < 1 || channel > 3) throw new Error("Tone channel must be 1..3.");
  if (!Number.isInteger(length) || length < 1 || length > 256) throw new Error("Sound length must be 1..256.");
  if (!Number.isInteger(attenuation) || attenuation < 0 || attenuation > 15) throw new Error("Attenuation must be 0..15.");
  const period = notePeriod(note, octave, region);
  if (period > 0x3ff) throw new Error(`${note}${octave} is below the playable tone range.`);
  return [byte((channel << 6) | type), byte(period), (attenuation << 4) | ((period >> 8) & 0x03), length === 256 ? 0 : length, ...suffix];
}

export function encodeToneCommand({
  channel = 1,
  period,
  attenuation = 0,
  length,
  frequencySweep = null,
  volumeSweep = null
}) {
  if (!Number.isInteger(channel) || channel < 1 || channel > 3) throw new Error("Tone channel must be 1..3.");
  if (!Number.isInteger(period) || period < 1 || period > 0x3ff) throw new Error("Tone period must be 1..1023.");
  if (!Number.isInteger(attenuation) || attenuation < 0 || attenuation > 15) throw new Error("Attenuation must be 0..15.");
  if (!Number.isInteger(length) || length < 1 || length > 256) throw new Error("Sound length must be 1..256.");
  const type = (frequencySweep ? 1 : 0) | (volumeSweep ? 2 : 0);
  const output = [
    (channel << 6) | type,
    byte(period),
    (attenuation << 4) | ((period >> 8) & 0x03),
    length === 256 ? 0 : length
  ];
  output.push(...encodeSweepParameters(frequencySweep, volumeSweep));
  return output;
}

function encodeSweepParameters(frequencySweep, volumeSweep) {
  const output = [];
  if (frequencySweep) {
    const stepLength = nibbleLength(frequencySweep.stepLength, "Frequency step length");
    const firstLength = nibbleLength(frequencySweep.firstLength, "Frequency first-step length");
    if (!Number.isInteger(frequencySweep.step) || frequencySweep.step < -128 || frequencySweep.step > 127) {
      throw new Error("Frequency step must be -128..127.");
    }
    output.push((stepLength << 4) | firstLength, byte(frequencySweep.step));
  }
  if (volumeSweep) {
    if (!Number.isInteger(volumeSweep.step) || volumeSweep.step < 0 || volumeSweep.step > 15) {
      throw new Error("Volume step must be 0..15.");
    }
    const count = nibbleCount(volumeSweep.count, "Volume step count");
    const stepLength = nibbleLength(volumeSweep.stepLength, "Volume step length");
    const firstLength = nibbleLength(volumeSweep.firstLength, "Volume first-step length");
    output.push((volumeSweep.step << 4) | count, (stepLength << 4) | firstLength);
  }
  return output;
}

export function encodeToneNote({ channel = 1, note, octave, length, region = "NTSC", volume = 15, fade = false }) {
  if (!Number.isInteger(volume) || volume < 0 || volume > 15) throw new Error("Volume must be 0..15.");
  const attenuation = 15 - volume;
  if (!fade) return toneBytes(channel, note, octave, length, region, 0x00, [], attenuation);
  const [stepAndCount, lengths] = fadeParameters(length);
  return encodeToneCommand({
    channel,
    period: notePeriod(note, octave, region),
    attenuation,
    length,
    volumeSweep: {
      step: stepAndCount >> 4,
      count: stepAndCount & 0x0f,
      stepLength: lengths >> 4 || 16,
      firstLength: lengths & 0x0f || 16
    }
  });
}

export const COLECO_NOISE_MODES = Object.freeze([
  "Periodic · clock / 512",
  "Periodic · clock / 1024",
  "Periodic · clock / 2048",
  "Periodic · Tone 3",
  "White · clock / 512",
  "White · clock / 1024",
  "White · clock / 2048",
  "White · Tone 3"
]);

export function encodeNoiseCommand({ noise = 4, volume = 15, length, fade = false, frequencySweep = null, volumeSweep = null }) {
  if (!Number.isInteger(noise) || noise < 0 || noise > 7) throw new Error("Noise mode must be 0..7.");
  if (!Number.isInteger(volume) || volume < 0 || volume > 15) throw new Error("Volume must be 0..15.");
  if (!Number.isInteger(length) || length < 1 || length > 256) throw new Error("Sound length must be 1..256.");
  if (fade && length > 255) throw new Error("A fading sound length must be 1..255.");
  const encodedLength = length === 256 ? 0 : length;
  const control = ((15 - volume) << 4) | noise;
  if (fade && (frequencySweep || volumeSweep)) throw new Error("Use either fade or explicit sweep parameters.");
  if (fade) {
    const [stepAndCount, lengths] = fadeParameters(length);
    volumeSweep = {
      step: stepAndCount >> 4,
      count: stepAndCount & 0x0f || 16,
      stepLength: lengths >> 4 || 16,
      firstLength: lengths & 0x0f || 16
    };
  }
  const type = (frequencySweep ? 1 : 0) | (volumeSweep ? 2 : 0);
  return [type, ...(type === 0 ? [0x00] : []), control, encodedLength, ...encodeSweepParameters(frequencySweep, volumeSweep)];
}

export function buildColecoNoise(options) {
  const bytes = encodeNoiseCommand(options);
  const decoded = decodeColecoSoundStream([...bytes, 0x10]);
  const event = decoded.events[0];
  if (!event || decoded.events[1]?.type !== "end") throw new Error("Generated noise did not round-trip through the BIOS decoder.");
  return {
    bytes,
    asm: formatColecoSoundBytes(bytes),
    event,
    description: describeColecoSoundEvent(event, { region: options?.region })
  };
}

export function buildColecoSoundCommand({ mode = "Tone", note, octave, period = null, channel = 1, noise = 4, volume = 15, length, region = "NTSC", frequencySweep = null, volumeSweep = null }) {
  const normalizedMode = String(mode).toLowerCase();
  const bytes = normalizedMode === "noise"
    ? encodeNoiseCommand({ noise, volume, length, frequencySweep, volumeSweep })
    : encodeToneCommand({
        channel,
        period: Number.isInteger(period) ? period : notePeriod(note, octave, region),
        attenuation: 15 - volume,
        length,
        frequencySweep,
        volumeSweep
      });
  const terminal = normalizedMode === "noise" ? 0x10 : (channel << 6) | 0x10;
  const decoded = decodeColecoSoundStream([...bytes, terminal]);
  const event = decoded.events[0];
  if (!event || decoded.events[1]?.type !== "end") throw new Error("Generated command did not round-trip through the BIOS decoder.");
  return {
    bytes,
    asm: formatColecoSoundBytes(bytes),
    event,
    description: describeColecoSoundEvent(event, { region })
  };
}

export function formatColecoSoundBytes(bytes, { directive = "db" } = {}) {
  if (!Array.isArray(bytes) && !(bytes instanceof Uint8Array)) throw new Error("Sound bytes must be an array.");
  const values = [...bytes].map((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error("Sound data contains a non-byte value.");
    return `$${value.toString(16).toUpperCase().padStart(2, "0")}`;
  });
  return `${directive} ${values.join(",")}`;
}

export function buildColecoToneNote(options) {
  const bytes = encodeToneNote(options);
  const decoded = decodeColecoSoundStream([...bytes, 0x50]);
  const event = decoded.events[0];
  if (!event || decoded.events[1]?.type !== "end") throw new Error("Generated tone did not round-trip through the BIOS decoder.");
  return {
    bytes,
    asm: formatColecoSoundBytes(bytes),
    event,
    description: describeColecoSoundEvent(event, { region: options?.region })
  };
}

export function buildColecoEchoTone({ note, octave, channel = 1, volume = 15, mainFrames = 12, tailFrames = 8, drop = 3, region = "NTSC" }) {
  if (!Number.isInteger(mainFrames) || mainFrames < 1 || mainFrames > 16) {
    throw new Error("A single-command echo needs 1..16 main frames.");
  }
  if (!Number.isInteger(tailFrames) || tailFrames < 1 || mainFrames + tailFrames > 256) {
    throw new Error("Echo tail must keep the total duration within 256 frames.");
  }
  if (!Number.isInteger(volume) || volume < 1 || volume > 15) throw new Error("Echo volume must be 1..15.");
  if (!Number.isInteger(drop) || drop < 1 || drop > 15) throw new Error("Echo drop must be 1..15 attenuation steps.");
  const attenuation = 15 - volume;
  if (attenuation + drop > 15) throw new Error("Echo tail would wrap the hardware attenuation.");
  const bytes = encodeToneCommand({
    channel,
    period: notePeriod(note, octave, region),
    attenuation,
    length: mainFrames + tailFrames,
    volumeSweep: { step: drop, count: 2, stepLength: 16, firstLength: mainFrames }
  });
  const decoded = decodeColecoSoundStream([...bytes, 0x50]);
  return {
    bytes,
    asm: formatColecoSoundBytes(bytes),
    event: decoded.events[0],
    description: `${describeColecoSoundEvent(decoded.events[0], { region })} · echo tail ${tailFrames} frames · one BIOS command`
  };
}

export function encodeBassNote({ note, octave, length, region = "NTSC", lfsr = 15, volume = 15, fade = false }) {
  if (![15, 16].includes(lfsr)) throw new Error("Bass LFSR must be 15 or 16.");
  if (!Number.isInteger(length) || length < 1 || length > 256) throw new Error("Sound length must be 1..256.");
  if (fade && length > 255) throw new Error("A fading sound length must be 1..255.");
  if (!Number.isInteger(volume) || volume < 0 || volume > 15) throw new Error("Volume must be 0..15.");
  const clock = CLOCKS[String(region || "NTSC").toUpperCase()];
  if (!clock) throw new Error(`Unknown video region: ${region}`);
  const tone3Period = Math.max(1, Math.round(clock / (32 * noteFrequency(note, octave) * lfsr)));
  if (tone3Period > 0x3ff) throw new Error(`${note}${octave} is below the playable bass range.`);
  const encodedLength = length === 256 ? 0 : length;
  const tone3 = [0xc0, byte(tone3Period), 0xf0 | ((tone3Period >> 8) & 0x03), encodedLength];
  const noise = encodeNoiseCommand({ noise: 3, volume, length, fade });
  return { tone3, noise };
}

export function buildColecoBassNote(options) {
  const encoded = encodeBassNote(options);
  const bytes = [...encoded.tone3, ...encoded.noise];
  const decoded = decodeColecoSoundStream([...bytes, 0x50]);
  if (decoded.events.length !== 3 || decoded.events[2]?.type !== "end") {
    throw new Error("Generated bass note did not round-trip through the BIOS decoder.");
  }
  return {
    bytes,
    tone3Bytes: encoded.tone3,
    noiseBytes: encoded.noise,
    tone3Asm: formatColecoSoundBytes(encoded.tone3),
    noiseAsm: formatColecoSoundBytes(encoded.noise),
    asm: `; Play both table entries together\nTone3Part: ${formatColecoSoundBytes(encoded.tone3)},$D0\nNoisePart: ${formatColecoSoundBytes(encoded.noise)},$10`,
    events: decoded.events.slice(0, 2),
    description: decoded.events.slice(0, 2).map((event) =>
      describeColecoSoundEvent(event, { region: options?.region })).join(" + ")
  };
}

export function decodeColecoSoundStream(input, { maxEvents = 65536 } = {}) {
  const bytes = Uint8Array.from(input || [], byte);
  const events = [];
  let offset = 0;
  let terminated = false;

  function take(count, start) {
    if (offset + count > bytes.length) throw new Error(`Truncated sound command at byte ${start}.`);
    const values = [...bytes.slice(offset, offset + count)];
    offset += count;
    return values;
  }

  while (offset < bytes.length && events.length < maxEvents) {
    const start = offset;
    const header = bytes[offset++];
    const channel = header >> 6;
    const code = header & 0x3f;
    if (code & 0x20) {
      events.push({ offset: start, type: "rest", channel, length: (code & 0x1f) || 256, bytes: [header] });
      continue;
    }
    if (code === 0x10 || code === 0x18) {
      events.push({ offset: start, type: code === 0x10 ? "end" : "repeat", channel, bytes: [header] });
      terminated = true;
      break;
    }
    if (code === 0x04) {
      events.push({ offset: start, type: "tiny", channel, bytes: [header] });
      terminated = true;
      break;
    }
    if (code > 0x03) throw new Error(`Unknown sound code $${code.toString(16).toUpperCase()} at byte ${start}.`);

    const payload = [];
    if (channel === 0 && code === 0) payload.push(...take(1, start)); // Noise simple-note filler byte.
    if (channel !== 0) payload.push(...take(1, start)); // Tone period low byte.
    payload.push(...take(2, start)); // Noise/attenuation or tone attenuation+period high, then length.
    if (code & 0x01) payload.push(...take(2, start));
    if (code & 0x02) payload.push(...take(2, start));

    const lengthIndex = channel === 0 ? (code === 0 ? 2 : 1) : 2;
    let parameterIndex = lengthIndex + 1;
    const event = {
      offset: start,
      type: ["note", "frequency-sweep", "volume-sweep", "frequency-volume-sweep"][code],
      channel,
      length: payload[lengthIndex] || 256,
      bytes: [header, ...payload]
    };
    if (channel === 0) {
      const controlIndex = code === 0 ? 1 : 0;
      event.noise = payload[controlIndex] & 0x07;
      event.attenuation = payload[controlIndex] >> 4;
    } else {
      event.period = payload[0] | ((payload[1] & 0x03) << 8);
      event.attenuation = payload[1] >> 4;
    }
    if (code & 0x01) {
      const lengths = payload[parameterIndex++];
      const step = payload[parameterIndex++];
      event.frequencySweep = {
        stepLength: (lengths >> 4) || 16,
        firstLength: (lengths & 0x0f) || 16,
        step: step >= 128 ? step - 256 : step
      };
    }
    if (code & 0x02) {
      const stepAndCount = payload[parameterIndex++];
      const lengths = payload[parameterIndex++];
      event.volumeSweep = {
        step: stepAndCount >> 4,
        count: (stepAndCount & 0x0f) || 16,
        stepLength: (lengths >> 4) || 16,
        firstLength: (lengths & 0x0f) || 16
      };
    }
    events.push(event);
  }

  if (events.length >= maxEvents) throw new Error(`Sound stream exceeds ${maxEvents} events.`);
  return { events, consumed: offset, trailing: bytes.length - offset, terminated };
}

export function encodeColecoSoundEvents(events) {
  const output = [];
  for (const [index, event] of [...(events || [])].entries()) {
    if (!Array.isArray(event?.bytes) || !event.bytes.length) throw new Error(`Sound event ${index} has no encoded bytes.`);
    for (const value of event.bytes) {
      if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error(`Sound event ${index} contains a non-byte value.`);
      output.push(value);
    }
  }
  return output;
}

export function describeColecoSoundEvent(event, { region = "NTSC" } = {}) {
  if (!event || typeof event.type !== "string") return "Invalid event";
  if (event.type === "rest") return `Rest · ${event.length} frames`;
  if (event.type === "end") return "End";
  if (event.type === "repeat") return "Repeat";
  if (event.type === "tiny") return `Tiny Sound entry · channel ${event.channel}`;

  const parts = [];
  if (event.channel === 0) {
    parts.push(`Noise ${event.noise} (${COLECO_NOISE_MODES[event.noise] || "unknown"})`, `volume ${15 - event.attenuation}/15`);
  } else {
    const clock = CLOCKS[String(region || "NTSC").toUpperCase()] || CLOCKS.NTSC;
    const frequency = clock / (32 * event.period);
    const midi = Math.round(69 + (12 * Math.log2(frequency / 440)));
    const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    parts.push(`Tone ${event.channel}`, `${noteName}${octave}`, `${frequency.toFixed(1)} Hz`, `period ${event.period}`, `volume ${15 - event.attenuation}/15`);
  }
  if (event.frequencySweep) {
    const renderedFrames = event.frequencySweep.firstLength + (Math.max(1, event.length) - 1) * event.frequencySweep.stepLength;
    parts.push(`${event.length} sweep counts`, `${renderedFrames} rendered frames`);
    parts.push(`freq ${event.frequencySweep.step >= 0 ? "+" : ""}${event.frequencySweep.step} every ${event.frequencySweep.stepLength} frame${event.frequencySweep.stepLength === 1 ? "" : "s"}`);
  } else {
    parts.push(`${event.length} frames`);
  }
  if (event.volumeSweep) {
    parts.push(`volume ${event.volumeSweep.step >= 0 ? "+" : ""}${event.volumeSweep.step} × ${event.volumeSweep.count}`);
  }
  return parts.join(" · ");
}
