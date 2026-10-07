const FNV_OFFSET = 0xCBF29CE484222325n;
const FNV_PRIME = 0x100000001B3n;

function hashByte(hash, value) {
  return BigInt.asUintN(64, (hash ^ BigInt(value & 0xFF)) * FNV_PRIME);
}

export function fingerprintBuildInputs(...parts) {
  let hash = FNV_OFFSET;
  const encoder = new TextEncoder();
  for (const part of parts) {
    const bytes = part instanceof Uint8Array ? part : encoder.encode(String(part ?? ""));
    for (const byte of bytes) hash = hashByte(hash, byte);
    hash = hashByte(hash, 0);
  }
  return hash.toString(16).padStart(16, "0");
}

export async function cachedBuildStep(cache, key, fingerprint, produce) {
  const previous = cache instanceof Map ? cache.get(key) : null;
  if (previous?.fingerprint === fingerprint) return { value: previous.value, reused: true };
  const value = await produce();
  if (cache instanceof Map) cache.set(key, { fingerprint, value });
  return { value, reused: false };
}
