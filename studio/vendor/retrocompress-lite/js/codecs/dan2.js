/**
 * DAN2 Decompression Codec (JavaScript)
 * -------------------------------------
 * Decoder ported from src/vendor/dan2.c (BETA-20170106).
 *
 * DAN2 is a DAN1-derived LZ stream with a small leading bit header that selects
 * the number of high-offset bits, from 10 to 16. The encoder follows the DAN2 C
 * optimal parser and intentionally omits DAN1's removed RLE literal block mode.
 */

export class DAN2Codec {
  constructor(maxSize = 512 * 1024) {
    this.MAX = maxSize;

    this.BIT_OFFSET1 = 1;
    this.BIT_OFFSET2 = 4;
    this.BIT_OFFSET3 = 8;
    this.BIT_OFFSET4_MIN = 10;
    this.BIT_OFFSET4_MAX = 16;
    this.MAX_LEN = (1 << 16) - 1;

    this.MAX_OFFSET1 = 1 << this.BIT_OFFSET1;
    this.MAX_OFFSET2 = this.MAX_OFFSET1 + (1 << this.BIT_OFFSET2);
    this.MAX_OFFSET3 = this.MAX_OFFSET2 + (1 << this.BIT_OFFSET3);

    this.data_src = new Uint8Array(this.MAX);
    this.data_dest = new Uint8Array(this.MAX * 2);
    this.index_src = 0;
    this.index_dest = 0;
    this.bit_mask = 0;
    this.bit_index = 0;
    this.match_heads = new Int32Array(65536);
    this.match_prev = new Int32Array(this.MAX);
    this.optimals = new Array(this.MAX);
    for (let i = 0; i < this.MAX; i += 1) this.optimals[i] = { bits: 0, offset: 0, len: 0 };

    this._setMaxOffsetBits(this.BIT_OFFSET4_MIN + 1);
  }

  _setMaxOffsetBits(bits) {
    const bounded = Math.max(this.BIT_OFFSET4_MIN, Math.min(this.BIT_OFFSET4_MAX, bits | 0));
    this.BIT_OFFSET4 = bounded;
    this.MAX_OFFSET4 = this.MAX_OFFSET3 + (1 << this.BIT_OFFSET4);
    return bounded;
  }

  _resetReader() {
    this.bit_mask = 0;
    this.bit_index = 0;
  }

  _resetWriter() {
    this.index_dest = 0;
    this.bit_mask = 0;
    this.bit_index = 0;
  }

  _readByte() {
    if (this.index_src >= this.sourceLength) throw new Error("DAN2 decode error: unexpected end of input");
    if (this.index_src >= this.sourceLength) return 0xFF; // Gracefully handle EOF boundary to terminate Elias Gamma safely
    return this.data_src[this.index_src++] & 0xFF;
  }

  _writeByte(value) {
    if (this.index_dest >= this.data_dest.length) throw new Error("DAN2 decode error: output exceeds buffer");
    this.data_dest[this.index_dest++] = value & 0xFF;
  }

  _writeBit(bit) {
    if (this.bit_mask === 0) {
      this.bit_mask = 128;
      this.bit_index = this.index_dest;
      this._writeByte(0);
    }
    if (bit) this.data_dest[this.bit_index] |= this.bit_mask;
    this.bit_mask >>= 1;
  }

  _writeBits(value, bits) {
    let mask = 1;
    for (let i = 0; i < bits; i += 1) mask <<= 1;
    while (mask > 1) {
      mask >>= 1;
      this._writeBit(value & mask);
    }
  }

  _writeEliasGamma(value) {
    let i;
    for (i = 2; i <= value; i <<= 1) this._writeBit(0);
    while ((i >>= 1) > 0) this._writeBit(value & i);
  }

