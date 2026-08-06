#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const repoRoot = resolve(import.meta.dirname, "..");
const outputDir = await mkdtemp(join(tmpdir(), "amy-timer-rom-"));
const optimization = process.argv[2] || "balanced";

function compileExample() {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", "amy-timer-lab",
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: repoRoot, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`Timer Lab compilation failed with exit code ${code}.`)));
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
  const [bios, rom, symbolText] = await Promise.all([
    readFile(resolve(repoRoot, "studio/bios/colecovision.rom")),
    readFile(resolve(outputDir, "amy-timer-lab.rom")),
    readFile(resolve(outputDir, "amy-timer-lab.sym"), "utf8")
  ]);
  const symbols = parseSymbols(symbolText);
  rom[0] = 0x55;
  rom[1] = 0xAA;
  const required = [
    "AMY_ULBL_done",
    "AMY_UVAR_BlinkCount",
    "AMY_UVAR_DoorDone",
    "AMY_UVAR_BlinkTimer_timer_signal",
    "AMY_UVAR_BlinkTimer_timer_active",
    "AMY_UVAR_DoorTimer_timer_signal",
    "AMY_UVAR_DoorTimer_timer_active"
  ];
  for (const symbol of required) assert.ok(symbols.has(symbol), `Missing ${symbol}.`);

  const core = await GearcolecoTestCore.create({ seed: 0x54494D45 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    core.setExecuteBreakpoint(symbols.get("AMY_ULBL_done"));
    let reached = false;
    for (let frame = 0; frame < 180; frame += 1) {
      const result = core.runFrame();
      if (result.breakpointHit) {
        reached = true;
        break;
      }
    }
    assert.equal(reached, true, "Timer Lab did not reach PASS within 180 frames.");
    const byte = (name) => core.readRam(symbols.get(name), 1)[0];
    assert.equal(byte("AMY_UVAR_BlinkCount"), 4, "Repeating timer did not fire four times.");
    assert.equal(byte("AMY_UVAR_DoorDone"), 1, "One-shot timer did not fire.");
    assert.equal(byte("AMY_UVAR_BlinkTimer_timer_signal"), 0, "Stopped repeating timer kept a pending signal.");
    assert.equal(byte("AMY_UVAR_BlinkTimer_timer_active"), 0, "Repeating timer remained active after stop.");
    assert.equal(byte("AMY_UVAR_DoorTimer_timer_signal"), 0, "One-shot signal was not consumed.");
    assert.equal(byte("AMY_UVAR_DoorTimer_timer_active"), 0, "One-shot timer remained active after expiry.");
  } finally {
    core.destroy();
  }
  console.log(`Amy named TIMER ROM PASS (${optimization})`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}


