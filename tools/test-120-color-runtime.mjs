#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-120-color-runtime-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `tile screen
screen on
120 colors on
wait 60 frames
120 colors off
loop forever
`;

function tablePair(core) {
  const registers = core.getVdpRegisters();
  return [registers[3], registers[4]];
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  const sourcePath = join(temp, "120-color-runtime.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const romPath = join(temp, `120-color-${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);

    const core = await GearcolecoTestCore.create({ seed: 0x31323043 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 12; frame += 1) core.runFrame();
      const first = tablePair(core);
      core.runFrame();
      const second = tablePair(core);
      const phases = new Set([first.join(","), second.join(",")]);
      assert.deepEqual(phases, new Set(["127,4", "255,0"]), `${profile}: 120C did not alternate both R3/R4 phases`);

      for (let frame = 0; frame < 80; frame += 1) core.runFrame();
      assert.deepEqual(tablePair(core), [0xFF, 0x03], `${profile}: 120 colors off did not restore Graphics II tables`);
    } finally {
      core.destroy();
    }
  }
  console.log(`120-color runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
