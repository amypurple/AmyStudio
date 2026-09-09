const CLOCKS = Object.freeze({ NTSC: 3579545, PAL: 3546893 });
const FRAME_RATES = Object.freeze({ NTSC: 60, PAL: 50 });

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) result <<= 1;
  return result;
}

function fft(real, imag) {
  const size = real.length;
  for (let index = 1, swap = 0; index < size; index += 1) {
    let bit = size >> 1;
    for (; swap & bit; bit >>= 1) swap ^= bit;
    swap ^= bit;
    if (index < swap) {
      [real[index], real[swap]] = [real[swap], real[index]];
      [imag[index], imag[swap]] = [imag[swap], imag[index]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let twiddleReal = 1;
      let twiddleImag = 0;
      for (let offset = 0; offset < length / 2; offset += 1) {
        const even = start + offset;
        const odd = even + (length / 2);
        const oddReal = (real[odd] * twiddleReal) - (imag[odd] * twiddleImag);
        const oddImag = (real[odd] * twiddleImag) + (imag[odd] * twiddleReal);
        real[odd] = real[even] - oddReal;
        imag[odd] = imag[even] - oddImag;
        real[even] += oddReal;
        imag[even] += oddImag;
        const nextReal = (twiddleReal * stepReal) - (twiddleImag * stepImag);
        twiddleImag = (twiddleReal * stepImag) + (twiddleImag * stepReal);
        twiddleReal = nextReal;
      }
    }
  }
}

export function frequencyToPsgPeriod(frequency, region = "NTSC") {
  const clock = CLOCKS[region] || CLOCKS.NTSC;
  return clamp(Math.round(clock / (32 * frequency)), 1, 1023);
}

export function psgPeriodToFrequency(period, region = "NTSC") {
  const clock = CLOCKS[region] || CLOCKS.NTSC;
  return clock / (32 * clamp(Math.round(period), 1, 1023));
}

export function amplitudeToAttenuation(amplitude) {
  if (!(amplitude > 0.0025)) return 15;
  return clamp(Math.round(-10 * Math.log10(clamp(amplitude, 0.0001, 1))), 0, 14);
}

function analyzeFrame(samples, sampleRate, center, windowSize, maxTones) {
  const fftSize = clamp(nextPowerOfTwo(windowSize), 256, 2048);
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  const start = Math.round(center - (windowSize / 2));
  let squareSum = 0;
  let mean = 0;
  for (let index = 0; index < windowSize; index += 1) {
    const sourceIndex = start + index;
    if (sourceIndex >= 0 && sourceIndex < samples.length) mean += samples[sourceIndex] || 0;
  }
  mean /= windowSize;
  for (let index = 0; index < windowSize; index += 1) {
    const sourceIndex = start + index;
    const sample = sourceIndex >= 0 && sourceIndex < samples.length ? (samples[sourceIndex] || 0) - mean : 0;
    const window = 0.5 - (0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, windowSize - 1)));
    real[index] = sample * window;
    squareSum += sample * sample;
  }
  const rms = Math.sqrt(squareSum / windowSize);
  if (rms < 0.004) return { rms, tones: [], flatness: 0, centroid: 0 };

  // A voice's fundamental is often weaker than its formants. Autocorrelation
  // recovers the repeating period instead of mistaking the loudest harmonic
  // for the note that carries the spoken contour.
  const minLag = Math.max(2, Math.floor(sampleRate / 400));
  const maxLag = Math.min(windowSize >> 1, Math.ceil(sampleRate / 70));
  const lagStep = Math.max(1, Math.floor(sampleRate / 12000));
  let pitchLag = 0;
  let pitchConfidence = 0;
  const correlations = [];
  for (let lag = minLag; lag <= maxLag; lag += lagStep) {
    let correlation = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = 0; index + lag < windowSize; index += lagStep) {
      const left = real[index];
      const right = real[index + lag];
      correlation += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const normalized = correlation / Math.sqrt(Math.max(1e-20, leftEnergy * rightEnergy));
    correlations.push({ lag, normalized });
    if (normalized > pitchConfidence) {
      pitchConfidence = normalized;
      pitchLag = lag;
    }
  }
  // Later multiples can correlate slightly better because of the finite window.
  // Prefer the first strong local maximum to avoid octave-down/subharmonic errors.
  const earlyThreshold = Math.max(0.32, pitchConfidence * 0.86);
  for (let index = 1; index + 1 < correlations.length; index += 1) {
    const current = correlations[index];
    if (current.normalized >= earlyThreshold
        && current.normalized >= correlations[index - 1].normalized
        && current.normalized >= correlations[index + 1].normalized) {
      pitchLag = current.lag;
      pitchConfidence = current.normalized;
      break;
    }
  }

  fft(real, imag);
  const firstBin = Math.max(1, Math.ceil((55 * fftSize) / sampleRate));
  const lastBin = Math.min((fftSize >> 1) - 2, Math.floor((7000 * fftSize) / sampleRate));
  const magnitudes = new Float64Array(lastBin + 1);
  let arithmetic = 0;
  let logSum = 0;
  let weighted = 0;
  let total = 0;
  let highBand = 0;
  for (let bin = firstBin; bin <= lastBin; bin += 1) {
    const magnitude = Math.hypot(real[bin], imag[bin]);
    magnitudes[bin] = magnitude;
    arithmetic += magnitude;
    logSum += Math.log(magnitude + 1e-12);
    total += magnitude;
    weighted += magnitude * ((bin * sampleRate) / fftSize);
    if ((bin * sampleRate) / fftSize >= 1800) highBand += magnitude;
  }
  const binCount = Math.max(1, lastBin - firstBin + 1);
  const flatness = Math.exp(logSum / binCount) / Math.max(1e-12, arithmetic / binCount);
  const peaks = [];
  for (let bin = firstBin + 1; bin < lastBin; bin += 1) {
    const magnitude = magnitudes[bin];
    if (magnitude < magnitudes[bin - 1] || magnitude < magnitudes[bin + 1]) continue;
    const denominator = magnitudes[bin - 1] - (2 * magnitude) + magnitudes[bin + 1];
    const offset = denominator ? 0.5 * (magnitudes[bin - 1] - magnitudes[bin + 1]) / denominator : 0;
    peaks.push({
      frequency: ((bin + clamp(offset, -0.5, 0.5)) * sampleRate) / fftSize,
      magnitude
    });
  }
  peaks.sort((left, right) => right.magnitude - left.magnitude);
  const selected = [];
  for (const peak of peaks) {
    if (selected.some((other) => Math.abs(Math.log2(peak.frequency / other.frequency)) < 0.07)) continue;
    const isSquareWaveHarmonic = selected.some((other) => [3, 5, 7, 9].some((multiple) =>
      Math.abs(Math.log2(peak.frequency / (other.frequency * multiple))) < 0.035));
    if (isSquareWaveHarmonic) continue;
    selected.push(peak);
    if (selected.length >= maxTones) break;
  }
  const strongest = selected[0]?.magnitude || 1;
  const tones = selected
    .filter((peak, index) => index === 0 || peak.magnitude >= strongest * 0.08)
    .map((peak) => ({ frequency: peak.frequency, amplitude: clamp((peak.magnitude / fftSize) * 8, 0, 1) }));
  return {
    rms,
    tones,
    flatness,
    centroid: total ? weighted / total : 0,
    highBandRatio: total ? highBand / total : 0,
    pitch: pitchLag && pitchConfidence >= 0.32 ? sampleRate / pitchLag : 0,
    pitchConfidence
  };
}

