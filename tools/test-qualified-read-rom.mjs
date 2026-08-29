#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-qualified-read-"));
const source = join(temp, "qualified-read.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED READ ROM TEST"
memory "colecovision_legacy_sdcc"

record InputState:
  u8 Bytes[4]
  u16 FrameCount
end record

overlay InputRam
  Game as InputState
  Menu as InputState
end overlay

u8 I = 1

sub start:
  InputRam.Game.FrameCount = $FFFF
  wait
  read joypad 1 into InputRam.Game.Bytes[0]
  read keypad 1 into InputRam.Game.Bytes[I]
  read spinner 1 into InputRam.Game.Bytes[2]
  read vdp status into InputRam.Game.Bytes[3]
  read frame into InputRam.Game.FrameCount
  loop forever
end sub
`);

function equ(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+(?:\\$([0-9A-Fa-f]+)|([0-9]+))$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return match[1] ? Number.parseInt(match[1], 16) : Number.parseInt(match[2], 10);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), source,
      "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const base = equ(asm, "AMY_SCENE_Game_Bytes");
    const frameAddress = equ(asm, "AMY_SCENE_Game_FrameCount");
    const core = await GearcolecoTestCore.create({ seed: 0x52454144 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.UP |
        GEARCOLECO_TEST_INPUT.FIRE_RIGHT | GEARCOLECO_TEST_INPUT.KEYPAD_5);
      core.setSpinner(0, 7);
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      const bytes = core.readRam(base, 4);
      assert.equal(bytes[0], core.readRam(equ(asm, "JOYPAD_1"), 1)[0], `${profile}: joypad`);
      assert.equal(bytes[1], core.readRam(equ(asm, "KEYPAD_1"), 1)[0], `${profile}: keypad`);
      assert.notEqual(bytes[2], 0, `${profile}: spinner movement`);
      assert.equal(core.readRam(equ(asm, "SPINNER_1"), 1)[0], 0, `${profile}: spinner consumed`);
      assert.equal(bytes[3], core.readRam(equ(asm, "VDP_STATUS"), 1)[0], `${profile}: VDP status`);
      const frameBytes = core.readRam(frameAddress, 2);
      const savedFrame = frameBytes[0] | (frameBytes[1] << 8);
      const currentFrameBytes = core.readRam(equ(asm, "AMY_FRAME_COUNTER"), 2);
      const currentFrame = currentFrameBytes[0] | (currentFrameBytes[1] << 8);
      assert.notEqual(savedFrame, 0xFFFF, `${profile}: frame target unchanged`);
      assert.ok(savedFrame <= currentFrame, `${profile}: frame counter`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified read ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
