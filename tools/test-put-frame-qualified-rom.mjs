#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-put-frame-qualified-"));
const source = join(temp, "put-frame-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED PUT FRAME ROM TEST"
memory "colecovision_legacy_sdcc"
record FrameData:
  u8 Tiles[4]
end record
overlay WorkRam
  Game as FrameData
  Menu as FrameData
end overlay
u8 Readback[4]
u8 Done = 0
sub start:
  text screen
  WorkRam.Game.Tiles[0] = 41
  WorkRam.Game.Tiles[1] = 42
  WorkRam.Game.Tiles[2] = 43
  WorkRam.Game.Tiles[3] = 44
  put WorkRam.Game.Tiles frame size 2,2 at 0,0
  Readback[0] = get char at 0,0
  Readback[1] = get char at 1,0
  Readback[2] = get char at 0,1
  Readback[3] = get char at 1,1
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
    const asmPath = join(temp, `put-frame-${profile}.asm`);
    const romPath = join(temp, `put-frame-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x50555446 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Readback"), 4)], [41, 42, 43, 44], `${profile}: frame readback`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified put-frame ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

