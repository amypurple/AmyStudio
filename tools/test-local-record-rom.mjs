#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-local-record-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "local-record.alexis");

writeFileSync(source, `project "LOCAL RECORD ROM"
memory "colecovision_legacy_sdcc"

record Actor:
  u8 X
  u16 Score
  u8 Trail[2]
end record

u16 Result = 0
u8 Passed = 0

sub Inner:
  Actor Temp = 0
  if Temp.X = 0 then Passed += 1
  if Temp.Score = 0 then Passed += 1
  if Temp.Trail[1] = 0 then Passed += 1
  Temp.X = 77
  Temp.Score = 1000
  Temp.Trail[1] = 88
  return
end sub

sub Outer:
  Actor Temp = 0
  Temp.X = 9
  Temp.Score = 500
  Temp.Trail[1] = 4
  Inner
  Result = Temp.Score
  Result += Temp.X
  Result += Temp.Trail[1]
  return
end sub

sub start:
  Outer
  if Result = 513 then Passed += 1
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
    const asmPath = join(temp, `local-record-${profile}.asm`);
    const romPath = join(temp, `local-record-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x52454344 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      const resultAddress = addressOf(asm, "AMY_UVAR_Result");
      const resultValue = core.readRam(resultAddress, 2);
      assert.deepEqual([...resultValue], [0x01, 0x02], `${profile}: caller local record was corrupted by nested call`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 4, `${profile}: local record initialization or fields failed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Local record ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
