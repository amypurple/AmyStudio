/**
 * DAN1 Compression Codec (JavaScript)
 * -----------------------------------
 * Faithful port of DAN1 encoder/decoder from the original C implementation
 * with a modern JS structure inspired by the DAN3 JavaScript template.
 *
 * Author (JS port): Amy Bienvenu (NewColeco)
 * Original C Author: Daniel Bienvenu aka NewColeco (2016)
 *
 * Notes:
 * - Keeps bitstream format identical to DAN1 C tool (BETA-20160710).
 * - Uses typed arrays and array-based hash chains (no heap-alloc linked lists).
 * - RLE mode is supported (threshold 27), disabled by default to match C tool
 *   unless explicitly enabled in options.
 * - Sliding window for decoding uses direct array addressing (not a ring),
 *   while preserving bit-for-bit compatibility of the stream.
 */

export class DAN1Codec {
  constructor(maxSize = 512 * 1024) {
    // ---- Constants (match the C source) ----
    this.MAX = maxSize; // up to 512 KB

    this.MAX_ELIAS_GAMMA = 1 << 16; // 65536 (used by the C decoder's ring)
    this.MAX_LEN = (1 << 16) - 1;    // 65535

    this.BIT_OFFSET1 = 1;
    this.BIT_OFFSET2 = 4;
    this.BIT_OFFSET3 = 8;
    this.BIT_OFFSET4 = 12;

    this.MAX_OFFSET1 = (1 << this.BIT_OFFSET1);                       // 2
    this.MAX_OFFSET2 = this.MAX_OFFSET1 + (1 << this.BIT_OFFSET2);    // 2 + 16 = 18
    this.MAX_OFFSET3 = this.MAX_OFFSET2 + (1 << this.BIT_OFFSET3);    // 18 + 256 = 274
    this.MAX_OFFSET  = this.MAX_OFFSET3 + (1 << this.BIT_OFFSET4);    // 274 + 4096 = 4370

    // RLE literal block control (matches C behavior)
    this.RLE_MIN = 27;
    this.RLE_RANGE = 256; // stored len = actualLen - 27 in one byte

    // Workspace buffers
    this.data_src  = new Uint8Array(this.MAX);
    this.data_dest = new Uint8Array(this.MAX * 2); // generous for worst-case literal output

    this.index_src = 0;
    this.index_dest = 0;

    // Bit I/O state (shared by writer/reader as appropriate — reset before use)
    this.bit_mask = 0;
    this.bit_index = 0; // byte index holding the bitfield we are writing/reading

    // Match structures (array-based hash chains on 2-byte keys)
    this.match_heads = new Int32Array(65536);
    this.match_prev  = new Int32Array(this.MAX);

    // Optimal parsing states (single subset, unlike DAN3)
    this.optimals = new Array(this.MAX);
    for (let i = 0; i < this.MAX; i++) this.optimals[i] = { bits: 0, offset: 0, len: 0 };

    // Flags
    this.bVerbose = false;
    this.bRLE = false; // keep C-tool default; override via options
  }

  /* ========================= Utility I/O ========================= */
  _resetWriter() {
    this.index_dest = 0;
    this.bit_mask = 0;
    this.bit_index = 0;
  }
  _resetReader() {
    this.bit_mask = 0;
    this.bit_index = 0;
  }

