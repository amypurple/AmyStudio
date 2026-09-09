#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { convertSamplesToPsgSound, psgPeriodToFrequency } from "../studio/core/wavToPsgSound.js";

const root = resolve(import.meta.dirname, "..");
const sampleRate = 44100;

function compile(source, asm, rom) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath,
      ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", "experimental"],
      { cwd: root, stdio: "ignore" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

async function capture(bios, rom, seconds) {
  const core = await GearcolecoTestCore.create({ seed: 0x544f4e45 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const mono = [];
    for (let frame = 0; frame < Math.ceil((seconds + 0.4) * 60); frame += 1) {
      core.runFrame();
      const audio = core.getAudioFrame().samples;
      for (let index = 0; index < audio.length; index += 2) mono.push(audio[index] / 32768);
    }
    const start = mono.findIndex((sample) => Math.abs(sample) > 0.0001);
    assert.ok(start >= 0, "tone ROM must produce PCM");
    return Float32Array.from(mono.slice(start, start + Math.round(sampleRate * seconds)));
  } finally {
    core.destroy();
  }
}

function convert(samples, maxVoices = 2) {
  return convertSamplesToPsgSound(samples, sampleRate, {
    maxVoices,
    allowNoise: false,
    speechMode: false,
    simplifyEdges: false
  });
}

function expandTone(stream) {
  return stream.events.flatMap((event) => Array(event.length).fill({
    frequency: psgPeriodToFrequency(event.period),
    attenuation: event.attenuation
  }));
}

const scalePeriods = [800, 508, 254, 127, 64];
const scaleAttenuations = [2, 4, 6, 8, 10];
const scaleCommands = scalePeriods.flatMap((period, index) => [
  0x40,
  period & 0xff,
  ((scaleAttenuations[index] & 15) << 4) | ((period >> 8) & 3),
  8
]);
const scaleSource = `sub start:
  set sound table ToneTable areas 1
  screen on
  wait 4 frames
  play sound 1
  loop forever
end sub
asm {
ToneTable:
  dw ScaleVoice,$702B
ScaleVoice:
  db ${scaleCommands.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")},$50
}
`;

const chordSource = `sub start:
  set sound table ToneTable areas 2
  screen on
  wait 4 frames
  play sounds 1,2
  loop forever
end sub
asm {
ToneTable:
  dw StrongVoice,$702B
  dw SoftVoice,$7035
StrongVoice:
  db $40,$FE,$20,$24,$50
SoftVoice:
  db $80,$A9,$A0,$24,$90
}
`;

const output = await mkdtemp(join(tmpdir(), "amy-tone-modes-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  const scalePath = join(output, "scale.alexis");
  const scaleAsm = join(output, "scale.asm");
  const scaleRom = join(output, "scale.rom");
  await writeFile(scalePath, scaleSource, "utf8");
  await compile(scalePath, scaleAsm, scaleRom);
  const scale = convert(await capture(bios, await readFile(scaleRom), 40 / 60), 1);
  assert.equal(scale.streams.filter((stream) => stream.type === "tone").length, 1);
  const scaleFrames = expandTone(scale.streams.find((stream) => stream.type === "tone"));
  const recoveredScale = scalePeriods.map((_, index) => {
    const frame = scaleFrames[Math.min(scaleFrames.length - 1, (index * 8) + 4)];
    return { frequency: Math.round(frame.frequency), attenuation: frame.attenuation };
  });
  recoveredScale.forEach((value, index) => {
    const expectedFrequency = psgPeriodToFrequency(scalePeriods[index]);
    assert.ok(Math.abs(value.frequency - expectedFrequency) / expectedFrequency < 0.02,
      `scale tone ${index}: expected ${expectedFrequency}, got ${value.frequency}`);
    assert.ok(Math.abs(value.attenuation - scaleAttenuations[index]) <= 1,
      `scale volume ${index}: expected ${scaleAttenuations[index]}, got ${value.attenuation}`);
  });

  const chordPath = join(output, "chord.alexis");
  const chordAsm = join(output, "chord.asm");
  const chordRom = join(output, "chord.rom");
  await writeFile(chordPath, chordSource, "utf8");
  await compile(chordPath, chordAsm, chordRom);
  const chord = convert(await capture(bios, await readFile(chordRom), 0.55), 2);
  const chordTones = chord.streams.filter((stream) => stream.type === "tone");
  const recoveredChord = chordTones.map((stream) => {
    const active = stream.events.filter((event) => event.attenuation < 15);
    return {
      frequency: Math.round(active.reduce((sum, event) => sum + (psgPeriodToFrequency(event.period) * event.length), 0)
        / active.reduce((sum, event) => sum + event.length, 0)),
      attenuation: Math.round(active.reduce((sum, event) => sum + (event.attenuation * event.length), 0)
        / active.reduce((sum, event) => sum + event.length, 0))
    };
  }).sort((left, right) => left.frequency - right.frequency);
  assert.equal(recoveredChord.length, 2, "a tone 16 dB below the leading voice must remain detectable");
  [{ frequency: 440, attenuation: 2 }, { frequency: 662, attenuation: 10 }].forEach((expected, index) => {
    assert.ok(Math.abs(recoveredChord[index].frequency - expected.frequency) / expected.frequency < 0.02,
      `chord voice ${index}: expected ${expected.frequency}, got ${recoveredChord[index].frequency}`);
    assert.ok(Math.abs(recoveredChord[index].attenuation - expected.attenuation) <= 1,
      `chord volume ${index}: expected ${expected.attenuation}, got ${recoveredChord[index].attenuation}`);
  });

  console.log(JSON.stringify({
    expectedScale: scalePeriods.map((period, index) => ({
      frequency: Math.round(psgPeriodToFrequency(period)),
      attenuation: scaleAttenuations[index]
    })),
    recoveredScale,
    expectedChord: [{ frequency: 440, attenuation: 2 }, { frequency: 662, attenuation: 10 }],
    recoveredChord
  }, null, 2));
  console.log("SN76489 tone scale, volume, and quiet-polyphony recovery: PASS");
} finally {
  await rm(output, { recursive: true, force: true });
}
