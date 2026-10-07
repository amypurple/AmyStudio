import {
  getMegaCartLayout,
  MEGACART_BANK_BYTES,
  MEGACART_SWITCHABLE_BYTES
} from "./megaCartImage.js";

function normalizedSymbols(symbols, section) {
  const seen = new Set();
  return (symbols || []).map((entry) => {
    const name = String(entry?.name || "").trim();
    const address = Number(entry?.address);
    if (!name) throw new Error(`MegaCart ${section.id} contains an unnamed symbol.`);
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate symbol '${name}' in MegaCart ${section.id}.`);
    if (!Number.isInteger(address) || address < section.logicalStart || address >= section.logicalEnd) {
      throw new RangeError(`MegaCart ${section.id} symbol '${name}' is outside $${section.logicalStart.toString(16)}-$${(section.logicalEnd - 1).toString(16)}.`);
    }
    seen.add(key);
    return Object.freeze({
      name,
      address,
      bank: section.logicalBank,
      qualifiedName: `${section.namespace}:${name}`
    });
  });
}

function normalizedSourceMap(sourceMap, section) {
  if (!sourceMap || !Array.isArray(sourceMap.entries)) return null;
  const entries = sourceMap.entries.map((entry) => {
    const addresses = (entry.addresses || []).filter((address) => address >= section.logicalStart && address < section.logicalEnd);
    return Object.freeze({
      ...entry,
      bank: section.logicalBank,
      addresses: Object.freeze(addresses),
      qualifiedAddresses: Object.freeze(addresses.map((address) => Object.freeze({
        bank: section.logicalBank,
        address,
        fileOffset: section.fileOffset + address - section.logicalStart
      })))
    });
  });
  return Object.freeze({ ...sourceMap, bank: section.logicalBank, entries: Object.freeze(entries) });
}

function makeSection({ id, kind, logicalBank, physicalBank, logicalStart, capacity, used, symbols, sourceMap }) {
  if (!Number.isInteger(used) || used < 0 || used > capacity) {
    throw new RangeError(`MegaCart ${id} overflow: ${used} / ${capacity} bytes.`);
  }
  const namespace = kind === "fixed" ? "fixed" : `bank:${logicalBank}`;
  const section = {
    id,
    kind,
    namespace,
    logicalBank,
    physicalBank,
    logicalStart,
    logicalEnd: logicalStart + capacity,
    fileOffset: physicalBank * MEGACART_BANK_BYTES,
    capacity,
    used,
    free: capacity - used
  };
  return Object.freeze({
    ...section,
    symbols: normalizedSymbols(symbols, section),
    sourceMap: normalizedSourceMap(sourceMap, section)
  });
}

export function buildMegaCartLinkMap({ sizeKb, fixedBank, switchableBanks = [] }) {
  const layout = getMegaCartLayout(sizeKb);
  const sections = [makeSection({
    id: "fixed",
    kind: "fixed",
    logicalBank: 0,
    physicalBank: layout.fixedBank,
    logicalStart: layout.fixedAddress,
    capacity: MEGACART_BANK_BYTES,
    used: Number(fixedBank?.bytes?.length ?? fixedBank?.length ?? 0),
    symbols: fixedBank?.symbols,
    sourceMap: fixedBank?.sourceMap
  })];
  const logicalBanks = new Set();
  for (const entry of switchableBanks) {
    const logicalBank = Number(entry.logicalBank ?? entry.bank);
    if (!Number.isInteger(logicalBank) || logicalBank < 1 || logicalBank >= layout.bankCount) {
      throw new RangeError(`MegaCart logical bank must be between 1 and ${layout.bankCount - 1}.`);
    }
    if (logicalBanks.has(logicalBank)) throw new Error(`Duplicate MegaCart logical bank ${logicalBank}.`);
    logicalBanks.add(logicalBank);
    sections.push(makeSection({
      id: entry.id || `bank ${logicalBank}`,
      kind: "switchable",
      logicalBank,
      physicalBank: logicalBank - 1,
      logicalStart: layout.switchableAddress,
      capacity: MEGACART_SWITCHABLE_BYTES,
      used: Number(entry.bytes?.length ?? entry.length ?? 0),
      symbols: entry.symbols,
      sourceMap: entry.sourceMap
    }));
  }
  const symbols = sections.flatMap((section) => section.symbols);
  return Object.freeze({ layout, sections: Object.freeze(sections), symbols: Object.freeze(symbols) });
}

export function resolveMegaCartSymbol(linkMap, name, bank = null) {
  const wanted = String(name || "").trim().toLowerCase();
  const matches = (linkMap?.symbols || []).filter((symbol) => {
    if (symbol.name.toLowerCase() !== wanted && symbol.qualifiedName.toLowerCase() !== wanted) return false;
    return bank == null || symbol.bank === Number(bank);
  });
  if (matches.length > 1) throw new Error(`Ambiguous MegaCart symbol '${name}'; qualify it with a bank.`);
  return matches[0] || null;
}
