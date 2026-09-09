#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { buildPsgSoundAsm, convertSamplesToPsgSound } from "../studio/core/wavToPsgSound.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const sampleRate = 22050;

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function makeTwoToneWavSamples() {
  return Float32Array.from({ length: Math.round(sampleRate * 0.35) }, (_, index) => {
    const time = index / sampleRate;
    return (Math.sin(2 * Math.PI * 440 * time) + (0.75 * Math.sin(2 * Math.PI * 660 * time))) * 0.45;
  });
}

function goertzel(samples, rate, frequency) {
  const omega = (2 * Math.PI * frequency) / rate;
  const coefficient = 2 * Math.cos(omega);
  let previous = 0;
  let previous2 = 0;
  for (const sample of samples) {
    const current = sample + (coefficient * previous) - previous2;
    previous2 = previous;
    previous = current;
  }
  return previous2 ** 2 + previous ** 2 - (coefficient * previous * previous2);
}

async function captureAudio(bios, rom) {
  const core = await GearcolecoTestCore.create({ seed: 0x53504658 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const mono = [];
    for (let frame = 0; frame < 50; frame += 1) {
      core.runFrame();
      const audio = core.getAudioFrame();
      for (let index = 0; index < audio.samples.length; index += 2) mono.push(audio.samples[index]);
    }
    const firstActive = mono.findIndex((sample) => sample !== 0);
    assert.ok(firstActive >= 0, "generated sound effect must produce PCM");
    const active = Int16Array.from(mono.slice(firstActive, firstActive + Math.round(44100 * 0.32)));
    const bytes = new Uint8Array(active.buffer, active.byteOffset, active.byteLength);
    return {
      hash: createHash("sha256").update(bytes).digest("hex"),
      firstActive,
      power440: goertzel(active, 44100, 440),
      power660: goertzel(active, 44100, 660),
      controlPower: Math.max(goertzel(active, 44100, 530), goertzel(active, 44100, 780))
    };
  } finally {
    core.destroy();
  }
}

const output = await mkdtemp(join(tmpdir(), "amy-wav-spectral-sfx-"));
try {
  const converted = convertSamplesToPsgSound(makeTwoToneWavSamples(), sampleRate, { maxVoices: 2, allowNoise: false });
  assert.equal(converted.usedVoices, 2, "converter must retain both meaningful tones");
  const built = buildPsgSoundAsm(converted, { label: "SpectralChime" });
  const sourcePath = join(output, "spectral-sfx.alexis");
  await writeFile(sourcePath, `sub start:\n  set sound table ${built.tableName} areas 2\n  screen on\n  wait 4 frames\n  ${built.play}\n  loop forever\nend sub\n\nasm {\n${built.asm}\n}\n`, "utf8");
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  const results = [];
  for (const profile of profiles) {
    const asmPath = join(output, `spectral-sfx-${profile}.asm`);
    const romPath = join(output, `spectral-sfx-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const audio = await captureAudio(bios, await readFile(romPath));
    assert.ok(audio.power440 > audio.controlPower * 4, `${profile}: 440 Hz component must survive conversion`);
    assert.ok(audio.power660 > audio.controlPower * 4, `${profile}: 660 Hz component must survive conversion`);
    results.push({ profile, ...audio });
  }
  assert.equal(new Set(results.slice(2).map((result) => result.hash)).size, 1,
    "balanced, aggressive, and experimental must produce identical PCM");
  console.log(JSON.stringify({ voices: converted.usedVoices, frames: converted.frameCount, results }, null, 2));
  console.log("WAV spectral two-channel SFX ROM audio: PASS");
} finally {
  await rm(output, { recursive: true, force: true });
}

