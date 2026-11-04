#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-data-compound-bitwise-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "data-compound-bitwise.alexis");

writeFileSync(source, `project "DATA COMPOUND BITWISE"
memory "colecovision_legacy_sdcc"
data Bits bytes = $0F,$33,$55,$81
u8 G = 2
u8 OrResult = $80
u8 AndResult = $F3
u8 XorResult = $FF
u8 Done = 0
sub start:
  nmi off
  OrResult |= Bits[G]
  AndResult &= Bits[G]
  XorResult ^= Bits[G]
  Done = 1
  loop forever
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || result.error || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x42495453 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const done = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 30 && core.readRam(done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(done, 1)[0], 1, `${profile}: completion marker`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_OrResult"), 1)[0], 0xD5, `${profile}: ROM table |=`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_AndResult"), 1)[0], 0x51, `${profile}: ROM table &=`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_XorResult"), 1)[0], 0xAA, `${profile}: ROM table ^=`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Data-table compound bitwise: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
