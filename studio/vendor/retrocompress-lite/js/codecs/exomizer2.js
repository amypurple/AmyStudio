/*
 * Independent Exomizer 2 raw P0 encoder and decoder.
 *
 * The decoder follows Magnus Lind's authoritative portable Exomizer 2 raw
 * decompressor rather than re-deriving the format from Z80 implementation
 * details.
 *
 * The encoder is an iterative optimal parse modeled on the structure of the
 * real compressor's optimal.c table builder: parse with a bit-cost estimate,
 * rebuild the four Huffman-like
 * tables from the chosen tokens' real frequency distribution, re-parse with
 * the new real costs, and repeat until the encoded size stops improving.
 *
 * The encoder favors deterministic browser execution and valid P0 output.
 * Amy Studio compares its result with RAW and every enabled codec before
 * recommending a format.
 */

const asBytes = (data) => (data instanceof Uint8Array ? data : new Uint8Array(data));
const MAX_OFFSET = 65535;
const LITERAL_BITS = 9; // 1 flag bit + 8 data bits, matches optimal.c's `9.0f * mp->len`
const LITERAL_BLOCK_GAMMA = 17;
const EOF_GAMMA = 16;
const LENGTH_TABLE_SIZE = 16;
const OFFSET3_TABLE_SIZE = 16;
const OFFSET2_TABLE_SIZE = 16;
const OFFSET1_TABLE_SIZE = 4;

