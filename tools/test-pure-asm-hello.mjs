#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "competition", "benchmarks", "hello-world", "asm-hello-world-2010.asm");
const outputDir = path.join(root, "build", "competition", "hello-world");
const screenshotPath = path.join(root, "competition", "benchmarks", "screenshots", "asm-hello-world-2010.png");
const source = fs.readFileSync(sourcePath, "utf8");
const assembled = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "asm-hello-world-2010.rom",
  outputMode: "binary",
  targetPlatform: "coleco",
  optimizerEnabled: false
});

assert.equal(assembled.ok, true, assembled.log || "Pure ASM assembly failed");
const rom = assembled.binary || assembled.bytes;
assert.ok(rom?.length, "Assembler returned an empty ROM");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "asm-hello-world-2010.rom"), rom);

const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const core = await GearcolecoTestCore.create({ seed: 0x48454c4f });
try {
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 900; frame += 1) core.runFrame();

  const expected = Buffer.from("HELLO WORLD!", "ascii");
  assert.deepEqual(Buffer.from(core.readVram(0x180a, expected.length)), expected,
    "The 2010 ASM sample did not write HELLO WORLD! at row 0, column 10");

  const frame = core.getFramebuffer();
  const visibleTop = Math.max(0, Math.floor((frame.height - 192) / 2));
  const visibleHeight = 192;
  const rgba = Buffer.alloc(frame.width * visibleHeight * 4);
  for (let y = 0; y < visibleHeight; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const sourceIndex = (y + visibleTop) * frame.width + x;
      const outputIndex = (y * frame.width + x) * 4;
      const pixel = frame.pixels[sourceIndex];
      rgba[outputIndex] = Math.round(((pixel >>> 11) & 31) * 255 / 31);
      rgba[outputIndex + 1] = Math.round(((pixel >>> 5) & 63) * 255 / 63);
      rgba[outputIndex + 2] = Math.round((pixel & 31) * 255 / 31);
      rgba[outputIndex + 3] = 255;
    }
  }
  const require = createRequire(import.meta.url);
  const { PNG } = require("C:/Users/Amy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs");
  fs.writeFileSync(screenshotPath, PNG.sync.write({ width: frame.width, height: visibleHeight, data: rgba }));
  console.log(`PASS pure ASM Hello World: ${rom.length} occupied bytes, exact VRAM text after BIOS title startup`);
} finally {
  core.destroy();
}
