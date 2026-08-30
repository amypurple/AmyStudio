#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-for-each-short-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "SHORT FOR EACH ROM"
memory "colecovision_legacy_sdcc"
record Actor:
  u8 X
end record
record SceneState:
  Actor Actors[2]
end record
overlay SceneRam
  Game as SceneState
  Menu as SceneState
end overlay
u8 Values[3]
u8 Rows[2]
u8 Columns[2]
Actor GlobalActors[2]
u8 Sum = 0
u8 Passed = 0
u8 Guard = 99
u8 _EachIndex1 = 77
sub start:
  Values[0] = 1
  Values[1] = 2
  Values[2] = 4
  for each Value in Values
    Sum += Value
  next
  GlobalActors[0].X = 1
  GlobalActors[1].X = 2
  for each ActorValue in GlobalActors
    ActorValue.X += 5
  next ActorValue
  SceneRam.Game.Actors[0].X = 10
  SceneRam.Game.Actors[1].X = 20
  for each ActorValue in SceneRam.Game.Actors
    ActorValue.X += 1
  next
  Rows[0] = 1
  Rows[1] = 2
  Columns[0] = 4
  Columns[1] = 8
  for each RowValue in Rows
    for each ColumnValue in Columns
      Sum += RowValue + ColumnValue
    next
  next
  if Sum = 37 then Passed += 1
  if GlobalActors[0].X = 6 and GlobalActors[1].X = 7 then Passed += 1
  if SceneRam.Game.Actors[0].X = 11 and SceneRam.Game.Actors[1].X = 21 then Passed += 1
  if _EachIndex1 = 77 then Passed += 1
  loop forever
end sub
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const sourcePath = join(temp, `short-${profile}.alexis`);
    const asmPath = join(temp, `short-${profile}.asm`);
    const romPath = join(temp, `short-${profile}.rom`);
    writeFileSync(sourcePath, source);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x45414348 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 4, `${profile}: short for-each assertions`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Guard"), 1)[0], 99, `${profile}: RAM guard`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR__EachIndex1"), 1)[0], 77, `${profile}: hidden index collision`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Short for each ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
