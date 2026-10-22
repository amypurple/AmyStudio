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
const romBytes = readFileSync(rom);
assert.ok(romBytes.length <= 16 * 1024, `Caverns ROM exceeds 16 KiB (${romBytes.length} bytes)`);
const asm = readFileSync(resolve(root, "artifacts/caverns/caverns.asm"), "utf8");
const pairPattern = readFileSync(resolve(root, "examples/ports/books/caverns/caverns-pairs.pattern.raw"));
const pairColor = readFileSync(resolve(root, "examples/ports/books/caverns/caverns-pairs.color.raw"));
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
    core.loadRom(romBytes, { region: GEARCOLECO_TEST_REGION.NTSC });
    let titleAudioSamples = 0;
    for (let frame = 0; frame < 240; frame += 1) {
      core.runFrame();
      for (const sample of core.getAudioFrame().samples) {
        if (Math.abs(sample) > 24) titleAudioSamples += 1;
      }
    }
    assert.ok(titleAudioSamples > 1000, "the title theme must remain audible");
    tap(core, INPUT.FIRE_LEFT);
    runFrames(core, 100);

    for (let frame = 0; frame < 48; frame += 1) {
      core.runFrame();
      const scroll = core.readRam(addressOf("LastScr"), 1)[0];
      const trap = core.readRam(addressOf("LastTrap"), 1)[0];
      assert.ok(scroll < 8 && trap < 2, `invalid loaded pair state ${scroll}/${trap}`);
      const offset = scroll * 128 + trap * 1024;
      assert.deepEqual(Buffer.from(core.readVram(0x0400, 128)), pairPattern.subarray(offset, offset + 128),
        `pattern pair slice diverged at scroll ${scroll}, trap ${trap}`);
      assert.deepEqual(Buffer.from(core.readVram(0x2400, 128)), pairColor.subarray(offset, offset + 128),
        `color pair slice diverged at scroll ${scroll}, trap ${trap}`);
    }

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

    const base = core.readRam(addressOf("Base"), 1)[0];
    core.writeRam(addressOf("CKind"), [0]);
    core.writeRam(addressOf("CXp"), [80]);
    core.writeRam(addressOf("CLn"), [(base + 2) & 255]);
    runFrames(core, 1);
    assert.equal(core.readRam(0x7090 + 4 * 4, 1)[0], 192,
      "a Crusher remained visible in the reserved HUD rows");

    const nextBase = core.readRam(addressOf("Base"), 1)[0];
    core.writeRam(addressOf("CLn"), [(nextBase + 3) & 255]);
    runFrames(core, 1);
    assert.ok(core.readRam(0x7090 + 4 * 4, 1)[0] < 192,
      "a Crusher disappeared from the first visible cave row");

    runFrames(core, 300);
    assert.ok(core.readVram(0x1B00, 1)[0] < 192, "the couple disappeared during ordinary play");

    const shownTable = core.readRam(addressOf("ZShow"), 1)[0] ? 0x1C00 : 0x1800;
    const beforeFinal = Buffer.from(core.readVram(shownTable, 32 * 24));
    core.writeRam(addressOf("HighScore"), [0xFF, 0xFF]);
    core.writeRam(addressOf("Lives"), [1]);
    core.writeRam(addressOf("Dead"), [1]);
    runFrames(core, 260);
    const finalScreen = Buffer.from(core.readVram(shownTable, 32 * 24));
    const finalText = String.fromCharCode(...finalScreen);
    assert.match(finalText, /FINAL/);
    assert.match(finalText, /BEST/);
    assert.match(finalText, /PLAY AGAIN/);
    assert.match(finalText, /TITLE PAGE/);
    for (let row = 0; row < 24; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        if (row >= 10 && row <= 13 && column >= 4 && column <= 27) continue;
        assert.equal(finalScreen[row * 32 + column], beforeFinal[row * 32 + column],
          `the result panel changed the cave at ${column},${row}`);
      }
    }
    assert.equal(core.readVram(0x1B00, 1)[0], 192, "a gameplay sprite remained on the final menu");
    console.log(`Caverns runtime test: PASS (vertical ${initialY} -> ${downY} -> ${upY}, preserved in-game result panel)`);
} finally {
  core.destroy();
}

const recordCore = await GearcolecoTestCore.create({ seed: 0x1983CAFE });
try {
  recordCore.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  recordCore.loadRom(romBytes, { region: GEARCOLECO_TEST_REGION.NTSC });
  runFrames(recordCore, 240);
  tap(recordCore, INPUT.FIRE_LEFT);
  runFrames(recordCore, 100);
  recordCore.writeRam(addressOf("HighScore"), [1, 0]);
  recordCore.writeRam(addressOf("HighName"), [65, 66, 67]);
  recordCore.writeRam(addressOf("Score"), [100, 0]);
  recordCore.writeRam(addressOf("Lives"), [1]);
  recordCore.writeRam(addressOf("Dead"), [1]);
  runFrames(recordCore, 330);
  const shownTable = recordCore.readRam(addressOf("ZShow"), 1)[0] ? 0x1C00 : 0x1800;
  const recordText = String.fromCharCode(...recordCore.readVram(shownTable, 32 * 24));
  assert.match(recordText, /GOOD SHOOTING!/);
  assert.match(recordText, /BEAT ABC 00001/);
  assert.match(recordText, /INITIALS:\s+AAA/);
  tap(recordCore, INPUT.FIRE_LEFT);
  tap(recordCore, INPUT.FIRE_LEFT);
  tap(recordCore, INPUT.FIRE_LEFT);
  const menuText = String.fromCharCode(...recordCore.readVram(shownTable, 32 * 24));
  assert.match(menuText, /BEST AAA\s+00100/);
} finally {
  recordCore.destroy();
}
