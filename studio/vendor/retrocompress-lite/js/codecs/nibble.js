/**
 * NibbleCodec - legacy Amy/Daniel Bienvenu DAN0nibble-derived codec.
 *
 * Origin: DAN0nibble, Amy/Daniel Bienvenu legacy ColecoVision compressor/depacker.
 * The exact original source file is not currently present in this workspace;
 * this Studio codec preserves the documented DAN0nibble command semantics and
 * uses a relocatable 2026 stream header for Amy Studio project files.
 *
 * This is a modern, relocatable JavaScript container for the old DAN0nibble
 * depacker idea. The original Z80 routine stores an absolute pointer to the
 * data stream; this file format stores a 16-bit little-endian relative offset
 * from the beginning of the compressed file instead.
 *
 * Stream layout:
 *   u16 dataOffset
 *   control stream bytes, including RLE commands and bit-buffer bytes
 *   data stream bytes
 *
 * RLE/control commands match DAN0nibble:
 *   00      raw 256 values
 *   01-7f   raw 1..127 values
 *   80      repeat one value 256 times
 *   81      end
 *   82-ff   repeat one value 2..127 times
 *
 * Value coding, consumed by readNextValue():
 *   bit 0           next literal byte from data stream
 *   bits 1 nnnn     copy byte from 1..16 bytes before current data pointer
 */
export class NibbleCodec {
  constructor() {
    this.END_MARKER = 0x81;
    this.MAX_RAW = 256;
    this.MAX_SHORT_RAW = 127;
    this.MAX_RUN = 256;
    this.MAX_SHORT_RUN = 127;
    this.MIN_RLE_RUN = 3;
    this.WINDOW = 16;
  }

  compress(inputData) {
    const input = inputData instanceof Uint8Array ? inputData : new Uint8Array(inputData || []);
    const controls = [];
    const data = [];
    const bits = new ControlBitWriter(controls);

    const encodeValue = (value) => {
      let bestDistance = 0;
      const start = Math.max(0, data.length - this.WINDOW);
      for (let i = data.length - 1; i >= start; i--) {
        if (data[i] === value) {
          bestDistance = data.length - i;
          break;
        }
      }

      if (bestDistance > 0) {
        bits.writeBit(1);
        bits.writeBits(bestDistance - 1, 4);
        return;
      }

      bits.writeBit(0);
      data.push(value);
    };

    const emitRaw = (start, length) => {
      let remaining = length;
      let pos = start;
      while (remaining > 0) {
        const chunk = remaining >= this.MAX_RAW ? this.MAX_RAW : Math.min(remaining, this.MAX_SHORT_RAW);
        controls.push(chunk === this.MAX_RAW ? 0x00 : chunk);
        for (let i = 0; i < chunk; i++) encodeValue(input[pos + i]);
        pos += chunk;
        remaining -= chunk;
      }
    };

    const emitRun = (value, length) => {
      let remaining = length;
      while (remaining > 0) {
        if (remaining === 1) {
          controls.push(0x01);
          encodeValue(value);
          remaining -= 1;
          continue;
        }
        const chunk = remaining >= this.MAX_RUN ? this.MAX_RUN : Math.min(remaining, this.MAX_SHORT_RUN);
        controls.push(chunk === this.MAX_RUN ? 0x80 : 0x80 | chunk);
        encodeValue(value);
        remaining -= chunk;
      }
    };

    let rawStart = 0;
    let rawLength = 0;
    const flushRaw = () => {
      if (rawLength > 0) emitRaw(rawStart, rawLength);
      rawStart = 0;
      rawLength = 0;
    };

    let i = 0;
    while (i < input.length) {
      let runLength = 1;
      while (i + runLength < input.length && input[i + runLength] === input[i] && runLength < this.MAX_RUN) {
        runLength++;
      }

      if (runLength >= this.MIN_RLE_RUN) {
        flushRaw();
        emitRun(input[i], runLength);
        i += runLength;
        rawStart = i;
      } else {
        if (rawLength === 0) rawStart = i;
        rawLength++;
        i++;
        if (rawLength === this.MAX_RAW) flushRaw();
      }
    }
    flushRaw();

    controls.push(this.END_MARKER);

    const dataOffset = 2 + controls.length;
    if (dataOffset > 0xffff) {
      throw new Error(`Nibble compression failed: data offset ${dataOffset} exceeds 16-bit limit.`);
    }
    if (dataOffset + data.length > 0xffff) {
      throw new Error(`Nibble compression failed: compressed stream ${dataOffset + data.length} exceeds 64KB limit.`);
    }

    const output = new Uint8Array(dataOffset + data.length);
    output[0] = dataOffset & 0xff;
    output[1] = dataOffset >> 8;
    output.set(controls, 2);
    output.set(data, dataOffset);
    return output;
  }