function speechToneCandidates(analysis, limit) {
  const candidates = [];
  const foldIntoSpeechRange = (frequency) => {
    let folded = frequency;
    while (folded < 120) folded *= 2;
    return folded;
  };
  if (analysis.pitch) {
    // The PSG bottoms out near 109 Hz. Speech autocorrelation can select a
    // subharmonic below that range; octave-fold it instead of pinning many
    // unrelated frames to the identical $03FF period.
    candidates.push({
      frequency: foldIntoSpeechRange(analysis.pitch),
      amplitude: clamp(analysis.rms * (0.8 + analysis.pitchConfidence), 0, 1)
    });
  }
  for (const tone of analysis.tones) {
    const candidate = { ...tone, frequency: foldIntoSpeechRange(tone.frequency) };
    if (candidates.some((other) => Math.abs(Math.log2(candidate.frequency / other.frequency)) < 0.12)) continue;
    candidates.push(candidate);
    if (candidates.length >= limit) break;
  }
  return candidates;
}

function assignToneTracks(candidates, previousPeriods, region, count) {
  const remaining = candidates.map((tone) => ({
    ...tone,
    period: frequencyToPsgPeriod(tone.frequency, region)
  }));
  const assigned = new Array(count).fill(null);
  for (let track = 0; track < count; track += 1) {
    if (!previousPeriods[track] || !remaining.length) continue;
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const distance = Math.abs(Math.log2(remaining[index].period / previousPeriods[track]));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    if (bestDistance < 0.6) assigned[track] = remaining.splice(best, 1)[0];
  }
  remaining.sort((left, right) => left.period - right.period);
  for (let track = 0; track < count && remaining.length; track += 1) {
    if (!assigned[track]) assigned[track] = remaining.shift();
  }
  return assigned;
}

