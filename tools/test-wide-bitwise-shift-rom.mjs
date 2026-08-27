#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "studio/examples-src/amy-wide-integer-selftest.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = await mkdtemp(join(tmpdir(), "amy-wide-bitwise-"));

function compile(sourcePath, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${profile} compile failed:\n${output}`)));
  });
}

async function assertCompileFails(name, body) {
  const sourcePath = join(temp, `${name}.alexis`);
  await writeFile(sourcePath, `project "WIDE BITWISE REJECTION"\n${body}\nloop forever\n`);
  await assert.rejects(
    compile(sourcePath, join(temp, `${name}.asm`), join(temp, `${name}.rom`), "balanced"),
    /compile failed/
  );
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

function readU16(core, address) {
  const bytes = core.readRam(address, 2);
  return bytes[0] | (bytes[1] << 8);
}

function readU32(core, address) {
  const bytes = core.readRam(address, 4);
  return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
}

try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `wide-${profile}.asm`);
    const romPath = join(temp, `wide-${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x57494445 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      const u32 = (name) => readU32(core, addressOf(asm, name));
      assert.equal(u32("And32"), 0x0F000F00, `${profile}: and expression`);
      assert.equal(u32("Or32"), 0xFF0FFF0F, `${profile}: or expression`);
      assert.equal(u32("Xor32"), 0xF00FF00F, `${profile}: xor expression`);
      assert.equal(u32("Not32"), 0x00FF00FF, `${profile}: not expression`);
      assert.equal(u32("ShiftLeft32"), 0x0FF01000, `${profile}: left shift across bytes`);
      assert.equal(u32("ShiftRight32"), 0x00F00001, `${profile}: logical right shift`);
      assert.equal(u32("VariableShift32"), 0x34567800, `${profile}: variable shift`);
      assert.equal(u32("SaturatedShift32"), 0, `${profile}: unsigned shift >= 32`);
      assert.equal(u32("SignedShift32"), 0xFFFFFFFC, `${profile}: arithmetic right shift`);
      assert.equal(u32("SignedSaturated32"), 0xFFFFFFFF, `${profile}: signed shift >= 32`);
      assert.equal(u32("SignedAnd32"), 0x0F0F0F0F, `${profile}: i32 and expression`);
      assert.equal(u32("SignedNot32"), 0x0F0F0F0F, `${profile}: i32 not expression`);
      assert.equal(u32("ArrayResult32"), 0x003FFFF8, `${profile}: array bitwise/shift`);
      assert.equal(u32("RecordResult32"), 0x01FEFE00, `${profile}: record bitwise/shift`);
      assert.equal(readU32(core, addressOf(asm, "RecordValues") + 4), 0x00FF0000, `${profile}: signed record compound bitwise`);
      assert.equal(u32("OverlayResult32"), 0x000F000F, `${profile}: overlay alias bitwise/shift`);
      assert.equal(readU16(core, addressOf(asm, "Compound16")), 0xFFF0, `${profile}: u16 compound bitwise`);
      assert.equal(readU16(core, addressOf(asm, "SignedCompound16")), 0x0F00, `${profile}: i16 compound bitwise`);
      assert.equal(readU16(core, addressOf(asm, "VariableShift16")), 0x3400, `${profile}: u16 variable shift`);
      assert.equal(readU16(core, addressOf(asm, "SignedVariableShift16")), 0xFFFF, `${profile}: i16 variable arithmetic shift`);
      assert.equal(readU16(core, addressOf(asm, "SaturatedShift16")), 0, `${profile}: u16 shift >= 16`);
      assert.equal(core.readRam(addressOf(asm, "Passed"), 1)[0], 22, `${profile}: visible self-test count`);
    } finally {
      core.destroy();
    }
  }
  await assertCompileFails("mixed-signedness-bitwise", "u32 Left = 1\ni32 Right = -1\nu32 Result = 0\nResult = Left & Right");
  await assertCompileFails("signed-shift-count", "u32 Value = 1\ni8 Count = 2\nValue <<= Count");
  await assertCompileFails("signed-shift-count-16", "u16 Value = 1\ni8 Count = 2\nValue <<= Count");
  await assertCompileFails("negative-shift-count", "u32 Value = 1\nValue >>= -1");
  console.log(`wide bitwise/shift ROM: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
