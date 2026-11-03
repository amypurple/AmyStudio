#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-bcd-print-digits-"));
const source = join(temp, "bcd-print-digits.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "BCD PRINT DIGITS ROM"
memory "colecovision_legacy_sdcc"
bcd digits 2 Secs = 7

sub start:
  tile screen
  print Secs at 2,2 digits 2
  loop forever
end sub
`);

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const romPath = join(temp, `bcd-print-digits-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const core = await GearcolecoTestCore.create({ seed: 0x42434450 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 240; frame += 1) core.runFrame();
      assert.deepEqual([...core.readVram(0x1800 + 2 * 32 + 2, 2)], [0x30, 0x37], `${profile}: BCD digits output`);
    } finally {
      core.destroy();
    }
  }
  console.log(`BCD print digits ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files in ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
