#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-vpeek-register-abi-"));
const source = join(temp, "vpeek-register-abi.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "VPEEK REGISTER ABI TEST"
memory "colecovision_legacy_sdcc"

u8 Passed = 0

sub start:
  call asm VerifyVpeekRegisters
  loop forever
end sub

asm {
VerifyVpeekRegisters:
  ld hl,$1234
  ld a,$5A
  call AMY_VPOKE
  ld bc,$2468
  ld de,$1357
  ld ix,$369A
  ld iy,$47BC
  ld hl,$1234
  call AMY_VPEEK
  cp $5A
  ret nz
  ld a,h
  cp $12
  ret nz
  ld a,l
  cp $34
  ret nz
  ld a,b
  cp $24
  ret nz
  ld a,c
  cp $68
  ret nz
  ld a,d
  cp $13
  ret nz
  ld a,e
  cp $57
  ret nz
  push ix
  pop hl
  ld a,h
  cp $36
  ret nz
  ld a,l
  cp $9A
  ret nz
  push iy
  pop hl
  ld a,h
  cp $47
  ret nz
  ld a,l
  cp $BC
  ret nz
  ld a,1
  ld (AMY_UVAR_Passed),a
  ret
}
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `vpeek-register-abi-${profile}.asm`);
    const romPath = join(temp, `vpeek-register-abi-${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x56504142 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const passedAddress = addressOf(asm, "AMY_UVAR_Passed");
      for (let frame = 0; frame < 30 && core.readRam(passedAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(passedAddress, 1)[0], 1, `${profile}: VPEEK must preserve BC, DE, HL, IX, and IY`);
      assert.equal(core.readRam(0x701F, 1)[0], 0, `${profile}: VDP critical-section flag must be cleared`);
    } finally {
      core.destroy();
    }
  }
  console.log(`VPEEK register ABI runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
