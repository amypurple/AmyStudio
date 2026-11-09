#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const source = join(root, "tools/fixtures/for-runtime-limit-static-slot.alexis");
const temp = mkdtempSync(join(tmpdir(), "amy-for-slot-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || join(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source,
      "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}\n${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /^AMY_FOR_SLOT_\d+ EQU \$[0-9A-F]{4}$/m, `${profile}: missing static FOR slot`);
    assert.doesNotMatch(asm, /AMY_UPROC_ShowIt:\s+push ix/i, `${profile}: non-recursive FOR should stay frameless`);

    const core = await GearcolecoTestCore.create({ seed: 0x464f5253 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const state = addressOf(asm, "AMY_UVAR_State");
      for (let frame = 0; frame < 233; frame += 1) core.runFrame();
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 600 && core.readRam(state, 1)[0] !== 2; frame += 1) core.runFrame();
      assert.equal(core.readRam(state, 1)[0], 2, `${profile}: FOR limit did not survive nested BIOS work`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Dynamic FOR static slot: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
