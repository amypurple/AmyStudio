#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-leading-inline-asm-"));
const source = [
  'project "Leading Inline ASM"',
  'memory "colecovision_legacy_sdcc"',
  "u8 Passed = 0",
  "asm {",
  "  ld a,$5A",
  "  ld (amy(Passed)),a",
  "}",
  "loop forever",
  ""
].join("\n");

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const sourcePath = path.join(temp, "leading.alexis");
  fs.writeFileSync(sourcePath, source);
  const bios = fs.readFileSync(path.join(root, "studio/bios/colecovision.rom"));
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const romPath = path.join(temp, `leading-${profile}.rom`);
    const asmPath = path.join(temp, `leading-${profile}.asm`);
    execFileSync(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--rom", romPath, "--asm", asmPath, "--opt", profile
    ], { cwd: root, stdio: "pipe" });
    const asm = fs.readFileSync(asmPath, "utf8");
    assert.ok(asm.indexOf("ld a,$5A") > asm.indexOf("Start:"), `${profile}: leading executable ASM must follow Start`);
    const core = await GearcolecoTestCore.create({ seed: 0x4C454144 });
    try {
      core.loadBios(bios);
      core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 0x5A, `${profile}: leading executable ASM did not run`);
    } finally {
      core.destroy();
    }
  }
  console.log("Leading inline ASM runtime: PASS (5 profiles)");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
