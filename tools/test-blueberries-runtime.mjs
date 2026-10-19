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
const temp = mkdtempSync(join(tmpdir(), "amy-blueberries-"));

function runFrames(core, count, port1 = 0, port2 = 0) {
  core.setControllerMask(0, port1);
  core.setControllerMask(1, port2);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
  core.setControllerMask(0, 0);
  core.setControllerMask(1, 0);
}

function tap(core, input, port = 0) {
  runFrames(core, 4, port === 0 ? input : 0, port === 1 ? input : 0);
  runFrames(core, 45);
}

function textScreen(core) {
  return String.fromCharCode(...core.readVram(0x1800, 32 * 24));
}

function signature(core) {
  let hash = 2166136261;
  for (const value of core.readVram(0, 0x4000)) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

try {
  const asm = join(temp, "blueberries.asm");
  const rom = join(temp, "blueberries.rom");
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs",
    "studio/examples-src/blueberries.alexis",
    "--asm", asm,
    "--rom", rom,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

  const core = await GearcolecoTestCore.create({ seed: 0x19840784 });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 900);
    assert.match(textScreen(core), /BLUEBERRIES/);

    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    assert.match(textScreen(core), /HOW TO PLAY/);

    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    assert.match(textScreen(core), /PLAYERS[\s\S]*HANDS[\s\S]*LIMIT[\s\S]*START/);

    const optionState = signature(core);
    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    runFrames(core, 180, INPUT.RIGHT, INPUT.LEFT);
    const gameState = signature(core);

    assert.notEqual(gameState, optionState, "starting the game must replace the option screen");
    assert.ok([...core.readVram(128 * 8, 80)].some(Boolean), "farm tile patterns are blank");
    assert.ok([...core.readVram(0x1B00, 32)].some((value) => value !== 0 && value !== 0xD0),
      "farmer sprite table was not uploaded");
    console.log("Blueberries runtime test: PASS (editorial, help, options, two-controller farm play)");
  } finally {
    core.destroy();
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
