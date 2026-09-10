#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `
u8 ByteValue = 42
u16 WordValue = $1234
u8 Buffer[4]
u8 Passed = 0
u8 LocalResult = 0

sub start:
  u8 LocalByte = 7
  call asm CheckValues with a = ByteValue, hl = WordValue
  call asm WriteAddresses with hl = address of Buffer, de = address of ByteValue, bc = address of WordValue
  call asm WriteLocal with hl = address of LocalByte
  LocalResult = LocalByte
  loop forever

asm {
CheckValues:
  cp 42
  ret nz
  ld a,h
  cp $12
  ret nz
  ld a,l
  cp $34
  ret nz
  ld a,1
  ld (AMY_UVAR_Passed),a
  ret

WriteAddresses:
  ld (hl),$55
  ex de,hl
  ld (hl),$66
  ld h,b
  ld l,c
  ld (hl),$78
  inc hl
  ld (hl),$56
  ret

WriteLocal:
  ld (hl),$99
  ret
}
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

function compileExpectFailure(sourcePath, asmPath, romPath, expected) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", "balanced"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      try {
        assert.notEqual(code, 0, "invalid call asm ABI unexpectedly compiled");
        assert.match(output, expected);
        resolveRun();
      } catch (error) {
        rejectRun(error);
      }
    });
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

const temp = await mkdtemp(join(tmpdir(), "amy-call-asm-abi-"));
try {
  const sourcePath = join(temp, "test.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `test-${profile}.asm`);
    const romPath = join(temp, `test-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    assert.match(asm, /ld hl,\(AMY_UVAR_WordValue\)/, `${profile}: HL scalar must pass its value`);
    assert.match(asm, /ld hl,AMY_UVAR_Buffer/, `${profile}: explicit global array address`);
    assert.match(asm, /push ix\s+pop hl\s+ld de,-1\s+add hl,de/i, `${profile}: explicit stack-local address`);
    const core = await GearcolecoTestCore.create({ seed: 0x41534d42 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 6; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Passed"), 1)[0], 1, `${profile}: scalar register values`);
      assert.equal(core.readRam(addressOf(asm, "ByteValue"), 1)[0], 0x66, `${profile}: DE address`);
      assert.deepEqual([...core.readRam(addressOf(asm, "WordValue"), 2)], [0x78, 0x56], `${profile}: BC address`);
      assert.equal(core.readRam(addressOf(asm, "Buffer"), 1)[0], 0x55, `${profile}: HL array address`);
      assert.equal(core.readRam(addressOf(asm, "LocalResult"), 1)[0], 0x99, `${profile}: HL stack-local address`);
    } finally {
      core.destroy();
    }
  }
  const invalidAddressPath = join(temp, "invalid-address.alexis");
  await writeFile(invalidAddressPath, "u8 Buffer[4]\ncall asm Bad with a = address of Buffer\n");
  await compileExpectFailure(
    invalidAddressPath,
    join(temp, "invalid-address.asm"),
    join(temp, "invalid-address.rom"),
    /address arguments require hl, de, or bc/i
  );
  const overlappingRegistersPath = join(temp, "overlapping-registers.alexis");
  await writeFile(overlappingRegistersPath, "call asm Bad with hl = 1, h = 2\n");
  await compileExpectFailure(
    overlappingRegistersPath,
    join(temp, "overlapping-registers.asm"),
    join(temp, "overlapping-registers.rom"),
    /cannot set h and hl in the same statement/i
  );
  console.log(`call asm ABI ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
