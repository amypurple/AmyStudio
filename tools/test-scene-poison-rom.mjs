#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const outputDir = await mkdtemp(join(tmpdir(), "amy-scene-poison-rom-"));
const optimization = process.argv[2] || "balanced";

function compileExample() {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", "amy-scene-poison-selftest",
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`Scene poison compilation failed with exit code ${code}.`)));
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
  const base = join(outputDir, "amy-scene-poison-selftest");
  const [bios, rom, symbolText] = await Promise.all([
    readFile(resolve(root, "studio/bios/colecovision.rom")),
    readFile(`${base}.rom`),
    readFile(`${base}.sym`, "utf8")
  ]);
  rom[0] = 0x55;
  rom[1] = 0xAA;

  const symbols = parseSymbols(symbolText);
  const guardBefore = symbols.get("AMY_UVAR_GuardBefore");
  const overlayBase = symbols.get("AMY_OVERLAY_SceneRam");
  const initialized = symbols.get("AMY_SCENE_Menu_Initialized");
  const untouched = symbols.get("AMY_SCENE_Menu_Untouched");
  const guardAfter = symbols.get("AMY_UVAR_GuardAfter");
  const activeScene = symbols.get("AMY_ACTIVE_SCENE");
  assert.equal(guardBefore + 1, overlayBase, "Lower guard must immediately precede the overlay.");
  assert.equal(initialized, overlayBase, "Initialized field must start at the overlay base.");
  assert.equal(untouched, overlayBase + 1, "Untouched field must be the second overlay byte.");
  assert.equal(guardAfter, overlayBase + 2, "Upper guard must immediately follow the overlay.");

  const core = await GearcolecoTestCore.create({ seed: 0x504F4953 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 8; frame += 1) core.runFrame();
    assert.equal(core.readRam(guardBefore, 1)[0], 0x5A, "Poison crossed the lower overlay boundary.");
    assert.equal(core.readRam(initialized, 1)[0], 0x42, "Scene initializer did not replace poison.");
    assert.equal(core.readRam(untouched, 1)[0], 0xCD, "Uninitialized scene field did not retain poison.");
    assert.equal(core.readRam(guardAfter, 1)[0], 0xA5, "Poison crossed the upper overlay boundary.");
    assert.equal(core.readRam(activeScene, 1)[0], 1, "Menu scene must be active after initialization.");
  } finally {
    core.destroy();
  }
  console.log(`Amy scene poison ROM test PASS (${optimization})`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
