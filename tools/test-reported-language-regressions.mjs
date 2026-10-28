#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { compressBytes, decompressBytes } from "../studio/core/compression.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "balanced", "aggressive", "experimental"];
const source = `
u8 I = 0, ByteCount = 0, ByteStepCount = 0, Finished = 0
u16 W = 0, WordCount = 0
u16 RandomValue = 0, RandomHigh = 0
u8 RandomSmall = 0
i8 SignedByteLow = -5, SignedByteHigh = 40, SignedByteKeep = 7
i16 SignedWordLow = -5, SignedWordHigh = 40, SignedWordKeep = 7

  for I = 254 to 255
    ByteCount += 1
  next I
  for I = 250 to 255 step 3
    ByteStepCount += 1
  next I
  for W = 65534 to 65535
    WordCount += 1
  next W
  clamp SignedByteLow between 0 and 31
  clamp SignedByteHigh between 0 and 31
  clamp SignedByteKeep between 0 and 31
  clamp SignedWordLow between 0 and 31
  clamp SignedWordHigh between 0 and 31
  clamp SignedWordKeep between 0 and 31
  for W = 1 to 300
    RandomValue = random(1000)
    if RandomValue > RandomHigh then RandomHigh = RandomValue
  next W
  for W = 1 to 500
    RandomSmall = random(10)
  next W
  Finished = 1
forever:
  goto forever
`;

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}\n${output}`)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

for (const size of [257, 258, 259, 300, 400, 511]) {
  const raw = Uint8Array.from({ length: size }, (_, index) => (index * 73 + (index >>> 1) * 151 + 37) & 0xff);
  const packed = await compressBytes("dan3", raw);
  const restored = await decompressBytes("dan3", packed);
  assert.deepEqual([...restored], [...raw], `DAN3 roundtrip at ${size} bytes`);
}

const temp = await mkdtemp(join(tmpdir(), "amy-reported-regressions-"));
try {
  const sourcePath = join(temp, "runtime.alexis");
  await writeFile(sourcePath, source, "utf8");
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x52454752 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 300; frame += 1) core.runFrame();
      const byte = (name) => core.readRam(addressOf(asm, name), 1)[0];
      const word = (name) => {
        const value = core.readRam(addressOf(asm, name), 2);
        return value[0] | (value[1] << 8);
      };
      assert.equal(byte("Finished"), 1, `${profile}: loops terminate`);
      assert.equal(byte("ByteCount"), 2, `${profile}: u8 max-bound loop`);
      assert.equal(byte("ByteStepCount"), 2, `${profile}: u8 overflowing step loop`);
      assert.equal(word("WordCount"), 2, `${profile}: u16 max-bound loop`);
      assert.equal(byte("SignedByteLow"), 0, `${profile}: low i8 clamp`);
      assert.equal(byte("SignedByteHigh"), 31, `${profile}: high i8 clamp`);
      assert.equal(byte("SignedByteKeep"), 7, `${profile}: in-range i8 clamp`);
      assert.equal(word("SignedWordLow"), 0, `${profile}: low i16 clamp`);
      assert.equal(word("SignedWordHigh"), 31, `${profile}: high i16 clamp`);
      assert.equal(word("SignedWordKeep"), 7, `${profile}: in-range i16 clamp`);
      assert.ok(word("RandomHigh") > 255 && word("RandomHigh") < 1000, `${profile}: bounded u16 random range`);
      assert.ok(byte("RandomSmall") < 10, `${profile}: bounded u8 random range`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Reported language regression tests PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
