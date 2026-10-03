export const EMULATOR_MEDIA_KIND = Object.freeze({
  ROM: "rom",
  ADAM_DISK: "adam-disk",
  ADAM_DATA_PACK: "adam-data-pack"
});

const ADAM_DISK_BYTES = 160 * 1024;
const ADAM_DATA_PACK_BYTES = 256 * 1024;

function mediaBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

function hasPrefix(bytes, ...prefix) {
  return Boolean(bytes && prefix.every((value, index) => bytes[index] === value));
}

export function detectEmulatorMedia(name, content) {
  const normalizedName = String(name || "").trim().toLowerCase();
  const extension = normalizedName.match(/\.[^.]+$/)?.[0] || "";
  const bytes = mediaBytes(content);
  const size = bytes ? bytes.byteLength : Number(content);
  const compressed = hasPrefix(bytes, 0x50, 0x4B) || hasPrefix(bytes, 0x1F, 0x8B);
  const colecoHeader = hasPrefix(bytes, 0xAA, 0x55) || hasPrefix(bytes, 0x55, 0xAA);

  if ([".zip", ".gz"].includes(extension) || compressed) return null;
  if ([".rom", ".col"].includes(extension)) return { kind: EMULATOR_MEDIA_KIND.ROM, detectedBy: "extension" };

  // A 256 KiB MegaCart and a standard DDP have the same length. For an
  // extensionless image, a valid Coleco cartridge header takes precedence.
  if (colecoHeader) return { kind: EMULATOR_MEDIA_KIND.ROM, detectedBy: "signature" };

  // Standard ADAM media geometries repair a missing media extension only after
  // cartridge and compressed-file signatures have been excluded.
  if (size === ADAM_DISK_BYTES) return { kind: EMULATOR_MEDIA_KIND.ADAM_DISK, detectedBy: "geometry" };
  if (size === ADAM_DATA_PACK_BYTES) return { kind: EMULATOR_MEDIA_KIND.ADAM_DATA_PACK, detectedBy: "geometry" };
  if (extension === ".dsk") return { kind: EMULATOR_MEDIA_KIND.ADAM_DISK, detectedBy: "extension" };
  if (extension === ".ddp") return { kind: EMULATOR_MEDIA_KIND.ADAM_DATA_PACK, detectedBy: "extension" };
  return null;
}

export function isKnownEmulatorMediaName(name) {
  return /\.(?:rom|col|dsk|ddp)$/i.test(String(name || ""));
}
