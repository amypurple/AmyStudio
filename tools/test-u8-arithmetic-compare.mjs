#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-u8-arithmetic-compare-"));
const source = `
project "u8 arithmetic comparison regression"
memory "colecovision_legacy_sdcc"
u8 V = 100
u8 T = 3
u8 Passed = 0
if V > T + 16 then inc Passed
if V >= T + 16 then inc Passed
if V <> T + 16 then inc Passed
if V < T + 250 then inc Passed
if V <= T + 250 then inc Passed
if V <> T + 250 then inc Passed
V = 253
T = 250
if V < T + 16 then inc Passed
if V <= T + 16 then inc Passed
if V <> T + 16 then inc Passed
V = 266 - 256
if V = T + 16 then inc Passed
if V >= T + 16 then inc Passed
if V <= T + 16 then inc Passed
V = 100
T = 3
if V >= T - 10 then inc Passed
if V < T - 10 then inc Passed
if T - 10 < V then inc Passed
if T - 10 >= V then inc Passed
loop forever
`;

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  const sourcePath = join(temp, "compare.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const asmPath = join(temp, `compare-${profile}.asm`);
    const romPath = join(temp, `compare-${profile}.rom`);
    const result = spawnSync(process.execPath, [
      resolve(root, "tools/amyc.mjs"), sourcePath,
      "--asm", asmPath,
      "--rom", romPath,
      "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /AMY_CMP_(?:LEFT|RIGHT)32/, `${profile}: byte arithmetic comparison used 32-bit scratch`);
    const core = await GearcolecoTestCore.create({ seed: 0x5538434D });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.match(asm, /\bsub 10\b/i, `${profile}: byte subtraction comparison was not specialized`);
      assert.equal(core.readRam(addressOf(asm, "Passed"), 1)[0], 12, `${profile}: arithmetic comparison truth table`);
    } finally {
      core.destroy();
    }
  }
  console.log(`u8 arithmetic comparison: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
