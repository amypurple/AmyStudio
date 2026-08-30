#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-put-count-qualified-"));
const source = join(temp, "put-count-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED PUT COUNT ROM TEST"
memory "colecovision_legacy_sdcc"
record RowData:
  u8 Tiles[4]
end record
overlay WorkRam
  Game as RowData
  Menu as RowData
end overlay
u8 Readback[4]
u8 Done = 0
sub start:
  text screen
  WorkRam.Game.Tiles[0] = 51
  WorkRam.Game.Tiles[1] = 52
  WorkRam.Game.Tiles[2] = 53
  WorkRam.Game.Tiles[3] = 54
  put WorkRam.Game.Tiles count 4 at 0,0
  Readback[0] = get char at 0,0
  Readback[1] = get char at 1,0
  Readback[2] = get char at 2,0
  Readback[3] = get char at 3,0
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
    const asmPath = join(temp, `put-count-${profile}.asm`);
    const romPath = join(temp, `put-count-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x50555443 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Readback"), 4)], [51, 52, 53, 54], `${profile}: row readback`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified put-count ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

