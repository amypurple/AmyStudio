const KB = 1024;

export const MEGACART_BANK_BYTES = 16 * KB;
export const MEGACART_MAPPER_BYTES = 0x40;
export const MEGACART_SWITCHABLE_BYTES = MEGACART_BANK_BYTES - MEGACART_MAPPER_BYTES;
export const MEGACART_SIZES_KB = Object.freeze([64, 128, 256, 512, 1024]);

function asBytes(value, label) {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value);
  throw new TypeError(`${label} must be byte data.`);
}

export function getMegaCartLayout(sizeKb) {
  const normalized = Number(sizeKb);
  if (!MEGACART_SIZES_KB.includes(normalized)) {
    throw new RangeError("MegaCart size must be 64, 128, 256, 512, or 1024 KB.");
  }
  const bankCount = normalized / 16;
  return Object.freeze({
    sizeKb: normalized,
    byteLength: normalized * KB,
    bankCount,
    fixedBank: bankCount - 1,
    fixedAddress: 0x8000,
    switchableAddress: 0xC000,
    mapperAddress: 0xFFC0,
    switchableCapacity: MEGACART_SWITCHABLE_BYTES
  });
}

export function getMegaCartSelectAddress(bank, sizeKb) {
  const layout = getMegaCartLayout(sizeKb);
  const normalized = Number(bank);
  if (!Number.isInteger(normalized) || normalized < 0 || normalized >= layout.bankCount) {
    throw new RangeError(`MegaCart bank must be between 0 and ${layout.bankCount - 1}.`);
  }
  return layout.mapperAddress + normalized;
}

export function buildMegaCartImage({ sizeKb, fixedBank, switchableBanks = [], fill = 0xFF }) {
  const layout = getMegaCartLayout(sizeKb);
  const fixed = asBytes(fixedBank, "MegaCart fixed bank");
  if (fixed.length > MEGACART_BANK_BYTES) {
    throw new RangeError(`MegaCart fixed bank overflow: ${fixed.length} / ${MEGACART_BANK_BYTES} bytes.`);
  }

  const image = new Uint8Array(layout.byteLength);
  image.fill(Number(fill) & 0xFF);
  const bankMask = layout.bankCount === 4 ? 0xFC
    : layout.bankCount === 8 ? 0xF8
    : layout.bankCount === 16 ? 0xF0
      : layout.bankCount === 32 ? 0xE0 : 0xC0;
  for (let bank = 0; bank < layout.bankCount; bank++) {
    image[bank * MEGACART_BANK_BYTES + MEGACART_SWITCHABLE_BYTES - 1] = bankMask | bank;
  }
  const usedBanks = new Set();
  for (const entry of switchableBanks) {
    const bank = Number(entry?.bank);
    if (!Number.isInteger(bank) || bank < 0 || bank >= layout.fixedBank) {
      throw new RangeError(`Switchable MegaCart bank must be between 0 and ${layout.fixedBank - 1}.`);
    }
    if (usedBanks.has(bank)) throw new Error(`Duplicate MegaCart bank ${bank}.`);
    usedBanks.add(bank);
    const bytes = asBytes(entry.bytes, `MegaCart bank ${bank}`);
    if (bytes.length > layout.switchableCapacity) {
      throw new RangeError(`MegaCart bank ${bank} overflow: ${bytes.length} / ${layout.switchableCapacity} bytes.`);
    }
    image.set(bytes, bank * MEGACART_BANK_BYTES);
  }

  const firstHeader = (image[0] << 8) | image[1];
  if (firstHeader === 0xAA55 || firstHeader === 0x55AA) {
    throw new Error("MegaCart bank 0 begins with a cartridge header and would be detected as an Activision cartridge.");
  }

  const fixedOffset = layout.fixedBank * MEGACART_BANK_BYTES;
  image.set(fixed, fixedOffset);
  const fixedHeader = (image[fixedOffset] << 8) | image[fixedOffset + 1];
  if (fixedHeader !== 0xAA55 && fixedHeader !== 0x55AA) {
    throw new Error("MegaCart fixed bank must begin with an AA55 or 55AA ColecoVision header.");
  }
  return { image, layout };
}
