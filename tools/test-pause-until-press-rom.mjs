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

const repoRoot = resolve(import.meta.dirname, "..");
const outputDir = await mkdtemp(join(tmpdir(), "amy-pause-press-rom-"));
const optimization = process.argv[2] || "balanced";

async function compileExample() {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", "pause-until-press-demo",
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: repoRoot, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`Pause example compilation failed with exit code ${code}.`)));
  });
}

function parseSymbols(text) {
  return new Map(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^[0-9A-Fa-f]{2}:([0-9A-Fa-f]{4})\s+(\S+)/);
    return match ? [[match[2], Number.parseInt(match[1], 16)]] : [];
  }));
}

function runUntil(core, address, maxFrames, message) {
  core.setExecuteBreakpoint(address);
  for (let frame = 0; frame < maxFrames; ++frame) {
    const result = core.runFrame();
    if (result.breakpointHit && result.pc === address) {
      core.clearExecuteBreakpoint(address);
      return frame + 1;
    }
  }
  throw new Error(message);
}

try {
  await compileExample();
  const [bios, rom, symbolText] = await Promise.all([
    readFile(resolve(repoRoot, "studio/bios/colecovision.rom")),
    readFile(resolve(outputDir, "pause-until-press-demo.rom")),
    readFile(resolve(outputDir, "pause-until-press-demo.sym"), "utf8")
  ]);
  const symbols = parseSymbols(symbolText);
  const waitingAddress = symbols.get("AMY_ULBL_waiting");
  const resumedAddress = symbols.get("AMY_ULBL_resumed");
  assert.ok(Number.isInteger(waitingAddress), "Missing waiting label.");
  assert.ok(Number.isInteger(resumedAddress), "Missing resumed label.");

  const cases = [
    { port: 0, mask: GEARCOLECO_TEST_INPUT.FIRE_LEFT, name: "P1 left fire" },
    { port: 0, mask: GEARCOLECO_TEST_INPUT.FIRE_RIGHT, name: "P1 right fire" },
    { port: 1, mask: GEARCOLECO_TEST_INPUT.FIRE_LEFT, name: "P2 left fire" },
    { port: 1, mask: GEARCOLECO_TEST_INPUT.FIRE_RIGHT, name: "P2 right fire" }
  ];

  for (const testCase of cases) {
    const core = await GearcolecoTestCore.create({ seed: 0x50524553 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      runUntil(core, waitingAddress, 180, `${testCase.name} did not reach the pause.`);
      for (let frame = 0; frame < 3; ++frame) core.runFrame();
      core.setExecuteBreakpoint(resumedAddress);
      core.setControllerMask(testCase.port, testCase.mask);
      for (let frame = 0; frame < 5; ++frame) {
        const heldResult = core.runFrame();
        assert.equal(heldResult.breakpointHit, false, `${testCase.name} escaped before release.`);
      }
      core.setControllerMask(testCase.port, 0);
      let resumed = false;
      for (let frame = 0; frame < 20; ++frame) {
        const result = core.runFrame();
        if (result.breakpointHit && result.pc === resumedAddress) {
          resumed = true;
          break;
        }
      }
      assert.equal(resumed, true, `${testCase.name} did not resume after release.`);
    } finally {
      core.destroy();
    }
  }

  const timingCases = [
    { name: "NTSC", rate: 60, region: GEARCOLECO_TEST_REGION.NTSC, biosValue: 60 },
    { name: "PAL", rate: 50, region: GEARCOLECO_TEST_REGION.PAL, biosValue: 50 }
  ];
  for (const timing of timingCases) {
    const core = await GearcolecoTestCore.create({ seed: 0x43525450 });
    try {
      const regionalBios = Buffer.from(bios);
      regionalBios[0x69] = timing.biosValue;
      core.loadBios(regionalBios);
      core.loadRom(rom, { region: timing.region });
      runUntil(core, waitingAddress, 180, `${timing.name} did not reach the pause.`);
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);

      const initialR1 = core.getVdpRegisters()[1];
      assert.notEqual(initialR1 & 0x40, 0, `${timing.name} display was not initially enabled.`);
      assert.notEqual(initialR1 & 0x20, 0, `${timing.name} NMI was not initially enabled.`);

      let blankFrame = 0;
      const expectedFrames = timing.rate * 5;
      for (let frame = 1; frame <= expectedFrames + 3; ++frame) {
        core.runFrame();
        const r1 = core.getVdpRegisters()[1];
        assert.notEqual(r1 & 0x20, 0, `${timing.name} blanking disabled NMI.`);
        if ((r1 & 0x40) === 0) {
          blankFrame = frame;
          break;
        }
      }
      assert.ok(
        Math.abs(blankFrame - expectedFrames) <= 1,
        `${timing.name} blanked at frame ${blankFrame}, expected ${expectedFrames}.`
      );

      // First fresh press after blanking wakes the display but must not confirm.
      core.setExecuteBreakpoint(resumedAddress);
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 3; ++frame) core.runFrame();
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
      for (let frame = 0; frame < 3; ++frame) {
        const result = core.runFrame();
        assert.equal(result.breakpointHit, false, `${timing.name} wake press also confirmed the pause.`);
      }
      const wokeR1 = core.getVdpRegisters()[1];
      assert.equal(wokeR1 & 0x40, initialR1 & 0x40, `${timing.name} wake press did not restore the display.`);
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 3; ++frame) {
        const result = core.runFrame();
        assert.equal(result.breakpointHit, false, `${timing.name} wake release escaped the pause.`);
      }

      // A distinct second press and release confirms and resumes execution.
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
      for (let frame = 0; frame < 3; ++frame) {
        const result = core.runFrame();
        assert.equal(result.breakpointHit, false, `${timing.name} confirmation escaped before release.`);
      }
      core.setControllerMask(0, 0);
      let resumed = false;
      for (let frame = 0; frame < 20; ++frame) {
        const result = core.runFrame();
        if (result.breakpointHit && result.pc === resumedAddress) {
          resumed = true;
          break;
        }
      }
      assert.equal(resumed, true, `${timing.name} did not resume after the second press and release.`);

      const restoredR1 = core.getVdpRegisters()[1];
      assert.equal(restoredR1 & 0x40, initialR1 & 0x40, `${timing.name} display bit was not restored.`);
      assert.equal(restoredR1 & 0x20, initialR1 & 0x20, `${timing.name} NMI bit changed during pause.`);
      assert.equal(restoredR1 & 0x03, initialR1 & 0x03, `${timing.name} sprite bits changed during pause.`);
    } finally {
      core.destroy();
    }
  }

  console.log(`CRT-safe pause ROM PASS (${optimization}: all actions, wake debounce, NTSC/PAL blanking, R1 restore)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
