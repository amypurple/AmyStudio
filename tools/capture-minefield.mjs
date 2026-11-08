#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const require = createRequire(import.meta.url);
const { PNG } = require("C:/Users/Amy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs");
const root = resolve(import.meta.dirname, "..");
const core = await GearcolecoTestCore.create({ seed: 0x4d494e45 });

function frames(count, mask = 0) {
  core.setControllerMask(0, mask);
  for (let index = 0; index < count; index += 1) core.runFrame();
}

function capture(path) {
  const framebuffer = core.getFramebufferView();
  const rgba = Buffer.alloc(framebuffer.width * framebuffer.height * 4);
  for (let index = 0; index < framebuffer.pixels.length; index += 1) {
    const color = framebuffer.pixels[index];
    rgba[index * 4] = ((color >> 11) & 0x1f) * 255 / 31;
    rgba[index * 4 + 1] = ((color >> 5) & 0x3f) * 255 / 63;
    rgba[index * 4 + 2] = (color & 0x1f) * 255 / 31;
    rgba[index * 4 + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write({ width: framebuffer.width, height: framebuffer.height, data: rgba }));
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  if (!match) throw new Error(`Missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

function words(length, values = []) {
  const result = new Uint8Array(length * 2);
  values.forEach((value, index) => {
    result[index * 2] = value & 0xff;
    result[index * 2 + 1] = value >>> 8;
  });
  return result;
}

try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  const rom = new Uint8Array(readFileSync(resolve(root, "build/minefield.rom")));
  rom[0] = 0x55;
  rom[1] = 0xaa;
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  frames(90);
  capture(resolve(root, "build/minefield-title.png"));
  const titleState = core.saveState();

  frames(2, GEARCOLECO_TEST_INPUT.DOWN);
  frames(8);
  frames(2, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  frames(8);
  capture(resolve(root, "build/minefield-how-1.png"));
  frames(2, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  frames(8);
  capture(resolve(root, "build/minefield-how-2.png"));

  core.loadState(titleState, { controllerMasks: [0, 0] });
  frames(2, GEARCOLECO_TEST_INPUT.DOWN);
  frames(8);
  frames(2, GEARCOLECO_TEST_INPUT.DOWN);
  frames(8);
  frames(2, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  frames(8);
  capture(resolve(root, "build/minefield-credits.png"));

  core.loadState(titleState, { controllerMasks: [0, 0] });
  frames(4, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  frames(12);
  capture(resolve(root, "build/minefield-danger.png"));
  frames(4, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
  frames(30);
  capture(resolve(root, "build/minefield-gameplay.png"));
  const asm = readFileSync(resolve(root, "build/minefield.asm"), "utf8");
  core.writeRam(addressOf(asm, "AMY_UVAR_BombX"), [15, ...Array(20).fill(0)]);
  core.writeRam(addressOf(asm, "AMY_UVAR_BombY"), [13, ...Array(20).fill(0)]);
  core.writeRam(addressOf(asm, "AMY_UVAR_BombTime"), words(21, [10]));
  core.writeRam(addressOf(asm, "AMY_UVAR_BombWarn"), words(21, [1]));
  core.writeRam(addressOf(asm, "AMY_UVAR_BombFlash"), words(21, [2]));
  core.writeRam(addressOf(asm, "AMY_UVAR_BombExplode"), words(21, [10]));
  core.writeRam(addressOf(asm, "AMY_UVAR_BombState"), [0, ...Array(20).fill(3)]);
  core.writeRam(addressOf(asm, "AMY_UVAR_BombsLeft"), [1]);
  core.writeRam(addressOf(asm, "AMY_UVAR_InitialBombs"), [1]);
  core.writeRam(addressOf(asm, "AMY_UVAR_BombsGathered"), [0]);
  core.writeRam(addressOf(asm, "AMY_UVAR_PX"), [15]);
  core.writeRam(addressOf(asm, "AMY_UVAR_PY"), [13]);
  frames(1);
  capture(resolve(root, "build/minefield-explosion.png"));
  console.log("Captured Minefield title, instructions, credits, danger menu, and gameplay screens.");
} finally {
  core.destroy();
}
