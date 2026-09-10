#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { encodeToneNote } from "../studio/core/colecoSoundNotes.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

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

function db(bytes) {
  return bytes.map((value) => `$${value.toString(16).toUpperCase().padStart(2, "0")}`).join(",");
}

async function captureAudio(bios, rom) {
  const core = await GearcolecoTestCore.create({ seed: 0x534f554e });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    const samples = [];
    let nonZero = 0;
    for (let frame = 0; frame < 90; frame += 1) {
      core.runFrame();
      const audio = core.getAudioFrame();
      for (const sample of audio.samples) {
        samples.push(sample);
        if (sample !== 0) nonZero += 1;
      }
    }
    const firstActive = samples.findIndex((sample) => sample !== 0);
    const active = Int16Array.from(samples.slice(firstActive, firstActive + 44100));
    const bytes = new Uint8Array(active.buffer, active.byteOffset, active.byteLength);
    let zeroCrossings = 0;
    let peak = 0;
    for (let index = 2; index < active.length; index += 2) {
      if ((active[index - 2] < 0 && active[index] >= 0) || (active[index - 2] >= 0 && active[index] < 0)) zeroCrossings += 1;
      peak = Math.max(peak, Math.abs(active[index]));
    }
    return { hash: createHash("sha256").update(bytes).digest("hex"), nonZero, firstActive, zeroCrossings, peak };
  } finally {
    core.destroy();
  }
}

const output = await mkdtemp(join(tmpdir(), "amy-bios-note-rom-"));
try {
  const note = encodeToneNote({ channel: 1, note: "A", octave: 4, length: 32, fade: true });
  const sourcePath = join(output, "bios-note.alexis");
  await writeFile(sourcePath, `project "BIOS NOTE RUNTIME TEST"
set sound table TestSoundTable areas 1
screen on
wait 4 frames
play sound 1
loop forever

asm {
TestSoundTable:
  dw TestNote,$702B
TestNote:
  db ${db(note)},$50
}
`, "utf8");
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  const results = [];
  for (const profile of profiles) {
    const asmPath = join(output, `bios-note-${profile}.asm`);
    const romPath = join(output, `bios-note-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const rom = await readFile(romPath);
    const audio = await captureAudio(bios, rom);
    assert.ok(audio.nonZero > 0, `${profile}: generated BIOS note must produce PCM`);
    results.push({ profile, romBytes: rom.length, ...audio });
  }
  console.log(JSON.stringify({ note, results }, null, 2));
  const optimizedHashes = new Set(results.filter((result) => ["balanced", "aggressive", "experimental"].includes(result.profile)).map((result) => result.hash));
  assert.equal(optimizedHashes.size, 1, "equivalent optimized code paths must produce identical PCM");
  assert.ok(Math.max(...results.map((result) => result.zeroCrossings)) - Math.min(...results.map((result) => result.zeroCrossings)) <= 1,
    "all profiles must preserve the generated pitch");
  assert.ok(Math.max(...results.map((result) => result.nonZero)) - Math.min(...results.map((result) => result.nonZero)) <= 16,
    "all profiles must preserve the note duration within sub-frame phase tolerance");
  assert.ok(Math.max(...results.map((result) => result.peak)) - Math.min(...results.map((result) => result.peak)) <= 8,
    "all profiles must preserve peak amplitude within oscillator-phase tolerance");
  console.log("Coleco BIOS note ROM audio: PASS");
} finally {
  await rm(output, { recursive: true, force: true });
}
