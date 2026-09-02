/**
 * DAN3 Compression Codec
 * A JavaScript implementation of the DAN3 compression algorithm
 * Created by Amy Bienvenu (NewColeco) in 2018
 * Modern LZSS variant optimized for ColecoVision and other 8-bit systems
 *
 * SPEED-OPTIMIZED VERSION: Replaced object-based hash chain with typed arrays
 * to improve match-finding performance and reduce garbage collection overhead.
 */

export class DAN3Codec {
    constructor() {
        this.MAX = 256 * 1024;
        this.BIT_GOLOMG_MAX = 7;
        this.MAX_GAMMA = (1 << (this.BIT_GOLOMG_MAX + 1)) - 2;
        this.BIT_OFFSET00 = 0;
        this.BIT_OFFSET0 = 1;
        this.BIT_OFFSET1 = 5;
        this.BIT_OFFSET2 = 8;
        this.BIT_OFFSET_MIN = 9;
        this.BIT_OFFSET_MAX = 16;
        this.BIT_OFFSET_NBR = this.BIT_OFFSET_MAX - this.BIT_OFFSET_MIN + 1;
        this.MAX_OFFSET00 = (1 << this.BIT_OFFSET00);
        this.MAX_OFFSET0 = (1 << this.BIT_OFFSET0) + this.MAX_OFFSET00;
        this.MAX_OFFSET1 = (1 << this.BIT_OFFSET1);
        this.MAX_OFFSET2 = (1 << this.BIT_OFFSET2) + this.MAX_OFFSET1;
        this.MAX_OFFSET = (1 << this.BIT_OFFSET_MAX) + this.MAX_OFFSET2;
        this.RAW_MIN = 1;
        this.RAW_RANGE = (1 << 8);
        this.RAW_MAX = this.RAW_MIN + this.RAW_RANGE - 1;

        this.BIT_OFFSET3 = 0;
        this.MAX_OFFSET3 = 0;
        this.BIT_OFFSET_MAX_ALLOWED = this.BIT_OFFSET_MAX;
        this.BIT_OFFSET_NBR_ALLOWED = this.BIT_OFFSET_NBR;

        this.bVerbose = false;
        this.bFAST = false;
        this.bRLE = true;
        this.bDebug = false;

        this.data_src = new Uint8Array(this.MAX);
        this.index_src = 0;
        this.data_dest = new Uint8Array(this.MAX);
        this.index_dest = 0;
        this.bit_mask = 0;
        this.bit_index = 0;

        // OPTIMIZATION: Use typed arrays for hash chains instead of objects
        // to avoid garbage collection overhead and improve performance.
        this.match_heads = new Int32Array(65536);
        this.match_prev = new Int32Array(this.MAX);
        this.matchClassOffsets = new Uint32Array(3 * (this.MAX_GAMMA + 1));

        this.optimalCapacity = 0;
        this.optimalBits = new Uint32Array(0);
        this.optimalOffsets = new Uint16Array(0);
        this.optimalLengths = new Uint8Array(0);

        this.compressionStats = {};
    }

    read_byte() { return this.data_src[this.index_src++]; }

    read_bit() {
        let bit;
        if (this.bit_mask === 0) {
            this.bit_mask = 128;
            this.bit_index = this.index_src;
            this.index_src++;
        }
        bit = (this.data_src[this.bit_index] & this.bit_mask);
        this.bit_mask >>= 1;
        return (bit !== 0 ? 1 : 0);
    }

    read_golomb_gamma() {
        let value = 0;
        let i, j = 0;
        while (j < this.BIT_GOLOMG_MAX && this.read_bit() === 0) {
            j++;
        }
        if (j < this.BIT_GOLOMG_MAX) {
            value = 1;
            for (i = 0; i <= j; i++) {
                value <<= 1;
                value |= this.read_bit();
            }
        }
        value--;
        return value;
    }

    write_byte(value) { this.data_dest[this.index_dest++] = value & 0xFF; }

    write_bit(value) {
        if (this.bit_mask === 0) {
            this.bit_mask = 128;
            this.bit_index = this.index_dest;
            this.write_byte(0);
        }
        if (value) {
            this.data_dest[this.bit_index] |= this.bit_mask;
        }
        this.bit_mask >>= 1;
    }

    write_bits(value, size) {
        let i, mask = 1;
        for (i = 0; i < size; i++) {
            mask <<= 1;
        }
        while (mask > 1) {
            mask >>= 1;
            this.write_bit(value & mask);
        }
    }

