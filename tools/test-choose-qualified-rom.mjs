#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-choose-qualified-"));
const source = join(temp, "choose-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED CHOOSE ROM TEST"
memory "colecovision_legacy_sdcc"

record MenuState:
  u8 Choice
end record
overlay MenuRam
  Active as MenuState
  Hidden as MenuState
end overlay
u8 Done = 0

sub start:
  text screen
  MenuRam.Active.Choice = 2
  screen on
  choose menu 1 to 4 into MenuRam.Active.Choice cursor $3E at 6,9 step 2
  Done = 1
  loop forever
end sub

sub KeypadCompileProbe:
  choose keypad 1 to 4 into MenuRam.Active.Choice
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
    const asmPath = join(temp, `choose-qualified-${profile}.asm`);
    const romPath = join(temp, `choose-qualified-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x43484F4F });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 180; frame += 1) core.runFrame();
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 10; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_SCENE_Active_Choice"), 1)[0], 2, `${profile}: overlay menu choice`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Done"), 1)[0], 1, `${profile}: menu did not finish`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified choose ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
