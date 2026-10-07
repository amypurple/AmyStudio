function parseHex(value) {
  if (Number.isInteger(value)) return value;
  const text = String(value ?? "").trim().replace(/^\$/, "").replace(/^0x/i, "");
  return /^[0-9a-f]+$/i.test(text) ? Number.parseInt(text, 16) : null;
}

export function amyLogicalBank(address, physicalBank) {
  const pc = parseHex(address);
  const bank = parseHex(physicalBank);
  if (pc == null || bank == null) return null;
  return pc < 0xC000 ? 0 : bank + 1;
}

export function parseGearcolecoCpuTraceLine(line) {
  const text = String(line || "");
  const match = text.match(/\[CPU\]\s+([0-9A-Fa-f]{1,4}):([0-9A-Fa-f]{4})\b/);
  if (!match) return null;
  const physicalBank = Number.parseInt(match[1], 16);
  const address = Number.parseInt(match[2], 16);
  return {
    type: "cpu",
    bank: amyLogicalBank(address, physicalBank),
    physicalBank,
    address,
    line: text
  };
}

export function normalizeGearcolecoTraceLog(trace = {}) {
  const structured = Array.isArray(trace.entries) ? trace.entries : [];
  const entries = structured.map((entry) => {
    const type = String(entry?.type || "").toLowerCase();
    if (type !== "cpu") return { ...entry };
    const address = parseHex(entry.address ?? entry.pc);
    const physicalBank = parseHex(entry.physicalBank ?? entry.physical_bank ?? entry.bank);
    return {
      ...entry,
      type: "cpu",
      bank: amyLogicalBank(address, physicalBank),
      physicalBank,
      address
    };
  });
  if (!entries.length) {
    for (const line of trace.lines || []) {
      const parsed = parseGearcolecoCpuTraceLine(line);
      if (parsed) entries.push(parsed);
    }
  }
  return {
    ...trace,
    format: "amy-instruction-trace",
    version: 1,
    entries
  };
}
