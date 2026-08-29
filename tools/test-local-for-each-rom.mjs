#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-local-for-each-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "local-for-each.alexis");

writeFileSync(source, `project "LOCAL FOR EACH ROM"
memory "colecovision_legacy_sdcc"
const ShortCount = 2
const LongCount = 3
u8 Result = 0
u8 Passed = 0

sub SumShort:
  u8 Values[ShortCount] = 0
  u8 Value = 0
  u8 Index = 0
  Values[0] = 7
  Values[1] = 9
  for each Value, Index in Values
    Result += Value
  next
  return
end sub

sub SumLong:
  u8 Values[LongCount] = 0
  u8 Value = 0
  u8 Index = 0
  Values[0] = 1
  Values[1] = 2
  Values[2] = 4
  for each Value, Index in Values
    Result += Value
  next Value
  return
end sub

sub start:
  SumShort
  SumLong
  if Result = 23 then Passed = 1
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
    const asmPath = join(temp, `local-for-each-${profile}.asm`);
    const romPath = join(temp, `local-for-each-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /for each/i, `${profile}: for each was not lowered`);
    const core = await GearcolecoTestCore.create({ seed: 0x464F5245 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Result"), 1)[0], 23, `${profile}: scoped local array lengths were not respected`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 1, `${profile}: local for each runtime check failed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Local for each ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
