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

function makeNoiseTrackBuffer(context, events, duration, region, tone3Period = null) {
  const sampleCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const output = buffer.getChannelData(0);
  const clock = CLOCKS[region] || CLOCKS.NTSC;
  const divisors = [512, 1024, 2048];
  let phase = 0;
  let level = 1;
  let lfsr = 0x4000;
  let eventIndex = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const seconds = index / context.sampleRate;
    while (eventIndex < events.length && seconds >= ((events[eventIndex].startFrame || 0) + events[eventIndex].length) / (region === "PAL" ? 50 : 60)) eventIndex += 1;
    const event = events[eventIndex];
    const eventStart = (event?.startFrame || 0) / (region === "PAL" ? 50 : 60);
    if (!event || seconds < eventStart) {
      output[index] = 0;
      continue;
    }
    const rate = event.noise % 4 === 3 && tone3Period
      ? clock / (32 * tone3Period)
      : event.noise % 4 === 3 ? 440 : clock / divisors[event.noise % 4];
    phase += rate / context.sampleRate;
    if (phase >= 1) {
      phase -= 1;
      const feedback = event.noise >= 4 ? ((lfsr ^ (lfsr >> 1)) & 1) : (lfsr & 1);
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

export function buildColecoPreviewTracks(events) {
  const tones = new Map();
  const noises = [];
  for (const event of [...(events || [])]) {
    if (!["note", "frequency-sweep", "volume-sweep", "frequency-volume-sweep"].includes(event?.type)) continue;
    if (event.channel === 0) noises.push(event);
    else tones.set(event.channel, [...(tones.get(event.channel) || []), event]);
  }
  for (const channelEvents of tones.values()) channelEvents.sort((a, b) => (a.startFrame || 0) - (b.startFrame || 0));
  noises.sort((a, b) => (a.startFrame || 0) - (b.startFrame || 0));
  return { tones, noises };
}

export async function startColecoSoundPreview(events, { region = "NTSC" } = {}) {
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
  const tracks = buildColecoPreviewTracks(playable);
  for (const event of playable) {
    const duration = event.length * frameSeconds;
    longest = Math.max(longest, ((event.startFrame || 0) * frameSeconds) + duration);
  }
  const clock = CLOCKS[region] || CLOCKS.NTSC;
  for (const channelEvents of tracks.tones.values()) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.connect(context.destination);
    const oscillator = context.createOscillator();
    oscillator.type = "square";
    for (const [index, event] of channelEvents.entries()) {
      const eventStart = start + ((event.startFrame || 0) * frameSeconds);
      const eventEndFrame = (event.startFrame || 0) + event.length;
      let period = event.period;
      oscillator.frequency.setValueAtTime(clock / (32 * period), eventStart);
      scheduleVolume(gain.gain, event, eventStart, frameSeconds);
      const sweep = event.frequencySweep;
      if (sweep) {
        let frame = sweep.firstLength;
        while (frame < event.length) {
          period = Math.max(1, Math.min(1023, period + sweep.step));
          oscillator.frequency.setValueAtTime(clock / (32 * period), eventStart + (frame * frameSeconds));
          frame += sweep.stepLength;
        }
      }
      const next = channelEvents[index + 1];
      if (!next || (next.startFrame || 0) !== eventEndFrame) gain.gain.setValueAtTime(0, start + (eventEndFrame * frameSeconds));
    }
    oscillator.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + longest);
  }
  if (tracks.noises.length) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    for (const [index, event] of tracks.noises.entries()) {
      const eventStart = start + ((event.startFrame || 0) * frameSeconds);
      const eventEndFrame = (event.startFrame || 0) + event.length;
      scheduleVolume(gain.gain, event, eventStart, frameSeconds);
      const next = tracks.noises[index + 1];
      if (!next || (next.startFrame || 0) !== eventEndFrame) gain.gain.setValueAtTime(0, start + (eventEndFrame * frameSeconds));
    }
    gain.connect(context.destination);
    const source = context.createBufferSource();
    source.buffer = makeNoiseTrackBuffer(context, tracks.noises, longest, region, tone3Period);
    source.connect(gain);
    source.start(start);
    source.stop(start + longest);
  }
  let finished = false;
  let paused = false;
  let resolveDone;
  let timer = 0;
  const done = new Promise((resolve) => { resolveDone = resolve; });
  const finish = async () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { await context.close(); } catch {}
    resolveDone();
  };
  const armFinishTimer = () => {
    clearTimeout(timer);
    const elapsed = Math.max(0, context.currentTime - start);
    timer = setTimeout(finish, Math.ceil((Math.max(0, longest - elapsed) + 0.05) * 1000));
  };
  armFinishTimer();
  return {
    done,
    stop: finish,
    pause: async () => {
      if (finished || paused) return;
      await context.suspend();
      paused = true;
      clearTimeout(timer);
    },
    resume: async () => {
      if (finished || !paused) return;
      await context.resume();
      paused = false;
      armFinishTimer();
    },
    isPaused: () => paused,
    durationSeconds: longest,
    durationFrames: Math.round(longest / frameSeconds),
    currentFrame: () => Math.max(0, Math.min(longest / frameSeconds, (context.currentTime - start) / frameSeconds))
  };
}

export async function previewColecoSoundEvents(events, options = {}) {
  const playback = await startColecoSoundPreview(events, options);
  await playback.done;
}

export { amplitudeForAttenuation, volumeEnvelopeForEvent };
