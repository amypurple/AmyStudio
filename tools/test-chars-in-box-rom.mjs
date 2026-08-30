#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-char-box-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "char-box.alexis");

writeFileSync(source, `project "chars in box ROM test"
memory "colecovision_legacy_sdcc"
tile type solid = $21
record TilePosition:
  u8 X
  u8 Y
end record
overlay Results
  Game as TilePosition
  Menu as TilePosition
end overlay
u8 Passed = 0
sub start:
  text screen
  screen off
  put char $20 at 5,5
  put char $21 at 6,6
  if chars in box 5,5 size 3,3 contain solid goto TypeHit
  goto Done
TypeHit:
  Passed += 1
  if chars in box 5,5 size 3,3 contain $20 goto RawHit
  goto Done
RawHit:
  Passed += 1
  find tile solid under box 40,40 size 24,24 into Results.Game.X,Results.Game.Y
  if Results.Game.X = 6 then Passed += 1
  if Results.Game.Y = 6 then Passed += 1
Done:
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
    const asmPath = join(temp, `char-box-${profile}.asm`);
    const romPath = join(temp, `char-box-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /call GET_BKGRND/, `${profile}: constant 3x3 box should use one frame read`);
    const core = await GearcolecoTestCore.create({ seed: 0x43484152 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 4, `${profile}: scans and qualified find outputs must pass`);
    } finally {
      core.destroy();
    }
  }
  console.log(`chars-in-box/find-tile ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
