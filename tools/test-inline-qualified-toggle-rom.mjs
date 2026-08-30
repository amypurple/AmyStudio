#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-inline-qualified-toggle-"));
const source = join(temp, "inline-qualified-toggle.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "INLINE QUALIFIED TOGGLE ROM TEST"
memory "colecovision_legacy_sdcc"
record State:
  u8 Enabled
  u8 Neighbor
end record
overlay WorkRam
  Game as State
  Menu as State
end overlay
bool PackedA = false
bool PackedB = true
u8 Done = 0
sub start:
  WorkRam.Game.Enabled = 0
  WorkRam.Game.Neighbor = 77
  if PackedB then toggle WorkRam.Game.Enabled
  if PackedB then toggle PackedA
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
    const asmPath = join(temp, `inline-toggle-${profile}.asm`);
    const romPath = join(temp, `inline-toggle-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x544f4747 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: completion marker`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_SCENE_Game_Enabled"), 2)], [1, 77], `${profile}: qualified target and neighbor`);
      const packedAddress = addressOf(asm, "AMY_BOOL_PACK0");
      assert.equal(core.readRam(packedAddress, 1)[0] & 3, 3, `${profile}: packed bool neighbor preservation`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Inline qualified toggle ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

