#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { buildPsgSoundAsm, convertSamplesToPsgSound } from "../studio/core/wavToPsgSound.js";

const root = resolve(import.meta.dirname, "..");

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
  const core = await GearcolecoTestCore.create({ seed: 0x4e4f4953 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const mono = [];
    for (let frame = 0; frame < 60; frame += 1) {
      core.runFrame();
      const audio = core.getAudioFrame().samples;
      for (let index = 0; index < audio.length; index += 2) mono.push(audio[index] / 32768);
    }
    const start = mono.findIndex((sample) => Math.abs(sample) > 0.0001);
    return Float32Array.from(mono.slice(start, start + Math.round(44100 * 0.55)));
  } finally {
    core.destroy();
  }
}

function sourceFor(code, tone3Period = 0) {
  const clockTable = tone3Period
    ? `  dw NoiseClock,$702B\n  dw NoiseVoice,$7035`
    : `  dw NoiseVoice,$702B`;
  const clockData = tone3Period
    ? `NoiseClock:\n  db $C0,$${tone3Period.toString(16).padStart(2, "0")},$F0,$24,$D0\n`
    : "";
  return `sub start:
  set sound table NoiseTable areas ${tone3Period ? 2 : 1}
  screen on
  wait 4 frames
  play sound${tone3Period ? "s 1,2" : " 1"}
  loop forever
end sub
asm {
NoiseTable:
${clockTable}
${clockData}NoiseVoice:
  db $00,$00,$${code.toString(16).padStart(2, "0")},$0C
  db $00,$00,$${(code + 0x20).toString(16).padStart(2, "0")},$0C
  db $00,$00,$${(code + 0x40).toString(16).padStart(2, "0")},$0C
  db $10
}
`;
}

