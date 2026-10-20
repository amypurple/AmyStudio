#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-ports-2026-10-20-"));
const ids = [
  "circus", "colorbot", "demons-of-osiris", "gotcha", "horse-racing",
  "lightsaver", "missile-math", "number-game", "quatrainment",
  "ti-aquarium", "trident"
];

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const id of ids) {
    const source = resolve(root, `studio/examples-src/${id}.alexis`);
    const rom = join(temp, `${id}.rom`);
    const build = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), source, "--rom", rom, "--opt", "balanced"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${id}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const core = await GearcolecoTestCore.create({ seed: 0x504F5254 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 240; frame += 1) core.runFrame();
      const { pixels } = core.getFramebufferView();
      const colors = new Set();
      for (let index = 0; index < pixels.length; index += 97) colors.add(pixels[index]);
      assert.ok(colors.size >= 2, `${id}: boot screen remained visually blank`);
      assert.notEqual(core.getPc(), 0, `${id}: CPU stopped at address zero`);
    } finally {
      core.destroy();
    }
  }
  console.log(`2026-10-20 port runtime smoke: PASS (${ids.length} games)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
