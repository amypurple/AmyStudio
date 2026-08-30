#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-shift-array-qualified-"));
const source = join(temp, "shift-array-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
writeFileSync(source, `project "QUALIFIED SHIFT ARRAY ROM TEST"
memory "colecovision_legacy_sdcc"
record ShiftMemory:
  u8 Before
  u16 Up[4]
  u16 Down[4]
  u8 After
end record
overlay WorkRam
  Game as ShiftMemory
  Menu as ShiftMemory
end overlay
u8 Done = 0
u8 I = 0
sub start:
  WorkRam.Game.Before = $A5
  WorkRam.Game.After = $5A
  for I = 0 to 3
    WorkRam.Game.Up[I] = I + 1
    WorkRam.Game.Down[I] = I + 1
  next I
  shift array WorkRam.Game.Up up 1
  shift array WorkRam.Game.Down down 1
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
    const asmPath = join(temp, `shift-array-${profile}.asm`);
    const romPath = join(temp, `shift-array-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x53484946 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      const base = addressOf(asm, "AMY_SCENE_Game_Before");
      assert.deepEqual([...core.readRam(base, 18)], [0xA5, 2,0, 3,0, 4,0, 4,0, 1,0, 1,0, 2,0, 3,0, 0x5A], `${profile}: word shifts and guards`);
    } finally { core.destroy(); }
  }
  console.log(`Qualified shift-array ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
