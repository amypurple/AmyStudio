export const ADAM_FIRMWARE_STORAGE_KEY = "amy_adam_firmware_v1";
export const ADAM_FIRMWARE_SIZES = Object.freeze({ os7: 8192, eos: 8192, smartwriter: 32768 });

function normalizeImage(bytes, kind) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const expected = ADAM_FIRMWARE_SIZES[kind];
  if (value.length !== expected) {
    throw new Error(`ADAM ${kind.toUpperCase()} ROM must be exactly ${expected} bytes (${expected / 1024} KiB).`);
  }
  return value;
}

function encodeBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x2000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x2000));
  }
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

export function normalizeAdamFirmware(images) {
  return {
    os7: normalizeImage(images?.os7, "os7"),
    eos: normalizeImage(images?.eos, "eos"),
    smartwriter: normalizeImage(images?.smartwriter, "smartwriter")
  };
}

export function saveAdamFirmwareToBrowser(images, names = {}, storage = globalThis.localStorage) {
  const firmware = normalizeAdamFirmware(images);
  storage.setItem(ADAM_FIRMWARE_STORAGE_KEY, JSON.stringify({
    version: 1,
    images: Object.fromEntries(Object.entries(firmware).map(([kind, bytes]) => [kind, {
      name: String(names[kind] || (kind === "smartwriter" ? "WP.ROM" : `${kind.toUpperCase()}.ROM`)),
      base64: encodeBase64(bytes)
    }]))
  }));
  return firmware;
}

export function loadAdamFirmwareFromBrowser(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(ADAM_FIRMWARE_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const firmware = normalizeAdamFirmware({
      os7: decodeBase64(saved?.images?.os7?.base64),
      eos: decodeBase64(saved?.images?.eos?.base64),
      smartwriter: decodeBase64(saved?.images?.smartwriter?.base64)
    });
    return {
      ...firmware,
      names: {
        os7: String(saved.images.os7.name || "OS7.ROM"),
        eos: String(saved.images.eos.name || "EOS.ROM"),
        smartwriter: String(saved.images.smartwriter.name || "WP.ROM")
      }
    };
  } catch {
    try { storage.removeItem(ADAM_FIRMWARE_STORAGE_KEY); } catch {}
    return null;
  }
}

export function clearAdamFirmwareFromBrowser(storage = globalThis.localStorage) {
  storage.removeItem(ADAM_FIRMWARE_STORAGE_KEY);
}
