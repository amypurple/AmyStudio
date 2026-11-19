#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-sprite-nmi-guard-"));
const sourcePath = join(temp, "sprite-nmi-guard.alexis");
const source = `
project "SPRITE NMI GUARD"
memory "colecovision_legacy_sdcc"

sub start:
  tile screen
  nmi off
  call asm FillSentinel
  clear sprites
  set sprite count 8
  screen on
  nmi on
Spin:
  update sprites
  goto Spin
end sub

asm {
FillSentinel:
    ld a,$40
    out (VDP_CTRL_PORT),a
    ld a,$5B
    out (VDP_CTRL_PORT),a
    ld b,$C0
    ld a,$A6
FillSentinelLoop:
    out (VDP_DATA_PORT),a
    nop
    djnz FillSentinelLoop
    ret
}
`;

try {
  writeFileSync(sourcePath, source);
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", sourcePath,
      "--asm", asmPath,
      "--output", romPath,
      "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const assembly = readFileSync(asmPath, "utf8");
    assert.match(assembly,
      /AMY_UPDATE_SPRITES:\s+ld a,\(AMY_SPRITE_COUNT\)\s+ld e,a\s+ld a,\$A5\s+ld \(\$701F\),a\s+xor a\s+out \(VDP_CTRL_PORT\),a\s+ld a,\$5B\s+out \(VDP_CTRL_PORT\),a\s+call AMY_RELEASE_VDP_GUARD/i,
      `${profile}: normal SAT upload lacks the VDP latch guard`);
    assert.match(assembly,
      /Nmi:\s+push af\s+ld a,\(\$701F\)\s+cp \$A5\s+jr nz,/i,
      `${profile}: NMI does not defer status reads during the SAT address write`);
  }

  const core = await GearcolecoTestCore.create({ seed: 0x534154 });
  try {
    core.loadBios(readFileSync(join(root, "studio", "bios", "colecovision.rom")));
    core.loadRom(readFileSync(join(temp, "balanced.rom")), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 2200; frame += 1) core.runFrame();
    const protectedVram = core.readVram(0x1B40, 0xC0);
    assert.ok(protectedVram.every((value) => value === 0xA6), "SAT upload was misdirected beyond its intended table");
    assert.equal(core.readRam(0x701F, 1)[0], 0, "VDP critical-section marker remained active");
  } finally {
    core.destroy();
  }
  console.log("Sprite update NMI guard: PASS (5 profiles, 2200-frame SAT isolation)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
