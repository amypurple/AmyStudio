/**
 * upkr Compression Codec (JavaScript port)
 *
 * upkr format and reference compressor: Dennis Ranke (exoticorn), 2021-2023,
 * https://github.com/exoticorn/upkr - released under the Unlicense (public domain).
 * Z80 bitstream variant ("--z80"): Peter "Ped" Helcmanovsky, 2022, same license.
 * This JavaScript port (Amy Studio / retrocompress-lite) follows upkr 0.2.3 line by line
 * and is released under the same terms (Unlicense). See LICENSE-upkr.txt.
 *
 * LZ parse with an rANS cost model; every bit is coded with an adaptive 8-bit probability.
 * The output is byte-identical to the Rust tool at the same level and config.
 *
 * Configs:
 *   'z80'     : --z80 = big-endian bitstream, inverted bit encoding, simplified prob update
 *               (the stream the Z80 decoders in z80/ read). Default level 9, like the CLI.
 *   'default' : standard upkr byte-based rANS (level 2 by default, like the CLI).
 *
 * API:
 *   pack(data, level, config)   -> Uint8Array
 *   unpack(packed, config, max) -> Uint8Array
 *   new UpkrCodec().compress(data, {level, config}) / decompress(packed, {config})
 */

const PROB_BITS = 8;
const ONE_PROB = 1 << PROB_BITS;
const BIG = Number.MAX_SAFE_INTEGER;

