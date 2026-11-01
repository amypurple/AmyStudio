#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-ahoy-final-"));
const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
const source = `
u8 FillResult = 0
u8 IndexResult = 0
FillResult = FillLocal(37)
u8 Board[8]
Board[Twice(3)] = 9
IndexResult = Board[6]
loop forever
function FillLocal(u8 Value) as u8
  u8 Cells[8]
  fill array Cells with Value
  return Cells[0] + Cells[7]
function Twice(u8 Value) as u8
  return Value + Value
`;

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `Missing RAM symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const sourcePath = join(temp, "ahoy-final.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), sourcePath,
      "--asm", asmPath, "--rom", romPath, "--opt", profile],
    { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(build.status, 0, `${profile}: ${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0xA4012026 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 45; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "FillResult"), 1)[0], 74, `${profile}: local fill value`);
      assert.equal(core.readRam(addressOf(asm, "IndexResult"), 1)[0], 9, `${profile}: function target index`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Ahoy final regressions: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