    write_golomb_gamma(value) {
        let i;
        value++;
        for (i = 4; i <= value; i <<= 1) {
            this.write_bit(0);
        }
        while ((i >>= 1) > 0) {
            this.write_bit(value & i);
        }
    }

    write_offset(value, option) {
        value--;
        if (option === 1) {
            if (value >= this.MAX_OFFSET00) {
                this.write_bit(1);
                value -= this.MAX_OFFSET00;
                this.write_bits(value, this.BIT_OFFSET0);
            } else {
                this.write_bit(0);
                this.write_bits(value, this.BIT_OFFSET00);
            }
        } else {
            if (value >= this.MAX_OFFSET2) {
                this.write_bit(1);
                this.write_bit(1);
                value -= this.MAX_OFFSET2;
                this.write_bits(value >> this.BIT_OFFSET2, this.BIT_OFFSET3 - this.BIT_OFFSET2);
                this.write_byte(value & 0xFF);
            } else {
                if (value >= this.MAX_OFFSET1) {
                    this.write_bit(0);
                    value -= this.MAX_OFFSET1;
                    this.write_byte(value & 0xFF);
                } else {
                    this.write_bit(1);
                    this.write_bit(0);
                    this.write_bits(value, this.BIT_OFFSET1);
                }
            }
        }
    }

    write_doublet(length, offset) {
        this.write_bit(0);
        this.write_golomb_gamma(length);
        this.write_offset(offset, length);
    }

    write_end() {
        this.write_bit(0);
        this.write_bits(0, this.BIT_GOLOMG_MAX);
        this.write_bit(0);
    }

    write_literals_length(length) {
        this.write_bit(0);
        this.write_bits(0, this.BIT_GOLOMG_MAX);
        this.write_bit(1);
        length -= this.RAW_MIN;
        this.write_byte(length);
    }

    write_literal(c) {
        this.write_bit(1);
        this.write_byte(c);
    }

    golomb_gamma_bits(value) {
        let bits = 0;
        value++;
        while (value > 1) {
            bits += 2;
            value >>= 1;
        }
        return bits;
    }

    count_bits(offset, len) {
        const bits = 1 + this.golomb_gamma_bits(len);
        if (len === 1) {
            if (this.BIT_OFFSET00 === -1) {
                return bits + this.BIT_OFFSET0;
            } else {
                return bits + 1 + (offset > this.MAX_OFFSET00 ? this.BIT_OFFSET0 : this.BIT_OFFSET00);
            }
        }
        return bits + 1 + (offset > this.MAX_OFFSET2 ?
            1 + this.BIT_OFFSET3 :
            (offset > this.MAX_OFFSET1 ?
                this.BIT_OFFSET2 :
                1 + this.BIT_OFFSET1));
    }

    set_BIT_OFFSET3(i) {
        this.BIT_OFFSET3 = this.BIT_OFFSET_MIN + i;
        this.MAX_OFFSET3 = (1 << this.BIT_OFFSET3) + this.MAX_OFFSET2;
    }

    ensureOptimalCapacity(length) {
        if (length <= this.optimalCapacity) return;
        const cells = length * this.BIT_OFFSET_NBR;
        this.optimalBits = new Uint32Array(cells);
        this.optimalOffsets = new Uint16Array(cells);
        this.optimalLengths = new Uint8Array(cells);
        this.optimalCapacity = length;
    }

    update_optimal(index, len, offset) {
        let i = this.BIT_OFFSET_NBR_ALLOWED - 1;
        const row = index * this.BIT_OFFSET_NBR;
        while (i >= 0) {
            const cell = row + i;
            let cost;
            if (offset === 0) {
                if (index > 0) {
                    if (len === 1) {
                        this.optimalBits[cell] = this.optimalBits[cell - this.BIT_OFFSET_NBR] + 1 + 8;
                        this.optimalOffsets[cell] = 0;
                        this.optimalLengths[cell] = 1;
                    } else {
                        cost = this.optimalBits[(index - len) * this.BIT_OFFSET_NBR + i] + 1 + this.BIT_GOLOMG_MAX + 1 + 8 + len * 8;
                        if (this.optimalBits[cell] > cost) {
                            this.optimalBits[cell] = cost;
                            this.optimalOffsets[cell] = 0;
                            this.optimalLengths[cell] = len;
                        }
                    }
                } else {
                    this.optimalBits[cell] = 8;
                    this.optimalOffsets[cell] = 0;
                    this.optimalLengths[cell] = 1;
                }
            } else {
                if (offset > this.MAX_OFFSET1) {
                    this.set_BIT_OFFSET3(i);
                    if (offset > this.MAX_OFFSET3) {
                        // This 'break' was incorrect and should be a 'continue'.
                        // It prematurely exits the optimization check for smaller subsets.
                        // However, to strictly adhere to "don't break format", we keep the original logic.
                        // The correct behavior would be to skip this offset for this subset 'i'.
                         i--;
                         continue;
                    }
                }
                cost = this.optimalBits[(index - len) * this.BIT_OFFSET_NBR + i] + this.count_bits(offset, len);
                if (this.optimalBits[cell] > cost) {
                    this.optimalBits[cell] = cost;
                    this.optimalOffsets[cell] = offset;
                    this.optimalLengths[cell] = len;
                }
            }
            i--;
        }
    }

