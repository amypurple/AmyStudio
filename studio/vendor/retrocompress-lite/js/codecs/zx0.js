/**
 * ZX0 Compression Codec
 * Created by Einar Saukas in 2021
 * Evolution of ZX7 with improved compression ratios
 * State-of-the-art compression for 8-bit systems
 * Features backwards compression mode and other optimizations
 */

export class ZX0Codec {
    constructor() {
        this.MAX_OFFSET_ZX0 = 32640;
        this.MAX_OFFSET_ZX7 = 2176;
        this.INITIAL_OFFSET = 1;
    }

    async compress(data, options = {}) {
        if (data.length === 0) return new Uint8Array([]);

        const skip = options.skip || 0;
        const backwardsMode = options.backwards || false;
        const invertMode = !options.classic && !backwardsMode;
        const quickMode = options.quick || false;
        const offsetLimit = quickMode ? this.MAX_OFFSET_ZX7 : this.MAX_OFFSET_ZX0;

        let input = new Uint8Array(data);
        if (backwardsMode) input = this.reverseArray(input);

        const optimal = this.optimize(input, skip, offsetLimit);
        if (!optimal) throw new Error('Optimization failed');

        let result = this.compressOptimal(optimal, input, skip, backwardsMode, invertMode);
        if (backwardsMode) result = this.reverseArray(result);

        return result;
    }

    async decompress(compressedData, options = {}) {
        if (compressedData.length === 0) return new Uint8Array([]);

        const backwards = options.backwards || false;
        const inverted = !options.classic && !backwards;
        let input = new Uint8Array(compressedData);
        if (backwards) input = this.reverseArray(input);

        const output = [];
        let index = 0, bitMask = 0, bitValue = 0, lastOffset = this.INITIAL_OFFSET;
        let backtrack = false, lastByte = 0;

        const readByte = () => {
            lastByte = input[index++] & 0xff;
            return lastByte;
        };
        const readBit = () => {
            if (backtrack) {
                backtrack = false;
                return input[index - 1] & 0x01;
            }
            bitMask >>= 1;
            if (bitMask === 0) {
                bitMask = 128;
                bitValue = readByte();
            }
            return (bitValue & bitMask) !== 0 ? 1 : 0;
        };
        const readInterlacedEliasGamma = (msb) => {
            let value = 1;
            while (readBit() === (backwards ? 1 : 0)) {
                value = (value << 1) | (readBit() ^ (msb && inverted ? 1 : 0));
            }
            return value;
        };

        let state = 'COPY_LITERALS';
        while (state !== null) {
            switch (state) {
                case 'COPY_LITERALS': {
                    const length = readInterlacedEliasGamma(false);
                    for (let i = 0; i < length; i++) {
                        output.push(readByte());
                    }
                    state = readBit() === 0 ? 'COPY_FROM_LAST_OFFSET' : 'COPY_FROM_NEW_OFFSET';
                    break;
                }
                case 'COPY_FROM_LAST_OFFSET': {
                    const length = readInterlacedEliasGamma(false);
                    for (let i = 0; i < length; i++) {
                        output.push(output[output.length - lastOffset]);
                    }
                    state = readBit() === 0 ? 'COPY_LITERALS' : 'COPY_FROM_NEW_OFFSET';
                    break;
                }
                case 'COPY_FROM_NEW_OFFSET': {
                    const msb = readInterlacedEliasGamma(true);
                    if (msb === 256) {
                        state = null;
                        break;
                    }
                    const lsb = readByte() >> 1;
                    lastOffset = backwards ? msb * 128 + lsb - 127 : msb * 128 - lsb;
                    backtrack = true;
                    const length = readInterlacedEliasGamma(false) + 1;
                    for (let i = 0; i < length; i++) {
                        output.push(output[output.length - lastOffset]);
                    }
                    state = readBit() === 0 ? 'COPY_LITERALS' : 'COPY_FROM_NEW_OFFSET';
                    break;
                }
            }
        }

        let result = new Uint8Array(output);
        if (backwards) result = this.reverseArray(result);
        return result;
    }

    optimize(input, skip, offsetLimit) {
        const arraySize = Math.min(Math.max(input.length - 1, this.INITIAL_OFFSET), offsetLimit) + 1;
        const lastLiteral = new Array(arraySize).fill(null);
        const lastMatch = new Array(arraySize).fill(null);
        const optimal = new Array(input.length).fill(null);
        const matchLength = new Array(arraySize).fill(0);
        const bestLength = new Array(input.length).fill(0);

        if (bestLength.length > 2) bestLength[2] = 2;
        lastMatch[this.INITIAL_OFFSET] = this.createBlock(-1, skip - 1, this.INITIAL_OFFSET, null);

        for (let index = skip; index < input.length; index++) {
            const maxOffset = Math.min(Math.max(index, this.INITIAL_OFFSET), offsetLimit);
            optimal[index] = this.processOptimalBlock(1, maxOffset, index, skip, input,
                lastLiteral, lastMatch, matchLength, bestLength, optimal);
        }
        return optimal[input.length - 1];
    }

