#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { convertSamplesToPsgSound } from "../studio/core/wavToPsgSound.js";

const root = resolve(import.meta.dirname, "..");
const expectedPeriods = [8, 12, 16, 24, 32, 48, 64];
const stageFrames = 10;

function compile(source, asm, rom) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath,
      ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", "experimental"],
      { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

async function captureNoise(bios, rom) {
  const core = await GearcolecoTestCore.create({ seed: 0x4e4f4953 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const mono = [];
    for (let frame = 0; frame < 110; frame += 1) {
      core.runFrame();
      const audio = core.getAudioFrame().samples;
      for (let index = 0; index < audio.length; index += 2) mono.push(audio[index] / 32768);
    }
    const firstActive = mono.findIndex((sample) => Math.abs(sample) > 0.0001);
    assert.ok(firstActive >= 0, "known noise stream must produce PCM");
    return Float32Array.from(mono.slice(firstActive, firstActive + Math.round(44100 * 1.2)));
  } finally {
    core.destroy();
  }
}

const output = await mkdtemp(join(tmpdir(), "amy-noise-roundtrip-"));
try {
  const source = join(output, "known-noise.alexis");
  const asm = join(output, "known-noise.asm");
  const rom = join(output, "known-noise.rom");
  await writeFile(source, `sub start:
  set sound table KnownNoiseTable areas 2
  screen on
  wait 4 frames
  play sounds 1,2
  loop forever
end sub

asm {
KnownNoiseTable:
  dw KnownNoiseClock,$702B
  dw KnownNoiseVoice,$7035
KnownNoiseClock:
  db ${expectedPeriods.map((period) => `$C0,$${period.toString(16).padStart(2, "0").toUpperCase()},$F0,$${stageFrames.toString(16).padStart(2, "0").toUpperCase()}`).join(",")},$D0
KnownNoiseVoice:
  db $00,$00,$47,$${(expectedPeriods.length * stageFrames).toString(16).toUpperCase()},$10
}
`, "utf8");
  await compile(source, asm, rom);
  const samples = await captureNoise(
    await readFile(resolve(root, "studio/bios/colecovision.rom")),
    await readFile(rom));
  const converted = convertSamplesToPsgSound(samples, 44100, {
    maxVoices: 3,
    allowNoise: true,
    variableNoise: true,
    speechMode: true,
    simplifyEdges: false
  });
  const noise = converted.streams.find((stream) => stream.type === "noise");
  const clock = converted.streams.find((stream) => stream.type === "noise-clock");
  assert.ok(noise?.events.some((event) => event.attenuation < 15), "converter must recover a noise voice");
  assert.ok(noise.events.every((event) => event.noiseRate === 3), "recovered noise must use Tone 3 clocking");
  assert.ok(clock, "converter must emit the hidden Tone 3 clock stream");
  const activePeriods = clock.events.flatMap((event) => Array(event.length).fill(event.period));
  const recovered = expectedPeriods.map((_, part) => {
    const margin = 2;
    const values = activePeriods.slice((part * stageFrames) + margin, ((part + 1) * stageFrames) - margin).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  assert.ok(recovered.every((period, index) => index === 0 || period >= recovered[index - 1]),
    `recovered clocks must preserve ordering, got ${recovered.join(", ")}`);
  recovered.forEach((period, index) => assert.ok(
    Math.abs(period - expectedPeriods[index]) / expectedPeriods[index] <= 0.3,
    `period ${expectedPeriods[index]} recovered as ${period}`));
  console.log(JSON.stringify({ expectedPeriods, recoveredMedianPeriods: recovered }, null, 2));
  console.log("WAV spectral noise GearColeco round trip: PASS");
} finally {
  await rm(output, { recursive: true, force: true });
}