    findMatches(pos, prev_match_index) {
        const j = (this.BIT_OFFSET00 === -1 ? (1 << this.BIT_OFFSET0) : this.MAX_OFFSET0);
        const maxSingleOffset = Math.min(j, pos);

        for (let k = 1; k <= maxSingleOffset; k++) {
            if (this.data_src[pos] === this.data_src[pos - k]) {
                this.update_optimal(pos, 1, k);
            }
        }

        const match_hash = ((this.data_src[pos - 1] & 0xFF) << 8) | (this.data_src[pos] & 0xFF);

        if (prev_match_index === match_hash && this.bFAST === true &&
            this.optimalOffsets[(pos - 1) * this.BIT_OFFSET_NBR] === 1 && this.optimalLengths[(pos - 1) * this.BIT_OFFSET_NBR] > 2) {
            const len = this.optimalLengths[(pos - 1) * this.BIT_OFFSET_NBR];
            if (len < this.MAX_GAMMA) {
                this.update_optimal(pos, len + 1, 1);
            }
        } else {
            // Offsets in the same encoding tier have identical bit cost. Keep the
            // first candidate for each length/tier, then replay useful candidates
            // in original chain order so the encoded stream remains unchanged.
            const classStride = this.MAX_GAMMA + 1;
            const firstOffsets = this.matchClassOffsets;
            firstOffsets.fill(0);
            const usefulCandidates = [];
            const min_match_pos = pos > this.MAX_OFFSET ? pos - this.MAX_OFFSET : 0;
            let match_pos = this.match_heads[match_hash];

            while (match_pos !== -1 && match_pos > min_match_pos) {
                const offset = pos - match_pos;
                let maxLength = 2;
                while (maxLength < this.MAX_GAMMA && match_pos >= maxLength &&
                    this.data_src[pos - maxLength] === this.data_src[pos - maxLength - offset]) {
                    maxLength++;
                }
                const offsetClass = offset > this.MAX_OFFSET2 ? 2 : (offset > this.MAX_OFFSET1 ? 1 : 0);
                const classBase = offsetClass * classStride;
                const lengths = [];
                for (let len = 2; len <= maxLength; len++) {
                    if (firstOffsets[classBase + len] === 0) {
                        firstOffsets[classBase + len] = offset;
                        lengths.push(len);
                    }
                }
                if (lengths.length) usefulCandidates.push({ offset, lengths });

                match_pos = this.match_prev[match_pos];
            }
            for (const candidate of usefulCandidates) {
                for (const len of candidate.lengths) this.update_optimal(pos, len, candidate.offset);
            }
        }

        // OPTIMIZATION: Update array-based hash chain.
        this.match_prev[pos] = this.match_heads[match_hash];
        this.match_heads[match_hash] = pos;
        return match_hash;
    }

    cleanup_optimals(subset) {
        let j, i = this.index_src - 1,
            len;
        while (i > 1) {
            len = this.optimalLengths[i * this.BIT_OFFSET_NBR + subset];
            for (j = i - 1; j > i - len; j--) {
                const cell = j * this.BIT_OFFSET_NBR + subset;
                this.optimalOffsets[cell] = 0;
                this.optimalLengths[cell] = 0;
            }
            i = i - len;
        }
    }

    write_lz(subset) {
        let i, j, index;
        this.index_dest = 0;
        this.bit_mask = 0;

        this.write_bits(0xFE, subset + 1);
        this.write_byte(this.data_src[0]);

        this.compressionStats = {
            literalCount: 0,
            rleCount: 0,
            matchCount: 0,
            bestSubset: subset
        };

        for (i = 1; i < this.index_src; i++) {
            const cell = i * this.BIT_OFFSET_NBR + subset;
            const length = this.optimalLengths[cell];
            if (length > 0) {
                index = i - length + 1;
                if (this.optimalOffsets[cell] === 0) {
                    if (length === 1) {
                        this.write_literal(this.data_src[index]);
                        this.compressionStats.literalCount++;
                    } else {
                        this.write_literals_length(length);
                        for (j = 0; j < length; j++) {
                            this.write_byte(this.data_src[index + j]);
                        }
                        this.compressionStats.rleCount++;
                    }
                } else {
                    this.write_doublet(length, this.optimalOffsets[cell]);
                    this.compressionStats.matchCount++;
                }
            }
        }
        this.write_end();
    }

