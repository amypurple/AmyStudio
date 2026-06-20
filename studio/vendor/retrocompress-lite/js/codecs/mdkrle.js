/**
 * MdkRLECodec - A Smart RLE Codec in JavaScript
 * * This class implements an optimized RLE (Run-Length Encoding) algorithm.
 * The compression format is based on the one described by Marcel de Kogel (1998)
 * for the Z80 processor.
 * * Format Rules:
 * - Control Byte 0x00-0x7F: RAW Packet
 * - Indicates a sequence of raw, uncompressed bytes.
 * - Length of data = (Control Byte) + 1. So, 0x00 means 1 byte, 0x7F means 128 bytes.
 * * - Control Byte 0x80-0xFE: RLE Packet
 * - Indicates a run of a single, repeated byte.
 * - The byte to be repeated immediately follows this control byte.
 * - Length of run = (Control Byte & 0x7F) + 1. So, 0x80 means 1 repetition, 0xFE means 127 repetitions.
 * * - Control Byte 0xFF: End of Data Marker
 * - Signals the end of the compressed data stream.
 * * Optimization Logic:
 * The compressor analyzes byte runs to decide the most efficient encoding method:
 * - A run of 3 or more identical bytes is always encoded as an RLE packet, as this is more space-efficient (2 bytes) than encoding them as raw data (3+ bytes).
 * - A run of 1 or 2 identical bytes is absorbed into a RAW packet, as this is more efficient than creating a 2-byte RLE packet for them.
 */
export class MdkRLECodec {
    /**
     * Compresses data using the optimized RLE algorithm.
     * @param {Uint8Array} inputData The raw data to compress.
     * @returns {Uint8Array} The compressed data.
     */
    compress(inputData) {
        if (!inputData || inputData.length === 0) {
            return new Uint8Array([0xFF]); // Return only the END marker for empty input
        }

        const compressed = [];
        let rawBuffer = [];
        let i = 0;

        // Flushes the pending raw byte buffer to the compressed output.
        // It correctly splits raw packets larger than the maximum size of 128 bytes.
        const flushRaw = () => {
            if (rawBuffer.length === 0) return;
            let offset = 0;
            while (offset < rawBuffer.length) {
                const chunkSize = Math.min(rawBuffer.length - offset, 128);
                // Control byte for RAW is length - 1 (0-127)
                compressed.push(chunkSize - 1); 
                compressed.push(...rawBuffer.slice(offset, offset + chunkSize));
                offset += chunkSize;
            }
            rawBuffer = [];
        };

        while (i < inputData.length) {
            // Look ahead to find the length of a potential run of identical bytes
            let runLength = 1;
            while (i + runLength < inputData.length && inputData[i] === inputData[i + runLength]) {
                runLength++;
            }

            // --- The Core Optimization Logic ---
            // A run of 3 or more is always more efficient to encode as an RLE packet
            // (2 bytes for RLE vs. 3+ bytes for RAW).
            // A run of 1 or 2 is better absorbed into a RAW packet.
            if (runLength >= 3) {
                // We found a run worth encoding. First, flush any pending raw bytes.
                flushRaw();

                // Now, encode the run. It might need to be split if it's longer than 127.
                let remainingRun = runLength;
                while (remainingRun > 0) {
                    const chunkSize = Math.min(remainingRun, 127);
                    // Control byte for RLE is 0x80 | (length - 1)
                    compressed.push(0x80 | (chunkSize - 1));
                    compressed.push(inputData[i]); // The byte to repeat
                    remainingRun -= chunkSize;
                }
                i += runLength; // Advance the main pointer past the entire run
            } else {
                // The run is too short (1 or 2 bytes). Add the current byte to the raw buffer.
                rawBuffer.push(inputData[i]);
                i++;
            }
        }

        // After the loop, flush any remaining raw bytes
        flushRaw();

        // Add the final end-of-data marker
        compressed.push(0xFF);

        return new Uint8Array(compressed);
    }

    /**
     * Decompresses data that was compressed with this RLE format.
     * @param {Uint8Array} compressedData The data to decompress.
     * @returns {Uint8Array} The original, decompressed data.
     */
    decompress(compressedData) {
        if (!compressedData || compressedData.length === 0) {
            return new Uint8Array([]);
        }

        const decompressed = [];
        let i = 0;

        while (i < compressedData.length) {
            const controlByte = compressedData[i++];

            if (controlByte === 0xFF) {
                // End of data marker found, stop processing.
                break;
            }

            if (controlByte < 0x80) {
                // This is a RAW packet (control bytes 0x00 to 0x7F)
                const length = controlByte + 1;
                if (i + length > compressedData.length) {
                    throw new Error("Invalid RAW packet: data is truncated.");
                }
                for (let j = 0; j < length; j++) {
                    decompressed.push(compressedData[i++]);
                }
            } else {
                // This is an RLE packet (control bytes 0x80 to 0xFE)
                const length = (controlByte & 0x7F) + 1;
                if (i >= compressedData.length) {
                     throw new Error("Invalid RLE packet: missing value byte.");
                }
                const value = compressedData[i++];
                for (let j = 0; j < length; j++) {
                    decompressed.push(value);
                }
            }
        }
        return new Uint8Array(decompressed);
    }
}