function mergeFrames(frames, keyFields) {
  const events = [];
  for (const frame of frames) {
    const previous = events.at(-1);
    const same = previous && keyFields.every((field) => previous[field] === frame[field]);
    if (same && previous.length < 256) previous.length += 1;
    else events.push({ ...frame, length: 1 });
  }
  return events;
}

function toneEventsAreNear(left, right) {
  return Math.abs(left.period - right.period) <= 2
    && Math.abs(left.attenuation - right.attenuation) <= 1;
}

function noiseEventsAreNear(left, right) {
  return left.noiseRate === right.noiseRate
    && left.white === right.white
    && Math.abs(left.attenuation - right.attenuation) <= 1;
}

export function simplifyPsgEdgeEvents(events, { type = "tone" } = {}) {
  const simplified = events.map((event) => ({ ...event }));
  const near = type === "noise" ? noiseEventsAreNear : toneEventsAreNear;
  if (simplified.length >= 2 && simplified[0].length === 1
      && simplified[1].length >= 3 && near(simplified[0], simplified[1])) {
    simplified[1].length += 1;
    simplified.shift();
  }
  const last = simplified.length - 1;
  if (last >= 1 && simplified[last].length === 1
      && simplified[last - 1].length >= 3 && near(simplified[last], simplified[last - 1])) {
    simplified[last - 1].length += 1;
    simplified.pop();
  }
  return simplified;
}

function pushRest(bytes, channel, length) {
  let remaining = length;
  while (remaining > 0) {
    const chunk = Math.min(31, remaining);
    bytes.push((channel << 6) | 0x20 | chunk);
    remaining -= chunk;
  }
}

export function encodePsgToneStream(events, channel) {
  const bytes = [];
  for (const event of events) {
    if (event.attenuation >= 15) {
      pushRest(bytes, channel, event.length);
      continue;
    }
    let remaining = event.length;
    while (remaining > 0) {
      const length = Math.min(256, remaining);
      bytes.push(channel << 6, event.period & 0xff, ((event.attenuation & 15) << 4) | ((event.period >> 8) & 3), length & 0xff);
      remaining -= length;
    }
  }
  bytes.push((channel << 6) | 0x10);
  return bytes;
}

export function encodePsgNoiseStream(events) {
  const bytes = [];
  for (const event of events) {
    if (event.attenuation >= 15) {
      pushRest(bytes, 0, event.length);
      continue;
    }
    let remaining = event.length;
    while (remaining > 0) {
      const length = Math.min(256, remaining);
      // BIOS simple-noise commands keep an unused frequency byte before the mix byte.
      bytes.push(0x00, 0x00,
        ((event.attenuation & 15) << 4) | (event.white === false ? 0 : 0x04) | (event.noiseRate & 3),
        length & 0xff);
      remaining -= length;
    }
  }
  bytes.push(0x10);
  return bytes;
}

export function encodePsgNoiseClockStream(events) {
  const bytes = [];
  for (const event of events) {
    let remaining = event.length;
    while (remaining > 0) {
      const length = Math.min(256, remaining);
      bytes.push(0xc0, event.period & 0xff, 0xf0 | ((event.period >> 8) & 3), length & 0xff);
      remaining -= length;
    }
  }
  bytes.push(0xd0);
  return bytes;
}

function formatBytes(bytes) {
  const lines = [];
  for (let index = 0; index < bytes.length; index += 12) {
    lines.push(`    db ${bytes.slice(index, index + 12).map((value) => `$${value.toString(16).padStart(2, "0").toUpperCase()}`).join(",")}`);
  }
  return lines.join("\n");
}