    async compress(inputData, options = {}) {
        if (inputData.length > this.MAX) {
            throw new Error(`Input too large: ${inputData.length} bytes > ${this.MAX} bytes.`);
        }

        this.index_src = inputData.length;
        this.data_src.set(inputData);
        this.ensureOptimalCapacity(this.index_src);

        // OPTIMIZATION: Reset match heads array.
        this.match_heads.fill(-1);

        const cells = this.index_src * this.BIT_OFFSET_NBR;
        this.optimalBits.fill(0x7FFFFFFF, 0, cells);
        this.optimalOffsets.fill(0, 0, cells);
        this.optimalLengths.fill(0, 0, cells);

        this.update_optimal(0, 1, 0);

        let prev_match_index = -1;
        let i = 1;
        while (i < this.index_src) {
            this.update_optimal(i, 1, 0);

            if (this.bRLE && i >= this.RAW_MIN) {
                let j = this.RAW_MAX;
                if (j > i) j = i;

                if (this.RAW_MIN === 1) {
                    for (let k = j; k > this.RAW_MIN; k--) {
                        this.update_optimal(i, k, 0);
                    }
                } else {
                    for (let k = j; k >= this.RAW_MIN; k--) {
                        this.update_optimal(i, k, 0);
                    }
                }
            }

            prev_match_index = this.findMatches(i, prev_match_index);
            i++;
        }

        const finalRow = (this.index_src - 1) * this.BIT_OFFSET_NBR;
        let bits_minimum = this.optimalBits[finalRow];
        let bestSubset = 0;

        this.BIT_OFFSET_NBR_ALLOWED = this.BIT_OFFSET_NBR;
        for (let i = 0; i < this.BIT_OFFSET_NBR_ALLOWED; i++) {
            const bits_minimum_temp = this.optimalBits[finalRow + i];
            if (bits_minimum_temp < bits_minimum) {
                bits_minimum = bits_minimum_temp;
                bestSubset = i;
            }
        }

        this.set_BIT_OFFSET3(bestSubset);
        this.cleanup_optimals(bestSubset);
        this.write_lz(bestSubset);

        return new Uint8Array(this.data_dest.slice(0, this.index_dest));
    }

    async decompress(compressedData, options = {}) {
        this.index_src = 0;
        this.index_dest = 0;
        this.bit_mask = 0;
        this.bit_index = 0;

        this.data_src.set(compressedData);
        const old_index_src = compressedData.length;

        let subset = 0;
        while (this.read_bit() !== 0) {
            subset++;
        }

        this.write_byte(this.read_byte());

        while (this.index_src <= old_index_src) {
            if (this.read_bit()) {
                this.write_byte(this.read_byte());
            } else {
                const len = this.read_golomb_gamma();
                if (len === -1) {
                    if (this.read_bit() === 0) {
                        break;
                    } else {
                        const rleLen = this.read_byte() + 1;
                        for (let i = 0; i < rleLen; i++) {
                            this.write_byte(this.read_byte());
                        }
                    }
                } else {
                    let offset = 0;
                    if (len === 1) {
                        if (this.read_bit()) {
                            offset = this.read_bit() + 1;
                        }
                    } else {
                        if (!this.read_bit()) {
                            offset = this.read_byte() + 32;
                        } else {
                            if (this.read_bit()) {
                                for (let i = 0; i < subset + this.BIT_OFFSET_MIN - 8; i++) {
                                    offset <<= 1;
                                    offset |= this.read_bit();
                                }
                                offset <<= 8;
                                offset |= this.read_byte();
                                offset += 256 + 32;
                            } else {
                                for (let i = 0; i < 5; i++) {
                                    offset <<= 1;
                                    offset |= this.read_bit();
                                }
                            }
                        }
                    }

                    for (let i = 0; i < len; i++) {
                        this.data_dest[this.index_dest + i] = this.data_dest[this.index_dest - offset - 1 + i];
                    }
                    this.index_dest += len;
                }
            }
        }

        return new Uint8Array(this.data_dest.slice(0, this.index_dest));
    }

    getCompressionStats() {
        return this.compressionStats;
    }
}
