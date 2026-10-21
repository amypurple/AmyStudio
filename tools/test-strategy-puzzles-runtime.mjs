#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT as INPUT,
  GEARCOLECO_TEST_REGION,
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-strategy-puzzles-"));
const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));

function run(core, frames, input = 0) {
  core.setControllerMask(0, input);
  for (let frame = 0; frame < frames; frame += 1) core.runFrame();
}

function tap(core, input) {
  run(core, 3, input);
  run(core, 8);
}

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${symbol}\\s+EQU\\s+\\$([0-9A-F]+)`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function dataBytes(source, name) {
  const line = source.split(/\r?\n/).find(candidate => candidate.startsWith(`data ${name} bytes `));
  assert.ok(line, `missing ${name}`);
  return line.slice(line.indexOf(" bytes ") + 7).split(",").map(value => Number(value.trim()));
}

function validateDozoGeometry(source) {
  const counts = dataBytes(source, "PairCount");
  const encoded = new Set();
  for (let point = 0; point < 28; point += 1) {
    const pairs = dataBytes(source, `DozoPts${point}`);
    assert.equal(pairs.length, counts[point] * 2, `Dozo point ${point} pair count`);
    for (let pair = 0; pair < pairs.length; pair += 2) {
      encoded.add([point, pairs[pair], pairs[pair + 1]].sort((a, b) => a - b).join(","));
    }
  }
  const points = [];
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column <= row; column += 1) points.push({ row, x: column * 2 - row });
  }
  const expected = new Set();
  for (let a = 0; a < 28; a += 1) for (let b = a + 1; b < 28; b += 1) for (let c = b + 1; c < 28; c += 1) {
    const distances = [[a, b], [a, c], [b, c]].map(([left, right]) =>
      (points[left].x - points[right].x) ** 2 + 3 * (points[left].row - points[right].row) ** 2);
    if (distances[0] > 0 && distances[0] === distances[1] && distances[1] === distances[2]) {
      expected.add(`${a},${b},${c}`);
    }
  }
  assert.equal(expected.size, 126, "unexpected geometric Dozo triangle count");
  assert.deepEqual(encoded, expected, "encoded Dozo triangles differ from the geometric board");
}

async function openMenu(rom) {
  const core = await GearcolecoTestCore.create({ seed: 0x51984 });
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  run(core, 120);
  tap(core, INPUT.FIRE_LEFT);
  run(core, 30);
  return core;
}

try {
  const sourcePath = join(temp, "strategy-puzzles.alexis");
  const asmPath = join(temp, "strategy-puzzles.asm");
  const romPath = join(temp, "strategy-puzzles.rom");
  const source = readFileSync(resolve(root, "studio/examples-src/strategy-puzzles.alexis"), "utf8")
    .replace(/^cartridge[^\r\n]*\r?\n/, "");
  validateDozoGeometry(source);
  writeFileSync(sourcePath, source);
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs", sourcePath,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
  const asm = readFileSync(asmPath, "utf8");
  const rom = readFileSync(romPath);

  let core = await openMenu(rom);
  try {
    tap(core, INPUT.FIRE_LEFT);
    run(core, 40);
    const pattern = addressOf(asm, "P1");
    const before = core.readRam(pattern, 1)[0];
    tap(core, INPUT.FIRE_LEFT);
    assert.notEqual(core.readRam(pattern, 1)[0], before, "Pattern Game did not cycle the selected symbol");
  } finally { core.destroy(); }

  for (const [size, downs, expectedBlocks] of [[3, 1, 9], [4, 2, 16]]) {
    core = await openMenu(rom);
    try {
      for (let move = 0; move < downs; move += 1) tap(core, INPUT.DOWN);
      tap(core, INPUT.FIRE_LEFT);
      run(core, 20);
      tap(core, INPUT.FIRE_LEFT);
      let readyFrame = -1;
      for (let frame = 0; frame < 40; frame += 1) {
        core.runFrame();
        const borders = [...core.readVram(0x1800, 768)].filter(value => value === 133).length;
        if (borders >= expectedBlocks) { readyFrame = frame; break; }
      }
      assert.ok(readyFrame >= 0, `${size}x${size} board did not appear within 40 frames`);
      run(core, 20);
      const px = core.readRam(addressOf(asm, "PX"), 1)[0];
      const py = core.readRam(addressOf(asm, "PY"), 1)[0];
      const direction = py > 0 ? INPUT.UP : (py < size - 1 ? INPUT.DOWN : (px > 0 ? INPUT.LEFT : INPUT.RIGHT));
      tap(core, direction);
      assert.equal(core.readRam(addressOf(asm, "Moves"), 2)[0], 1, `${size}x${size} legal slide was not counted (empty ${px},${py}; input ${direction})`);
    } finally { core.destroy(); }
  }

  core = await openMenu(rom);
  try {
    for (let move = 0; move < 3; move += 1) tap(core, INPUT.DOWN);
    tap(core, INPUT.FIRE_LEFT);
    run(core, 30);
    tap(core, INPUT.DOWN);
    tap(core, INPUT.FIRE_LEFT);
    const filled = addressOf(asm, "Filled");
    const who = addressOf(asm, "Who");
    let completed = false;
    for (let frame = 0; frame < 600; frame += 1) {
      core.runFrame();
      if (core.readRam(filled, 1)[0] === 1 && core.readRam(who, 1)[0] === 0) { completed = true; break; }
    }
    assert.ok(completed, "Dozo computer failed to complete its opening move");
  } finally { core.destroy(); }

  console.log("Strategy Puzzles runtime test: PASS (Pattern, 3x3, 4x4, Dozo CPU)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