// Research-only env overrides for the match-finder sweep in the 2026-09-10
// beam/penalty follow-up thread (per-image gap instrumentation, chain-step
// and match-scan limits, short-match candidate count). No effect in a
// browser (no `process`), no public API added.
function envInt(name, fallback) {
  const raw = typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_CHAIN_STEPS = envInt("AMY_EXOMIZER2_MAX_CHAIN_STEPS", 2048);
// Bounds how far a single candidate's match is scanned during search. This
// must be a hard constant, not derived from input length: without it, a
// large uniform region (e.g. a solid-color background -- exactly the
// content real game art has plenty of) makes every one of up to
// MAX_CHAIN_STEPS candidates at every position scan to the end of the
// input, an unbounded positions*chainSteps*runLength blowup. The format can
// still represent much longer matches than this (the length table's base
// grows geometrically via its bit widths); this cap only limits how much
// scanning a single candidate probe costs, not what length can be encoded.
const MAX_MATCH_SCAN = envInt("AMY_EXOMIZER2_MAX_MATCH_SCAN", 4096);
// Research-only override for encoder quality and latency measurements.
const envMaxIterations = typeof process !== "undefined" && process.env && process.env.AMY_EXOMIZER2_MAX_ITERATIONS
  ? Number(process.env.AMY_EXOMIZER2_MAX_ITERATIONS)
  : NaN;
const MAX_ITERATIONS = Number.isFinite(envMaxIterations) && envMaxIterations >= 0 ? envMaxIterations : 8;
// The hash chain below only ever finds matches of length >= 3 (its key is an
// exact 3-byte match). The format has dedicated, cheap offsets1/offsets2
// tables specifically for length-1/length-2 matches (a 2-bit or 4-bit
// selector instead of searching a full table), which are common in tiled
// bitmap data as short byte-level repeats. Indexed predecessor chains cover
// the format's complete offset range without scanning every intervening byte.
const SHORT_MATCH_MAX_OFFSET = envInt("AMY_EXOMIZER2_SHORT_MATCH_MAX_OFFSET", MAX_OFFSET);
// How many distinct offsets to keep as length-1/length-2 candidates, rather
// than only the smallest ("dominant") one. A larger offset is not strictly
// dominated by a smaller one from the optimal parser's point of view once
// table costs are considered (their index costs come from the same
// offsets1/offsets2 table, so a farther offset can occasionally still beat
// a nearer one depending on where table boundaries land) -- this is exactly
// the hypothesis this override exists to test, not an assumed conclusion.
const SHORT_MATCH_CANDIDATES = envInt("AMY_EXOMIZER2_SHORT_MATCH_CANDIDATES", 4);
const EQUAL_LENGTH_MATCH_CANDIDATES = envInt("AMY_EXOMIZER2_EQUAL_LENGTH_MATCH_CANDIDATES", 8);

function tableEntries(bits) {
  let base = 1;
  return bits.map((width) => {
    const entry = { base, bits: width };
    base += 1 << width;
    return entry;
  });
}

function findEntry(entries, value) {
  const index = entries.findIndex((entry) => value >= entry.base && value < entry.base + (1 << entry.bits));
  if (index < 0) throw new Error(`Value ${value} is outside the Exomizer 2 table`);
  return { index, entry: entries[index] };
}

// Cost (in bits) of encoding `value` against `entries`, extrapolating a
// plausible cost when `value` isn't covered yet (this only happens mid-
// iteration, before tables are rebuilt from this pass's real token choices;
// the estimate just needs to be self-consistent enough to guide the parse,
// since the next iteration rebuilds tables from whatever actually got used).
function lookupCost(entries, indexCost, value, allowExtrapolation = false) {
  const index = entries.findIndex((entry) => value >= entry.base && value < entry.base + (1 << entry.bits));
  if (index >= 0) return indexCost(index) + entries[index].bits;
  if (!allowExtrapolation) return Number.POSITIVE_INFINITY;
  const last = entries[entries.length - 1];
  const lastEnd = last.base + (1 << last.bits);
  const extraBits = Math.max(1, Math.ceil(Math.log2(value - lastEnd + 2)));
  return indexCost(entries.length - 1) + last.bits + extraBits;
}

function gammaCost(index) {
  return index + 1;
}

// Dynamic program over `entryCount` fixed slots: for each slot, choose a bit
// width in 0..15 minimizing sum(count_in_slot * (indexCost + width)) using
// prefix sums over the observed value histogram. Mirrors the interval search
// in optimal.c's optimize1(), minus its literal-fallback escape valve (see
// the literal-fallback escape valve used by the reference optimizer).
// Caps how many candidate (base -> {cost, widths}) states survive between
// slots. Without this, the state map can in principle branch up to 16-wide
// at each of up to 16 slots with no guaranteed collisions to bound it,
// another unbounded-time risk independent of match search. Keeping only the
// cheapest states is a standard beam-search trade: bounded, deterministic
// work in exchange for a small chance of missing the true optimum.
// Research-only override for encoder quality and latency measurements; no
// effect in a browser (no `process`) and no public API surface added.
const envBeamWidth = typeof process !== "undefined" && process.env && process.env.AMY_EXOMIZER2_BEAM_WIDTH
  ? Number(process.env.AMY_EXOMIZER2_BEAM_WIDTH)
  : NaN;
const OPTIMIZE_TABLE_BEAM_WIDTH = Number.isFinite(envBeamWidth) && envBeamWidth > 0 ? envBeamWidth : 4096;
// Research-only toggle for the literal-fallback escape valve (see
// buildOffsetPenalty/applyGiveUpBoundaries below), for A/B comparison
// against the earlier baseline that didn't have it. Defaults on; browsers
// always default on too (no `process`).
const PENALTY_ENABLED = !(typeof process !== "undefined" && process.env && process.env.AMY_EXOMIZER2_DISABLE_PENALTY === "1");

// Diagnostic-only (not part of the codec's public API): tracks the largest
// pre-pruning state count optimizeTable ever saw, for the beam sweep report.
let peakOptimizeTableStates = 0;
export function __resetExomizer2Diagnostics() {
  peakOptimizeTableStates = 0;
}
export function __getExomizer2PeakStateCount() {
  return peakOptimizeTableStates;
}

// `penaltyFromValue(v)`, when given, is optimal.c's `stats2` equivalent: the
// total bit cost of choosing NOT to cover values >= v in this table at all
// (every one of those observed values would have to become literals
// instead). Real Exomizer only applies this to the three offset tables, not
// the length table -- an outlier length has no substitute encoding, but an
// outlier offset's underlying match can always fall back to literal bytes.
// When it's cheaper to give up at some boundary than to keep widening the
// table to reach every observed value, the returned `giveUpAt` tells the
// caller which values must be re-emitted as literals instead of matches.
function optimizeTable(values, entryCount, indexCost = () => 0, penaltyFromValue = null) {
  if (!values.length) return { widths: new Array(entryCount).fill(0), giveUpAt: null };
  const maxValue = Math.max(...values);
  const frequencies = new Uint32Array(maxValue + 1);
  for (const value of values) frequencies[value] += 1;
  const prefix = new Uint32Array(maxValue + 2);
  for (let value = 0; value <= maxValue; value += 1) prefix[value + 1] = prefix[value] + frequencies[value];
  const countRange = (first, last) => prefix[Math.min(maxValue + 1, last + 1)] - prefix[Math.min(maxValue + 1, first)];

  let states = new Map([[1, { cost: 0, widths: [] }]]);
  let bestGiveUp = null;
  for (let index = 0; index < entryCount; index += 1) {
    const next = new Map();
    for (const [base, state] of states) {
      if (penaltyFromValue && base <= maxValue) {
        const giveUpCost = state.cost + penaltyFromValue(base);
        if (!bestGiveUp || giveUpCost < bestGiveUp.cost) {
          bestGiveUp = { cost: giveUpCost, base, widths: state.widths };
        }
      }
      const widths = base > maxValue ? [0] : Array.from({ length: 16 }, (_, width) => width);
      for (const width of widths) {
        const end = base + (1 << width) - 1;
        const count = countRange(base, end);
        const candidate = {
          cost: state.cost + count * (width + indexCost(index)),
          widths: [...state.widths, width]
        };
        const nextBase = end + 1;
        const previous = next.get(nextBase);
        if (!previous || candidate.cost < previous.cost) next.set(nextBase, candidate);
      }
    }
    if (next.size > peakOptimizeTableStates) peakOptimizeTableStates = next.size;
    if (next.size > OPTIMIZE_TABLE_BEAM_WIDTH) {
      const entries = [...next.entries()];
      // Keep the cheapest states (quality) plus the highest-`base` states
      // (feasibility: a state's `base` is how far it's covered the value
      // range so far, and with few slots left, only the most-advanced
      // states can still reach past maxValue -- pruning by cost alone can
      // discard every one of those in favor of cheaper-but-stalled states).
      const byCost = entries.slice().sort((a, b) => a[1].cost - b[1].cost).slice(0, OPTIMIZE_TABLE_BEAM_WIDTH);
      const byBase = entries.slice().sort((a, b) => b[0] - a[0]).slice(0, OPTIMIZE_TABLE_BEAM_WIDTH / 4);
      states = new Map([...byCost, ...byBase]);
    } else {
      states = next;
    }
  }
  let best = null;
  for (const [base, state] of states) {
    if (base <= maxValue) continue;
    if (!best || state.cost < best.cost) best = state;
  }
  if (bestGiveUp && (!best || bestGiveUp.cost < best.cost)) {
    const widths = [...bestGiveUp.widths, ...new Array(entryCount - bestGiveUp.widths.length).fill(0)];
    return { widths, giveUpAt: bestGiveUp.base };
  }
  if (!best) throw new Error(`Cannot build Exomizer table covering ${maxValue}`);
  return { widths: best.widths, giveUpAt: null };
}

// Per position, the Pareto-optimal (length, offset) frontier: walking the
// hash chain nearest-offset-first, a candidate is kept only if it beats the
// longest length any closer offset already achieved. This lets the optimal
// parser trade a shorter match at a cheaper offset against a longer match
// at a pricier one, instead of always taking the single longest match.
function findMatchCandidates(input) {
  const n = input.length;
  const head = new Map();
  const prevPos = new Int32Array(n).fill(-1);
  const byteHead = new Int32Array(256).fill(-1);
  const pairHead = new Int32Array(65536).fill(-1);
  const prevBytePos = new Int32Array(n).fill(-1);
  const prevPairPos = new Int32Array(n).fill(-1);
  const candidatesAt = new Array(n);

  const keyAt = (pos) => (input[pos] << 16) | (input[pos + 1] << 8) | input[pos + 2];
  const pairKeyAt = (pos) => (input[pos] << 8) | input[pos + 1];

  for (let pos = 0; pos < n; pos += 1) {
    const list = [];
    // Keep up to SHORT_MATCH_CANDIDATES distinct offsets per short length,
    // smallest first (SHORT_MATCH_CANDIDATES=1 reproduces the original
    // "smallest offset only" behavior). A larger offset isn't necessarily
    // dominated once real table costs are considered -- see the constant's
    // definition for why this is a real hypothesis, not an assumption.
    let source = byteHead[input[pos]];
    for (let count = 0; source >= 0 && count < SHORT_MATCH_CANDIDATES; count += 1) {
      const offset = pos - source;
      if (offset > SHORT_MATCH_MAX_OFFSET) break;
      list.push({ length: 1, offset });
      source = prevBytePos[source];
    }
    if (pos + 1 < n) {
      source = pairHead[pairKeyAt(pos)];
      for (let count = 0; source >= 0 && count < SHORT_MATCH_CANDIDATES; count += 1) {
        const offset = pos - source;
        if (offset > SHORT_MATCH_MAX_OFFSET) break;
        list.push({ length: 2, offset });
        source = prevPairPos[source];
      }
    }
    if (pos + 2 < n) {
      const key = keyAt(pos);
      source = head.has(key) ? head.get(key) : -1;
      let bestLength = 0;
      let equalLengthCount = 0;
      let steps = 0;
      while (source >= 0 && steps < MAX_CHAIN_STEPS && bestLength < MAX_MATCH_SCAN) {
        const offset = pos - source;
        if (offset > MAX_OFFSET) break;
        const limit = Math.min(MAX_MATCH_SCAN, n - pos);
        // Quick reject: this candidate can only improve on bestLength if it
        // still matches at that position, checked before paying for a full
        // scan. Without this, a long uniform or periodic run makes every
        // chain candidate redo an equally long scan even though none of
        // them can beat the length the very first (closest) one already
        // found -- O(chainSteps * scanCap) wasted work per position.
        if (bestLength > 0) {
          const canTie = equalLengthCount < EQUAL_LENGTH_MATCH_CANDIDATES
            && input[pos + bestLength - 1] === input[source + bestLength - 1];
          const canImprove = bestLength < limit
            && input[pos + bestLength] === input[source + bestLength];
          if (!canTie && !canImprove) {
            source = prevPos[source];
            steps += 1;
            continue;
          }
        }
        let length = 0;
        while (length < limit && input[pos + length] === input[source + length]) length += 1;
        if (length > bestLength) {
          list.push({ length, offset });
          bestLength = length;
          equalLengthCount = 1;
        } else if (length === bestLength && length >= 3 && equalLengthCount < EQUAL_LENGTH_MATCH_CANDIDATES) {
          list.push({ length, offset });
          equalLengthCount += 1;
        }
        source = prevPos[source];
        steps += 1;
      }
    }
    candidatesAt[pos] = list;
    prevBytePos[pos] = byteHead[input[pos]];
    byteHead[input[pos]] = pos;
    if (pos + 1 < n) {
      const pairKey = pairKeyAt(pos);
      prevPairPos[pos] = pairHead[pairKey];
      pairHead[pairKey] = pos;
    }
    if (pos + 2 < n) {
      const key = keyAt(pos);
      prevPos[pos] = head.has(key) ? head.get(key) : -1;
      head.set(key, pos);
    }
  }
  return candidatesAt;
}

function offsetTableFor(length, tables) {
  if (length === 1) return tables.offsets1;
  if (length === 2) return tables.offsets2;
  return tables.offsets3;
}

function offsetSelectorBits(length) {
  return length === 1 ? 2 : 4;
}

function matchBitCost(length, offset, tables, allowExtrapolation = false) {
  const lengthIndex = tables.lengths.findIndex((entry) => length >= entry.base && length < entry.base + (1 << entry.bits));
  const lengthCost = lengthIndex >= 0
    ? gammaCost(lengthIndex) + tables.lengths[lengthIndex].bits
    : gammaCost(tables.lengths.length - 1) + lookupCost(tables.lengths, () => 0, length, allowExtrapolation);
  const offsetEntries = offsetTableFor(length, tables);
  const offsetCost = offsetSelectorBits(length) + lookupCost(offsetEntries, () => 0, offset, allowExtrapolation);
  return 1 + lengthCost + offsetCost;
}

const FLAT_TABLES = {
  lengths: tableEntries(new Array(LENGTH_TABLE_SIZE).fill(0)),
  offsets1: tableEntries(new Array(OFFSET1_TABLE_SIZE).fill(0)),
  offsets2: tableEntries(new Array(OFFSET2_TABLE_SIZE).fill(0)),
  offsets3: tableEntries(new Array(OFFSET3_TABLE_SIZE).fill(0))
};

// Optimal parse: shortest-path DP over byte positions, where each edge is
// either one literal byte (fixed 9-bit cost) or a candidate match (real
// cost against the current table estimate). `tables` is null on the very
// first bootstrap pass, before any real distribution is known, in which
// case FLAT_TABLES (all-zero-width slots) stands in as a rough, table-
// agnostic estimate -- it only has to be good enough to pick a first token
// stream to build real tables from.
function literalBlockBitCost(length) {
  return 1 + gammaCost(LITERAL_BLOCK_GAMMA) + 16 + length * 8;
}

function matchLengthOptions(maxLength, tables) {
  if (maxLength < 3) return [maxLength];
  const lengths = new Set([maxLength]);
  for (const entry of tables.lengths) {
    const end = entry.base + (1 << entry.bits) - 1;
    if (end >= 3 && end < maxLength) lengths.add(end);
  }
  return [...lengths];
}

// A geometrically-spaced set of literal-block lengths to try as direct DP
// candidates at every position, alongside individual literal/match choices.
// A tiny, individually-cheap match (a 1/256-odds accidental single-byte
// coincidence, say) can locally beat a literal at every position along an
// otherwise genuinely incompressible run, fragmenting it below the ~34-byte
// break-even point a literal block needs to pay for its own 34-bit header --
// even though NOT taking that match and covering the whole run as one block
// would have been cheaper overall. Post-hoc merging (mergeLiteralBlocks)
// only ever sees whatever literal run survived that fragmentation; offering
// block lengths as real edges lets the shortest-path search weigh the two
// strategies on equal footing, using the exact same cost[] this DP already
// computes backward. The set is bounded (not tried at every possible
// length) to keep this O(candidates) per position, not O(n).
const LITERAL_BLOCK_TRIAL_LENGTHS = [35, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096, 6144];

function parseOptimal(input, candidatesAt, tables) {
  const activeTables = tables || FLAT_TABLES;
  const n = input.length;
  const cost = new Float64Array(n + 1);
  const choice = new Array(n);
  for (let i = n - 1; i >= 0; i -= 1) {
    let best = cost[i + 1] + LITERAL_BITS;
    let bestChoice = null; // null means literal
    for (const candidate of candidatesAt[i]) {
      for (const length of matchLengthOptions(candidate.length, activeTables)) {
        const c = matchBitCost(length, candidate.offset, activeTables, tables === null) + cost[i + length];
        if (c < best) {
          best = c;
          bestChoice = { length, offset: candidate.offset };
        }
      }
    }
    for (const length of LITERAL_BLOCK_TRIAL_LENGTHS) {
      if (i + length > n) break;
      const c = literalBlockBitCost(length) + cost[i + length];
      if (c < best) {
        best = c;
        bestChoice = { kind: "literalBlock", length };
      }
    }
    cost[i] = best;
    choice[i] = bestChoice;
  }

  const tokens = [];
  let i = 0;
  while (i < n) {
    const picked = choice[i];
    if (!picked) {
      tokens.push({ kind: "literal", value: input[i] });
      i += 1;
    } else if (picked.kind === "literalBlock") {
      tokens.push({ kind: "literalBlock", bytes: Array.from(input.subarray(i, i + picked.length)) });
      i += picked.length;
    } else {
      tokens.push({ kind: "match", length: picked.length, offset: picked.offset });
      i += picked.length;
    }
  }
  return tokens;
}

// The literal-fallback escape valve: after tables are built from this
// iteration's tokens, a match's REAL cost against those tables is now known
// Builds optimizeTable's `penaltyFromValue` for one offset bucket: the real
// per-match "how many bits would this match still be allowed to spend on
// its offset before a literal becomes cheaper" (optimal.c's `treshold`),
// summed cumulatively from each candidate boundary upward. `lengthsEntries`
// must already be final -- this mirrors optimal.c's order (lengths built
// first, then offsets scored against the now-known length costs).
function buildOffsetPenalty(bucketMatches, lengthsEntries) {
  if (!bucketMatches.length) return null;
  const maxOffset = Math.max(...bucketMatches.map((token) => token.offset));
  const thresholdSum = new Float64Array(maxOffset + 2);
  for (const token of bucketMatches) {
    const lengthIndex = lengthsEntries.findIndex((entry) => token.length >= entry.base && token.length < entry.base + (1 << entry.bits));
    const lengthCost = lengthIndex >= 0
      ? gammaCost(lengthIndex) + lengthsEntries[lengthIndex].bits
      : gammaCost(lengthsEntries.length - 1) + lookupCost(lengthsEntries, () => 0, token.length);
    const threshold = token.length * LITERAL_BITS - 1 - lengthCost;
    thresholdSum[token.offset] += threshold;
  }
  for (let value = maxOffset - 1; value >= 0; value -= 1) thresholdSum[value] += thresholdSum[value + 1];
  return (value) => (value <= maxOffset ? thresholdSum[value] : 0);
}

// After a give-up boundary is chosen for a bucket, every match in that
// bucket whose offset falls at or past the boundary must actually become
// literal bytes (read back from `input` at the token's real position, since
// a match token only records length/offset, not the bytes it stands for) --
// otherwise the table built without those values wouldn't be able to encode
// them at all.
function applyGiveUpBoundaries(input, tokens, giveUpAt) {
  const result = [];
  let position = 0;
  let changed = false;
  for (const token of tokens) {
    if (token.kind === "match") {
      const bucket = token.length === 1 ? 1 : token.length === 2 ? 2 : 3;
      const boundary = giveUpAt[bucket];
      if (boundary !== null && token.offset >= boundary) {
        changed = true;
        for (let k = 0; k < token.length; k += 1) result.push({ kind: "literal", value: input[position + k] });
      } else {
        result.push(token);
      }
      position += token.length;
    } else {
      result.push(token);
      position += token.kind === "literalBlock" ? token.bytes.length : 1;
    }
  }
  return { tokens: result, changed };
}

function hasGiveUp(giveUpAt) {
  return giveUpAt[1] !== null || giveUpAt[2] !== null || giveUpAt[3] !== null;
}

function buildTables(tokens) {
  const matches = tokens.filter((token) => token.kind === "match");
  const byLength1 = matches.filter((token) => token.length === 1);
  const byLength2 = matches.filter((token) => token.length === 2);
  const byLength3plus = matches.filter((token) => token.length >= 3);
  const lengthResult = optimizeTable(matches.map((token) => token.length), LENGTH_TABLE_SIZE, (index) => index + 1);
  const lengthsEntries = tableEntries(lengthResult.widths);

  const penalty1 = PENALTY_ENABLED ? buildOffsetPenalty(byLength1, lengthsEntries) : null;
  const penalty2 = PENALTY_ENABLED ? buildOffsetPenalty(byLength2, lengthsEntries) : null;
  const penalty3 = PENALTY_ENABLED ? buildOffsetPenalty(byLength3plus, lengthsEntries) : null;
  const offset1Result = optimizeTable(byLength1.map((token) => token.offset), OFFSET1_TABLE_SIZE, () => 0, penalty1);
  const offset2Result = optimizeTable(byLength2.map((token) => token.offset), OFFSET2_TABLE_SIZE, () => 0, penalty2);
  const offset3Result = optimizeTable(byLength3plus.map((token) => token.offset), OFFSET3_TABLE_SIZE, () => 0, penalty3);

  return {
    lengths: lengthsEntries,
    offsets1: tableEntries(offset1Result.widths),
    offsets2: tableEntries(offset2Result.widths),
    offsets3: tableEntries(offset3Result.widths),
    giveUpAt: { 1: offset1Result.giveUpAt, 2: offset2Result.giveUpAt, 3: offset3Result.giveUpAt }
  };
}

// A literal data block (gamma 17, then a 16-bit length, then raw bytes)
// costs 1 + gammaCost(17) + 16 + 8*N = 34 + 8*N bits, versus 9*N bits for N
// separate literal tokens -- worth it only once N exceeds 34 bytes. The
// optimal parser proposes selected block lengths directly; this post-pass
// also merges any remaining contiguous literal run wherever that pays off.
function mergeLiteralBlocks(tokens) {
  const merged = [];
  let run = [];
  const flushRun = () => {
    if (!run.length) return;
    const literalCost = run.length * LITERAL_BITS;
    const blockCost = 1 + gammaCost(LITERAL_BLOCK_GAMMA) + 16 + run.length * 8;
    if (blockCost < literalCost) {
      merged.push({ kind: "literalBlock", bytes: run.map((token) => token.value) });
    } else {
      merged.push(...run);
    }
    run = [];
  };
  for (const token of tokens) {
    if (token.kind === "literal") {
      run.push(token);
    } else {
      flushRun();
      merged.push(token);
    }
  }
  flushRun();
  return merged;
}

function estimateBits(tokens, tables) {
  let bits = 0;
  for (const token of tokens) {
    if (token.kind === "literal") {
      bits += LITERAL_BITS;
    } else if (token.kind === "literalBlock") {
      bits += 1 + gammaCost(LITERAL_BLOCK_GAMMA) + 16 + token.bytes.length * 8;
    } else {
      const length = findEntry(tables.lengths, token.length);
      const offsets = offsetTableFor(token.length, tables);
      const offset = findEntry(offsets, token.offset);
      bits += 1 + gammaCost(length.index) + length.entry.bits + offsetSelectorBits(token.length) + offset.entry.bits;
    }
  }
  bits += 1 + gammaCost(EOF_GAMMA); // end marker
  bits += LENGTH_TABLE_SIZE * 4 + OFFSET3_TABLE_SIZE * 4 + OFFSET2_TABLE_SIZE * 4 + OFFSET1_TABLE_SIZE * 4; // table headers
  return bits;
}

function emit(tokens, tables) {
  const events = [];
  const bit = (value) => events.push({ bit: value ? 1 : 0 });
  const bits = (value, count) => {
    for (let shift = count - 1; shift >= 0; shift -= 1) bit((value >>> shift) & 1);
  };
  const byte = (value) => events.push({ byte: value & 0xff });
  const gamma = (value) => {
    for (let index = 0; index < value; index += 1) bit(0);
    bit(1);
  };
  const emitTableHeader = (entries) => entries.forEach((entry) => bits(entry.bits, 4));

  emitTableHeader(tables.lengths);
  emitTableHeader(tables.offsets3);
  emitTableHeader(tables.offsets2);
  emitTableHeader(tables.offsets1);

  for (const token of tokens) {
    if (token.kind === "literal") {
      bit(1);
      byte(token.value);
      continue;
    }
    if (token.kind === "literalBlock") {
      bit(0);
      gamma(LITERAL_BLOCK_GAMMA);
      bits(token.bytes.length, 16);
      for (const value of token.bytes) byte(value);
      continue;
    }
    bit(0);
    const length = findEntry(tables.lengths, token.length);
    gamma(length.index);
    bits(token.length - length.entry.base, length.entry.bits);
    const offsets = offsetTableFor(token.length, tables);
    const offset = findEntry(offsets, token.offset);
    bits(offset.index, offsetSelectorBits(token.length));
    bits(token.offset - offset.entry.base, offset.entry.bits);
  }
  bit(0);
  gamma(EOF_GAMMA);

  const totalBits = events.reduce((sum, event) => sum + (event.bit === undefined ? 0 : 1), 0);
  const output = [0];
  let controlIndex = 0;
  let capacity = totalBits & 7;
  let used = 0;
  let mask = 1;
  output[0] = 1 << capacity;
  for (const event of events) {
    if (event.byte !== undefined) {
      output.push(event.byte);
      continue;
    }
    if (used === capacity) {
      controlIndex = output.length;
      output.push(0);
      capacity = 8;
      used = 0;
      mask = 1;
    }
    if (event.bit) output[controlIndex] |= mask;
    mask <<= 1;
    used += 1;
  }
  return Uint8Array.from(output);
}

function encode(input) {
  if (!input.length) return emit([], buildTables([]));

  const candidatesAt = findMatchCandidates(input);

  let tokens = parseOptimal(input, candidatesAt, null);
  let tables = buildTables(tokens);
  if (hasGiveUp(tables.giveUpAt)) {
    const applied = applyGiveUpBoundaries(input, tokens, tables.giveUpAt);
    if (applied.changed) {
      tokens = applied.tokens;
      tables = buildTables(tokens);
    }
  }
  let bestBits = estimateBits(tokens, tables);
  let bestTokens = tokens;
  let bestTables = tables;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    tokens = parseOptimal(input, candidatesAt, tables);
    tables = buildTables(tokens);
    if (hasGiveUp(tables.giveUpAt)) {
      const applied = applyGiveUpBoundaries(input, tokens, tables.giveUpAt);
      if (applied.changed) {
        tokens = applied.tokens;
        tables = buildTables(tokens);
      }
    }
    const bits = estimateBits(tokens, tables);
    if (bits < bestBits) {
      bestBits = bits;
      bestTokens = tokens;
      bestTables = tables;
    } else {
      break; // converged: no further improvement from re-parsing with the latest tables
    }
  }

  const withLiteralBlocks = mergeLiteralBlocks(bestTokens);
  const literalBlockBits = estimateBits(withLiteralBlocks, bestTables);
  const finalTokens = literalBlockBits < bestBits ? withLiteralBlocks : bestTokens;

  return emit(finalTokens, bestTables);
}

