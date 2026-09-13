#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION,
} from "../studio/core/gearcolecoTestCore.js";
import { loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "studio", "examples-src", "solar-system-encyclopedia.alexis");
const projectDir = path.dirname(source);
const assetDir = path.join(projectDir, "solar-system-encyclopedia-assets");
const buildDir = path.join(root, "build", "solar-system-encyclopedia");
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const zx0 = await loadCodec("zx0");
const bodies = ["sun", "mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const profile = process.argv[2] || "balanced";
const keys = [
  GEARCOLECO_TEST_INPUT.KEYPAD_1, GEARCOLECO_TEST_INPUT.KEYPAD_2,
  GEARCOLECO_TEST_INPUT.KEYPAD_3, GEARCOLECO_TEST_INPUT.KEYPAD_4,
  GEARCOLECO_TEST_INPUT.KEYPAD_5, GEARCOLECO_TEST_INPUT.KEYPAD_6,
  GEARCOLECO_TEST_INPUT.KEYPAD_7, GEARCOLECO_TEST_INPUT.KEYPAD_8,
  GEARCOLECO_TEST_INPUT.KEYPAD_9, GEARCOLECO_TEST_INPUT.KEYPAD_ASTERISK,
  GEARCOLECO_TEST_INPUT.KEYPAD_HASH,
];
const backgroundColors = [11, 14, 11, 4, 15, 9, 11, 11, 7, 5, 11];

fs.mkdirSync(buildDir, { recursive: true });
const asmPath = path.join(buildDir, "solar-system.asm");
const romPath = path.join(buildDir, "solar-system.rom");
const compiled = spawnSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), source,
  "--project-dir", projectDir, "--asm", asmPath, "--rom", romPath, "--opt", profile],
{ cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
assert.equal(compiled.status, 0, `${compiled.error ?? ""}\n${compiled.stdout ?? ""}\n${compiled.stderr ?? ""}`);
const asm = fs.readFileSync(asmPath, "utf8");
const rom = fs.readFileSync(romPath);
assert.ok(rom.length <= 32 * 1024, `Solar System ROM exceeds 32 KiB: ${rom.length} bytes`);
const choiceAddress = symbolAddress(asm, "SolarChoice");
const frameAddress = symbolAddress(asm, "SolarFrame");
const runtime = fs.readFileSync(path.join(assetDir, "runtime.asm"), "utf8");
const normalAttributes = readDbLabel(runtime, "SolarNormalSpriteAttributes");
const saturnAttributes = readDbLabel(runtime, "SolarSaturnSpriteAttributes");

for (let index = 0; index < bodies.length; index += 1) {
  const body = bodies[index];
  const expectedPattern = await decompress(`${body}.pattern.zx0`);
  const expectedColor = await decompress(`${body}.color.zx0`);
  const expectedFrames = [await decompress(`${body}.frames-0.zx0`), await decompress(`${body}.frames-1.zx0`)];
  const core = await GearcolecoTestCore.create({ seed: 0x534f4c52 + index });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    runUntilValue(core, choiceAddress, 1, 180, `${body}: menu initialization`);
    runUntilVramText(core, 9, 2, "3D SOLAR SYSTEM", 180);
    runFrames(core, 5);
    const menuRegisters = core.getVdpRegisters();
    assert.equal(menuRegisters[0] & 0x02, 0, `${body}: menu must use single-charset Mode 1`);
    runUntilVramText(core, 5, 15, "PLUTO", 1);
    assert.equal(core.readVram(0x1b00, 1)[0], 23, `${body}: menu stars are missing`);
    const starPatterns = core.readVram(0x3a00, 16);
    runFrames(core, 12);
    assert.notDeepEqual([...core.readVram(0x3a00, 16)], [...starPatterns], `${body}: menu stars did not blink`);
    if (index === 0) {
      writeFramebufferPng(core.getFramebuffer(), path.join(buildDir, "menu.png"));
      writeFramebufferPng(core.getFramebuffer(), path.join(buildDir, "promotion-menu.png"));
    }
    core.setControllerMask(0, keys[index]);
    runFrames(core, 3);
    core.setControllerMask(0, 0);
    const voiceTransition = runUntilVramMatchWithAudio(core, 0x0800, expectedPattern, 180, `${body}: PATTERN upload`);
    assert.ok(voiceTransition.voicedSamples > 1000, `${body}: compressed VoxPCM name produced no audible PSG output`);
    assert.ok(voiceTransition.visibleAudioFrames > 0, `${body}: menu display was not visible during voice playback`);
    runUntilVramText(core, 2, 21, factPrefix(index), 180);
    assert.notEqual(core.getVdpRegisters()[0] & 0x02, 0, `${body}: body must use Graphics II`);
    assert.equal(core.readRam(choiceAddress, 1)[0], index + 1, `${body}: wrong menu choice`);
    assertBytesEqual(core.readVram(0x0800, 2048), expectedPattern, `${body}: PATTERN upload`);
    assertBytesEqual(core.readVram(0x2800, 2048), expectedColor, `${body}: COLOR upload`);
    assert.ok([...expectedColor.slice(-8)].every((value) => value === backgroundColors[index] * 17),
      `${body}: protected tile has the wrong solid background color`);
    assertBytesEqual(core.readVram(0x1100, 472), core.readVram(0x0100, 472), `${body}: bottom-bank font`);
    assert.ok([...core.readVram(0x3000, 2048)].every((value) => value === 0xF0), `${body}: bottom-bank font colors`);
    verifyNameFrame(core, expectedFrames[0].slice(0, 64), `${body} frame 0`);
    const expectedAttributes = body === "saturn" ? saturnAttributes : normalAttributes;
    assert.deepEqual([...core.readVram(0x1b00, expectedAttributes.length)], expectedAttributes, `${body}: sprite attributes`);
    verifySafeColumn(core, body);
    runUntilFrame(core, frameAddress, 8, 120);
    runUntilNameFrame(core, expectedFrames[1].slice(0, 64), 30, `${body} frame 8`);
    runUntilFrame(core, frameAddress, 15, 120);
    runUntilNameFrame(core, expectedFrames[1].slice(7 * 64, 8 * 64), 30, `${body} frame 15`);
    writeFramebufferPng(core.getFramebuffer(), path.join(buildDir, `${body}.png`));
    if (body === "earth" || body === "jupiter" || body === "saturn") {
      writeFramebufferPng(core.getFramebuffer(), path.join(buildDir, `promotion-${body}.png`));
    }
    core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
    runFrames(core, 3);
    core.setControllerMask(0, 0);
    runUntilVramText(core, 9, 2, "3D SOLAR SYSTEM", 180);
    assert.equal(core.getVdpRegisters()[0] & 0x02, 0, `${body}: return menu must use Mode 1`);
    assert.equal(core.readVram(0x1b00, 1)[0], 23, `${body}: menu stars are missing after returning`);
  } finally {
    core.destroy();
  }
}

