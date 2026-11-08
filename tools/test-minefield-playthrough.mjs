#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";
import { FIELD } from "./minefield-model.mjs";

const root = resolve(import.meta.dirname, "..");

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `Missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

function key(x, y) { return `${x},${y}`; }
function cell(core, x, y) { return core.readVram(0x1800 + y * 32 + x, 1)[0]; }
function blocked(tile) { return tile === 128 || tile === 132 || tile === 133; }

function neighbors(x, y) {
  return [
    { x, y: y === FIELD.top ? FIELD.bottom : y - 1, mask: GEARCOLECO_TEST_INPUT.UP },
    { x: x === FIELD.right ? FIELD.left : x + 1, y, mask: GEARCOLECO_TEST_INPUT.RIGHT },
    { x, y: y === FIELD.bottom ? FIELD.top : y + 1, mask: GEARCOLECO_TEST_INPUT.DOWN },
    { x: x === FIELD.left ? FIELD.right : x - 1, y, mask: GEARCOLECO_TEST_INPUT.LEFT }
  ];
}

function route(core, start, targets) {
  const queue = [start];
  const previous = new Map([[key(start.x, start.y), null]]);
  let found = null;
  while (queue.length && !found) {
    const here = queue.shift();
    if (targets.has(key(here.x, here.y))) { found = here; break; }
    for (const next of neighbors(here.x, here.y)) {
      const nextKey = key(next.x, next.y);
      if (previous.has(nextKey) || blocked(cell(core, next.x, next.y))) continue;
      previous.set(nextKey, { from: here, mask: next.mask });
      queue.push(next);
    }
  }
  if (!found) return null;
  let step = found;
  let edge = previous.get(key(step.x, step.y));
  while (edge?.from && (edge.from.x !== start.x || edge.from.y !== start.y)) {
    step = edge.from;
    edge = previous.get(key(step.x, step.y));
  }
  return edge?.mask || 0;
}

const [asm, rom, bios] = await Promise.all([
  readFile(resolve(root, "build/minefield.asm"), "utf8"),
  readFile(resolve(root, "build/minefield.rom")),
  readFile(resolve(root, "studio/bios/colecovision.rom"))
]);
const addr = Object.fromEntries(["Wave", "BombsLeft", "Trucks", "PX", "PY", "BombX", "BombY", "BombState"]
  .map((name) => [name, addressOf(asm, `AMY_UVAR_${name}`)]));
const core = await GearcolecoTestCore.create({ seed: 0x4d494e45 });
try {
  const testRom = new Uint8Array(rom);
  testRom[0] = 0x55;
  testRom[1] = 0xaa;
  core.loadBios(bios);
  core.loadRom(testRom, { region: GEARCOLECO_TEST_REGION.NTSC });
  const run = (mask = 0) => { core.setControllerMask(0, mask); core.runFrame(); };
  for (let frame = 0; frame < 90; frame += 1) run();
  for (let frame = 0; frame < 3; frame += 1) run(GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  for (let frame = 0; frame < 10; frame += 1) run();
  for (let frame = 0; frame < 3; frame += 1) run(GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  for (let frame = 0; frame < 20; frame += 1) run();

  let highestWave = 1;
  let previousX = core.readRam(addr.PX, 1)[0];
  let previousY = core.readRam(addr.PY, 1)[0];
  let chosenMask = GEARCOLECO_TEST_INPUT.RIGHT;
  for (let frame = 0; frame < 18000 && highestWave < 4; frame += 1) {
    const wave = core.readRam(addr.Wave, 1)[0];
    highestWave = Math.max(highestWave, wave);
    const x = core.readRam(addr.PX, 1)[0];
    const y = core.readRam(addr.PY, 1)[0];
    if (x !== previousX || y !== previousY || frame % 6 === 0) {
      const states = core.readRam(addr.BombState, 21);
      const xs = core.readRam(addr.BombX, 21);
      const ys = core.readRam(addr.BombY, 21);
      const targets = new Set();
      for (let index = 0; index < 21; index += 1) {
        if (states[index] < 3) targets.add(key(xs[index], ys[index]));
      }
      chosenMask = route(core, { x, y }, targets) || neighbors(x, y).find((next) => !blocked(cell(core, next.x, next.y)))?.mask || chosenMask;
      previousX = x;
      previousY = y;
    }
    run(chosenMask);
  }
  assert.ok(highestWave >= 4, `bot should clear three fields, reached wave ${highestWave}`);
  assert.ok(core.readRam(addr.Trucks, 1)[0] > 0, "careful bot should retain at least one truck");
  console.log(`Minefield playthrough: PASS (reached wave ${highestWave}, ${core.readRam(addr.Trucks, 1)[0]} trucks remain)`);
} finally {
  core.destroy();
}
