#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-inline-voxpcm-shift-"));

function build(id, sourceText, profile) {
  const source = join(temp, `${id}.alexis`);
  const asmPath = join(temp, `${id}-${profile}.asm`);
  const romPath = join(temp, `${id}-${profile}.rom`);
  writeFileSync(source, sourceText);
  const result = spawnSync(process.execPath, [
    resolve(root, "tools/amyc.mjs"), source,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", profile
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${id}/${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
  return { asm: readFileSync(asmPath, "utf8"), rom: readFileSync(romPath) };
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

const shiftSource = `
project "Variable shift regression"
memory "colecovision_legacy_sdcc"
u8 Count = 3
u8 Zero = 0
u8 Large = 9
u16 CountWord = 3
u16 CountHuge = 256
u8 ByteLeft = 0
u8 ByteZero = 0
u8 ByteLarge = 0
i8 SignedByte = -128
i8 ByteRight = 0
u8 ByteWord = 0
u8 ByteHuge = 0
u16 WordLeft = 0
u16 WordRight = 0
ByteLeft = 1 << Count
ByteZero = 1 << Zero
ByteLarge = 1 << Large
ByteRight = SignedByte >> Count
ByteWord = 128 >> (CountWord & 7)
ByteHuge = 128 >> CountHuge
WordLeft = 1 << Count
WordRight = $8000 >> Count
loop forever
`;

const voxSource = `
project "Inline VoxPCM regression"
memory "colecovision_legacy_sdcc"
u8 Enabled = 0
if Enabled = 1 then play voxpcm TestVoice
loop forever
asm {
TestVoice:
    dw TestVoicePart
    db 1,1
    dw 0
    dw 0
TestVoicePart:
    db $21,$21,$FF
}
`;

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const vox = build("inline-voxpcm", voxSource, profile);
    assert.match(vox.asm, /call AMY_PLAY_TRIPCM_SEQUENCE/, `${profile}: missing inline VoxPCM call`);

    const shifted = build("variable-shift", shiftSource, profile);
    const core = await GearcolecoTestCore.create({ seed: 0x26102610 });
    try {
      core.loadBios(bios);
      core.loadRom(shifted.rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 30; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(shifted.asm, "ByteLeft"), 1)[0], 8, `${profile}: u8 left shift`);
      assert.equal(core.readRam(addressOf(shifted.asm, "ByteZero"), 1)[0], 1, `${profile}: zero shift`);
      assert.equal(core.readRam(addressOf(shifted.asm, "ByteLarge"), 1)[0], 0, `${profile}: saturated u8 shift`);
      assert.equal(core.readRam(addressOf(shifted.asm, "ByteRight"), 1)[0], 0xF0, `${profile}: signed u8 right shift`);
      assert.equal(core.readRam(addressOf(shifted.asm, "ByteWord"), 1)[0], 16, `${profile}: u16 expression shift count`);
      assert.equal(core.readRam(addressOf(shifted.asm, "ByteHuge"), 1)[0], 0, `${profile}: large u16 byte shift count`);
      assert.deepEqual([...core.readRam(addressOf(shifted.asm, "WordLeft"), 2)], [8, 0], `${profile}: u16 left shift`);
      assert.deepEqual([...core.readRam(addressOf(shifted.asm, "WordRight"), 2)], [0, 0x10], `${profile}: u16 right shift`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Inline VoxPCM and variable shifts: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
