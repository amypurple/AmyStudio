#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-main-sub-layout-"));
const sourcePath = join(temp, "main.alexis");
const deadChainPath = join(temp, "deadchain.alexis");

writeFileSync(sourcePath, `cartridge "MAIN SUB LAYOUT/CODEX/2026"
u8 Early = 0
u8 Hits = 0
u8 Other = 0
u8 Done = 0
  Early = 1
sub Add(u8 N)
  Hits += N
end sub
  call asm Bump with hl = address of Hits
  Add(3)
  Other = 7
  Done = 1
idle_here:
  wait
  goto idle_here
asm {
Bump:
  inc (hl)
  ret
}
`);

writeFileSync(deadChainPath, `cartridge "DEAD SUB CHAIN/CLAUDE/2026"
u8 A = 0
u8 B = 0
u8 C = 0
  Init
idle_here:
  wait
  StepA
  StepB
  StepC
  goto idle_here
sub Init:
  A = 1
  B = 2
  C = 3
end sub
sub StepA:
  A = A + 1
end sub
sub StepB:
  B = B + A
end sub
sub StepC:
  C = C + B
end sub
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
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x4D41494E });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 1000; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Early"), 1)[0], 1, `${profile}: early main statement`);
      assert.equal(core.readRam(addressOf(asm, "Hits"), 1)[0], 4, `${profile}: resumed call asm and sub call`);
      assert.equal(core.readRam(addressOf(asm, "Other"), 1)[0], 7, `${profile}: resumed main assignment`);
      assert.equal(core.readRam(addressOf(asm, "Done"), 1)[0], 1, `${profile}: resumed main completion`);
    } finally {
      core.destroy();
    }
  }
  const expectedDeadChainSizes = new Map([
    ["off", 235], ["safe", 229], ["balanced", 227], ["aggressive", 227], ["experimental", 227]
  ]);
  for (const profile of profiles) {
    const asmPath = join(temp, `deadchain-${profile}.asm`);
    const romPath = join(temp, `deadchain-${profile}.rom`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", deadChainPath, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile} dead chain: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    assert.equal(statSync(romPath).size, expectedDeadChainSizes.get(profile), `${profile}: dead routine chain ROM size`);
    assert.doesNotMatch(readFileSync(asmPath, "utf8"), /AMY_MAIN_AFTER_SUB_/, `${profile}: unreachable main continuation chain`);
  }
  console.log(`Main/sub layout runtime: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
