#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const romPath = resolve(process.argv[2] || resolve(root, "build/santas-sleigh-run.rom"));
const core = await GearcolecoTestCore.create({ seed: 0x584d4153 });

const screenText = () => String.fromCharCode(...core.readVram(0x1800, 768));
const runUntil = (pattern, limit, message) => {
  for (let frame = 0; frame < limit; frame += 1) {
    core.runFrame();
    if ((frame & 7) === 7 && pattern.test(screenText())) return;
  }
  assert.fail(`${message}; PC=$${core.getPc().toString(16)}; screen=${JSON.stringify(screenText())}`);
};
const tapFire = () => {
  core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  for (let frame = 0; frame < 8; frame += 1) core.runFrame();
  core.setControllerMask(0, 0);
  for (let frame = 0; frame < 8; frame += 1) core.runFrame();
};

try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
  runUntil(/SANTA'S SLEIGH RUN[\s\S]*PRESS FIRE TO START/, 1200, "Santa title page did not appear");
  tapFire();
  runUntil(/SCORE 00000[\s\S]*GIFTS 8[\s\S]*LEVEL 01/, 900, "Santa game did not reach the playable HUD");
  console.log(`Santa's Sleigh Run runtime: PASS (${romPath})`);
} finally {
  core.destroy();
}
