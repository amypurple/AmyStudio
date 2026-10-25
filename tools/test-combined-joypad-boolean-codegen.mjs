#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-combined-joypad-"));
const sourceText = `project "COMBINED JOYPAD BOOLEAN"
u8 Up = 0
u8 Right = 0
u8 FireState = 0
text screen
screen on
main_loop:
  wait
  Up = joypad(1).up | joypad(2).up
  Right = joypad(1).right | joypad(2).right
  FireState = joypad(1).fire | joypad(2).fire
  goto main_loop
`;
const legacySourceText = `project "COMBINED JOYPAD BOOLEAN LEGACY"
u8 Up = 0
u8 Right = 0
u8 FireState = 0
text screen
screen on
main_loop:
  wait
  Up = 0
  Right = 0
  FireState = 0
  if joypad(1).up then Up = 1
  if joypad(2).up then Up = 1
  if joypad(1).right then Right = 1
  if joypad(2).right then Right = 1
  if joypad(1).fire then FireState = 1
  if joypad(2).fire then FireState = 1
  goto main_loop
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function runFrames(core, count, first = 0, second = 0) {
  core.setControllerMask(0, first);
  core.setControllerMask(1, second);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  const profileSizes = new Map();
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const source = join(temp, `combined-${profile}.alexis`);
    const asm = join(temp, `combined-${profile}.asm`);
    const rom = join(temp, `combined-${profile}.rom`);
    writeFileSync(source, sourceText);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile} should compile:\n${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const generated = readFileSync(asm, "utf8");
    assert.match(generated, /ld a,\(JOYPAD_1\)\s+ld b,a\s+ld a,\(JOYPAD_2\)\s+or b\s+and \$1/i,
      `${profile}: combined up input should use one raw merge and mask`);
    profileSizes.set(profile, readFileSync(rom).length);

    const addresses = ["Up", "Right", "FireState"].map((name) => addressOf(generated, `AMY_UVAR_${name}`));
    const core = await GearcolecoTestCore.create({ seed: 0x4a4f5932 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      const values = () => addresses.map((address) => core.readRam(address, 1)[0]);
      runFrames(core, 90);
      assert.deepEqual(values(), [0, 0, 0], `${profile}: idle state`);
      runFrames(core, 4, 0, GEARCOLECO_TEST_INPUT.UP);
      assert.deepEqual(values(), [1, 0, 0], `${profile}: second joypad up`);
      runFrames(core, 4, GEARCOLECO_TEST_INPUT.RIGHT | GEARCOLECO_TEST_INPUT.FIRE_LEFT, 0);
      assert.deepEqual(values(), [0, 1, 1], `${profile}: first joypad right and fire`);
      runFrames(core, 4, GEARCOLECO_TEST_INPUT.UP, GEARCOLECO_TEST_INPUT.RIGHT | GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
      assert.deepEqual(values(), [1, 1, 1], `${profile}: merged controller state`);
      runFrames(core, 4);
      assert.deepEqual(values(), [0, 0, 0], `${profile}: values must clear after release`);
    } finally {
      core.destroy();
    }
  }

  const legacySource = join(temp, "legacy.alexis");
  const legacyAsm = join(temp, "legacy.asm");
  const legacyRom = join(temp, "legacy.rom");
  writeFileSync(legacySource, legacySourceText);
  const legacyResult = spawnSync(process.execPath, ["tools/amyc.mjs", legacySource, "--asm", legacyAsm, "--rom", legacyRom, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(legacyResult.status, 0, `legacy form should compile:\n${legacyResult.error?.stack || ""}${legacyResult.stdout || ""}${legacyResult.stderr || ""}`);
  const balancedSize = profileSizes.get("balanced");
  const legacySize = readFileSync(legacyRom).length;
  assert.ok(balancedSize < legacySize, `combined form should beat ${legacySize}-byte legacy form; got ${balancedSize}`);
  console.log(`Combined joypad boolean codegen and ROM runtime PASS (5 profiles); Balanced ${balancedSize} vs legacy ${legacySize}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
