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
const temp = mkdtempSync(join(tmpdir(), "amy-new-ports-"));
const fire = INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT;

function runFrames(core, count, port = 0, mask = 0) {
  core.setControllerMask(port, mask);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
  core.setControllerMask(port, 0);
}

function tap(core, mask, port = 0) {
  runFrames(core, 4, port, mask);
  runFrames(core, 45);
}

function textScreen(core) {
  return String.fromCharCode(...core.readVram(0x1800, 32 * 24));
}

function signature(core) {
  let hash = 2166136261;
  for (const value of core.getFramebuffer().pixels) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function audioEnergy(core, frames) {
  let energy = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    core.runFrame();
    for (const sample of core.getAudioFrame().samples) energy += Math.abs(sample);
  }
  return energy;
}

async function buildAndBoot(id) {
  const asm = join(temp, `${id}.asm`);
  const rom = join(temp, `${id}.rom`);
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs", `studio/examples-src/${id}.alexis`,
    "--asm", asm, "--rom", rom, "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${id} compile failed:\n${build.stdout || ""}${build.stderr || ""}`);
  const core = await GearcolecoTestCore.create({ seed: 0x19840684 });
  core.loadBios(bios);
  core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
  return core;
}

try {
  const pentominos = await buildAndBoot("pentominos");
  try {
    const music = audioEnergy(pentominos, 900);
    assert.match(textScreen(pentominos), /PENTOMINOS[\s\S]*JIM BUTTERFIELD/);
    assert.ok(music > 0, "Pentominos title tune was silent");
    tap(pentominos, fire);
    assert.match(textScreen(pentominos), /CHOOSE THE BOARD:[\s\S]*6 BY 10/);
    tap(pentominos, fire);
    assert.match(textScreen(pentominos), /SPEED:[\s\S]*WATCH EACH MOVE[\s\S]*FAST/);
    tap(pentominos, INPUT.DOWN);
    tap(pentominos, INPUT.DOWN);
    tap(pentominos, fire);
    runFrames(pentominos, 180);
    assert.match(textScreen(pentominos), /PENTOMINOS[\s\S]*TRIES[\s\S]*SOLUTIONS/);
    assert.ok(new Set(pentominos.readVram(0x1800, 32 * 24)).size > 5,
      "Pentominos solver did not render a changing board");
  } finally {
    pentominos.destroy();
  }

  const olympiad = await buildAndBoot("olympiad");
  try {
    const music = audioEnergy(olympiad, 900);
    assert.match(textScreen(olympiad), /OLYMPIAD[\s\S]*KEVIN WORAM/);
    assert.ok(music > 0, "Olympiad title tune was silent");
    tap(olympiad, fire);
    assert.match(textScreen(olympiad), /THE ENCHANTED ARENA[\s\S]*TWO PLAYERS/);
    tap(olympiad, fire);
    runFrames(olympiad, 150);
    assert.match(textScreen(olympiad), /OLYMPIAD/);
    const before = signature(olympiad);
    runFrames(olympiad, 35, 0, INPUT.RIGHT);
    runFrames(olympiad, 35, 1, INPUT.LEFT);
    assert.notEqual(signature(olympiad), before, "Olympiad ignored both players' movement");
    assert.ok([...olympiad.readVram(0x1B00, 16)].some((value) => value !== 0 && value !== 0xD0),
      "Olympiad knight sprites were not uploaded");
  } finally {
    olympiad.destroy();
  }

  for (const testCase of [
    { id: "bunny-hop", inputs: [fire, fire] },
    { id: "jackpot", inputs: [fire, fire] },
    { id: "devastator", inputs: [fire, fire, fire] },
  ]) {
    const core = await buildAndBoot(testCase.id);
    try {
      runFrames(core, 900);
      const states = new Set([signature(core)]);
      for (const input of testCase.inputs) {
        tap(core, input);
        runFrames(core, 90);
        states.add(signature(core));
      }
      assert.ok(states.size >= 3, `${testCase.id} did not advance through its opening screens`);
      assert.ok(new Set(core.getFramebuffer().pixels).size >= 2, `${testCase.id} rendered a blank screen`);
    } finally {
      core.destroy();
    }
  }

  console.log("New magazine ports runtime test: PASS (five builds, editorials, menus, music and gameplay)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
