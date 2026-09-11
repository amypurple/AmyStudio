#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { encodeThreeChannelPcm } from "../studio/core/colecoThreeChannelPcm.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const levels = [];
for (let repeat = 0; repeat < 120; repeat += 1) {
  for (let level = 19; level <= 45; level += 1) levels.push(level);
  for (let level = 44; level >= 5; level -= 1) levels.push(level);
}
const encoded = encodeThreeChannelPcm(levels);
const encodedValues = Array.from(encoded, value => `$${value.toString(16).padStart(2, "0")}`);
const db = Array.from({ length: Math.ceil(encodedValues.length / 24) }, (_, line) =>
  `    db ${encodedValues.slice(line * 24, line * 24 + 24).join(",")}`
).join("\n");
const source = `
u8 Finished = 0

sub start:
  text screen
  screen on
  play tripcm TripcmTestData
  Finished = 1
  loop forever

data TripcmTestData bytes
${db.replace(/^    db /gm, "  ")}
end data
`;

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", code => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}\n${output}`)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

const temp = await mkdtemp(join(tmpdir(), "amy-tripcm-rom-"));
try {
  const sourcePath = join(temp, "tripcm.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `tripcm-${profile}.asm`);
    const romPath = join(temp, `tripcm-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x54524950 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      let nonZeroSamples = 0;
      let audioFrames = 0;
      let finishedFrame = -1;
      for (let frame = 0; frame < 90; frame += 1) {
        core.runFrame();
        const audio = core.getAudioFrame();
        audioFrames += audio.frameCount;
        for (const sample of audio.samples) if (sample !== 0) nonZeroSamples += 1;
        if (finishedFrame < 0 && core.readRam(addressOf(asm, "Finished"), 1)[0] === 1) finishedFrame = frame;
      }
      assert.equal(core.readRam(addressOf(asm, "Finished"), 1)[0], 1, `${profile}: player must return to Amy code`);
      assert(nonZeroSamples > 0, `${profile}: player must produce PSG audio (finished frame ${finishedFrame}, ${audioFrames} captured frames)`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Three-channel PCM GearColeco test PASS (${profiles.length} profiles, ${encoded.length} stream bytes)`);
} finally {
  if (process.env.KEEP_TMP) console.log(`Kept ${temp}`);
  else await rm(temp, { recursive: true, force: true });
}
