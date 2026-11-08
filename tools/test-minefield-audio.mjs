#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const [asm, rom, bios] = await Promise.all([
  readFile(resolve(root, "build/minefield.asm"), "utf8"),
  readFile(resolve(root, "build/minefield.rom")),
  readFile(resolve(root, "studio/bios/colecovision.rom"))
]);

function addressOf(name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `Missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

function words(length, values = []) {
  const result = new Uint8Array(length * 2);
  values.forEach((value, index) => {
    result[index * 2] = value & 0xff;
    result[index * 2 + 1] = value >>> 8;
  });
  return result;
}

function analyze(samples) {
  const pcm = Int16Array.from(samples);
  const bytes = new Uint8Array(pcm.buffer);
  let nonZero = 0;
  let peak = 0;
  let energy = 0;
  for (const sample of pcm) {
    if (sample) nonZero += 1;
    peak = Math.max(peak, Math.abs(sample));
    energy += sample * sample;
  }
  return {
    hash: createHash("sha256").update(bytes).digest("hex"),
    nonZero,
    peak,
    rms: Math.sqrt(energy / Math.max(1, pcm.length))
  };
}

const core = await GearcolecoTestCore.create({ seed: 0x534f554e });
try {
  const testRom = new Uint8Array(rom);
  testRom[0] = 0x55;
  testRom[1] = 0xaa;
  core.loadBios(bios);
  core.loadRom(testRom, { region: GEARCOLECO_TEST_REGION.NTSC });
  const step = (count, mask = 0, collect = false) => {
    const samples = [];
    core.setControllerMask(0, mask);
    for (let frame = 0; frame < count; frame += 1) {
      core.runFrame();
      if (collect) samples.push(...core.getAudioFrame().samples);
    }
    return samples;
  };
  step(90);
  const title = analyze(step(180, 0, true));
  assert.ok(title.nonZero > 20000 && title.peak > 1000, "title music must produce sustained audible PCM");

  step(3, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  step(10);
  step(3, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  step(20);
  const gameplay = core.saveState();
  const px = core.readRam(addressOf("PX"), 1)[0];
  const py = core.readRam(addressOf("PY"), 1)[0];
  const targetX = px + 1;
  core.writeRam(addressOf("BombX"), [targetX, ...Array(20).fill(0)]);
  core.writeRam(addressOf("BombY"), [py, ...Array(20).fill(0)]);
  core.writeRam(addressOf("BombTime"), words(21, [5]));
  core.writeRam(addressOf("BombWarn"), words(21, [1]));
  core.writeRam(addressOf("BombFlash"), words(21, [2]));
  core.writeRam(addressOf("BombExplode"), words(21, [100]));
  core.writeRam(addressOf("BombState"), [2, ...Array(20).fill(3)]);
  core.writeRam(addressOf("BombsLeft"), [1]);
  core.writeRam(addressOf("InitialBombs"), [1]);
  core.writeRam(addressOf("BombsGathered"), [0]);
  core.writeRam(addressOf("Direction"), [2]);
  core.writeRam(addressOf("MoveTick"), [5]);
  const pickup = analyze(step(30, GEARCOLECO_TEST_INPUT.RIGHT, true));
  assert.ok(pickup.nonZero > 0 && pickup.peak > 500, "pickup must produce audible PCM");

  core.loadState(gameplay, { controllerMasks: [0, 0] });
  core.writeRam(addressOf("BombX"), [15, ...Array(20).fill(0)]);
  core.writeRam(addressOf("BombY"), [13, ...Array(20).fill(0)]);
  core.writeRam(addressOf("BombTime"), words(21, [10]));
  core.writeRam(addressOf("BombWarn"), words(21, [1]));
  core.writeRam(addressOf("BombFlash"), words(21, [2]));
  core.writeRam(addressOf("BombExplode"), words(21, [10]));
  core.writeRam(addressOf("BombState"), [0, ...Array(20).fill(3)]);
  core.writeRam(addressOf("BombsLeft"), [1]);
  const explosion = analyze(step(30, 0, true));
  assert.ok(explosion.nonZero > 0 && explosion.peak > 500, "explosion must produce audible PCM");
  assert.notEqual(explosion.hash, pickup.hash, "pickup tone and explosion noise must be distinct");
  console.log(JSON.stringify({ title, pickup, explosion }, null, 2));
  console.log("Minefield audio: PASS");
} finally {
  core.destroy();
}
