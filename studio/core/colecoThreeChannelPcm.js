const ATTENUATION_AMPLITUDE = Object.freeze([
  1,
  10 ** (-2 / 20), 10 ** (-4 / 20), 10 ** (-6 / 20), 10 ** (-8 / 20),
  10 ** (-10 / 20), 10 ** (-12 / 20), 10 ** (-14 / 20), 10 ** (-16 / 20),
  10 ** (-18 / 20), 10 ** (-20 / 20), 10 ** (-22 / 20), 10 ** (-24 / 20),
  10 ** (-26 / 20), 10 ** (-28 / 20), 0
]);

// Pointer deltas used by Amy Bienvenu's 2009 player, expressed in table entries.
const DELTAS = Object.freeze([
  0, -1, 1, 2, -2, 3, -3, 4, -4, 5, -5, -6, 6, 7, -7, 8,
  -8, 9, 10, -9, -10, 11, -12, -11, -13, 12, 13, -14, 14, 16, -15, 15
]);

const START_INDEX = 19; // 8,9,9 in the ordered 46-level table.
const END_MARKER = 0xff;

function buildLevels() {
  const triples = [[15, 15, 15]];
  for (let attenuation = 14; attenuation >= 0; attenuation -= 1) {
    triples.push([attenuation, attenuation + 1, attenuation + 1]);
    triples.push([attenuation, attenuation, attenuation + 1]);
    triples.push([attenuation, attenuation, attenuation]);
  }
  return triples.map((attenuations, index) => Object.freeze({
    index,
    attenuations: Object.freeze(attenuations),
    amplitude: attenuations.reduce((sum, value) => sum + ATTENUATION_AMPLITUDE[value], 0) / 3,
    psgBytes: Object.freeze([
      0x90 | attenuations[0],
      0xb0 | attenuations[1],
      0xd0 | attenuations[2]
    ])
  }));
}

export const THREE_CHANNEL_PCM_LEVELS = Object.freeze(buildLevels());
export const THREE_CHANNEL_PCM_DELTAS = DELTAS;
export const THREE_CHANNEL_PCM_START_INDEX = START_INDEX;

export function quantizeThreeChannelPcmSample(sample) {
  const amplitude = Math.max(0, Math.min(1, ((Number(sample) || 0) + 1) / 2));
  let best = 0;
  let distance = Infinity;
  for (const level of THREE_CHANNEL_PCM_LEVELS) {
    const candidate = Math.abs(level.amplitude - amplitude);
    if (candidate < distance) {
      best = level.index;
      distance = candidate;
    }
  }
  return best;
}

export function resampleThreeChannelPcm(samples, sourceRate, targetRate = 17500, {
  gainPercent = 100
} = {}) {
  if (!samples?.length) return new Uint8Array();
  if (!(sourceRate > 0) || !(targetRate > 0)) throw new Error("Audio sample rates must be positive.");
  const gain = Math.max(0, Math.min(8, (Number(gainPercent) || 100) / 100));
  const count = Math.max(1, Math.round(samples.length * targetRate / sourceRate));
  const levels = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    const sourcePosition = index * sourceRate / targetRate;
    const left = Math.min(samples.length - 1, Math.floor(sourcePosition));
    const right = Math.min(samples.length - 1, left + 1);
    const fraction = sourcePosition - left;
    const sample = (samples[left] + (samples[right] - samples[left]) * fraction) * gain;
    levels[index] = quantizeThreeChannelPcmSample(sample);
  }
  return levels;
}

function chooseSafeDelta(current, target) {
  let bestCode = 0;
  let bestIndex = current;
  let bestDistance = Infinity;
  for (let code = 0; code < DELTAS.length; code += 1) {
    const next = current + DELTAS[code];
    if (next < 0 || next >= THREE_CHANNEL_PCM_LEVELS.length) continue;
    const distance = Math.abs(next - target);
    if (distance < bestDistance || (distance === bestDistance && Math.abs(DELTAS[code]) < Math.abs(DELTAS[bestCode]))) {
      bestCode = code;
      bestIndex = next;
      bestDistance = distance;
    }
  }
  return { code: bestCode, index: bestIndex };
}