// log2(256 / p) for p = 0..255, copied bit for bit from Rust's f64::log2 (glibc).
// Math.log2 differs in the last bit for 3 of these entries, which changes some parses.
const LOG2_HEX =
    '7ff00000000000004020000000000000401c0000000000004019a8ff971810a6' +
    '40180000000000004016b6587b432e474015a8ff971810a64014c544c055fde9' +
    '4014000000000000401351ff2e30214c4012b6587b432e474012298ac1fcd15f' +
    '4011a8ff971810a6401132bfee370ee74010c544c055fde940105f58125b3eed' +
    '4010000000000000400f4ce04829b767400ea3fe5c604297400e043e946fd97f' +
    '400d6cb0f6865c8f400cdc88aedc1d1f400c531583f9a2be400bcfbebfca7156' +
    '400b51ff2e30214c400ad961ed0cb91d400a657fdc6e1dcd4009f5fd8a9063e3' +
    '40098a8980abfbd3400922dadc2ab3494008beb024b67dda40085dce53276563' +
    '40080000000000004007a514b229c40a40074ce04829b7674006f73a77325862' +
    '4006a3fe5c6042974006530a1d24b1374006043e946fd97f4005b77f0a9e3f19' +
    '40056cb0f6865c8f400523bbc64c5e644004dc88aedc1d1f400497028118efac' +
    '4004531583f9a2be400410af52e69f264003cfbebfca715640039033b85a8bfc' +
    '400351ff2e30214c400315130157f7a64002d961ed0cb91d40029edf7659d8b3' +
    '4002657fdc6e1dcd40022d380a6c7e2b4001f5fd8a9063e34001bfc67a7fff4d' +
    '40018a8980abfbd34001563dc29ffacb400122dadc2ab3494000f058d74797eb' +
    '4000beb024b67dda40008dd9953002a540005dce5327656340002e87dd0c3e6a' +
    '40000000000000003fffa461a5e8f4b83fff4a29645388143ffef14c7605d606' +
    '3ffe99c090536ecf3ffe437bdbf525443ffdee74ee64b0c33ffd9aa2c3b0ea3d' +
    '3ffd47fcb8c0852f3ffcf67a85fa1f893ffca6143a49626e3ffc56c23679b4d2' +
    '3ffc087d28dfb2fe3ffbbb3e094b3d233ffb6efe153c7e313ffb23b6cc56cc85' +
    '3ffad961ed0cb91e3ffa8ff971810a5e3ffa47778c98bcc93ff9ffd6a73a78eb' +
    '3ff9b9115db83a3d3ff973227d6027ec3ff92e050231df583ff8e9b414b5a92a' +
    '3ff8a62b07f3457c3ff8636557862acb3ff8215ea5cd3e4d3ff7e012ba343341' +
    '3ff79f7d7f94e2ad3ff75f9b02af0d5f3ff7206770b517f93ff6e1df15ec6c1c' +
    '3ff6a3fe5c6042973ff666c1caa5b1ac3ff62a2602afef4c3ff5ee27c0b3caac' +
    '3ff5b2c3da19723b3ff577f73c7bab843ff53dbeecb3b1663ff5041805f0fb28' +
    '3ff4caffb8dc3b9a3ff492734ac4f35c3ff45a7014d8fc563ff422f383657e8d' +
    '3ff3ebfb1520c7c63ff3b5845a7c883b3ff37f8cf4fffe993ff34a1296a9a505' +
    '3ff315130157f7a63ff2e08c0638f3f13ff2ac7b853ff5963ff278df6ca19bca' +
    '3ff245b5b85566933ff212fc719cc0ca3ff1e0b1ae8f2fd53ff1aed391ab6675' +
    '3ff17d60496cfbb53ff14c560fe68af93ff11bb32a60054a3ff0eb75e8f8ff61' +
    '3ff0bb9ca64ecac63ff08c25c7262b583ff05d0fba187cd53ff02e58f7441ee6' +
    '3ff00000000000003fefa406bd2443df3fef48c34bd1e96f3feeee32e2aeccbe' +
    '3fee9452c8a710283fee3b20546f55493fede298ec0bac0c3fed8aba045b01c8' +
    '3fed338120a6dd9d3fecdcebd23739943fec86f7b7ea4a893fec31a27dd00b4a' +
    '3febdce9dcc961873feb88cb9a2ab5213feb35458761d47a3feae255819f022d' +
    '3fea8ff971810a5d3fea3e2f4ac43f603fe9ecf50bf43f133fe99c48be2063c8' +
    '3fe94c287492c4dc3fe8fc924c89ac843fe8ad846cf369a53fe85efd062c656d' +
    '3fe810fa51bf65fd3fe7c37a9227e7fc3fe7767c12967a463fe729fd26b707c8' +
    '3fe6ddfc2a78fc633fe6927781d932a93fe6476d98ad99093fe5fcdce2727ddc' +
    '3fe5b2c3da19723b3fe5692101d9b4a53fe51ff2e30214bb3fe4d7380dcc422d' +
    '3fe48eef193179913fe44716a2c082623fe3ffad4e74f1d73fe3b8b1c68fa6ee' +
    '3fe37222bb70747b3fe32bfee370ee683fe2e644fac04fd83fe2a0f3c340705b' +
    '3fe25c0a0463beaf3fe217868b0c37e73fe1d368296b52553fe18fadb6e2d3c2' +
    '3fe14c560fe68af93fe1096015dee4da3fe0c6caaf0c55973fe08494c66b8ef0' +
    '3fe042bd4b9a7c993fe0014332be00323fdf804ae8d0cd043fdefec61b011f85' +
    '3fde7df5fe538ab33fddfdd89d586e2c3fdd7e6c0abc357b3fdcffae611ad12a' +
    '3fdc819dc2d45fe43fdc043859e2fdb23fdb877c57b1b06f3fdb0b67f4f46812' +
    '3fda8ff971810a5d3fda152f142981b53fd99b072a96c6b23fd921800924dd3b' +
    '3fd8a8980abfbd303fd8304d90c11fd13fd7b89f02cf2aaf3fd7418acebbf18f' +
    '3fd6cb0f6865c8eb3fd6552b499862773fd5dfdcf1eeae0f3fd56b22e6b578e5' +
    '3fd4f6fbb2cec5983fd48365e695d7973fd4106017c3eca03fd39de8e1559f6e' +
    '3fd32bfee370ee6a3fd2baa0c34be1eb3fd249cd2b13cd6f3fd1d982c9d5270a' +
    '3fd169c05363f1573fd0fa848044b3523fd08bce0d95fa363fd01d9bbcfa61d4' +
    '3fcf5fd8a9063e323fce857d3d3613683fcdac22d3e441d63fccd3c712d31106' +
    '3fcbfc67a7fff4ca3fcb2602497d534a3fca5094b54d28283fc97c1cb13c7ec0' +
    '3fc8a8980abfbd303fc7d60496cfbb4c3fc7046031c79f843fc633a8bf437ce6' +
    '3fc563dc29ffacaf3fc494f863b8df323fc3c6fb650cde513fc2f9e32d5bfdd1' +
    '3fc22dadc2ab34963fc162593186da703fc097e38ce6064e3fbf9c95dc1d1167' +
    '3fbe0b1ae8f2fd563fbc7b528b70f1bc3fbaed391ab6674a3fb960caf9abb7c1' +
    '3fb7d60496cfbb4b3fb64ce26c0671573fb4c560fe68af8b3fb33f7cde14cf63' +
    '3fb1bb32a60054a23fb0387efbca86a73fad6ebd1f1fec143faa6f9c377dd31d' +
    '3fa77394c9d958d03fa47aa07357703c3fa184b8e4c56afc3f9d23afc49139f1' +
    '3f9743ee861f353f3f916a21e20a0a293f872c7ba20f731c3f7720d9c06a8348';
