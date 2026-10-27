#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-constant-multiply-"));
const source = join(temp, "constant-multiply.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `
project "Compound constant multiply"
memory "colecovision_legacy_sdcc"
const TimesFourteen = 14
u8 U8Value = 200
i8 I8Value = -50
u8 U8Six = 250
u8 U8Ten = 26
u8 U8Twelve = 23
u8 U8Fourteen = 20
u8 U8Sixteen = 13
u8 U8Fallback = 7
u8 U8Fifteen = 19
u8 U8ExpressionSource = 11
u8 U8ExpressionThirtyOne = 0
u16 U16Value = 10000
i16 I16Value = -5000
u16 U16Three = 22000
u16 U16Five = 14000
u16 U16Six = 11000
u16 U16Twelve = 6000
u16 U16TwentyFour = 3000
u16 U16FiveHundred = 300
u16 U16ExpressionTwentyFour = 3000
u16 U16ExpressionFiveHundred = 300
u16 U16ExpressionResultTwentyFour = 0
u16 U16ExpressionResultFiveHundred = 0
u16 U16Times256 = 4660
u16 U16Times257 = 4660
u16 U16ExpressionSource256 = 4660
u16 U16ExpressionSource257 = 4660
u16 U16ExpressionResult256 = 0
u16 U16ExpressionResult257 = 0
i16 DynamicLeft = 100
i16 DynamicRight = -3
i16 DynamicResult = 0
i16 DynamicCompound = -1234
i16 DynamicCompoundFactor = -7
u16 DynamicMaxLeft = 65535
u16 DynamicMaxRight = 65535
u16 DynamicMaxResult = 0
u16 DynamicZeroLeft = 12345
u16 DynamicZeroRight = 0
u16 DynamicZeroResult = 1
i16 DynamicMinLeft = -32768
i16 DynamicMinusOne = -1
i16 DynamicMinResult = 0
u16 Constant2048Source = 37
u16 Constant2048Result = 0
U8Value *= 3
I8Value *= 5
U8Six *= 6
U8Ten *= 10
U8Twelve *= 12
U8Fourteen *= 14
U8Sixteen *= 16
U8Fallback *= 255
U8Fifteen *= 15
U8ExpressionThirtyOne = U8ExpressionSource * 31
U16Value *= 10
I16Value *= TimesFourteen
U16Three *= 3
U16Five *= 5
U16Six *= 6
U16Twelve *= 12
U16TwentyFour *= 24
U16FiveHundred *= 500
U16ExpressionResultTwentyFour = U16ExpressionTwentyFour * 24
U16ExpressionResultFiveHundred = 500 * U16ExpressionFiveHundred
U16Times256 *= 256
U16Times257 *= 257
U16ExpressionResult256 = U16ExpressionSource256 * 256
U16ExpressionResult257 = 257 * U16ExpressionSource257
DynamicResult = DynamicLeft * DynamicRight
DynamicCompound *= DynamicCompoundFactor
DynamicMaxResult = DynamicMaxLeft * DynamicMaxRight
DynamicZeroResult = DynamicZeroLeft * DynamicZeroRight
DynamicMinResult = DynamicMinLeft * DynamicMinusOne
Constant2048Result = Constant2048Source * 2048
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
  assert.doesNotMatch(asm, /AMY_MUL_LOOP_/i, `${profile}: measured byte constants should use bounded chains`);
  assert.match(asm, /add a,a\s*\r?\n\s*add a,b/i, `${profile}: byte multiply chain missing`);
  assert.match(asm, /sbc hl,de\s*\r?\n\s*add hl,hl/i, `${profile}: word multiply-by-14 chain missing`);
  assert.match(asm, /ld d,h\s*\r?\n\s*ld e,l\s*\r?\n\s*add hl,hl/i, `${profile}: generated word multiply chain missing`);
  assert.match(asm, /ld h,l\s*\r?\n\s*ld l,0/i, `${profile}: word multiply-by-256 chain missing`);
  assert.match(asm, /ld a,h\s*\r?\n\s*add a,l\s*\r?\n\s*ld h,a/i, `${profile}: word multiply-by-257 chain missing`);
  assert.match(asm, /ld a,16\s*\r?\n[^]*?srl b\s*\r?\n\s*rr c\s*\r?\n[^]*?sla e\s*\r?\n\s*rl d/i, `${profile}: bounded dynamic word multiply missing`);
  assert.doesNotMatch(asm, /ld a,b\s*\r?\n\s*or c\s*\r?\n\s*jr z,[^\r\n]*Mul16/i, `${profile}: unbounded counted word multiply survived`);

  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (!existsSync(biosPath)) continue;
  const core = await GearcolecoTestCore.create({ seed: 0x5A17 });
  try {
    core.loadBios(readFileSync(biosPath));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    assert.equal(core.readRam(addressOf(asm, "U8Value"), 1)[0], 88, `${profile}: u8 modulo result`);
    assert.equal(core.readRam(addressOf(asm, "I8Value"), 1)[0], 6, `${profile}: i8 modulo result`);
    assert.equal(core.readRam(addressOf(asm, "U8Six"), 1)[0], 220, `${profile}: u8 times 6`);
    assert.equal(core.readRam(addressOf(asm, "U8Ten"), 1)[0], 4, `${profile}: u8 times 10`);
    assert.equal(core.readRam(addressOf(asm, "U8Twelve"), 1)[0], 20, `${profile}: u8 times 12`);
    assert.equal(core.readRam(addressOf(asm, "U8Fourteen"), 1)[0], 24, `${profile}: u8 times 14`);
    assert.equal(core.readRam(addressOf(asm, "U8Sixteen"), 1)[0], 208, `${profile}: u8 times 16`);
    assert.equal(core.readRam(addressOf(asm, "U8Fallback"), 1)[0], 249, `${profile}: u8 fallback times 255`);
    assert.equal(core.readRam(addressOf(asm, "U8Fifteen"), 1)[0], 29, `${profile}: u8 times 15`);
    assert.equal(core.readRam(addressOf(asm, "U8ExpressionThirtyOne"), 1)[0], 85, `${profile}: u8 expression times 31`);
    assert.equal(readWord(core, asm, "U16Value"), 34464, `${profile}: u16 times 10`);
    assert.equal(readWord(core, asm, "I16Value"), 61072, `${profile}: i16 times 14`);
    assert.equal(readWord(core, asm, "U16Three"), 464, `${profile}: u16 times 3`);
    assert.equal(readWord(core, asm, "U16Five"), 4464, `${profile}: u16 times 5`);
    assert.equal(readWord(core, asm, "U16Six"), 464, `${profile}: u16 times 6`);
    assert.equal(readWord(core, asm, "U16Twelve"), 6464, `${profile}: u16 times 12`);
    assert.equal(readWord(core, asm, "U16TwentyFour"), 6464, `${profile}: u16 times 24`);
    assert.equal(readWord(core, asm, "U16FiveHundred"), 18928, `${profile}: u16 times 500`);
    assert.equal(readWord(core, asm, "U16ExpressionResultTwentyFour"), 6464, `${profile}: u16 expression times 24`);
    assert.equal(readWord(core, asm, "U16ExpressionResultFiveHundred"), 18928, `${profile}: u16 expression times 500`);
    assert.equal(readWord(core, asm, "U16Times256"), 13312, `${profile}: u16 times 256`);
    assert.equal(readWord(core, asm, "U16Times257"), 17972, `${profile}: u16 times 257`);
    assert.equal(readWord(core, asm, "U16ExpressionResult256"), 13312, `${profile}: u16 expression times 256`);
    assert.equal(readWord(core, asm, "U16ExpressionResult257"), 17972, `${profile}: u16 expression times 257`);
    assert.equal(readWord(core, asm, "DynamicResult"), 65236, `${profile}: i16 expression with negative multiplier`);
    assert.equal(readWord(core, asm, "DynamicCompound"), 8638, `${profile}: i16 compound multiply with two negatives`);
    assert.equal(readWord(core, asm, "DynamicMaxResult"), 1, `${profile}: u16 maximum operands wrap modulo 65536`);
    assert.equal(readWord(core, asm, "DynamicZeroResult"), 0, `${profile}: dynamic multiply by zero`);
    assert.equal(readWord(core, asm, "DynamicMinResult"), 32768, `${profile}: i16 minimum times minus one wraps modulo 65536`);
    assert.equal(readWord(core, asm, "Constant2048Result"), 10240, `${profile}: expression times 2048 uses exact bounded lowering`);
  } finally {
    core.destroy();
  }
}

console.log(`Compound constant multiply: PASS (${profiles.length} real ROM builds)`);