// Diagnostic-only exports (not part of Exomizer2Codec's public API).
function summarizeIteration(index, tokens, tables, bits) {
  return {
    index,
    tokenCount: tokens.length,
    literalCount: tokens.filter((t) => t.kind === "literal").length,
    matchCount: tokens.filter((t) => t.kind === "match").length,
    length1Count: tokens.filter((t) => t.kind === "match" && t.length === 1).length,
    length2Count: tokens.filter((t) => t.kind === "match" && t.length === 2).length,
    estimatedBits: bits,
    lengthWidths: tables.lengths.map((e) => e.bits),
    lengthBases: tables.lengths.map((e) => e.base),
    offset1Widths: tables.offsets1.map((e) => e.bits),
    offset2Widths: tables.offsets2.map((e) => e.bits),
    offset3Widths: tables.offsets3.map((e) => e.bits),
    giveUpAt: tables.giveUpAt
  };
}

export function __exomizer2FindMatchCandidates(data) {
  return findMatchCandidates(asBytes(data));
}

export function __exomizer2BuildTables(tokens) {
  return buildTables(tokens);
}

export function __exomizer2ParseWithWidths(data, widths) {
  const input = asBytes(data);
  const tables = {
    lengths: tableEntries(widths.lengths),
    offsets1: tableEntries(widths.offsets1),
    offsets2: tableEntries(widths.offsets2),
    offsets3: tableEntries(widths.offsets3)
  };
  const tokens = parseOptimal(input, findMatchCandidates(input), tables);
  return { tokens, estimatedBits: estimateBits(tokens, tables) };
}

