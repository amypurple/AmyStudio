#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-bcd-inc-dec-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "bcd-inc-dec.alexis");

writeFileSync(source, `project "BCD inc dec ROM test"
memory "colecovision_legacy_sdcc"
bcd digits 4 Score = 9
u8 Passed = 0
sub start:
  inc Score
  dec Score
  if Score = 9 then inc Score
  if Score = 10 then Passed = 1
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
    const asmPath = join(temp, `bcd-${profile}.asm`);
    const romPath = join(temp, `bcd-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /\bdaa\b/i, `${profile}: BCD mutation must use decimal adjust`);

    const core = await GearcolecoTestCore.create({ seed: 0x42434431 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      const score = core.readRam(addressOf(asm, "AMY_UVAR_Score"), 2);
      const passed = core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0];
      assert.deepEqual([...score], [0x10, 0x00], `${profile}: BCD result should be decimal 10`);
      assert.equal(passed, 1, `${profile}: inline BCD inc/compare did not execute`);
    } finally {
      core.destroy();
    }
  }
  console.log(`BCD inc/dec ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
