/**
 * Pletter v0.5 Compression Codec
 * Created by XL2S Entertainment (Sander Zuidema) in 2008
 * Designed for fast decompression on Z80 processors
 * Popular for MSX, ZX Spectrum, and other 8-bit platforms
 */

export class PletterCodec {
    constructor() {
        this.MAX_LEN = 65536;
        this.maxlen = [128, 128 + 128, 512 + 128, 1024 + 128, 2048 + 128, 4096 + 128, 8192 + 128];
        this.varcost = new Array(65536);
        this.dataDest = new Uint8Array(512 * 1024);
        this.indexDest = 0;
        this.bitMask = 0;
        this.bitIndex = 0;
        this.eventPos = 0;
        this.dataPos = 0;
        this.pendingBits = 0;
        this.eventByte = 0;
        this.dsk2rom_tweak = false;

        this.inputDecompressData = null;
        this.inputDecompressIndex = 0;
        this.decompressBitIndex = 0;
        this.decompressBitForVarPosition = 7;

        this.initVarCost();
    }

    initVarCost() {
        let v = 1, b = 1, r = 1;
        while (r !== 65536) {
            for (let j = 0; j !== r; ++j) {
                if (v < this.varcost.length) {
                    this.varcost[v++] = b;
                } else {
                    break;
                }
            }
            b += 2;
            r *= 2;
        }
    }

    createMetadata(data) {
        const length = data.length;
        const last = new Array(65536).fill(-1);
        const prev = new Array(length + 1);
        const metadata = new Array(length + 1);

        for (let i = 0; i < length + 1; i++) {
            metadata[i] = {
                reeks: 0,
                cpos: new Array(7).fill(0),
                clen: new Array(7).fill(0)
            };
        }

        for (let i = 0; i !== length; ++i) {
            metadata[i].cpos[0] = metadata[i].clen[0] = 0;
            const index = data[i] + (i + 1 < length ? data[i + 1] * 256 : 0);
            prev[i] = last[index];
            last[index] = i;
        }

        let r = -1, t = 0;
        for (let i = length - 1; i !== -1; --i) {
            if (data[i] === r) {
                metadata[i].reeks = ++t;
            } else {
                r = data[i];
                metadata[i].reeks = t = 1;
            }
        }

        for (let bl = 0; bl !== 7; ++bl) {
            for (let i = 0; i < length; ++i) {
                let p = i;
                if (bl) {
                    metadata[i].clen[bl] = metadata[i].clen[bl - 1];
                    metadata[i].cpos[bl] = metadata[i].cpos[bl - 1];
                    p = i - metadata[i].cpos[bl];
                }

                while ((p = prev[p]) !== -1) {
                    if (i - p > this.maxlen[bl]) break;

                    let l = 0;
                    while (data[p + l] === data[i + l] && (i + l) < length) {
                        if (metadata[i + l].reeks > 1) {
                            let j = metadata[i + l].reeks;
                            if (j > metadata[p + l].reeks) j = metadata[p + l].reeks;
                            l += j;
                        } else {
                            ++l;
                        }
                    }

                    if (l > metadata[i].clen[bl]) {
                        metadata[i].clen[bl] = l;
                        metadata[i].cpos[bl] = i - p;
                    }
                }
            }
        }

        return { metadata, prev, last };
    }

    getLen(data, metadata, q) {
        const length = data.length;
        const p = new Array(length + 1);

        for (let i = 0; i <= length; i++) {
            p[i] = { cost: 0, mode: 0, mlen: 0 };
        }

        p[length].cost = 0;

        for (let i = length - 1; i !== -1; --i) {
            let kmode = 0, kl = 0;
            let kc = 9 + p[i + 1].cost;

            let j = metadata[i].clen[0];
            while (j > 1) {
                const cost_var = this.varcost[j - 1];
                let varcost_val = cost_var !== undefined ? cost_var : 1000000;
                const cc = 9 + varcost_val + p[i + j].cost;
                if (cc < kc) {
                    kc = cc; kmode = 1; kl = j;
                }
                --j;
            }

            j = metadata[i].clen[q];
            const ccc = q === 1 ? 9 : 9 + q;
            while (j > 1) {
                const cost_var = this.varcost[j - 1];
                let varcost_val = cost_var !== undefined ? cost_var : 1000000;
                const cc = ccc + varcost_val + p[i + j].cost;
                if (cc < kc) {
                    kc = cc; kmode = 2; kl = j;
                }
                --j;
            }

            p[i].cost = kc; p[i].mode = kmode; p[i].mlen = kl;
        }
        return { cost: p[0].cost, pakdata: p };
    }

    _writeByte(value) {
        this.dataDest[this.dataPos++] = value & 0xFF;
    }

    _addBit(bit) {
        if (this.pendingBits === 0) this._claimEvent();
        this.eventByte *= 2;
        ++this.pendingBits;
        if (bit) ++this.eventByte;
        if (this.pendingBits === 8) this._addEvent();
    }

    _add3(value) {
        this._addBit(value & 4);
        this._addBit(value & 2);
        this._addBit(value & 1);
    }

    _addVar(i) {
        let j = 32768;
        while (!(i & j)) j = Math.floor(j / 2);

        do {
            if (j === 1) {
                this._addBit(0);
                return;
            }
            j = Math.floor(j / 2);
            this._addBit(1);
            if (i & j) {
                this._addBit(1);
            } else {
                this._addBit(0);
            }
        } while (true);
    }

    _addData(value) {
        this._writeByte(value);
    }

    _addEvent() {
        this.dataDest[this.eventPos] = this.eventByte;
        this.eventByte = this.pendingBits = 0;
    }

