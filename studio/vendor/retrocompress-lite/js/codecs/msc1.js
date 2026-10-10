/**
 * MSC1 four-byte sequence codec.
 *
 * Stream format:
 * - 0x00: end marker
 * - 0x01..0x7f: literal length followed by that many bytes
 * - 0x80..0xff: repeat a four-byte sequence from the compressed stream
 *   Bits 2..6 store 1..31 repeats (zero means 32); bits 0..1 and the
 *   following byte form a 10-bit backward offset measured after the command.
 */
export class MSC1Codec {
    compress(inputData) {
        const input = inputData instanceof Uint8Array
            ? inputData
            : new Uint8Array(inputData || []);
        if (input.length === 0) return new Uint8Array([0]);

        const output = [];
        const literalLocations = new Map();
        let literalStart = 0;
        let cursor = 0;

        const keyAt = (position) => (
            `${input[position]},${input[position + 1]},${input[position + 2]},${input[position + 3]}`
        );

        const registerLiteralChunk = (inputStart, payloadStart, length) => {
            for (let offset = 0; offset + 4 <= length; offset++) {
                const key = keyAt(inputStart + offset);
                const locations = literalLocations.get(key) || [];
                locations.push(payloadStart + offset);
                while (locations.length > 64) locations.shift();
                literalLocations.set(key, locations);
            }
        };

        const flushLiterals = (end) => {
            let start = literalStart;
            while (start < end) {
                const length = Math.min(127, end - start);
                output.push(length);
                const payloadStart = output.length;
                for (let i = 0; i < length; i++) output.push(input[start + i]);
                registerLiteralChunk(start, payloadStart, length);
                start += length;
            }
            literalStart = end;
        };

        const findSource = (key, commandEnd) => {
            const locations = literalLocations.get(key);
            if (!locations) return -1;
            for (let i = locations.length - 1; i >= 0; i--) {
                const distance = commandEnd - locations[i];
                if (distance > 0 && distance <= 1023) return locations[i];
            }
            return -1;
        };

        while (cursor + 4 <= input.length) {
            const key = keyAt(cursor);
            let pendingMatch = false;
            for (let p = literalStart; p + 4 <= cursor; p++) {
                if (keyAt(p) === key) {
                    pendingMatch = true;
                    break;
                }
            }
            if (pendingMatch) flushLiterals(cursor);

            if (findSource(key, output.length + 2) < 0) {
                cursor++;
                continue;
            }

            let repeats = 1;
            while (repeats < 32 && cursor + (repeats + 1) * 4 <= input.length) {
                if (keyAt(cursor + repeats * 4) !== key) break;
                repeats++;
            }

            flushLiterals(cursor);
            const source = findSource(key, output.length + 2);
            if (source < 0) {
                cursor++;
                continue;
            }
            const distance = output.length + 2 - source;
            const encodedRepeats = repeats === 32 ? 0 : repeats;
            output.push(0x80 | (encodedRepeats << 2) | ((distance >> 8) & 0x03));
            output.push(distance & 0xff);
            cursor += repeats * 4;
            literalStart = cursor;
        }

        flushLiterals(input.length);
        output.push(0);
        return new Uint8Array(output);
    }

    decompress(compressedData) {
        const input = compressedData instanceof Uint8Array
            ? compressedData
            : new Uint8Array(compressedData || []);
        const output = [];
        let cursor = 0;

        while (cursor < input.length) {
            const token = input[cursor++];
            if (token === 0) return new Uint8Array(output);

            if ((token & 0x80) === 0) {
                const length = token & 0x7f;
                if (cursor + length > input.length) {
                    throw new Error("MSC1 literal packet is truncated");
                }
                for (let i = 0; i < length; i++) output.push(input[cursor++]);
                continue;
            }

            if (cursor >= input.length) throw new Error("MSC1 repeat command is truncated");
            const repeats = ((token & 0x7c) >> 2) || 32;
            const distance = ((token & 0x03) << 8) | input[cursor++];
            const source = cursor - distance;
            if (distance === 0 || source < 0 || source + 4 > input.length) {
                throw new Error("MSC1 repeat command has an invalid offset");
            }
            for (let repeat = 0; repeat < repeats; repeat++) {
                for (let i = 0; i < 4; i++) output.push(input[source + i]);
            }
        }

        throw new Error("MSC1 stream has no end marker");
    }
}