  _writeOffset(offset, option) {
    let value = offset - 1;
    if (value >= this.MAX_OFFSET3) {
      this._writeBit(1);
      value -= this.MAX_OFFSET3;
      this._writeBits(value >> 8, this.BIT_OFFSET4 - 8);
      this._writeByte(value & 0xFF);
    } else if (value >= this.MAX_OFFSET2) {
      if (option > 2) this._writeBit(0);
      this._writeBit(1);
      this._writeByte((value - this.MAX_OFFSET2) & 0xFF);
    } else if (value >= this.MAX_OFFSET1) {
      if (option > 2) this._writeBit(0);
      if (option > 1) this._writeBit(0);
      this._writeBit(1);
      this._writeBits(value - this.MAX_OFFSET1, this.BIT_OFFSET2);
    } else {
      if (option > 2) this._writeBit(0);
      if (option > 1) this._writeBit(0);
      this._writeBit(0);
      this._writeBits(value, this.BIT_OFFSET1);
    }
  }

  _writeDoublet(length, offset) {
    this._writeBit(0);
    this._writeEliasGamma(length);
    this._writeOffset(offset, length);
  }

  _writeLiteral(value) {
    this._writeBit(1);
    this._writeByte(value);
  }

  _writeEnd() {
    this._writeBit(0);
    this._writeBits(0, 16);
  }

  _readBit() {
    if (this.bit_mask === 0) {
      this.bit_mask = 128;
      this.bit_index = this.index_src;
      this._readByte();
    }
    const bit = (this.data_src[this.bit_index] & this.bit_mask) ? 1 : 0;
    this.bit_mask >>= 1;
    return bit;
  }

  _readBits(bits) {
    let value = 0;
    for (let i = 0; i < bits; i += 1) value = (value << 1) | this._readBit();
    return value;
  }

  _readEliasGamma() {
    let counter = 0;
    while (counter < 17) {
      counter += 1;
      if (this._readBit() === 1) break;
    }
    if (counter >= 17) return 0;

    let value = 1;
    for (let i = 1; i < counter; i += 1) value = (value << 1) | this._readBit();
    return value;
  }

  _readOffset(option) {
    if (option > 2 && this._readBit() === 1) {
      const offsetHi = this._readBits(this.BIT_OFFSET4 - 8);
      return (offsetHi << 8) + this._readByte() + this.MAX_OFFSET3;
    }
    if (option > 1 && this._readBit() === 1) return this._readByte() + this.MAX_OFFSET2;
    if (this._readBit() === 1) return this._readBits(4) + this.MAX_OFFSET1;
    return this._readBit() ? 1 : 0;
  }

  _eliasGammaBits(value) {
    let bits = 1;
    while (value > 1) {
      bits += 2;
      value >>= 1;
    }
    return bits;
  }

  _countBits(offset, len) {
    const bits = 1 + this._eliasGammaBits(len);
    if (len === 1) return bits + 1 + (offset > this.MAX_OFFSET1 ? this.BIT_OFFSET2 : this.BIT_OFFSET1);
    if (len === 2) return bits + 1 + (offset > this.MAX_OFFSET2 ? this.BIT_OFFSET3 : 1 + (offset > this.MAX_OFFSET1 ? this.BIT_OFFSET2 : this.BIT_OFFSET1));
    return bits + 1 + (offset > this.MAX_OFFSET3 ? this.BIT_OFFSET4 : 1 + (offset > this.MAX_OFFSET2 ? this.BIT_OFFSET3 : 1 + (offset > this.MAX_OFFSET1 ? this.BIT_OFFSET2 : this.BIT_OFFSET1)));
  }

  _resetMatches() {
    this.match_heads.fill(-1);
  }

  _cleanupOptimals() {
    let i = this.index_src - 1;
    while (i > 1) {
      const len = this.optimals[i].len;
      for (let j = i - 1; j > i - len; j -= 1) {
        this.optimals[j].offset = 0;
        this.optimals[j].len = 0;
      }
      i -= len;
    }
  }

  _writeLZStream() {
    this._resetWriter();
    this._writeBits(0xFE, this.BIT_OFFSET4 - this.BIT_OFFSET4_MIN + 1);
    this._writeByte(this.data_src[0]);

    for (let i = 1; i < this.index_src; i += 1) {
      const opt = this.optimals[i];
      if (!opt || opt.len <= 0) continue;
      const start = i - opt.len + 1;
      if (opt.offset === 0) this._writeLiteral(this.data_src[start]);
      else this._writeDoublet(opt.len, opt.offset);
    }

    this._writeEnd();
    return new Uint8Array(this.data_dest.slice(0, this.index_dest));
  }