    _claimEvent() {
        this.eventPos = this.dataPos;
        ++this.dataPos;
    }

    _done() {
        if (this.pendingBits !== 0) {
            while (this.pendingBits !== 8) {
                this.eventByte *= 2;
                ++this.pendingBits;
            }
            this._addEvent();
        }
        this.indexDest = this.dataPos;
    }

    save(data, metadata, pakdata, q) {
        const length = data.length;
        this.eventPos = this.dataPos = this.pendingBits = this.eventByte = 0;

        this._add3(q - 1);
        this._addData(data[0]);

        let i = 1;
        let j = 0;
        while (i < length) {
            switch (pakdata[i].mode) {
                case 0:
                    this._addBit(0);
                    this._addData(data[i]);
                    ++i;
                    break;
                case 1:
                    this._addBit(1);
                    this._addVar(pakdata[i].mlen - 1);
                    j = metadata[i].cpos[0] - 1;
                    if (j > 127) {
                        console.warn(`Pletter: cpos[0] (${j + 1}) > 128 for mode 1`);
                    }
                    this._addData(j);
                    i += pakdata[i].mlen;
                    break;
                case 2:
                    this._addBit(1);
                    this._addVar(pakdata[i].mlen - 1);
                    j = metadata[i].cpos[q] - 1;
                    if (j < 128) {
                        console.warn(`Pletter: cpos[q] (${j + 1}) < 128 for mode 2`);
                    }
                    j -= 128;
                    this._addData(128 | (j & 127));

                    switch (q) {
                        case 6: this._addBit(j & 4096);
                        case 5: this._addBit(j & 2048);
                        case 4: this._addBit(j & 1024);
                        case 3: this._addBit(j & 512);
                        case 2: this._addBit(j & 256);
                            this._addBit(j & 128);
                        case 1:
                            break;
                        default:
                            console.warn('Pletter: Invalid q value in save');
                            break;
                    }
                    i += pakdata[i].mlen;
                    break;
                default:
                    console.warn('Pletter: Unknown mode');
                    break;
            }
        }

        for (let i = 0; i !== 34; ++i) this._addBit(1);
        this._done();
    }

    async compress(data, options = {}) {
        if (data.length === 0) return new Uint8Array([]);

        if (data.length > this.MAX_LEN) {
            throw new Error(`Pletter: Input file size (${data.length} bytes) exceeds 64KB limit for this codec.`);
        }

        const { metadata } = this.createMetadata(data);

        let minlen = data.length * 1000;
        let minbl = 0;

        for (let i = 1; i !== 7; ++i) {
            const { cost, pakdata } = this.getLen(data, metadata, i);
            if (cost < minlen && i) {
                minlen = cost;
                minbl = i;
            }
        }

        if (minbl === 0 && data.length > 0) {
            minbl = 1;
        }

        const { pakdata: bestPakdata } = this.getLen(data, metadata, minbl);
        this.save(data, metadata, bestPakdata, minbl);

        return new Uint8Array(this.dataDest.slice(0, this.indexDest));
    }

    async decompress(compressedData, options = {}) {
        const dsk2rom = !!options.dsk2rom;

        let dataPosition = 0;
        let varPosition = 0;
        let bitForVarPosition = 7;

        const output = [];

        const getByte = () => {
            if (dataPosition >= compressedData.length) {
                throw new Error('Pletter decompression: Unexpected end of input');
            }
            return compressedData[dataPosition++];
        };

        const getBit = () => {
            if (bitForVarPosition === 7) {
                varPosition = dataPosition;
                dataPosition = varPosition + 1;
            }

            const bit = (compressedData[varPosition] >> bitForVarPosition) & 1;
            bitForVarPosition--;

            if (bitForVarPosition === -1) {
                bitForVarPosition = 7;
            }
            return bit;
        };

        const getInterlacedEliasGamma = () => {
            let value = 1;
            while (getBit()) {
                value = (value << 1) | getBit();
            }
            return value;
        };

        let qValue = 2;
        if (!dsk2rom) {
            qValue = (getBit() << 2 | getBit() << 1 | getBit()) + 1;
        }

        const firstByte = getByte();
        output.push(firstByte);
        dataPosition = dsk2rom ? 1 : 2;

        const END_MARKER_NORMAL = 262143;
        const END_MARKER_DSK2ROM = 131072;

        while (dataPosition < compressedData.length) {
            if (getBit()) {
                let length = getInterlacedEliasGamma() + 1;

                if (length === END_MARKER_NORMAL || (dsk2rom && length === END_MARKER_DSK2ROM)) {
                    break;
                }

                let offset = getByte();
                if (offset & 0x80) {
                    offset &= 0x7F;

                    switch (qValue) {
                        case 7: offset |= getBit() << 13;
                        case 6: offset |= getBit() << 12;
                        case 5: offset |= getBit() << 11;
                        case 4: offset |= getBit() << 10;
                        case 3: offset |= getBit() << 9;
                        case 2:
                            offset |= getBit() << 8;
                            offset |= getBit() << 7;
                        case 1:
                            break;
                        default:
                            throw new Error(`Invalid q_value: ${qValue}`);
                    }
                    offset += 128;
                }
                offset += 1;

                for (let i = 0; i < length; i++) {
                    const sourceIndex = output.length - offset;
                    if (sourceIndex < 0 || sourceIndex >= output.length) {
                        throw new Error(`Invalid offset ${offset} at position ${output.length}`);
                    }
                    output.push(output[sourceIndex]);
                }
            } else {
                output.push(getByte());
            }
        }

        return new Uint8Array(output);
    }

    isReady() { 
        return true; 
    }
}