#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-put-implicit-qualified-"));
const source = join(temp, "put-implicit-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED IMPLICIT PUT ROM TEST"
memory "colecovision_legacy_sdcc"
record RowData:
  u8 Tiles[4]
end record
overlay WorkRam
  Game as RowData
  Menu as RowData
end overlay
u8 DirectResult = 0
u8 CenterResult = 0
u8 Done = 0
sub start:
  text screen
  WorkRam.Game.Tiles[0] = 61
  WorkRam.Game.Tiles[1] = 62
  WorkRam.Game.Tiles[2] = 63
  WorkRam.Game.Tiles[3] = 64
  put WorkRam.Game.Tiles at 3,0
  put WorkRam.Game.Tiles centered at 1
  DirectResult = get char at 6,0
  CenterResult = get char at 14,1
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
    const asmPath = join(temp, `put-implicit-${profile}.asm`);
    const romPath = join(temp, `put-implicit-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x50555449 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_DirectResult"), 1)[0], 64, `${profile}: direct inferred put`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_CenterResult"), 1)[0], 61, `${profile}: centered inferred put`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified implicit put ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