export function __exomizer2DiagnosticEncode(data) {
  const input = asBytes(data);
  const trace = { iterations: [] };
  if (!input.length) {
    const tables = buildTables([]);
    const emitted = emit([], tables);
    return { finalTokens: [], finalTables: tables, estimatedBits: estimateBits([], tables), emittedBytes: emitted.length, trace };
  }

  const candidatesAt = findMatchCandidates(input);
  trace.candidateStats = {
    totalPositions: input.length,
    totalCandidates: candidatesAt.reduce((sum, list) => sum + list.length, 0),
    maxCandidatesAtOnePosition: candidatesAt.reduce((max, list) => Math.max(max, list.length), 0)
  };

  let tokens = parseOptimal(input, candidatesAt, null);
  let tables = buildTables(tokens);
  if (hasGiveUp(tables.giveUpAt)) {
    const applied = applyGiveUpBoundaries(input, tokens, tables.giveUpAt);
    if (applied.changed) {
      tokens = applied.tokens;
      tables = buildTables(tokens);
    }
  }
  let bestBits = estimateBits(tokens, tables);
  let bestTokens = tokens;
  let bestTables = tables;
  trace.iterations.push(summarizeIteration(-1, tokens, tables, bestBits));

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    tokens = parseOptimal(input, candidatesAt, tables);
    tables = buildTables(tokens);
    if (hasGiveUp(tables.giveUpAt)) {
      const applied = applyGiveUpBoundaries(input, tokens, tables.giveUpAt);
      if (applied.changed) {
        tokens = applied.tokens;
        tables = buildTables(tokens);
      }
    }
    const bits = estimateBits(tokens, tables);
    trace.iterations.push(summarizeIteration(iteration, tokens, tables, bits));
    if (bits < bestBits) {
      bestBits = bits;
      bestTokens = tokens;
      bestTables = tables;
    } else {
      break;
    }
  }

  const withLiteralBlocks = mergeLiteralBlocks(bestTokens);
  const literalBlockBits = estimateBits(withLiteralBlocks, bestTables);
  const useMergedTokens = literalBlockBits < bestBits;
  const finalTokens = useMergedTokens ? withLiteralBlocks : bestTokens;
  const finalBits = useMergedTokens ? literalBlockBits : bestBits;
  const emitted = emit(finalTokens, bestTables);

  const matches = finalTokens.filter((t) => t.kind === "match");
  const sequenceLengths = finalTokens.flatMap((token) => {
    if (token.kind === "match") return [token.length];
    if (token.kind === "literalBlock") return [token.bytes.length];
    return [];
  });
  return {
    finalTokens,
    finalTables: bestTables,
    estimatedBits: finalBits,
    emittedBytes: emitted.length,
    usedLiteralBlocks: finalTokens.some((token) => token.kind === "literalBlock"),
    literalBlockCount: finalTokens.filter((t) => t.kind === "literalBlock").length,
    maxMatchLengthUsed: matches.length ? Math.max(...matches.map((t) => t.length)) : 0,
    maxSequenceLengthUsed: sequenceLengths.length ? Math.max(...sequenceLengths) : 0,
    maxOffsetUsed: matches.length ? Math.max(...matches.map((t) => t.offset)) : 0,
    length1MatchCount: matches.filter((t) => t.length === 1).length,
    length2MatchCount: matches.filter((t) => t.length === 2).length,
    literalCount: finalTokens.filter((t) => t.kind === "literal").length,
    trace
  };
}

