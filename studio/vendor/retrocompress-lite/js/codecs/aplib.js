/**
 * APLibCodec - Version Ultra-Compression
 * Optimisée pour le ratio de compression maximal (Style apultra)
 */
export class APLibCodec {
  constructor(opts = {}) {
    this.MAX_INPUT = opts.maxInput ?? (1024 * 1024);
    this.MAX_OFFSET = 0x7fff;
    this.MAX_MATCH = 0xffff;
    this.BEAM_WIDTH = opts.beamWidth ?? 32; // Largeur pour l'optimalité maximale
    this.CHAIN_LIMIT = opts.chainLimit ?? 192; // Recherche profonde
    this.MATCH_CANDIDATES = opts.matchCandidates ?? 12;
    this.NEAR_THRESHOLD = opts.nearThreshold ?? 0x100;
    this.MID_THRESHOLD = opts.midThreshold ?? 0x400;
    this.RLE_OFFSETS = opts.rleOffsets ?? [1, 2];
    this.SCAN_NEAR_LIMIT = opts.scanNearLimit ?? 96;
    this.NEAR_COST_BONUS = opts.nearCostBonus ?? 1.0;
    this.MID_COST_BONUS = opts.midCostBonus ?? 0.35;
  }

  /* ========================= DÉCOMPRESSEUR ========================= */
  decompress(input) {
    const data = new Uint8Array(input);
    let inPtr = 0, out = [];
    const readBit = (() => {
      let buffer = 0, count = 0;
      return () => {
        if (count === 0) { buffer = data[inPtr++]; count = 8; }
        const bit = (buffer >> 7) & 1;
        buffer = (buffer << 1) & 0xff;
        count--;
        return bit;
      };
    })();
    const readVar = () => {
      let res = 1;
      do { res = (res << 1) | readBit(); } while (readBit() === 1);
      return res;
    };
    if (data.length === 0) return new Uint8Array(0);
    out.push(data[inPtr++]);
    let lastOffset = 0, pair = true;
    while (inPtr < data.length) {
      if (readBit() === 0) {
        out.push(data[inPtr++]);
        pair = true;
      } else {
        if (readBit() === 0) {
          let offHigh = readVar();
          if (pair && offHigh === 2) {
            const len = readVar();
            for (let k = 0; k < len; k++) out.push(out[out.length - lastOffset]);
          } else {
            const high = pair ? offHigh - 3 : offHigh - 2;
            const dist = (high << 8) | data[inPtr++];
            const len = readVar() + (dist < 0x80 || dist >= 0x7d00 ? 2 : dist >= 0x500 ? 1 : 0);
            for (let k = 0; k < len; k++) out.push(out[out.length - dist]);
            lastOffset = dist;
          }
          pair = false;
        } else if (readBit() === 0) {
          const b = data[inPtr++];
          const dist = b >> 1;
          if (dist === 0) break;
          const len = (b & 1) + 2;
          for (let k = 0; k < len; k++) out.push(out[out.length - dist]);
          lastOffset = dist; pair = false;
        } else {
          const dist = (readBit() << 3) | (readBit() << 2) | (readBit() << 1) | readBit();
          if (dist === 0) out.push(0);
          else out.push(out[out.length - dist]);
          pair = true;
        }
      }
    }
    return new Uint8Array(out);
  }

  /* ========================= ENCODEUR ULTRA ========================= */

  _varBits(v) {
    if (v < 2) return 0;
    return (31 - Math.clz32(v)) * 2;
  }

  _lengthDelta(dist) {
    if (dist < 0x80 || dist >= 0x7D00) return 2;
    return (dist >= 0x500) ? 1 : 0;
  }

