#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-power-division-"));
const source = join(temp, "power-division.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `
project "Compound power division"
memory "colecovision_legacy_sdcc"
const Four = 4
u8 U8Two = 255
u8 U8Four = 255
u8 U8OneTwentyEight = 255
u16 U16Two = 65535
u16 U16Four = 65535
u16 U16TwoFiftySix = 65535
i16 I16Positive = 32767
i16 I16NegativeEven = -32768
i16 I16NegativeOdd = -32767
i16 I16NegativeSmall = -3
u8 U8ExpressionSource = 255
u8 U8ExpressionResult = 0
u16 U16ExpressionSource = 65535
u16 U16ExpressionResult = 0
U8Two /= 2
U8Four /= Four
U8OneTwentyEight /= 128
U16Two /= 2
U16Four /= 4
U16TwoFiftySix /= 256
I16Positive /= 4
I16NegativeEven /= 256
I16NegativeOdd /= 256
I16NegativeSmall /= 4
U8ExpressionResult = U8ExpressionSource / 8
U16ExpressionResult = U16ExpressionSource / 2
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
  assert.match(asm, /call AMY_U16_DIV/i, `${profile}: equal-size u16 / 4 should retain the runtime call`);
  assert.match(asm, /call AMY_I16_DIV/i, `${profile}: signed division should retain exact runtime semantics`);
  assert.match(asm, /srl a/i, `${profile}: byte logical shift missing`);
  assert.match(asm, /srl h\s*\r?\n\s*rr l/i, `${profile}: u16 logical shift missing`);

  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (!existsSync(biosPath)) continue;
  const core = await GearcolecoTestCore.create({ seed: 0xD171 });
  try {
    core.loadBios(readFileSync(biosPath));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    assert.equal(core.readRam(addressOf(asm, "U8Two"), 1)[0], 127, `${profile}: u8 / 2`);
    assert.equal(core.readRam(addressOf(asm, "U8Four"), 1)[0], 63, `${profile}: u8 / 4`);
    assert.equal(core.readRam(addressOf(asm, "U8OneTwentyEight"), 1)[0], 1, `${profile}: u8 / 128`);
    assert.equal(readWord(core, asm, "U16Two"), 32767, `${profile}: u16 / 2`);
    assert.equal(readWord(core, asm, "U16Four"), 16383, `${profile}: u16 / 4 fallback`);
    assert.equal(readWord(core, asm, "U16TwoFiftySix"), 255, `${profile}: u16 / 256`);
    assert.equal(readWord(core, asm, "I16Positive"), 8191, `${profile}: positive i16 / 4`);
    assert.equal(readWord(core, asm, "I16NegativeEven"), 0xFF80, `${profile}: -32768 / 256`);
    assert.equal(readWord(core, asm, "I16NegativeOdd"), 0xFF81, `${profile}: -32767 / 256 truncates toward zero`);
    assert.equal(readWord(core, asm, "I16NegativeSmall"), 0, `${profile}: -3 / 4 truncates toward zero`);
    assert.equal(core.readRam(addressOf(asm, "U8ExpressionResult"), 1)[0], 31, `${profile}: u8 expression / 8`);
    assert.equal(readWord(core, asm, "U16ExpressionResult"), 32767, `${profile}: u16 expression / 2`);
  } finally {
    core.destroy();
  }
}

console.log(`Compound power division: PASS (${profiles.length} real ROM builds)`);
