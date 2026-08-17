const TMS9918_RGB = [
  [0, 0, 0], [0, 0, 0], [71, 183, 73], [124, 208, 126],
  [89, 85, 224], [185, 94, 81], [101, 219, 239], [220, 205, 86],
  [211, 88, 80], [255, 127, 118], [204, 195, 94], [222, 212, 135],
  [58, 162, 65], [183, 99, 190], [204, 204, 204], [255, 255, 255]
];

function validateTables(pattern, color) {
  if (!(pattern instanceof Uint8Array) || !(color instanceof Uint8Array)) {
    throw new TypeError("Pattern and color must be Uint8Array values.");
  }
  if (pattern.length !== color.length) throw new Error("Pattern and color tables must have equal lengths.");
}

export function isTms9918CompressionCandidateEligible({ beforeBytes, afterBytes, roundTripOk, visualOk }) {
  return Number.isInteger(beforeBytes)
    && Number.isInteger(afterBytes)
    && afterBytes < beforeBytes
    && roundTripOk === true
    && visualOk === true;
}
export function renderTms9918ColorIndexes(pattern, color) {
  validateTables(pattern, color);
  const pixels = new Uint8Array(pattern.length * 8);
  for (let row = 0; row < pattern.length; row += 1) {
    const foreground = color[row] >> 4;
    const background = color[row] & 0x0f;
    for (let bit = 0; bit < 8; bit += 1) {
      pixels[row * 8 + bit] = pattern[row] & (0x80 >> bit) ? foreground : background;
    }
  }
  return pixels;
}

export function compareTms9918BitmapVisuals(beforePattern, beforeColor, afterPattern, afterColor) {
  const before = renderTms9918ColorIndexes(beforePattern, beforeColor);
  const after = renderTms9918ColorIndexes(afterPattern, afterColor);
  let changedPixels = 0;
  let squaredColorDistance = 0;
  let maxColorDistance = 0;
  for (let index = 0; index < before.length; index += 1) {
    if (before[index] === after[index]) continue;
    changedPixels += 1;
    const left = TMS9918_RGB[before[index]];
    const right = TMS9918_RGB[after[index]];
    const distance = Math.sqrt(
      (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2 + (left[2] - right[2]) ** 2
    );
    squaredColorDistance += distance ** 2;
    maxColorDistance = Math.max(maxColorDistance, distance);
  }
  return {
    pixelCount: before.length,
    changedPixels,
    changedPercent: before.length ? changedPixels * 100 / before.length : 0,
    rmsColorDistance: changedPixels ? Math.sqrt(squaredColorDistance / changedPixels) : 0,
    maxColorDistance,
    identical: changedPixels === 0
  };
}

export function optimizeTms9918BitmapLossless(pattern, color) {
  validateTables(pattern, color);
  const optimizedPattern = pattern.slice();
  const optimizedColor = color.slice();
  let canonicalizedRows = 0;
  for (let row = 0; row < pattern.length; row += 1) {
    if ((color[row] >> 4) === (color[row] & 0x0f) && optimizedPattern[row] !== 0) {
      optimizedPattern[row] = 0;
      canonicalizedRows += 1;
    }
  }
  const visual = compareTms9918BitmapVisuals(pattern, color, optimizedPattern, optimizedColor);
  if (!visual.identical) throw new Error("Lossless TMS9918 optimization changed rendered pixels.");
  return { pattern: optimizedPattern, color: optimizedColor, visual, canonicalizedRows };
}

function rowDifference(pattern, color, row, candidateRow) {
  let changedPixels = 0;
  let maxColorDistance = 0;
  let squaredColorDistance = 0;
  const sourceForeground = color[row] >> 4;
  const sourceBackground = color[row] & 0x0f;
  const candidateForeground = color[candidateRow] >> 4;
  const candidateBackground = color[candidateRow] & 0x0f;
  for (let bit = 0; bit < 8; bit += 1) {
    const sourceIndex = pattern[row] & (0x80 >> bit) ? sourceForeground : sourceBackground;
    const candidateIndex = pattern[candidateRow] & (0x80 >> bit) ? candidateForeground : candidateBackground;
    if (sourceIndex === candidateIndex) continue;
    changedPixels += 1;
    const sourceRgb = TMS9918_RGB[sourceIndex];
    const candidateRgb = TMS9918_RGB[candidateIndex];
    const distance = Math.sqrt(
      (sourceRgb[0] - candidateRgb[0]) ** 2
      + (sourceRgb[1] - candidateRgb[1]) ** 2
      + (sourceRgb[2] - candidateRgb[2]) ** 2
    );
    maxColorDistance = Math.max(maxColorDistance, distance);
    squaredColorDistance += distance ** 2;
  }
  return {
    changedPixels,
    maxColorDistance,
    rmsColorDistance: changedPixels ? Math.sqrt(squaredColorDistance / changedPixels) : 0
  };
}

export function optimizeTms9918BitmapControlled(pattern, color, options = {}) {
  validateTables(pattern, color);
  const maxChangedPixelsPerRow = Math.max(0, Number(options.maxChangedPixelsPerRow ?? 1));
  const maxColorDistance = Math.max(0, Number(options.maxColorDistance ?? 48));
  const maxChangedPixels = Math.max(0, Number(options.maxChangedPixels ?? Math.ceil(pattern.length * 8 * 0.001)));
  const offsets = (options.referenceOffsets || [1, 8, 256, 2048]).filter((value) => Number.isInteger(value) && value > 0);
  const optimizedPattern = pattern.slice();
  const optimizedColor = color.slice();
  let acceptedRows = 0;
  let acceptedPixels = 0;

  for (let row = 0; row < pattern.length && acceptedPixels < maxChangedPixels; row += 1) {
    let best = null;
    for (const offset of offsets) {
      const candidateRow = row - offset;
      if (candidateRow < 0) continue;
      const difference = rowDifference(optimizedPattern, optimizedColor, row, candidateRow);
      if (difference.changedPixels === 0 || difference.changedPixels > maxChangedPixelsPerRow) continue;
      if (difference.maxColorDistance > maxColorDistance) continue;
      if (acceptedPixels + difference.changedPixels > maxChangedPixels) continue;
      if (!best || difference.changedPixels < best.difference.changedPixels
        || (difference.changedPixels === best.difference.changedPixels
          && difference.rmsColorDistance < best.difference.rmsColorDistance)) {
        best = { candidateRow, difference };
      }
    }
    if (!best) continue;
    optimizedPattern[row] = optimizedPattern[best.candidateRow];
    optimizedColor[row] = optimizedColor[best.candidateRow];
    acceptedRows += 1;
    acceptedPixels += best.difference.changedPixels;
  }

  const visual = compareTms9918BitmapVisuals(pattern, color, optimizedPattern, optimizedColor);
  if (visual.changedPixels > maxChangedPixels || visual.maxColorDistance > maxColorDistance + 1e-9) {
    throw new Error("Controlled TMS9918 optimization exceeded its visual limits.");
  }
  return { pattern: optimizedPattern, color: optimizedColor, visual, acceptedRows, options: {
    maxChangedPixelsPerRow, maxColorDistance, maxChangedPixels, referenceOffsets: offsets
  } };
}