#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const sampleRom = fs.readFileSync(path.join(root, "tools", "fixtures", "sp0256-voice-module-demo.rom"));
const laserStrikePath = path.join(root, "build", "laserstrike-audit", "LaserStrike_Test_Rev13.rom");
const speakSpellPath = path.join(root, "build", "speakspell-audit", "SpeakSpell_Rev58.rom");

await verifySample();
await verifyAbsentModule();
if (fs.existsSync(laserStrikePath)) await verifyOriginalRom(fs.readFileSync(laserStrikePath));
if (fs.existsSync(speakSpellPath)) {
  const speakSpellRom = fs.readFileSync(speakSpellPath);
  await verifySpeakSpell(speakSpellRom, "lundy", 0xf9a7);
  await verifySpeakSpell(speakSpellRom, "eve", 0xf9ab);
}
console.log("SP0256 voice-module debugger tests passed.");

async function verifySample() {
  const core = await GearcolecoTestCore.create({ seed: 0x0256 });
  try {
    core.loadBios(bios);
    core.loadRom(sampleRom, { region: GEARCOLECO_TEST_REGION.NTSC });
    let audible = 0;
    let stereoVoiceFrames = 0;
    // The standard ColecoVision BIOS title delay runs before cartridge code.
    for (let frame = 0; frame < 1500; frame += 1) {
      core.runFrame();
      const samples = core.getAudioFrame().samples;
      for (const sample of samples) if (Math.abs(sample) > 24) audible += 1;
      for (let i = 0; i + 1 < samples.length; i += 2) {
        if (Math.abs(samples[i]) > 24 && samples[i] === samples[i + 1]) stereoVoiceFrames += 1;
      }
    }
    assert.ok(audible > 1000, `Amy sample generated too little voice audio (${audible} samples)`);
    assert.ok(stereoVoiceFrames > 500, `SP0256 output was not mixed as synchronized stereo (${stereoVoiceFrames} frames)`);
  } finally {
    core.destroy();
  }
}

async function verifyAbsentModule() {
  const core = await GearcolecoTestCore.create({ seed: 0x0257 });
  try {
    core.loadBios(bios);
    core.loadRom(sampleRom, { region: GEARCOLECO_TEST_REGION.NTSC });
    core.setVoiceModuleEnabled(false);
    let audible = 0;
    for (let frame = 0; frame < 1500; frame += 1) {
      core.runFrame();
      for (const sample of core.getAudioFrame().samples) if (Math.abs(sample) > 24) audible += 1;
    }
    assert.equal(audible, 0, "absent voice module unexpectedly generated audio");
  } finally {
    core.destroy();
  }
}

async function verifyOriginalRom(laserStrikeRom) {
  const core = await GearcolecoTestCore.create({ seed: 0x4c535631 });
  try {
    core.loadBios(bios);
    core.loadRom(laserStrikeRom, { region: GEARCOLECO_TEST_REGION.NTSC });
    core.setExecuteBreakpoint(0xb8e5);
    const writes = [];
    let frame = 0;
    while (frame < 1800 && writes.length < 12) {
      const result = core.runFrame();
      if (result.breakpointHit) {
        writes.push(core.getCpuState().hl & 0xff);
        core.stepInstruction();
      } else {
        frame += 1;
      }
    }
    assert.deepEqual(writes.slice(0, 5), [0x2d, 0x14, 0x2b, 0x33, 0x02],
      "untouched Laser Strike did not begin its SP0256 phrase");
  } finally {
    core.destroy();
  }
}

async function verifySpeakSpell(speakSpellRom, profile, sendAddress) {
  const core = await GearcolecoTestCore.create({ seed: 0x53500000 + sendAddress });
  try {
    core.loadBios(bios);
    core.loadRom(speakSpellRom, { region: GEARCOLECO_TEST_REGION.NTSC });
    core.setVoiceModuleProfile(profile);
    core.setExecuteBreakpoint(sendAddress);
    let writes = 0;
    let audible = 0;
    let frame = 0;
    while (frame < 2400 && (writes < 8 || audible < 1000)) {
      const result = core.runFrame();
      for (const sample of core.getAudioFrame().samples) if (Math.abs(sample) > 24) audible += 1;
      if (result.breakpointHit) {
        writes += 1;
        core.stepInstruction();
      } else {
        frame += 1;
      }
    }
    assert.ok(writes >= 8, `SpeakSpell did not use the ${profile} speech path (${writes} writes)`);
    assert.ok(audible >= 1000, `SpeakSpell ${profile} path produced no audible speech`);
  } finally {
    core.destroy();
  }
}
