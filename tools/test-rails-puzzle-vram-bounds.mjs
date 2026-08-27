#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = process.argv.slice(2).length ? process.argv.slice(2) : ["off", "balanced", "experimental"];
const nameBase = 0x1800;
const nameSize = 32 * 24;

const mutable = (offset) => {
  const x = offset % 32;
  const y = Math.floor(offset / 32);
  return (x >= 9 && x <= 22 && y >= 8 && y <= 21)
    || (y === 6 && x >= 9 && x <= 21 && ((x - 9) & 1) === 0)
    || (x === 8 && y >= 8 && y <= 20 && ((y - 8) & 1) === 0);
};

const input = (frame) => ({
  2: GEARCOLECO_TEST_INPUT.FIRE_LEFT,
  10: GEARCOLECO_TEST_INPUT.RIGHT,
  18: GEARCOLECO_TEST_INPUT.FIRE_RIGHT,
  26: GEARCOLECO_TEST_INPUT.DOWN,
  34: GEARCOLECO_TEST_INPUT.LEFT,
  42: GEARCOLECO_TEST_INPUT.UP
})[frame % 48] || 0;

const compile = (profile, dir) => new Promise((done, fail) => {
  const child = spawn(process.execPath, ["tools/check-examples.mjs", "--assemble", "--only", "train-track-puzzle", "--optimization", profile, "--rom-dir", dir], { cwd: root, stdio: "inherit" });
  child.on("error", fail);
  child.on("exit", (code) => code === 0 ? done() : fail(new Error(`Rails compile failed (${profile}): ${code}`)));
});

for (const profile of profiles) {
  const dir = await mkdtemp(join(tmpdir(), `amy-rails-vram-${profile}-`));
  try {
    await compile(profile, dir);
    const [bios, rom] = await Promise.all([
      readFile(resolve(root, "studio/bios/colecovision.rom")),
      readFile(resolve(dir, "train-track-puzzle.rom"))
    ]);
    const core = await GearcolecoTestCore.create({ seed: 0x5241494c });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 90; frame += 1) core.runFrame();
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 90; frame += 1) core.runFrame();
      let before = core.readVram(nameBase, nameSize);
      for (let frame = 0; frame < 2400; frame += 1) {
        core.setControllerMask(0, input(frame));
        core.runFrame();
        const after = core.readVram(nameBase, nameSize);
        for (let offset = 0; offset < nameSize; offset += 1) {
          if (before[offset] !== after[offset] && !mutable(offset)) {
            const x = offset % 32;
            const y = Math.floor(offset / 32);
            assert.fail(`Rails ${profile}: NAME write outside playfield at (${x},${y}) on frame ${frame}`);
          }
        }
        before = after;
      }
      console.log(`Rails VRAM bounds (${profile}): PASS`);
    } finally {
      core.destroy();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
