#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";

const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "studio", "examples-src", "earth-globe-demo.alexis");
const projectDir = path.dirname(source);
const dataText = fs.readFileSync(path.join(projectDir, "earth-globe-data.asm"), "utf8");
const runtimeText = fs.readFileSync(path.join(projectDir, "earth-globe-runtime.asm"), "utf8");
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-earth-globe-"));
const expectedFrames = Array.from({ length: 12 }, (_, index) => readDbLabel(runtimeText, `FRAME_${String(index * 2).padStart(2, "0")}H_MAP`, 64));
const zx0 = await loadCodec("zx0");
const expectedPatterns = [...await zx0.decompress(fs.readFileSync(path.join(projectDir, "earth-globe.pattern.zx0")))];
const expectedSpritePatterns = readDbLabel(dataText, "SPRITE_MASK_PATTERNS", 384);
const expectedSpriteAttributes = [
  63, 96, 0, 1, 63, 112, 4, 1, 79, 96, 8, 1,
  63, 144, 12, 1, 63, 128, 16, 1, 79, 144, 20, 1,
  111, 96, 24, 1, 111, 112, 28, 1, 95, 96, 32, 1,
  111, 144, 36, 1, 111, 128, 40, 1, 95, 144, 44, 1,
];
const results = [];

verifySpriteScanlineBudget(expectedSpriteAttributes);

