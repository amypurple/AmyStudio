#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

const testSource = `
u32 Counter32 = 0, Seed32 = 100000, Addend32 = 12345
u16 RootA = 0, RootB = 0
u8 U32Ok = 0
u8 MinByte = 9, MaxByte = 3
u16 MinWord = 300, MaxWord = 100
bcd digits 6 DecScore

sub start:
  RootA = sqrt(144)
  RootB = sqrt(625)
  MinByte = min(MinByte, 3)
  MaxByte = max(MaxByte, 9)
  MinWord = min(MinWord, 100)
  MaxWord = max(MaxWord, 300)
  Counter32 = Seed32
  Counter32 += Addend32
  Counter32 += 1
  Counter32 -= Addend32
  if Counter32 = 100001 then U32Ok = 1
  clear DecScore
  DecScore += 100000
  DecScore += 2345
  DecScore -= 1000
  loop forever
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

const temp = await mkdtemp(join(tmpdir(), "amy-math-demo-"));
try {
  const sourcePath = join(temp, "amy-math-demo-selftest.alexis");
  await writeFile(sourcePath, testSource, "utf8");
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `math-${profile}.asm`);
    const romPath = join(temp, `math-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x4D415448 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      const read = (name, count) => core.readRam(addressOf(asm, name), count);
      assert.deepEqual([...read("Counter32", 4)], [0xA1, 0x86, 0x01, 0x00], `${profile}: u32 chain`);
      assert.equal(read("U32Ok", 1)[0], 1, `${profile}: u32 validation flag`);
      assert.deepEqual([...read("RootA", 2)], [12, 0], `${profile}: sqrt 144`);
      assert.deepEqual([...read("RootB", 2)], [25, 0], `${profile}: sqrt 625`);
      assert.equal(read("MinByte", 1)[0], 3, `${profile}: u8 min expression`);
      assert.equal(read("MaxByte", 1)[0], 9, `${profile}: u8 max expression`);
      assert.deepEqual([...read("MinWord", 2)], [100, 0], `${profile}: u16 min expression`);
      assert.deepEqual([...read("MaxWord", 2)], [44, 1], `${profile}: u16 max expression`);
      assert.deepEqual([...read("DecScore", 3)], [0x45, 0x13, 0x10], `${profile}: packed BCD 101345`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Amy Math Demo ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