const LOG2_TABLE = (() => {
    const t = new Float64Array(256); const dv = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 256; i++) {
        dv.setUint32(0, parseInt(LOG2_HEX.substr(i * 16, 8), 16));
        dv.setUint32(4, parseInt(LOG2_HEX.substr(i * 16 + 8, 8), 16));
        t[i] = dv.getFloat64(0);
    }
    return t;
})();

export function makeConfig(name = 'z80', over = {}) {
    const c = {
        useBitstream: false, parityContexts: 1, invertBitEncoding: false,
        isMatchBit: true, newOffsetBit: true, continueValueBit: true,
        bitstreamIsBigEndian: false, simplifiedProbUpdate: false,
        noRepeatedOffsets: false, eofInLength: false,
        maxOffset: BIG, maxLength: BIG, defaultLevel: 2,
    };
    if (name === 'z80') {
        c.useBitstream = true; c.bitstreamIsBigEndian = true;
        c.invertBitEncoding = true; c.simplifiedProbUpdate = true; c.defaultLevel = 9;
    } else if (name !== 'default') throw new Error('upkr: unknown config ' + name);
    return Object.assign(c, over);
}
const minLength = (c) => (c.eofInLength ? 2 : 1);
const numContexts = (c) => 256 * c.parityContexts + 1 + 64 + 64;

// ---- adaptive contexts ----
function updateCtx(ctx, i, bit, c) {
    const old = ctx[i];
    if (c.simplifiedProbUpdate) {
        const off = (bit !== c.invertBitEncoding) ? (ONE_PROB >> 4) : 0;
        ctx[i] = (off + old - ((old + 8) >> 4)) & 0xff;
    } else if (bit !== c.invertBitEncoding) {
        ctx[i] = (old + ((ONE_PROB - old + 8) >> 4)) & 0xff;
    } else {
        ctx[i] = (old - ((old + 8) >> 4)) & 0xff;
    }
}

// ---- coder state (lz::CoderState) ----
function newState(c) {
    return { ctx: new Uint8Array(numContexts(c)).fill(1 << (PROB_BITS - 1)), lastOffset: 0, prevWasMatch: false, pos: 0 };
}
function cloneState(s) {
    return { ctx: s.ctx.slice(), lastOffset: s.lastOffset, prevWasMatch: s.prevWasMatch, pos: s.pos };
}

