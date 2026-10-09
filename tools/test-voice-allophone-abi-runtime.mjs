#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const runtime = readFileSync(resolve(root, "src/alexis_lib/coleco_voice.asm"), "utf8");
function makeSource(module) {
  return `
cpu Z80
AMY_VOICE_MODULE equ $7100
AMY_VOICE_POINTER equ $7101
org $8000
db $55,$AA
dw 0,0,$7000,0
dw Start
db $C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0
jp Nmi
Nmi:
  in a,($BF)
  retn
${runtime}
Start:
  ld bc,$0${module}2D
  call AMY_VOICE_ALLOPHONE
  ld a,b
  ld ($7160),a
  ld a,c
  ld ($7161),a
  ld a,$5A
  ld ($7170),a
Forever:
  jr Forever
`;
}

function makeUpdateSource(module) {
  return `
cpu Z80
AMY_VOICE_MODULE equ $7100
AMY_VOICE_POINTER equ $7101
org $8000
db $55,$AA
dw 0,0,$7000,0
dw Start
db $C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0
jp Nmi
Nmi:
  in a,($BF)
  retn
${runtime}
Start:
  ld a,$0${module}
  ld (AMY_VOICE_MODULE),a
  ld hl,Phrase
  ld (AMY_VOICE_POINTER),hl
  ld (AMY_VOICE_POINTER+4),hl
  call AMY_VOICE_UPDATE
  ld hl,(AMY_VOICE_POINTER)
  ld (AMY_VOICE_POINTER+2),hl
  ld a,$5A
  ld ($7170),a
Forever:
  jr Forever
Phrase:
  db $2D,$FF
`;
}

function makeSpeakSource(module) {
  return `
cpu Z80
AMY_VOICE_MODULE equ $7100
AMY_VOICE_POINTER equ $7101
org $8000
db $55,$AA
dw 0,0,$7000,0
dw Start
db $C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0
jp Nmi
Nmi:
  in a,($BF)
  retn
${runtime}
Start:
  ld bc,$0${module}00
  ld hl,Phrase
  ld ($7160),hl
  ld hl,0
  add hl,sp
  ld ($7162),hl
  ld hl,Phrase
  call AMY_VOICE_SPEAK
  ld ($7164),hl
  ld hl,0
  add hl,sp
  ld de,($7162)
  or a
  sbc hl,de
  ld a,l
  ld ($7166),a
  ld a,b
  ld ($7167),a
  ld a,$5A
  ld ($7170),a
Forever:
  jr Forever
Phrase:
  db $2D,$14,$07,$FF
`;
}

for (const [profile, module] of [["lundy", 1], ["eve", 2]]) {
  const assembled = await assembleAmysCVAssembly({ "main.asm": makeSource(module) }, "main.asm", {
    outputFilename: `voice-allophone-${profile}-abi.rom`, outputMode: "binary", targetPlatform: "coleco",
    optimizerEnabled: false
  });
  assert.equal(assembled.ok, true, assembled.log);
  const core = await GearcolecoTestCore.create({ seed: 0x56414249 });
  try {
    core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
    core.loadRom(assembled.binary || assembled.bytes, { region: GEARCOLECO_TEST_REGION.NTSC });
    core.setVoiceModuleProfile(profile);
    for (let frame = 0; frame < 12; frame += 1) core.runFrame();
    assert.equal(core.readRam(0x7170, 1)[0], 0x5A, `${profile}: allophone call did not finish`);
    assert.deepEqual([...core.readRam(0x7160, 2)], [module, 0x2D], `${profile}: BC was not preserved`);
    assert.ok(core.getAudioFrame().samples.length > 0, `${profile}: voice profile produced no audio frame`);
  } finally {
    core.destroy();
  }

  const update = await assembleAmysCVAssembly({ "main.asm": makeUpdateSource(module) }, "main.asm", {
    outputFilename: `voice-update-${profile}-abi.rom`, outputMode: "binary", targetPlatform: "coleco",
    optimizerEnabled: false
  });
  assert.equal(update.ok, true, update.log);
  const updateCore = await GearcolecoTestCore.create({ seed: 0x56555044 });
  try {
    updateCore.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
    updateCore.loadRom(update.binary || update.bytes, { region: GEARCOLECO_TEST_REGION.NTSC });
    updateCore.setVoiceModuleProfile(profile);
    for (let frame = 0; frame < 12; frame += 1) updateCore.runFrame();
    assert.equal(updateCore.readRam(0x7170, 1)[0], 0x5A, `${profile}: async update did not finish`);
    const installed = [...updateCore.readRam(0x7101, 2)];
    const observed = [...updateCore.readRam(0x7103, 2)];
    assert.deepEqual(observed, installed, `${profile}: async pointer observation mismatch`);
    const initial = [...updateCore.readRam(0x7105, 2)];
    const initialAddress = initial[0] | (initial[1] << 8);
    const installedAddress = installed[0] | (installed[1] << 8);
    assert.equal(installedAddress, (initialAddress + 1) & 0xFFFF,
      `${profile}: async update did not consume exactly one allophone`);
  } finally {
    updateCore.destroy();
  }

  const speak = await assembleAmysCVAssembly({ "main.asm": makeSpeakSource(module) }, "main.asm", {
    outputFilename: `voice-speak-${profile}-abi.rom`, outputMode: "binary", targetPlatform: "coleco",
    optimizerEnabled: false
  });
  assert.equal(speak.ok, true, speak.log);
  const speakCore = await GearcolecoTestCore.create({ seed: 0x5653504B });
  try {
    speakCore.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
    speakCore.loadRom(speak.binary || speak.bytes, { region: GEARCOLECO_TEST_REGION.NTSC });
    speakCore.setVoiceModuleProfile(profile);
    for (let frame = 0; frame < 180; frame += 1) speakCore.runFrame();
    assert.equal(speakCore.readRam(0x7170, 1)[0], 0x5A, `${profile}: phrase did not finish`);
    assert.equal(speakCore.readRam(0x7166, 1)[0], 0, `${profile}: phrase did not restore SP`);
    assert.equal(speakCore.readRam(0x7167, 1)[0], module, `${profile}: phrase did not preserve B`);
    const start = [...speakCore.readRam(0x7160, 2)];
    const end = [...speakCore.readRam(0x7164, 2)];
    assert.equal((end[0] | (end[1] << 8)), ((start[0] | (start[1] << 8)) + 3) & 0xFFFF,
      `${profile}: phrase cursor did not reach its terminator`);
  } finally {
    speakCore.destroy();
  }
}
console.log("Voice runtime ABI: PASS (Lundy/EVE, allophone, async update, complete phrase)");
