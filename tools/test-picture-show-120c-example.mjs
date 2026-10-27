#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-picture-show-120c-"));
const sourcePath = resolve(root, "studio/examples-src/picture-show-120c.alexis");

function addressOf(asm, symbol) {
  const match = new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-F]+)`, "mi").exec(asm);
  assert.ok(match, `Missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function vramHash(core) {
  return createHash("sha256").update(core.readVram(0, 0x3800)).digest("hex");
}

function runUntil(core, predicate, limit, label) {
  for (let frame = 0; frame < limit; frame += 1) {
    core.runFrame();
    if (predicate()) return frame + 1;
  }
  const cpu = core.getCpuState();
  const stack = core.readRam(cpu.sp, 4);
  assert.fail(`${label} did not complete within ${limit} frames (PC=$${cpu.pc.toString(16).toUpperCase()}, SP=$${cpu.sp.toString(16).toUpperCase()}, stack=${[...stack].map((value) => value.toString(16).padStart(2, "0")).join(" ")})`);
}

try {
  const asmPath = join(temp, "picture-show.asm");
  const romPath = join(temp, "picture-show.rom");
  const result = spawnSync(process.execPath, [
    resolve(root, "tools/amyc.mjs"), sourcePath,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", "balanced"
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, result.error?.stack || result.stdout || result.stderr);

  const asm = readFileSync(asmPath, "utf8");
  const picAddress = addressOf(asm, "AMY_UVAR_Pic");
  const wasAddress = addressOf(asm, "AMY_UVAR_WasB");
  const buttonAddress = addressOf(asm, "AMY_UVAR_B");
  const joypad1Address = addressOf(asm, "JOYPAD_1");
  const runtimeAddresses = [
    "AMY_120C_ENABLED",
    "AMY_120C_PHASE",
    "JOYPAD_1",
    "KEYPAD_1",
    "JOYPAD_2",
    "KEYPAD_2"
  ].map((symbol) => addressOf(asm, symbol));
  assert.ok(picAddress > Math.max(...runtimeAddresses), "Picture state overlaps 120C/controller RAM");

  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  const core = await GearcolecoTestCore.create({ seed: 0x120C });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 180; frame += 1) core.runFrame();
    assert.equal(core.readRam(picAddress, 1)[0], 0);
    const firstHash = vramHash(core);

    core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
    for (let frame = 0; frame < 3; frame += 1) core.runFrame();
    core.setControllerMask(0, 0);
    runUntil(core, () => core.readRam(wasAddress, 1)[0] === 0, 1200, "first picture switch");
    assert.equal(core.readRam(picAddress, 1)[0], 1, "first press did not select the second picture");
    assert.notEqual(vramHash(core), firstHash, "second picture did not replace VRAM");
    assert.equal(core.readRam(wasAddress, 1)[0], 0,
      `button release was not observed (B=${core.readRam(buttonAddress, 1)[0]}, joypad=${core.readRam(joypad1Address, 1)[0]})`);

    core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
    for (let frame = 0; frame < 3; frame += 1) core.runFrame();
    core.setControllerMask(0, 0);
    runUntil(core, () => core.readRam(wasAddress, 1)[0] === 0, 1200, "second picture switch");
    assert.equal(core.readRam(picAddress, 1)[0], 0, "second press did not return to the first picture");
    assert.equal(vramHash(core), firstHash, "first picture was not restored exactly");
  } finally {
    core.destroy();
  }

  console.log(`Picture Show 120C: PASS (${readFileSync(romPath).length} bytes occupied)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
