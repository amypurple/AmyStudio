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

const output = await mkdtemp(join(tmpdir(), "amy-meteor-dodge-"));
try {
  const source = resolve(root, "studio/examples-src/meteor-dodge.alexis");
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(output, `meteor-dodge-${profile}.asm`);
    const romPath = join(output, `meteor-dodge-${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    assert.match(asm, /call\s+DECODE_CONTROLLER/i, `${profile}: specialized controller backend`);
    const shipX = addressOf(asm, "AMY_UVAR_Ship");
    const meteor0Y = addressOf(asm, "AMY_UVAR_Meteors") + 1;
    const lives = addressOf(asm, "AMY_UVAR_Lives");
    const core = await GearcolecoTestCore.create({ seed: 0x4d455445 });
    try {
      const testRom = new Uint8Array(rom);
      testRom[0] = 0x55;
      testRom[1] = 0xaa;
      core.loadBios(bios);
      core.loadRom(testRom, { region: GEARCOLECO_TEST_REGION.NTSC });
      frames(core, 90);
      frames(core, 8, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      const pressedJoypad = core.readRam(0x707F, 1)[0];
      frames(core, 8);
      frames(core, 12);
      const initialX = core.readRam(shipX, 1)[0];
      const initialMeteorY = core.readRam(meteor0Y, 1)[0];
      assert.equal(initialX, 112, `${profile}: game started; pressed joypad=$${pressedJoypad.toString(16)}, lives=${core.readRam(lives, 1)[0]}`);
      frames(core, 12, GEARCOLECO_TEST_INPUT.LEFT);
      const leftX = core.readRam(shipX, 1)[0];
      assert.ok(leftX < initialX, `${profile}: LEFT moves the ship`);
      frames(core, 12, GEARCOLECO_TEST_INPUT.RIGHT);
      const rightX = core.readRam(shipX, 1)[0];
      assert.ok(rightX > leftX, `${profile}: RIGHT moves the ship`);
      const laterMeteorY = core.readRam(meteor0Y, 1)[0];
      assert.notEqual(laterMeteorY, initialMeteorY, `${profile}: meteor simulation advances`);
      assert.equal(core.readRam(lives, 1)[0], 3, `${profile}: no startup corruption`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Meteor Dodge ROM: PASS (${profiles.join(", ")})`);
} finally {
  await rm(output, { recursive: true, force: true });
}

