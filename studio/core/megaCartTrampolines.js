import { resolveMegaCartExport } from "./megaCartLinkMap.js";

export function buildMegaCartImportTrampolines({ imports = [], currentBankLabel, linkMap }) {
  if (!imports.length) return "";
  if (!currentBankLabel) throw new Error("MegaCart imports require active-bank RAM tracking.");
  const lines = ["", "; --- Generated MegaCart import trampolines ---"];
  const seen = new Set();
  for (const entry of imports) {
    const bank = Number(entry?.bank);
    const name = String(entry?.name || "").trim();
    const kind = String(entry?.kind || "procedure").trim().toLowerCase();
    const operation = String(entry?.operation || "call").trim().toLowerCase();
    const codec = String(entry?.codec || "").trim().toLowerCase();
    const trampolineLabel = String(entry?.trampolineLabel || "").trim();
    const key = `${kind}:${operation}:${codec}:${bank}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const exported = resolveMegaCartExport(linkMap, name);
    if (!exported || exported.bank !== bank) {
      throw new Error(`MegaCart import '${name}' was not exported by logical bank ${bank}.`);
    }
    if (kind === "procedure" && !/^AMY_UPROC_/i.test(exported.symbol)) {
      throw new Error(`MegaCart import '${name}' must resolve to an Amy sub procedure; '${exported.symbol}' is not callable by CALL BANK.`);
    }
    if (kind === "data" && !/^AMY_UDATA_/i.test(exported.symbol)) throw new Error(`MegaCart import '${name}' must resolve to Amy data; '${exported.symbol}' is not valid banked data.`);
    if (kind !== "procedure" && kind !== "data") throw new Error(`Unsupported MegaCart import kind '${kind}'.`);
    if (kind === "data" && !/^(?:decompress-vram|copy-vram|copy-ram)$/.test(operation)) throw new Error(`Unsupported MegaCart data operation '${operation}'.`);
    if (kind === "data" && operation === "decompress-vram" && !/^(?:zx0|zx1|zx2|zx7|aplib|megalz|exomizer|msc1|dan1|dan2|dan3|mdkrle|pletter|lzf|bitbuster|nibble)$/.test(codec)) throw new Error(`Unsupported MegaCart decompression codec '${codec}'.`);
    lines.push(`${trampolineLabel}:`);
    lines.push(`    ld a,(${currentBankLabel})`);
    lines.push("    push af");
    lines.push(`    ld a,($${(0xFFC0 + bank - 1).toString(16).toUpperCase()})`);
    lines.push("    push af");
    lines.push(`    ld a,${bank}`);
    lines.push(`    ld (${currentBankLabel}),a`);
    lines.push("    pop af");
    if (kind === "data") {
      lines.push(`    ld hl,$${exported.address.toString(16).toUpperCase().padStart(4, "0")}`);
      if (operation === "copy-vram") lines.push("    call AMY_COPY_BYTES_TO_VRAM");
      else if (operation === "copy-ram") lines.push("    ldir");
      else lines.push(`    call ${codec}_decompress`);
    } else {
      lines.push(`    call $${exported.address.toString(16).toUpperCase().padStart(4, "0")}`);
    }
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
