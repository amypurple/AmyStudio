#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-fill-record-array-qualified-"));
const source = join(temp, "fill-record-array-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED FILL RECORD ARRAY ROM TEST"
memory "colecovision_legacy_sdcc"
record Actor:
  u8 X
  u16 Score
  i8 DX
end record
record GameMemory:
  u8 Before
  Actor Actors[3]
  u8 After
end record
overlay SceneRam
  Game as GameMemory
  Menu as GameMemory
end overlay
u8 Done = 0
sub start:
  SceneRam.Game.Before = $A5
  SceneRam.Game.After = $5A
  SceneRam.Game.Actors[0].Score = $1234
  SceneRam.Game.Actors[1].DX = -2
  SceneRam.Game.Actors[2].Score = $5678
  fill record array SceneRam.Game.Actors field X with 7
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
    const asmPath = join(temp, `fill-record-array-${profile}.asm`);
    const romPath = join(temp, `fill-record-array-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x52454344 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      const base = addressOf(asm, "AMY_SCENE_Game_Before");
      assert.deepEqual([...core.readRam(base, 14)], [0xA5, 7, 0x34, 0x12, 0, 7, 0, 0, 0xFE, 7, 0x78, 0x56, 0, 0x5A], `${profile}: strided field fill and guards`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified fill-record-array ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
