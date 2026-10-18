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
const temp = mkdtempSync(join(tmpdir(), "amy-beethoven-medley-"));

function runFrames(core, count, observeAudio = null) {
  for (let frame = 0; frame < count; frame += 1) {
    core.runFrame();
    if (observeAudio) {
      const { samples } = core.getAudioFrame();
      for (const sample of samples) observeAudio.energy += Math.abs(sample);
    }
  }
}

function tap(core, input) {
  core.setControllerMask(0, input);
  runFrames(core, 4);
  core.setControllerMask(0, 0);
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
  const asm = join(temp, "beethoven-medley.asm");
  const rom = join(temp, "beethoven-medley.rom");
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs",
    "studio/examples-src/beethoven-medley.alexis",
    "--asm", asm,
    "--rom", rom,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

  const core = await GearcolecoTestCore.create({ seed: 0x18271827 });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 900);
    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    runFrames(core, 60);
    const opening = textScreen(core);
    assert.match(opening, /BEETHOVEN MEDLEY/);

    if (opening.includes("PRESS FIRE TO BEGIN")) tap(core, INPUT.FIRE_LEFT);
    const audio = { energy: 0 };
    const states = new Set();
    for (const interval of [120, 300, 600, 900, 1300]) {
      runFrames(core, interval, audio);
      states.add(signature(core));
    }
    assert.ok(audio.energy > 0, "medley produced no audible samples");
    assert.ok(states.size >= 5, `drawing did not progress through five distinct states (${states.size})`);
    assert.ok([...core.readVram(160 * 8, 32 * 8)].some(Boolean), "final scene graphics are blank");

    const animationFrames = new Set();
    for (let frame = 0; frame < 100; frame += 1) {
      core.runFrame();
      animationFrames.add(Buffer.from(core.readVram(192 * 8, 16)).toString("hex"));
    }
    assert.ok(animationFrames.size >= 2, "musical-note animation did not continue on the held picture");
    console.log(`Beethoven Medley runtime test: PASS (${states.size} synchronized drawing states, audio and held-scene animation)`);
  } finally {
    core.destroy();
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