export function buildPsgSoundAsm(result, { label = "ImportedSound", firstAreaAddress = 0x702b } = {}) {
  const safeLabel = String(label).replace(/[^A-Za-z0-9_]/g, "_").replace(/^[^A-Za-z_]/, "_$&");
  const streams = result.streams.filter((stream) => stream.bytes.length > 1);
  const tableLines = [`${safeLabel}Table:`];
  for (let index = 0; index < streams.length; index += 1) {
    tableLines.push(`    dw ${safeLabel}Voice${index + 1},$${(firstAreaAddress + (index * 10)).toString(16).toUpperCase().padStart(4, "0")}`);
  }
  const blocks = streams.map((stream, index) => `${safeLabel}Voice${index + 1}:\n${formatBytes(stream.bytes)}`);
  return {
    tableName: `${safeLabel}Table`,
    soundCount: streams.length,
    asm: `${tableLines.join("\n")}\n\n${blocks.join("\n\n")}`,
    setup: `set sound table ${safeLabel}Table areas ${streams.length}`,
    play: streams.length === 1 ? "play sound 1" : `play sounds ${streams.map((_, index) => index + 1).join(",")}`
  };
}

export function psgSoundToPreviewEvents(result) {
  return result.streams.flatMap((stream) => {
    let startFrame = 0;
    return stream.events.map((event) => {
      const preview = stream.type === "noise"
        ? { type: "note", channel: 0, noise: (event.white === false ? 0 : 4) | (event.noiseRate & 3) }
        : { type: "note", channel: stream.channel, period: event.period };
      Object.assign(preview, {
        startFrame,
        length: event.length,
        durationFrames: event.length,
        attenuation: event.attenuation
      });
      startFrame += event.length;
      return preview;
    });
  });
}

