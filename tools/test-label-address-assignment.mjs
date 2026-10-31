#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const compiler = join(root, "tools", "amyc.mjs");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-label-address-"));

try {
  const source = join(temp, "label-address.alexis");
  writeFileSync(source, [
    'data Msg chars "AB{0}"',
    "u16 P = 0",
    "u16 Offset = 2",
    "u16 Q = 0",
    "P = @Msg",
    "Q = Offset + @Msg",
    "loop forever",
    ""
  ].join("\n"));

  for (const profile of profiles) {
    const asm = join(temp, `${profile}.asm`);
    const rom = join(temp, `${profile}.rom`);
    const sym = join(temp, `${profile}.sym`);
    const result = spawnSync(process.execPath, [compiler, source, "--asm", asm, "--rom", rom, "--symbols", sym, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile}: compile failed\n${result.stdout}\n${result.stderr}`);

    const asmText = readFileSync(asm, "utf8");
    assert.match(asmText, /ld hl,AMY_UDATA_Msg/i, `${profile}: data address was not resolved`);
    assert.match(
      asmText,
      /ld hl,\(AMY_UVAR_Offset\)\s*\n\s*push hl\s*\n\s*ld hl,AMY_UDATA_Msg\s*\n\s*ex de,hl\s*\n\s*pop hl\s*\n\s*add hl,de\s*\n\s*ld \(AMY_UVAR_Q\),hl/i,
      `${profile}: runtime label offset was not emitted as 16-bit address arithmetic`
    );
    assert.doesNotMatch(asmText, /ld hl,@/i, `${profile}: invalid @ address reached the assembler`);

    const symbols = readFileSync(sym, "utf8");
    const addressMatch = symbols.match(/^AMY_UDATA_Msg:\s+equ\s+\$([0-9A-Fa-f]{4})/m);
    assert.ok(addressMatch, `${profile}: missing Msg symbol`);
    const address = Number.parseInt(addressMatch[1], 16);
    const bytes = readFileSync(rom);
    const load = Buffer.from([0x21, address & 0xFF, address >>> 8, 0x22, 0x20, 0x70]);
    assert.notEqual(bytes.indexOf(load), -1, `${profile}: assembled ROM does not store Msg address in P`);
  }

  console.log("Data-label address assignment PASS (5 profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
