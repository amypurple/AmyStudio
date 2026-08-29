#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-sprite-field-index-"));
const source = join(temp, "sprite-field-index.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "SPRITE FIELD INDEX ROM TEST"
memory "colecovision_legacy_sdcc"
u8 GuardBefore = $A5
u8 I = 3
u8 ReadY = 0, ReadX = 0, ReadPattern = 0, ReadColor = 0
u8 Passed = 0
u8 GuardAfter = $5A

sub start:
  set sprite I to 40,50,6,7
  ReadY = sprite I y
  ReadX = sprite I x
  ReadPattern = sprite I pattern
  ReadColor = sprite I color
  if ReadY = 40 then Passed += 1
  if ReadX = 50 then Passed += 1
  if ReadPattern = 6 then Passed += 1
  if ReadColor = 7 then Passed += 1
  I = 2
  set sprite I + 1 x to 99
  ReadX = sprite I + 1 x
  if ReadX = 99 then Passed += 1
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
    const asmPath = join(temp, `sprite-field-index-${profile}.asm`);
    const romPath = join(temp, `sprite-field-index-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x53505249 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 5, `${profile}: dynamic sprite field assertions failed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_GuardBefore"), 1)[0], 0xA5, `${profile}: leading guard changed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_GuardAfter"), 1)[0], 0x5A, `${profile}: trailing guard changed`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_SPRITE_TABLE") + 3 * 4, 4)], [40, 99, 6, 7], `${profile}: sprite shadow entry mismatch`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Sprite field index ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