  _collectMatches(input, head, next, pos) {
    const n = input.length;
    const maxLen = Math.min(this.MAX_MATCH, n - pos);
    if (maxLen < 2) return [];

    const matches = [];
    const h = ((input[pos] << 8) ^ (input[pos + 1] * 257) ^ (input[pos + 2] * 911)) & 0xffff;
    let p = head[h], walked = 0;
    const cap = this.MATCH_CANDIDATES;
    const seen = new Set();
    const markSeen = (off, len) => {
      const key = `${off}:${len}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    };
    const insertMatch = (match) => {
      if (cap === 0) return;
      let idx;
      if (matches.length < cap) {
        matches.push(match);
        idx = matches.length - 1;
      } else {
        const worst = matches[cap - 1];
        if (match.len < worst.len || (match.len === worst.len && match.off >= worst.off)) return;
        matches[cap - 1] = match;
        idx = cap - 1;
      }
      while (idx > 0 && (matches[idx].len > matches[idx - 1].len ||
        (matches[idx].len === matches[idx - 1].len && matches[idx].off < matches[idx - 1].off))) {
        const tmp = matches[idx];
        matches[idx] = matches[idx - 1];
        matches[idx - 1] = tmp;
        idx--;
      }
    };

    let bestNear = null;
    let bestMid = null;
    const pushTracked = (match) => {
      insertMatch(match);
      if (match.off <= this.NEAR_THRESHOLD &&
        (!bestNear || match.len > bestNear.len || (match.len === bestNear.len && match.off < bestNear.off))) {
        bestNear = match;
      }
      if (match.off <= this.MID_THRESHOLD &&
        (!bestMid || match.len > bestMid.len || (match.len === bestMid.len && match.off < bestMid.off))) {
        bestMid = match;
      }
    };

    const rleSet = new Set(this.RLE_OFFSETS);
    const tryOffset = (off) => {
      if (off > pos) return;
      const len = this._matchLength(input, pos, off, maxLen);
      if (len >= 2 && markSeen(off, len)) pushTracked({ off, len });
    };

    for (const off of this.RLE_OFFSETS) tryOffset(off);
    const nearCap = Math.min(this.SCAN_NEAR_LIMIT, pos);
    for (let off = 1; off <= nearCap; off++) {
      if (rleSet.has(off)) continue;
      tryOffset(off);
    }

    while (p !== -1 && walked++ < this.CHAIN_LIMIT) {
      const off = pos - p;
      if (off > this.MAX_OFFSET) break;
      if (input[p + 1] === input[pos + 1]) {
        let len = 0;
        while (len < maxLen && input[pos + len] === input[p + len]) len++;
        if (len >= 2 && markSeen(off, len)) pushTracked({ off, len });
      }
      p = next[p];
    }

    const ensureCandidate = (candidate) => {
      if (!candidate) return;
      if (!matches.some((m) => m.off === candidate.off && m.len === candidate.len)) {
        insertMatch({ off: candidate.off, len: candidate.len });
      }
    };
    ensureCandidate(bestNear);
    ensureCandidate(bestMid);

    return matches;
  }

  _matchLength(input, pos, off, maxLen) {
    if (off <= 0 || pos < off) return 0;
    let len = 0;
    while (len < maxLen && input[pos + len] === input[pos - off + len]) len++;
    return len;
  }

  _offsetBonus(off) {
    if (off <= this.NEAR_THRESHOLD) return this.NEAR_COST_BONUS;
    if (off <= this.MID_THRESHOLD) return this.MID_COST_BONUS;
    return 0;
  }

  _beamPlan(input) {
    const n = input.length, K = this.BEAM_WIDTH;
    const head = new Int32Array(1 << 16).fill(-1), next = new Int32Array(n).fill(-1);
    const nodes = [], layers = Array.from({ length: n + 1 }, () => new Map());

    const addNode = (pos, pair, lastOff, cost, prev, op) => {
      const key = (pair ? 0x8000 : 0) | (lastOff & 0x7fff);
      const layer = layers[pos];
      if (!layer.has(key) || cost < nodes[layer.get(key)].cost) {
        const idx = nodes.length;
        nodes.push({ pos, pair, lastOff, cost, prev, op });
        layer.set(key, idx);
        if (layer.size > K * 2) { // Pruning
          const sorted = [...layer.entries()].sort((a, b) => nodes[a[1]].cost - nodes[b[1]].cost);
          layer.clear();
          for (let i = 0; i < K; i++) if (sorted[i]) layer.set(sorted[i][0], sorted[i][1]);
        }
      }
    };

    addNode(1, true, 0, 0, -1, null);
    for (let pos = 1; pos < n; pos++) {
      if (pos + 2 < n) {
        const h = ((input[pos-1] << 8) ^ (input[pos] * 257) ^ (input[pos+1] * 911)) & 0xffff;
        next[pos-1] = head[h]; head[h] = pos-1;
      }
      const matches = this._collectMatches(input, head, next, pos);
      const maxLen = Math.min(this.MAX_MATCH, n - pos);
      for (const nodeIdx of layers[pos].values()) {
        const st = nodes[nodeIdx];
        let nodeMatches = matches;
        if (st.lastOff > 0) {
          const reuseLen = this._matchLength(input, pos, st.lastOff, maxLen);
          if (reuseLen >= 2) {
            let foundIdx = -1;
            for (let idx = 0; idx < nodeMatches.length; idx++) {
              if (nodeMatches[idx].off === st.lastOff) { foundIdx = idx; break; }
            }
            if (foundIdx === -1) {
              nodeMatches = nodeMatches === matches ? matches.slice() : nodeMatches;
              nodeMatches.unshift({ off: st.lastOff, len: reuseLen });
            } else if (nodeMatches[foundIdx].len < reuseLen) {
              nodeMatches = nodeMatches === matches ? matches.slice() : nodeMatches;
              nodeMatches[foundIdx] = { off: st.lastOff, len: reuseLen };
            }
          }
        }
        // 1. Literal (Tag 0)
        addNode(pos + 1, true, st.lastOff, st.cost + 9, nodeIdx, { type: 'lit', len: 1 });
        // 2. Single Byte (Tag 111)
        if (input[pos] === 0) addNode(pos + 1, true, st.lastOff, st.cost + 7, nodeIdx, { type: 'single', off: 0, len: 1 });
        for (let off = 1; off <= 15 && off <= pos; off++) {
          if (input[pos - off] === input[pos]) {
            addNode(pos + 1, true, st.lastOff, st.cost + 7, nodeIdx, { type: 'single', off, len: 1 });
            break;
          }
        }
        // 3. Match & Reuse (Tag 10 / 110)
        for (const m of nodeMatches) {
          const bonus = this._offsetBonus(m.off);
          if (m.off <= 127) { // Short Block
            for (let l = 2; l <= Math.min(3, m.len); l++)
              addNode(pos + l, false, m.off, st.cost + 11 - bonus, nodeIdx, { type: 'short', off: m.off, len: l });
          }
          if (st.pair && m.off === st.lastOff && st.lastOff > 0) { // Reuse
            for (let l = 2; l <= m.len; l = (l < 16 ? l + 1 : l + 16))
              addNode(pos + l, false, m.off, st.cost + 2 + this._varBits(2) + this._varBits(l) - bonus, nodeIdx, { type: 'reuse', off: m.off, len: l });
            addNode(pos + m.len, false, m.off, st.cost + 2 + this._varBits(2) + this._varBits(m.len) - bonus, nodeIdx, { type: 'reuse', off: m.off, len: m.len });
          }
          const delta = this._lengthDelta(m.off);
          if (m.len >= 2 + delta) { // Standard Block
            const base = 2 + this._varBits((m.off >>> 8) + (st.pair ? 3 : 2)) + 8;
            for (let l = 2 + delta; l <= m.len; l = (l < 16 ? l + 1 : l + 16))
              addNode(pos + l, false, m.off, st.cost + base + this._varBits(l - delta) - bonus, nodeIdx, { type: 'block', off: m.off, len: l });
            addNode(pos + m.len, false, m.off, st.cost + base + this._varBits(m.len - delta) - bonus, nodeIdx, { type: 'block', off: m.off, len: m.len });
          }
        }
      }
    }
    let cur = [...layers[n].values()].sort((a, b) => nodes[a].cost - nodes[b].cost)[0], ops = [];
    while (cur !== -1 && nodes[cur].op) { ops.push(nodes[cur].op); cur = nodes[cur].prev; }
    return ops.reverse();
  }

  compress(input) {
    if (input.length === 0) return new Uint8Array(0);
    const plan = this._beamPlan(input);
    const out = [input[0]];
    const W = this._beginWriter(out);
    let pair = true, lastOff = 0, pos = 1;
    for (const op of plan) {
      if (op.type === 'lit') {
        W.writeBit(0);
        W.writeByte(input[pos]);
        pair = true;
      } else if (op.type === 'single') {
        W.writeBits([1, 1, 1]);
        W.writeFixed(op.off, 4);
        pair = true;
      } else if (op.type === 'short') {
        W.writeBits([1, 1, 0]);
        W.writeByte((op.off << 1) | (op.len - 2));
        lastOff = op.off;
        pair = false;
      } else if (op.type === 'reuse') {
        W.writeBits([1, 0]);
        W.writeVar(2);
        W.writeVar(op.len);
        pair = false;
      } else {
        W.writeBits([1, 0]);
        W.writeVar((op.off >>> 8) + (pair ? 3 : 2));
        W.writeByte(op.off & 0xff);
        W.writeVar(op.len - this._lengthDelta(op.off));
        lastOff = op.off;
        pair = false;
      }
      pos += op.len;
    }
    W.writeBits([1, 1, 0]); W.writeByte(0); W.flush();
    return new Uint8Array(out);
  }

  _beginWriter(out) {
    let bitPos = out.length; out.push(0);
    let bitData = 0, bitCount = 0, bytesWritten = 0;
    const writeBit = (v) => {
      if (bitCount === 8) { out[bitPos] = bitData; bitPos = out.length; out.push(0); bitData = 0; bitCount = 0; }
      bitData = (bitData << 1) | (v ? 1 : 0); bitCount++;
    };
    return {
      writeBit, writeBits: (bits) => bits.forEach(writeBit),
      writeByte: (b) => { out.push(b); bytesWritten++; },
      writeFixed: (v, n) => { for (let k = n - 1; k >= 0; k--) writeBit((v >> k) & 1); },
      writeVar: (v) => {
        const msb = 31 - Math.clz32(v);
        writeBit((v >> (msb - 1)) & 1);
        for (let k = msb - 2; k >= 0; k--) { writeBit(1); writeBit((v >> k) & 1); }
        writeBit(0);
      },
      flush: () => { if (bitCount > 0) out[bitPos] = (bitData << (8 - bitCount)); },
      bitOffset: () => bytesWritten
    };
  }
}

