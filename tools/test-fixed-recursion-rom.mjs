#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "FIXED RECURSION ROM TEST"
memory "colecovision_legacy_sdcc"
u8 GuardBefore = 77
fixed SignedWrap = 127.0
ufixed UnsignedWrap = 255.0
fixed ProductWrap = 100.0
fixed Third = 1.0
u16 MutualResult = 0
u32 WideResult = 0
u8 GuardAfter = 88

function MutualLeft(u8 N, u16 Total) as u16
  u16 Saved = 0
  Saved = Total + N
  if N = 0 then return Saved
  return MutualRight(N - 1, Saved)

function MutualRight(u8 N, u16 Total) as u16
  u16 Saved = 0
  Saved = Total + N
  if N = 0 then return Saved
  return MutualLeft(N - 1, Saved)

function WideCountdown(u8 N, u32 Value) as u32
  u32 Saved = 0
  Saved = Value + 1
  if N = 0 then return Saved
  return WideCountdown(N - 1, Saved)

SignedWrap += 1.0
UnsignedWrap += 1.0
ProductWrap *= 100.0
Third /= 3.0
MutualResult = MutualLeft(4, 0)
WideResult = WideCountdown(2, 100000)
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

const expected = {
  GuardBefore: [77],
  SignedWrap: [0x00, 0x80],
  UnsignedWrap: [0x00, 0x00],
  ProductWrap: [0x00, 0x10],
  Third: [0x55, 0x00],
  MutualResult: [10, 0],
  WideResult: [0xA3, 0x86, 0x01, 0x00],
  GuardAfter: [88]
};

const temp = await mkdtemp(join(tmpdir(), "amy-fixed-recursion-"));
try {
  const sourcePath = join(temp, "test.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `test-${profile}.asm`);
    const romPath = join(temp, `test-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x46585243 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 6; frame += 1) core.runFrame();
      for (const [name, bytes] of Object.entries(expected)) {
        assert.deepEqual([...core.readRam(addressOf(asm, name), bytes.length)], bytes, `${profile}: ${name}`);
      }
    } finally {
      core.destroy();
    }
  }
  console.log(`Fixed boundary and recursion ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
