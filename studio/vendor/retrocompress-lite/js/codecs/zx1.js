/*
 * ZX1 codec derived from the reference implementation by Einar Saukas.
 * Reference license: 3-clause BSD, Copyright (c) 2021 Einar Saukas.
 */

const INITIAL_OFFSET = 1;
const MAX_OFFSET_ZX1 = 32512;

const eliasBits = (value) => {
    let bits = 1;
    while ((value >>= 1) !== 0) bits += 2;
    return bits;
};

const makeBlock = (bits, index, offset, chain) => ({ bits, index, offset, chain });

function optimize(input, offsetLimit) {
    const maxInitialOffset = Math.min(Math.max(input.length - 1, INITIAL_OFFSET), offsetLimit);
    const lastLiteral = new Array(maxInitialOffset + 1).fill(null);
    const lastMatch = new Array(maxInitialOffset + 1).fill(null);
    const optimal = new Array(input.length).fill(null);
    const matchLength = new Int32Array(maxInitialOffset + 1);
    const bestLength = new Int32Array(input.length + 1);
    if (input.length > 2) bestLength[2] = 2;

    lastMatch[INITIAL_OFFSET] = makeBlock(-1, -1, INITIAL_OFFSET, null);
    for (let index = 0; index < input.length; index += 1) {
        let bestLengthSize = 2;
        const maxOffset = Math.min(Math.max(index, INITIAL_OFFSET), offsetLimit);
        for (let offset = 1; offset <= maxOffset; offset += 1) {
            if (index !== 0 && index >= offset && input[index] === input[index - offset]) {
                if (lastLiteral[offset]) {
                    const length = index - lastLiteral[offset].index;
                    const bits = lastLiteral[offset].bits + 1 + eliasBits(length);
                    lastMatch[offset] = makeBlock(bits, index, offset, lastLiteral[offset]);
                    if (!optimal[index] || optimal[index].bits > bits) optimal[index] = lastMatch[offset];
                }
                matchLength[offset] += 1;
                if (matchLength[offset] > 1) {
                    if (bestLengthSize < matchLength[offset]) {
                        let bits = optimal[index - bestLength[bestLengthSize]].bits + eliasBits(bestLength[bestLengthSize] - 1);
                        do {
                            bestLengthSize += 1;
                            const candidate = optimal[index - bestLengthSize].bits + eliasBits(bestLengthSize - 1);
                            if (candidate <= bits) {
                                bestLength[bestLengthSize] = bestLengthSize;
                                bits = candidate;
                            } else {
                                bestLength[bestLengthSize] = bestLength[bestLengthSize - 1];
                            }
                        } while (bestLengthSize < matchLength[offset]);
                    }
                    const length = bestLength[matchLength[offset]];
                    const bits = optimal[index - length].bits + 1 + (offset > 128 ? 16 : 8) + eliasBits(length - 1);
                    if (!lastMatch[offset] || lastMatch[offset].index !== index || lastMatch[offset].bits > bits) {
                        lastMatch[offset] = makeBlock(bits, index, offset, optimal[index - length]);
                        if (!optimal[index] || optimal[index].bits > bits) optimal[index] = lastMatch[offset];
                    }
                }
            } else {
                matchLength[offset] = 0;
                if (lastMatch[offset]) {
                    const length = index - lastMatch[offset].index;
                    const bits = lastMatch[offset].bits + 1 + eliasBits(length) + length * 8;
                    lastLiteral[offset] = makeBlock(bits, index, 0, lastMatch[offset]);
                    if (!optimal[index] || optimal[index].bits > bits) optimal[index] = lastLiteral[offset];
                }
            }
        }
    }
    return optimal[input.length - 1];
}

function encode(optimal, input) {
    const chain = [];
    for (let block = optimal; block; block = block.chain) chain.push(block);
    chain.reverse();

    const output = [];
    let bitMask = 0;
    let bitIndex = 0;
    let inputIndex = 0;
    let lastOffset = INITIAL_OFFSET;
    let first = true;

    const writeByte = (value) => output.push(value & 0xff);
    const writeBit = (value) => {
        if (!bitMask) {
            bitMask = 0x80;
            bitIndex = output.length;
            writeByte(0);
        }
        if (value) output[bitIndex] |= bitMask;
        bitMask >>= 1;
    };
    const writeElias = (value) => {
        let limit = 2;
        while (limit <= value) limit <<= 1;
        let mask = limit >> 1;
        while ((mask >>= 1) !== 0) {
            writeBit(1);
            writeBit(value & mask);
        }
        writeBit(0);
    };

    for (let blockIndex = 1; blockIndex < chain.length; blockIndex += 1) {
        const previous = chain[blockIndex - 1];
        const block = chain[blockIndex];
        const length = block.index - previous.index;
        if (!block.offset) {
            if (first) first = false;
            else writeBit(0);
            writeElias(length);
            for (let index = 0; index < length; index += 1) writeByte(input[inputIndex++]);
        } else if (block.offset === lastOffset) {
            writeBit(0);
            writeElias(length);
            inputIndex += length;
        } else {
            writeBit(1);
            if (block.offset > 128) {
                writeByte(255 - ((block.offset - 1) & 254));
                writeByte(252 - Math.floor((block.offset - 1) / 256) * 2 + (block.offset & 1));
            } else {
                writeByte(256 - block.offset * 2);
            }
            writeElias(length - 1);
            inputIndex += length;
            lastOffset = block.offset;
        }
    }
    writeBit(1);
    writeByte(255);
    writeByte(255);
    return Uint8Array.from(output);
}

export class ZX1Codec {
    async compress(data, options = {}) {
        const input = data instanceof Uint8Array ? data : new Uint8Array(data);
        if (!input.length) return new Uint8Array();
        const quick = Boolean(options.quick);
        return encode(optimize(input, quick ? 2176 : MAX_OFFSET_ZX1), input);
    }

    async decompress(data) {
        const input = data instanceof Uint8Array ? data : new Uint8Array(data);
        if (!input.length) return new Uint8Array();
        const output = [];
        let inputIndex = 0;
        let bitMask = 0;
        let bitValue = 0;
        let lastOffset = INITIAL_OFFSET;

        const readByte = () => {
            if (inputIndex >= input.length) throw new Error("Truncated ZX1 stream");
            return input[inputIndex++];
        };
        const readBit = () => {
            bitMask >>= 1;
            if (!bitMask) {
                bitMask = 0x80;
                bitValue = readByte();
            }
            return (bitValue & bitMask) !== 0 ? 1 : 0;
        };
        const readElias = () => {
            let value = 1;
            while (readBit()) value = (value << 1) | readBit();
            return value;
        };
        const copy = (offset, length) => {
            if (offset < 1 || offset > output.length) throw new Error("Invalid ZX1 offset");
            while (length-- > 0) output.push(output[output.length - offset]);
        };

        for (;;) {
            let length = readElias();
            while (length-- > 0) output.push(readByte());
            if (!readBit()) {
                copy(lastOffset, readElias());
                if (!readBit()) continue;
            }
            for (;;) {
                const low = readByte();
                if (low & 1) {
                    const high = readByte();
                    lastOffset = 32512 - (high & 254) * 128 - (low & 254) - (high & 1);
                } else {
                    lastOffset = 128 - low / 2;
                }
                if (lastOffset <= 0) {
                    if (inputIndex !== input.length) throw new Error("Data follows ZX1 end marker");
                    return Uint8Array.from(output);
                }
                copy(lastOffset, readElias() + 1);
                if (!readBit()) break;
            }
        }
    }
}