function decode(compressed) {
  const src = asBytes(compressed);
  let cursor = 0;

  function readByte() {
    if (cursor >= src.length) throw new Error("Truncated Exomizer 2 stream");
    return src[cursor++];
  }

  let bitBuffer = readByte();

  function readBits(count) {
    let bits = 0;
    while (count-- > 0) {
      if (bitBuffer === 1) bitBuffer = 0x100 | readByte();
      bits = (bits << 1) | (bitBuffer & 1);
      bitBuffer >>= 1;
    }
    return bits >>> 0;
  }

  function generateTable(size) {
    const table = new Array(size);
    let base = 1;
    for (let i = 0; i < size; i += 1) {
      const bits = readBits(4);
      table[i] = { base, bits };
      base += 1 << bits;
    }
    return table;
  }

  const lengths = generateTable(16);
  const offsets3 = generateTable(16);
  const offsets2 = generateTable(16);
  const offsets1 = generateTable(4);

  const out = [];

  for (;;) {
    if (readBits(1) === 1) {
      out.push(readByte());
      continue;
    }

    let gamma = 0;
    while (readBits(1) === 0) gamma += 1;

    if (gamma === 16) break; // end-of-data marker
    if (gamma === 17) {
      // literal data block: 16-bit length, then that many raw bytes.
      // The real encoder falls back to this for incompressible spans even
      // though the "-c" variant never emits the single-literal-byte signal.
      let length = readBits(16);
      while (length-- > 0) out.push(readByte());
      continue;
    }

    const lengthEntry = lengths[gamma];
    const length = lengthEntry.base + readBits(lengthEntry.bits);

    let offsetEntry;
    if (length === 1) offsetEntry = offsets1[readBits(2)];
    else if (length === 2) offsetEntry = offsets2[readBits(4)];
    else offsetEntry = offsets3[readBits(4)];
    const offset = offsetEntry.base + readBits(offsetEntry.bits);

    if (offset <= 0 || offset > out.length) {
      throw new Error(`Corrupt Exomizer 2 stream: offset ${offset} exceeds ${out.length} decoded bytes`);
    }
    for (let k = 0; k < length; k += 1) out.push(out[out.length - offset]);
  }

  return Uint8Array.from(out);
}

export class Exomizer2Codec {
  async compress(data) {
    return encode(asBytes(data));
  }

  async decompress(data) {
    return decode(data);
  }
}
