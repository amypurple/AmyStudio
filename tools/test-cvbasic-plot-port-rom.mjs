#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const examples = ["cvbasic-plot-port", "cvbasic-plot-live-port"];
const temp = mkdtempSync(join(tmpdir(), "amy-cvbasic-plot-"));
let expectedFinalHash = null;

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const runFrames = (core, count, mask = 0) => {
  core.setControllerMask(0, mask);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
};

try {
  for (const example of examples) {
    let expectedProfileHash = null;
    for (const profile of profiles) {
      const source = resolve(root, `studio/examples-src/${example}.alexis`);
      const romPath = join(temp, `${example}-${profile}.rom`);
      const result = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), source, "--rom", romPath, "--opt", profile], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024
      });
      assert.equal(result.status, 0, `${example}/${profile}: ${result.stdout}${result.stderr}`);

      const core = await GearcolecoTestCore.create({ seed: 0x504c4f54 });
      try {
        core.loadBios(bios);
        core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
        runFrames(core, 120);
        runFrames(core, 20, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
        runFrames(core, 1200);
        const vramHash = hash(core.readVram(0, 0x4000));
        if (expectedProfileHash === null) expectedProfileHash = vramHash;
        assert.equal(vramHash, expectedProfileHash, `${example}/${profile}: bitmap differs from Off`);
        assert.equal(core.readRam(0x73c4, 1)[0] & 0x60, 0x60, `${example}/${profile}: display/NMI were not restored`);
        assert.ok(core.readVram(0, 0x1800).some((value) => value !== 0), `${example}/${profile}: bitmap stayed empty`);
      } finally {
        core.destroy();
      }
    }
    if (expectedFinalHash === null) expectedFinalHash = expectedProfileHash;
    else assert.equal(expectedProfileHash, expectedFinalHash, `${example}: final bitmap differs from the hidden-build demo`);
  }
  console.log(`CVBasic plot ports: PASS (${examples.length} demos x ${profiles.length} profiles, ${expectedFinalHash.slice(0, 12)})`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