// Sink: either a cost counter (sink.cost) or a rANS bit list (sink.bits).
function encBit(sink, s, ci, bit, c) {
    const prob = s.ctx[ci];
    if (sink.bits) {
        sink.bits.push(prob | ((bit !== c.invertBitEncoding) ? 32768 : 0));
    } else {
        sink.cost += LOG2_TABLE[(bit !== c.invertBitEncoding) ? prob : ONE_PROB - prob];
    }
    updateCtx(s.ctx, ci, bit, c);
}
function encLength(sink, s, start, value, c) {
    let ci = start;
    while (value >= 2) {
        encBit(sink, s, ci, c.continueValueBit, c);
        encBit(sink, s, ci + 1, (value & 1) !== 0, c);
        ci += 2; value = Math.floor(value / 2);
    }
    encBit(sink, s, ci, !c.continueValueBit, c);
}
// op: {lit} or {offset, len}
function encOp(sink, s, op, c) {
    const P = c.parityContexts;
    const base = (s.pos % P) * 256;
    if (op.len === undefined) {
        encBit(sink, s, base, !c.isMatchBit, c);
        let ci = 1;
        for (let i = 7; i >= 0; i--) {
            const bit = ((op.lit >> i) & 1) !== 0;
            encBit(sink, s, base + ci, bit, c);
            ci = (ci << 1) | (bit ? 1 : 0);
        }
        s.prevWasMatch = false; s.pos += 1;
    } else {
        encBit(sink, s, base, c.isMatchBit, c);
        let newOffset = true;
        if (!s.prevWasMatch && !c.noRepeatedOffsets) {
            newOffset = op.offset !== s.lastOffset;
            encBit(sink, s, 256 * P, newOffset === c.newOffsetBit, c);
        }
        if (newOffset) {
            encLength(sink, s, 256 * P + 1, op.offset + (c.eofInLength ? 0 : 1), c);
            s.lastOffset = op.offset;
        }
        encLength(sink, s, 256 * P + 65, op.len, c);
        s.prevWasMatch = true; s.pos += op.len;
    }
}
function encEof(sink, s, c) {
    const P = c.parityContexts;
    encBit(sink, s, (s.pos % P) * 256, c.isMatchBit, c);
    if (!s.prevWasMatch && !c.noRepeatedOffsets) encBit(sink, s, 256 * P, c.newOffsetBit !== c.eofInLength, c);
    if (!c.eofInLength || s.prevWasMatch || c.noRepeatedOffsets) encLength(sink, s, 256 * P + 1, 1, c);
    if (c.eofInLength) encLength(sink, s, 256 * P + 65, 1, c);
}

// ---- rANS back end (RansCoder::finish) ----
function ransFinish(bits, c) {
    const buf = [];
    const lBits = c.useBitstream ? 15 : 12;
    let state = 1 << lBits;
    let byte = 0, bit = c.bitstreamIsBigEndian ? 0 : 8;
    let flush;
    if (c.useBitstream) {
        if (c.bitstreamIsBigEndian) {
            flush = () => { byte |= (state & 1) << bit; bit++; if (bit === 8) { buf.push(byte); byte = 0; bit = 0; } state >>>= 1; };
        } else {
            flush = () => { bit--; byte |= (state & 1) << bit; if (bit === 0) { buf.push(byte); byte = 0; bit = 8; } state >>>= 1; };
        }
    } else {
        flush = () => { buf.push(state & 0xff); state >>>= 8; };
    }
    const nfb = c.useBitstream ? 1 : 8;
    const factor = 1 << (lBits + nfb - PROB_BITS);
    for (let k = bits.length - 1; k >= 0; k--) {
        const step = bits[k];
        let prob = step & 32767, start;
        if (step & 32768) start = 0; else { start = prob; prob = ONE_PROB - prob; }
        const maxState = factor * prob;
        while (state >= maxState) flush();
        state = Math.floor(state / prob) * ONE_PROB + (state % prob) + start;
    }
    while (state > 0) flush();
    if (c.useBitstream && byte !== 0) buf.push(byte);
    buf.reverse();
    return Uint8Array.from(buf);
}

// ---- suffix array + LCP (match_finder.rs) ----
function suffixArray(d) {
    const n = d.length; const sa = new Int32Array(n); let rank = new Int32Array(n); let tmp = new Int32Array(n);
    for (let i = 0; i < n; i++) { sa[i] = i; rank[i] = d[i]; }
    const arr = Array.from(sa);
    for (let k = 1; ; k <<= 1) {
        const key2 = (i) => (i + k < n ? rank[i + k] : -1);
        arr.sort((a, b) => (rank[a] - rank[b]) || (key2(a) - key2(b)));
        tmp[arr[0]] = 0;
        for (let i = 1; i < n; i++) {
            const a = arr[i - 1], b = arr[i];
            tmp[b] = tmp[a] + ((rank[a] !== rank[b] || key2(a) !== key2(b)) ? 1 : 0);
        }
        const t = rank; rank = tmp; tmp = t;
        if (n === 0 || rank[arr[n - 1]] === n - 1) break;
    }
    for (let i = 0; i < n; i++) sa[i] = arr[i];
    return sa;
}