  _writeByte(v) {
    this.data_dest[this.index_dest++] = v & 0xFF;
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

  _writeBits(value, size) {
    // MSB-first, same as C
    let mask = 1;
    for (let i = 0; i < size; i++) mask <<= 1; // mask = 2^size
    while (mask > 1) {
      mask >>= 1;
      this._writeBit(value & mask);
    }
  }

  _writeEliasGamma(value /* >=1 */) {
    // Same layout as C: emit leading zeros, then value in binary
    let i;
    for (i = 2; i <= value; i <<= 1) this._writeBit(0);
    while ((i >>= 1) > 0) this._writeBit(value & i);
  }

  _writeOffset(offset /* distance >=1 */, optionLen) {
    // Mirror the exact tiering used by C; internally writes (offset-1)
    let value = offset - 1;
    if (value >= this.MAX_OFFSET3) {
      // 1 + (BIT_OFFSET4-8) + 8
      this._writeBit(1);
      value -= this.MAX_OFFSET3;
      this._writeBits(value >> 8, this.BIT_OFFSET4 - 8);
      this._writeByte(value & 0xFF);
    } else if (value >= this.MAX_OFFSET2) {
      // [if option>2]0, 1, + 8
      if (optionLen > 2) this._writeBit(0);
      this._writeBit(1);
      value -= this.MAX_OFFSET2;
      this._writeByte(value & 0xFF);
    } else if (value >= this.MAX_OFFSET1) {
      // [if option>2]0, [if option>1]0, 1, +4
      if (optionLen > 2) this._writeBit(0);
      if (optionLen > 1) this._writeBit(0);
      this._writeBit(1);
      value -= this.MAX_OFFSET1;
      this._writeBits(value, this.BIT_OFFSET2);
    } else {
      // [if option>2]0, [if option>1]0, 0, +1
      if (optionLen > 2) this._writeBit(0);
      if (optionLen > 1) this._writeBit(0);
      this._writeBit(0);
      this._writeBits(value, this.BIT_OFFSET1);
    }
  }

  _writeDoublet(length, offset) {
    // token flag 0, gamma(len), then offset tier coded by len
    this._writeBit(0);
    this._writeEliasGamma(length);
    this._writeOffset(offset, length);
  }

  _writeLiteralsLength(length /* >=27 */) {
    // token flag 0, 16 zero bits, then a 1, then (length-27) as a byte
    this._writeBit(0);
    this._writeBits(0, 16);
    this._writeBit(1);
    this._writeByte(length - this.RLE_MIN);
  }

  _writeLiteral(c) {
    // token flag 1 then the byte
    this._writeBit(1);
    this._writeByte(c);
  }

  _writeEnd() {
    // token flag 0, 16 zero bits, then a 0 (end marker)
    this._writeBit(0);
    this._writeBits(0, 16);
    this._writeBit(0);
  }

  _readByte() { return this.data_src[this.index_src++] & 0xFF; }

  _readBit() {
    if (this.bit_mask === 0) {
      this.bit_mask = 128;
      this.bit_index = this.index_src; // consume a fresh byte as bitfield
      this.index_src++;
    }
    const bit = (this.data_src[this.bit_index] & this.bit_mask) ? 1 : 0;
    this.bit_mask >>= 1;
    return bit;
  }

  _readBits(n) {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | this._readBit();
    return v;
  }

  _readNibble() { return this._readBits(4); }

  _readEliasGamma() {
    // Mirrors C: count until first '1'. If 17 reads occur without a '1', return 0 (RLE/END sentinel).
    let counter = 0;
    // Ensure carry starts at 0 equivalent (our bit reader doesn't track carry flag,
    // but semantics are: read until we see a 1 bit or hit the 17-limit)
    while (counter < 17) {
      const b = this._readBit();
      counter++;
      if (b === 1) break;
    }
    if (counter >= 17) return 0;
    // Now reconstruct the remaining (counter-1) payload bits of the Elias-gamma value.
    // Start from 1, then read exactly (counter-1) bits, MSB-first.
    let value = 1;
    for (let i = 1; i < counter; i++) {
      value = (value << 1) | this._readBit();
    }
    return value;
  }

  _readOffset(optionLen) {
    // Returns the encoded (offset-1) value, exactly like the C decoder
    if (optionLen > 2) {
      if (this._readBit()) {
        const hi = this._readNibble() + 1; // 1..16
        const lo = this._readByte();
        return (hi << 8) + lo + 18; // value in [274 .. 4370]
      }
    }
    if (optionLen > 1) {
      if (this._readBit()) {
        return this._readByte() + 18; // value in [18 .. 273]
      }
    }
    if (this._readBit()) {
      return this._readNibble() + 2; // value in [2 .. 17]
    } else {
      return this._readBit() ? 1 : 0; // value in {0,1}
    }
  }

  /* ========================= Cost Model ========================= */
  _eliasGammaBits(value) {
    // identical to C: starts at 1; each halving adds 2 (one 0 + one payload bit)
    let bits = 1;
    while (value > 1) { bits += 2; value >>= 1; }
    return bits;
  }

  _countBits(offset, len) {
    // Mirrors C count_bits exactly
    const bits = 1 + this._eliasGammaBits(len); // token-flag(0/1) accounted by caller; here we include gamma + offset tier
    if (len === 1) {
      return bits + 1 + (offset > this.MAX_OFFSET1 ? this.BIT_OFFSET2 : this.BIT_OFFSET1);
    }
    if (len === 2) {
      return bits + 1 + (offset > this.MAX_OFFSET2 ? this.BIT_OFFSET3 : (1 + (offset > this.MAX_OFFSET1 ? this.BIT_OFFSET2 : this.BIT_OFFSET1)));
    }
    // len >= 3
    return bits + 1 + (
      offset > this.MAX_OFFSET3 ? this.BIT_OFFSET4 : (1 + (offset > this.MAX_OFFSET2 ? this.BIT_OFFSET3 : (1 + (offset > this.MAX_OFFSET1 ? this.BIT_OFFSET2 : this.BIT_OFFSET1))))
    );
  }

  /* ========================= Encoder ========================= */
  _resetMatches() { this.match_heads.fill(-1); }

  _cleanupOptimals() {
    let i = this.index_src - 1;
    while (i > 1) {
      const len = this.optimals[i].len;
      for (let j = i - 1; j > i - len; j--) {
        this.optimals[j].offset = 0;
        this.optimals[j].len = 0;
      }
      i -= len;
    }
  }

  _writeLZStream() {
    this._resetWriter();
    // First byte is always literal (exactly like C)
    this._writeByte(this.data_src[0]);

    for (let i = 1; i < this.index_src; i++) {
      const opt = this.optimals[i];
      if (!opt || opt.len <= 0) continue;
      const start = i - opt.len + 1;
      if (opt.offset === 0) {
        if (opt.len === 1) {
          this._writeLiteral(this.data_src[start]);
        } else {
          this._writeLiteralsLength(opt.len);
          for (let k = 0; k < opt.len; k++) this._writeByte(this.data_src[start + k]);
        }
      } else {
        this._writeDoublet(opt.len, opt.offset);
      }
    }
    this._writeEnd();

    return new Uint8Array(this.data_dest.slice(0, this.index_dest));
  }

  /**
   * Compress inputData (Uint8Array)
   * options: { rle?: boolean, verbose?: boolean }
   */
  async compress(inputData, options = {}) {
    if (!(inputData instanceof Uint8Array)) inputData = new Uint8Array(inputData);
    if (inputData.length === 0) return new Uint8Array(0);
    if (inputData.length > this.MAX) throw new Error(`Input too large: ${inputData.length} > ${this.MAX}`);

    this.bRLE = options.rle ?? this.bRLE;
    this.bVerbose = !!options.verbose;

    // Load input
    this.index_src = inputData.length;
    this.data_src.set(inputData.subarray(0, this.index_src));

    // Reset state
    this._resetMatches();
    for (let i = 0; i < this.index_src; i++) {
      this.optimals[i].bits = 0x7fffffff;
      this.optimals[i].offset = 0;
      this.optimals[i].len = 0;
    }

    // First byte literal baseline
    this.optimals[0].bits = 8; // first is literal (1 byte)
    this.optimals[0].offset = 0;
    this.optimals[0].len = 1;

    // Main DP
    for (let i = 1; i < this.index_src; i++) {
      // Literal at i
      this.optimals[i].bits   = this.optimals[i - 1].bits + 1 + 8; // flag(1) + literal(8)
      this.optimals[i].offset = 0;
      this.optimals[i].len    = 1;

      // String of literals (RLE literal block) — identical thresholds as C
      if (this.bRLE && i >= this.RLE_MIN) {
        let j = this.RLE_RANGE + this.RLE_MIN; // 256 + 27
        if (j > i) j = i;
        for (let k = j; k > this.RLE_MIN - 1; k--) { // k >= 27
          const cost = this.optimals[i - k].bits + (1 + 16 + 1 + 8) + k * 8; // flag(0)+16zero+1 + lenByte + k bytes
          if (this.optimals[i].bits > cost) {
            this.optimals[i].bits = cost;
            this.optimals[i].len = k;
            this.optimals[i].offset = 0;
          }
        }
      }

      // LZ match of length 1 (restricted to MAX_OFFSET2 as in C)
      let limit1 = this.MAX_OFFSET2; if (limit1 > i) limit1 = i;
      for (let k = 1; k <= limit1; k++) {
        if (this.data_src[i] === this.data_src[i - k]) {
          const cost = this.optimals[i - 1].bits + this._countBits(k, 1);
          if (cost < this.optimals[i].bits) {
            this.optimals[i].bits = cost;
            this.optimals[i].len = 1;
            this.optimals[i].offset = k;
          }
          break; // as in C, break on first improvement
        }
      }

      // LZ matches of length >= 2 via 2-byte hash chain
      const key = ((this.data_src[i - 1] << 8) | this.data_src[i]) & 0xFFFF;
      let best_len = 1;
      let pos = this.match_heads[key];
      while (pos !== -1 && best_len < this.MAX_LEN) {
        const offset = i - pos;
        if (offset > this.MAX_OFFSET) break; // older nodes only get worse

        let len;
        for (len = 2; len <= this.MAX_LEN; len++) {
          if (len > best_len) {
            if (!(len === 2 && offset > this.MAX_OFFSET3)) {
              best_len = len;
              const cost = this.optimals[i - len].bits + this._countBits(offset, len);
              if (this.optimals[i].bits > cost) {
                this.optimals[i].bits = cost;
                this.optimals[i].offset = offset;
                this.optimals[i].len = len;
              }
            }
          }
          // stop if we cannot extend
          if (i < offset + len || this.data_src[i - len] !== this.data_src[i - len - offset]) break;
        }

        // Skip optimization like C: if len>6 and len == best_len-1 and pos == next+1
        const next = this.match_prev[pos];
        if (len > 6 && len === best_len - 1 && next !== -1 && pos === next + 1) {
          let steps = 1;
          let p = next;
          while (p !== -1) {
            const off2 = i - p;
            if (off2 > this.MAX_OFFSET) break;
            steps++;
            if (steps === len) { pos = p; break; }
            p = this.match_prev[p];
          }
          if (p === -1) break;
        }

        pos = this.match_prev[pos];
      }

      // update hash chain for key with current position i
      this.match_prev[i] = this.match_heads[key];
      this.match_heads[key] = i;
    }

    // Post-process and emit
    this._cleanupOptimals();
    return this._writeLZStream();
  }

  /* ========================= Decoder ========================= */
  async decompress(compressed) {
    if (!(compressed instanceof Uint8Array)) compressed = new Uint8Array(compressed);

    // Load source
    this.data_src.set(compressed);
    this.index_src = 0;
    this.index_dest = 0;
    this._resetReader();

    if (compressed.length === 0) return new Uint8Array(0);

    // First byte is a literal (no bit header)
    this._writeByte(this._readByte());

    // Now parse tokens
    while (this.index_src <= compressed.length) {
      if (this._readBit() === 1) {
        // literal
        this._writeByte(this._readByte());
        continue;
      }

      const len = this._readEliasGamma();
      if (len !== 0) {
        const value = this._readOffset(len); // value == (offset-1)
        const from = this.index_dest - value - 1;
        if (from < 0) throw new Error("DAN1 decode error: negative source offset");
        for (let i = 0; i < len; i++) this.data_dest[this.index_dest + i] = this.data_dest[from + i];
        this.index_dest += len;
        continue;
      }

      // RLE or END
      if (this._readBit() === 1) {
        const rleLen = this._readByte() + this.RLE_MIN;
        for (let i = 0; i < rleLen; i++) this._writeByte(this._readByte());
        continue;
      }

      // END marker
      break;
    }

    return new Uint8Array(this.data_dest.slice(0, this.index_dest));
  }
}
