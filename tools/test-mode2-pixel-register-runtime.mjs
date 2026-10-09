#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-mode2-pixel-register-"));
const source = join(temp, "mode2-pixel-register.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "MODE 2 PIXEL REGISTER TEST"
memory "colecovision_legacy_sdcc"

sub start:
  bitmap screen
  pset 0,0
  pset 7,0
  preset 0,0
  pset 1,1 color 10
  loop forever
end sub
`);

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const romPath = join(temp, `mode2-pixel-register-${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const core = await GearcolecoTestCore.create({ seed: 0x4D325058 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 30; frame += 1) core.runFrame();
      const observed = [
        core.readVram(0x0000, 1)[0],
        core.readVram(0x0001, 1)[0],
        core.readVram(0x2001, 1)[0]
      ];
      assert.deepEqual(observed, [0x01, 0x40, 0xA0],
        `${profile}: pset/preset must preserve the mask and colored row`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Mode 2 pixel register runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
