#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const names = ["three-sort-algorithms"];
const allProfiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const prebuiltArg = process.argv.indexOf("--prebuilt");
const prebuilt = prebuiltArg >= 0 ? resolve(root, process.argv[prebuiltArg + 1]) : null;
const profiles = prebuilt ? ["balanced"] : allProfiles;
const temp = mkdtempSync(join(tmpdir(), "amy-sort-examples-"));

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function runFrames(core, count, mask = 0) {
  core.setControllerMask(0, mask);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
}

function isSorted(core, address, count) {
  const values = core.readRam(address, count);
  return values.every((value, index) => value === index + 1);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    for (const name of names) {
      const stem = prebuilt ? join(prebuilt, name) : join(temp, `${name}-${profile}`);
      const asmPath = `${stem}.asm`;
      const romPath = `${stem}.rom`;
      if (!prebuilt) {
        const source = resolve(root, `studio/examples-src/${name}.alexis`);
        const result = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
        assert.equal(result.status, 0, `${profile}/${name}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
      }
      const asm = readFileSync(asmPath, "utf8");
      const values = addressOf(asm, "AMY_UVAR_Values");
      const count = name === "three-sort-algorithms" ? 12 : 20;
      const core = await GearcolecoTestCore.create({ seed: 0x534f5254 });
      try {
        core.loadBios(bios);
        core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
        runFrames(core, 90);
        if (name !== "three-sort-algorithms") {
          runFrames(core, 3, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
          runFrames(core, 3);
        }
        let frame = 0;
        for (; frame < 6000 && !isSorted(core, values, count); frame += 1) runFrames(core, 1);
        assert.ok(frame < 6000, `${profile}/${name}: sort did not complete`);
        runFrames(core, 20);
        assert.ok(isSorted(core, values, count), `${profile}/${name}: sorted values did not remain stable`);
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`Sort examples ROM: PASS (${names.length * profiles.length} runs${prebuilt ? ", prebuilt" : ""})`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