class MatchFinder {
    constructor(data, o) {
        const n = data.length;
        this.sa = suffixArray(data);
        this.rev = new Uint32Array(n);
        for (let k = 0; k < n; k++) this.rev[this.sa[k]] = k;
        this.lcp = new Uint32Array(n);
        let length = 0;
        for (let p = 0; p < n; p++) {
            const si = this.rev[p];
            if (si + 1 < n) {
                const i = this.sa[si], j = this.sa[si + 1];
                while (i + length < n && j + length < n && data[i + length] === data[j + length]) length++;
                this.lcp[si] = length;
            }
            length = length > 0 ? length - 1 : 0;
        }
        this.maxQueue = o.maxQueueSize; this.maxPerLen = o.maxMatchesPerLength;
        this.patience = o.patience; this.maxLenDiff = o.maxLengthDiff;
    }
    // Returns an array of {pos, length}, in the order the Rust iterator yields them.
    // The caller may stop early; the Rust iterator is lazy but has no side effects beyond
    // its own state, so computing on demand with a generator keeps the same results.
    *matches(pos) {
        const f = this, n = f.sa.length;
        const queue = []; // max-heap of distinct positions
        const hpush = (v) => { let i = queue.length; queue.push(v); while (i > 0) { const p = (i - 1) >> 1; if (queue[p] >= v) break; queue[i] = queue[p]; i = p; } queue[i] = v; };
        const hpop = () => { const top = queue[0]; const last = queue.pop(); if (queue.length) { let i = 0; const m = queue.length; for (;;) { let l = 2 * i + 1; if (l >= m) break; if (l + 1 < m && queue[l + 1] > queue[l]) l++; if (queue[l] <= last) break; queue[i] = queue[l]; i = l; } queue[i] = last; } return top; };
        let leftIndex = f.rev[pos], rightIndex = leftIndex;
        let leftLength = BIG, rightLength = BIG, cur = BIG, matchesLeft = 0, maxLength = 0;
        const moveLeft = () => {
            let pat = f.patience;
            while (leftLength > 0 && pat > 0 && leftIndex > 0) {
                leftIndex--; leftLength = Math.min(leftLength, f.lcp[leftIndex]);
                if (f.sa[leftIndex] < pos) return;
                pat--;
            }
            leftLength = 0;
        };
        const moveRight = () => {
            let pat = f.patience;
            while (rightLength > 0 && pat > 0 && rightIndex + 1 < n) {
                rightIndex++; rightLength = Math.min(rightLength, f.lcp[rightIndex - 1]);
                if (f.sa[rightIndex] < pos) return;
                pat--;
            }
            rightLength = 0;
        };
        moveLeft(); moveRight();
        for (;;) {
            if (queue.length === 0 || matchesLeft === 0) {
                queue.length = 0;
                cur = Math.min(cur > 0 ? cur - 1 : 0, Math.max(leftLength, rightLength));
                maxLength = Math.max(maxLength, cur);
                if (cur < 2 || cur + f.maxLenDiff < maxLength) return;
                while (queue.length < f.maxQueue && (leftLength === cur || rightLength === cur)) {
                    if (leftLength === cur) { hpush(f.sa[leftIndex]); moveLeft(); }
                    if (rightLength === cur) { hpush(f.sa[rightIndex]); moveRight(); }
                }
                matchesLeft = f.maxPerLen;
            }
            matchesLeft = matchesLeft > 0 ? matchesLeft - 1 : 0;
            if (queue.length === 0) return;
            yield { pos: hpop(), length: cur };
        }
    }
}

