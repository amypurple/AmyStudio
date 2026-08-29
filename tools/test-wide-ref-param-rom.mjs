#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-wide-ref-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "wide-ref.alexis");

writeFileSync(source, `project "WIDE REF PARAM ROM"
memory "colecovision_legacy_sdcc"

record Counters:
  u32 Total
  i32 Delta
end record

u32 Unsigned = 100000
i32 Signed = -20
u32 Values[2] = 0
Counters State
u8 Passed = 0

sub start:
  Values[1] = 7
  State.Delta = -4
  AdjustWide(Unsigned, Signed)
  AdjustWide(Values[1], State.Delta)
  if Unsigned = 200010 then Passed += 1
  if Signed = -23 then Passed += 1
  if Values[1] = 24 then Passed += 1
  if State.Delta = -7 then Passed += 1
  loop forever
end sub

sub AdjustWide(ref u32 Value, ref i32 Change):
  Value += 5
  Value *= 2
  Change -= 3
  return
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function bytes(value) {
  const n = value >>> 0;
  return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `wide-ref-${profile}.asm`);
    const romPath = join(temp, `wide-ref-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /ld l,\(ix\+4\)\s+ld h,\(ix\+5\)/i, `${profile}: ref u32 pointer must be dereferenced`);
    assert.match(asm, /ld l,\(ix\+6\)\s+ld h,\(ix\+7\)/i, `${profile}: ref i32 pointer must be dereferenced`);
    const core = await GearcolecoTestCore.create({ seed: 0x57333252 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Unsigned"), 4)], bytes(200010), `${profile}: ref u32 update failed`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Signed"), 4)], bytes(-23), `${profile}: ref i32 update failed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 4, `${profile}: wide ref checks failed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Wide ref parameter ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
