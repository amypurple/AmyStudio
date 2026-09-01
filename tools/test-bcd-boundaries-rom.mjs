#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-bcd-boundaries-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "bcd-boundaries.alexis");

writeFileSync(source, `project "BCD BOUNDARIES ROM"
memory "colecovision_legacy_sdcc"

record Ledger:
  bcd digits 3 Score
end record

record SceneMemory:
  bcd digits 3 Score
end record

overlay Shared
  Scene as SceneMemory
  Other as SceneMemory
end overlay

bcd digits 4 Score = 9999
bcd digits 4 Delta = 66
bcd digits 5 LocalResult = 1
bcd digits 12 Wide = 999999999999
Ledger Stats
u8 Checks[14] = 0

sub CheckLocal:
  bcd digits 5 Temp = 99999
  Temp += 1
  LocalResult = Temp
  return
end sub

sub start:
  CheckLocal
  if LocalResult = 0 then Checks[13] = 1

  Score += 1
  if Score = 0 then Checks[0] = 1
  Score -= 1
  if Score = 0 then Checks[1] = 1

  Score = 1234
  Score += Delta
  if Score = 1300 then Checks[2] = 1
  Score -= Delta
  if Score = 1234 then Checks[3] = 1

  if Score <> 1235 then Checks[4] = 1
  if Score < 1235 then Checks[5] = 1
  if Score <= 1234 then Checks[6] = 1
  if Score > 1233 then Checks[7] = 1
  if Score >= 1234 then Checks[8] = 1

  Stats.Score = 998
  Stats.Score += 1
  if Stats.Score = 999 then Checks[9] = 1
  Stats.Score += 1
  if Stats.Score = 0 then Checks[10] = 1

  Shared.Scene.Score = 321
  Shared.Scene.Score -= 22
  if Shared.Scene.Score = 299 then Checks[11] = 1

  Wide += 1
  if Wide = 0 then Checks[12] = 1

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
    const asmPath = join(temp, `bcd-boundaries-${profile}.asm`);
    const romPath = join(temp, `bcd-boundaries-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x42434442 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      const checks = [...core.readRam(addressOf(asm, "AMY_UVAR_Checks"), 14)];
      const localResult = [...core.readRam(addressOf(asm, "AMY_UVAR_LocalResult"), 3)];
      assert.deepEqual(checks, Array(14).fill(1), `${profile}: BCD boundary assertion ${checks.indexOf(0)} failed; LocalResult=${localResult.map((value) => value.toString(16).padStart(2, "0")).join(" ")}`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Score"), 2)], [0x34, 0x12], `${profile}: BCD carry round-trip failed`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Wide"), 6)], [0, 0, 0, 0, 0, 0], `${profile}: 12-digit BCD wrap failed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`BCD boundary ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files in ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
