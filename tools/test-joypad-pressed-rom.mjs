#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = process.argv[2] ? [process.argv[2]] : ["off", "safe", "balanced", "aggressive", "experimental"];
const fireMask = GEARCOLECO_TEST_INPUT.FIRE_LEFT | GEARCOLECO_TEST_INPUT.FIRE_RIGHT;
const source = `project "JOYPAD PRESSED SELFTEST"
u8 Port = 1
u8 ConstantHits = 0
u8 DynamicHits = 0
u8 ConstantReleases = 0
u8 DynamicReleases = 0
text screen
screen on
main_loop:
  wait
  if joypad(1).fire.pressed then ConstantHits += 1
  if joypad(Port).fire.pressed then DynamicHits += 1
  if joypad(1).fire.released then ConstantReleases += 1
  if joypad(Port).fire.released then DynamicReleases += 1
  goto main_loop
`;

function parseEqu(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `Missing ${name}`);
  return Number.parseInt(match[1], 16);
}

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function compileFailure(sourcePath, asmPath) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => resolveRun(code));
  });
}

function runFrames(core, count, mask) {
  core.setControllerMask(0, mask);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-joypad-pressed-"));
try {
  const sourcePath = join(outputDir, "joypad-pressed.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));

  for (const profile of profiles) {
    const asmPath = join(outputDir, `joypad-pressed-${profile}.asm`);
    const romPath = join(outputDir, `joypad-pressed-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const constantAddress = parseEqu(asm, "AMY_UVAR_ConstantHits");
    const dynamicAddress = parseEqu(asm, "AMY_UVAR_DynamicHits");
    const constantReleaseAddress = parseEqu(asm, "AMY_UVAR_ConstantReleases");
    const dynamicReleaseAddress = parseEqu(asm, "AMY_UVAR_DynamicReleases");
    const joypadAddress = parseEqu(asm, "JOYPAD_1");
    const previousAddress = parseEqu(asm, "JOYPAD_PREVIOUS_1");
    const pressedAddress = parseEqu(asm, "JOYPAD_PRESSED_1");
    const releasedAddress = parseEqu(asm, "JOYPAD_RELEASED_1");
    parseEqu(asm, "JOYPAD_PREVIOUS_2");
    parseEqu(asm, "JOYPAD_PRESSED_2");
    parseEqu(asm, "JOYPAD_RELEASED_2");

    rom[0] = 0x55;
    rom[1] = 0xaa;
    const core = await GearcolecoTestCore.create({ seed: 0x50524553 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      const values = () => [
        core.readRam(constantAddress, 1)[0],
        core.readRam(dynamicAddress, 1)[0],
        core.readRam(constantReleaseAddress, 1)[0],
        core.readRam(dynamicReleaseAddress, 1)[0]
      ];

      runFrames(core, 90, 0);
      assert.deepEqual(values(), [0, 0, 0, 0], `${profile}: idle generated an edge`);
      runFrames(core, 5, fireMask);
      assert.deepEqual(values(), [1, 1, 0, 0], `${profile}: first press was not stable across reads; input=${core.readRam(joypadAddress, 1)[0]}, previous=${core.readRam(previousAddress, 1)[0]}, pressed=${core.readRam(pressedAddress, 1)[0]}`);
      runFrames(core, 5, fireMask);
      assert.deepEqual(values(), [1, 1, 0, 0], `${profile}: held fire repeated the edge`);
      runFrames(core, 4, 0);
      assert.deepEqual(values(), [1, 1, 1, 1], `${profile}: release edge missing or repeated; released=${core.readRam(releasedAddress, 1)[0]}`);
      runFrames(core, 5, fireMask);
      assert.deepEqual(values(), [2, 2, 1, 1], `${profile}: second press was not detected`);
    } finally {
      core.destroy();
    }
  }

  const unsynchronizedPath = join(outputDir, "joypad-pressed-unsynchronized.alexis");
  await writeFile(unsynchronizedPath, `project "JOYPAD PRESSED INVALID"\nloop forever\n  if joypad(1).fire.pressed then goto Hit\nend loop\nHit:\nloop forever\n`);
  const rejectedCode = await compileFailure(unsynchronizedPath, join(outputDir, "invalid.asm"));
  assert.notEqual(rejectedCode, 0, "unsynchronized edge polling compiled silently");
  console.log(`Joypad pressed/released ROM: PASS (${profiles.join(", ")})`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
