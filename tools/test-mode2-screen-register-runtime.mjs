#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-mode2-screen-register-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const cases = [
  { name: "tile", statement: "tile screen", r3: 0x9F },
  { name: "raw", statement: "mode 2 screen", r3: 0xFF }
];

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const testCase of cases) {
    const sourcePath = join(temp, `${testCase.name}.alexis`);
    writeFileSync(sourcePath, `${testCase.statement}\nscreen on\nloop forever\n`);
    for (const profile of profiles) {
      const romPath = join(temp, `${testCase.name}-${profile}.rom`);
      const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--rom", romPath, "--opt", profile], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024
      });
      assert.equal(build.status, 0, `${testCase.name}/${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
      const core = await GearcolecoTestCore.create({ seed: 0x4D324352 });
      try {
        core.loadBios(bios);
        core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 10; frame += 1) core.runFrame();
        assert.equal(core.getVdpRegisters()[3], testCase.r3,
          `${testCase.name}/${profile}: expected VDP R3=$${testCase.r3.toString(16)}, got $${core.getVdpRegisters()[3].toString(16)}`);
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`Mode 2 screen register runtime: PASS (${cases.length} modes x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
