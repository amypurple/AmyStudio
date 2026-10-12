const BYTE_STATES = 0x10000;

function validateTables(pattern, color) {
  if (!(pattern instanceof Uint8Array) || !(color instanceof Uint8Array)) {
    throw new TypeError("Pattern and color must be Uint8Array values.");
  }
  if (!pattern.length || pattern.length !== color.length) {
    throw new Error("Pattern and color tables must have the same non-zero length.");
  }
}

export function swapTms9918ColorNibbles(value) {
  return ((value << 4) | (value >> 4)) & 0xff;
}

export function tms9918UniformRowColor(pattern, color) {
  const foreground = color >> 4;
  const background = color & 0x0f;
  if (pattern === 0) return background;
  if (pattern === 0xff) return foreground;
  if (foreground === background) return foreground;
  return -1;
}

function buildUniformStates() {
  const result = [];
  for (let color = 0; color < 16; color += 1) {
    const states = new Set();
    for (let pattern = 0; pattern < 256; pattern += 1) {
      states.add((pattern << 8) | (color * 0x11));
    }
    for (let other = 0; other < 16; other += 1) {
      states.add((other << 12) | color);
      states.add((0xff << 8) | (color << 4) | other);
    }
    result.push(Int32Array.from(states));
  }
  return result;
}

const UNIFORM_STATES = buildUniformStates();
const lookupStamp = new Int32Array(BYTE_STATES);
const lookupIndex = new Int32Array(BYTE_STATES);
let stampCounter = 0;

function rowStates(pattern, color) {
  const uniform = tms9918UniformRowColor(pattern, color);
  if (uniform >= 0) return UNIFORM_STATES[uniform];
  return Int32Array.of(
    (pattern << 8) | color,
    ((pattern ^ 0xff) << 8) | swapTms9918ColorNibbles(color)
  );
}

function rowPixels(pattern, color) {
  const result = new Uint8Array(8);
  const foreground = color >> 4;
  const background = color & 0x0f;
  for (let bit = 0; bit < 8; bit += 1) {
    result[bit] = pattern & (0x80 >> bit) ? foreground : background;
  }
  return result;
}

export function compareTms9918Mode2Tables(beforePattern, beforeColor, afterPattern, afterColor) {
  validateTables(beforePattern, beforeColor);
  validateTables(afterPattern, afterColor);
  if (beforePattern.length !== afterPattern.length) throw new Error("Table lengths differ.");
  let changedRows = 0;
  let changedPixels = 0;
  for (let index = 0; index < beforePattern.length; index += 1) {
    const before = rowPixels(beforePattern[index], beforeColor[index]);
    const after = rowPixels(afterPattern[index], afterColor[index]);
    let rowChanged = false;
    for (let pixel = 0; pixel < 8; pixel += 1) {
      if (before[pixel] === after[pixel]) continue;
      changedPixels += 1;
      rowChanged = true;
    }
    if (rowChanged) changedRows += 1;
  }
  return { changedRows, changedPixels, identical: changedPixels === 0 };
}

function popcount(value) {
  let count = 0;
  for (let current = value; current; current >>= 1) count += current & 1;
  return count;
}

function applyOrientation(pattern, color, shouldInvert) {
  const outputPattern = new Uint8Array(pattern.length);
  const outputColor = new Uint8Array(color.length);
  for (let index = 0; index < pattern.length; index += 1) {
    const uniform = tms9918UniformRowColor(pattern[index], color[index]);
    if (uniform >= 0) {
      outputPattern[index] = 0;
      outputColor[index] = uniform * 0x11;
      continue;
    }
    const invert = shouldInvert(pattern[index], color[index]);
    outputPattern[index] = invert ? pattern[index] ^ 0xff : pattern[index];
    outputColor[index] = invert ? swapTms9918ColorNibbles(color[index]) : color[index];
  }
  return { pattern: outputPattern, color: outputColor };
}

const EPSILON = 1e-4;

function tieCost(state, pattern, color) {
  const uniform = tms9918UniformRowColor(pattern, color);
  const canonical = uniform >= 0 ? uniform * 0x11 : (pattern << 8) | color;
  return state === canonical ? 0 : EPSILON;
}

