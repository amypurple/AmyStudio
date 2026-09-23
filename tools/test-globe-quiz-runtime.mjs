#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT as INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";
import { globeQuizProjectFiles } from "../studio/examples-globe-quiz-assets.generated.js";

const root = path.resolve(import.meta.dirname, "..");
const build = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "build", "globe-runtime-balanced");
const rom = fs.readFileSync(path.join(build, "globe-quiz.rom"));
const symbols = fs.readFileSync(path.join(build, "globe-quiz.sym"), "utf8");
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const files = new Map(globeQuizProjectFiles.map((file) => [file.path, file]));
const core = await GearcolecoTestCore.create({ seed: 0x474c4f42 });

function run(frames) {
  for (let frame = 0; frame < frames; frame += 1) core.runFrame();
}

function pulse(mask, held = 2, released = 5) {
  core.setControllerMask(0, mask);
  run(held);
  core.setControllerMask(0, 0);
  run(released);
}

function symbol(name) {
  const match = symbols.match(new RegExp(`^(?:[0-9A-F]+:)?([0-9A-F]{4})\\s+${name}$`, "mi"));
  assert.ok(match, `Missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

function bytes(name) {
  const file = files.get(name);
  assert.ok(file?.base64, `Missing embedded project file ${name}`);
  return Buffer.from(file.base64, "base64");
}

function expectedView(index) {
  const source = bytes("globe-views.asm").toString("utf8");
  const label = `GlobeView${String(index).padStart(2, "0")}:`;
  const start = source.indexOf(label);
  assert.notEqual(start, -1, `Missing ${label}`);
  const next = source.indexOf("\nGlobeView", start + label.length);
  const section = source.slice(start + label.length, next < 0 ? source.length : next);
  const values = [...section.matchAll(/\$([0-9A-F]{2})/gi)]
    .map((match) => Number.parseInt(match[1], 16));
  assert.equal(values.length, 256, `${label} must contain a 16x16 NAME block`);
  return values;
}

function actualView() {
  const values = [];
  for (let row = 0; row < 16; row += 1) {
    values.push(...core.readVram(0x1800 + (4 + row) * 32 + 8, 16));
  }
  return values;
}

function assertCurrentView() {
  const index = core.readRam(symbol("AMY_UVAR_GlobeView"), 1)[0];
  assert.deepEqual(actualView(), expectedView(index), `corrupt NAME block for view ${index}`);
}

try {
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  run(600);
  pulse(INPUT.FIRE_LEFT);
  run(300);
  assert.equal(core.readRam(symbol("AMY_UVAR_GlobeKey"), 1)[0], 1,
    "mode menu did not initialize");

  pulse(INPUT.KEYPAD_2, 3, 3);
  run(180);
  assert.equal(core.getVdpRegisters()[0], 2, "Graphics II mode was not enabled");
  assert.ok(core.getVdpRegisters()[1] & 0x40, "display is disabled after game start");

  const zx0 = await loadCodec("zx0");
  const expectedPatterns = await zx0.decompress(bytes("globe.pattern.zx0"));
  const expectedColors = await zx0.decompress(bytes("globe.color.zx0"));
  const expectedSprites = await zx0.decompress(bytes("globe-mask-sprites.zx0"));
  assert.equal(expectedPatterns.length, 0x1800);
  assert.equal(expectedColors.length, 0x1800);

  for (let bank = 0; bank < 3; bank += 1) {
    const expectedPattern = [...expectedPatterns.slice(bank * 0x800, (bank + 1) * 0x800)];
    const actualPattern = [...core.readVram(bank * 0x800, 0x800)];
    if (bank === 0) actualPattern[0] = expectedPattern[0];
    assert.deepEqual(actualPattern, expectedPattern, `corrupt pattern bank ${bank}`);
    assert.deepEqual(
      [...core.readVram(0x2000 + bank * 0x800, 0x800)],
      [...expectedColors.slice(bank * 0x800, (bank + 1) * 0x800)],
      `corrupt color bank ${bank}`
    );
  }
  assert.deepEqual([...core.readVram(0x3800, expectedSprites.length)], [...expectedSprites],
    "corrupt sprite patterns");
  const globeTiles = [...core.readVram(0x1800 + 4 * 32 + 8, 16 * 16)];
  assert.ok(globeTiles.some((tile) => tile > 1), "globe NAME table is empty or corrupt");
  assertCurrentView();
  for (let step = 0; step < 6; step += 1) {
    pulse(INPUT.KEYPAD_6, 3, 3);
    run(5);
    assertCurrentView();
  }
  pulse(INPUT.KEYPAD_2, 3, 3);
  run(5);
  assertCurrentView();
  console.log(`Globe Quiz runtime PASS: ${rom.length} bytes`);
} finally {
  core.destroy();
}
