/**
 * A highly simplified JavaScript class for optimal LZF compression using the
 * standard relative offset mode.
 */
export class LZFCodec {
    constructor() {
        this.END_MARKER = 0xFF;
        this.MAX_OFFSET = 7936;
        this.MIN_MATCH = 3;
        this.MAX_LENGTH = 256;
    }

    /**
     * Calculates the byte cost of a literal sequence.
     * @param {number} length The length of the literal sequence.
     * @returns {number} The cost in bytes.
     */
    literalCost(length) {
        return 1 + length;
    }

    /**
     * Calculates the byte cost of a match.
     * @param {number} length The length of the match.
     * @returns {number} The cost in bytes.
     */
    matchCost(length) {
        return length <= 8 ? 2 : 3;
    }

    /**
     * Compresses data using an optimal parsing algorithm (dynamic programming).
     * @param {Uint8Array} input The raw data to compress.
     * @returns {Uint8Array} The compressed data.
     */
    compress(input) {
        const n = input.length;
        const dp = new Array(n + 1).fill(Infinity);
        const path = new Array(n + 1).fill(null);
        dp[0] = 0;

        for (let i = 0; i < n; i++) {
            if (dp[i] === Infinity) continue;

            // Option 1: Encode a literal run (up to 32 bytes)
            for (let len = 1; len <= 32 && i + len <= n; len++) {
                const cost = dp[i] + this.literalCost(len);
                if (cost < dp[i + len]) {
                    dp[i + len] = cost;
                    path[i + len] = { type: 'literal', length: len, from: i };
                }
            }

            // Option 2: Encode a match
            const searchStart = Math.max(0, i - this.MAX_OFFSET);
            for (let p = searchStart; p < i; p++) {
                let len = 0;
                while (i + len < n && input[p + len] === input[i + len] && len < this.MAX_LENGTH) {
                    len++;
                }
                if (len >= this.MIN_MATCH) {
                    const cost = dp[i] + this.matchCost(len);
                    if (cost < dp[i + len]) {
                        dp[i + len] = cost;
                        path[i + len] = { type: 'match', length: len, offset: i - p, from: i };
                    }
                }
            }
        }
        
        // Reconstruct path and generate output
        const operations = [];
        for (let pos = n; pos > 0; pos = path[pos].from) {
            operations.unshift(path[pos]);
        }

        const output = [];
        for (const op of operations) {
            if (op.type === 'literal') {
                output.push(op.length - 1);
                for (let i = 0; i < op.length; i++) {
                    output.push(input[op.from + i]);
                }
            } else { // match
                const storedOffset = op.offset - 1; // Relative offset encoding
                if (op.length <= 8) { // Short match: LLLPPPPP PPPPPPPP
                    output.push(((op.length - 2) << 5) | ((storedOffset >> 8) & 0x1F), storedOffset & 0xFF);
                } else { // Long match: 111PPPPP LLLLLLLL PPPPPPPP
                    output.push(0xE0 | ((storedOffset >> 8) & 0x1F), op.length - 9, storedOffset & 0xFF);
                }
            }
        }
        output.push(this.END_MARKER);
        return new Uint8Array(output);
    }

    /**
     * Decompresses LZF data.
     * @param {Uint8Array} input The compressed data.
     * @returns {Uint8Array} The decompressed (original) data.
     */
    decompress(input) {
        const output = [];
        let pos = 0;

        while (pos < input.length && input[pos] !== this.END_MARKER) {
            const byte = input[pos++];
            const control = byte >> 5;

            if (control === 0) { // Literal copy: 000LLLLL -> length is LLLLL + 1
                const len = (byte & 0x1F) + 1;
                for (let i = 0; i < len; i++) {
                    output.push(input[pos++]);
                }
            } else if (control === 7) { // Long match: 111PPPPP
                const len = input[pos++] + 9;
                const storedOffset = ((byte & 0x1F) << 8) | input[pos++];
                const copyPos = output.length - (storedOffset + 1);
                for (let i = 0; i < len; i++) {
                    output.push(output[copyPos + i]);
                }
            } else { // Short match: LLLPPPPP
                const len = control + 2;
                const storedOffset = ((byte & 0x1F) << 8) | input[pos++];
                const copyPos = output.length - (storedOffset + 1);
                for (let i = 0; i < len; i++) {
                    output.push(output[copyPos + i]);
                }
            }
        }
        return new Uint8Array(output);
    }
}