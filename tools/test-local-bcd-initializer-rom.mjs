#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-local-bcd-init-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "local-bcd-init.alexis");

writeFileSync(source, `project "LOCAL BCD INITIALIZER ROM"
memory "colecovision_legacy_sdcc"
bcd digits 5 Result = 0
u8 Passed = 0

sub ReadLocal:
  bcd digits 5 Score = 12345
  Result = Score
  Score = 1
  return
end sub

sub start:
  ReadLocal
  ReadLocal
  if Result = 12345 then Passed = 1
  loop forever
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `local-bcd-${profile}.asm`);
    const romPath = join(temp, `local-bcd-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /ld a,\$45\s+ld \(ix-3\),a\s+ld a,\$23\s+ld \(ix-2\),a\s+ld a,\$01\s+ld \(ix-1\),a/i,
      `${profile}: local BCD bytes must be initialized least-significant pair first`);

    const core = await GearcolecoTestCore.create({ seed: 0x4243444C });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      const resultBytes = core.readRam(addressOf(asm, "AMY_UVAR_Result"), 3);
      const passed = core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0];
      assert.deepEqual([...resultBytes], [0x45, 0x23, 0x01], `${profile}: local BCD initializer did not survive the second call`);
      assert.equal(passed, 1, `${profile}: local BCD comparison failed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Local BCD initializer ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
