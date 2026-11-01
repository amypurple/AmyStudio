#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const source = `
u16 U = 0
i16 S = 0
u8 Passed = 0
u8 Done = 0
if U = 0 then Passed = Passed + 1
if U < 1 then Passed = Passed + 1
if U <= 255 then Passed = Passed + 1
if U < 256 then Passed = Passed + 1
if 255 >= U then Passed = Passed + 1
U = 65535
if U > 255 then Passed = Passed + 1
if U >= 256 then Passed = Passed + 1
if 255 < U then Passed = Passed + 1
S = -32768
if S < 0 then Passed = Passed + 1
if S <= 255 then Passed = Passed + 1
if 0 > S then Passed = Passed + 1
S = 32767
if S > 0 then Passed = Passed + 1
if S >= 255 then Passed = Passed + 1
if 255 < S then Passed = Passed + 1
S = 80
if S <= 80 then Passed = Passed + 1
if S = 80 then Passed = Passed + 1
Done = 1
loop forever
`;

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-word-literal-compare-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const sourcePath = join(temp, "case.alexis");
  writeFileSync(sourcePath, source);
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `case-${profile}.asm`);
    const romPath = join(temp, `case-${profile}.rom`);
    const compile = spawnSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(compile.status, 0, `${profile}: ${compile.stdout}\n${compile.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /AMY_CMP_(?:LEFT|RIGHT)32/i, `${profile}: word/literal compares must not promote to scratch32`);
    if (profile === "off") {
      for (const literal of ["0", "1", "80", "255", "256"]) {
        assert.match(asm, new RegExp(`ld de,${literal}\\b`, "i"), `missing direct 16-bit compare for ${literal}`);
      }
      assert.match(asm, /ld hl,\(AMY_UVAR_U\)[\s\S]{0,50}ld de,255[\s\S]{0,50}sbc hl,de/i);
      assert.match(asm, /ld hl,\(AMY_UVAR_S\)[\s\S]{0,50}ld de,80[\s\S]{0,160}xor \$80/i);
    }
    const passedAddress = addressOf(asm, "AMY_UVAR_Passed");
    const doneAddress = addressOf(asm, "AMY_UVAR_Done");
    const core = await GearcolecoTestCore.create({ seed: 0x57313643 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 30 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: test did not finish`);
      assert.equal(core.readRam(passedAddress, 1)[0], 16, `${profile}: word/literal comparison result mismatch`);
    } finally {
      core.destroy();
    }
  }
  console.log(`word literal compare codegen/runtime: PASS (16 assertions x ${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
