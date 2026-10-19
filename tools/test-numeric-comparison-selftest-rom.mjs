#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "studio/examples-src/amy-numeric-comparison-selftest.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

const temp = mkdtempSync(join(tmpdir(), "amy-numeric-selftest-"));
try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `numeric-selftest-${profile}.asm`);
    const romPath = join(temp, `numeric-selftest-${profile}.rom`);
    const build = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const passedAddress = addressOf(asm, "AMY_UVAR_Passed");
    const core = await GearcolecoTestCore.create({ seed: 0x4E554D43 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      let passed = 0;
      for (let frame = 0; frame < 180; frame += 1) {
        core.runFrame();
        passed = core.readRam(passedAddress, 1)[0];
        if (passed === 48) break;
      }
      assert.equal(passed, 48, `${profile}: only ${passed}/48 numeric comparisons passed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Numeric comparison Amy self-test ROM: PASS (48 assertions x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