console.log(`3D Solar System PASS: ${bodies.length} bodies, both frame halves, animated menu stars, sprites, CRT-safe column; ROM ${rom.length} bytes.`);

function runFrames(core, count) { for (let index = 0; index < count; index += 1) core.runFrame(); }
function runUntilFrame(core, address, expected, limit) {
  for (let count = 0; count < limit; count += 1) {
    core.runFrame();
    if (core.readRam(address, 1)[0] === expected) return;
  }
  assert.fail(`animation did not reach frame ${expected}`);
}
function runUntilValue(core, address, expected, limit, label) {
  for (let count = 0; count < limit; count += 1) {
    core.runFrame();
    if (core.readRam(address, 1)[0] === expected) return;
  }
  assert.fail(`${label} did not reach ${expected}`);
}
function runUntilVramText(core, x, y, expected, limit) {
  const bytes = [...expected].map((character) => character.charCodeAt(0));
  runUntilVramMatch(core, 0x1800 + y * 32 + x, bytes, limit, `menu text ${expected}`);
}
function runUntilVramMatch(core, address, expected, limit, label) {
  for (let count = 0; count < limit; count += 1) {
    core.runFrame();
    if ([...core.readVram(address, expected.length)].every((value, index) => value === expected[index])) return;
  }
  assert.fail(`${label} was not observed (PC=$${core.getPc().toString(16).padStart(4, "0")})`);
}
function runUntilVramMatchWithAudio(core, address, expected, limit, label) {
  let voicedSamples = 0;
  let visibleAudioFrames = 0;
  for (let count = 0; count < limit; count += 1) {
    core.runFrame();
    let frameSamples = 0;
    for (const sample of core.getAudioFrame().samples) if (sample !== 0) frameSamples += 1;
    voicedSamples += frameSamples;
    if (frameSamples > 0 && (core.getVdpRegisters()[1] & 0x40) !== 0) visibleAudioFrames += 1;
    if ([...core.readVram(address, expected.length)].every((value, index) => value === expected[index])) {
      return { voicedSamples, visibleAudioFrames };
    }
  }
  assert.fail(`${label} was not observed (PC=$${core.getPc().toString(16).padStart(4, "0")})`);
}
function verifyNameFrame(core, expected, label) {
  for (let row = 0; row < 8; row += 1) {
    assert.deepEqual([...core.readVram(0x1800 + (8 + row) * 32 + 12, 8)], [...expected.slice(row * 8, row * 8 + 8)], `${label}, row ${row}`);
  }
}
function runUntilNameFrame(core, expected, limit, label) {
  for (let count = 0; count < limit; count += 1) {
    if (nameFrameMatches(core, expected)) return;
    core.runFrame();
  }
  verifyNameFrame(core, expected, label);
}
function nameFrameMatches(core, expected) {
  for (let row = 0; row < 8; row += 1) {
    const actual = core.readVram(0x1800 + (8 + row) * 32 + 12, 8);
    if (![...actual].every((value, index) => value === expected[row * 8 + index])) return false;
  }
  return true;
}
function verifySafeColumn(core, body) {
  for (let row = 0; row < 24; row += 1) assert.equal(core.readVram(0x1800 + row * 32, 1)[0], 0, `${body}: visible text/data at X=0 row ${row}`);
}
function assertBytesEqual(actual, expected, label) {
  const differences = [];
  for (let index = 0; index < expected.length; index += 1) if (actual[index] !== expected[index]) differences.push(index);
  assert.equal(differences.length, 0, `${label}: ${differences.length} differences; first offset $${(differences[0] ?? 0).toString(16).padStart(4, "0")}, actual $${(actual[differences[0]] ?? 0).toString(16).padStart(2, "0")}, expected $${(expected[differences[0]] ?? 0).toString(16).padStart(2, "0")}`);
}
async function decompress(name) { return zx0.decompress(fs.readFileSync(path.join(assetDir, name))); }
function factPrefix(index) {
  return ["HYDROGEN", "YEAR", "THICK", "LIQUID", "AIRLESS", "TWO", "GAS", "BRIGHT", "ROTATES", "FASTEST", "KUIPER"][index];
}
function symbolAddress(text, name) {
  const match = text.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "mi"));
  assert.ok(match, `missing ${name}`);
  return Number.parseInt(match[1], 16);
}
function readDbLabel(text, label) {
  const start = text.search(new RegExp(`^${label}:`, "m"));
  assert.ok(start >= 0, `missing ${label}`);
  const values = [];
  for (const line of text.slice(start).split(/\r?\n/).slice(1)) {
    if (/^[A-Za-z_][A-Za-z0-9_]*:/.test(line.trim())) break;
    for (const match of line.matchAll(/\$([0-9A-F]{2})/gi)) values.push(Number.parseInt(match[1], 16));
  }
  return values;
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
  assert.equal(encoded.status, 0, `PNG encoding failed: ${encoded.stderr?.toString() ?? ""}`);
}