export function encodeThreeChannelPcm(levels, { startIndex = START_INDEX } = {}) {
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= THREE_CHANNEL_PCM_LEVELS.length) {
    throw new Error("Three-channel PCM start index must be 0..45.");
  }
  const source = Array.from(levels || []);
  const bytes = [];
  let current = startIndex;
  for (let offset = 0; offset < source.length;) {
    const target = source[offset];
    if (!Number.isInteger(target) || target < 0 || target >= THREE_CHANNEL_PCM_LEVELS.length) {
      throw new Error(`Three-channel PCM level ${target} must be 0..45.`);
    }
    const selected = chooseSafeDelta(current, target);
    current = selected.index;
    let run = 1;
    while (run < 8 && offset + run < source.length && source[offset + run] === target) run += 1;
    // $FF is the stream terminator, so delta code 31 can carry at most seven units.
    if (run === 8 && selected.code === 31) run = 7;
    bytes.push(((run - 1) << 5) | selected.code);
    offset += run;
  }
  bytes.push(END_MARKER);
  return Uint8Array.from(bytes);
}

export function decodeThreeChannelPcm(bytes, { startIndex = START_INDEX, maxUnits = 10000000 } = {}) {
  const levels = [];
  let current = startIndex;
  let ended = false;
  for (const raw of bytes || []) {
    const byte = raw & 0xff;
    if (byte === END_MARKER) {
      ended = true;
      break;
    }
    current += DELTAS[byte & 0x1f];
    if (current < 0 || current >= THREE_CHANNEL_PCM_LEVELS.length) {
      throw new Error(`Three-channel PCM delta leaves the amplitude table at output unit ${levels.length}.`);
    }
    const repeat = (byte >>> 5) + 1;
    if (levels.length + repeat > maxUnits) throw new Error("Three-channel PCM stream exceeds its output limit.");
    for (let count = 0; count < repeat; count += 1) levels.push(current);
  }
  if (!ended) throw new Error("Three-channel PCM stream has no end marker.");
  return Uint8Array.from(levels);
}

export function threeChannelPcmLevelTableBytes() {
  return Uint8Array.from(THREE_CHANNEL_PCM_LEVELS.flatMap(level => level.psgBytes));
}

export function threeChannelPcmDeltaTableBytes() {
  return Uint8Array.from(DELTAS, delta => (delta * 3) & 0xff);
}

export function threeChannelPcmLevelsToPreviewSamples(levels, { gain = 0.9 } = {}) {
  const output = new Float32Array(levels?.length || 0);
  for (let index = 0; index < output.length; index += 1) {
    const level = THREE_CHANNEL_PCM_LEVELS[levels[index]];
    if (!level) throw new Error(`Three-channel PCM level ${levels[index]} must be 0..45.`);
    output[index] = Math.max(-1, Math.min(1, ((level.amplitude * 2) - 1) * gain));
  }
  return output;
}

export function threeChannelPcmBytesToPreviewSamples(bytes, options = {}) {
  return threeChannelPcmLevelsToPreviewSamples(decodeThreeChannelPcm(bytes), options);
}

export function samplesToThreeChannelPcm(samples, sourceRate, {
  targetRate = 17500,
  label = "SoundData",
  gainPercent = 100
} = {}) {
  const levels = resampleThreeChannelPcm(samples, sourceRate, targetRate, { gainPercent });
  const bytes = encodeThreeChannelPcm(levels);
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  $${Array.from(bytes.slice(offset, offset + 16), value => value.toString(16).toUpperCase().padStart(2, "0")).join(",$")}`);
  }
  return {
    label,
    levels,
    bytes,
    sampleRate: targetRate,
    gainPercent,
    durationSec: levels.length / targetRate,
    unitCount: levels.length,
    byteCount: bytes.length,
    alexisSource: `data ${label} bytes\n${rows.join("\n")}\nend data`
  };
}
