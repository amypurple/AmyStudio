/**
 * ZX7 Compression Codec
 * Created by Einar Saukas in 2012
 * "Optimal" LZ77/LZSS compression for Z80 platforms
 * Achieves excellent compression ratios with reasonable decompression speed
 */

export class ZX7Codec {
    constructor() {
        this.MAX_LEN = 65536;
        this.BIT_OFFSET1 = 7;
        this.BIT_OFFSET2 = 11;
        this.MAX_OFFSET1 = 128;
        this.MAX_OFFSET2 = this.MAX_OFFSET1 + 2048;

        this.dataDest = new Uint8Array(512 * 1024);
        this.optimals = null;
        this.matches = new Array(65536);
        this.matchPool = [];
        this.matchPoolIndex = 0;
        this.indexDest = 0;
        this.bitMask = 0;
        this.bitIndex = 0;
    }

    _allocateMatch() {
        if (this.matchPoolIndex >= this.matchPool.length) {
            this.matchPool.push({ index: 0, next: null });
        }
        return this.matchPool[this.matchPoolIndex++];
    }

    _resetMatchPool() {
        this.matchPoolIndex = 0;
        for (let i = 0; i < 65536; i++) {
            this.matches[i] = { index: 0, next: null };
        }
    }

    _insertMatch(matchHead, index) {
        const newMatch = this._allocateMatch();
        newMatch.index = matchHead.index;
        newMatch.next = matchHead.next;
        matchHead.index = index;
        matchHead.next = newMatch;
    }

    _flushMatch(match) {
        match.next = null;
    }

    _writeByte(value) {
        this.dataDest[this.indexDest++] = value & 0xFF;
    }

    _writeBit(value) {
        if (this.bitMask === 0) {
            this.bitMask = 128;
            this.bitIndex = this.indexDest;
            this._writeByte(0);
        }
        if (value) {
            this.dataDest[this.bitIndex] |= this.bitMask;
        }
        this.bitMask >>= 1;
    }

    _writeBits(value, size) {
        let mask = 1;
        for (let i = 0; i < size; i++) {
            mask <<= 1;
        }
        while (mask > 1) {
            mask >>= 1;
            this._writeBit(value & mask);
        }
    }

    _writeEliasGamma(value) {
        let i;
        for (i = 2; i <= value; i <<= 1) {
            this._writeBit(0);
        }
        while ((i >>= 1) > 0) {
            this._writeBit(value & i);
        }
    }

    _writeOffset(offset) {
        offset--;
        if (offset >= this.MAX_OFFSET1) {
            offset -= this.MAX_OFFSET1;
            const high = Math.floor(offset / this.MAX_OFFSET1);
            const low = offset % this.MAX_OFFSET1;
            this._writeByte(low | 0x80);
            this._writeBits(high, 4);
        } else {
            this._writeByte(offset);
        }
    }

    _writeDoublet(length, offset) {
        this._writeBit(1);
        this._writeEliasGamma(length - 1);
        this._writeOffset(offset);
    }

    _writeEnd() {
        this._writeBit(1);
        this._writeBits(0, 16);
        this._writeBit(1);
    }

    _writeLiteral(c) {
        this._writeBit(0);
        this._writeByte(c);
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
        const bits = 1 + this._eliasGammaBits(len - 1);
        return bits + 1 + (offset > this.MAX_OFFSET1 ? this.BIT_OFFSET2 : this.BIT_OFFSET1);
    }

