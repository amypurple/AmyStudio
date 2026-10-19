#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-choose-list-"));
const source = join(temp, "choose-list.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "ARBITRARY MENU TEST"
memory "colecovision_legacy_sdcc"
u8 Choice = 0
u8 Done = 0

sub start:
  text screen
  screen on
  choose menu 0 to 3 into Choice cursor $3E at list MenuSpots sleep after 10 seconds
  Done = 1
  loop forever
end sub

' Deliberately declared after use: forward ROM data must be validated.
data MenuSpots bytes 4,5, 10,5, 16,5, 22,5
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}
async function bootAndWait(bios, rom) {
  const core = await GearcolecoTestCore.create({ seed: 0x4D454E55 });
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  core.setControllerMask(0, 0);
  for (let frame = 0; frame < 90; frame += 1) core.runFrame();
  return core;
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `choose-list-${profile}.asm`);
    const romPath = join(temp, `choose-list-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const rom = readFileSync(romPath);

    const core = await bootAndWait(bios, rom);
    try {
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.RIGHT);
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Choice"), 1)[0], 1, `${profile}: RIGHT did not select the next listed position from choice zero`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Done"), 1)[0], 1, `${profile}: FIRE did not confirm the listed menu`);
    } finally {
      core.destroy();
    }

    const keypadCore = await bootAndWait(bios, rom);
    try {
      keypadCore.setControllerMask(0, GEARCOLECO_TEST_INPUT.KEYPAD_0);
      for (let frame = 0; frame < 3; frame += 1) keypadCore.runFrame();
      keypadCore.setControllerMask(0, 0);
      for (let frame = 0; frame < 8; frame += 1) keypadCore.runFrame();
      assert.equal(keypadCore.readRam(addressOf(asm, "AMY_UVAR_Choice"), 1)[0], 0, `${profile}: keypad 0 did not select choice zero`);
      assert.equal(keypadCore.readRam(addressOf(asm, "AMY_UVAR_Done"), 1)[0], 1, `${profile}: keypad 0 did not confirm the listed menu`);
    } finally {
      keypadCore.destroy();
    }
  }
  console.log(`Arbitrary-position menu ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}