function levelConfig(level) {
    const maxArrivals = level <= 1 ? 0 : [0, 0, 2, 4, 8, 16, 32, 64, 96][level] ?? 128;
    const maxCostDelta = 16.0;
    const maxOffsetCostDelta = level <= 4 ? 0.0 : level <= 8 ? 4.0 : 8.0;
    const maxLengthDiff = level <= 1 ? 0 : level <= 3 ? 1 : level <= 5 ? 2 : level <= 7 ? 3 : 4;
    return {
        maxArrivals, maxCostDelta, maxOffsetCostDelta,
        numNearMatches: Math.max(level - 1, 0), greedySize: 4 + level * level * 3,
        maxQueueSize: level * 100, patience: level * 100, maxMatchesPerLength: level, maxLengthDiff,
    };
}

// ---- level 0: greedy_packer.rs ----
function packGreedy(data, c) {
    const mf = new MatchFinder(data, { maxQueueSize: 100, maxMatchesPerLength: 5, patience: 100, maxLengthDiff: 2 });
    const sink = { bits: [] }; const s = newState(c);
    let pos = 0;
    while (pos < data.length) {
        let done = false;
        const m = mf.matches(pos).next().value;
        if (m) {
            const maxOff = Math.min(c.maxOffset, 2 ** Math.min(m.length * 3 - 1, 31));
            const offset = pos - m.pos;
            if (offset < maxOff && m.length >= minLength(c)) {
                const len = Math.min(m.length, c.maxLength);
                encOp(sink, s, { offset, len }, c); pos += len; done = true;
            }
        }
        if (!done && s.lastOffset !== 0) {
            const off = s.lastOffset; let len = 0;
            while (pos + len < data.length && data[pos + len] === data[pos + len - off]) len++;
            len = Math.min(len, c.maxLength);
            if (len >= minLength(c)) { encOp(sink, s, { offset: off, len }, c); pos += len; done = true; }
        }
        if (!done) { encOp(sink, s, { lit: data[pos] }, c); pos++; }
    }
    encEof(sink, s, c);
    return ransFinish(sink.bits, c);
}

// ---- levels 1-9: parsing_packer.rs ----
function sortArrivals(vec, maxArrivals) {
    if (maxArrivals === 0) return vec;
    vec.sort((a, b) => (a.cost < b.cost ? -1 : a.cost > b.cost ? 1 : 0)); // stable, like Rust sort_by
    const seen = new Set(); const out = []; const rest = [];
    for (const arr of vec) {
        if (!seen.has(arr.lastOffset)) { seen.add(arr.lastOffset); if (out.length < maxArrivals) out.push(arr); }
        else rest.push(arr);
    }
    for (const arr of rest) { if (out.length >= maxArrivals) break; out.push(arr); }
    return out;
}

// Cost of one op from state s, without changing s. Inside one op every context is used at
// most once, so the probabilities read are the ones the Rust CostCounter sees; the sum is
// built in the same order, so the double is the same bit for bit.
function opCost(s, op, c) {
    const ctx = s.ctx, P = c.parityContexts, inv = c.invertBitEncoding, T = LOG2_TABLE;
    const bc = (ci, bit) => T[(bit !== inv) ? ctx[ci] : ONE_PROB - ctx[ci]];
    const base = (s.pos % P) * 256;
    let cost = 0;
    if (op.len === undefined) {
        cost += bc(base, !c.isMatchBit);
        let ci = 1;
        for (let i = 7; i >= 0; i--) { const bit = ((op.lit >> i) & 1) !== 0; cost += bc(base + ci, bit); ci = (ci << 1) | (bit ? 1 : 0); }
        return cost;
    }
    cost += bc(base, c.isMatchBit);
    let newOffset = true;
    if (!s.prevWasMatch && !c.noRepeatedOffsets) { newOffset = op.offset !== s.lastOffset; cost += bc(256 * P, newOffset === c.newOffsetBit); }
    const len = (start, value) => {
        let ci = start;
        while (value >= 2) { cost += bc(ci, c.continueValueBit); cost += bc(ci + 1, (value & 1) !== 0); ci += 2; value = Math.floor(value / 2); }
        cost += bc(ci, !c.continueValueBit);
    };
    if (newOffset) len(256 * P + 1, op.offset + (c.eofInLength ? 0 : 1));
    len(256 * P + 65, op.len);
    return cost;
}

