#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-small-word-immediate-"));
const source = join(temp, "small-word-immediate.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `
project "Small word immediate arithmetic"
memory "colecovision_legacy_sdcc"
const Three = 3
u16 A = 65535
u16 B = 2
u16 C = 1
u16 D = 4
i16 E = -32768
i16 F = 32767
u16 R0 = 0
u16 R1 = 0
u16 R2 = 0
u16 R3 = 0
i16 R4 = 0
i16 R5 = 0
fixed FX = 1.0
fixed FR = 0.0
R0 = A + 1
R1 = 2 + B
R2 = C - Three
R3 = D - -2
R4 = E - 1
R5 = F + 1
FR = FX + 1
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `Missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

function readWord(core, asm, name) {
  const bytes = core.readRam(addressOf(asm, name), 2);
  return bytes[0] | (bytes[1] << 8);
}

for (const profile of profiles) {
  const asmPath = join(temp, `${profile}.asm`);
  const romPath = join(temp, `${profile}.rom`);
  const result = spawnSync(process.execPath, [
    join(root, "tools", "amyc.mjs"), source,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", profile
  ], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}${result.error ? `\n${result.error.stack || result.error}` : ""}`);
  const asm = readFileSync(asmPath, "utf8");
  assert.match(asm, /ld hl,\(AMY_UVAR_A\)\s*\r?\n\s*inc hl/i, `${profile}: +1 should use INC HL`);
  assert.match(asm, /ld hl,\(AMY_UVAR_C\)\s*\r?\n\s*dec hl\s*\r?\n\s*dec hl\s*\r?\n\s*dec hl/i, `${profile}: named -3 should use DEC HL`);
  assert.match(asm, /ld hl,\(AMY_UVAR_FX\)\s*\r?\n\s*push hl/i, `${profile}: fixed-point addition must retain scaled arithmetic`);

  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (!existsSync(biosPath)) continue;
  const core = await GearcolecoTestCore.create({ seed: 0x1601 });
  try {
    core.loadBios(readFileSync(biosPath));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    assert.equal(readWord(core, asm, "R0"), 0, `${profile}: unsigned +1 wrap`);
    assert.equal(readWord(core, asm, "R1"), 4, `${profile}: constant-left addition`);
    assert.equal(readWord(core, asm, "R2"), 65534, `${profile}: named subtraction wrap`);
    assert.equal(readWord(core, asm, "R3"), 6, `${profile}: subtract negative constant`);
    assert.equal(readWord(core, asm, "R4"), 32767, `${profile}: signed minimum minus one wrap`);
    assert.equal(readWord(core, asm, "R5"), 32768, `${profile}: signed maximum plus one wrap`);
    assert.equal(readWord(core, asm, "FR"), 0x0200, `${profile}: fixed-point one remains scaled`);
  } finally {
    core.destroy();
  }
}

console.log(`Small immediate word arithmetic: PASS (${profiles.length} real ROM builds)`);
