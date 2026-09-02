/*
 * ZX2 codec derived from the reference implementation by Einar Saukas.
 * Reference license: 3-clause BSD, Copyright (c) 2021 Einar Saukas.
 */

const INITIAL_OFFSET = 1;
const MAX_OFFSET_ZX2 = 255;
const MIN_LENGTH = 2;
const MAX_OUTPUT_SIZE = 256 * 1024;

const eliasBits = (value) => {
    let bits = 1;
    while ((value >>= 1) !== 0) bits += 2;
    return bits;
};

const makeBlock = (bits, index, offset, length, chain) => ({ bits, index, offset, length, chain });

function optimize(input) {
    const maxInitialOffset = Math.min(Math.max(input.length - 1, INITIAL_OFFSET), MAX_OFFSET_ZX2);
    const lastLiteral = new Array(maxInitialOffset + 1).fill(null);
    const lastMatch = new Array(maxInitialOffset + 1).fill(null);
    const optimal = new Array(input.length).fill(null);
    const matchLength = new Int32Array(maxInitialOffset + 1);
    const bestLength = new Int32Array(input.length + 1);
    if (input.length > MIN_LENGTH) bestLength[MIN_LENGTH] = MIN_LENGTH;

    lastMatch[INITIAL_OFFSET] = makeBlock(-1, -1, INITIAL_OFFSET, 0, null);
    for (let index = 0; index < input.length; index += 1) {
        let bestLengthSize = MIN_LENGTH;
        const maxOffset = Math.min(Math.max(index, INITIAL_OFFSET), MAX_OFFSET_ZX2);
        for (let offset = INITIAL_OFFSET; offset <= maxOffset; offset += 1) {
            if (index !== 0 && index >= offset && input[index] === input[index - offset]) {
                if (lastLiteral[offset]) {
                    const length = index - lastLiteral[offset].index;
                    const bits = lastLiteral[offset].bits + 1 + eliasBits(length);
                    lastMatch[offset] = makeBlock(bits, index, offset, length, lastLiteral[offset]);
                    if (!optimal[index] || optimal[index].bits > bits ||
                        (optimal[index].bits === bits && optimal[index].length > 255)) {
                        optimal[index] = lastMatch[offset];
                    }
                }
                matchLength[offset] += 1;
                if (matchLength[offset] >= MIN_LENGTH) {
                    if (bestLengthSize < matchLength[offset]) {
                        let bits = optimal[index - bestLength[bestLengthSize]].bits +
                            eliasBits(bestLength[bestLengthSize] - MIN_LENGTH + 1);
                        do {
                            bestLengthSize += 1;
                            const candidate = optimal[index - bestLengthSize].bits +
                                eliasBits(bestLengthSize - MIN_LENGTH + 1);
                            if (candidate < bits || (candidate === bits && bestLengthSize < 256)) {
                                bestLength[bestLengthSize] = bestLengthSize;
                                bits = candidate;
                            } else {
                                bestLength[bestLengthSize] = bestLength[bestLengthSize - 1];
                            }
                        } while (bestLengthSize < matchLength[offset]);
                    }
                    const length = bestLength[matchLength[offset]];
                    const bits = optimal[index - length].bits + 9 + eliasBits(length - MIN_LENGTH + 1);
                    if (!lastMatch[offset] || lastMatch[offset].index !== index || lastMatch[offset].bits > bits ||
                        (lastMatch[offset].bits === bits && lastMatch[offset].length > 255)) {
                        lastMatch[offset] = makeBlock(bits, index, offset, length, optimal[index - length]);
                        if (!optimal[index] || optimal[index].bits > bits ||
                            (optimal[index].bits === bits && optimal[index].length > 255)) {
                            optimal[index] = lastMatch[offset];
                        }
                    }
                }
            } else {
                matchLength[offset] = 0;
                if (lastMatch[offset]) {
                    const length = index - lastMatch[offset].index;
                    const bits = lastMatch[offset].bits + 1 + eliasBits(length) + length * 8;
                    lastLiteral[offset] = makeBlock(bits, index, 0, length, lastMatch[offset]);
                    if (!optimal[index] || optimal[index].bits > bits ||
                        (optimal[index].bits === bits && optimal[index].length > 255)) {
                        optimal[index] = lastLiteral[offset];
                    }
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
        const block = chain[blockIndex];
        const length = block.length;
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
            writeByte(255 - block.offset);
            writeElias(length - MIN_LENGTH + 1);
            inputIndex += length;
            lastOffset = block.offset;
        }
    }
    writeBit(1);
    writeByte(255);
    return Uint8Array.from(output);
}

export class ZX2Codec {
    async compress(data) {
        const input = data instanceof Uint8Array ? data : new Uint8Array(data);
        if (!input.length) return new Uint8Array();
        return encode(optimize(input), input);
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
            if (inputIndex >= input.length) throw new Error("Truncated ZX2 stream");
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
            if (offset < 1 || offset > output.length) throw new Error("Invalid ZX2 offset");
            if (output.length + length > MAX_OUTPUT_SIZE) throw new Error("ZX2 output exceeds 256 KiB");
            while (length-- > 0) output.push(output[output.length - offset]);
        };

        for (;;) {
            let length = readElias();
            if (output.length + length > MAX_OUTPUT_SIZE) throw new Error("ZX2 output exceeds 256 KiB");
            while (length-- > 0) output.push(readByte());
            if (!readBit()) {
                copy(lastOffset, readElias());
                if (!readBit()) continue;
            }
            const encodedOffset = readByte();
            if (encodedOffset === 255) {
                if (inputIndex !== input.length) throw new Error("Data follows ZX2 end marker");
                return Uint8Array.from(output);
            }
            lastOffset = 255 - encodedOffset;
            copy(lastOffset, readElias() + MIN_LENGTH - 1);
            if (!readBit()) continue;
            // Consecutive new-offset blocks are legal; the next loop iteration starts at the offset byte.
            for (;;) {
                const nextOffset = readByte();
                if (nextOffset === 255) {
                    if (inputIndex !== input.length) throw new Error("Data follows ZX2 end marker");
                    return Uint8Array.from(output);
                }
                lastOffset = 255 - nextOffset;
                copy(lastOffset, readElias() + MIN_LENGTH - 1);
                if (!readBit()) break;
            }
        }
    }
}