    processOptimalBlock(initialOffset, finalOffset, index, skip, input, lastLiteral, lastMatch, matchLength, bestLength, optimal) {
        let bestLengthSize = 2;
        let optimalBlock = null;

        for (let offset = initialOffset; offset <= finalOffset; offset++) {
            if (index !== skip && index >= offset && input[index] === input[index - offset]) {
                if (lastLiteral[offset] !== null) {
                    const length = index - lastLiteral[offset].index;
                    const bits = lastLiteral[offset].bits + 1 + this.eliasGammaBits(length);
                    lastMatch[offset] = this.createBlock(bits, index, offset, lastLiteral[offset]);
                    if (optimalBlock === null || optimalBlock.bits > bits) {
                        optimalBlock = lastMatch[offset];
                    }
                }

                if (++matchLength[offset] > 1) {
                    if (bestLengthSize < matchLength[offset]) {
                        let bits = optimal[index - bestLength[bestLengthSize]].bits +
                            this.eliasGammaBits(bestLength[bestLengthSize] - 1);
                        do {
                            bestLengthSize++;
                            const bits2 = optimal[index - bestLengthSize].bits +
                                this.eliasGammaBits(bestLengthSize - 1);
                            if (bits2 <= bits) {
                                bestLength[bestLengthSize] = bestLengthSize;
                                bits = bits2;
                            } else {
                                bestLength[bestLengthSize] = bestLength[bestLengthSize - 1];
                            }
                        } while (bestLengthSize < matchLength[offset]);
                    }

                    const length = bestLength[matchLength[offset]];
                    if (optimal[index - length]) {
                        const bits = optimal[index - length].bits + 8 +
                            this.eliasGammaBits(Math.floor((offset - 1) / 128) + 1) +
                            this.eliasGammaBits(length - 1);

                        if (lastMatch[offset] === null || lastMatch[offset].index !== index ||
                            lastMatch[offset].bits > bits) {
                            lastMatch[offset] = this.createBlock(bits, index, offset, optimal[index - length]);
                            if (optimalBlock === null || optimalBlock.bits > bits) {
                                optimalBlock = lastMatch[offset];
                            }
                        }
                    }
                }
            } else {
                matchLength[offset] = 0;
                if (lastMatch[offset] !== null) {
                    const length = index - lastMatch[offset].index;
                    const bits = lastMatch[offset].bits + 1 + this.eliasGammaBits(length) + length * 8;
                    lastLiteral[offset] = this.createBlock(bits, index, 0, lastMatch[offset]);
                    if (optimalBlock === null || optimalBlock.bits > bits) {
                        optimalBlock = lastLiteral[offset];
                    }
                }
            }
        }
        return optimalBlock;
    }

    compressOptimal(optimal, input, skip, backwardsMode, invertMode) {
        const output = [];
        let bitMask = 0, bitIndex = 0, inputIndex = skip;
        let lastOffset = this.INITIAL_OFFSET;
        let backtrack = true;

        // Reverse the chain
        let prev = null;
        while (optimal !== null) {
            const next = optimal.chain;
            optimal.chain = prev;
            prev = optimal;
            optimal = next;
        }

        const writeByte = (value) => output.push(value & 0xff);
        const writeBit = (value) => {
            if (backtrack) {
                if (value > 0) output[output.length - 1] |= 1;
                backtrack = false;
            } else {
                if (bitMask === 0) {
                    bitMask = 128;
                    bitIndex = output.length;
                    writeByte(0);
                }
                if (value > 0) output[bitIndex] |= bitMask;
                bitMask >>= 1;
            }
        };
        const writeInterlacedEliasGamma = (value, backwardsMode, invertMode) => {
            let i = 2;
            while (i <= value) i <<= 1;
            i >>= 1;
            while ((i >>= 1) > 0) {
                writeBit(backwardsMode ? 1 : 0);
                writeBit(invertMode === ((value & i) === 0) ? 1 : 0);
            }
            writeBit(!backwardsMode ? 1 : 0);
        };

        for (optimal = prev.chain; optimal !== null; prev = optimal, optimal = optimal.chain) {
            const length = optimal.index - prev.index;

            if (optimal.offset === 0) {
                writeBit(0);
                writeInterlacedEliasGamma(length, backwardsMode, false);
                for (let i = 0; i < length; i++) {
                    writeByte(input[inputIndex++]);
                }
            } else if (optimal.offset === lastOffset) {
                writeBit(0);
                writeInterlacedEliasGamma(length, backwardsMode, false);
                inputIndex += length;
            } else {
                writeBit(1);
                writeInterlacedEliasGamma(Math.floor((optimal.offset - 1) / 128) + 1, backwardsMode, invertMode);
                writeByte(backwardsMode ? ((optimal.offset - 1) % 128) << 1 :
                    (127 - (optimal.offset - 1) % 128) << 1);
                backtrack = true;
                writeInterlacedEliasGamma(length - 1, backwardsMode, false);
                inputIndex += length;
                lastOffset = optimal.offset;
            }
        }

        writeBit(1);
        writeInterlacedEliasGamma(256, backwardsMode, invertMode);

        return new Uint8Array(output);
    }

    createBlock(bits, index, offset, chain) {
        return { bits, index, offset, chain };
    }

    reverseArray(arr) {
        return new Uint8Array(arr).reverse();
    }

    eliasGammaBits(value) {
        let bits = 1;
        while (value > 1) {
            bits += 2;
            value >>= 1;
        }
        return bits;
    }
}