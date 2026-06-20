/*
 BitBusterV12Codec.js
*/

export class BitBusterV12Codec {
  constructor(maxInput = 512 * 1024) {
    this.MAX_INPUT = maxInput;
    this.MAX_OFFSET = 0x07ff; // 2047
  }

  /* ========================= Encoder ========================= */
  _beginWriter(origLen) {
    const out = [];
    const head = new Uint8Array(4);
    new DataView(head.buffer).setUint32(0, origLen >>> 0, true);
    out.push(...head);

    let bitPos = out.length; // reserve first bit byte placeholder
    out.push(0);
    let bitData = 0, bitCount = 0;

    const writeByte = (b) => { out.push(b & 0xff); };

    const rotateBitByte = () => {
      out[bitPos] = bitData & 0xff;      // backfill
      bitPos = out.length; out.push(0);  // reserve next
      bitData = 0; bitCount = 0;
    };

    const writeBit = (v) => {
      if (bitCount === 8) rotateBitByte();
      bitData = ((bitData << 1) | (v ? 1 : 0)) & 0xff; // MSB-first
      bitCount++;
    };

    const writeGamma = (value /* >=0 */) => {
      const n = (value >>> 0) + 1; let k = 0; for (let t = n; t > 1; t >>= 1) k++;
      for (let i = 0; i < k; i++) writeBit(1); writeBit(0);
      for (let i = k - 1; i >= 0; i--) writeBit((n >> i) & 1);
    };

    const writeOffset = (dist /* >=1 */) => {
      const x = (dist - 1) >>> 0;
      if (x <= 127) { writeByte(x); }
      else { writeByte(0x80 | (x & 0x7f)); const hi = (x >>> 7) & 0x0f; writeBit(hi & 0x8); writeBit(hi & 0x4); writeBit(hi & 0x2); writeBit(hi & 0x1); }
    };

    const endStream = () => {
      // EOF sentinel: tag 1, offset byte 0, then 16 ones and a terminating 0
      writeBit(1); writeByte(0); for (let i = 0; i < 16; i++) writeBit(1); writeBit(0);
      if (bitCount > 0) out[bitPos] = (bitData << (8 - bitCount)) & 0xff; // backfill final
    };

    return { out, writeByte, writeBit, writeGamma, writeOffset, endStream };
  }

  _gammaSize(v) { let g = 1; while (v) { v--; g += 2; v >>= 1; } return g; }

  _optimalPlan(input) {
    const n = input.length; const bestLen = new Uint32Array(n); const bestOff = new Uint32Array(n); const cost = new Int32Array(n + 1); cost[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
      let best = cost[i + 1] + 9, bl = 0, bo = 0;
      const maxOff = Math.min(this.MAX_OFFSET, i);
      for (let off = 1; off <= maxOff; off++) {
        let l = 0; while (i + l < n && input[i + l] === input[i - off + l]) { l++; if (l >= 65535) break; }
        if (l > 1) { const bits = 1 + this._gammaSize(l - 2) + ((off <= 128) ? 8 : 12); const c = cost[Math.min(n, i + l)] + bits; if (c < best) { best = c; bl = l; bo = off; } }
      }
      cost[i] = best; bestLen[i] = bl; bestOff[i] = bo;
    }
    return { bestLen, bestOff };
  }

  compress(input) {
    if (!(input instanceof Uint8Array)) input = new Uint8Array(input);
    const n = input.length >>> 0; if (n === 0) return new Uint8Array([0,0,0,0]); if (n > this.MAX_INPUT) throw new Error(`Input too large (${n} > ${this.MAX_INPUT})`);
    const { bestLen, bestOff } = this._optimalPlan(input);
    const W = this._beginWriter(n);
    for (let i = 0; i < n;) {
      const l = bestLen[i] | 0;
      if (l > 1) { W.writeBit(1); W.writeOffset(bestOff[i] | 0); W.writeGamma((l - 2) | 0); i += l; }
      else { W.writeBit(0); W.writeByte(input[i]); i++; }
    }
    W.endStream();
    return new Uint8Array(W.out);
  }

  /* ========================= Decoder ========================= */
  decompress(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length < 4) throw new Error('Truncated header');
    const outLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);

    const out = new Uint8Array(outLen);
    let pos = 4;             // single cursor
    let bitMask = 0, bitByte = 0;

    const readBit = () => { if (bitMask === 0) { if (pos >= bytes.length) throw new Error('EOF (bit byte)'); bitByte = bytes[pos++]; bitMask = 0x80; } const b = (bitByte & bitMask) ? 1 : 0; bitMask >>= 1; return b; };
    const readByte = () => { if (pos >= bytes.length) throw new Error('EOF (payload byte)'); return bytes[pos++]; };

    // Read gamma and also return how many leading 1s (k) we saw so we can detect the EOF sentinel (k==16)
    const readGammaEx = () => { let k = 0; while (readBit() === 1) { k++; if (k === 16) return { value: 0, k }; } let val = 1; for (let i = 0; i < k; i++) val = (val << 1) | readBit(); return { value: val - 1, k }; };

    const readDistance = () => { const first = readByte(); if ((first & 0x80) === 0) return { dist: (first & 0x7f) + 1, first }; let hi = 0; hi = (hi << 1) | readBit(); hi = (hi << 1) | readBit(); hi = (hi << 1) | readBit(); hi = (hi << 1) | readBit(); return { dist: ((first & 0x7f) | (hi << 7)) + 1, first }; };

    let i = 0;
    while (i < outLen) {
      const tag = readBit();
      if (tag === 0) {
        out[i++] = readByte();
      } else {
        const b0 = readByte();
        if (b0 === 0) {
          // Could be EOF sentinel or a real match with dist=1; disambiguate by gamma header length
          const g = readGammaEx();
          if (g.k === 16) break; // EOF (exact sentinel used by v1.2)
          // Real match: dist=1, length = g.value + 2
          const len = (g.value + 2) | 0; const dist = 1; const ref = i - dist; if (ref < 0) throw new Error('Backref before start');
          for (let k = 0; k < len; k++) out[i + k] = out[ref + k]; i += len;
        } else if ((b0 & 0x80) === 0) {
          // small distance 1..128 encoded as (dist-1) 0..127 in b0
          const dist = (b0 & 0x7f) + 1; const g = readGammaEx(); const len = (g.value + 2) | 0; const ref = i - dist; if (ref < 0) throw new Error('Backref before start');
          for (let k = 0; k < len; k++) out[i + k] = out[ref + k]; i += len;
        } else {
          // extended distance
          let hi = 0; hi = (hi << 1) | readBit(); hi = (hi << 1) | readBit(); hi = (hi << 1) | readBit(); hi = (hi << 1) | readBit();
          const dist = ((b0 & 0x7f) | (hi << 7)) + 1; const g = readGammaEx(); const len = (g.value + 2) | 0; const ref = i - dist; if (ref < 0) throw new Error('Backref before start');
          for (let k = 0; k < len; k++) out[i + k] = out[ref + k]; i += len;
        }
      }
    }

    return out;
  }
}
