/*
 * Independent MegaLZ/DEC40-compatible codec.
 *
 * The stream starts with one literal byte. Control bits are MSB-first and
 * interleaved with payload bytes. Matches use the documented 4352-byte window.
 */

const MAX_OFFSET = 4352;
const MAX_LENGTH = 255;
const MAX_OUTPUT_SIZE = 1024 * 1024;
const INF = 0x3fffffff;

const asBytes = (data) => data instanceof Uint8Array ? data : new Uint8Array(data);

function lengthBitCount(length) {
  let width = 1;
  while (length >= 2 + (1 << (width + 1))) width += 1;
  return 2 * width;
}

function advanceBits(modulo, count) {
  const bytes = Math.ceil((modulo + count) / 8) - (modulo ? 1 : 0);
  return { modulo: (modulo + count) & 7, bytes };
}

function findMatches(input, position, candidates) {
  let near = 0;
  let far = 0;
  if (position + 2 < input.length) {
    const key = (input[position] << 16) | (input[position + 1] << 8) | input[position + 2];
    if (candidates) {
      for (let index = candidates.length - 1; index >= 0; index -= 1) {
        const source = candidates[index];
        const offset = position - source;
        if (offset > MAX_OFFSET) break;
        let length = 3;
        const limit = Math.min(MAX_LENGTH, input.length - position);
        while (length < limit && input[position + length] === input[position + length - offset]) length += 1;
        if (offset <= 256) near = Math.max(near, length);
        else far = Math.max(far, length);
        if (near === limit && far === limit) break;
      }
    }
  }
  return { near, far };
}

function buildMatchLengths(input) {
  const chains = new Map();
  const near = new Uint16Array(input.length);
  const far = new Uint16Array(input.length);
  for (let position = 0; position + 2 < input.length; position += 1) {
    const key = (input[position] << 16) | (input[position + 1] << 8) | input[position + 2];
    let list = chains.get(key);
    if (!list) chains.set(key, list = []);
    const matches = findMatches(input, position, list);
    near[position] = matches.near;
    far[position] = matches.far;
    list.push(position);
  }
  return { near, far };
}

function optimize(input) {
  const size = input.length;
  const costs = Array.from({ length: size + 1 }, () => new Int32Array(8).fill(INF));
  const previous = Array.from({ length: size + 1 }, () => new Array(8));
  const matches = buildMatchLengths(input);
  costs[1][0] = 1;

  const relax = (position, modulo, next, bits, payload, token) => {
    const advanced = advanceBits(modulo, bits);
    const cost = costs[position][modulo] + advanced.bytes + payload;
    if (cost < costs[next][advanced.modulo]) {
      costs[next][advanced.modulo] = cost;
      previous[next][advanced.modulo] = { position, modulo, token };
    }
  };

  for (let position = 1; position < size; position += 1) {
    const near = matches.near[position];
    const far = matches.far[position];
    let oneOffset = 0;
    for (let offset = 1; offset <= Math.min(8, position); offset += 1) {
      if (input[position] === input[position - offset]) { oneOffset = offset; break; }
    }
    let twoOffset = 0;
    for (let offset = 1; offset <= Math.min(256, position); offset += 1) {
      if (input[position] === input[position - offset] && input[position + 1] === input[position + 1 - offset]) {
        twoOffset = offset;
        break;
      }
    }

    for (let modulo = 0; modulo < 8; modulo += 1) {
      if (costs[position][modulo] === INF) continue;
      relax(position, modulo, position + 1, 1, 1, { kind: "literal", value: input[position] });
      if (oneOffset) relax(position, modulo, position + 1, 6, 0, { kind: "match", length: 1, offset: oneOffset });
      if (twoOffset && position + 1 < size) relax(position, modulo, position + 2, 3, 1, { kind: "match", length: 2, offset: twoOffset });
      for (let length = 3; length <= near; length += 1) {
        const bits = length === 3 ? 4 : lengthBitCount(length) + 4;
        relax(position, modulo, position + length, bits, 1, { kind: "match", length, offsetClass: "near" });
      }
      for (let length = 3; length <= far; length += 1) {
        const bits = length === 3 ? 8 : lengthBitCount(length) + 8;
        relax(position, modulo, position + length, bits, 1, { kind: "match", length, offsetClass: "far" });
      }
    }
  }

  let bestModulo = -1;
  let bestCost = INF;
  for (let modulo = 0; modulo < 8; modulo += 1) {
    if (costs[size][modulo] === INF) continue;
    const end = advanceBits(modulo, 12);
    const cost = costs[size][modulo] + end.bytes;
    if (cost < bestCost) { bestCost = cost; bestModulo = modulo; }
  }
  if (bestModulo < 0) throw new Error("Unable to encode MegaLZ stream");

  const tokens = [];
  for (let position = size, modulo = bestModulo; position > 1;) {
    const step = previous[position][modulo];
    if (!step) throw new Error("Broken MegaLZ optimization chain");
    const token = step.token;
    if (token.offsetClass) {
      const maxOffset = token.offsetClass === "near" ? 256 : MAX_OFFSET;
      const minOffset = token.offsetClass === "near" ? 1 : 257;
      for (let offset = minOffset; offset <= Math.min(maxOffset, step.position); offset += 1) {
        let valid = true;
        for (let index = 0; index < token.length; index += 1) {
          if (input[step.position + index] !== input[step.position + index - offset]) { valid = false; break; }
        }
        if (valid) { token.offset = offset; break; }
      }
      if (!token.offset) throw new Error("Lost MegaLZ match offset");
    }
    tokens.push(token);
    position = step.position;
    modulo = step.modulo;
  }
  tokens.reverse();
  return tokens;
}

