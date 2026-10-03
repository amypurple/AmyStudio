export const ADAM_FIRMWARE_STORAGE_KEY = "amy_adam_firmware_v1";
export const ADAM_FIRMWARE_SIZES = Object.freeze({ os7: 8192, eos: 8192, smartwriter: 32768 });

function normalizeImage(bytes, kind) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const expected = ADAM_FIRMWARE_SIZES[kind];
  if (value.length !== expected) throw new Error(`ADAM ${kind.toUpperCase()} ROM must be exactly ${expected} bytes.`);
  return value;
}
function encodeBase64(bytes) {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x2000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x2000));
  return btoa(binary);
}
function decodeBase64(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}
export function normalizeAdamFirmware(images) {
  return { os7: normalizeImage(images?.os7, "os7"), eos: normalizeImage(images?.eos, "eos"), smartwriter: normalizeImage(images?.smartwriter, "smartwriter") };
}
export function saveAdamFirmwareToBrowser(images, storage = globalThis.localStorage) {
  const firmware = normalizeAdamFirmware(images);
  storage.setItem(ADAM_FIRMWARE_STORAGE_KEY, JSON.stringify({
    version: 1,
    images: Object.fromEntries(Object.entries(firmware).map(([kind, bytes]) => [kind, encodeBase64(bytes)]))
  }));
  return firmware;
}
export function loadAdamFirmwareFromBrowser(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(ADAM_FIRMWARE_STORAGE_KEY) || "null");
    if (!saved) return null;
    return normalizeAdamFirmware(Object.fromEntries(Object.entries(saved.images || {}).map(([kind, value]) => [kind, decodeBase64(value)])));
  } catch { return null; }
}
export function clearAdamFirmwareFromBrowser(storage = globalThis.localStorage) {
  storage.removeItem(ADAM_FIRMWARE_STORAGE_KEY);
}

export async function loadLocalAdamFirmware(baseUrl = "./bios/adam") {
  const load = async (name) => {
    const response = await fetch(`${baseUrl}/${name}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${name} is not available locally.`);
    return new Uint8Array(await response.arrayBuffer());
  };
  return normalizeAdamFirmware({
    os7: await load("OS7.ROM"),
    eos: await load("EOS.ROM"),
    smartwriter: await load("WP.ROM")
  });
}
