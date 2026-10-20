#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION,
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
const fire = GEARCOLECO_TEST_INPUT.FIRE_LEFT | GEARCOLECO_TEST_INPUT.FIRE_RIGHT;
const cases = [
  { id: "barrier-battle", inputs: [fire, GEARCOLECO_TEST_INPUT.KEYPAD_1] },
  { id: "roader", inputs: [GEARCOLECO_TEST_INPUT.KEYPAD_1, fire] },
  { id: "ti-mozart", inputs: [fire] },
  { id: "worm-of-bemer", inputs: [fire, GEARCOLECO_TEST_INPUT.KEYPAD_1] },
  { id: "jumping-jack", inputs: [fire] },
  { id: "gold-miner", inputs: [fire, fire] },
  { id: "first-math", inputs: [GEARCOLECO_TEST_INPUT.KEYPAD_1] },
  { id: "southern-states", inputs: [fire] },
  { id: "diamond-drop", inputs: [fire, fire, GEARCOLECO_TEST_INPUT.KEYPAD_1] },
  { id: "mystery-spell", inputs: [fire, fire, GEARCOLECO_TEST_INPUT.KEYPAD_2] },
  { id: "crazy-climber", inputs: [fire, fire] },
  { id: "get-the-gold", inputs: [fire, fire, GEARCOLECO_TEST_INPUT.KEYPAD_2] },
];

function screenSignature(core) {
  const pixels = core.getFramebuffer().pixels;
  let hash = 2166136261;
  for (let index = 0; index < pixels.length; index += 1) {
    hash ^= pixels[index];
    hash = Math.imul(hash, 16777619);
  }
  for (const value of core.readVram(0x1800, 32 * 24)) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function textScreen(core) {
  return String.fromCharCode(...core.readVram(0x1800, 32 * 24));
}

function runFrames(core, count) {
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
}

function tap(core, input) {
  core.setControllerMask(0, input);
  runFrames(core, 4);
  const observed = core.readRam(0x7080, 2);
  core.setControllerMask(0, 0);
  runFrames(core, 45);
  return { pressed: [...observed], released: [...core.readRam(0x7080, 2)] };
}

const temp = mkdtempSync(join(tmpdir(), "amy-ti99-ports-"));
try {
  for (const testCase of cases) {
    const source = resolve(root, "studio/examples-src", `${testCase.id}.alexis`);
    const asm = join(temp, `${testCase.id}.asm`);
    const rom = join(temp, `${testCase.id}.rom`);
    const build = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", "balanced"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(build.status, 0, `${testCase.id} compile failed:\n${build.stdout || ""}${build.stderr || ""}`);

    const core = await GearcolecoTestCore.create({ seed: 0x54493939 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      const biosTitle = screenSignature(core);
      runFrames(core, 900);
      const biosFire = tap(core, fire);
      runFrames(core, 90);
      const biosInput = tap(core, GEARCOLECO_TEST_INPUT.KEYPAD_1);
      const signatures = new Set();
      const observations = [biosFire, biosInput];
      if (testCase.id === "roader") {
        tap(core, fire);
        tap(core, fire);
        let spriteTable = core.readVram(0x1b00, 8);
        for (let frame = 0; frame < 180 && spriteTable[0] === 207; frame += 1) {
          core.runFrame();
          spriteTable = core.readVram(0x1b00, 8);
        }
        assert.notEqual(spriteTable[0], 207, "roader never displayed the car after selecting a skill");
        const beforeSteer = spriteTable[1];
        core.setControllerMask(0, GEARCOLECO_TEST_INPUT.RIGHT);
        runFrames(core, 8);
        core.setControllerMask(0, 0);
        const afterSteer = core.readVram(0x1b00, 8)[1];
        assert.ok(afterSteer > beforeSteer, `roader ignored right steering: ${beforeSteer} -> ${afterSteer}`);

        let finished = false;
        for (let frame = 0; frame < 16000 && !finished; frame += 1) {
          const roadRow = [...core.readVram(0x1800 + 19 * 32, 32)];
          const drivable = roadRow
            .map((tile, column) => ({ tile, column }))
            .filter(cell => cell.tile === 129 || cell.tile === 133);
          let input = 0;
          if (drivable.length > 0) {
            const first = drivable[0].column;
            const last = drivable[drivable.length - 1].column;
            const targetX = ((first + last + 1) * 4) - 8;
            const currentX = core.readVram(0x1b00, 2)[1];
            if (currentX + 2 < targetX) input = GEARCOLECO_TEST_INPUT.RIGHT;
            else if (currentX > targetX + 2) input = GEARCOLECO_TEST_INPUT.LEFT;
          }
          core.setControllerMask(0, input);
          core.runFrame();
          if ((frame % 30) === 0) {
            finished = textScreen(core).includes("YOU MADE IT");
          }
        }
        core.setControllerMask(0, 0);
        assert.ok(finished, "roader did not finish when the scrolling finish line reached the car");
      }
      for (let phase = 0; phase < 4; phase += 1) {
        runFrames(core, 90);
        signatures.add(screenSignature(core));
        const framebuffer = core.getFramebuffer().pixels;
        assert.ok(new Set(framebuffer).size >= 2, `${testCase.id} phase ${phase} rendered a blank screen`);
        if (testCase.inputs[phase] !== undefined) observations.push(tap(core, testCase.inputs[phase]));
      }
      assert.ok(signatures.size >= 2, `${testCase.id} never advanced to a distinct rendered state (${[...signatures].join(", ")}); inputs ${JSON.stringify(observations)}; CPU ${JSON.stringify(core.getCpuState())}`);
      assert.ok(!signatures.has(biosTitle), `${testCase.id} remained on the ColecoVision BIOS title screen`);
      assert.ok([...core.readVram(65 * 8, 8)].some(Boolean), `${testCase.id} left the active uppercase font blank`);
      console.log(`${testCase.id}: PASS (${signatures.size} distinct sampled screens)`);
    } finally {
      core.destroy();
    }
  }
  console.log(`TI-99/4A ports runtime smoke test: PASS (${cases.length} projects)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
