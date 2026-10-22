#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT as INPUT,
  GEARCOLECO_TEST_REGION,
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const rom = resolve(root, "artifacts/caverns/caverns.rom");
const asm = readFileSync(resolve(root, "artifacts/caverns/caverns.asm"), "utf8");
const addressOf = (name) => {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
};

function runFrames(core, count, input = 0) {
  core.setControllerMask(0, input);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
  core.setControllerMask(0, 0);
}

function tap(core, input) {
  runFrames(core, 4, input);
  runFrames(core, 40);
}

const core = await GearcolecoTestCore.create({ seed: 0x1983CAFE });
try {
    core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
    core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 240);
    tap(core, INPUT.FIRE_LEFT);
    runFrames(core, 100);

    const initialY = core.readVram(0x1B00, 1)[0];
    runFrames(core, 24, INPUT.DOWN);
    const downY = core.readVram(0x1B00, 1)[0];
    assert.ok(downY > initialY, `DOWN did not move the couple (${initialY} -> ${downY})`);

    runFrames(core, 48, INPUT.UP);
    const upY = core.readVram(0x1B00, 1)[0];
    assert.ok(upY < downY, `UP did not move the couple (${downY} -> ${upY})`);

    for (const nameBase of [0x1800, 0x1C00]) {
      const topRows = core.readVram(nameBase + 32, 64);
      assert.ok([...topRows].every((value) => value < 128),
        `cave pair tiles leaked into reserved top rows at $${nameBase.toString(16)}`);
    }
    runFrames(core, 300);
    assert.ok(core.readVram(0x1B00, 1)[0] < 192, "the couple disappeared during ordinary play");

    core.writeRam(addressOf("Lives"), [1]);
    core.writeRam(addressOf("Dead"), [1]);
    runFrames(core, 260);
    const finalScreen = core.readVram(0x1800, 32 * 24);
    const finalText = String.fromCharCode(...finalScreen);
    assert.match(finalText, /IN THE CAVERNS/);
    assert.match(finalText, /FINAL SCORE/);
    assert.match(finalText, /ANOTHER GAME/);
    assert.match(finalText, /TITLE PAGE/);
    assert.ok([...finalScreen.slice(32)].every((value) => value < 128),
      "cave pair tiles remained behind the final menu");
    assert.equal(core.readVram(0x1B00, 1)[0], 192, "a gameplay sprite remained on the final menu");
    console.log(`Caverns runtime test: PASS (vertical ${initialY} -> ${downY} -> ${upY}, clean final menu)`);
} finally {
  core.destroy();
}
