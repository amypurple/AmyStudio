#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-horse-payoff-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const sourcePath = resolve(root, "studio/examples-src/amy-horse-payoff-selftest.alexis");

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function readWord(core, asm, name) {
  const bytes = core.readRam(addressOf(asm, `AMY_UVAR_${name}`), 2);
  return bytes[0] | (bytes[1] << 8);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `horse-payoff-${profile}.asm`);
    const romPath = join(temp, `horse-payoff-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x484F5253 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 120 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: program completed`);
      assert.equal(readWord(core, asm, "PoolTotal"), 2000, `${profile}: pool total`);
      assert.equal(readWord(core, asm, "DirectProduct"), 2000, `${profile}: direct indexed product`);

      const oddsAddress = addressOf(asm, "AMY_UVAR_Odds");
      assert.deepEqual([...core.readRam(oddsAddress, 5)], [5, 20, 8, 2, 8], `${profile}: odds`);
      const cashAddress = addressOf(asm, "AMY_UVAR_Cash");
      const cash = core.readRam(cashAddress, 6);
      assert.deepEqual([
        cash[0] | (cash[1] << 8),
        cash[2] | (cash[3] << 8),
        cash[4] | (cash[5] << 8)
      ], [2500, 450, 1100], `${profile}: player cash`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Horse Racing payoff runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
