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
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const cases = [
  {
    id: "decoder-p1",
    backend: "decoder",
    port: 1,
    joypads: [1],
    keypads: [],
    runtime: true,
    source: `project "DECODER P1"
u8 Held = 0
u8 Presses = 0
screen on
MainLoop:
  wait
  if joypad(1).up then Held = 1
  if joypad(1).button1.pressed then Presses += 1
  goto MainLoop
`
  },
  {
    id: "decoder-p2",
    backend: "decoder",
    port: 2,
    joypads: [2],
    keypads: [],
    runtime: true,
    source: `project "DECODER P2"
u8 Held = 0
u8 Presses = 0
screen on
MainLoop:
  wait
  if joypad(2).left then Held = 1
  if joypad(2).button1.pressed then Presses += 1
  goto MainLoop
`
  },
  {
    id: "decoder-standard-fire",
    backend: "compact",
    port: 1,
    runtime: true,
    inputMask: GEARCOLECO_TEST_INPUT.FIRE_RIGHT,
    joypads: [1],
    keypads: [],
    source: `project "STANDARD FIRE DECODER"
u8 Held = 0
u8 Presses = 0
screen on
MainLoop:
  wait
  if joypad(1).fire then Held = 1
  if joypad(1).fire.pressed then Presses += 1
  goto MainLoop
`
  },
  {
    id: "decoder-keypad",
    backend: "decoder",
    port: 1,
    runtime: "keypad",
    joypads: [],
    keypads: [1],
    source: `project "KEYPAD DECODER"
u8 Key = 0
screen on
MainLoop:
  wait
  Key = keypad(1)
  goto MainLoop
`
  },
  {
    id: "decoder-dual-port",
    backend: "compact",
    joypads: [1, 2],
    keypads: [],
    source: `project "DUAL PORT DECODER"
screen on
MainLoop:
  wait
  if joypad(1).up then goto MainLoop
  if joypad(2).down then goto MainLoop
  goto MainLoop
`
  },
  {
    id: "decoder-wait-single-port",
    backend: "compact",
    port: 1,
    runtime: "wait-release",
    joypads: [1],
    keypads: [],
    source: `project "WAIT SINGLE PORT DECODER"
u8 Done = 0
screen on
wait no fire on joypad 1
Done = 1
loop forever
`
  },
  {
    id: "decoder-pause-dual-port",
    backend: "compact",
    runtime: "pause",
    joypads: [1, 2],
    keypads: [],
    source: `project "PAUSE DUAL PORT DECODER"
u8 Done = 0
screen on
pause until press and release
Done = 1
loop forever
`
  },
  {
    id: "decoder-wait-frames-or-press",
    backend: "compact",
    port: 2,
    runtime: "timed-press",
    joypads: [2],
    keypads: [],
    source: `project "TIMED PRESS DECODER"
u8 Done = 0
screen on
wait 600 frames or press on joypad 2
Done = 1
loop forever
`
  },
  {
    id: "decoder-choose-keypad",
    backend: "compact",
    joypads: [],
    keypads: [1, 2],
    source: `project "CHOOSE KEYPAD DECODER"
u8 Choice = 4
screen on
choose keypad 4 to 6 into Choice
loop forever
`
  },
  {
    id: "decoder-choose-menu",
    backend: "compact",
    joypads: [1],
    keypads: [1],
    source: `project "CHOOSE MENU DECODER"
u8 Choice = 1
text screen
screen on
choose menu 1 to 4 into Choice cursor $3E at 6,9 step 2
loop forever
`
  },
  {
    id: "decoder-sleep",
    backend: "compact",
    joypads: [1, 2],
    keypads: [1, 2],
    source: `project "SLEEP DECODER"
screen on
MainLoop:
  wait
  sleep after 10 seconds
  goto MainLoop
`
  },
  {
    id: "fallback-dynamic-port",
    backend: "amy",
    joypads: [1, 2],
    keypads: [1, 2],
    source: `project "DYNAMIC PORT FALLBACK"
u8 Port = 1
screen on
MainLoop:
  wait
  if joypad(Port).up then goto MainLoop
  goto MainLoop
`
  },
  {
    id: "fallback-super-action",
    backend: "amy",
    joypads: [1, 2],
    keypads: [1, 2],
    source: `project "SUPER ACTION FALLBACK"
screen on
MainLoop:
  wait
  if joypad(1).button3 then goto MainLoop
  goto MainLoop
`
  }
];

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function parseEqu(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `Missing ${name}`);
  return Number.parseInt(match[1], 16);
}

