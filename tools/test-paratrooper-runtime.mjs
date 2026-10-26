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
const temp = mkdtempSync(join(tmpdir(), "amy-paratrooper-"));

function runFrames(core, count) {
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
}

function tap(core) {
  core.setControllerMask(0, INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT);
  runFrames(core, 20);
  core.setControllerMask(0, 0);
}

function textScreen(core) {
  return String.fromCharCode(...core.readVram(0x1800, 32 * 24));
}

try {
  const asm = join(temp, "paratrooper.asm");
  const rom = join(temp, "paratrooper.rom");
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs",
    "studio/examples-src/paratrooper.alexis",
    "--asm", asm,
    "--rom", rom,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
  assert.equal(readFileSync(rom).length, 5934, "unexpected occupied ROM size");

  const core = await GearcolecoTestCore.create({ seed: 0x198501 });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 450);
    tap(core); // BIOS title -> editorial page
    runFrames(core, 530);
    assert.match(textScreen(core), /PARATROOPER/);
    tap(core); // editorial page -> level menu
    runFrames(core, 100);
    assert.match(textScreen(core), /NOVICE/);
    tap(core); // confirm novice mode
    runFrames(core, 180);
    assert.match(textScreen(core), /TROOPS.LEFT/);
    tap(core); // release the parachutist
    runFrames(core, 40);

    const attributes = core.readVram(0x1b00, 20);
    assert.ok(attributes[4] < 192, `parachutist sprite is hidden at Y=${attributes[4]}`);
    assert.ok([4, 8, 12, 16].includes(attributes[6]), `unexpected parachutist pattern ${attributes[6]}`);
    console.log(`Paratrooper runtime test: PASS (5934 bytes, visible parachutist pattern ${attributes[6]})`);
  } finally {
    core.destroy();
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

