#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-nmi-vdp-guard-"));
const sourcePath = join(temp, "nmi-vdp-guard.alexis");
const source = `
project "NMI VDP GUARD"
memory "colecovision_legacy_sdcc"

u8 Passed = 0

sub start:
  tile screen
  screen on
  nmi on
  wait
  call asm GuardedWrite
  wait
  Passed = 1
  loop forever
end sub

asm {
GuardedWrite:
    ld a,$A5
    ld ($701F),a
    xor a
    out (VDP_CTRL_PORT),a
    ld bc,5000
GuardedWriteDelay:
    dec bc
    ld a,b
    or c
    jr nz,GuardedWriteDelay
    ld a,$58
    out (VDP_CTRL_PORT),a
    ld a,$5A
    out (VDP_DATA_PORT),a
    jp AMY_RELEASE_VDP_GUARD
}
`;

function addressOf(assembly, symbol) {
  const match = assembly.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  writeFileSync(sourcePath, source);
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const asm = join(temp, `${profile}.asm`);
    const rom = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", sourcePath,
      "--asm", asm,
      "--rom", rom,
      "--opt", profile,
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const assembly = readFileSync(asm, "utf8");
    assert.match(assembly,
      /Nmi:\s+push af\s+ld a,\(\$701F\)\s+cp \$A5\s+jr nz,AMY_NMI_[A-Z_]*CHECK_REENTRANCY\s+ld a,\$5A\s+ld \(\$701F\),a\s+pop af\s+ret\s+AMY_NMI_[A-Z_]*CHECK_REENTRANCY:\s+ld a,\(NO_NMI\)[\s\S]*?AMY_NMI_[A-Z_]*READ_STATUS:\s+in a,\(VDP_CTRL_PORT\)/i,
      `${profile}: NMI must test the VDP guard before reading status`);
  }

  const assembly = readFileSync(join(temp, "balanced.asm"), "utf8");
  const passedAddress = addressOf(assembly, "AMY_UVAR_Passed");
  const core = await GearcolecoTestCore.create({ seed: 0x701f5a });
  try {
    core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
    core.loadRom(readFileSync(join(temp, "balanced.rom")), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 180 && core.readRam(passedAddress, 1)[0] !== 1; frame += 1) core.runFrame();
    assert.equal(core.readRam(passedAddress, 1)[0], 1, "deferred acknowledgement did not resume later frames");
    assert.equal(core.readVram(0x1800, 1)[0], 0x5A, "NMI corrupted the split VDP address write");
    assert.equal(core.readRam(0x701F, 1)[0], 0, "VDP critical-section marker was not released");
  } finally {
    core.destroy();
  }
  console.log("NMI VDP guard runtime: PASS (5 profiles, latch preserved, deferred acknowledge resumes frames)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