    async compress(data, options = {}) {
        if (data.length === 0) return new Uint8Array([]);

        const dataSrc = new Uint8Array(data);
        const indexSrc = data.length;

        this.optimals = new Array(indexSrc);
        for (let i = 0; i < indexSrc; i++) {
            this.optimals[i] = { bits: 0, offset: 0, len: 0 };
        }

        this._resetMatchPool();
        this.indexDest = 0;
        this.bitMask = 0;
        this.bitIndex = 0;

        this.optimals[0].bits = 8;
        this.optimals[0].offset = 0;
        this.optimals[0].len = 1;

        for (let i = 1; i < indexSrc; i++) {
            this.optimals[i].bits = this.optimals[i - 1].bits + 1 + 8;
            this.optimals[i].offset = 0;
            this.optimals[i].len = 1;

            let j = this.MAX_OFFSET2;
            if (j > i) j = i;

            for (let k = 1; k <= j; k++) {
                if (dataSrc[i] === dataSrc[i - k]) {
                    const tempBits = this.optimals[i - 1].bits + this._countBits(k, 1);
                    if (tempBits < this.optimals[i].bits) {
                        this.optimals[i].bits = tempBits;
                        this.optimals[i].len = 1;
                        this.optimals[i].offset = k;
                        break;
                    }
                }
            }

            const matchIndex = (dataSrc[i - 1] << 8) | dataSrc[i];
            let bestLen = 1;
            let match = this.matches[matchIndex];

            while (match.next !== null && bestLen < this.MAX_LEN) {
                const offset = i - match.index;
                if (offset > this.MAX_OFFSET2) {
                    this._flushMatch(match);
                    break;
                }

                let len;
                for (len = 2; len <= this.MAX_LEN; len++) {
                    if (len > bestLen) {
                        bestLen = len;
                        const tempBits = this.optimals[i - len].bits + this._countBits(offset, len);
                        if (this.optimals[i].bits > tempBits) {
                            this.optimals[i].bits = tempBits;
                            this.optimals[i].offset = offset;
                            this.optimals[i].len = len;
                        }
                    }
                    if (i < offset + len || dataSrc[i - len] !== dataSrc[i - len - offset]) {
                        break;
                    }
                }
                match = match.next;
            }

            this._insertMatch(this.matches[matchIndex], i);
        }

        let i = indexSrc - 1;
        while (i > 1) {
            const len = this.optimals[i].len;
            for (let j = i - 1; j > i - len; j--) {
                this.optimals[j].offset = 0;
                this.optimals[j].len = 0;
            }
            i = i - len;
        }

        this._writeByte(dataSrc[0]);
        for (let i = 1; i < indexSrc; i++) {
            if (this.optimals[i].len > 0) {
                const index = i - this.optimals[i].len + 1;
                if (this.optimals[i].offset === 0) {
                    this._writeLiteral(dataSrc[index]);
                } else {
                    this._writeDoublet(this.optimals[i].len, this.optimals[i].offset);
                }
            }
        }
        this._writeEnd();

        return new Uint8Array(this.dataDest.slice(0, this.indexDest));
    }

    async decompress(compressedData, options = {}) {
        if (compressedData.length === 0) return new Uint8Array([]);

        let inputIndex = 0;
        let regA = 128;
        let flagCarry = 0;
        const output = [];

        const readByte = () => {
            if (inputIndex >= compressedData.length) {
                throw new Error('Unexpected end of input');
            }
            return compressedData[inputIndex++];
        };

        const updateFlags = () => {
            flagCarry = ((regA & 0x100) === 0 ? 0 : 1);
            regA = regA & 0xFF;
            return (regA === 0);
        };

        const sla = () => {
            regA = regA << 1;
            return updateFlags();
        };

        const readBit = () => {
            const flagZero = sla();
            if (flagZero) {
                regA = readByte();
                sla();
                regA |= 1;
            }
            return flagCarry;
        };

        const readEliasGamma = () => {
            let counter = 0;
            let eliasGamma = 1;
            flagCarry = 0;

            while (flagCarry === 0) {
                readBit();
                counter++;
                if (counter === 17) break;
            }

            if (counter < 17) {
                for (let i = 1; i < counter; i++) {
                    readBit();
                    eliasGamma <<= 1;
                    if (flagCarry) eliasGamma |= 1;
                }
            } else {
                eliasGamma = 0;
            }

            return eliasGamma;
        };

        const readOffset = () => {
            let offsetHi = 0;
            const offsetLow = readByte();

            if (offsetLow > 127) {
                for (let i = 0; i < 4; i++) {
                    readBit();
                    offsetHi <<= 1;
                    if (flagCarry) offsetHi |= 1;
                }
                return (offsetHi << 7) + (offsetLow & 0x7F) + this.MAX_OFFSET1 + 1;
            } else {
                return offsetLow + 1;
            }
        };

        output.push(readByte());

        while (inputIndex < compressedData.length) {
            const tokenType = readBit();

            if (tokenType === 0) {
                output.push(readByte());
            } else {
                const matchLength = readEliasGamma();
                if (matchLength === 0) break;

                const length = matchLength + 1;
                const offset = readOffset();

                if (offset > output.length) {
                    throw new Error(`Invalid offset: ${offset} > ${output.length}`);
                }

                for (let i = 0; i < length; i++) {
                    const sourceIndex = output.length - offset;
                    output.push(output[sourceIndex]);
                }
            }
        }

        return new Uint8Array(output);
    }
}