// Arrivals keep their parent's state and their op; the state is built only when the
// arrival is used at its position (most arrivals are pruned before that).
function arrivalState(a, c) {
    if (!a.state) { a.state = cloneState(a.from); encOp({ cost: 0 }, a.state, a.parse.op, c); a.from = null; }
    return a.state;
}

function parse(data, L, c) {
    const mf = new MatchFinder(data, L);
    const NEAR = 1024;
    const nearMatches = new Array(NEAR).fill(-1);
    const lastSeen = new Array(256).fill(-1);
    const maxArr = L.maxArrivals;
    const arrivals = new Map();
    const addArrival = (pos, arrival) => {
        let vec = arrivals.get(pos);
        if (!vec) { vec = []; arrivals.set(pos, vec); }
        if (maxArr === 0) {
            if (vec.length === 0) vec.push(arrival); else if (vec[0].cost > arrival.cost) vec[0] = arrival;
            return;
        }
        vec.push(arrival);
        if (vec.length > maxArr * 2) arrivals.set(pos, sortArrivals(vec, maxArr));
    };
    const addMatch = (pos, offset, length, arrival, st) => {
        if (length < minLength(c)) return;
        length = Math.min(length, c.maxLength);
        const op = { offset, len: length };
        addArrival(pos + length, { parse: { prev: arrival.parse, op }, from: st, state: null, lastOffset: offset, cost: arrival.cost + opCost(st, op, c) });
    };
    addArrival(0, { parse: null, state: newState(c), from: null, lastOffset: 0, cost: 0.0 });

    const bestPerOffset = new Map();
    for (let pos = 0; pos < data.length; pos++) {
        const matchLength = (offset) => {
            let k = 0; while (pos + k < data.length && data[pos + k] === data[pos - offset + k]) k++; return k;
        };
        let here = arrivals.get(pos);
        if (!here) continue; // as in Rust: also skips the near_matches / last_seen update below
        {
            arrivals.delete(pos);
            here = sortArrivals(here, maxArr);
            bestPerOffset.clear();
            let bestCost = Number.MAX_VALUE;
            for (const a of here) {
                bestCost = Math.min(bestCost, a.cost);
                const po = bestPerOffset.has(a.lastOffset) ? bestPerOffset.get(a.lastOffset) : Number.MAX_VALUE;
                bestPerOffset.set(a.lastOffset, Math.min(po, a.cost));
            }
            let mlist = null; // the match iterator depends only on pos: compute it once
            arrivalLoop:
            for (const arrival of here) {
                if (arrival.cost > Math.min(bestCost + L.maxCostDelta, bestPerOffset.get(arrival.lastOffset) + L.maxOffsetCostDelta)) continue;
                const st = arrivalState(arrival, c);
                if (mlist === null) mlist = Array.from(mf.matches(pos));
                let foundLast = false; let closest = -1;
                for (const m of mlist) {
                    closest = Math.max(closest === -1 ? 0 : closest, m.pos);
                    const offset = pos - m.pos;
                    if (offset <= c.maxOffset) {
                        foundLast = foundLast || offset === st.lastOffset;
                        addMatch(pos, offset, m.length, arrival, st);
                        if (m.length >= L.greedySize) break arrivalLoop;
                    }
                }
                let left = L.numNearMatches;
                let mp = lastSeen[data[pos]];
                while (left > 0 && mp !== -1 && (closest === -1 || closest < mp)) {
                    const offset = pos - mp;
                    if (offset > c.maxOffset) break;
                    const length = matchLength(offset);
                    addMatch(pos, offset, length, arrival, st);
                    foundLast = foundLast || offset === st.lastOffset;
                    if (offset < NEAR) mp = nearMatches[mp % NEAR];
                    left--;
                }
                if (!foundLast && st.lastOffset > 0) {
                    const offset = st.lastOffset;
                    const length = matchLength(offset);
                    if (length > 0) addMatch(pos, offset, length, arrival, st);
                }
                const op = { lit: data[pos] };
                addArrival(pos + 1, { parse: { prev: arrival.parse, op }, from: st, state: null, lastOffset: st.lastOffset, cost: arrival.cost + opCost(st, op, c) });
            }
        }
        nearMatches[pos % NEAR] = lastSeen[data[pos]];
        lastSeen[data[pos]] = pos;
    }
    return arrivals.get(data.length)[0].parse;
}

