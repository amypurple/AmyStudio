/**
 * AMYZ core: optimal parser, bucket fit, bit-stream writer and reader (2026).
 * Format by Amy (AmyPurple), continuing her DAN1-DAN3 line, with Claude.
 * Ideas from ZX0 (Einar Saukas: optimal parser, implicit-state grammar, repeat offset)
 * and Exomizer (Magnus Lind: adaptive offset buckets).
 * Internal module used by amyz.js; see SPEC.md for the format.
 */

const NBUCKETS = 15;
const END_INDEX = 15;
const MAX_OFFSET = 16383;           // TMS9918A VRAM is 16 KB
const INF = 0x3fffffff;
const DEFAULT_WIDTHS = [0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const MAX_PASSES = 8;

const INDEX_GAMMA = false; // research knob (gamma-coded index), off in the AMYZ format;
const idxBits = (k) => (INDEX_GAMMA ? gammaBits(k + 1) : 4);
const writeIdx = (w, k) => (INDEX_GAMMA ? w.gamma(k + 1) : w.bits(k, 4));
const bucketOf = (t, o) => { for (let k = 0; k < NBUCKETS; k++) if (o >= t.bases[k] && o - t.bases[k] < (1 << t.widths[k])) return k; throw new Error('offset not coded ' + o); };
const gammaBits = (v) => { let b = 1; while (v > 1) { b += 2; v >>= 1; } return b; };

export function widthsToBases(widths) {
    const bases = []; let b = 1;
    for (const w of widths) { bases.push(b); b += 1 << w; }
    return bases;
}

export function tableBytes(t) {
    const out = new Uint8Array(NBUCKETS * 3); const bases = t.bases, widths = t.widths;
    for (let k = 0; k < NBUCKETS; k++) {
        out[3 * k] = bases[k] & 255; out[3 * k + 1] = (bases[k] >> 8) & 255; out[3 * k + 2] = widths[k];
    }
    return out;
}

function tableFromOption(t) {
    if (!t) return null;
    if (t.length === NBUCKETS) return { widths: Array.from(t), bases: widthsToBases(Array.from(t)) };
    if (t.length < NBUCKETS * 3) throw new Error('table must be 45 bytes or 15 widths');
    const widths = [], bases = [];
    for (let k = 0; k < NBUCKETS; k++) { bases.push(t[3 * k] | t[3 * k + 1] << 8); widths.push(t[3 * k + 2]); }
    return { widths, bases };
}

/** cost in bits of a new-offset token's flag + index + extra bits, per offset (INF = not coded) */
function offsetCosts(t) {
    const cost = new Int32Array(MAX_OFFSET + 1).fill(INF);
    for (let k = 0; k < NBUCKETS; k++) {
        const end = Math.min(t.bases[k] + (1 << t.widths[k]), MAX_OFFSET + 1);
        for (let o = t.bases[k]; o < end; o++) if (cost[o] === INF) cost[o] = 1 + idxBits(k) + t.widths[k];
    }
    return cost;
}

/** ZX0's optimizer (optimize.c) with an offset-dependent new-offset cost. Returns the last block. */
export function optimize(input, t) {
    const n = input.length; const ocost = offsetCosts(t);
    let cover = 0; while (cover + 1 <= MAX_OFFSET && ocost[cover + 1] < INF) cover++;
    const size = Math.min(Math.max(n - 1, 1), cover) + 1;
    const lastLiteral = new Array(size).fill(null);
    const lastMatch = new Array(size).fill(null);
    const matchLength = new Int32Array(size);
    const optimal = new Array(n).fill(null);
    const bestLength = new Int32Array(n + 2);
    if (n > 2) bestLength[2] = 2;
    lastMatch[1] = { bits: -1, index: -1, offset: 1, chain: null };
    for (let index = 0; index < n; index++) {
        const maxOffset = Math.min(Math.max(index, 1), cover);
        let best = null; let bestLengthSize = 2;
        for (let offset = 1; offset <= maxOffset; offset++) {
            if (index !== 0 && index >= offset && input[index] === input[index - offset]) {
                const lit = lastLiteral[offset];
                if (lit !== null) {
                    const bits = lit.bits + 1 + gammaBits(index - lit.index);
                    const blk = { bits, index, offset, chain: lit };
                    lastMatch[offset] = blk;
                    if (best === null || best.bits > bits) best = blk;
                }
                if (++matchLength[offset] > 1) {
                    if (bestLengthSize < matchLength[offset]) {
                        let bits = optimal[index - bestLength[bestLengthSize]].bits + gammaBits(bestLength[bestLengthSize] - 1);
                        do {
                            bestLengthSize++;
                            const bits2 = optimal[index - bestLengthSize].bits + gammaBits(bestLengthSize - 1);
                            if (bits2 <= bits) { bestLength[bestLengthSize] = bestLengthSize; bits = bits2; }
                            else bestLength[bestLengthSize] = bestLength[bestLengthSize - 1];
                        } while (bestLengthSize < matchLength[offset]);
                    }
                    const length = bestLength[matchLength[offset]];
                    const bits = optimal[index - length].bits + ocost[offset] + gammaBits(length - 1);
                    const lm = lastMatch[offset];
                    if (lm === null || lm.index !== index || lm.bits > bits) {
                        const blk = { bits, index, offset, chain: optimal[index - length] };
                        lastMatch[offset] = blk;
                        if (best === null || best.bits > bits) best = blk;
                    }
                }
            } else {
                matchLength[offset] = 0;
                const lm = lastMatch[offset];
                if (lm !== null) {
                    const length = index - lm.index;
                    const bits = lm.bits + 1 + gammaBits(length) + 8 * length;
                    const blk = { bits, index, offset: 0, chain: lm };
                    lastLiteral[offset] = blk;
                    if (best === null || best.bits > bits) best = blk;
                }
            }
        }
        optimal[index] = best;
    }
    return optimal[n - 1];
}

/** block chain -> tokens [kind, a, b]: ['lit', start, len] | ['rep', len] | ['new', offset, len] */
export function chainToTokens(last) {
    const blocks = []; for (let b = last; b !== null; b = b.chain) blocks.push(b);
    blocks.reverse();
    const toks = []; let lastOffset = 1;
    for (let i = 1; i < blocks.length; i++) {
        const prev = blocks[i - 1], cur = blocks[i]; const len = cur.index - prev.index;
        if (cur.offset === 0) toks.push(['lit', prev.index + 1, len]);
        else if (cur.offset === lastOffset && toks.length && toks[toks.length - 1][0] === 'lit') toks.push(['rep', len]);
        else { toks.push(['new', cur.offset, len]); lastOffset = cur.offset; }
    }
    return toks;
}

class BitWriter {
    constructor() { this.out = []; this.pos = -1; this.mask = 0; }
    bit(b) {
        if (this.mask === 0) { this.out.push(0); this.pos = this.out.length - 1; this.mask = 0x80; }
        if (b) this.out[this.pos] |= this.mask;
        this.mask >>= 1;
    }
    bits(v, n) { for (let k = n - 1; k >= 0; k--) this.bit((v >> k) & 1); }
    gamma(v) {
        const nb = 32 - Math.clz32(v);
        for (let k = nb - 2; k >= 0; k--) { this.bit(0); this.bit((v >> k) & 1); }
        this.bit(1);
    }
    byte(v) { this.out.push(v & 255); }
}

export function encodeTokens(input, toks, tab) {
    const w = new BitWriter();
    for (let t = 0; t < toks.length; t++) {
        const tok = toks[t]; const nxt = t + 1 < toks.length ? toks[t + 1][0] : 'end';
        if (tok[0] === 'lit') {
            w.gamma(tok[2]); for (let i = 0; i < tok[2]; i++) w.byte(input[tok[1] + i]);
            w.bit(nxt === 'rep' ? 0 : 1);
        } else {
            if (tok[0] === 'rep') w.gamma(tok[1]);
            else {
                const o = tok[1]; const k = bucketOf(tab, o);
                writeIdx(w, k); w.bits(o - tab.bases[k], tab.widths[k]); w.gamma(tok[2] - 1);
            }
            w.bit(nxt === 'lit' ? 0 : 1);
        }
    }
    writeIdx(w, END_INDEX);
    return new Uint8Array(w.out);
}

/** optimal 15-bucket fit of an offset histogram (Map offset -> count): DP over (bucket, base)
 *  minimising sum(count * (index bits + extra bits)); with gamma-coded indexes the used buckets are
 *  then sorted by use so that the most used bucket gets the 1-bit index. Returns {widths, bases}. */
export function fitTable(hist) {
    let top = 0; for (const o of hist.keys()) if (o > top) top = o;
    if (top === 0) return { widths: DEFAULT_WIDTHS.slice(), bases: widthsToBases(DEFAULT_WIDTHS) };
    const pre = new Float64Array(top + 2);
    for (let o = 1; o <= top; o++) pre[o + 1] = pre[o] + (hist.get(o) || 0);
    const memo = new Map();
    const go = (k, base) => {
        if (base > top) return [0, []];
        if (k === NBUCKETS) return [INF, []];
        const key = k * 65536 + base; const m = memo.get(key); if (m) return m;
        let r = [INF, []];
        for (let b = 0; b < 15; b++) {
            const cnt = pre[Math.min(base + (1 << b), top + 1)] - pre[base];
            const s = go(k + 1, base + (1 << b));
            const c = s[0] + cnt * (b + idxBits(k));
            if (c < r[0]) r = [c, [b].concat(s[1])];
            if (base + (1 << b) > top) break;
        }
        memo.set(key, r); return r;
    };
    const widths = go(0, 1)[1];
    while (widths.length < NBUCKETS) widths.push(14);
    const bases = widthsToBases(widths);
    if (!INDEX_GAMMA) return { widths, bases };
    const ent = widths.map((w, k) => ({ w, b: bases[k], c: pre[Math.min(bases[k] + (1 << w), top + 1)] - pre[Math.min(bases[k], top + 1)], k }));
    ent.sort((x, y) => (y.c - x.c) || (x.k - y.k));
    return { widths: ent.map((e) => e.w), bases: ent.map((e) => e.b) };
}

/** Exomizer-style passes: parse all files with a table, refit the table, repeat; keep the best */
export function fitGroup(datas, passes = MAX_PASSES, start = null) {
    let t = start || { widths: DEFAULT_WIDTHS.slice(), bases: widthsToBases(DEFAULT_WIDTHS) };
    let best = null; const seen = new Set();
    for (let p = 0; p < passes; p++) {
        const key = t.widths.join(',') + '/' + t.bases.join(','); if (seen.has(key)) break; seen.add(key);
        const hist = new Map(); const streams = [];
        for (const d of datas) {
            const toks = d.length ? chainToTokens(optimize(d, t)) : [];
            for (const x of toks) if (x[0] === 'new') hist.set(x[1], (hist.get(x[1]) || 0) + 1);
            streams.push(encodeTokens(d, toks, t));
        }
        const size = streams.reduce((a, s) => a + s.length, 0);
        if (best === null || size < best.size) best = { size, t, streams, passes: p + 1 };
        else break;
        t = fitTable(hist);
    }
    return { widths: best.t.widths, bases: best.t.bases, table: tableBytes(best.t), streams: best.streams, size: best.size, passes: best.passes };
}

export function decodeStream(z, widths, bases, start = 0) {
    let i = start, mask = 0, cur = 0; const out = [];
    const bit = () => { if (mask === 0) { cur = z[i++]; mask = 0x80; } const r = cur & mask ? 1 : 0; mask >>= 1; return r; };
    const bits = (n) => { let v = 0; for (let k = 0; k < n; k++) v = v << 1 | bit(); return v; };
    const gamma = () => { let v = 1; while (!bit()) v = v << 1 | bit(); return v; };
    let last = 1; let state = 0; // 0 literals, 1 repeat, 2 new
    for (;;) {
        if (state === 0) {
            const n = gamma(); for (let k = 0; k < n; k++) out.push(z[i++]);
            state = bit() ? 2 : 1;
        } else {
            let n;
            if (state === 1) n = gamma();
            else {
                const k = INDEX_GAMMA ? gamma() - 1 : bits(4); if (k === END_INDEX) return new Uint8Array(out);
                last = bases[k] + bits(widths[k]); n = gamma() + 1;
            }
            for (let k = 0; k < n; k++) out.push(out[out.length - last]);
            state = bit() ? 2 : 0;
        }
    }
}
