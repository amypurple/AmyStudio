#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-compound-array-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const sourcePath = resolve(root, "studio/examples-src/amy-compound-array-arithmetic-selftest.alexis");

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `compound-array-${profile}.asm`);
    const romPath = join(temp, `compound-array-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x41525259 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 120 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: program completed`);
      for (const name of ["WordDynamic", "WordConstant"]) {
        const bytes = core.readRam(addressOf(asm, `AMY_UVAR_${name}`), 2);
        assert.equal(bytes[0] | (bytes[1] << 8), 600, `${profile}: ${name}`);
      }
      for (const name of ["ByteDynamic", "ByteConstant"]) {
        assert.equal(core.readRam(addressOf(asm, `AMY_UVAR_${name}`), 1)[0], 45, `${profile}: ${name}`);
      }
    } finally {
      core.destroy();
    }
  }
  console.log(`Compound array arithmetic runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
