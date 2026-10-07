export function captureExecutionLocation(core) {
  if (!core || typeof core.getPc !== "function") return null;
  const address = core.getPc() & 0xFFFF;
  const megaCart = typeof core.isMegaCart === "function" && core.isMegaCart();
  if (!megaCart) return { address, bank: null, physicalBank: null };
  const physicalBank = typeof core.getRomBank === "function" ? core.getRomBank() : null;
  if (!Number.isInteger(physicalBank)) return { address, bank: null, physicalBank: null };
  return {
    address,
    bank: address < 0xC000 ? 0 : physicalBank + 1,
    physicalBank
  };
}

export function executionLocationMatches(expected, actual) {
  if (!expected || !actual || expected.address !== actual.address) return false;
  if (expected.bank == null) return true;
  return expected.bank === actual.bank && expected.physicalBank === actual.physicalBank;
}

export function assertExecutionLocation(core, expected, label = "save state") {
  const actual = captureExecutionLocation(core);
  if (!executionLocationMatches(expected, actual)) {
    const format = (location) => location
      ? `${location.bank == null ? "" : `${location.bank}:`}$${location.address.toString(16).toUpperCase().padStart(4, "0")}`
      : "unknown";
    throw new Error(`${label} restored at ${format(actual)} instead of ${format(expected)}.`);
  }
  return actual;
}
