#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const source = join(root, "tools/fixtures/claude-final-open-regressions.alexis");
const temp = mkdtempSync(join(tmpdir(), "amy-claude-final-open-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function compile(profile) {
  const asmPath = join(temp, `${profile}.asm`);
  const romPath = join(temp, `${profile}.rom`);
  const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
  return { asm: readFileSync(asmPath, "utf8"), rom: readFileSync(romPath) };
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const built = compile(profile);
    const core = await GearcolecoTestCore.create({ seed: 0x46494E41 });
    try {
      core.loadBios(bios);
      core.loadRom(built.rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      const done = addressOf(built.asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 10 && core.readRam(done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(done, 1)[0], 1, `${profile}: completion marker`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_AbsTrue"), 1)[0], 1, `${profile}: abs(i16) true comparison`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_AbsFalse"), 1)[0], 0, `${profile}: abs(i16) false comparison`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_AbsMinimum"), 1)[0], 1, `${profile}: abs(-32768) unsigned magnitude`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_LowResult"), 1)[0], 0x34, `${profile}: return lowbyte(u16)`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_DataFirst"), 1)[0], 24, `${profile}: first data expression`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_DataSecond"), 1)[0], 25, `${profile}: second data expression`);
      assert.deepEqual([...core.readRam(addressOf(built.asm, "AMY_UVAR_FillBuffer"), 6)], [9, 9, 9, 9, 9, 9], `${profile}: fill array from indexed ROM data`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Claude final open regressions: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
