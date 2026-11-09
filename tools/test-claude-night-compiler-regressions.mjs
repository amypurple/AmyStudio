#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const fixtureRoot = join(root, "tools/fixtures");
const temp = mkdtempSync(join(tmpdir(), "amy-claude-night-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `on-goto-${profile}.asm`);
    const romPath = join(temp, `on-goto-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"),
      join(fixtureRoot, "claude-night-on-goto.alexis"), "--asm", asmPath, "--rom", romPath, "--opt", profile],
    { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}\n${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /^AMY_ULBL_LnB:$/m, `${profile}: later ON GOTO target must remain emitted`);
    const core = await GearcolecoTestCore.create({ seed: 0x4f4e474f });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Q"), 1)[0], 1, `${profile}: indexed dispatch executes`);
    } finally {
      core.destroy();
    }

    for (const [name, checks] of [
      ["claude-night-highword-parens", [["AMY_UVAR_W", [0x34, 0x12]]]],
      ["claude-night-peek-compound", [["AMY_UVAR_W", [1, 0]], ["AMY_UVAR_K", [2]]]]
    ]) {
      const extraAsmPath = join(temp, `${name}-${profile}.asm`);
      const extraRomPath = join(temp, `${name}-${profile}.rom`);
      const extraSourcePath = join(temp, `${name}.alexis`);
      const extraSource = readFileSync(join(fixtureRoot, `${name}.alexis`), "utf8");
      writeFileSync(extraSourcePath, extraSource);
      const extraBuild = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"),
        extraSourcePath, "--asm", extraAsmPath, "--rom", extraRomPath, "--opt", profile],
      { cwd: root, encoding: "utf8" });
      assert.equal(extraBuild.status, 0, `${name}/${profile}: ${extraBuild.stdout || ""}${extraBuild.stderr || ""}`);
      const extraAsm = readFileSync(extraAsmPath, "utf8");
      const extraRom = readFileSync(extraRomPath);
      const extraCore = await GearcolecoTestCore.create({ seed: 0x434e4958 });
      try {
        extraCore.loadBios(bios);
        extraCore.loadRom(extraRom, { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 12; frame += 1) extraCore.runFrame();
        for (const [symbol, expected] of checks) {
          assert.deepEqual([...extraCore.readRam(addressOf(extraAsm, symbol), expected.length)], expected,
            `${name}/${profile}: ${symbol}`);
        }
      } finally {
        extraCore.destroy();
      }
    }

    const remBuild = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"),
      join(fixtureRoot, "rem-identifier.alexis"), "--opt", profile],
    { cwd: root, encoding: "utf8" });
    assert.notEqual(remBuild.status, 0, `${profile}: scalar Rem must be rejected rather than parsed as a comment`);
    assert.match(`${remBuild.stdout || ""}${remBuild.stderr || ""}`, /scalar name 'Rem'.*REM comment syntax/i,
      `${profile}: scalar Rem diagnostic`);
  }
  console.log(`Claude night compiler regressions: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
