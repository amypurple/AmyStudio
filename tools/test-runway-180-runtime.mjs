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
const temp = mkdtempSync(join(tmpdir(), "amy-runway-180-"));

function runFrames(core, count) {
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
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
  const asm = join(temp, "runway-180.asm");
  const rom = join(temp, "runway-180.rom");
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs",
    "studio/examples-src/runway-180.alexis",
    "--asm", asm,
    "--rom", rom,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

  const core = await GearcolecoTestCore.create({ seed: 0x1801983 });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 900);
    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    runFrames(core, 150);

    const states = new Set([signature(core)]);
    const openingText = textScreen(core);
    assert.match(openingText, /RUNWAY 180|THE COINC PROBLEM/);
    if (!openingText.includes("THE COINC PROBLEM")) tap(core, INPUT.FIRE_LEFT);
    assert.match(textScreen(core), /THE COINC PROBLEM/);
    states.add(signature(core));
    tap(core, INPUT.FIRE_LEFT);
    assert.match(textScreen(core), /1-FOR INSTRUCTIONS/);
    states.add(signature(core));
    tap(core, INPUT.FIRE_LEFT);
    runFrames(core, 180);
    const playfield = core.readVram(0x1800, 32 * 24);
    assert.ok(playfield.includes(128), "playfield did not render the protected sky tile");
    assert.ok(playfield.includes(136), "playfield did not render the protected ground tile");
    assert.ok([...core.readVram(128 * 8, 8)].every(value => value === 0xff), "sky pattern was not preserved");
    assert.ok([...core.readVram(136 * 8, 8)].every(value => value === 0xff), "ground pattern was not preserved");
    states.add(signature(core));
    assert.ok(states.size >= 3, `expected at least three distinct states, got ${states.size}`);
    console.log(`Runway 180 runtime test: PASS (${states.size} distinct states, protected sky/ground tiles)`);
  } finally {
    core.destroy();
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