function optimizeChain(chain, pattern, color, outputPattern, outputColor, patternWeight, colorWeight, statesForRow = rowStates) {
  const statesByPosition = new Array(chain.length);
  const backByPosition = new Array(chain.length);
  const bestPatternCost = new Float64Array(256);
  const bestPatternIndex = new Int32Array(256);
  const bestColorCost = new Float64Array(256);
  const bestColorIndex = new Int32Array(256);
  let previousStates = null;
  let previousCost = null;

  for (let position = 0; position < chain.length; position += 1) {
    const address = chain[position];
    const states = statesForRow(pattern[address], color[address]);
    const costs = new Float64Array(states.length);
    const back = new Int32Array(states.length);
    if (position === 0) {
      for (let stateIndex = 0; stateIndex < states.length; stateIndex += 1) {
        costs[stateIndex] = tieCost(states[stateIndex], pattern[address], color[address]);
        back[stateIndex] = -1;
      }
    } else {
      bestPatternCost.fill(Infinity);
      bestColorCost.fill(Infinity);
      stampCounter = (stampCounter + 1) | 0;
      if (stampCounter === 0) {
        lookupStamp.fill(0);
        stampCounter = 1;
      }
      let minimum = Infinity;
      let minimumIndex = -1;
      for (let index = 0; index < previousStates.length; index += 1) {
        const state = previousStates[index];
        const statePattern = state >> 8;
        const stateColor = state & 0xff;
        const cost = previousCost[index];
        if (cost < minimum) { minimum = cost; minimumIndex = index; }
        if (cost < bestPatternCost[statePattern]) {
          bestPatternCost[statePattern] = cost;
          bestPatternIndex[statePattern] = index;
        }
        if (cost < bestColorCost[stateColor]) {
          bestColorCost[stateColor] = cost;
          bestColorIndex[stateColor] = index;
        }
        lookupStamp[state] = stampCounter;
        lookupIndex[state] = index;
      }
      for (let stateIndex = 0; stateIndex < states.length; stateIndex += 1) {
        const state = states[stateIndex];
        const statePattern = state >> 8;
        const stateColor = state & 0xff;
        let best = minimum + patternWeight + colorWeight;
        let bestIndex = minimumIndex;
        if (bestPatternCost[statePattern] + colorWeight < best) {
          best = bestPatternCost[statePattern] + colorWeight;
          bestIndex = bestPatternIndex[statePattern];
        }
        if (bestColorCost[stateColor] + patternWeight < best) {
          best = bestColorCost[stateColor] + patternWeight;
          bestIndex = bestColorIndex[stateColor];
        }
        if (lookupStamp[state] === stampCounter && previousCost[lookupIndex[state]] < best) {
          best = previousCost[lookupIndex[state]];
          bestIndex = lookupIndex[state];
        }
        costs[stateIndex] = best + tieCost(state, pattern[address], color[address]);
        back[stateIndex] = bestIndex;
      }
    }
    statesByPosition[position] = states;
    backByPosition[position] = back;
    previousStates = states;
    previousCost = costs;
  }

  let bestIndex = 0;
  for (let index = 1; index < previousCost.length; index += 1) {
    if (previousCost[index] < previousCost[bestIndex]) bestIndex = index;
  }
  for (let position = chain.length - 1; position >= 0; position -= 1) {
    const state = statesByPosition[position][bestIndex];
    outputPattern[chain[position]] = state >> 8;
    outputColor[chain[position]] = state & 0xff;
    bestIndex = backByPosition[position][bestIndex];
  }
}

function optimizeVertical(pattern, color, patternWeight = 1, colorWeight = 1, statesForRow = rowStates) {
  const chain = Int32Array.from({ length: pattern.length }, (_, index) => index);
  const outputPattern = new Uint8Array(pattern.length);
  const outputColor = new Uint8Array(color.length);
  optimizeChain(chain, pattern, color, outputPattern, outputColor, patternWeight, colorWeight, statesForRow);
  return { pattern: outputPattern, color: outputColor };
}

function orientedStates(rule) {
  return (pattern, color) => {
    const uniform = tms9918UniformRowColor(pattern, color);
    if (uniform >= 0) return UNIFORM_STATES[uniform];
    return rule(pattern, color)
      ? Int32Array.of(((pattern ^ 0xff) << 8) | swapTms9918ColorNibbles(color))
      : Int32Array.of((pattern << 8) | color);
  };
}

function optimizeHorizontal(pattern, color) {
  const outputPattern = new Uint8Array(pattern.length);
  const outputColor = new Uint8Array(color.length);
  for (let row = 0; row < Math.min(8, pattern.length); row += 1) {
    const length = Math.ceil((pattern.length - row) / 8);
    const chain = new Int32Array(length);
    for (let index = 0; index < length; index += 1) chain[index] = row + index * 8;
    optimizeChain(chain, pattern, color, outputPattern, outputColor, 1, 1);
  }
  return { pattern: outputPattern, color: outputColor };
}

const FG_HIGH = (_pattern, color) => (color >> 4) < (color & 0x0f);
const FG_LOW = (_pattern, color) => (color >> 4) > (color & 0x0f);

export const TMS9918_MODE2_REPACK_STRATEGIES = Object.freeze([
  { id: "original", label: "Original" },
  { id: "uniform", label: "Single-color canonical" },
  { id: "fg-high", label: "Foreground high" },
  { id: "fg-low", label: "Foreground low" },
  { id: "bit7", label: "Left pixel as background" },
  { id: "sparse", label: "Sparse pattern bits" },
  { id: "fg-high-dp", label: "Foreground high + DP" },
  { id: "fg-low-dp", label: "Foreground low + DP" },
  { id: "dp-v", label: "Vertical stream DP" },
  { id: "dp-v-c", label: "Vertical DP, color weighted" },
  { id: "dp-h", label: "Horizontal row DP" }
]);

export function repackTms9918Mode2(pattern, color, strategy = "dp-v") {
  validateTables(pattern, color);
  let result;
  switch (strategy) {
    case "original": result = { pattern: pattern.slice(), color: color.slice() }; break;
    case "uniform": result = applyOrientation(pattern, color, () => false); break;
    case "fg-high": result = applyOrientation(pattern, color, FG_HIGH); break;
    case "fg-low": result = applyOrientation(pattern, color, FG_LOW); break;
    case "bit7": result = applyOrientation(pattern, color, value => (value & 0x80) !== 0); break;
    case "sparse": result = applyOrientation(pattern, color, value => popcount(value) > 4); break;
    case "fg-high-dp": result = optimizeVertical(pattern, color, 1, 1, orientedStates(FG_HIGH)); break;
    case "fg-low-dp": result = optimizeVertical(pattern, color, 1, 1, orientedStates(FG_LOW)); break;
    case "dp-v": result = optimizeVertical(pattern, color); break;
    case "dp-v-c": result = optimizeVertical(pattern, color, 1, 2); break;
    case "dp-h": result = optimizeHorizontal(pattern, color); break;
    default: throw new Error(`Unknown Mode 2 repack strategy: ${strategy}`);
  }
  const visual = compareTms9918Mode2Tables(pattern, color, result.pattern, result.color);
  if (!visual.identical) throw new Error(`Mode 2 strategy ${strategy} changed ${visual.changedPixels} pixels.`);
  return { ...result, strategy, visual };
}
