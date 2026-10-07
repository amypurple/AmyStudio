#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const require = createRequire(import.meta.url);
const { PNG } = require("C:/Users/Amy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const romPath = resolve(root, "build/os7-pattern-transform-lab/amy-vdp-pattern-tools-lab.rom");
const outputPath = resolve(root, "build/os7-pattern-transform-lab/os7-pattern-transform-lab.png");
const enlargedColors = [
  0xf1, 0xf1, 0xe1, 0xe1, 0xd1, 0xd1, 0xc1, 0xc1,
  0xb1, 0xb1, 0xa1, 0xa1, 0x91, 0x91, 0x81, 0x81,
  0xf1, 0xf1, 0xe1, 0xe1, 0xd1, 0xd1, 0xc1, 0xc1,
  0xb1, 0xb1, 0xa1, 0xa1, 0x91, 0x91, 0x81, 0x81
];
const sourceColors = [0xf1, 0xe1, 0xd1, 0xc1, 0xb1, 0xa1, 0x91, 0x81];
const enlargedReversedColors = [
  0x81, 0x81, 0x91, 0x91, 0xa1, 0xa1, 0xb1, 0xb1,
  0xc1, 0xc1, 0xd1, 0xd1, 0xe1, 0xe1, 0xf1, 0xf1,
  0x81, 0x81, 0x91, 0x91, 0xa1, 0xa1, 0xb1, 0xb1,
  0xc1, 0xc1, 0xd1, 0xd1, 0xe1, 0xe1, 0xf1, 0xf1
];

function writeFramebuffer(frame) {
  const png = new PNG({ width: frame.width, height: frame.height });
  for (let index = 0; index < frame.pixels.length; index += 1) {
    const pixel = frame.pixels[index];
    const target = index * 4;
    png.data[target] = ((pixel >> 11) & 0x1f) * 255 / 31;
    png.data[target + 1] = ((pixel >> 5) & 0x3f) * 255 / 63;
    png.data[target + 2] = (pixel & 0x1f) * 255 / 31;
    png.data[target + 3] = 255;
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, PNG.sync.write(png));
}

const core = await GearcolecoTestCore.create({ seed: 0x50415454 });
try {
  core.loadBios(readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 900; frame += 1) core.runFrame();

  const nameShadow = core.readRam(0x73f6, 2);
  const nameBase = nameShadow[0] | (nameShadow[1] << 8);
  const name = core.readVram(nameBase, 32 * 24);
  const tileAt = (x, y) => name[y * 32 + x];
  writeFramebuffer(core.getFramebuffer());
  assert.equal(tileAt(7, 17), 128, "8x8 source placement");
  assert.deepEqual(
    [...core.readVram(0x2800 + 129 * 8, 8)],
    sourceColors,
    "left-right flip keeps row colors in place"
  );
  assert.deepEqual(
    [...core.readVram(0x2800 + 130 * 8, 8)],
    [...sourceColors].reverse(),
    "top-bottom flip reverses row colors with the pattern rows"
  );
  assert.deepEqual(
    [tileAt(22, 16), tileAt(23, 16), tileAt(22, 17), tileAt(23, 17)],
    [144, 146, 145, 147],
    "2x enlargement tile order"
  );
  assert.deepEqual(
    [...core.readVram(0x0800 + 152 * 8, 32)],
    [...core.readVram(152 * 8, 32)],
    "middle-third top/bottom enlargement"
  );
  assert.deepEqual(
    [...core.readVram(0x1000 + 144 * 8, 32)],
    [...core.readVram(144 * 8, 32)],
    "bottom-third original enlargement"
  );
  assert.deepEqual(
    [...core.readVram(0x2000 + 144 * 8, 32)],
    enlargedColors,
    "Graphics II color rows are duplicated across the four enlarged tiles"
  );
  assert.deepEqual(
    [...core.readVram(0x2800 + 152 * 8, 32)],
    enlargedReversedColors,
    "middle-third enlargement keeps the top-bottom flipped colors"
  );
  assert.deepEqual(
    [...core.readVram(0x3000 + 144 * 8, 32)],
    enlargedColors,
    "bottom-third enlargement keeps the expected transformed colors"
  );
  console.log(`OS7 pattern transform visual: PASS\nScreenshot: ${outputPath}`);
} finally {
  core.destroy();
}
