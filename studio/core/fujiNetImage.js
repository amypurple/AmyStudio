export const FUJINET_ROM_BYTES = 32 * 1024;
export const FUJINET_PROGRAM_BYTES = 30 * 1024;
export const FUJINET_APPBANK_PAGE_BYTES = 8 * 1024;
export const FUJINET_APPBANK_MAX_BYTES = 128 * 1024;
export const FUJINET_APPBANK_MAX_PAGES = 12;
export const FUJINET_CLAIM_OFFSET = 0x7CFC;
export const FUJINET_CLAIM = Uint8Array.of(0x46, 0x55, 0x4A, 0x49); // "FUJI"

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
  return Object.freeze({
    ok: bytes.length === FUJINET_ROM_BYTES && claim,
    bytes: bytes.length,
    claim,
    programCapacity: FUJINET_PROGRAM_BYTES,
    replyStart: 0xF800,
    claimAddress: 0xFCFC
  });
}

function normalizeAppBankPage(page, index, fill) {
  const bytes = asBytes(page?.bytes ?? page);
  if (bytes.length > FUJINET_APPBANK_PAGE_BYTES) {
    throw new RangeError(`FujiNet APPBANK page ${index} overflow: ${bytes.length} / ${FUJINET_APPBANK_PAGE_BYTES} bytes.`);
  }
  const result = new Uint8Array(FUJINET_APPBANK_PAGE_BYTES);
  result.fill(fill);
  result.set(bytes);
  return result;
}

// APPBANK keeps page 0 in the $C000-$DFFF part of the 32K window. Pages 1+
// follow that window as consecutive 8K blocks and are selected by reading
// $FD80 + page. A neutral page prevents 64K/128K images being mistaken for a
// MegaCart by firmware that has not recognized the FUJI claim yet.
export function buildFujiNetAppBankImage(windowProgram, pages = [], { fill = 0x00 } = {}) {
  const byteFill = Number(fill) & 0xFF;
  const window = buildFujiNetImage(windowProgram, { fill: byteFill });
  const normalizedPages = Array.from(pages || []);
  if (normalizedPages.length > FUJINET_APPBANK_MAX_PAGES - 1) {
    throw new RangeError(`FujiNet APPBANK has ${normalizedPages.length + 1} pages; maximum is ${FUJINET_APPBANK_MAX_PAGES}.`);
  }
  const chunks = [window];
  for (let index = 0; index < normalizedPages.length; ++index) {
    chunks.push(normalizeAppBankPage(normalizedPages[index], index + 1, byteFill));
  }
  let imageBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (imageBytes === 64 * 1024 || imageBytes === 128 * 1024) {
    chunks.push(normalizeAppBankPage([], chunks.length, byteFill));
    imageBytes += FUJINET_APPBANK_PAGE_BYTES;
  }
  if (imageBytes > FUJINET_APPBANK_MAX_BYTES) {
    throw new RangeError(`FujiNet APPBANK image overflow: ${imageBytes} / ${FUJINET_APPBANK_MAX_BYTES} bytes.`);
  }
  const image = new Uint8Array(imageBytes);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.length;
  }
  return image;
}

export function inspectFujiNetAppBankImage(image) {
  const bytes = asBytes(image);
  const base = inspectFujiNetImage(bytes.subarray(0, Math.min(bytes.length, FUJINET_ROM_BYTES)));
  const payloadBytes = bytes.length - FUJINET_ROM_BYTES;
  const aligned = payloadBytes >= 0 && payloadBytes % FUJINET_APPBANK_PAGE_BYTES === 0;
  const pageCount = aligned ? 1 + payloadBytes / FUJINET_APPBANK_PAGE_BYTES : 0;
  const neutralPaddingPage = bytes.length === 72 * 1024;
  return Object.freeze({
    ok: base.ok && aligned && pageCount >= 1 && pageCount <= FUJINET_APPBANK_MAX_PAGES + 1,
    bytes: bytes.length,
    pageBytes: FUJINET_APPBANK_PAGE_BYTES,
    pageCount,
    claim: base.claim,
    neutralPaddingPage
  });
}
