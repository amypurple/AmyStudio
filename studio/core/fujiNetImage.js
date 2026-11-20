export const FUJINET_ROM_BYTES = 32 * 1024;
export const FUJINET_PROGRAM_BYTES = 30 * 1024;
export const FUJINET_CLAIM_OFFSET = 0x7CFC;
export const FUJINET_CLAIM = Uint8Array.of(0x46, 0x55, 0x4A, 0x49);

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return Uint8Array.from(value || []);
}

export function buildFujiNetImage(program, { fill = 0xFF } = {}) {
  const bytes = asBytes(program);
  if (bytes.length > FUJINET_PROGRAM_BYTES) {
    throw new RangeError(`FujiNet program overflow: ${bytes.length} / ${FUJINET_PROGRAM_BYTES} bytes. The mailbox owns $F800-$FFFF.`);
  }
  if (bytes.length < 2 || !((bytes[0] === 0xAA && bytes[1] === 0x55) || (bytes[0] === 0x55 && bytes[1] === 0xAA))) {
    throw new Error("FujiNet image must begin with an AA55 or 55AA ColecoVision header.");
  }
  const image = new Uint8Array(FUJINET_ROM_BYTES);
  image.fill(Number(fill) & 0xFF);
  image.set(bytes, 0);
  image.set(FUJINET_CLAIM, FUJINET_CLAIM_OFFSET);
  return image;
}

export function inspectFujiNetImage(image) {
  const bytes = asBytes(image);
  const claim = bytes.length >= FUJINET_CLAIM_OFFSET + FUJINET_CLAIM.length
    && FUJINET_CLAIM.every((byte, index) => bytes[FUJINET_CLAIM_OFFSET + index] === byte);
  return Object.freeze({ ok: bytes.length === FUJINET_ROM_BYTES && claim, bytes: bytes.length, claim, programCapacity: FUJINET_PROGRAM_BYTES, replyStart: 0xF800, claimAddress: 0xFCFC });
}
