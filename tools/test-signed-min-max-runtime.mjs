#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "Signed min max runtime"
i8 ByteMin = 0
i8 ByteMax = 0
i8 ByteNested = 0
i16 WordMin = 0
i16 WordMax = 0
i16 WordNested = 0
i16 X = 150
u8 UnsignedByteMin = 0
u8 UnsignedByteMax = 0
u16 UnsignedWordMin = 0
u16 UnsignedWordMax = 0
i8 ByteLowerBound = 0
i8 ByteUpperBound = 0
i16 WordLowerBound = 0
i16 WordUpperBound = 0
i8 ByteMagnitude = 20
i16 WordMagnitude = 300
i8 VariableByteMin = 0
i16 VariableWordMin = 0

sub start:
  ByteMin = min(50, -20)
  ByteMax = max(-20, 20)
  ByteNested = max(-18, min(-30, 12))
  WordMin = min(-300, 200)
  WordMax = max(-200, 200)
  WordNested = max(-20, min(120 - X, 20))
  UnsignedByteMin = min(250, 200)
  UnsignedByteMax = max(10, 240)
  UnsignedWordMin = min(65000, 50000)
  UnsignedWordMax = max(1000, 60000)
  ByteLowerBound = min(-128, 127)
  ByteUpperBound = max(-128, 127)
  WordLowerBound = min(-32768, 32767)
  WordUpperBound = max(-32768, 32767)
  VariableByteMin = min(50, -ByteMagnitude)
  VariableWordMin = min(200, -WordMagnitude)
  loop forever
end sub
`;

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `Missing ${name}`);
  return Number.parseInt(match[1], 16);
}

function signed8(value) {
  return value & 0x80 ? value - 0x100 : value;
}

function signed16(bytes) {
  const value = bytes[0] | (bytes[1] << 8);
  return value & 0x8000 ? value - 0x10000 : value;
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-signed-min-max-"));
let passed = false;
try {
  const bios = await readFile(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const sourcePath = join(outputDir, `${profile}.alexis`);
    const asmPath = join(outputDir, `${profile}.asm`);
    const romPath = join(outputDir, `${profile}.rom`);
    await writeFile(sourcePath, source);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, romFile] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const rom = new Uint8Array(romFile);
    rom[0] = 0x55;
    rom[1] = 0xaa;
    const core = await GearcolecoTestCore.create({ seed: 0x534D4D58 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 12; frame += 1) core.runFrame();
      assert.equal(signed8(core.readRam(addressOf(asm, "ByteMin"), 1)[0]), -20, `${profile}: byte min`);
      assert.equal(signed8(core.readRam(addressOf(asm, "ByteMax"), 1)[0]), 20, `${profile}: byte max`);
      assert.equal(signed8(core.readRam(addressOf(asm, "ByteNested"), 1)[0]), -18, `${profile}: nested byte`);
      assert.equal(signed16(core.readRam(addressOf(asm, "WordMin"), 2)), -300, `${profile}: word min`);
      assert.equal(signed16(core.readRam(addressOf(asm, "WordMax"), 2)), 200, `${profile}: word max`);
      assert.equal(signed16(core.readRam(addressOf(asm, "WordNested"), 2)), -20, `${profile}: nested word`);
      assert.equal(core.readRam(addressOf(asm, "UnsignedByteMin"), 1)[0], 200, `${profile}: unsigned byte min`);
      assert.equal(core.readRam(addressOf(asm, "UnsignedByteMax"), 1)[0], 240, `${profile}: unsigned byte max`);
      const unsignedWordMin = core.readRam(addressOf(asm, "UnsignedWordMin"), 2);
      const unsignedWordMax = core.readRam(addressOf(asm, "UnsignedWordMax"), 2);
      assert.equal(unsignedWordMin[0] | (unsignedWordMin[1] << 8), 50000, `${profile}: unsigned word min`);
      assert.equal(unsignedWordMax[0] | (unsignedWordMax[1] << 8), 60000, `${profile}: unsigned word max`);
      assert.equal(signed8(core.readRam(addressOf(asm, "ByteLowerBound"), 1)[0]), -128, `${profile}: byte lower bound`);
      assert.equal(signed8(core.readRam(addressOf(asm, "ByteUpperBound"), 1)[0]), 127, `${profile}: byte upper bound`);
      assert.equal(signed16(core.readRam(addressOf(asm, "WordLowerBound"), 2)), -32768, `${profile}: word lower bound`);
      assert.equal(signed16(core.readRam(addressOf(asm, "WordUpperBound"), 2)), 32767, `${profile}: word upper bound`);
      assert.equal(signed8(core.readRam(addressOf(asm, "VariableByteMin"), 1)[0]), -20, `${profile}: variable byte min`);
      assert.equal(signed16(core.readRam(addressOf(asm, "VariableWordMin"), 2)), -300, `${profile}: variable word min`);
    } finally {
      core.destroy();
    }
  }
  passed = true;
  console.log(`Signed min/max runtime: PASS (${profiles.length} optimization profiles)`);
} finally {
  if (passed || process.env.KEEP_TEST_ARTIFACTS !== "1") await rm(outputDir, { recursive: true, force: true });
  else console.error(`Preserved failing artifacts: ${outputDir}`);
}