export function pack(data, level, config = 'z80') {
    const c = typeof config === 'string' ? makeConfig(config) : config;
    data = data instanceof Uint8Array ? data : Uint8Array.from(data);
    if (level === undefined || level === null) level = c.defaultLevel;
    if (level === 0) return packGreedy(data, c);
    const ops = [];
    for (let p = parse(data, levelConfig(level), c); p; p = p.prev) ops.push(p.op);
    const s = newState(c); const sink = { bits: [] };
    for (let i = ops.length - 1; i >= 0; i--) encOp(sink, s, ops[i], c);
    encEof(sink, s, c);
    return ransFinish(sink.bits, c);
}

// ---- decoder (lz::unpack) ----
export function unpack(packed, config = 'z80', maxSize = 1 << 24) {
    const c = typeof config === 'string' ? makeConfig(config) : config;
    let pos = 0, state = 0, byte = 0, bitsLeft = 0;
    const refill = () => {
        if (c.useBitstream) {
            while (state < 32768) {
                if (bitsLeft === 0) {
                    if (pos >= packed.length) throw new Error('upkr: unexpected end of data');
                    byte = packed[pos++]; bitsLeft = 8;
                }
                if (c.bitstreamIsBigEndian) { state = (state << 1) | (byte >> 7); byte = (byte << 1) & 0xff; }
                else { state = (state << 1) | (byte & 1); byte >>= 1; }
                bitsLeft--;
            }
        } else {
            while (state < 4096) {
                if (pos >= packed.length) throw new Error('upkr: unexpected end of data');
                state = (state << 8) | packed[pos++];
            }
        }
    };
    refill();
    const ctx = new Uint8Array(numContexts(c)).fill(1 << (PROB_BITS - 1));
    const dec = (ci) => {
        refill();
        const prob = ctx[ci];
        const bit = (state & (ONE_PROB - 1)) < prob;
        if (bit) state = prob * (state >>> PROB_BITS) + (state & (ONE_PROB - 1));
        else state = (ONE_PROB - prob) * (state >>> PROB_BITS) + (state & (ONE_PROB - 1)) - prob;
        const r = bit !== c.invertBitEncoding;
        updateCtx(ctx, ci, r, c);
        return r;
    };
    const decLength = (ci) => {
        let length = 0, bp = 0;
        while (dec(ci) === c.continueValueBit) {
            if (dec(ci + 1)) length += 2 ** bp;
            bp++; if (bp >= 32) throw new Error('upkr: value overflow');
            ci += 2;
        }
        return length + 2 ** bp;
    };
    const P = c.parityContexts;
    const out = []; let offset = BIG, position = 0, prevWasMatch = false;
    for (;;) {
        const base = (position % P) * 256;
        if (dec(base) === c.isMatchBit) {
            if (c.noRepeatedOffsets || prevWasMatch || dec(256 * P) === c.newOffsetBit) {
                offset = decLength(256 * P + 1) - (c.eofInLength ? 0 : 1);
                if (offset === 0) break;
            }
            const length = decLength(256 * P + 65);
            if (c.eofInLength && length === 1) break;
            if (offset > position) throw new Error('upkr: offset out of range');
            for (let k = 0; k < length && out.length < maxSize; k++) out.push(out[out.length - offset]);
            position += length; prevWasMatch = true;
        } else {
            let ci = 1, b = 0;
            for (let i = 7; i >= 0; i--) { const bit = dec(base + ci); ci = (ci << 1) | (bit ? 1 : 0); if (bit) b |= 1 << i; }
            if (out.length < maxSize) out.push(b);
            position++; prevWasMatch = false;
        }
    }
    if (position > maxSize) throw new Error('upkr: over size');
    return Uint8Array.from(out);
}

export class UpkrCodec {
    async compress(data, options = {}) {
        return pack(new Uint8Array(data), options.level, options.config || 'z80');
    }
    async decompress(packed, options = {}) {
        return unpack(new Uint8Array(packed), options.config || 'z80', options.maxSize || (1 << 24));
    }
}
export default UpkrCodec;
