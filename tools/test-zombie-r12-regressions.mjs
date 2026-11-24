#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const temp = mkdtempSync(path.join(tmpdir(), "amy-zombie-regressions-"));
const bios = readFileSync(path.join(root, "studio/bios/colecovision.rom"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

const cases = {
  vram: `cartridge "VRAM SPR PAT/AMY QA/2026"
const SpSkip = 64
u16 DecTo = 0
nmi off
DecTo = vram.spr_pat + SpSkip
idle:
goto idle`,
  mixedAsm: `cartridge "MIXED ASM/AMY QA/2026"
u8 A1 = 0
nmi off
asm {
  ld a,7
  ld (A1),a
  jp past_table
my_table:
  db 1,2,3
past_table:
}
idle:
goto idle`,
};

for (const [name, source] of Object.entries(cases)) writeFileSync(path.join(temp, `${name}.alexis`), source);

function compile(name, profile) {
  const source = path.join(temp, `${name}.alexis`);
  const asm = path.join(temp, `${name}-${profile}.asm`);
  const rom = path.join(temp, `${name}-${profile}.rom`);
  const result = spawnSync(process.execPath, [path.join(root, "tools/amyc.mjs"), source, "--asm", asm, "--rom", rom, "--opt", profile], {
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${name}/${profile} failed:\n${result.stdout}\n${result.stderr}`);
  return { asm, rom };
}

function symbol(asm, name) {
  const match = readFileSync(asm, "utf8").match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "mi"));
  assert.ok(match, `missing ${name}`);
  return Number.parseInt(match[1], 16);
}

for (const profile of profiles) {
  for (const [name, expected] of [["vram", ["DecTo", 0x3840]], ["mixedAsm", ["A1", 7]]]) {
    const built = compile(name, profile);
    const core = await GearcolecoTestCore.create({ seed: 0x5a17 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(built.rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 900; frame += 1) core.runFrame();
      const address = symbol(built.asm, expected[0]);
      const bytes = core.readRam(address, expected[1] > 0xff ? 2 : 1);
      const actual = bytes[0] | ((bytes[1] || 0) << 8);
      assert.equal(actual, expected[1], `${name}/${profile} runtime value`);
    } finally {
      core.destroy();
    }
  }
}

const late = path.join(temp, "late.alexis");
writeFileSync(late, `u8 A1 = 0
sub Foo:
  if A1 <> B1 then A1 = 1
  return
end sub
u8 B1 = 0`);
const diagnostic = spawnSync(process.execPath, [path.join(root, "tools/amyc.mjs"), late, "--rom", path.join(temp, "late.rom")], {
  cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
});
assert.notEqual(diagnostic.status, 0, "late declaration unexpectedly compiled");
assert.match(`${diagnostic.stdout}\n${diagnostic.stderr}`, /Global variable 'B1' is used before its declaration on line 6/);

console.log("Zombie r12 regressions: PASS (VRAM constants and mixed ASM runtime x 5 profiles; declaration diagnostic)");