function runFrames(core, count, controller, mask) {
  core.setControllerMask(controller, mask);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-controller-backends-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    for (const testCase of cases) {
      const sourcePath = join(outputDir, `${testCase.id}-${profile}.alexis`);
      const asmPath = join(outputDir, `${testCase.id}-${profile}.asm`);
      const romPath = join(outputDir, `${testCase.id}-${profile}.rom`);
      await writeFile(sourcePath, testCase.source);
      await compile(sourcePath, asmPath, romPath, profile);
      const [asm, romFile] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
      const usesDecoder = /call\s+DECODE_CONTROLLER/i.test(asm);
      const usesAmy = /call\s+UPDATE_CONTROLLERS/i.test(asm);
      assert.equal(usesDecoder, testCase.backend === "decoder", `${testCase.id}/${profile}: DECODER selection`);
      assert.equal(usesAmy, testCase.backend !== "decoder", `${testCase.id}/${profile}: CONT_SCAN selection`);

      if (testCase.backend !== "amy") {
        for (const port of [1, 2]) {
          const joypadPattern = new RegExp(`^JOYPAD_${port}\\s+EQU`, "m");
          const keypadPattern = new RegExp(`^KEYPAD_${port}\\s+EQU`, "m");
          assert.equal(joypadPattern.test(asm), testCase.joypads.includes(port), `${testCase.id}/${profile}: joypad ${port} RAM`);
          assert.equal(keypadPattern.test(asm), testCase.keypads.includes(port), `${testCase.id}/${profile}: keypad ${port} RAM`);
        }
      } else {
        for (const symbol of ["JOYPAD_1", "KEYPAD_1", "JOYPAD_2", "KEYPAD_2"]) parseEqu(asm, symbol);
      }

      if (!testCase.runtime) continue;
      if (["wait-release", "pause", "timed-press"].includes(testCase.runtime)) {
        const resultName = testCase.runtime.startsWith("choose-") ? "AMY_UVAR_Choice" : "AMY_UVAR_Done";
        const resultAddress = parseEqu(asm, resultName);
        const rom = new Uint8Array(romFile);
        rom[0] = 0x55;
        rom[1] = 0xaa;
        const core = await GearcolecoTestCore.create({ seed: 0x434d4453 });
        try {
          core.loadBios(bios);
          core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
          if (testCase.runtime === "wait-release") {
            runFrames(core, 20, 0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
            assert.equal(core.readRam(resultAddress, 1)[0], 0, `${testCase.id}/${profile}: waits while held`);
            runFrames(core, 5, 0, 0);
            assert.equal(core.readRam(resultAddress, 1)[0], 1, `${testCase.id}/${profile}: continues on release`);
          } else if (testCase.runtime === "pause") {
            runFrames(core, 20, 1, 0);
            runFrames(core, 5, 1, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
            assert.equal(core.readRam(resultAddress, 1)[0], 0, `${testCase.id}/${profile}: consumes final release`);
            runFrames(core, 5, 1, 0);
            assert.equal(core.readRam(resultAddress, 1)[0], 1, `${testCase.id}/${profile}: second port confirms`);
          } else if (testCase.runtime === "timed-press") {
            runFrames(core, 20, 1, 0);
            assert.equal(core.readRam(resultAddress, 1)[0], 0, `${testCase.id}/${profile}: timer still waiting`);
            runFrames(core, 5, 1, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
            assert.equal(core.readRam(resultAddress, 1)[0], 1, `${testCase.id}/${profile}: exits on FIRE 2`);
          }
        } finally {
          core.destroy();
        }
        continue;
      }
      if (testCase.runtime === "keypad") {
        const keyAddress = parseEqu(asm, "AMY_UVAR_Key");
        const keypadAddress = parseEqu(asm, `KEYPAD_${testCase.port}`);
        const rom = new Uint8Array(romFile);
        rom[0] = 0x55;
        rom[1] = 0xaa;
        const core = await GearcolecoTestCore.create({ seed: 0x4b455950 });
        try {
          core.loadBios(bios);
          core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
          runFrames(core, 60, testCase.port - 1, 0);
          assert.equal(core.readRam(keypadAddress, 1)[0], 0xff, `${testCase.id}/${profile}: idle keypad`);
          const keypadInputs = [
            GEARCOLECO_TEST_INPUT.KEYPAD_0, GEARCOLECO_TEST_INPUT.KEYPAD_1,
            GEARCOLECO_TEST_INPUT.KEYPAD_2, GEARCOLECO_TEST_INPUT.KEYPAD_3,
            GEARCOLECO_TEST_INPUT.KEYPAD_4, GEARCOLECO_TEST_INPUT.KEYPAD_5,
            GEARCOLECO_TEST_INPUT.KEYPAD_6, GEARCOLECO_TEST_INPUT.KEYPAD_7,
            GEARCOLECO_TEST_INPUT.KEYPAD_8, GEARCOLECO_TEST_INPUT.KEYPAD_9,
            GEARCOLECO_TEST_INPUT.KEYPAD_ASTERISK, GEARCOLECO_TEST_INPUT.KEYPAD_HASH
          ];
          const decoded = [];
          for (const input of keypadInputs) {
            runFrames(core, 4, testCase.port - 1, input);
            decoded.push(core.readRam(keyAddress, 1)[0]);
            runFrames(core, 3, testCase.port - 1, 0);
          }
          assert.deepEqual(decoded, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], `${testCase.id}/${profile}: complete keypad mapping`);
          assert.equal(core.readRam(keypadAddress, 1)[0], 0xff, `${testCase.id}/${profile}: keypad release`);
        } finally {
          core.destroy();
        }
        continue;
      }
      const heldAddress = parseEqu(asm, "AMY_UVAR_Held");
      const pressesAddress = parseEqu(asm, "AMY_UVAR_Presses");
      const joypadAddress = parseEqu(asm, `JOYPAD_${testCase.port}`);
      assert.equal(
        heldAddress,
        parseEqu(asm, "AMY_RAM_BASE"),
        `${testCase.id}/${profile}: compiler and runtime RAM layouts must agree`
      );
      const rom = new Uint8Array(romFile);
      rom[0] = 0x55;
      rom[1] = 0xaa;
      const core = await GearcolecoTestCore.create({ seed: 0x4445434f });
      try {
        core.loadBios(bios);
        core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
        const controller = testCase.port - 1;
        runFrames(core, 60, controller, 0);
        assert.deepEqual([...core.readRam(heldAddress, 2)], [0, 0], `${testCase.id}/${profile}: idle`);
        const direction = testCase.port === 1 ? GEARCOLECO_TEST_INPUT.UP : GEARCOLECO_TEST_INPUT.LEFT;
        const inputMask = testCase.inputMask ?? (direction | GEARCOLECO_TEST_INPUT.FIRE_LEFT);
        runFrames(core, 5, controller, inputMask);
        assert.deepEqual(
          [...core.readRam(heldAddress, 2)],
          [1, 1],
          `${testCase.id}/${profile}: first press; joypad=$${core.readRam(joypadAddress, 1)[0].toString(16)}`
        );
        runFrames(core, 5, controller, inputMask);
        assert.equal(core.readRam(pressesAddress, 1)[0], 1, `${testCase.id}/${profile}: held repeat`);
        runFrames(core, 4, controller, 0);
        runFrames(core, 5, controller, testCase.inputMask ?? GEARCOLECO_TEST_INPUT.FIRE_LEFT);
        assert.equal(core.readRam(pressesAddress, 1)[0], 2, `${testCase.id}/${profile}: second press`);
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`Controller backend ROM: PASS (${cases.length} cases x ${profiles.length} profiles)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}

