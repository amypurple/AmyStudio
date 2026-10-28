#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-tiny-once-"));

function source(mode) {
  return `
set sound table TinyTable areas 2
screen on
play song TinySong${mode}
loop forever
asm {
TinyCh1:
    db $44
    dw sndtiny_1
    db 2,$02,$30,$24,$22,$13,$14,$FF
TinyCh2:
    db $84
    dw sndtiny_2
    db 3,$02,$50,$13,$33,$0B,$0E,$FF
TinyTable:
    dw TinyCh1,$702B
    dw TinyCh2,$7035
TinySong:
    dw $0001
    db $41,$02
    dw $0000
}
`;
}

function tinySlotAddress(asm) {
  const match = asm.match(/^AMY_TINYSOUND_SLOT_1\s+EQU\s+\$([0-9A-F]+)/im);
  assert.ok(match, "Tiny Sound slot address must be present");
  return Number.parseInt(match[1], 16);
}

async function areaStateAfter(romPath, frames, slotAddress) {
  const core = await GearcolecoTestCore.create({ seed: 0x54494E59 });
  try {
    core.loadBios(fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom")));
    core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < frames; frame += 1) core.runFrame();
    return {
      areas: [...core.readRam(0x702b, 1), ...core.readRam(0x7035, 1)],
      slots: [...core.readRam(slotAddress, 32)]
    };
  } finally {
    core.destroy();
  }
}

try {
  let balancedOnceSize = 0;
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const onceSource = path.join(temp, `once-${profile}.alexis`);
    const onceAsm = path.join(temp, `once-${profile}.asm`);
    const onceRom = path.join(temp, `once-${profile}.rom`);
    fs.writeFileSync(onceSource, source(" once"));
    execFileSync(process.execPath, ["tools/amyc.mjs", onceSource, "--asm", onceAsm, "--rom", onceRom, "--opt", profile], { cwd: root });
    const generatedOnce = fs.readFileSync(onceAsm, "utf8");
    assert.match(generatedOnce, /call AMY_TINY_SOUND_ONCE_MODE/);
    assert.match(generatedOnce, /^AMY_TINY_SOUND_ONCE_MODE:$/m);
    const onceState = await areaStateAfter(onceRom, 1200, tinySlotAddress(generatedOnce));
    assert.deepEqual(onceState.areas, [0xff, 0xff], `${profile}: once streams remained active (${JSON.stringify(onceState)})`);
    if (profile === "balanced") balancedOnceSize = fs.statSync(onceRom).size;
  }

  const loopSource = path.join(temp, "loop.alexis");
  const loopAsm = path.join(temp, "loop.asm");
  const loopRom = path.join(temp, "loop.rom");
  fs.writeFileSync(loopSource, source(""));
  execFileSync(process.execPath, ["tools/amyc.mjs", loopSource, "--asm", loopAsm, "--rom", loopRom, "--opt", "balanced"], { cwd: root });
  const generatedLoop = fs.readFileSync(loopAsm, "utf8");
  assert.doesNotMatch(generatedLoop, /AMY_TINY_SOUND_(?:ONCE|LOOP)_MODE/);
  assert.notDeepEqual((await areaStateAfter(loopRom, 1200, tinySlotAddress(generatedLoop))).areas, [0xff, 0xff], "ordinary Tiny Sound stopped instead of looping");
  const loopSize = fs.statSync(loopRom).size;
  assert.ok(balancedOnceSize > loopSize, "once-capable runtime must remain opt-in");
  console.log(`Tiny Sound once: PASS (5 once profiles; unchanged loop runtime; opt-in cost ${balancedOnceSize - loopSize} bytes)`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
