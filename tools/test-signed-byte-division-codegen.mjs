#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-signed-byte-division-"));
const source = join(temp, "signed-byte-division.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `
project "Signed byte division"
memory "colecovision_legacy_sdcc"
i8 PositiveTwo = 127
i8 NegativeTwo = -127
i8 PositiveFour = 127
i8 NegativeFour = -127
i8 NegativeEven = -128
i8 NegativeSmall = -3
i8 NegativeSixteen = -127
i8 DynamicDividend = -101
i8 DynamicDivisor = 5
i8 DynamicNegativeDivisor = -5
i8 DynamicResult = -101
i8 DynamicNegativeResult = -101
i8 ExpressionSource = -127
i8 ExpressionResult = 0
PositiveTwo /= 2
NegativeTwo /= 2
PositiveFour /= 4
NegativeFour /= 4
NegativeEven /= 4
NegativeSmall /= 4
NegativeSixteen /= 16
DynamicResult /= DynamicDivisor
DynamicNegativeResult /= DynamicNegativeDivisor
ExpressionResult = ExpressionSource / 4
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `Missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

function signedByte(core, asm, name) {
  const value = core.readRam(addressOf(asm, name), 1)[0];
  return value < 0x80 ? value : value - 0x100;
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
  assert.match(asm, /call AMY_I16_DIV/i, `${profile}: dynamic signed byte division must use signed semantics`);

  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (!existsSync(biosPath)) continue;
  const core = await GearcolecoTestCore.create({ seed: 0xD178 });
  try {
    core.loadBios(readFileSync(biosPath));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    assert.equal(signedByte(core, asm, "PositiveTwo"), 63, `${profile}: 127 / 2`);
    assert.equal(signedByte(core, asm, "NegativeTwo"), -63, `${profile}: -127 / 2 truncates toward zero`);
    assert.equal(signedByte(core, asm, "PositiveFour"), 31, `${profile}: 127 / 4`);
    assert.equal(signedByte(core, asm, "NegativeFour"), -31, `${profile}: -127 / 4 truncates toward zero`);
    assert.equal(signedByte(core, asm, "NegativeEven"), -32, `${profile}: -128 / 4`);
    assert.equal(signedByte(core, asm, "NegativeSmall"), 0, `${profile}: -3 / 4 truncates toward zero`);
    assert.equal(signedByte(core, asm, "NegativeSixteen"), -7, `${profile}: -127 / 16 fallback`);
    assert.equal(signedByte(core, asm, "DynamicResult"), -20, `${profile}: -101 / 5`);
    assert.equal(signedByte(core, asm, "DynamicNegativeResult"), 20, `${profile}: -101 / -5`);
    assert.equal(signedByte(core, asm, "ExpressionResult"), -31, `${profile}: signed byte expression truncates toward zero`);
  } finally {
    core.destroy();
  }
}

console.log(`Signed byte division: PASS (${profiles.length} real ROM builds)`);