  decompress(compressedData) {
    const input = compressedData instanceof Uint8Array ? compressedData : new Uint8Array(compressedData || []);
    if (input.length === 0) return new Uint8Array([]);
    if (input.length < 3) throw new Error('Nibble decompression failed: stream is too short.');

    const dataOffset = input[0] | (input[1] << 8);
    if (dataOffset < 2 || dataOffset > input.length) {
      throw new Error(`Nibble decompression failed: invalid data offset ${dataOffset}.`);
    }

    const state = {
      input,
      ctrlPos: 2,
      dataPos: dataOffset,
      bitBuffer: 0x80
    };
    const output = [];

    const readNextValue = () => {
      let c = 0;
      if (getBit(state) === 0) return readDataByte(state);

      let carry = getBit(state);
      c = ((c << 1) | carry) & 0xff;
      carry = getBit(state);
      c = ((c << 1) | carry) & 0xff;
      carry = getBit(state);
      c = ((c << 1) | carry) & 0xff;
      carry = getBit(state);
      c = ((c << 1) | carry) & 0xff;

      const source = state.dataPos - (c + 1);
      if (source < dataOffset || source >= state.dataPos) {
        throw new Error(`Nibble decompression failed: invalid back-reference distance ${c + 1}.`);
      }
      return input[source];
    };

    while (true) {
      if (state.ctrlPos >= dataOffset) {
        throw new Error('Nibble decompression failed: missing end marker before data stream.');
      }
      const command = input[state.ctrlPos++];
      if (command & 0x80) {
        const count = command & 0x7f;
        if (count === 1) break;
        const length = count === 0 ? 256 : count;
        const value = readNextValue();
        for (let i = 0; i < length; i++) output.push(value);
      } else {
        const length = command === 0 ? 256 : command;
        for (let i = 0; i < length; i++) output.push(readNextValue());
      }
      if (output.length > 0xffff) {
        throw new Error('Nibble decompression failed: output exceeds 64KB safety limit.');
      }
    }

    return new Uint8Array(output);
  }
}

class ControlBitWriter {
  constructor(controls) {
    this.controls = controls;
    this.index = -1;
    this.mask = 0;
  }

  writeBit(bit) {
    if (this.mask === 0) {
      this.index = this.controls.length;
      this.controls.push(0);
      this.mask = 0x80;
    }
    if (bit) this.controls[this.index] |= this.mask;
    this.mask >>= 1;
  }

  writeBits(value, count) {
    for (let bit = count - 1; bit >= 0; bit--) {
      this.writeBit((value >> bit) & 1);
    }
  }
}

function getBit(state) {
  const carryFromShift = (state.bitBuffer & 0x80) ? 1 : 0;
  state.bitBuffer = (state.bitBuffer << 1) & 0xff;
  if (state.bitBuffer !== 0) return carryFromShift;

  if (state.ctrlPos >= state.input.length) {
    throw new Error('Nibble decompression failed: control bitstream is truncated.');
  }
  const next = state.input[state.ctrlPos++];
  const carryFromByte = (next & 0x80) ? 1 : 0;
  state.bitBuffer = ((next << 1) & 0xff) | carryFromShift;
  return carryFromByte;
}

function readDataByte(state) {
  if (state.dataPos >= state.input.length) {
    throw new Error('Nibble decompression failed: data stream is truncated.');
  }
  return state.input[state.dataPos++];
}
