const CLOCKS = Object.freeze({ NTSC: 3579545, PAL: 3546893 });

function amplitudeForAttenuation(attenuation) {
  if (attenuation >= 15) return 0;
  return 0.24 * (10 ** ((-2 * attenuation) / 20));
}

function volumeEnvelopeForEvent(event) {
  let attenuation = event.attenuation ?? 15;
  const points = [{ frame: 0, attenuation }];
  const sweep = event.volumeSweep;
  if (!sweep) return points;
  let frame = sweep.firstLength;
  for (let index = 1; index < sweep.count && frame < event.length; index += 1) {
    attenuation = (attenuation + sweep.step) & 0x0f;
    points.push({ frame, attenuation });
    frame += sweep.stepLength;
  }
  return points;
}

function scheduleVolume(gain, event, start, frameSeconds) {
  for (const point of volumeEnvelopeForEvent(event)) {
    gain.setValueAtTime(amplitudeForAttenuation(point.attenuation), start + (point.frame * frameSeconds));
  }
}

function makeNoiseBuffer(context, event, duration, region, tone3Period = null) {
  const sampleCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const output = buffer.getChannelData(0);
  const clock = CLOCKS[region] || CLOCKS.NTSC;
  const divisors = [512, 1024, 2048];
  const rate = event.noise % 4 === 3 && tone3Period
    ? clock / (32 * tone3Period)
    : event.noise % 4 === 3 ? 440 : clock / divisors[event.noise % 4];
  let phase = 0;
  let level = 1;
  let lfsr = 0x4000;
  for (let index = 0; index < sampleCount; index += 1) {
    phase += rate / context.sampleRate;
    if (phase >= 1) {
      phase -= 1;
      const white = event.noise >= 4;
      const feedback = white ? ((lfsr ^ (lfsr >> 1)) & 1) : (lfsr & 1);
      lfsr = (lfsr >> 1) | (feedback << 14);
      level = (lfsr & 1) ? 1 : -1;
    }
    output[index] = level;
  }
  return buffer;
}

export function scheduleColecoSoundSequence(events) {
  let startFrame = 0;
  return [...(events || [])].flatMap((event) => {
    if (["end", "repeat", "tiny"].includes(event?.type)) return [];
    const scheduled = { ...event, startFrame };
    startFrame += event.length || 0;
    return [scheduled];
  });
}

export async function previewColecoSoundEvents(events, { region = "NTSC" } = {}) {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) throw new Error("This browser cannot preview audio.");
  const context = new AudioContextClass();
  const frameSeconds = 1 / (region === "PAL" ? 50 : 60);
  const playable = [...(events || [])].filter((event) => ["note", "frequency-sweep", "volume-sweep", "frequency-volume-sweep"].includes(event.type));
  if (!playable.length) {
    await context.close();
    throw new Error("The generated command has no playable event.");
  }
  const start = context.currentTime + 0.02;
  const tone3Period = playable.find((event) => event.channel === 3)?.period || null;
  let longest = 0;
  for (const event of playable) {
    const duration = event.length * frameSeconds;
    const eventStart = start + ((event.startFrame || 0) * frameSeconds);
    longest = Math.max(longest, ((event.startFrame || 0) * frameSeconds) + duration);
    const gain = context.createGain();
    scheduleVolume(gain.gain, event, eventStart, frameSeconds);
    gain.connect(context.destination);
    if (event.channel === 0) {
      const source = context.createBufferSource();
      source.buffer = makeNoiseBuffer(context, event, duration, region, tone3Period);
      source.connect(gain);
      source.start(eventStart);
      source.stop(eventStart + duration);
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = "square";
      const clock = CLOCKS[region] || CLOCKS.NTSC;
      let period = event.period;
      oscillator.frequency.setValueAtTime(clock / (32 * period), eventStart);
      const sweep = event.frequencySweep;
      if (sweep) {
        let frame = sweep.firstLength;
        while (frame < event.length) {
          period = Math.max(1, Math.min(1023, period + sweep.step));
          oscillator.frequency.setValueAtTime(clock / (32 * period), eventStart + (frame * frameSeconds));
          frame += sweep.stepLength;
        }
      }
      oscillator.connect(gain);
      oscillator.start(eventStart);
      oscillator.stop(eventStart + duration);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, Math.ceil((longest + 0.05) * 1000)));
  await context.close();
}

export { amplitudeForAttenuation, volumeEnvelopeForEvent };
