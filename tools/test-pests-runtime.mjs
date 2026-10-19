#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT as INPUT,
  GEARCOLECO_TEST_REGION,
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
const temp = mkdtempSync(join(tmpdir(), "amy-pests-"));

function runFrames(core, count, mask = 0) {
  core.setControllerMask(0, mask);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
  core.setControllerMask(0, 0);
}

function runFramesWithAudio(core, count) {
  let energy = 0;
  for (let frame = 0; frame < count; frame += 1) {
    core.runFrame();
    for (const sample of core.getAudioFrame().samples) energy += Math.abs(sample);
  }
  return energy;
}

function tap(core, input) {
  runFrames(core, 4, input);
  runFrames(core, 45);
}

function textScreen(core) {
  return String.fromCharCode(...core.readVram(0x1800, 32 * 24));
}

function symbol(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "mi"));
  assert.ok(match, `missing generated symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const asmPath = join(temp, "pests.asm");
  const romPath = join(temp, "pests.rom");
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs",
    "studio/examples-src/pests.alexis",
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

  const asm = readFileSync(asmPath, "utf8");
  const addresses = {
    jx: symbol(asm, "AMY_UVAR_JX"),
    jy: symbol(asm, "AMY_UVAR_JY"),
    time: symbol(asm, "AMY_UVAR_TimeLeft"),
    flags: symbol(asm, "AMY_BOOL_PACK0"),
  };

  const core = await GearcolecoTestCore.create({ seed: 0x19840684 });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    const titleEnergy = runFramesWithAudio(core, 900);
    assert.match(textScreen(core), /PESTS[\s\S]*KEVIN WORAM/);
    assert.ok(titleEnergy > 0, "title tune produced silent audio");

    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    assert.match(textScreen(core), /GOAL: FUMIGATE EVERY FLOWER[\s\S]*SCORING TABLE/);
    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    runFrames(core, 110);
    assert.match(textScreen(core), /SCORE[\s\S]*LEVEL[\s\S]*TIME/);
    assert.ok([...core.readVram(0x1B00, 16)].some((value) => value !== 0 && value !== 0xD0),
      "Joe's layered sprites were not uploaded");

    const startX = core.readRam(addresses.jx, 1)[0];
    const startY = core.readRam(addresses.jy, 1)[0];
    let moved = false;
    for (const direction of [INPUT.RIGHT, INPUT.DOWN, INPUT.LEFT, INPUT.UP]) {
      runFrames(core, 24, direction);
      const movedX = core.readRam(addresses.jx, 1)[0];
      const movedY = core.readRam(addresses.jy, 1)[0];
      moved ||= movedX !== startX || movedY !== startY;
    }
    assert.ok(moved, "Joe did not move with the joystick");

    const activeGame = core.saveState();
    const weedsBefore = [...core.readVram(0x1800, 32 * 24)]
      .filter((tile) => tile >= 138 && tile <= 140).length;
    runFrames(core, 500);
    const weedsAfter = [...core.readVram(0x1800, 32 * 24)]
      .filter((tile) => tile >= 138 && tile <= 140).length;
    assert.ok(weedsAfter > weedsBefore, `weed growth did not spread (${weedsBefore} -> ${weedsAfter})`);

    let terminalCoverage = "";
    if (typeof core.writeRam === "function") {
      core.loadState(activeGame);
      core.writeRam(addresses.time, [1, 0]);
      runFrames(core, 70);
      assert.match(textScreen(core), /TIME'S UP!/);

      core.loadState(activeGame);
      const flags = core.readRam(addresses.flags, 1)[0];
      core.writeRam(addresses.flags, [flags | 0x02]);
      runFrames(core, 25);
      assert.match(textScreen(core), /LEVEL 01 COMPLETED[\s\S]*TIME BONUS/);
      terminalCoverage = ", level and game-over paths";
    }

    console.log(`Pests runtime test: PASS (music, instructions, movement, weed growth${terminalCoverage})`);
  } finally {
    core.destroy();
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
