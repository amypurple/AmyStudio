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
const temp = mkdtempSync(join(tmpdir(), "amy-balloon-crazy-"));

function runFrames(core, count, input = 0) {
  core.setControllerMask(0, input);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
  core.setControllerMask(0, 0);
}

function tap(core, input) {
  runFrames(core, 4, input);
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
  const asm = join(temp, "balloon-crazy.asm");
  const rom = join(temp, "balloon-crazy.rom");
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs",
    "studio/examples-src/balloon-crazy.alexis",
    "--asm", asm,
    "--rom", rom,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

  const core = await GearcolecoTestCore.create({ seed: 0x19851985 });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 900);
    tap(core, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
    runFrames(core, 60);
    const openingText = textScreen(core);
    assert.match(openingText, /BALLOON CRAZY|B A L L O O N/);
    const states = new Set([signature(core)]);

    if (!openingText.includes("B A L L O O N")) tap(core, INPUT.FIRE_LEFT);
    assert.match(textScreen(core), /B A L L O O N/);
    states.add(signature(core));

    const swayFrames = new Set();
    for (let frame = 0; frame < 80; frame += 1) {
      core.runFrame();
      swayFrames.add(Buffer.from(core.readVram(144 * 8, 8)).toString("hex"));
    }
    assert.ok(swayFrames.size >= 2, "balloon string animation did not advance");

    runFrames(core, 360, INPUT.LEFT);
    const gameText = textScreen(core);
    assert.match(gameText, /LEVEL:/);
    assert.match(gameText, /SCORE:/);
    assert.ok([...core.readVram(168 * 8, 8)].some(Boolean), "floor pattern is blank");
    assert.ok([...core.readVram(176 * 8, 8)].some(Boolean), "life pattern is blank");
    states.add(signature(core));
    assert.ok(states.size >= 2, `expected at least two distinct states, got ${states.size}`);
    console.log(`Balloon Crazy runtime test: PASS (${states.size} distinct states, animated balloons, active playfield)`);
  } finally {
    core.destroy();
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
