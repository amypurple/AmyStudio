#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const outputDir = await mkdtemp(join(tmpdir(), "amy-overlay-rom-"));
const optimization = process.argv[2] || "balanced";

function compileExample() {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", "amy-overlay-layout-selftest",
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Overlay compilation failed with exit code ${code}.`)));
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
  const base = join(outputDir, "amy-overlay-layout-selftest");
  const [bios, rom, symbolText] = await Promise.all([
    readFile(resolve(root, "studio/bios/colecovision.rom")),
    readFile(`${base}.rom`),
    readFile(`${base}.sym`, "utf8")
  ]);
  rom[0] = 0x55;
  rom[1] = 0xAA;
  const symbols = parseSymbols(symbolText);
  const overlayBase = symbols.get("AMY_OVERLAY_SceneRam");
  const menuSelection = symbols.get("AMY_SCENE_Menu_Selection");
  const gamePlayerX = symbols.get("AMY_SCENE_Game_PlayerX");
  const gameActors = symbols.get("AMY_SCENE_Game_Actors");
  const passedAddress = symbols.get("AMY_UVAR_Passed");
  assert.ok(Number.isInteger(overlayBase), "Missing overlay base symbol.");
  assert.equal(menuSelection, overlayBase, "Menu alias must share the overlay base.");
  assert.equal(gamePlayerX, overlayBase, "Game alias must share the overlay base.");
  assert.equal(gameActors, overlayBase + 16, "Record-array field alias must point to the first actor.");
  assert.ok(Number.isInteger(passedAddress), "Missing Passed symbol.");

  const core = await GearcolecoTestCore.create({ seed: 0x4F564552 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    assert.equal(core.readRam(passedAddress, 1)[0], 36, "Overlay runtime assertions did not all pass.");
  } finally {
    core.destroy();
  }
  console.log(`Amy overlay ROM self-test PASS (${optimization}: aliases, arrays, double indexes, VRAM I/O, collisions, mutations, loops, and BCD retained, 36 assertions)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
