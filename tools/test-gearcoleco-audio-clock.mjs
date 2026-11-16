import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "amy-audio-clock-"));
const romPath = join(work, "held-tone.rom");
const build = spawnSync(process.execPath, [
  join(root, "tools/amyc.mjs"),
  join(root, "tools/fixtures/audio-clock/held-tone.alexis"),
  "--opt", "balanced", "--rom", romPath
], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
assert.ifError(build.error);
assert.equal(build.status, 0, build.stderr || build.stdout);

function peakFrequency(samples, sampleRate, low, high) {
  let bestFrequency = 0;
  let bestPower = -Infinity;
  for (let frequency = low; frequency <= high; frequency += 0.1) {
    const coefficient = 2 * Math.cos(2 * Math.PI * frequency / sampleRate);
    let q0 = 0, q1 = 0, q2 = 0;
    for (const sample of samples) {
      q0 = coefficient * q1 - q2 + sample;
      q2 = q1;
      q1 = q0;
    }
    const power = q1 * q1 + q2 * q2 - coefficient * q1 * q2;
    if (power > bestPower) {
      bestPower = power;
      bestFrequency = frequency;
    }
  }
  return bestFrequency;
}

const core = await GearcolecoTestCore.create({ seed: 1 });
try {
  core.loadBios(readFileSync(join(root, "studio/bios/colecovision.rom")));
  core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 720; ++frame) core.runFrame();

  const startCycles = core.getMasterClockCycles();
  const counts = [];
  const left = [];
  for (let frame = 0; frame < 600; ++frame) {
    core.runFrame();
    const audio = core.getAudioFrame();
    counts.push(audio.frameCount);
    for (let index = 0; index < audio.samples.length; index += 2) {
      left.push(audio.samples[index]);
    }
  }

  const cycles = core.getMasterClockCycles() - startCycles;
  const expectedCycles = 600 * 228 * 262;
  const expectedSamples = cycles * 44100 / 3579545;
  const peak = peakFrequency(left.slice(44100, 88200), 44100, 430, 450);
  const expectedTone = 3579545 / (32 * 254);

  assert.ok(Math.abs(cycles - expectedCycles) <= 16, `master clock drifted: ${cycles}`);
  assert.ok(Math.abs(left.length - expectedSamples) <= 20,
    `audio duration drifted: got ${left.length}, expected ${expectedSamples}`);
  assert.ok(Math.min(...counts) >= 735 && Math.max(...counts) <= 737,
    `unexpected per-frame samples: ${Math.min(...counts)}..${Math.max(...counts)}`);
  assert.ok(Math.abs(peak - expectedTone) / expectedTone <= 0.002,
    `tone pitch drifted: got ${peak}, expected ${expectedTone}`);
  console.log(`PASS: ${peak.toFixed(2)} Hz, ${left.length} samples, ${cycles} cycles`);
} finally {
  core.destroy();
  rmSync(work, { recursive: true, force: true });
}