export function convertSamplesToPsgSound(samples, sampleRate, {
  region = "NTSC",
  maxVoices = 3,
  allowNoise = true,
  variableNoise = true,
  speechMode = false,
  analysisFrames = 2,
  simplifyEdges = true
} = {}) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample || 0));
  const inputGain = peak > 0.001 && peak < 0.7 ? 0.8 / peak : 1;
  const analysisSamples = inputGain === 1
    ? samples
    : Float32Array.from(samples, (sample) => clamp(sample * inputGain, -1, 1));
  const normalizedRegion = String(region).toUpperCase() === "PAL" ? "PAL" : "NTSC";
  const frameRate = FRAME_RATES[normalizedRegion];
  const voiceLimit = clamp(Math.round(maxVoices), 1, 3);
  const frameCount = Math.max(1, Math.ceil((analysisSamples.length * frameRate) / sampleRate));
  const frameSamples = sampleRate / frameRate;
  const windowSize = clamp(Math.round(frameSamples * clamp(analysisFrames, 1, 4)), 128, 2048);
  const analyses = [];
  let noiseFrames = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const analysis = analyzeFrame(analysisSamples, sampleRate, (frame + 0.5) * frameSamples, windowSize, voiceLimit);
    analysis.useNoise = allowNoise && analysis.rms >= 0.01 && (
      analysis.flatness >= (speechMode ? 0.12 : 0.34)
      || (speechMode && analysis.highBandRatio >= 0.28 && analysis.flatness >= 0.02)
    );
    if (analysis.useNoise) noiseFrames += 1;
    analyses.push(analysis);
  }
  const useNoiseTrack = allowNoise && noiseFrames >= Math.max(2, Math.ceil(frameCount * (speechMode ? 0.025 : 0.08)));
  const activeNoiseAnalyses = analyses.filter((frame) => frame.useNoise);
  const whiteNoise = median(activeNoiseAnalyses.map((frame) => frame.pitchConfidence || 0)) < 0.58;
  const periodicPitch = median(activeNoiseAnalyses.map((frame) => frame.pitch).filter(Boolean));
  const inferredNoiseClock = !whiteNoise && periodicPitch <= 280
      && median(activeNoiseAnalyses.map((frame) => frame.centroid)) > 2100
    ? CLOCKS[normalizedRegion] / 512
    : whiteNoise
    ? clamp((median(activeNoiseAnalyses.map((frame) => frame.centroid)) - 1400) * 8, 110, 100000)
    : clamp(periodicPitch * 15, 110, 100000);
  const fixedNoiseClocks = [
    CLOCKS[normalizedRegion] / 512,
    CLOCKS[normalizedRegion] / 1024,
    CLOCKS[normalizedRegion] / 2048
  ];
  let fixedNoiseRate = 0;
  for (let index = 1; index < fixedNoiseClocks.length; index += 1) {
    if (Math.abs(fixedNoiseClocks[index] - inferredNoiseClock) < Math.abs(fixedNoiseClocks[fixedNoiseRate] - inferredNoiseClock)) {
      fixedNoiseRate = index;
    }
  }
  const fixedNoiseError = Math.abs(fixedNoiseClocks[fixedNoiseRate] - inferredNoiseClock) / fixedNoiseClocks[fixedNoiseRate];
  const useVariableNoise = variableNoise === true || (variableNoise === "auto" && fixedNoiseError > 0.16);
  const pureNoiseTrack = useNoiseTrack && noiseFrames >= Math.ceil(frameCount * 0.5);
  const toneTrackCount = pureNoiseTrack ? 0 : Math.max(0, voiceLimit - (useNoiseTrack ? 1 : 0));
  const toneFrames = Array.from({ length: toneTrackCount }, () => []);
  const noise = [];
  const noiseClock = [];
  const previousPeriods = new Array(toneTrackCount).fill(0);
  const firstNoiseAnalysis = activeNoiseAnalyses[0];
  const initialNoiseClock = firstNoiseAnalysis && whiteNoise
    ? clamp((firstNoiseAnalysis.centroid - 1400) * 8, 110, 100000)
    : inferredNoiseClock;
  let previousNoiseClockPeriod = frequencyToPsgPeriod(initialNoiseClock, normalizedRegion);

  for (const analysis of analyses) {
    const candidates = speechMode
      ? speechToneCandidates(analysis, toneTrackCount)
      : analysis.useNoise
        ? analysis.tones.filter((_, index) => index === 0 && analysis.flatness < 0.55)
        : analysis.tones;
    const assigned = assignToneTracks(candidates, previousPeriods, normalizedRegion, toneTrackCount);
    for (let track = 0; track < toneTrackCount; track += 1) {
      const tone = assigned[track];
      if (tone) previousPeriods[track] = tone.period;
      toneFrames[track].push(tone
        ? { period: tone.period, attenuation: amplitudeToAttenuation(tone.amplitude) }
        : { period: previousPeriods[track] || 1, attenuation: 15 });
    }
    if (useNoiseTrack) {
      const noiseRate = useVariableNoise ? 3 : fixedNoiseRate;
      noise.push({
        noiseRate,
        white: whiteNoise,
        attenuation: analysis.useNoise ? amplitudeToAttenuation(Math.min(1, analysis.rms * 2.2)) : 15
      });
      if (useVariableNoise) {
        if (analysis.useNoise && analysis.centroid > 1414) {
          // Calibrated by re-recording known SN76489 noise clocks in GearColeco.
          // The audible centroid has a substantial floor, so a plain multiplier
          // makes low noise clocks much too bright.
          const clockFrequency = clamp((analysis.centroid - 1400) * 8, 110, 100000);
          previousNoiseClockPeriod = frequencyToPsgPeriod(clockFrequency, normalizedRegion);
        }
        noiseClock.push({ period: previousNoiseClockPeriod, attenuation: 15 });
      }
    }
  }

  const activeToneEvents = toneFrames
    .map((frames) => mergeFrames(frames, ["period", "attenuation"]))
    .map((events) => simplifyEdges ? simplifyPsgEdgeEvents(events) : events)
    .filter((events) => events.some((event) => event.attenuation < 15));
  const streams = activeToneEvents.map((events, index) => ({
    type: "tone",
    channel: index + 1,
    events,
    bytes: encodePsgToneStream(events, index + 1)
  }));
  if (useNoiseTrack) {
    if (useVariableNoise) {
      const clockEvents = mergeFrames(noiseClock, ["period"]);
      streams.push({
        type: "noise-clock",
        channel: 3,
        audible: false,
        events: clockEvents,
        bytes: encodePsgNoiseClockStream(clockEvents)
      });
    }
    const merged = mergeFrames(noise, ["noiseRate", "white", "attenuation"]);
    const events = simplifyEdges ? simplifyPsgEdgeEvents(merged, { type: "noise" }) : merged;
    if (events.some((event) => event.attenuation < 15)) {
      streams.push({ type: "noise", channel: 0, events, bytes: encodePsgNoiseStream(events) });
    }
  }
  return {
    region: normalizedRegion,
    frameRate,
    frameCount,
    durationSeconds: analysisSamples.length / sampleRate,
    streams,
    usedVoices: streams.length,
    audibleVoices: streams.filter((stream) => stream.audible !== false).length,
    analysis: {
      windowSize,
      noiseFrames,
      useNoiseTrack,
      inputGain,
      noiseCentroids: analyses.filter((frame) => frame.useNoise).map((frame) => frame.centroid),
      noiseFlatness: analyses.filter((frame) => frame.useNoise).map((frame) => frame.flatness),
      noisePitchConfidence: analyses.filter((frame) => frame.useNoise).map((frame) => frame.pitchConfidence || 0),
      inferredNoiseClock,
      fixedNoiseError
    }
  };
}
