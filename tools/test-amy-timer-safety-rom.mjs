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
const outputDir = await mkdtemp(join(tmpdir(), "amy-timer-safety-rom-"));
const optimization = process.argv[2] || "balanced";

function compileExample() {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", "amy-timer-safety-selftest",
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: repoRoot, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`Timer safety compilation failed with exit code ${code}.`)));
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
    readFile(resolve(outputDir, "amy-timer-safety-selftest.rom")),
    readFile(resolve(outputDir, "amy-timer-safety-selftest.sym"), "utf8")
  ]);
  rom[0] = 0x55;
  rom[1] = 0xAA;
  const symbols = parseSymbols(symbolText);
  const required = [
    "AMY_ULBL_timer_safety_done",
    "AMY_UVAR_PassCount",
    "AMY_UVAR_FailCount",
    "AMY_UVAR_Fast_timer_signal", "AMY_UVAR_Fast_timer_active",
    "AMY_UVAR_OneShot_timer_signal", "AMY_UVAR_OneShot_timer_active",
    "AMY_UVAR_EveryFrame_timer_signal", "AMY_UVAR_EveryFrame_timer_active"
  ];
  for (const symbol of required) assert.ok(symbols.has(symbol), `Missing ${symbol}.`);

  const core = await GearcolecoTestCore.create({ seed: 0x53414645 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const done = symbols.get("AMY_ULBL_timer_safety_done");
    core.setExecuteBreakpoint(done);
    let reached = false;
    for (let frame = 0; frame < 120; frame += 1) {
      const result = core.runFrame();
      if (result.breakpointHit && result.pc === done) {
        reached = true;
        break;
      }
    }
    assert.equal(reached, true, "TIMER safety self-test did not finish within 120 frames.");
    const byte = (name) => core.readRam(symbols.get(name), 1)[0];
    assert.equal(byte("AMY_UVAR_PassCount"), 17, "Not every TIMER safety assertion passed.");
    assert.equal(byte("AMY_UVAR_FailCount"), 0, "At least one TIMER safety assertion failed.");
    for (const name of ["Fast", "OneShot", "EveryFrame"]) {
      assert.equal(byte(`AMY_UVAR_${name}_timer_signal`), 0, `${name} retained a ghost signal.`);
      assert.equal(byte(`AMY_UVAR_${name}_timer_active`), 0, `${name} remained active.`);
    }
  } finally {
    core.destroy();
  }
  console.log(`Amy TIMER safety self-test PASS (${optimization}: 17 assertions)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
