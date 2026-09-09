#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { buildPsgSoundAsm, convertSamplesToPsgSound, psgPeriodToFrequency } from "../studio/core/wavToPsgSound.js";

const root = resolve(import.meta.dirname, "..");
const sampleRate = 44100;
const stageFrames = [6, 6, 6, 6, 6, 6, 6, 6, 24];
const expectedPeriods = [
  [285, 213, 169, 213, 169, 142, 169, 142, 106],
  [570, 427, 339, 285, 213, 169, 213, 169, 142]
];

function compile(source, asm, rom) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath,
      ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", "experimental"],
      { cwd: root, stdio: "ignore" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

async function capture(bios, rom) {
  const core = await GearcolecoTestCore.create({ seed: 0x4449414d });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const mono = [];
    for (let frame = 0; frame < 100; frame += 1) {
      core.runFrame();
      const audio = core.getAudioFrame().samples;
      for (let index = 0; index < audio.length; index += 2) mono.push(audio[index] / 32768);
    }
    const start = mono.findIndex((sample) => Math.abs(sample) > 0.0001);
    assert.ok(start >= 0, "Diamond Dash phrase must produce PCM");
    return Float32Array.from(mono.slice(start, start + Math.round(sampleRate * 1.2)));
  } finally {
    core.destroy();
  }
}

function convert(samples) {
  return convertSamplesToPsgSound(samples, sampleRate, {
    maxVoices: 2,
    allowNoise: false,
    simplifyEdges: false
  });
}

function frameValues(stream) {
  return stream.events.flatMap((event) => Array(event.length).fill({
    frequency: psgPeriodToFrequency(event.period),
    attenuation: event.attenuation
  }));
}

function recoveredStages(result) {
  const tracks = result.streams.filter((stream) => stream.type === "tone").map(frameValues);
  let frame = 0;
  return stageFrames.map((length) => {
    const at = frame + Math.floor(length / 2);
    frame += length;
    return tracks.map((track) => track[Math.min(at, track.length - 1)])
      .filter(Boolean)
      .sort((left, right) => left.frequency - right.frequency)
      .map((value) => ({ frequency: Math.round(value.frequency), attenuation: value.attenuation }));
  });
}

function assertMelody(stages, label) {
  stages.forEach((voices, stage) => {
    assert.equal(voices.length, 2, `${label} stage ${stage + 1}: both voices must survive`);
    const expected = expectedPeriods.map((track) => ({
      frequency: psgPeriodToFrequency(track[stage]),
      attenuation: 5
    })).sort((left, right) => left.frequency - right.frequency);
    voices.forEach((voice, index) => {
      assert.ok(Math.abs(voice.frequency - expected[index].frequency) / expected[index].frequency <= 0.035,
        `${label} stage ${stage + 1}: expected ${expected[index].frequency.toFixed(1)}, got ${voice.frequency}`);
      assert.ok(Math.abs(voice.attenuation - expected[index].attenuation) <= 2,
        `${label} stage ${stage + 1}: expected attenuation 5, got ${voice.attenuation}`);
    });
  });
}

function rebuiltSource(result) {
  const built = buildPsgSoundAsm(result, { label: "DiamondRecovered" });
  return `sub start:
  ${built.setup}
  screen on
  wait 4 frames
  ${built.play}
  loop forever
end sub
asm {
${built.asm}
}
`;
}

const output = await mkdtemp(join(tmpdir(), "amy-diamond-melody-"));
try {
  const source = join(output, "diamond-melody.alexis");
  const asm = join(output, "diamond-melody.asm");
  const rom = join(output, "diamond-melody.rom");
  await writeFile(source, `sub start:
  set sound table DiamondSoundTable areas 2
  screen on
  wait 4 frames
  play sounds 1,2
  loop forever
end sub
asm {
DiamondSoundTable:
  dw DiamondMelodyHigh,$702B
  dw DiamondMelodyLow,$7035
DiamondMelodyHigh:
  db $40,$1D,$51,$06,$40,$D5,$50,$06,$40,$A9,$50,$06,$40,$D5,$50,$06
  db $40,$A9,$50,$06,$40,$8E,$50,$06,$40,$A9,$50,$06,$40,$8E,$50,$06
  db $40,$6A,$50,$18,$50
DiamondMelodyLow:
  db $80,$3A,$52,$06,$80,$AB,$51,$06,$80,$53,$51,$06,$80,$1D,$51,$06
  db $80,$D5,$50,$06,$80,$A9,$50,$06,$80,$D5,$50,$06,$80,$A9,$50,$06
  db $80,$8E,$50,$18,$90
}
`, "utf8");
  await compile(source, asm, rom);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  const converted = convert(await capture(bios, await readFile(rom)));
  const firstStages = recoveredStages(converted);
  assertMelody(firstStages, "first conversion");

  const rebuilt = join(output, "diamond-rebuilt.alexis");
  const rebuiltAsm = join(output, "diamond-rebuilt.asm");
  const rebuiltRom = join(output, "diamond-rebuilt.rom");
  await writeFile(rebuilt, rebuiltSource(converted), "utf8");
  await compile(rebuilt, rebuiltAsm, rebuiltRom);
  const secondStages = recoveredStages(convert(await capture(bios, await readFile(rebuiltRom))));
  assertMelody(secondStages, "reconstructed ROM");
  console.log(JSON.stringify({ expectedPeriods, firstStages, secondStages }, null, 2));
  console.log("Diamond Dash two-channel melody GearColeco round trip: PASS");
} finally {
  await rm(output, { recursive: true, force: true });
}
