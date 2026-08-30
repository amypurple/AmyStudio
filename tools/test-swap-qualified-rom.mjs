#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-swap-qualified-"));
const source = join(temp, "swap-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "SWAP QUALIFIED ROM TEST"
memory "colecovision_legacy_sdcc"
record State:
  u8 Bytes[4]
  u16 Words[3]
  u8 Guard
end record
overlay WorkRam
  Game as State
  Menu as State
end overlay
u8 LeftIndex = 0
u8 RightIndex = 3
u8 Done = 0
sub start:
  WorkRam.Game.Bytes[0] = 11
  WorkRam.Game.Bytes[3] = 44
  WorkRam.Game.Words[0] = 1000
  WorkRam.Game.Words[2] = 60000
  WorkRam.Game.Guard = 77
  swap WorkRam.Game.Bytes[LeftIndex] with WorkRam.Game.Bytes[RightIndex]
  swap WorkRam.Game.Words[LeftIndex] with WorkRam.Game.Words[2]
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
    const asmPath = join(temp, `swap-${profile}.asm`);
    const romPath = join(temp, `swap-${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x53574150 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const done = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(done, 1)[0], 1, `${profile}: completion marker`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_SCENE_Game_Bytes"), 11)], [44,0,0,11,0x60,0xEA,0,0,0xE8,3,77], `${profile}: byte/word swaps and guard`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified swap ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

