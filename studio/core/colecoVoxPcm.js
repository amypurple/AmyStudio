import {
  decodeThreeChannelPcmCompact,
  encodeThreeChannelPcmCompact,
  resampleThreeChannelPcm
} from "./colecoThreeChannelPcm.js";

export const VOX_PCM_MASTER_CLOCK = 3579545;

// Higher quality emits more amplitude units for the same duration. These
// presets are cycle-balanced for the segmented Z80 player.
export const VOX_PCM_QUALITY_PRESETS = Object.freeze([
  Object.freeze({ id: "minimum", rank: 0, targetCycles: 1480, repeatDelay: 57, boundaryDelay: 56 }),
  Object.freeze({ id: "draft", rank: 1, targetCycles: 1060, repeatDelay: 37, boundaryDelay: 33 }),
  Object.freeze({ id: "tiny", rank: 2, targetCycles: 848, repeatDelay: 27, boundaryDelay: 21 }),
  Object.freeze({ id: "compact", rank: 3, targetCycles: 742, repeatDelay: 22, boundaryDelay: 15 }),
  Object.freeze({ id: "balanced", rank: 4, targetCycles: 632, repeatDelay: 17, boundaryDelay: 9 }),
  Object.freeze({ id: "high", rank: 5, targetCycles: 538, repeatDelay: 12, boundaryDelay: 4 }),
  Object.freeze({ id: "maximum", rank: 6, targetCycles: 481, repeatDelay: 9, boundaryDelay: 1 })
]);

const presetById = new Map(VOX_PCM_QUALITY_PRESETS.map(preset => [preset.id, preset]));

export function voxPcmQualityPreset(id) {
  const preset = presetById.get(String(id || "").toLowerCase());
  if (!preset) throw new Error(`Unknown VoxPCM quality '${id}'.`);
  return preset;
}

function segmentComplexity(samples, start, end) {
  let movement = 0;
  let curvature = 0;
  let previous = Number(samples[start]) || 0;
  let previousDelta = 0;
  for (let index = start + 1; index < end; index += 1) {
    const value = Number(samples[index]) || 0;
    const delta = value - previous;
    movement += Math.abs(delta);
    curvature += Math.abs(delta - previousDelta);
    previous = value;
    previousDelta = delta;
  }
  const count = Math.max(1, end - start - 1);
  return movement / count + curvature / count * 0.5;
}

function chooseAdaptivePreset(complexity, minimumComplexity, maximumComplexity, minimumRank, maximumRank) {
  const range = maximumComplexity - minimumComplexity;
  const normalized = range > 0 ? Math.max(0, Math.min(1, (complexity - minimumComplexity) / range)) : 0.5;
  const rank = minimumRank + Math.round(normalized * (maximumRank - minimumRank));
  return VOX_PCM_QUALITY_PRESETS[Math.max(minimumRank, Math.min(maximumRank, rank))];
}

export function encodeVoxPcmSegments(samples, sourceRate, {
  segmentMilliseconds = 250,
  quality = "adaptive",
  minimumQuality = "compact",
  maximumQuality = "maximum",
  gainPercent = 100,
  dither = true,
  labelPrefix = "VoxPart",
  adaptiveComplexityRange = null
} = {}) {
  if (!samples?.length) throw new Error("VoxPCM needs audio samples.");
  if (!(sourceRate > 0)) throw new Error("VoxPCM source rate must be positive.");
  const segmentSamples = Math.max(1, Math.round(sourceRate * Math.max(20, segmentMilliseconds) / 1000));
  const minimum = voxPcmQualityPreset(minimumQuality);
  const maximum = voxPcmQualityPreset(maximumQuality);
  if (minimum.rank > maximum.rank) throw new Error("VoxPCM minimum quality cannot exceed maximum quality.");
  const fixed = String(quality).toLowerCase() === "adaptive" ? null : voxPcmQualityPreset(quality);
  const windows = [];
  for (let start = 0; start < samples.length; start += segmentSamples) {
    const end = Math.min(samples.length, start + segmentSamples);
    windows.push({ start, end, complexity: segmentComplexity(samples, start, end) });
  }
  const complexities = windows.map(window => window.complexity);
  const minimumComplexity = Number.isFinite(adaptiveComplexityRange?.minimum)
    ? adaptiveComplexityRange.minimum
    : Math.min(...complexities);
  const maximumComplexity = Number.isFinite(adaptiveComplexityRange?.maximum)
    ? adaptiveComplexityRange.maximum
    : Math.max(...complexities);
  if (minimumComplexity > maximumComplexity) throw new Error("VoxPCM adaptive complexity range is reversed.");
  const parts = [];
  for (let partIndex = 0; partIndex < windows.length; partIndex += 1) {
    const { start, end, complexity } = windows[partIndex];
    const preset = fixed || chooseAdaptivePreset(complexity, minimumComplexity, maximumComplexity, minimum.rank, maximum.rank);
    const durationSeconds = (end - start) / sourceRate;
    const targetRate = VOX_PCM_MASTER_CLOCK / preset.targetCycles;
    const levels = resampleThreeChannelPcm(samples.slice(start, end), sourceRate, targetRate, { gainPercent, dither });
    const bytes = encodeThreeChannelPcmCompact(levels);
    parts.push({
      label: `${labelPrefix}${partIndex + 1}`,
      quality: preset.id,
      repeatDelay: preset.repeatDelay,
      boundaryDelay: preset.boundaryDelay,
      complexity,
      durationSeconds,
      targetRate,
      unitCount: levels.length,
      bytes
    });
  }
  return {
    format: "voxpcm-v1",
    sourceRate,
    segmentMilliseconds,
    durationSeconds: samples.length / sourceRate,
    byteCount: parts.reduce((sum, part) => sum + part.bytes.length, 0),
    parts
  };
}

export function voxPcmSequenceAsm(sequenceLabel, parts, { loop = true } = {}) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(sequenceLabel)) throw new Error("Invalid VoxPCM sequence label.");
  if (!parts?.length) throw new Error("VoxPCM sequence needs at least one part.");
  const rows = [`${sequenceLabel}:`];
  for (const part of parts) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part.label)) throw new Error(`Invalid VoxPCM part label '${part.label}'.`);
    rows.push(`  dw ${part.label}`, `  db ${part.repeatDelay},${part.boundaryDelay}`);
  }
  rows.push(`  dw 0,${loop ? sequenceLabel : 0}`);
  return rows.join("\n");
}

export function voxPcmToPreviewSamples(parts, sampleRate = 22050) {
  const output = [];
  for (const part of parts || []) {
    const preset = voxPcmQualityPreset(part.quality);
    const levels = decodeThreeChannelPcmCompact(part.bytes);
    const sourceRate = VOX_PCM_MASTER_CLOCK / preset.targetCycles;
    const frameCount = Math.max(1, Math.round(levels.length * sampleRate / sourceRate));
    for (let index = 0; index < frameCount; index += 1) {
      const sourceIndex = Math.min(levels.length - 1, Math.floor(index * sourceRate / sampleRate));
      output.push((levels[sourceIndex] - 22.5) / 22.5);
    }
  }
  return Float32Array.from(output);
}
