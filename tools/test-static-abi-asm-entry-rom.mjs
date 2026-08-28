#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "STATIC ABI ASM ENTRY ROM"
memory "colecovision_legacy_sdcc"
u8 GuardBefore = 77
u8 ByteResult = 0
u16 WordResult = 0
u8 GuardAfter = 88

function AsmByteTarget(u8 Value) as u8
  u8 ByteTemp = 1
  return Value + ByteTemp

function AsmWordTarget(u16 Value) as u16
  u16 WordTemp = 1000
  return Value + WordTemp

sub InvokeFromAsm:
  asm {
    ld hl,41
    push hl
    ld a,1
    or a
    call nz,AMY_UPROC_AsmByteTarget
    pop bc
    ld (AMY_UVAR_ByteResult),a

    ld hl,64000
    push hl
    call AMY_UPROC_AsmWordTarget
    pop bc
    ld (AMY_UVAR_WordResult),hl
  }
end sub

InvokeFromAsm
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

function routineBlock(asm, name) {
  const start = asm.indexOf(`AMY_UPROC_${name}:`);
  assert.ok(start >= 0, `missing routine ${name}`);
  const tail = asm.slice(start + 1);
  const next = tail.match(/\n(?:AMY_UPROC_[A-Za-z0-9_]+|Start):/);
  return asm.slice(start, next ? start + 1 + next.index : asm.length);
}

const temp = await mkdtemp(join(tmpdir(), "amy-static-abi-asm-entry-"));
try {
  const sourcePath = join(temp, "test.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `test-${profile}.asm`);
    const romPath = join(temp, `test-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    assert.match(routineBlock(asm, "AsmByteTarget"), /push ix[\s\S]*\(ix\+4\)/i, `${profile}: byte ASM target must retain IX ABI`);
    assert.match(routineBlock(asm, "AsmWordTarget"), /push ix[\s\S]*\(ix\+4\)/i, `${profile}: word ASM target must retain IX ABI`);
    const core = await GearcolecoTestCore.create({ seed: 0x41534D45 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 6; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "GuardBefore"), 1)[0], 77, `${profile}: guard before`);
      assert.equal(core.readRam(addressOf(asm, "ByteResult"), 1)[0], 42, `${profile}: conditional ASM byte call`);
      assert.deepEqual([...core.readRam(addressOf(asm, "WordResult"), 2)], [0xE8, 0xFD], `${profile}: ASM word call`);
      assert.equal(core.readRam(addressOf(asm, "GuardAfter"), 1)[0], 88, `${profile}: guard after`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Static ABI ASM-entry ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
