#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-for-loop-"));
const sourceText = `project "FOR LOOP CODEGEN"
memory "colecovision_legacy_sdcc"
record LoopMemory:
  u16 Padding
  u8 Counter
end record
overlay SceneRam
  Game as LoopMemory
  Menu as LoopMemory
end overlay
u8 Sum = 0
u16 WideCounter = 0
u16 WideSum = 0
u8 Guard = 99
for SceneRam.Game.Counter = 0 to 7
  Sum += SceneRam.Game.Counter
next SceneRam.Game.Counter
for WideCounter = 300 to 307
  WideSum += WideCounter
next WideCounter
if Sum = 28 then
  print at 0,0,"PASS"
else
  print at 0,0,"FAIL"
end if
loop forever
`;

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const source = join(temp, `loop-${profile}.alexis`);
    const asm = join(temp, `loop-${profile}.asm`);
    const rom = join(temp, `loop-${profile}.rom`);
    writeFileSync(source, sourceText);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile} should compile:\n${result.stdout || ""}${result.stderr || ""}${result.error?.stack || ""}`);
    const generated = readFileSync(asm, "utf8");
    assert.match(generated, /AMY_FOR_CONTINUE_[0-9]+:\s*\n\s*ld hl,AMY_OVERLAY_SCENERAM \+ 2\s*\n\s*inc \(hl\)\s*\n\s*ld a,\(hl\)\s*\n\s*cp 8/i,
      `${profile} should use the compact static-address loop for the qualified u8 counter`);
    assert.doesNotMatch(generated, /AMY_FOR_LOOP_[0-9]+:\s*\n\s*ld a,\(AMY_OVERLAY_SCENERAM\)/i,
      `${profile} should not reload the qualified counter for a separate entry guard`);
    assert.doesNotMatch(generated, /AMY_FOR_CONTINUE_[0-9]+:\s*\n\s*ld a,\([^\n]+\)\s*\n\s*ld b,a\s*\n\s*ld a,1\s*\n\s*add a,b/i,
      `${profile} should not use the old five-instruction increment`);
    assert.match(generated, /AMY_FOR_CONTINUE_[0-9]+:\s*\n\s*ld hl,\(AMY_UVAR_WideCounter\)\s*\n\s*inc hl\s*\n\s*ld \(AMY_UVAR_WideCounter\),hl/i,
      `${profile} should increment a step-1 u16 counter directly in HL`);
    assert.doesNotMatch(generated, /AMY_FOR_CONTINUE_[0-9]+:\s*\n\s*ld hl,\(AMY_UVAR_WideCounter\)\s*\n\s*push hl/i,
      `${profile} should not stage a literal step-1 u16 increment through DE`);
    const core = await GearcolecoTestCore.create({ seed: 0x464F524C });
    try {
      core.loadBios(readFileSync(join(root, "studio", "bios", "colecovision.rom")));
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(generated, "Sum"), 1)[0], 28, `${profile}: qualified u8 loop sum`);
      assert.deepEqual([...core.readRam(addressOf(generated, "WideSum"), 2)], [0x7C, 0x09], `${profile}: u16 loop sum`);
      assert.equal(core.readRam(addressOf(generated, "Guard"), 1)[0], 99, `${profile}: RAM guard`);
    } finally {
      core.destroy();
    }
  }
  console.log("qualified u8/u16 for-loop codegen and ROM runtime PASS (5 profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
