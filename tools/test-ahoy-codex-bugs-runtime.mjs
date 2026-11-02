#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-ahoy-codex-bugs-"));
const source = join(temp, "main.alexis");

writeFileSync(source, `project "AHOY CODEX BUGS"
memory "colecovision_legacy_sdcc"
record SR
  u16 Off
  u8 Len
end record
data T bytes 10,11,12,13,14,15,16,17,18,19
data Packed bytes 1,2,3,4,5,6
data Steps words 0,-66,32767,-32768
data Limits words 1010,534,81
data Indexes bytes 3,1
u16 Base = 3
u16 Count = 4
u8 A[4]
i16 Neg = 0
u16 W[2]
u32 Wide = 0
u8 Compare = 0
u8 Left = 1
u8 Right = 2
u8 ModIn = 47
u8 ModOut = 0
u8 Nested[8]
bcd digits 7 Scores[2]
bcd digits 6 Total = 1990
bcd digits 4 Bonus = 25
SR Rows[2]
  tile screen
  copy T + Base + 2 count Count to A
  Neg = Steps[1]
  W[1] = 1234
  Wide = W[1]
  if W[1] = Limits[1] then Compare = 255 else Compare = 1
  if W[1] > Limits[1] then Compare = Compare + 1
  Nested[Indexes[1]] = 7
  Scores[1] += 1234
  Total += Bonus
  print at 6,1, Scores[1]
  copy Packed + 1 count 3 to Rows
  if Left < Right then swap Left with Right
  ModOut = ModIn % 6
  loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", source, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /call\s+AMY_U16_DIV[\s\S]{0,80}AMY_U16_DIV_REM/i, `${profile}: u8 constant modulo widened to u16`);
    const core = await GearcolecoTestCore.create({ seed: 0x41484F59 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 40; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(addressOf(asm, "A"), 4)], [15, 16, 17, 18], `${profile}: u16 copy count`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Neg"), 2)], [0xBE, 0xFF], `${profile}: negative word data`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Wide"), 4)], [0xD2, 0x04, 0x00, 0x00], `${profile}: u16 array widened to u32`);
      assert.equal(core.readRam(addressOf(asm, "Compare"), 1)[0], 2, `${profile}: word table on comparison right`);
      assert.equal(core.readRam(addressOf(asm, "Nested") + 1, 1)[0], 7, `${profile}: nested target index`);
      assert.equal(String.fromCharCode(...core.readVram(0x1800 + 32 + 6, 7)), "0001234", `${profile}: BCD array print`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Total"), 3)], [0x15, 0x20, 0x00], `${profile}: mixed-size BCD add`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Rows"), 6)], [2, 3, 4, 0, 0, 0], `${profile}: packed bytes to record array`);
      assert.deepEqual([core.readRam(addressOf(asm, "Left"), 1)[0], core.readRam(addressOf(asm, "Right"), 1)[0]], [2, 1], `${profile}: inline swap`);
      assert.equal(core.readRam(addressOf(asm, "ModOut"), 1)[0], 5, `${profile}: u8 constant modulo`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Ahoy Codex bug runtime: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
