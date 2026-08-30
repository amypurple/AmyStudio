#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-inline-qualified-vram-"));
const source = join(temp, "inline-qualified-vram.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
writeFileSync(source, `project "INLINE QUALIFIED VRAM ROM TEST"
memory "colecovision_legacy_sdcc"
record TestMemory:
  u8 Tile
  u8 Row[3]
  u8 Block[4]
end record
overlay WorkRam
  Game as TestMemory
  Menu as TestMemory
end overlay
u8 Enabled = 1
u8 Done = 0
sub start:
  text screen
  vpoke vram.name + 98, 11
  vpoke vram.name + 99, 12
  vpoke vram.name + 130, 13
  vpoke vram.name + 131, 14
  if Enabled = 1 then WorkRam.Game.Tile = get char at 2,3
  if Enabled = 1 then WorkRam.Game.Row = get count 3 at 2,3
  if Enabled = 1 then WorkRam.Game.Block = get frame size 2,2 at 2,3
  if Enabled = 1 then put WorkRam.Game.Row count 3 at 5,5
  if Enabled = 1 then put WorkRam.Game.Block frame size 2,2 at 8,6
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
    const asmPath = join(temp, `inline-qualified-${profile}.asm`);
    const romPath = join(temp, `inline-qualified-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x494e4c4e });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_SCENE_Game_Tile"), 8)], [11, 11, 12, 32, 11, 12, 13, 14], `${profile}: qualified RAM results`);
      const nameBase = 0x1800;
      assert.deepEqual([...core.readVram(nameBase + 5 + 5 * 32, 3)], [11, 12, 32], `${profile}: inline put count`);
      assert.deepEqual([...core.readVram(nameBase + 8 + 6 * 32, 2)], [11, 12], `${profile}: inline put frame row 1`);
      assert.deepEqual([...core.readVram(nameBase + 8 + 7 * 32, 2)], [13, 14], `${profile}: inline put frame row 2`);
    } finally { core.destroy(); }
  }
  console.log(`Inline qualified VRAM ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