  async compress(inputData, options = {}) {
    if (!(inputData instanceof Uint8Array)) inputData = new Uint8Array(inputData);
    if (inputData.length === 0) return new Uint8Array(0);
    if (inputData.length > this.MAX) throw new Error(`DAN2 encode error: input exceeds ${this.MAX} bytes`);

    this._setMaxOffsetBits(options.maxOffsetBits ?? this.BIT_OFFSET4_MIN + 1);
    this.data_src.fill(0);
    this.data_src.set(inputData);
    this.index_src = inputData.length;

    this._resetMatches();
    for (let i = 0; i < this.index_src; i += 1) {
      this.optimals[i].bits = 0x7fffffff;
      this.optimals[i].offset = 0;
      this.optimals[i].len = 0;
    }

    this.optimals[0].bits = 8;
    this.optimals[0].offset = 0;
    this.optimals[0].len = 1;

    for (let i = 1; i < this.index_src; i += 1) {
      this.optimals[i].bits = this.optimals[i - 1].bits + 1 + 8;
      this.optimals[i].offset = 0;
      this.optimals[i].len = 1;

      let limit1 = this.MAX_OFFSET2;
      if (limit1 > i) limit1 = i;
      for (let k = 1; k <= limit1; k += 1) {
        if (this.data_src[i] === this.data_src[i - k]) {
          const cost = this.optimals[i - 1].bits + this._countBits(k, 1);
          if (cost < this.optimals[i].bits) {
            this.optimals[i].bits = cost;
            this.optimals[i].len = 1;
            this.optimals[i].offset = k;
          }
          break;
        }
      }

      const key = ((this.data_src[i - 1] << 8) | this.data_src[i]) & 0xFFFF;
      let bestLen = 1;
      let pos = this.match_heads[key];
      while (pos !== -1 && bestLen < this.MAX_LEN) {
        const offset = i - pos;
        if (offset > this.MAX_OFFSET4) break;

        let len;
        for (len = 2; len <= this.MAX_LEN; len += 1) {
          if (len > bestLen && !(len === 2 && offset > this.MAX_OFFSET3)) {
            bestLen = len;
            const cost = this.optimals[i - len].bits + this._countBits(offset, len);
            if (this.optimals[i].bits > cost) {
              this.optimals[i].bits = cost;
              this.optimals[i].offset = offset;
              this.optimals[i].len = len;
            }
          }
          if (i < offset + len || this.data_src[i - len] !== this.data_src[i - len - offset]) break;
        }

        pos = this.match_prev[pos];
      }

      this.match_prev[i] = this.match_heads[key];
      this.match_heads[key] = i;
    }

    this._cleanupOptimals();
    return this._writeLZStream();
  }

  async decompress(compressed) {
    if (!(compressed instanceof Uint8Array)) compressed = new Uint8Array(compressed);
    if (compressed.length === 0) return new Uint8Array(0);
    if (compressed.length > this.MAX) throw new Error(`DAN2 decode error: input exceeds ${this.MAX} bytes`);

    this.data_src.fill(0);
    this.data_src.set(compressed);
    this.index_src = 0;
    this.index_dest = 0;
    this.sourceLength = compressed.length;
    this._resetReader();

    let bits = this.BIT_OFFSET4_MIN;
    while (this._readBit() === 1) {
      bits += 1;
      if (bits > this.BIT_OFFSET4_MAX) throw new Error("DAN2 decode error: invalid high-offset bit size");
    }
    this.BIT_OFFSET4 = bits;
    this._setMaxOffsetBits(bits);

    this._writeByte(this._readByte());

    while (this.index_src <= this.sourceLength) {
      if (this._readBit() === 1) {
        this._writeByte(this._readByte());
        continue;
      }

      const length = this._readEliasGamma();
      if (length === 0) break;

      const offset = this._readOffset(length);
      const from = this.index_dest - offset - 1;
      if (from < 0) throw new Error("DAN2 decode error: negative source offset");
      for (let i = 0; i < length; i += 1) this._writeByte(this.data_dest[from + i]);
    }

    return new Uint8Array(this.data_dest.slice(0, this.index_dest));
  }
}
