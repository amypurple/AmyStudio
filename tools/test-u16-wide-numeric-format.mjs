#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-u16-wide-format-"));
const source = join(temp, "u16-wide-format.alexis");

writeFileSync(source, `project "U16 WIDE FORMAT TEST"
memory "colecovision_legacy_sdcc"
u16 W = 20
u8 D6[6]
u8 P8[8]
u8 D16[16]
tile screen
D6 = digits$(W, 6)
P8 = width$(W, 8)
D16 = digits$(W, 16)
print at 2,3, digits$(W, 5)
print at 2,4, digits$(W, 6)
print at 2,5, width$(W, 8)
print at 2,6, "A" + digits$(W, 6) + "B"
print at 2,7, digits$(W, 16)
set number digits to $80
set number pad to $90
print at 2,9, digits$(W, 6)
print at 2,10, width$(W, 8)
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

function text(core, x, y, length) {
  return String.fromCharCode(...core.readVram(0x1800 + y * 32 + x, length));
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
    const core = await GearcolecoTestCore.create({ seed: 0x55313657 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 45; frame += 1) core.runFrame();
      assert.equal(text(core, 2, 3, 5), "00020", `${profile}: natural u16 digits`);
      assert.equal(text(core, 2, 4, 6), "000020", `${profile}: six-digit u16`);
      assert.equal(text(core, 2, 5, 8), "      20", `${profile}: eight-wide u16`);
      assert.equal(text(core, 2, 6, 8), "A000020B", `${profile}: concatenated wide u16`);
      assert.equal(text(core, 2, 7, 16), "0000000000000020", `${profile}: maximum-width u16`);
      assert.deepEqual(Array.from(core.readVram(0x1800 + 9 * 32 + 2, 6)), [0x80, 0x80, 0x80, 0x80, 0x82, 0x80], `${profile}: custom wide digits`);
      assert.deepEqual(Array.from(core.readVram(0x1800 + 10 * 32 + 2, 8)), [0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x82, 0x80], `${profile}: custom wide padding`);
      assert.equal(String.fromCharCode(...core.readRam(addressOf(asm, "D6"), 6)), "000020", `${profile}: six-digit buffer`);
      assert.equal(String.fromCharCode(...core.readRam(addressOf(asm, "P8"), 8)), "      20", `${profile}: width buffer`);
      assert.equal(String.fromCharCode(...core.readRam(addressOf(asm, "D16"), 16)), "0000000000000020", `${profile}: max-width buffer`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Wide u16 numeric formatting: PASS (${profiles.length} profiles, RAM + VRAM)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
