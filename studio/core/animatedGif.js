const encoder = new TextEncoder();

function u16(value) {
  return Uint8Array.of(value & 0xFF, (value >>> 8) & 0xFF);
}

function colorTableRgb332() {
  const table = new Uint8Array(256 * 3);
  for (let index = 0; index < 256; ++index) {
    table[index * 3] = Math.round(((index >>> 5) & 7) * 255 / 7);
    table[index * 3 + 1] = Math.round(((index >>> 2) & 7) * 255 / 7);
    table[index * 3 + 2] = Math.round((index & 3) * 255 / 3);
  }
  return table;
}

export function rgb565ToRgb332(pixels) {
  const indexed = new Uint8Array(pixels.length);
  for (let index = 0; index < pixels.length; ++index) {
    const pixel = pixels[index];
    indexed[index] = ((pixel >>> 8) & 0xE0) | ((pixel >>> 6) & 0x1C) | ((pixel >>> 3) & 0x03);
  }
  return indexed;
}

function lzwEncode(indices) {
  const clearCode = 256;
  const endCode = 257;
  let dictionary = new Map();
  let nextCode = 258;
  let codeSize = 9;
  let bits = 0;
  let bitCount = 0;
  const bytes = [];
  const emit = (code) => {
    bits |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bits & 0xFF);
      bits >>>= 8;
      bitCount -= 8;
    }
  };
  const reset = () => {
    dictionary = new Map();
    nextCode = 258;
    codeSize = 9;
  };

  emit(clearCode);
  if (indices.length) {
    let prefix = indices[0];
    for (let index = 1; index < indices.length; ++index) {
      const suffix = indices[index];
      const key = `${prefix},${suffix}`;
      const known = dictionary.get(key);
      if (known !== undefined) {
        prefix = known;
        continue;
      }
      emit(prefix);
      if (nextCode < 4096) {
        dictionary.set(key, nextCode++);
        // The decoder creates an entry only after consuming the next code, so
        // the encoder changes width one dictionary entry later.
        if (nextCode === (1 << codeSize) + 1 && codeSize < 12) codeSize += 1;
      } else {
        emit(clearCode);
        reset();
      }
      prefix = suffix;
    }
    emit(prefix);
  }
  emit(endCode);
  if (bitCount) bytes.push(bits & 0xFF);
  return Uint8Array.from(bytes);
}

function subBlocks(bytes) {
  const parts = [];
  for (let offset = 0; offset < bytes.length; offset += 255) {
    const block = bytes.subarray(offset, offset + 255);
    parts.push(Uint8Array.of(block.length), block);
  }
  parts.push(Uint8Array.of(0));
  return parts;
}

export class AnimatedGifEncoder {
  constructor({ width, height, fps = 15, loop = true }) {
    if (!Number.isInteger(width) || width < 1 || width > 65535 || !Number.isInteger(height) || height < 1 || height > 65535) {
      throw new RangeError("GIF dimensions must be integers from 1 to 65535.");
    }
    if (!Number.isFinite(fps) || fps <= 0 || fps > 100) throw new RangeError("GIF frame rate must be between 0 and 100.");
    this.width = width;
    this.height = height;
    this.delay = Math.max(1, Math.round(100 / fps));
    this.parts = [
      encoder.encode("GIF89a"),
      u16(width), u16(height), Uint8Array.of(0xF7, 0, 0),
      colorTableRgb332()
    ];
    if (loop) {
      this.parts.push(Uint8Array.of(0x21, 0xFF, 0x0B), encoder.encode("NETSCAPE2.0"), Uint8Array.of(3, 1, 0, 0, 0));
    }
    this.frameCount = 0;
  }

  addFrame(indices) {
    if (!(indices instanceof Uint8Array) || indices.length !== this.width * this.height) {
      throw new RangeError(`GIF frame must contain exactly ${this.width * this.height} indexed pixels.`);
    }
    this.parts.push(
      Uint8Array.of(0x21, 0xF9, 4, 0x04), u16(this.delay), Uint8Array.of(0, 0),
      Uint8Array.of(0x2C), u16(0), u16(0), u16(this.width), u16(this.height), Uint8Array.of(0),
      Uint8Array.of(8), ...subBlocks(lzwEncode(indices))
    );
    this.frameCount += 1;
  }

  finish() {
    if (!this.frameCount) throw new Error("GIF export needs at least one frame.");
    return new Blob([...this.parts, Uint8Array.of(0x3B)], { type: "image/gif" });
  }
}
