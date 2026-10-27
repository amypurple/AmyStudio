#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-data-byte-u16-index-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `u16 Uw = 255
u8 Ub = 255
i16 Sw = 256
u8 At255 = 0
u8 At256 = 0
u8 At359 = 0
u8 AtExpr = 0
u8 AtByte = 0
u8 AtSigned = 0
At255 = T[Uw]
Uw += 1
At256 = T[Uw]
Uw = 359
At359 = T[Uw]
Uw = 250
AtExpr = T[Uw + 6]
AtByte = T[Ub]
AtSigned = T[Sw]
loop forever
data T bytes
  $00 count 255
  $44
  $A5
  $00 count 102
  $5A
end data
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  const sourcePath = join(temp, "data-byte-u16-index.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const romPath = join(temp, `data-byte-u16-index-${profile}.rom`);
    const asmPath = join(temp, `data-byte-u16-index-${profile}.asm`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--rom", romPath, "--asm", asmPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /ld hl,\(AMY_UVAR_Uw\)[\s\S]*?ld de,AMY_UDATA_T[\s\S]*?add hl,de[\s\S]*?ld a,\(hl\)/i, `${profile}: u16 DATA index did not use a 16-bit address`);
    assert.match(asm, /ld a,\(AMY_UVAR_Ub\)[\s\S]*?ld e,a\s+ld d,0[\s\S]*?ld hl,AMY_UDATA_T/i, `${profile}: u8 DATA index lost its compact address path`);
    const core = await GearcolecoTestCore.create({ seed: 0x55313649 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      const values = ["At255", "At256", "At359", "AtExpr", "AtByte", "AtSigned"].map(name => core.readRam(addressOf(asm, `AMY_UVAR_${name}`), 1)[0]);
      assert.deepEqual(values, [0x44, 0xA5, 0x5A, 0xA5, 0x44, 0xA5], `${profile}: DATA indexing crossed a page incorrectly`);
    } finally {
      core.destroy();
    }
  }
  console.log(`DATA byte u16 indexing: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