function sourceForConversion(result, label) {
  const built = buildPsgSoundAsm(result, { label });
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

function classify(samples) {
  return convertSamplesToPsgSound(samples, 44100, {
    maxVoices: 3,
    allowNoise: true,
    variableNoise: "auto",
    speechMode: true,
    simplifyEdges: false
  });
}

function recoveredEnvelope(noise) {
  const frames = noise.events.flatMap((event) => Array(event.length).fill(event.attenuation));
  const usable = frames.slice(0, Math.min(30, frames.length));
  const width = Math.floor(usable.length / 3);
  return [0, 1, 2].map((part) => {
    const values = usable.slice(part * width, (part + 1) * width).sort((left, right) => left - right);
    return values[Math.floor(values.length / 2)];
  });
}
const cases = [
  ...[0, 1, 2].flatMap((rate) => [
    { name: `periodic-${rate}`, code: 0x40 | rate },
    { name: `white-${rate}`, code: 0x44 | rate }
  ]),
  { name: "periodic-tone3", code: 0x43, tone3Period: 24 },
  { name: "white-tone3", code: 0x47, tone3Period: 24 }
];

const output = await mkdtemp(join(tmpdir(), "amy-noise-modes-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  const report = [];
  for (const item of cases) {
    const source = join(output, `${item.name}.alexis`);
    const asm = join(output, `${item.name}.asm`);
    const rom = join(output, `${item.name}.rom`);
    await writeFile(source, sourceFor(item.code, item.tone3Period), "utf8");
    await compile(source, asm, rom);
    const samples = await capture(bios, await readFile(rom));
    const converted = classify(samples);
    const noise = converted.streams.find((stream) => stream.type === "noise");
    const expectedKind = item.name.startsWith("white") ? "white" : "periodic";
    const expectedRate = item.tone3Period ? 3 : Number(item.name.at(-1));
    assert.ok(noise, `${item.name}: source noise must be recovered`);
    assert.deepEqual([...new Set(noise.events.filter((event) => event.attenuation < 15)
      .map((event) => event.white === false ? "periodic" : "white"))], [expectedKind]);
    assert.deepEqual([...new Set(noise.events.filter((event) => event.attenuation < 15)
      .map((event) => event.noiseRate))], [expectedRate]);
    assert.equal(converted.streams.filter((stream) => stream.type === "tone").length, 0,
      `${item.name}: pure noise must not create tonal artifacts`);
    const envelope = recoveredEnvelope(noise);
    assert.ok(envelope[1] > envelope[0] && envelope[2] > envelope[1],
      `${item.name}: 4 -> 6 -> 8 attenuation envelope must remain ordered, got ${envelope.join(", ")}`);

    const rebuiltSource = join(output, `${item.name}-rebuilt.alexis`);
    const rebuiltAsm = join(output, `${item.name}-rebuilt.asm`);
    const rebuiltRom = join(output, `${item.name}-rebuilt.rom`);
    await writeFile(rebuiltSource, sourceForConversion(converted, `Rebuilt_${item.name.replaceAll("-", "_")}`), "utf8");
    await compile(rebuiltSource, rebuiltAsm, rebuiltRom);
    const rebuilt = classify(await capture(bios, await readFile(rebuiltRom)));
    const rebuiltNoise = rebuilt.streams.find((stream) => stream.type === "noise");
    assert.ok(rebuiltNoise, `${item.name}: reconstructed ROM must still produce noise`);
    assert.deepEqual([...new Set(rebuiltNoise.events.filter((event) => event.attenuation < 15)
      .map((event) => event.white === false ? "periodic" : "white"))], [expectedKind]);
    assert.deepEqual([...new Set(rebuiltNoise.events.filter((event) => event.attenuation < 15)
      .map((event) => event.noiseRate))], [expectedRate]);
    const rebuiltEnvelope = recoveredEnvelope(rebuiltNoise);
    assert.ok(rebuiltEnvelope[1] >= rebuiltEnvelope[0] && rebuiltEnvelope[2] >= rebuiltEnvelope[1]
      && rebuiltEnvelope[2] > rebuiltEnvelope[0]
      && Math.abs((rebuiltEnvelope[2] - rebuiltEnvelope[0]) - (envelope[2] - envelope[0])) <= 2,
    `${item.name}: reconstructed envelope ${rebuiltEnvelope.join(", ")} changes shape from ${envelope.join(", ")}`);
    report.push({
      source: item.name,
      recognizedAsNoise: Boolean(noise),
      recoveredRates: noise ? [...new Set(noise.events.filter((event) => event.attenuation < 15).map((event) => event.noiseRate))] : [],
      recoveredKinds: noise ? [...new Set(noise.events.filter((event) => event.attenuation < 15).map((event) => event.white === false ? "periodic" : "white"))] : [],
      recoveredAttenuations: noise ? [...new Set(noise.events.filter((event) => event.attenuation < 15).map((event) => event.attenuation))] : [],
      recoveredEnvelope: envelope,
      centroidRange: converted.analysis.noiseCentroids.length ? [
        Math.round(Math.min(...converted.analysis.noiseCentroids)),
        Math.round(Math.max(...converted.analysis.noiseCentroids))
      ] : [],
      flatnessRange: converted.analysis.noiseFlatness.length ? [
        Number(Math.min(...converted.analysis.noiseFlatness).toFixed(3)),
        Number(Math.max(...converted.analysis.noiseFlatness).toFixed(3))
      ] : [],
      pitchConfidenceRange: converted.analysis.noisePitchConfidence.length ? [
        Number(Math.min(...converted.analysis.noisePitchConfidence).toFixed(3)),
        Number(Math.max(...converted.analysis.noisePitchConfidence).toFixed(3))
      ] : [],
      inputGain: Number(converted.analysis.inputGain.toFixed(2)),
      noiseFrameRatio: Number((converted.analysis.noiseFrames / converted.frameCount).toFixed(2)),
      inferredClock: Math.round(converted.analysis.inferredNoiseClock),
      fixedError: Number(converted.analysis.fixedNoiseError.toFixed(3)),
      toneTracks: converted.streams.filter((stream) => stream.type === "tone").length
    });
  }
  console.log(JSON.stringify(report, null, 2));
  console.log("SN76489 noise mode and reconstructed-ROM round trips: PASS");
} finally {
  await rm(output, { recursive: true, force: true });
}
