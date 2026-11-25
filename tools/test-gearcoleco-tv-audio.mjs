import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { colecoTvMixProfile, DEFAULT_COLECO_TV_MIX } from "../studio/core/colecoTvMix.js";

const root = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "amy-tv-audio-"));
const romPath = join(work, "high-tone.rom");
const build = spawnSync(process.execPath, [
  join(root, "tools/amyc.mjs"),
  join(root, "tools/fixtures/audio-clock/high-tone.alexis"),
  "--opt", "balanced", "--rom", romPath
], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
assert.ifError(build.error);
assert.equal(build.status, 0, build.stderr || build.stdout);

const bios = readFileSync(join(root, "studio/bios/colecovision.rom"));
const rom = readFileSync(romPath);

function rms(samples) {
  return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
}

async function capture(profile) {
  const core = await GearcolecoTestCore.create({ seed: 1 });
  try {
    assert.equal(core.getAudioOutputProfile(), 0, "exact PSG output must remain the default");
    core.setAudioOutputProfile(profile);
    assert.equal(core.getAudioOutputProfile(), profile === "tv" ? 1 : 0);
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 720; ++frame) core.runFrame();
    const samples = [];
    for (let frame = 0; frame < 90; ++frame) {
      core.runFrame();
      const audio = core.getAudioFrame().samples;
      for (let index = 0; index < audio.length; index += 2) samples.push(audio[index]);
    }
    return Int16Array.from(samples);
  } finally {
    core.destroy();
  }
}

try {
  const exact = await capture("accurate");
  const exactAgain = await capture("accurate");
  const television = await capture("tv");
  const televisionAgain = await capture("tv");
  assert.equal(colecoTvMixProfile(0), "tv");
  assert.equal(colecoTvMixProfile(100), "accurate");
  const preferredProfile = colecoTvMixProfile(DEFAULT_COLECO_TV_MIX);
  const preferred = await capture(preferredProfile);
  assert.deepEqual(await capture(preferredProfile), preferred, "D profile must be deterministic");
  assert.notDeepEqual(preferred, television, "D must not be the legacy TV output");
  assert.notDeepEqual(preferred, exact, "D must not be raw PSG");
  assert.deepEqual(exactAgain, exact, "exact output changed between deterministic runs");
  assert.deepEqual(televisionAgain, television, "TV output changed between deterministic runs");
  assert.notDeepEqual(television, exact, "TV profile did not alter the output waveform");
  const exactRms = rms(exact);
  const televisionRms = rms(television);
  assert.ok(televisionRms < exactRms * 0.99,
    `TV speaker roll-off was too weak: ${televisionRms.toFixed(2)} vs ${exactRms.toFixed(2)}`);
  assert.ok(televisionRms > exactRms * 0.80,
    `TV speaker roll-off removed the tone: ${televisionRms.toFixed(2)} vs ${exactRms.toFixed(2)}`);
  console.log(`PASS: exact RMS ${exactRms.toFixed(2)}, Coleco TV RMS ${televisionRms.toFixed(2)}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
