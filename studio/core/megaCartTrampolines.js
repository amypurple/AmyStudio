import { resolveMegaCartExport } from "./megaCartLinkMap.js";

export function buildMegaCartImportTrampolines({ imports = [], currentBankLabel, linkMap }) {
  if (!imports.length) return "";
  if (!currentBankLabel) throw new Error("MegaCart imports require active-bank RAM tracking.");
  const lines = ["", "; --- Generated MegaCart import trampolines ---"];
  const seen = new Set();
  for (const entry of imports) {
    const bank = Number(entry?.bank);
    const name = String(entry?.name || "").trim();
    const trampolineLabel = String(entry?.trampolineLabel || "").trim();
    const key = `${bank}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const exported = resolveMegaCartExport(linkMap, name);
    if (!exported || exported.bank !== bank) {
      throw new Error(`MegaCart import '${name}' was not exported by logical bank ${bank}.`);
    }
    if (!/^AMY_UPROC_/i.test(exported.symbol)) {
      throw new Error(`MegaCart import '${name}' must resolve to an Amy sub procedure; '${exported.symbol}' is not callable by CALL BANK.`);
    }
    lines.push(`${trampolineLabel}:`);
    lines.push(`    ld a,(${currentBankLabel})`);
    lines.push("    push af");
    lines.push(`    ld a,($${(0xFFC0 + bank - 1).toString(16).toUpperCase()})`);
    lines.push("    push af");
    lines.push(`    ld a,${bank}`);
    lines.push(`    ld (${currentBankLabel}),a`);
    lines.push("    pop af");
    lines.push(`    call $${exported.address.toString(16).toUpperCase().padStart(4, "0")}`);
    lines.push("    pop bc");
    lines.push("    ld a,b");
    lines.push("    dec a");
    lines.push("    add a,$C0");
    lines.push("    ld l,a");
    lines.push("    ld h,$FF");
    lines.push("    ld a,(hl)");
    lines.push("    push af");
    lines.push("    ld a,b");
    lines.push(`    ld (${currentBankLabel}),a`);
    lines.push("    pop af");
    lines.push("    ret", "");
  }
  return lines.join("\n");
}
