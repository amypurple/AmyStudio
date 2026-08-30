#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-format-qualified-"));
const source = join(temp, "format-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "QUALIFIED FORMAT BUFFER ROM TEST"
memory "colecovision_legacy_sdcc"

record FormatMemory:
  u8 GuardBefore
  u8 Digits[5]
  u8 Hex[5]
  u8 GuardAfter
end record

overlay SharedRam
  Game as FormatMemory
  Menu as FormatMemory
end overlay

u16 Value = 513

sub start:
  SharedRam.Game.GuardBefore = $A5
  SharedRam.Game.GuardAfter = $5A
  format Value into SharedRam.Game.Digits digits 5
  format hex Value into SharedRam.Game.Hex
  loop forever
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `format-qualified-${profile}.asm`);
    const romPath = join(temp, `format-qualified-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const base = addressOf(asm, "AMY_OVERLAY_SharedRam");
    const core = await GearcolecoTestCore.create({ seed: 0x464F524D });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(base, 12)], [
        0xA5,
        0x30, 0x30, 0x35, 0x31, 0x33,
        0x30, 0x31, 0x20, 0x30, 0x32,
        0x5A
      ], `${profile}: qualified format output or guards failed`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified format buffer ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
