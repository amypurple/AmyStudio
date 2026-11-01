#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-nested-word-division-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "nested-word-division.alexis");

writeFileSync(source, `project "NESTED WORD DIVISION"
memory "colecovision_legacy_sdcc"
u16 B = 1000
u16 D = 10
u16 R1 = 0
u16 R2 = 0
i16 S = -300
i16 T1 = 0
i16 T2 = 0
tile screen
R1 = B / 4 + 1
R2 = B / D + 3
T1 = S / 4 - 7
T2 = S / 2 + 1
print at 2,4, digits$(B / 10, 5)
print at 2,5, width$(B / D, 5)
print at 2,6, str$(B / 10)
print at 2,7, width$(S / 4, 5)
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

function readWord(core, asm, name) {
  const bytes = core.readRam(addressOf(asm, name), 2);
  return bytes[0] | (bytes[1] << 8);
}

function readText(core, x, y, length) {
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
    const core = await GearcolecoTestCore.create({ seed: 0xD1F1 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 45; frame += 1) core.runFrame();
      assert.equal(readWord(core, asm, "R1"), 251, `${profile}: division at left of literal addition`);
      assert.equal(readWord(core, asm, "R2"), 103, `${profile}: division at left of variable addition`);
      assert.equal(readWord(core, asm, "T1"), (-82) & 0xFFFF, `${profile}: signed division at left of subtraction`);
      assert.equal(readWord(core, asm, "T2"), (-149) & 0xFFFF, `${profile}: signed division by two at left of addition`);
      assert.equal(readText(core, 2, 4, 5), "00100", `${profile}: digits$ u16 division`);
      assert.equal(readText(core, 2, 5, 5), "  100", `${profile}: width$ u16 division`);
      assert.equal(readText(core, 2, 6, 5), "00100", `${profile}: str$ u16 division`);
      assert.equal(readText(core, 2, 7, 5), "  -75", `${profile}: width$ i16 division`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Nested word division ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
