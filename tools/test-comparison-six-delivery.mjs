#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT as INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const delivery = path.resolve(root, process.argv[2] || "build/comparison-six-samples-experimental-2026-10-08");
const bios = fs.readFileSync(path.resolve(root, "studio/bios/colecovision.rom"));

async function load(name, frames = 120) {
  const core = await GearcolecoTestCore.create({ seed: 0x53495852 });
  core.loadBios(bios);
  core.loadRom(fs.readFileSync(path.resolve(delivery, name)), { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < frames; frame += 1) core.runFrame();
  return core;
}

{
  const core = await load("toolchain-benchmark-hello.rom");
  try {
    const nameBase = (core.getVdpRegisters()[2] & 0x0f) * 0x400;
    const actual = String.fromCharCode(...core.readVram(nameBase + 11 * 32 + 10, 13));
    assert.equal(actual, "HELLO, WORLD!", "Hello World text differs");
  } finally {
    core.destroy();
  }
}

{
  const core = await load("toolchain-benchmark-controller.rom");
  try {
    const cases = [
      [0, 4, "neutral"],
      [INPUT.KEYPAD_0, 13, "keypad"],
      [INPUT.FIRE_LEFT, 9, "fire"],
      [INPUT.UP, 3, "up"],
      [INPUT.DOWN, 12, "down"],
      [INPUT.LEFT, 11, "left"],
      [INPUT.RIGHT, 7, "right"]
    ];
    for (const [mask, color, label] of cases) {
      core.setControllerMask(0, mask);
      for (let frame = 0; frame < 10; frame += 1) core.runFrame();
      assert.equal(core.getVdpRegisters()[7] & 0x0f, color, `controller ${label}`);
    }
  } finally {
    core.destroy();
  }
}

{
  const core = await load("toolchain-benchmark-warrior-bitmap.rom", 180);
  try {
    const generated = path.resolve(root, "build/competition/bitmap-picture/generated");
    const pattern = fs.readFileSync(path.resolve(generated, "warrior.pattern.bin"));
    const color = fs.readFileSync(path.resolve(generated, "warrior.color.bin"));
    assert.deepEqual(Buffer.from(core.readVram(0x0000, pattern.length)), pattern, "Warrior Pattern Table differs");
    assert.deepEqual(Buffer.from(core.readVram(0x2000, color.length)), color, "Warrior Color Table differs");
  } finally {
    core.destroy();
  }
}

console.log("Comparison delivery direct ROM checks: PASS (Hello, Controller, Warrior)");
