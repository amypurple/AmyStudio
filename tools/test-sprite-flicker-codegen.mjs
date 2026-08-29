#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "studio/examples-src/amy-sprite-flicker-selftest.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const colecoPalette = [
  [0, 0, 0], [0, 0, 0], [33, 200, 66], [94, 220, 120],
  [84, 85, 237], [125, 118, 252], [212, 82, 77], [66, 235, 245],
  [252, 85, 84], [255, 121, 120], [212, 193, 84], [230, 206, 128],
  [33, 176, 59], [201, 91, 186], [204, 204, 204], [255, 255, 255]
];

function rgb565([red, green, blue]) {
  return ((Math.floor(red * 31 / 255) << 11)
    | (Math.floor(green * 63 / 255) << 5)
    | Math.floor(blue * 31 / 255)) >>> 0;
}

function hasLayeredFace(framebuffer) {
  const { width, height, pixels } = framebuffer;
  const eye = rgb565(colecoPalette[6]);
  const mouth = rgb565(colecoPalette[9]);
  const body = rgb565(colecoPalette[15]);
  const expected = [
    [2, 0, body], [3, 0, body], [4, 0, body], [5, 0, body],
    [2, 1, eye], [5, 1, eye], [2, 2, eye], [5, 2, eye],
    [0, 3, body], [7, 3, body],
    [1, 4, mouth], [6, 4, mouth],
    [2, 5, mouth], [3, 5, mouth], [4, 5, mouth], [5, 5, mouth],
    [3, 7, body], [4, 7, body]
  ];
  for (let y = 0; y <= height - 8; y += 1) {
    for (let x = 0; x <= width - 8; x += 1) {
      if (expected.every(([dx, dy, color]) => pixels[(y + dy) * width + x + dx] === color)) return true;
    }
  }
  return false;
}

function compile(asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", source, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function compileSource(sourcePath, asmPath, romPath) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", "balanced"
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => resolveRun({ code }));
  });
}

const output = await mkdtemp(join(tmpdir(), "amy-sprite-flicker-"));
try {
  for (const profile of profiles) {
    const asmPath = join(output, `${profile}.asm`);
    const romPath = join(output, `${profile}.rom`);
    await compile(asmPath, romPath, profile);
    const asm = await readFile(asmPath, "utf8");
    assert.match(asm, /AMY_SPRITE_STABLE_FIRST EQU 0/);
    assert.match(asm, /AMY_SPRITE_STABLE_LAST EQU 2/);
    assert.match(asm, /call AMY_SPRITE_FLICKER_ON/);
    assert.match(asm, /call AMY_UPDATE_SPRITES_FLICKER/);
    assert.match(asm, /ld a,\(VDP_STATUS\)[\s\S]*and \$40/);
    assert.match(asm, /AMY_SPRITE_FLICKER_ENABLED EQU \$[0-9A-F]{4}/);
    assert.match(asm, /AMY_SPRITE_FLICKER_PHASE EQU \$[0-9A-F]{4}/);
    const [bios, rom] = await Promise.all([
      readFile(resolve(root, "studio/bios/colecovision.rom")),
      readFile(romPath)
    ]);
    const core = await GearcolecoTestCore.create({ seed: 0x464C4943 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      const leadingEligible = new Set();
      const leadingCounts = new Map();
      let layeredFaceRendered = false;
      for (let frame = 0; frame < 120; frame += 1) {
        core.runFrame();
        const sat = core.readVram(0x1B00, 33);
        if (sat[32] !== 0xD0) continue;
        assert.deepEqual([sat[2], sat[6], sat[10]], [0, 1, 2], `${profile}: stable sprite order`);
        const first = sat[14];
        leadingEligible.add(first);
        leadingCounts.set(first, (leadingCounts.get(first) || 0) + 1);
        if (!layeredFaceRendered) layeredFaceRendered = hasLayeredFace(core.getFramebufferView());
      }
      assert.equal(layeredFaceRendered, true, `${profile}: stable sprite layers render eyes and mouth above the body`);
      assert.deepEqual([...leadingEligible].sort((a, b) => a - b), [3, 4, 5, 6, 7], `${profile}: every eligible sprite reaches first available priority`);
      const counts = [3, 4, 5, 6, 7].map((index) => leadingCounts.get(index) || 0);
      assert.ok(Math.max(...counts) - Math.min(...counts) <= 2, `${profile}: eligible sprites rotate fairly`);
    } finally {
      core.destroy();
    }
  }

  const invalidCases = [
    {
      id: "partial",
      source: "project \"BAD PARTIAL\"\nsprites flicker on\nupdate sprites from 0 count 4\n",
    },
    {
      id: "range",
      source: "project \"BAD RANGE\"\nsprites stable 4 to 2\nsprites flicker on\n",
    },
    {
      id: "multiple",
      source: "project \"BAD MULTIPLE\"\nsprites stable 0 to 1\nsprites stable 4 to 5\nsprites flicker on\n",
    }
  ];
  for (const testCase of invalidCases) {
    const sourcePath = join(output, `${testCase.id}.alexis`);
    await writeFile(sourcePath, testCase.source);
    const result = await compileSource(sourcePath, join(output, `${testCase.id}.asm`), join(output, `${testCase.id}.rom`));
    assert.notEqual(result.code, 0, `${testCase.id}: invalid source must fail`);
  }
} finally {
  await rm(output, { recursive: true, force: true });
}

console.log("sprite flicker codegen: PASS (5 profiles)");
