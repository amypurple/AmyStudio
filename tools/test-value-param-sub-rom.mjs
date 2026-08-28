#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "VALUE PARAM SUB ROM"
memory "colecovision_legacy_sdcc"
u8 GuardBefore = 77
u8 ByteSeen = 0
u8 ByteResult = 0
i8 SignedByteSeen = 0
i8 SignedByteResult = 0
u16 WordSeen = 0
u16 WordResult = 0
i16 SignedWordSeen = 0
i16 SignedWordResult = 0
fixed FixedSeen = 0
fixed FixedResult = 0
ufixed UnsignedSeen = 0
ufixed UnsignedResult = 0
u8 StackSeen = 0
u8 StackResult = 0
u8 GuardAfter = 88

sub AddByte(u8 Value):
  ByteSeen = Value
  ByteResult = Value + 1
end sub

sub AddWord(u16 Value):
  WordSeen = Value
  WordResult = Value + 1000
end sub

sub AddSignedByte(i8 Value):
  SignedByteSeen = Value
  SignedByteResult = Value + 1
end sub

sub AddSignedWord(i16 Value):
  SignedWordSeen = Value
  SignedWordResult = Value + 1000
end sub

sub HalfFixed(fixed Value):
  FixedSeen = Value
  FixedResult = Value / 2.0
end sub

sub HalfUnsigned(ufixed Value):
  UnsignedSeen = Value
  UnsignedResult = Value / 2.0
end sub

' The inline ASM transfer makes this parameterized target retain the IX stack ABI.
sub StackByte(u8 Value):
  StackSeen = Value
  StackResult = Value + 1
end sub

sub ExposeStackTarget:
  asm {
    ld hl,0
    push hl
    call z,AMY_UPROC_StackByte
    pop hl
  }
end sub

sub start:
  AddByte(5)
  AddSignedByte(-5)
  AddWord(64000)
  AddSignedWord(-32000)
  HalfFixed(-12.5)
  HalfUnsigned(255.0)
  StackByte(9)
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

function staticParamAddress(asm, routine, name) {
  const match = asm.match(new RegExp(`^AMY_SPARM_${routine}_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "mi"));
  assert.ok(match, `missing static parameter ${routine}.${name}`);
  return Number.parseInt(match[1], 16);
}

const temp = await mkdtemp(join(tmpdir(), "amy-value-param-sub-"));
try {
  const sourcePath = join(temp, "test.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `test-${profile}.asm`);
    const romPath = join(temp, `test-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x53554256 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 6; frame += 1) core.runFrame();
      const read = (name, count) => [...core.readRam(addressOf(asm, name), count)];
      assert.deepEqual(read("ByteSeen", 2), [5, 6], `${profile}: static u8 value parameter`);
      assert.equal(core.readRam(staticParamAddress(asm, "AddByte", "Value"), 1)[0], 5, `${profile}: static parameter cell`);
      assert.deepEqual(read("SignedByteSeen", 2), [0xFB, 0xFC], `${profile}: static i8 value parameter`);
      assert.deepEqual(read("WordSeen", 4), [0x00, 0xFA, 0xE8, 0xFD], `${profile}: static u16 value parameter`);
      assert.deepEqual(read("SignedWordSeen", 4), [0x00, 0x83, 0xE8, 0x86], `${profile}: static i16 value parameter`);
      assert.deepEqual(read("FixedSeen", 4), [0x80, 0xF3, 0xC0, 0xF9], `${profile}: static fixed value parameter`);
      assert.deepEqual(read("UnsignedSeen", 4), [0x00, 0xFF, 0x80, 0x7F], `${profile}: static ufixed value parameter`);
      assert.deepEqual(read("StackSeen", 2), [9, 10], `${profile}: IX-stack u8 value parameter`);
      assert.equal(read("GuardBefore", 1)[0], 77, `${profile}: guard before`);
      assert.equal(read("GuardAfter", 1)[0], 88, `${profile}: guard after`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Value-parameter sub ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
