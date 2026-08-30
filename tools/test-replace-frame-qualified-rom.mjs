#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-replace-frame-qualified-"));
const source = join(temp, "replace-frame-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED REPLACE FRAME ROM TEST"
memory "colecovision_legacy_sdcc"

record Results:
  u8 Tiles[6]
  u8 Changed[2]
end record
overlay WorkRam
  Game as Results
  Menu as Results
end overlay
u8 Index = 1
u8 Done = 0

sub start:
  WorkRam.Game.Tiles[0] = 1
  WorkRam.Game.Tiles[1] = 2
  WorkRam.Game.Tiles[2] = 1
  WorkRam.Game.Tiles[3] = 3
  WorkRam.Game.Tiles[4] = 1
  WorkRam.Game.Tiles[5] = 4
  replace 1 with 0 in WorkRam.Game.Tiles frame size 3,2 into WorkRam.Game.Changed[Index]
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
    const asmPath = join(temp, `replace-frame-${profile}.asm`);
    const romPath = join(temp, `replace-frame-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x5245504c });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      assert.equal(core.readRam(addressOf(asm, "AMY_SCENE_Game_Changed") + 1, 1)[0], 3, `${profile}: replacement count`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_SCENE_Game_Tiles"), 6)], [0, 2, 0, 3, 0, 4], `${profile}: replaced bytes`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified replace-frame count ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
