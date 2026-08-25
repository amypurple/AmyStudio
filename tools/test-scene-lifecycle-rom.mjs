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
const outputDir = await mkdtemp(join(tmpdir(), "amy-scenes-rom-"));
const optimization = process.argv[2] || "balanced";

function compileExample() {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", "amy-scenes-overlays-design",
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`Scene lifecycle compilation failed with exit code ${code}.`)));
  });
}

function parseSymbols(text) {
  return new Map(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^[0-9A-Fa-f]{2}:([0-9A-Fa-f]{4})\s+(\S+)/);
    return match ? [[match[2], Number.parseInt(match[1], 16)]] : [];
  }));
}

try {
  await compileExample();
  const base = join(outputDir, "amy-scenes-overlays-design");
  const [bios, rom, symbolText] = await Promise.all([
    readFile(resolve(root, "studio/bios/colecovision.rom")),
    readFile(`${base}.rom`),
    readFile(`${base}.sym`, "utf8")
  ]);
  rom[0] = 0x55;
  rom[1] = 0xAA;

  const symbols = parseSymbols(symbolText);
  const activeScene = symbols.get("AMY_ACTIVE_SCENE");
  const menuBlink = symbols.get("AMY_SCENE_Menu_BlinkTicks");
  const gamePlayerX = symbols.get("AMY_SCENE_Game_PlayerX");
  assert.ok(Number.isInteger(activeScene), "Missing active-scene symbol.");
  assert.ok(Number.isInteger(menuBlink), "Missing menu overlay symbol.");
  assert.equal(gamePlayerX, symbols.get("AMY_OVERLAY_SceneRam"), "Game and Menu must share the overlay base.");

  const core = await GearcolecoTestCore.create({ seed: 0x53434E45 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 12; frame += 1) core.runFrame();
    assert.equal(core.readRam(activeScene, 1)[0], 1, "Menu scene must be active after startup.");
    assert.ok(core.readRam(menuBlink, 1)[0] > 0, "Menu frame handler must run from NMI.");

    core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
    for (let frame = 0; frame < 3; frame += 1) core.runFrame();
    core.setControllerMask(0, 0);
    for (let frame = 0; frame < 3; frame += 1) core.runFrame();
    assert.equal(core.readRam(activeScene, 1)[0], 2, "FIRE must request and enter the Game scene.");
    assert.equal(core.readRam(gamePlayerX, 1)[0], 120, "Game enter handler must initialize its overlay.");
  } finally {
    core.destroy();
  }
  console.log(`Amy scene lifecycle ROM test PASS (${optimization})`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
