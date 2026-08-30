#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-get-char-qualified-"));
const source = join(temp, "get-char-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED GET CHAR ROM TEST"
memory "colecovision_legacy_sdcc"

record Results:
  u8 Tiles[2]
end record
overlay WorkRam
  Game as Results
  Menu as Results
end overlay
u8 Values[2]
u8 Index = 1
u8 LocalResult = 0
u8 Done = 0

sub start:
  text screen
  put char 41 at 0,0
  put char 42 at 1,0
  put char 43 at 2,0
  Values[Index] = get char at 0,0
  WorkRam.Game.Tiles[Index] = get char at 1,0
  ReadLocal
  Done = 1
  loop forever
end sub

sub ReadLocal:
  u8 LocalTiles[2]
  LocalTiles[Index] = get char at 2,0
  LocalResult = LocalTiles[Index]
  return
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
    const asmPath = join(temp, `get-char-${profile}.asm`);
    const romPath = join(temp, `get-char-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x47455443 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Values") + 1, 1)[0], 41, `${profile}: indexed array`);
      assert.equal(core.readRam(addressOf(asm, "AMY_SCENE_Game_Tiles") + 1, 1)[0], 42, `${profile}: overlay field`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_LocalResult"), 1)[0], 43, `${profile}: local array`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified get-char ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