function encode(input, tokens) {
  const output = [input[0]];
  let mask = 0;
  let controlIndex = 0;
  const bit = (value) => {
    if (!mask) { controlIndex = output.length; output.push(0); mask = 0x80; }
    if (value) output[controlIndex] |= mask;
    mask >>= 1;
  };
  const bits = (value, count) => {
    for (let shift = count - 1; shift >= 0; shift -= 1) bit((value >> shift) & 1);
  };
  const byte = (value) => output.push(value & 0xff);
  const offsetByte = (offset) => byte((-offset) & 0xff);
  const distance = (offset, far) => {
    bit(far ? 1 : 0);
    if (far) bits(17 - Math.ceil(offset / 256), 4);
    offsetByte(offset);
  };
  const variableLength = (length) => {
    let width = 1;
    while (length >= 2 + (1 << (width + 1))) width += 1;
    for (let index = 1; index < width; index += 1) bit(0);
    bit(1);
    bits(length - 2 - (1 << width), width);
  };

  for (const token of tokens) {
    if (token.kind === "literal") { bit(1); byte(token.value); continue; }
    bit(0);
    if (token.length === 1) { bits(0, 2); bits(8 - token.offset, 3); }
    else if (token.length === 2) { bits(1, 2); offsetByte(token.offset); }
    else if (token.length === 3) { bits(2, 2); distance(token.offset, token.offset > 256); }
    else { bits(3, 2); variableLength(token.length); distance(token.offset, token.offset > 256); }
  }
  bits(0b011000000001, 12);
  return Uint8Array.from(output);
}

export class MegaLZCodec {
  async compress(data) {
    const input = asBytes(data);
    if (!input.length) return new Uint8Array();
    return encode(input, optimize(input));
  }

  async decompress(data) {
    const input = asBytes(data);
    if (!input.length) return new Uint8Array();
    const output = [input[0]];
    let position = 1;
    let mask = 0;
    let control = 0;
    const byte = () => {
      if (position >= input.length) throw new Error("Truncated MegaLZ stream");
      return input[position++];
    };
    const bit = () => {
      if (!mask) { control = byte(); mask = 0x80; }
      const value = (control & mask) ? 1 : 0;
      mask >>= 1;
      return value;
    };
    const bits = (count) => { let value = 0; while (count-- > 0) value = (value << 1) | bit(); return value; };
    const copy = (offset, length) => {
      if (offset < 1 || offset > output.length) throw new Error("Invalid MegaLZ offset");
      if (output.length + length > MAX_OUTPUT_SIZE) throw new Error("MegaLZ output exceeds 1 MiB");
      while (length-- > 0) output.push(output[output.length - offset]);
    };
    const readDistance = () => {
      if (!bit()) return 256 - byte() || 256;
      const high = bits(4);
      const low = byte();
      return -((((-16) | high) - 1) * 256 + low);
    };

    for (;;) {
      if (bit()) { output.push(byte()); continue; }
      const kind = bits(2);
      if (kind === 0) { copy(8 - bits(3), 1); continue; }
      if (kind === 1) { const encoded = byte(); copy(256 - encoded || 256, 2); continue; }
      if (kind === 2) { copy(readDistance(), 3); continue; }
      let width = 0;
      do {
        width += 1;
        if (bit()) break;
        if (width > 9) throw new Error("Invalid MegaLZ length code");
      } while (true);
      if (width === 9) {
        if (position !== input.length) throw new Error("Data follows MegaLZ end marker");
        return Uint8Array.from(output);
      }
      if (width > 7) throw new Error("Invalid MegaLZ length code");
      const length = 2 + (1 << width) + bits(width);
      copy(readDistance(), length);
    }
  }
}
