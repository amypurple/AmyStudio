export const COLECO_BIOS_STORAGE_KEY = "amy_colecovision_bios_v1";
export const COLECO_BIOS_SIZE = 8192;

function normalizeBios(bytes) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (value.length !== COLECO_BIOS_SIZE) {
    throw new Error(`ColecoVision BIOS must be exactly ${COLECO_BIOS_SIZE} bytes (8 KiB).`);
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

export function saveColecoBiosToBrowser(bytes, name = "colecovision.rom", storage = globalThis.localStorage) {
  const bios = normalizeBios(bytes);
  storage.setItem(COLECO_BIOS_STORAGE_KEY, JSON.stringify({
    version: 1,
    name: String(name || "colecovision.rom"),
    base64: encodeBase64(bios)
  }));
  return bios;
}

export function loadColecoBiosFromBrowser(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(COLECO_BIOS_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const bytes = normalizeBios(decodeBase64(saved?.base64));
    return { bytes, name: String(saved?.name || "colecovision.rom") };
  } catch {
    try { storage.removeItem(COLECO_BIOS_STORAGE_KEY); } catch {}
    return null;
  }
}

export function clearColecoBiosFromBrowser(storage = globalThis.localStorage) {
  storage.removeItem(COLECO_BIOS_STORAGE_KEY);
}