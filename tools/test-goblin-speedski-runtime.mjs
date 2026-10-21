#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT as INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
const temp = mkdtempSync(join(tmpdir(), "amy-goblin-speedski-"));

function compile(id, expectedSize) {
  const rom = join(temp, id + ".rom");
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs", "studio/examples-src/" + id + ".alexis", "--rom", rom, "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, String(build.error?.stack || "") + (build.stdout || "") + (build.stderr || ""));
  const bytes = readFileSync(rom);
  assert.equal(bytes.length, expectedSize, id + " occupied ROM size changed");
  return bytes;
}

function textScreen(core) {
  return String.fromCharCode(...core.readVram(0x1800, 32 * 24));
}

async function play(rom, taps, directions, frames) {
  const core = await GearcolecoTestCore.create({ seed: 0x20261020 });
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < frames; frame += 1) {
    let mask = 0;
    if (taps.some(start => frame >= start && frame < start + 20)) mask |= INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT;
    for (const [start, end, direction] of directions) {
      if (frame >= start && frame < end) mask |= direction;
    }
    core.setControllerMask(0, mask);
    core.runFrame();
  }
  return core;
}

try {
  const goblinRom = compile("goblin", 3227);
  const goblin = await play(goblinRom, [450, 1000], [
    [1120, 1250, INPUT.LEFT], [1280, 1400, INPUT.RIGHT],
  ], 1450);
  try {
    assert.match(textScreen(goblin), /G O B L I N/);
    const field = goblin.readVram(0x1800, 32 * 24);
    assert.ok(field.includes(128) || field.includes(130), "Goblin player/crash tile is absent");
    assert.ok(field.includes(129), "Goblin barriers are absent");
    assert.ok(field.includes(131) || field.includes(132), "Goblin creatures are absent");
  } finally {
    goblin.destroy();
  }

  const skiRom = compile("speedski", 6436);
  const ski = await play(skiRom, [450, 1000, 1120, 1220, 1320], [
    [1550, 1660, INPUT.LEFT], [1690, 1810, INPUT.RIGHT],
  ], 1900);
  try {
    assert.match(textScreen(ski), /SKIER 1/);
    const field = ski.readVram(0x1800, 32 * 24);
    assert.ok(field.includes(133), "Speed Ski fences are absent");
    assert.ok(field.includes(128) || field.includes(132), "Speed Ski hazards are absent");
    const sprite = ski.readVram(0x1b00, 4);
    assert.ok(sprite[0] < 192, "Speed Ski player sprite is hidden at Y=" + sprite[0]);
  } finally {
    ski.destroy();
  }

  console.log("Goblin + Speed Ski runtime test: PASS (3227 + 6436 bytes, playable scenes verified)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}