try {
  for (const profile of profiles) {
    const asmPath = path.join(temp, `${profile}.asm`);
    const romPath = path.join(temp, `${profile}.rom`);
    const compiled = spawnSync(process.execPath, [
      path.join(root, "tools", "amyc.mjs"), source,
      "--project-dir", projectDir, "--asm", asmPath, "--rom", romPath, "--opt", profile,
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(compiled.status, 0, `${profile} compile failed: ${compiled.error ?? ""}\n${compiled.stdout}\n${compiled.stderr}`);

    const asm = fs.readFileSync(asmPath, "utf8");
    const rom = fs.readFileSync(romPath);
    const frameAddress = symbolAddress(asm, "EarthFrame");
    const ticksAddress = symbolAddress(asm, "EarthTicks");
    assert.doesNotMatch(asm, /\bcall UPDATE_CONTROLLERS\b/, `${profile}: controller polling was linked without input usage`);
    const core = await GearcolecoTestCore.create({ seed: 0x45415254 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      let sawFrame1 = false;
      let sawFrame2 = false;
      let screenshotFrame = null;
      for (let tick = 0; tick < 80; tick += 1) {
        core.runFrame();
        const frame = core.readRam(frameAddress, 1)[0];
        if (frame === 1 && !sawFrame1) {
          verifyFrame(core, expectedFrames[1]);
          sawFrame1 = true;
          if (profile === "experimental") screenshotFrame = cloneFramebuffer(core.getFramebuffer());
        }
        if (frame === 2 && !sawFrame2) {
          verifyFrame(core, expectedFrames[2]);
          sawFrame2 = true;
        }
      }
      const finalFrame = core.readRam(frameAddress, 1)[0];
      const finalTicks = core.readRam(ticksAddress, 1)[0];
      assert.ok(sawFrame1 && sawFrame2, `${profile}: globe did not advance through frames 1 and 2 (frame=${finalFrame}, ticks=${finalTicks})`);
      assert.deepEqual([...core.readVram(0x0800, 2048)], expectedPatterns, `${profile}: reordered pattern upload mismatch`);
      assert.deepEqual(expectedPatterns.slice(0, 8), Array(8).fill(0), `${profile}: reserved void tile moved or changed`);
      assert.deepEqual(expectedPatterns.slice(0x7f8), Array(8).fill(0), `${profile}: reserved ocean tile moved or changed`);
      assert.deepEqual([...core.readVram(0x2008, 8)], Array(8).fill(0xf0), `${profile}: title-bank color mismatch`);
      assert.deepEqual([...core.readVram(0x2808, 8)], Array(8).fill(0xc4), `${profile}: globe color mismatch`);
      assert.deepEqual([...core.readVram(0x2ff8, 8)], Array(8).fill(0xc4), `${profile}: ocean color mismatch`);
      assert.deepEqual([...core.readVram(0x3800, 384)], expectedSpritePatterns, `${profile}: mask sprite patterns mismatch`);
      assert.deepEqual([...core.readVram(0x1b00, 48)], expectedSpriteAttributes, `${profile}: mask sprite attributes mismatch`);
      assert.equal(core.readVram(0x1b30, 1)[0], 0xd0, `${profile}: sprite-list terminator mismatch`);
      const registers = [...core.getVdpRegisters()];
      assert.equal(registers[0], 0x02, `${profile}: Graphics II R0 mismatch`);
      assert.equal(registers[3], 0xff, `${profile}: independent COLOR table requires R3=$FF`);
      assert.equal(registers[4], 0x03, `${profile}: Graphics II PATTERN table R4 mismatch`);
      results.push({ profile, romBytes: rom.length });

      if (profile === "experimental") {
        const screenshot = path.join(root, "build", "earth-globe-demo.png");
        assert.ok(screenshotFrame, "Missing globe screenshot frame");
        writeFramebufferPng(screenshotFrame, screenshot);
      }
    } finally {
      core.destroy();
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.table(results);
console.log("Earth Globe demo PASS (5 profiles, animation + tiles + 12-sprite mask verified)");

function readDbLabel(text, label, count) {
  const start = text.search(new RegExp(`^${label}:`, "m"));
  assert.ok(start >= 0, `Missing ${label}`);
  const tail = text.slice(start).split(/\r?\n/).slice(1);
  const values = [];
  for (const line of tail) {
    if (/^[A-Za-z_][A-Za-z0-9_]*:/.test(line.trim())) break;
    const code = line.split(";")[0];
    for (const match of code.matchAll(/\$([0-9A-F]{2})/gi)) values.push(Number.parseInt(match[1], 16));
  }
  assert.equal(values.length, count, `${label} byte count`);
  return values;
}

function symbolAddress(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "mi"));
  assert.ok(match, `Missing generated symbol for ${name}`);
  return Number.parseInt(match[1], 16);
}

function verifyFrame(core, expected) {
  for (let row = 0; row < 8; row += 1) {
    const actual = [...core.readVram(0x1800 + (8 + row) * 32 + 12, 8)];
    assert.deepEqual(actual, expected.slice(row * 8, row * 8 + 8), `Name Table row ${row}`);
  }
}

function verifySpriteScanlineBudget(attributes) {
  for (let screenY = 0; screenY < 192; screenY += 1) {
    let active = 0;
    for (let offset = 0; offset < attributes.length; offset += 4) {
      const top = attributes[offset] + 1;
      if (screenY >= top && screenY < top + 16) active += 1;
    }
    assert.ok(active <= 4, `Sprite scanline ${screenY} uses ${active} sprites`);
  }
}

function cloneFramebuffer(frame) {
  return { width: frame.width, height: frame.height, pixels: new Uint16Array(frame.pixels) };
}

function writeFramebufferPng(frame, output) {
  const rgba = Buffer.alloc(frame.width * frame.height * 4);
  for (let index = 0; index < frame.pixels.length; index += 1) {
    const pixel = frame.pixels[index];
    rgba[index * 4] = Math.round(((pixel >>> 11) & 31) * 255 / 31);
    rgba[index * 4 + 1] = Math.round(((pixel >>> 5) & 63) * 255 / 63);
    rgba[index * 4 + 2] = Math.round((pixel & 31) * 255 / 31);
    rgba[index * 4 + 3] = 255;
  }
  const encoded = spawnSync("ffmpeg", ["-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${frame.width}x${frame.height}`, "-i", "pipe:0", "-frames:v", "1", "-y", output], { input: rgba, encoding: null });
  assert.equal(encoded.status, 0, `Screenshot encoding failed: ${encoded.stderr?.toString() ?? ""}`);
}
