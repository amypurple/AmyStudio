#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-vpeek-qualified-"));
const source = join(temp, "vpeek-qualified.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "VPEEK QUALIFIED ROM TEST"
memory "colecovision_legacy_sdcc"

record VramResults:
  u8 Bytes[3]
end record

overlay WorkRam
  Game as VramResults
  Menu as VramResults
end overlay

u8 Scalar = 0
u8 LocalResult = 0
u8 Index = 1

sub start:
  vpoke vram.name + 0, $31
  vpoke vram.name + 1, $42
  vpoke vram.name + 2, $53
  vpeek vram.name + 0 into Scalar
  vpeek vram.name + 1 into WorkRam.Game.Bytes[Index]
  ReadLocal
  loop forever
end sub

sub ReadLocal:
  VramResults Temp = 0
  vpeek vram.name + 2 into Temp.Bytes[2]
  LocalResult = Temp.Bytes[2]
  return
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
    const asmPath = join(temp, `vpeek-qualified-${profile}.asm`);
    const romPath = join(temp, `vpeek-qualified-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x56504545 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Scalar"), 1)[0], 0x31, `${profile}: scalar vpeek`);
      assert.equal(core.readRam(addressOf(asm, "AMY_SCENE_Game_Bytes") + 1, 1)[0], 0x42, `${profile}: overlay vpeek`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_LocalResult"), 1)[0], 0x53, `${profile}: local-record vpeek`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Qualified vpeek ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
