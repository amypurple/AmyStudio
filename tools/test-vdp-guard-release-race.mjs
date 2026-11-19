#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-vdp-guard-race-"));
const sourcePath = join(temp, "guardrace.alexis");
const source = `
project "GUARD RACE"
memory "colecovision_legacy_sdcc"
u16 Waits = 0
u8 I = 0
u8 C = 0
sub start:
  text screen
  screen on
  while 1
    for I = 0 to 200
      C = get char at I & 31, I >> 5
    next
    wait 30 frames
    Waits += 1
  end while
end sub
`;

function symbolAddress(text, name) {
  const match = text.match(new RegExp(`^AMY_UVAR_${name}:?\\s+(?:equ|EQU)\\s+\\$([0-9A-F]+)`, "mi"));
  assert.ok(match, `Missing symbol AMY_UVAR_${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  writeFileSync(sourcePath, source);
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const romPath = join(temp, `${profile}.rom`);
    const symPath = join(temp, `${profile}.sym`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", sourcePath,
      "--output", romPath,
      "--symbols", symPath,
      "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const waitsAddress = symbolAddress(readFileSync(symPath, "utf8"), "Waits");
    const core = await GearcolecoTestCore.create({ seed: 0x47554152 });
    try {
      core.loadBios(readFileSync(join(root, "studio", "bios", "colecovision.rom")));
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      let previous = 0;
      let previousFrame = 0;
      const gaps = [];
      for (let frame = 1; frame <= 6500; frame += 1) {
        core.runFrame();
        const bytes = core.readRam(waitsAddress, 2);
        const waits = bytes[0] | (bytes[1] << 8);
        if (waits === previous) continue;
        if (previous !== 0) gaps.push(frame - previousFrame);
        previous = waits;
        previousFrame = frame;
      }
      assert.ok(gaps.length >= 120, `${profile}: only ${gaps.length} completed waits`);
      assert.ok(Math.max(...gaps) <= 40, `${profile}: wait stretched to ${Math.max(...gaps)} frames`);
    } finally {
      core.destroy();
    }
  }
  console.log("VDP guard release race: PASS (5 profiles, waits remain <= 40 frames)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
