#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";
import { baseTimer, blastCells, bombCount, bombThresholds, phaseAt, wavePenalty } from "./minefield-model.mjs";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `Missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

function frames(core, count, mask = 0) {
  core.setControllerMask(0, mask);
  for (let index = 0; index < count; index += 1) core.runFrame();
}

function bytes(length, first = 0, rest = 0) {
  return [first, ...Array(length - 1).fill(rest)];
}

function words(length, values = []) {
  const result = new Uint8Array(length * 2);
  values.forEach((value, index) => {
    result[index * 2] = value & 0xff;
    result[index * 2 + 1] = value >>> 8;
  });
  return result;
}

const output = await mkdtemp(join(tmpdir(), "amy-minefield-"));
try {
  assert.deepEqual(Array.from({ length: 12 }, (_, index) => bombCount(index + 1)), [5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 20]);
  assert.deepEqual([1, 2, 3, 4, 5, 12].map(baseTimer), [1680, 1500, 1320, 1140, 960, 960]);
  assert.deepEqual(bombThresholds(1, 40), { warn: 672, flash: 1008, explode: 1176 });
  assert.equal(blastCells(15, 13).length, 37);
  assert.equal(phaseAt(1008, bombThresholds(1, 40)), 2);
  assert.equal(wavePenalty(10, 7), 30);
  const source = resolve(root, "examples/ports/compute/minefield.alexis");
  const sourceText = await readFile(source, "utf8");
  const browserSourceText = await readFile(resolve(root, "studio/examples-src/minefield.alexis"), "utf8");
  assert.equal(browserSourceText, sourceText, "browser Minefield source matches the tested port");
  for (const match of sourceText.matchAll(/^\s*print\s+at\s+(\d+)\s*,\s*\d+\s*,\s*"([^"]*)"/gmi)) {
    const column = Number(match[1]);
    assert.ok(column >= 2 && column + match[2].length - 1 <= 29,
      `text outside CRT-safe columns 2-29: column ${column}, ${JSON.stringify(match[2])}`);
  }
  for (const match of sourceText.matchAll(/^\s*print\s+centered\s+at\s+\d+\s*,\s*"([^"]*)"/gmi)) {
    assert.ok(match[1].length <= 28, `centered text wider than CRT-safe area: ${JSON.stringify(match[1])}`);
  }
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(output, `minefield-${profile}.asm`);
    const romPath = join(output, `minefield-${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const wave = addressOf(asm, "AMY_UVAR_Wave");
    const bombsLeft = addressOf(asm, "AMY_UVAR_BombsLeft");
    const px = addressOf(asm, "AMY_UVAR_PX");
    const py = addressOf(asm, "AMY_UVAR_PY");
    const direction = addressOf(asm, "AMY_UVAR_Direction");
    const moveTick = addressOf(asm, "AMY_UVAR_MoveTick");
    const score = addressOf(asm, "AMY_UVAR_Score");
    const bombX = addressOf(asm, "AMY_UVAR_BombX");
    const bombY = addressOf(asm, "AMY_UVAR_BombY");
    const bombTime = addressOf(asm, "AMY_UVAR_BombTime");
    const bombWarn = addressOf(asm, "AMY_UVAR_BombWarn");
    const bombFlash = addressOf(asm, "AMY_UVAR_BombFlash");
    const bombExplode = addressOf(asm, "AMY_UVAR_BombExplode");
    const bombState = addressOf(asm, "AMY_UVAR_BombState");
    const initialBombs = addressOf(asm, "AMY_UVAR_InitialBombs");
    const bombsGathered = addressOf(asm, "AMY_UVAR_BombsGathered");
    const core = await GearcolecoTestCore.create({ seed: 0x4d494e45 });
    try {
      const testRom = new Uint8Array(rom);
      testRom[0] = 0x55;
      testRom[1] = 0xaa;
      core.loadBios(bios);
      core.loadRom(testRom, { region: GEARCOLECO_TEST_REGION.NTSC });
      frames(core, 90);
      frames(core, 4, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      frames(core, 12);
      frames(core, 4, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      frames(core, 20);
      assert.equal(core.readRam(wave, 1)[0], 1, `${profile}: first wave started`);
      assert.equal(core.readRam(bombsLeft, 1)[0], 5, `${profile}: first wave has five bombs`);
      const initialWarnBytes = core.readRam(bombWarn, 10);
      const initialFlashBytes = core.readRam(bombFlash, 10);
      const initialExplodeBytes = core.readRam(bombExplode, 10);
      for (let index = 0; index < 5; index += 1) {
        const warn = initialWarnBytes[index * 2] | initialWarnBytes[index * 2 + 1] << 8;
        const flash = initialFlashBytes[index * 2] | initialFlashBytes[index * 2 + 1] << 8;
        const explode = initialExplodeBytes[index * 2] | initialExplodeBytes[index * 2 + 1] << 8;
        assert.ok(warn >= 504 && warn <= 1260,
          `${profile}: bomb ${index} warning time is in normal danger's wave-one range (${warn})`);
        assert.equal(flash, warn + (warn >> 1), `${profile}: bomb ${index} warning phase has full duration`);
        assert.equal(explode, flash + (warn >> 2), `${profile}: bomb ${index} flashing phase has full duration`);
      }
      const initialBombX = core.readRam(bombX, 5);
      const initialBombY = core.readRam(bombY, 5);
      for (let index = 0; index < 5; index += 1) {
        const tile = core.readVram(0x1800 + initialBombY[index] * 32 + initialBombX[index], 1)[0];
        assert.equal(tile, 129, `${profile}: bomb ${index} remains visible after truck placement`);
      }
      const gameplay = core.saveState();

      frames(core, 2300);
      assert.ok(core.readRam(wave, 1)[0] > 1 || core.readRam(bombsLeft, 1)[0] < 5,
        `${profile}: normal danger naturally detonates at least one unattended bomb`);

      core.loadState(gameplay, { controllerMasks: [0, 0] });
      const startX = core.readRam(px, 1)[0];
      frames(core, 7, GEARCOLECO_TEST_INPUT.RIGHT);
      assert.equal(core.readRam(direction, 1)[0], 2, `${profile}: joystick selects right`);
      assert.notEqual(core.readRam(px, 1)[0], startX, `${profile}: truck advances and cannot remain stopped`);

      core.loadState(gameplay, { controllerMasks: [0, 0] });
      const startPickupX = core.readRam(px, 1)[0];
      const startPickupY = core.readRam(py, 1)[0];
      const candidates = [
        { x: startPickupX === 28 ? 3 : startPickupX + 1, y: startPickupY, dir: 2, mask: GEARCOLECO_TEST_INPUT.RIGHT },
        { x: startPickupX === 3 ? 28 : startPickupX - 1, y: startPickupY, dir: 4, mask: GEARCOLECO_TEST_INPUT.LEFT },
        { x: startPickupX, y: startPickupY === 5 ? 21 : startPickupY - 1, dir: 1, mask: GEARCOLECO_TEST_INPUT.UP },
        { x: startPickupX, y: startPickupY === 21 ? 5 : startPickupY + 1, dir: 3, mask: GEARCOLECO_TEST_INPUT.DOWN }
      ];
      const pickup = candidates.find(({ x, y }) => core.readVram(0x1800 + y * 32 + x, 1)[0] === 32);
      assert.ok(pickup, `${profile}: a blank neighboring pickup cell exists`);
      core.writeRam(bombX, bytes(21, pickup.x));
      core.writeRam(bombY, bytes(21, pickup.y));
      core.writeRam(bombTime, words(21, [5]));
      core.writeRam(bombWarn, words(21, [1]));
      core.writeRam(bombFlash, words(21, [2]));
      core.writeRam(bombExplode, words(21, [100]));
      core.writeRam(bombState, bytes(21, 2, 3));
      core.writeRam(bombsLeft, [1]);
      core.writeRam(initialBombs, [1]);
      core.writeRam(bombsGathered, [0]);
      core.writeRam(score, [0, 0]);
      core.writeRam(direction, [pickup.dir]);
      core.writeRam(moveTick, [5]);
      frames(core, 1, pickup.mask);
      assert.deepEqual([...core.readRam(score, 2)], [30, 0], `${profile}: flashing bomb awards 30 points`);
      assert.equal(core.readRam(bombsLeft, 1)[0], 0, `${profile}: pickup removes the last bomb`);

      core.loadState(gameplay, { controllerMasks: [0, 0] });
      core.writeRam(px, [20]);
      core.writeRam(py, [15]);
      core.writeRam(direction, [0]);
      core.writeRam(bombX, [10, 11, ...Array(19).fill(0)]);
      core.writeRam(bombY, [10, 10, ...Array(19).fill(0)]);
      core.writeRam(bombTime, words(21, [10, 0]));
      core.writeRam(bombWarn, words(21, [1, 100]));
      core.writeRam(bombFlash, words(21, [2, 150]));
      core.writeRam(bombExplode, words(21, [10, 175]));
      core.writeRam(bombState, [0, 0, ...Array(19).fill(3)]);
      core.writeRam(bombsLeft, [2]);
      core.writeRam(initialBombs, [2]);
      core.writeRam(bombsGathered, [0]);
      core.writeRam(score, [25, 0]);
      frames(core, 30);
      assert.deepEqual([...core.readRam(bombState, 2)], [3, 3], `${profile}: adjacent bombs chain-react on consecutive frames`);
      assert.deepEqual([...core.readRam(score, 2)], [5, 0], `${profile}: two explosions deduct 20 points`);

      core.loadState(gameplay, { controllerMasks: [0, 0] });
      let wrapY = 0;
      for (let y = 5; y <= 21; y += 1) {
        const right = core.readVram(0x1800 + y * 32 + 28, 1)[0];
        const left = core.readVram(0x1800 + y * 32 + 3, 1)[0];
        if (right === 32 && left === 32) { wrapY = y; break; }
      }
      assert.ok(wrapY, `${profile}: a clear wrapping row exists`);
      core.writeRam(px, [28]);
      core.writeRam(py, [wrapY]);
      core.writeRam(direction, [2]);
      core.writeRam(moveTick, [5]);
      frames(core, 1, GEARCOLECO_TEST_INPUT.RIGHT);
      assert.equal(core.readRam(px, 1)[0], 3, `${profile}: truck wraps from right to left`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Minefield ROM: PASS (${profiles.join(", ")})`);
} finally {
  await rm(output, { recursive: true, force: true });
}
